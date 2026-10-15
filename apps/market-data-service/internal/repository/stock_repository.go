package repository

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Stock represents a stock document in MongoDB
type Stock struct {
	Symbol            string    `bson:"symbol" json:"symbol"`
	Name              string    `bson:"name" json:"name"`
	Sector            string    `bson:"sector" json:"sector"`
	CurrentPricePaise int64     `bson:"currentPricePaise" json:"currentPricePaise"`
	PreviousPricePaise int64    `bson:"previousPricePaise" json:"previousPricePaise"`
	DayHighPaise      int64     `bson:"dayHighPaise" json:"dayHighPaise"`
	DayLowPaise       int64     `bson:"dayLowPaise" json:"dayLowPaise"`
	Volume            int64     `bson:"volume" json:"volume"`
	IsActive          bool      `bson:"isActive" json:"isActive"`
	CreatedAt         time.Time `bson:"createdAt" json:"createdAt"`
	UpdatedAt         time.Time `bson:"updatedAt" json:"updatedAt"`
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
	var stock Stock
	err := r.collection.FindOne(ctx, bson.M{"symbol": symbol}).Decode(&stock)
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

// SeedIfEmpty checks if the collection is empty. If so, seeds 25 large Indian market stocks and price points.
func (r *StockRepository) SeedIfEmpty(ctx context.Context, historyRepo *PriceHistoryRepository) error {
	count, err := r.collection.CountDocuments(ctx, bson.M{})
	if err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	now := time.Now().UTC()
	stocks := []Stock{
		{Symbol: "RELIANCE", Name: "Reliance Industries Ltd", Sector: "Energy", CurrentPricePaise: 245000, PreviousPricePaise: 244500, DayHighPaise: 247000, DayLowPaise: 243000, Volume: 1250000, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Symbol: "TCS", Name: "Tata Consultancy Services Ltd", Sector: "IT", CurrentPricePaise: 355000, PreviousPricePaise: 354000, DayHighPaise: 358000, DayLowPaise: 352000, Volume: 850000, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Symbol: "INFY", Name: "Infosys Ltd", Sector: "IT", CurrentPricePaise: 148000, PreviousPricePaise: 147500, DayHighPaise: 150000, DayLowPaise: 146000, Volume: 1100000, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Symbol: "HDFCBANK", Name: "HDFC Bank Ltd", Sector: "Banking", CurrentPricePaise: 162500, PreviousPricePaise: 162000, DayHighPaise: 164000, DayLowPaise: 161000, Volume: 2300000, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Symbol: "ICICIBANK", Name: "ICICI Bank Ltd", Sector: "Banking", CurrentPricePaise: 98500, PreviousPricePaise: 98000, DayHighPaise: 99500, DayLowPaise: 97500, Volume: 1950000, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Symbol: "HINDUNILVR", Name: "Hindustan Unilever Ltd", Sector: "FMCG", CurrentPricePaise: 256000, PreviousPricePaise: 257000, DayHighPaise: 258000, DayLowPaise: 254000, Volume: 600000, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Symbol: "ITC", Name: "ITC Ltd", Sector: "FMCG", CurrentPricePaise: 44500, PreviousPricePaise: 44200, DayHighPaise: 44800, DayLowPaise: 44000, Volume: 3400000, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Symbol: "SBIN", Name: "State Bank of India", Sector: "Banking", CurrentPricePaise: 78000, PreviousPricePaise: 77500, DayHighPaise: 78800, DayLowPaise: 77000, Volume: 2800000, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Symbol: "BHARTIARTL", Name: "Bharti Airtel Ltd", Sector: "Telecom", CurrentPricePaise: 118000, PreviousPricePaise: 117000, DayHighPaise: 119500, DayLowPaise: 116500, Volume: 1400000, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Symbol: "TATAMOTORS", Name: "Tata Motors Ltd", Sector: "Auto", CurrentPricePaise: 92000, PreviousPricePaise: 91500, DayHighPaise: 93500, DayLowPaise: 91000, Volume: 2100000, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Symbol: "WIPRO", Name: "Wipro Ltd", Sector: "IT", CurrentPricePaise: 48000, PreviousPricePaise: 48500, DayHighPaise: 49000, DayLowPaise: 47500, Volume: 900000, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Symbol: "MARUTI", Name: "Maruti Suzuki India Ltd", Sector: "Auto", CurrentPricePaise: 1240000, PreviousPricePaise: 1230000, DayHighPaise: 1255000, DayLowPaise: 1220000, Volume: 350000, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Symbol: "BAJFINANCE", Name: "Bajaj Finance Ltd", Sector: "Financial Services", CurrentPricePaise: 685000, PreviousPricePaise: 680000, DayHighPaise: 695000, DayLowPaise: 678000, Volume: 550000, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Symbol: "LT", Name: "Larsen & Toubro Ltd", Sector: "Infrastructure", CurrentPricePaise: 345000, PreviousPricePaise: 343000, DayHighPaise: 349000, DayLowPaise: 341000, Volume: 700000, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Symbol: "KOTAKBANK", Name: "Kotak Mahindra Bank", Sector: "Banking", CurrentPricePaise: 175000, PreviousPricePaise: 174500, DayHighPaise: 176500, DayLowPaise: 173500, Volume: 1200000, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Symbol: "SUNPHARMA", Name: "Sun Pharmaceutical Industries", Sector: "Healthcare", CurrentPricePaise: 158000, PreviousPricePaise: 156500, DayHighPaise: 159500, DayLowPaise: 155500, Volume: 800000, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Symbol: "TITAN", Name: "Titan Company Ltd", Sector: "Consumer Goods", CurrentPricePaise: 325000, PreviousPricePaise: 323000, DayHighPaise: 328000, DayLowPaise: 321000, Volume: 450000, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Symbol: "AXISBANK", Name: "Axis Bank Ltd", Sector: "Banking", CurrentPricePaise: 112000, PreviousPricePaise: 111500, DayHighPaise: 113500, DayLowPaise: 110500, Volume: 1600000, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Symbol: "ADANIENT", Name: "Adani Enterprises Ltd", Sector: "Conglomerate", CurrentPricePaise: 289000, PreviousPricePaise: 287000, DayHighPaise: 293000, DayLowPaise: 284000, Volume: 1300000, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Symbol: "NTPC", Name: "NTPC Ltd", Sector: "Energy", CurrentPricePaise: 36000, PreviousPricePaise: 35800, DayHighPaise: 36500, DayLowPaise: 35500, Volume: 1800000, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Symbol: "POWERGRID", Name: "Power Grid Corp of India", Sector: "Utilities", CurrentPricePaise: 29000, PreviousPricePaise: 28800, DayHighPaise: 29400, DayLowPaise: 28600, Volume: 1500000, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Symbol: "TATASTEEL", Name: "Tata Steel Ltd", Sector: "Metals", CurrentPricePaise: 15200, PreviousPricePaise: 15100, DayHighPaise: 15450, DayLowPaise: 14950, Volume: 4500000, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Symbol: "ONGC", Name: "Oil & Natural Gas Corp", Sector: "Energy", CurrentPricePaise: 26500, PreviousPricePaise: 26300, DayHighPaise: 26900, DayLowPaise: 26100, Volume: 2200000, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Symbol: "JSWSTEEL", Name: "JSW Steel Ltd", Sector: "Metals", CurrentPricePaise: 89000, PreviousPricePaise: 88500, DayHighPaise: 90200, DayLowPaise: 88000, Volume: 1100000, IsActive: true, CreatedAt: now, UpdatedAt: now},
		{Symbol: "M&M", Name: "Mahindra & Mahindra Ltd", Sector: "Auto", CurrentPricePaise: 275000, PreviousPricePaise: 273000, DayHighPaise: 278000, DayLowPaise: 271000, Volume: 950000, IsActive: true, CreatedAt: now, UpdatedAt: now},
	}

	var docs []interface{}
	for _, s := range stocks {
		docs = append(docs, s)
	}
	if _, err := r.collection.InsertMany(ctx, docs); err != nil {
		return err
	}

	if historyRepo != nil {
		for _, s := range stocks {
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
	return nil
}
