package grpc

import (
	"context"
	"log"
	"time"

	pb "github.com/stock-trading-platform/market-data-service/internal/proto"
	"github.com/stock-trading-platform/market-data-service/internal/service"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// QuoteServer implements the gRPC QuoteService.
// Used by Order Service (C++) to look up stock prices during order execution.
type QuoteServer struct {
	pb.UnimplementedQuoteServiceServer
	marketService *service.MarketService
}

func NewQuoteServer(marketService *service.MarketService) *QuoteServer {
	return &QuoteServer{
		marketService: marketService,
	}
}

// GetQuote returns the current simulated price for a stock.
// Called by Order Service via gRPC during the order execution workflow.
func (s *QuoteServer) GetQuote(ctx context.Context, req *pb.QuoteRequest) (*pb.QuoteResponse, error) {
	if req.Symbol == "" {
		return nil, status.Error(codes.InvalidArgument, "symbol is required")
	}

	log.Printf("gRPC GetQuote: symbol=%s", req.Symbol)

	quote, err := s.marketService.GetQuote(ctx, req.Symbol)
	if err != nil {
		log.Printf("gRPC GetQuote error: symbol=%s, error=%v", req.Symbol, err)
		return nil, status.Errorf(codes.NotFound, "stock not found: %s", req.Symbol)
	}

	return &pb.QuoteResponse{
		Symbol:             quote.Symbol,
		PricePaise:         quote.PricePaise,
		PreviousPricePaise: quote.PreviousPricePaise,
		Timestamp:          quote.Timestamp.Format(time.RFC3339),
		MarketActive:       quote.MarketActive,
		Volume:             quote.Volume,
	}, nil
}

// GetQuotes returns quotes for multiple symbols
func (s *QuoteServer) GetQuotes(ctx context.Context, req *pb.MultiQuoteRequest) (*pb.MultiQuoteResponse, error) {
	if len(req.Symbols) == 0 {
		return nil, status.Error(codes.InvalidArgument, "at least one symbol is required")
	}

	var quotes []*pb.QuoteResponse
	for _, symbol := range req.Symbols {
		quote, err := s.marketService.GetQuote(ctx, symbol)
		if err != nil {
			continue // Skip unavailable symbols
		}
		quotes = append(quotes, &pb.QuoteResponse{
			Symbol:             quote.Symbol,
			PricePaise:         quote.PricePaise,
			PreviousPricePaise: quote.PreviousPricePaise,
			Timestamp:          quote.Timestamp.Format(time.RFC3339),
			MarketActive:       quote.MarketActive,
			Volume:             quote.Volume,
		})
	}

	return &pb.MultiQuoteResponse{Quotes: quotes}, nil
}
