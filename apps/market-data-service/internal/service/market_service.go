package service

import (
	"context"
	"fmt"
	"time"

	"github.com/stock-trading-platform/market-data-service/internal/repository"
)

// QuoteResponse represents a price quote for API responses
type QuoteResponse struct {
	Symbol             string    `json:"symbol"`
	PricePaise         int64     `json:"pricePaise"`
	PreviousPricePaise int64     `json:"previousPricePaise"`
	ChangePaise        int64     `json:"changePaise"`
	ChangePercent      string    `json:"changePercent"`
	DayHighPaise       int64     `json:"dayHighPaise"`
	DayLowPaise        int64     `json:"dayLowPaise"`
	Volume             int64     `json:"volume"`
	MarketActive       bool      `json:"marketActive"`
	Timestamp          time.Time `json:"timestamp"`
}

// MarketService provides business logic for market data
type MarketService struct {
	stockRepo        *repository.StockRepository
	priceHistoryRepo *repository.PriceHistoryRepository
}

func NewMarketService(stockRepo *repository.StockRepository, priceHistoryRepo *repository.PriceHistoryRepository) *MarketService {
	return &MarketService{
		stockRepo:        stockRepo,
		priceHistoryRepo: priceHistoryRepo,
	}
}

// ListStocks returns all active stocks
func (s *MarketService) ListStocks(ctx context.Context) ([]repository.Stock, error) {
	return s.stockRepo.FindAll(ctx)
}

// GetStock returns a single stock by symbol
func (s *MarketService) GetStock(ctx context.Context, symbol string) (*repository.Stock, error) {
	stock, err := s.stockRepo.FindBySymbol(ctx, symbol)
	if err != nil {
		return nil, err
	}
	if stock == nil {
		return nil, fmt.Errorf("stock not found: %s", symbol)
	}
	return stock, nil
}

// GetQuote returns a current quote for a symbol
func (s *MarketService) GetQuote(ctx context.Context, symbol string) (*QuoteResponse, error) {
	stock, err := s.stockRepo.FindBySymbol(ctx, symbol)
	if err != nil {
		return nil, err
	}
	if stock == nil {
		return nil, fmt.Errorf("stock not found: %s", symbol)
	}

	changePaise := stock.CurrentPricePaise - stock.PreviousPricePaise
	var changePercent string
	if stock.PreviousPricePaise > 0 {
		pct := float64(changePaise) / float64(stock.PreviousPricePaise) * 100
		changePercent = fmt.Sprintf("%.2f", pct)
	} else {
		changePercent = "0.00"
	}

	return &QuoteResponse{
		Symbol:             stock.Symbol,
		PricePaise:         stock.CurrentPricePaise,
		PreviousPricePaise: stock.PreviousPricePaise,
		ChangePaise:        changePaise,
		ChangePercent:      changePercent,
		DayHighPaise:       stock.DayHighPaise,
		DayLowPaise:        stock.DayLowPaise,
		Volume:             stock.Volume,
		MarketActive:       true,
		Timestamp:          time.Now().UTC(),
	}, nil
}

// GetPriceHistory returns recent price history for a symbol
func (s *MarketService) GetPriceHistory(ctx context.Context, symbol string, limit int64) ([]repository.PriceHistory, error) {
	// Validate stock exists
	stock, err := s.stockRepo.FindBySymbol(ctx, symbol)
	if err != nil {
		return nil, err
	}
	if stock == nil {
		return nil, fmt.Errorf("stock not found: %s", symbol)
	}

	if limit <= 0 || limit > 500 {
		limit = 100
	}

	return s.priceHistoryRepo.FindBySymbol(ctx, symbol, limit)
}

// UpdateStockPrice updates the price and records history
func (s *MarketService) UpdateStockPrice(ctx context.Context, symbol string, newPricePaise int64) error {
	if err := s.stockRepo.UpdatePrice(ctx, symbol, newPricePaise, 0); err != nil {
		return err
	}

	// Update day high/low
	if err := s.stockRepo.UpdateDayHighLow(ctx, symbol, newPricePaise); err != nil {
		return err
	}

	// Record in price history
	entry := repository.PriceHistory{
		Symbol:     symbol,
		PricePaise: newPricePaise,
		Volume:     0,
		Timestamp:  time.Now().UTC(),
	}
	return s.priceHistoryRepo.Insert(ctx, entry)
}
