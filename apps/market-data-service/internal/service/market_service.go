package service

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"sync"
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

type yahooChartResp struct {
	Chart struct {
		Result []struct {
			Meta struct {
				Currency               string  `json:"currency"`
				Symbol                 string  `json:"symbol"`
				RegularMarketPrice     float64 `json:"regularMarketPrice"`
				ChartPreviousClose     float64 `json:"chartPreviousClose"`
				RegularMarketDayHigh   float64 `json:"regularMarketDayHigh"`
				RegularMarketDayLow    float64 `json:"regularMarketDayLow"`
				RegularMarketVolume    int64   `json:"regularMarketVolume"`
				RegularMarketChangePct float64 `json:"regularMarketChangePercent"`
			} `json:"meta"`
		} `json:"result"`
	} `json:"chart"`
}

// SyncLiveQuotes fetches live real-world prices for all active stocks from Yahoo Finance
func (s *MarketService) SyncLiveQuotes(ctx context.Context) (int, error) {
	stocks, err := s.stockRepo.FindAll(ctx)
	if err != nil {
		return 0, err
	}

	client := &http.Client{Timeout: 8 * time.Second}
	var wg sync.WaitGroup
	var mu sync.Mutex
	updatedCount := 0

	sem := make(chan struct{}, 5)

	for _, st := range stocks {
		if !st.IsActive {
			continue
		}

		wg.Add(1)
		go func(stock repository.Stock) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			yahooSymbol := stock.Symbol
			if stock.Market == "NSE" || stock.Market == "" {
				yahooSymbol = stock.Symbol + ".NS"
			}

			url := fmt.Sprintf("https://query1.finance.yahoo.com/v8/finance/chart/%s?interval=1d", yahooSymbol)
			req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
			if err != nil {
				return
			}
			req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

			resp, err := client.Do(req)
			if err != nil || resp.StatusCode != http.StatusOK {
				if resp != nil {
					resp.Body.Close()
				}
				return
			}
			defer resp.Body.Close()

			body, err := io.ReadAll(resp.Body)
			if err != nil {
				return
			}

			var yResp yahooChartResp
			if err := json.Unmarshal(body, &yResp); err != nil || len(yResp.Chart.Result) == 0 {
				return
			}

			meta := yResp.Chart.Result[0].Meta
			if meta.RegularMarketPrice <= 0 {
				return
			}

			multiplier := 100.0
			if meta.Currency == "USD" {
				multiplier = 84.0 * 100.0 // Converted to INR paise at ~84 INR/USD
			}

			pricePaise := int64(meta.RegularMarketPrice * multiplier)
			highPaise := int64(meta.RegularMarketDayHigh * multiplier)
			lowPaise := int64(meta.RegularMarketDayLow * multiplier)
			if highPaise <= 0 {
				highPaise = pricePaise
			}
			if lowPaise <= 0 {
				lowPaise = pricePaise
			}

			_ = s.stockRepo.UpdatePrice(ctx, stock.Symbol, pricePaise, meta.RegularMarketVolume)
			_ = s.stockRepo.UpdateDayHighLow(ctx, stock.Symbol, highPaise)
			_ = s.stockRepo.UpdateDayHighLow(ctx, stock.Symbol, lowPaise)

			_ = s.priceHistoryRepo.Insert(ctx, repository.PriceHistory{
				Symbol:     stock.Symbol,
				PricePaise: pricePaise,
				Volume:     meta.RegularMarketVolume,
				Timestamp:  time.Now().UTC(),
			})

			mu.Lock()
			updatedCount++
			mu.Unlock()
		}(st)
	}

	wg.Wait()
	log.Printf("[MarketService] SyncLiveQuotes completed: %d/%d stocks updated from real-world exchange", updatedCount, len(stocks))
	return updatedCount, nil
}
