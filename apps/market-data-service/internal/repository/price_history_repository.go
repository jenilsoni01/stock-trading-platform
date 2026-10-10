package repository

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// PriceHistory represents a historical price data point
type PriceHistory struct {
	Symbol    string    `bson:"symbol" json:"symbol"`
	PricePaise int64    `bson:"pricePaise" json:"pricePaise"`
	Volume    int64     `bson:"volume" json:"volume"`
	Timestamp time.Time `bson:"timestamp" json:"timestamp"`
}

// PriceHistoryRepository handles MongoDB operations for price history
type PriceHistoryRepository struct {
	collection *mongo.Collection
}

func NewPriceHistoryRepository(db *mongo.Database) *PriceHistoryRepository {
	return &PriceHistoryRepository{
		collection: db.Collection("price_history"),
	}
}

// Insert adds a new price history entry
func (r *PriceHistoryRepository) Insert(ctx context.Context, entry PriceHistory) error {
	_, err := r.collection.InsertOne(ctx, entry)
	return err
}

// FindBySymbol returns price history for a symbol, ordered by timestamp descending
func (r *PriceHistoryRepository) FindBySymbol(ctx context.Context, symbol string, limit int64) ([]PriceHistory, error) {
	filter := bson.M{"symbol": symbol}
	opts := options.Find().
		SetSort(bson.D{{Key: "timestamp", Value: -1}}).
		SetLimit(limit)

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var history []PriceHistory
	if err := cursor.All(ctx, &history); err != nil {
		return nil, err
	}
	return history, nil
}

// FindBySymbolAndTimeRange returns price history within a time range
func (r *PriceHistoryRepository) FindBySymbolAndTimeRange(ctx context.Context, symbol string, from, to time.Time) ([]PriceHistory, error) {
	filter := bson.M{
		"symbol": symbol,
		"timestamp": bson.M{
			"$gte": from,
			"$lte": to,
		},
	}
	opts := options.Find().SetSort(bson.D{{Key: "timestamp", Value: 1}})

	cursor, err := r.collection.Find(ctx, filter, opts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var history []PriceHistory
	if err := cursor.All(ctx, &history); err != nil {
		return nil, err
	}
	return history, nil
}
