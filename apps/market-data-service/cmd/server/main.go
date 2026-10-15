package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"google.golang.org/grpc"

	"github.com/stock-trading-platform/market-data-service/internal/handler"
	"github.com/stock-trading-platform/market-data-service/internal/repository"
	"github.com/stock-trading-platform/market-data-service/internal/service"
	grpcserver "github.com/stock-trading-platform/market-data-service/internal/grpc"
	pb "github.com/stock-trading-platform/market-data-service/internal/proto"
)

func main() {
	infraHost := getEnv("INFRA_HOST", "localhost")
	mongoHost := getEnv("MONGODB_HOST", infraHost)
	mongoPort := getEnv("MONGODB_PORT", "27017")
	mongoUser := getEnv("MONGODB_USER", "md_service")
	mongoPass := getEnv("MONGODB_PASSWORD", "dev_mongo_pass")
	mongoDb := getEnv("MONGODB_DATABASE", "market_data_db")
	httpPort := getEnv("PORT", getEnv("MARKET_SERVICE_PORT", "8082"))
	grpcPort := getEnv("GRPC_PORT", getEnv("MARKET_SERVICE_GRPC_PORT", "50051"))

	// Connect to MongoDB
	mongoURI := getEnv("MONGODB_URI", "")
	if mongoURI == "" {
		mongoURI = fmt.Sprintf("mongodb://%s:%s@%s:%s/%s?authSource=admin",
			mongoUser, mongoPass, mongoHost, mongoPort, mongoDb)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Fatalf("Failed to connect to MongoDB: %v", err)
	}
	defer client.Disconnect(context.Background())

	// Ping MongoDB
	if err := client.Ping(ctx, nil); err != nil {
		log.Fatalf("Failed to ping MongoDB: %v", err)
	}
	log.Println("Connected to MongoDB")

	db := client.Database(mongoDb)

	// Initialize layers
	stockRepo := repository.NewStockRepository(db)
	priceHistoryRepo := repository.NewPriceHistoryRepository(db)
	marketService := service.NewMarketService(stockRepo, priceHistoryRepo)

	// Auto-seed stocks and history if MongoDB is empty
	if err := stockRepo.SeedIfEmpty(ctx, priceHistoryRepo); err != nil {
		log.Printf("Warning: failed to seed stocks: %v", err)
	} else {
		log.Println("Stock catalog verification/seeding completed")
	}

	// Start price simulator with configured interval (default 2s for live ticker experience)
	simIntervalSec := 2
	if envSec := os.Getenv("SIMULATOR_INTERVAL_SECONDS"); envSec != "" {
		if sec, err := strconv.Atoi(envSec); err == nil && sec > 0 {
			simIntervalSec = sec
		}
	}
	simulator := service.NewPriceSimulatorWithInterval(marketService, stockRepo, time.Duration(simIntervalSec)*time.Second)
	go simulator.Start(context.Background())

	// === HTTP Server (Gin) ===
	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(corsMiddleware())
	router.Use(structuredLogger())

	// Health and readiness
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "UP", "service": "market-data-service"})
	})
	router.GET("/ready", func(c *gin.Context) {
		if err := client.Ping(c.Request.Context(), nil); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "NOT_READY", "error": "MongoDB unavailable"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "READY"})
	})

	// Prometheus metrics
	router.GET("/metrics", gin.WrapH(promhttp.Handler()))

	// API routes
	stockHandler := handler.NewStockHandler(marketService)
	v1 := router.Group("/api/v1")
	{
		v1.GET("/stocks", stockHandler.ListStocks)
		v1.GET("/stocks/:symbol", stockHandler.GetStock)
		v1.GET("/stocks/:symbol/quote", stockHandler.GetQuote)
		v1.GET("/stocks/:symbol/history", stockHandler.GetPriceHistory)
		v1.POST("/stocks/sync-live", stockHandler.SyncLivePrices)
	}

	httpServer := &http.Server{
		Addr:         ":" + httpPort,
		Handler:      router,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
	}

	// === gRPC Server ===
	grpcListener, err := net.Listen("tcp", ":"+grpcPort)
	if err != nil {
		log.Fatalf("Failed to listen on gRPC port %s: %v", grpcPort, err)
	}

	grpcSrv := grpc.NewServer()
	quoteServer := grpcserver.NewQuoteServer(marketService)
	pb.RegisterQuoteServiceServer(grpcSrv, quoteServer)

	// Start servers
	go func() {
		log.Printf("HTTP server starting on :%s", httpPort)
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("HTTP server error: %v", err)
		}
	}()

	go func() {
		log.Printf("gRPC server starting on :%s", grpcPort)
		if err := grpcSrv.Serve(grpcListener); err != nil {
			log.Fatalf("gRPC server error: %v", err)
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down servers...")
	simulator.Stop()

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	grpcSrv.GracefulStop()
	if err := httpServer.Shutdown(shutdownCtx); err != nil {
		log.Printf("HTTP server shutdown error: %v", err)
	}

	log.Println("Server shutdown complete")
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}

func structuredLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()
		duration := time.Since(start)
		log.Printf(`{"service":"market-data-service","method":"%s","path":"%s","status":%d,"duration_ms":%d}`,
			c.Request.Method, c.Request.URL.Path, c.Writer.Status(), duration.Milliseconds())
	}
}
