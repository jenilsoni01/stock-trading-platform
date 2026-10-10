package service

import (
	"context"
	"log"
	"math/rand"
	"sync"
	"time"

	"github.com/stock-trading-platform/market-data-service/internal/repository"
)

// PriceSimulator generates deterministic price movements.
//
// Design choices:
// - Controlled: runs at configurable intervals (default 30s), not unbounded
// - Bounded: price changes are ±2% max per tick
// - Deterministic for testing: accepts a seed
// - Stoppable: supports graceful shutdown
//
// This is NOT a real market simulator. It produces plausible-looking
// price movements for paper trading demonstration purposes.
type PriceSimulator struct {
	marketService *MarketService
	stockRepo     *repository.StockRepository
	interval      time.Duration
	maxChangePct  float64
	rng           *rand.Rand
	stopCh        chan struct{}
	mu            sync.Mutex
	running       bool
}

func NewPriceSimulator(marketService *MarketService, stockRepo *repository.StockRepository) *PriceSimulator {
	return &PriceSimulator{
		marketService: marketService,
		stockRepo:     stockRepo,
		interval:      30 * time.Second,
		maxChangePct:  0.02, // ±2% max change per tick
		rng:           rand.New(rand.NewSource(42)), // Deterministic seed for reproducibility
		stopCh:        make(chan struct{}),
	}
}

// Start begins the price simulation loop
func (ps *PriceSimulator) Start(ctx context.Context) {
	ps.mu.Lock()
	if ps.running {
		ps.mu.Unlock()
		return
	}
	ps.running = true
	ps.mu.Unlock()

	log.Printf("Price simulator started (interval=%v, maxChange=±%.1f%%)", ps.interval, ps.maxChangePct*100)

	ticker := time.NewTicker(ps.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			ps.simulateTick(ctx)
		case <-ps.stopCh:
			log.Println("Price simulator stopped")
			return
		case <-ctx.Done():
			log.Println("Price simulator context cancelled")
			return
		}
	}
}

// Stop gracefully stops the simulator
func (ps *PriceSimulator) Stop() {
	ps.mu.Lock()
	defer ps.mu.Unlock()
	if ps.running {
		close(ps.stopCh)
		ps.running = false
	}
}

func (ps *PriceSimulator) simulateTick(ctx context.Context) {
	stocks, err := ps.stockRepo.FindAll(ctx)
	if err != nil {
		log.Printf("Simulator: failed to fetch stocks: %v", err)
		return
	}

	for _, stock := range stocks {
		if !stock.IsActive {
			continue
		}

		// Generate bounded random price change
		// Change is ±maxChangePct of current price
		changeFactor := (ps.rng.Float64()*2 - 1) * ps.maxChangePct
		changePaise := int64(float64(stock.CurrentPricePaise) * changeFactor)

		newPricePaise := stock.CurrentPricePaise + changePaise

		// Floor: price cannot go below 100 paise (₹1.00)
		if newPricePaise < 100 {
			newPricePaise = 100
		}

		if err := ps.marketService.UpdateStockPrice(ctx, stock.Symbol, newPricePaise); err != nil {
			log.Printf("Simulator: failed to update %s: %v", stock.Symbol, err)
		}
	}

	log.Printf("Simulator: updated %d stocks", len(stocks))
}
