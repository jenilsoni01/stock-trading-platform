package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/stock-trading-platform/market-data-service/internal/repository"
	"github.com/stock-trading-platform/market-data-service/internal/service"
)

// StockHandler handles HTTP requests for stock data
type StockHandler struct {
	marketService *service.MarketService
}

func NewStockHandler(marketService *service.MarketService) *StockHandler {
	return &StockHandler{marketService: marketService}
}

// ListStocks returns all active stocks
// GET /api/v1/stocks
func (h *StockHandler) ListStocks(c *gin.Context) {
	stocks, err := h.marketService.ListStocks(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Internal Server Error",
			"message": "Failed to retrieve stocks",
		})
		return
	}
	if stocks == nil {
		stocks = []repository.Stock{}
	}
	c.JSON(http.StatusOK, gin.H{
		"stocks": stocks,
		"count":  len(stocks),
	})
}

// GetStock returns a single stock by symbol
// GET /api/v1/stocks/:symbol
func (h *StockHandler) GetStock(c *gin.Context) {
	symbol := c.Param("symbol")
	stock, err := h.marketService.GetStock(c.Request.Context(), symbol)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "Not Found",
			"message": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, stock)
}

// GetQuote returns the current simulated quote for a symbol
// GET /api/v1/stocks/:symbol/quote
func (h *StockHandler) GetQuote(c *gin.Context) {
	symbol := c.Param("symbol")
	quote, err := h.marketService.GetQuote(c.Request.Context(), symbol)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "Not Found",
			"message": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, quote)
}

// GetPriceHistory returns price history for a symbol
// GET /api/v1/stocks/:symbol/history?limit=100
func (h *StockHandler) GetPriceHistory(c *gin.Context) {
	symbol := c.Param("symbol")
	limitStr := c.DefaultQuery("limit", "100")
	limit, err := strconv.ParseInt(limitStr, 10, 64)
	if err != nil || limit <= 0 {
		limit = 100
	}

	history, err := h.marketService.GetPriceHistory(c.Request.Context(), symbol, limit)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "Not Found",
			"message": err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"symbol":  symbol,
		"history": history,
		"count":   len(history),
	})
}

// SyncLivePrices triggers a real-world market quote sync from Yahoo Finance
// POST /api/v1/stocks/sync-live
func (h *StockHandler) SyncLivePrices(c *gin.Context) {
	count, err := h.marketService.SyncLiveQuotes(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Sync Failed",
			"message": err.Error(),
		})
		return
	}

	stocks, _ := h.marketService.ListStocks(c.Request.Context())
	if stocks == nil {
		stocks = []repository.Stock{}
	}
	c.JSON(http.StatusOK, gin.H{
		"message":      "Live market data successfully synchronized",
		"updatedCount": count,
		"stocks":       stocks,
	})
}
