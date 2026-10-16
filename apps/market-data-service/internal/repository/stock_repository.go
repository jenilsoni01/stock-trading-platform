package repository

import (
	"context"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Stock represents a stock document in MongoDB
type Stock struct {
	Symbol             string    `bson:"symbol" json:"symbol"`
	Name               string    `bson:"name" json:"name"`
	Sector             string    `bson:"sector" json:"sector"`
	Market             string    `bson:"market,omitempty" json:"market,omitempty"` // "NSE" or "US"
	CurrentPricePaise  int64     `bson:"currentPricePaise" json:"currentPricePaise"`
	PreviousPricePaise int64     `bson:"previousPricePaise" json:"previousPricePaise"`
	DayHighPaise       int64     `bson:"dayHighPaise" json:"dayHighPaise"`
	DayLowPaise        int64     `bson:"dayLowPaise" json:"dayLowPaise"`
	Volume             int64     `bson:"volume" json:"volume"`
	IsActive           bool      `bson:"isActive" json:"isActive"`
	CreatedAt          time.Time `bson:"createdAt" json:"createdAt"`
	UpdatedAt          time.Time `bson:"updatedAt" json:"updatedAt"`
}

// StockRepository handles MongoDB operations for stocks
type StockRepository struct {
	collection *mongo.Collection
}

func NewStockRepository(db *mongo.Database) *StockRepository {
	return &StockRepository{
		collection: db.Collection("stocks"),
	}
}

// FindAll returns all active stocks
func (r *StockRepository) FindAll(ctx context.Context) ([]Stock, error) {
	filter := bson.M{"isActive": true}
	opts := options.Find().SetSort(bson.D{{Key: "symbol", Value: 1}})

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var stocks []Stock
	if err := cursor.All(ctx, &stocks); err != nil {
		return nil, err
	}
	return stocks, nil
}

// FindBySymbol returns a stock by its ticker symbol
func (r *StockRepository) FindBySymbol(ctx context.Context, symbol string) (*Stock, error) {
	cleanSymbol := strings.ToUpper(strings.TrimSpace(symbol))
	var stock Stock
	err := r.collection.FindOne(ctx, bson.M{"symbol": cleanSymbol}).Decode(&stock)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}
	return &stock, nil
}

// UpdatePrice atomically updates a stock's price
func (r *StockRepository) UpdatePrice(ctx context.Context, symbol string, newPricePaise int64, volume int64) error {
	update := bson.M{
		"$set": bson.M{
			"previousPricePaise": bson.M{"$ifNull": []interface{}{"$currentPricePaise", newPricePaise}},
			"currentPricePaise":  newPricePaise,
			"volume":             volume,
			"updatedAt":          time.Now(),
		},
	}

	// Use a two-step approach: read current, then update
	stock, err := r.FindBySymbol(ctx, symbol)
	if err != nil || stock == nil {
		return err
	}

	_, err = r.collection.UpdateOne(ctx, bson.M{"symbol": symbol}, bson.M{
		"$set": bson.M{
			"previousPricePaise": stock.CurrentPricePaise,
			"currentPricePaise":  newPricePaise,
			"volume":             volume,
			"updatedAt":          time.Now(),
		},
	})
	_ = update // Intentionally unused (using two-step approach above)
	return err
}

// UpdateDayHighLow updates the day's high and low prices
func (r *StockRepository) UpdateDayHighLow(ctx context.Context, symbol string, pricePaise int64) error {
	stock, err := r.FindBySymbol(ctx, symbol)
	if err != nil || stock == nil {
		return err
	}

	updates := bson.M{}
	if pricePaise > stock.DayHighPaise {
		updates["dayHighPaise"] = pricePaise
	}
	if pricePaise < stock.DayLowPaise {
		updates["dayLowPaise"] = pricePaise
	}

	if len(updates) > 0 {
		updates["updatedAt"] = time.Now()
		_, err = r.collection.UpdateOne(ctx, bson.M{"symbol": symbol}, bson.M{"$set": updates})
	}
	return err
}

// SeedIfEmpty checks and ensures all 35 Indian & US stocks are seeded in MongoDB.
func (r *StockRepository) SeedIfEmpty(ctx context.Context, historyRepo *PriceHistoryRepository) error {
	now := time.Now().UTC()
	stocks := []Stock{
		// --- 25 Indian Blue-Chip Equities (NSE) ---
		{Symbol: "RELIANCE", Name: "Reliance Industries Ltd", Sector: "Energy", Market: "NSE", CurrentPricePaise: 245000, PreviousPricePaise: 244500, DayHighPaise: 247000, DayLowPaise: 243000, Volume: 1250000, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Symbol: "TCS", Name: "Tata Consultancy Services Ltd", Sector: "IT", Market: "NSE", CurrentPricePaise: 355000, PreviousPricePaise: 354000, DayHighPaise: 358000, DayLowPaise: 352000, Volume: 850000, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Symbol: "INFY", Name: "Infosys Ltd", Sector: "IT", Market: "NSE", CurrentPricePaise: 148000, PreviousPricePaise: 147500, DayHighPaise: 150000, DayLowPaise: 146000, Volume: 1100000, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Symbol: "HDFCBANK", Name: "HDFC Bank Ltd", Sector: "Banking", Market: "NSE", CurrentPricePaise: 162500, PreviousPricePaise: 162000, DayHighPaise: 164000, DayLowPaise: 161000, Volume: 2300000, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Symbol: "ICICIBANK", Name: "ICICI Bank Ltd", Sector: "Banking", Market: "NSE", CurrentPricePaise: 98500, PreviousPricePaise: 98000, DayHighPaise: 99500, DayLowPaise: 97500, Volume: 1950000, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Symbol: "HINDUNILVR", Name: "Hindustan Unilever Ltd", Sector: "FMCG", Market: "NSE", CurrentPricePaise: 256000, PreviousPricePaise: 257000, DayHighPaise: 258000, DayLowPaise: 254000, Volume: 600000, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Symbol: "ITC", Name: "ITC Ltd", Sector: "FMCG", Market: "NSE", CurrentPricePaise: 44500, PreviousPricePaise: 44200, DayHighPaise: 44800, DayLowPaise: 44000, Volume: 3400000, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Symbol: "SBIN", Name: "State Bank of India", Sector: "Banking", Market: "NSE", CurrentPricePaise: 78000, PreviousPricePaise: 77500, DayHighPaise: 78800, DayLowPaise: 77000, Volume: 2800000, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Symbol: "BHARTIARTL", Name: "Bharti Airtel Ltd", Sector: "Telecom", Market: "NSE", CurrentPricePaise: 118000, PreviousPricePaise: 117000, DayHighPaise: 119500, DayLowPaise: 116500, Volume: 1400000, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Symbol: "TATAMOTORS", Name: "Tata Motors Ltd", Sector: "Auto", Market: "NSE", CurrentPricePaise: 92000, PreviousPricePaise: 91500, DayHighPaise: 93500, DayLowPaise: 91000, Volume: 2100000, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Symbol: "WIPRO", Name: "Wipro Ltd", Sector: "IT", Market: "NSE", CurrentPricePaise: 48000, PreviousPricePaise: 48500, DayHighPaise: 49000, DayLowPaise: 47500, Volume: 900000, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Symbol: "MARUTI", Name: "Maruti Suzuki India Ltd", Sector: "Auto", Market: "NSE", CurrentPricePaise: 1240000, PreviousPricePaise: 1230000, DayHighPaise: 1255000, DayLowPaise: 1220000, Volume: 350000, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Symbol: "BAJFINANCE", Name: "Bajaj Finance Ltd", Sector: "Financial Services", Market: "NSE", CurrentPricePaise: 685000, PreviousPricePaise: 680000, DayHighPaise: 695000, DayLowPaise: 678000, Volume: 550000, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Symbol: "LT", Name: "Larsen & Toubro Ltd", Sector: "Infrastructure", Market: "NSE", CurrentPricePaise: 345000, PreviousPricePaise: 343000, DayHighPaise: 349000, DayLowPaise: 341000, Volume: 700000, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Symbol: "KOTAKBANK", Name: "Kotak Mahindra Bank", Sector: "Banking", Market: "NSE", CurrentPricePaise: 175000, PreviousPricePaise: 174500, DayHighPaise: 176500, DayLowPaise: 173500, Volume: 1200000, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Symbol: "SUNPHARMA", Name: "Sun Pharmaceutical Industries", Sector: "Healthcare", Market: "NSE", CurrentPricePaise: 158000, PreviousPricePaise: 156500, DayHighPaise: 159500, DayLowPaise: 155500, Volume: 800000, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Symbol: "TITAN", Name: "Titan Company Ltd", Sector: "Consumer Goods", Market: "NSE", CurrentPricePaise: 325000, PreviousPricePaise: 323000, DayHighPaise: 328000, DayLowPaise: 321000, Volume: 450000, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Symbol: "AXISBANK", Name: "Axis Bank Ltd", Sector: "Banking", Market: "NSE", CurrentPricePaise: 112000, PreviousPricePaise: 111500, DayHighPaise: 113500, DayLowPaise: 110500, Volume: 1600000, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Symbol: "ADANIENT", Name: "Adani Enterprises Ltd", Sector: "Conglomerate", Market: "NSE", CurrentPricePaise: 289000, PreviousPricePaise: 287000, DayHighPaise: 293000, DayLowPaise: 284000, Volume: 1300000, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Symbol: "NTPC", Name: "NTPC Ltd", Sector: "Energy", Market: "NSE", CurrentPricePaise: 36000, PreviousPricePaise: 35800, DayHighPaise: 36500, DayLowPaise: 35500, Volume: 1800000, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Symbol: "POWERGRID", Name: "Power Grid Corp of India", Sector: "Utilities", Market: "NSE", CurrentPricePaise: 29000, PreviousPricePaise: 28800, DayHighPaise: 29400, DayLowPaise: 28600, Volume: 1500000, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Symbol: "TATASTEEL", Name: "Tata Steel Ltd", Sector: "Metals", Market: "NSE", CurrentPricePaise: 15200, PreviousPricePaise: 15100, DayHighPaise: 15450, DayLowPaise: 14950, Volume: 4500000, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Symbol: "ONGC", Name: "Oil & Natural Gas Corp", Sector: "Energy", Market: "NSE", CurrentPricePaise: 26500, PreviousPricePaise: 26300, DayHighPaise: 26900, DayLowPaise: 26100, Volume: 2200000, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Symbol: "JSWSTEEL", Name: "JSW Steel Ltd", Sector: "Metals", Market: "NSE", CurrentPricePaise: 89000, PreviousPricePaise: 88500, DayHighPaise: 90200, DayLowPaise: 88000, Volume: 1100000, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Symbol: "M&M", Name: "Mahindra & Mahindra Ltd", Sector: "Auto", Market: "NSE", CurrentPricePaise: 275000, PreviousPricePaise: 273000, DayHighPaise: 278000, DayLowPaise: 271000, Volume: 950000, IsActive: true, CreatedAt: now, UpdatedAt: now},

		// --- 10 US Global Tech & Blue-Chip Equities (NASDAQ/NYSE) ---
		{Symbol: "AAPL", Name: "Apple Inc.", Sector: "US Tech", Market: "US", CurrentPricePaise: 2885000, PreviousPricePaise: 2872000, DayHighPaise: 2920000, DayLowPaise: 2850000, Volume: 58000000, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Symbol: "MSFT", Name: "Microsoft Corporation", Sector: "US Tech", Market: "US", CurrentPricePaise: 3486000, PreviousPricePaise: 3470000, DayHighPaise: 3510000, DayLowPaise: 3450000, Volume: 22000000, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Symbol: "NVDA", Name: "NVIDIA Corporation", Sector: "US Tech", Market: "US", CurrentPricePaise: 1134000, PreviousPricePaise: 1115000, DayHighPaise: 1150000, DayLowPaise: 1105000, Volume: 84000000, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Symbol: "AMZN", Name: "Amazon.com Inc.", Sector: "US Tech", Market: "US", CurrentPricePaise: 1554000, PreviousPricePaise: 1540000, DayHighPaise: 1570000, DayLowPaise: 1530000, Volume: 32000000, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Symbol: "GOOGL", Name: "Alphabet Inc. (Google)", Sector: "US Tech", Market: "US", CurrentPricePaise: 1386000, PreviousPricePaise: 1375000, DayHighPaise: 1400000, DayLowPaise: 1365000, Volume: 24000000, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Symbol: "META", Name: "Meta Platforms Inc.", Sector: "US Tech", Market: "US", CurrentPricePaise: 4872000, PreviousPricePaise: 4830000, DayHighPaise: 4910000, DayLowPaise: 4800000, Volume: 16000000, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Symbol: "TSLA", Name: "Tesla Inc.", Sector: "US Auto & Tech", Market: "US", CurrentPricePaise: 1848000, PreviousPricePaise: 1820000, DayHighPaise: 1880000, DayLowPaise: 1800000, Volume: 45000000, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Symbol: "JPM", Name: "JPMorgan Chase & Co.", Sector: "US Financials", Market: "US", CurrentPricePaise: 1806000, PreviousPricePaise: 1795000, DayHighPaise: 1820000, DayLowPaise: 1785000, Volume: 12000000, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Symbol: "V", Name: "Visa Inc.", Sector: "US Financials", Market: "US", CurrentPricePaise: 2352000, PreviousPricePaise: 2340000, DayHighPaise: 2370000, DayLowPaise: 2330000, Volume: 9000000, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Symbol: "AMD", Name: "Advanced Micro Devices", Sector: "US Tech", Market: "US", CurrentPricePaise: 1310000, PreviousPricePaise: 1295000, DayHighPaise: 1330000, DayLowPaise: 1285000, Volume: 38000000, IsActive: true, CreatedAt: now, UpdatedAt: now},
	}

	for _, s := range stocks {
		filter := bson.M{"symbol": s.Symbol}
		update := bson.M{
			"$setOnInsert": bson.M{
				"symbol":             s.Symbol,
				"name":               s.Name,
				"sector":             s.Sector,
				"currentPricePaise":  s.CurrentPricePaise,
				"previousPricePaise": s.PreviousPricePaise,
				"dayHighPaise":       s.DayHighPaise,
				"dayLowPaise":        s.DayLowPaise,
				"volume":             s.Volume,
				"isActive":           s.IsActive,
				"createdAt":          s.CreatedAt,
			},
			"$set": bson.M{
				"market":    s.Market,
				"updatedAt": s.UpdatedAt,
			},
		}
		opts := options.Update().SetUpsert(true)
		if _, err := r.collection.UpdateOne(ctx, filter, update, opts); err != nil {
			return err
		}

		if historyRepo != nil {
			// Seed history only if not present
			hist, _ := historyRepo.FindBySymbol(ctx, s.Symbol, 1)
			if len(hist) == 0 {
				for i := 20; i >= 0; i-- {
					t := now.Add(-time.Duration(i*5) * time.Minute)
					priceOffset := int64((i%7 - 3) * 50)
					historyRepo.Insert(ctx, PriceHistory{
						Symbol:     s.Symbol,
						PricePaise: s.CurrentPricePaise + priceOffset,
						Volume:     s.Volume / 20,
						Timestamp:  t,
					})
				}
			}
		}
	}
	return nil
}
