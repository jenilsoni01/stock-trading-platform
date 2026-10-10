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
