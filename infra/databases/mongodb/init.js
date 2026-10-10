// MongoDB initialization for Market Data Service
// This runs automatically when the container is created for the first time.

// Switch to the market data database
db = db.getSiblingDB('market_data_db');

// Create collections with schema validation hints
db.createCollection('stocks', {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["symbol", "name", "sector"],
      properties: {
        symbol: { bsonType: "string", description: "Stock ticker symbol" },
        name: { bsonType: "string", description: "Company name" },
        sector: { bsonType: "string", description: "Industry sector" },
        currentPricePaise: { bsonType: "long", description: "Current price in paise" },
        isActive: { bsonType: "bool", description: "Whether stock is tradeable" }
      }
    }
  }
});

db.createCollection('price_history');
db.createCollection('market_config');

// Create indexes
db.stocks.createIndex({ "symbol": 1 }, { unique: true });
db.price_history.createIndex({ "symbol": 1, "timestamp": -1 });
db.price_history.createIndex({ "timestamp": 1 }, { expireAfterSeconds: 2592000 }); // 30 days TTL

// Seed stock data (Indian market stocks with prices in paise)
db.stocks.insertMany([
  {
    symbol: "RELIANCE",
    name: "Reliance Industries Ltd",
    sector: "Energy",
    currentPricePaise: NumberLong(245000),
    previousPricePaise: NumberLong(244500),
    dayHighPaise: NumberLong(247000),
    dayLowPaise: NumberLong(243000),
    volume: NumberLong(0),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    symbol: "TCS",
    name: "Tata Consultancy Services Ltd",
    sector: "IT",
    currentPricePaise: NumberLong(355000),
    previousPricePaise: NumberLong(354000),
    dayHighPaise: NumberLong(358000),
    dayLowPaise: NumberLong(352000),
    volume: NumberLong(0),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    symbol: "INFY",
    name: "Infosys Ltd",
    sector: "IT",
    currentPricePaise: NumberLong(148000),
    previousPricePaise: NumberLong(147500),
    dayHighPaise: NumberLong(150000),
    dayLowPaise: NumberLong(146000),
    volume: NumberLong(0),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    symbol: "HDFCBANK",
    name: "HDFC Bank Ltd",
    sector: "Banking",
    currentPricePaise: NumberLong(162500),
    previousPricePaise: NumberLong(162000),
    dayHighPaise: NumberLong(164000),
    dayLowPaise: NumberLong(161000),
    volume: NumberLong(0),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    symbol: "ICICIBANK",
    name: "ICICI Bank Ltd",
    sector: "Banking",
    currentPricePaise: NumberLong(98500),
    previousPricePaise: NumberLong(98000),
    dayHighPaise: NumberLong(99500),
    dayLowPaise: NumberLong(97500),
    volume: NumberLong(0),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    symbol: "HINDUNILVR",
    name: "Hindustan Unilever Ltd",
    sector: "FMCG",
    currentPricePaise: NumberLong(252000),
    previousPricePaise: NumberLong(251500),
    dayHighPaise: NumberLong(254000),
    dayLowPaise: NumberLong(250000),
    volume: NumberLong(0),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    symbol: "SBIN",
    name: "State Bank of India",
    sector: "Banking",
    currentPricePaise: NumberLong(62500),
    previousPricePaise: NumberLong(62000),
    dayHighPaise: NumberLong(63500),
    dayLowPaise: NumberLong(61500),
    volume: NumberLong(0),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    symbol: "BHARTIARTL",
    name: "Bharti Airtel Ltd",
    sector: "Telecom",
    currentPricePaise: NumberLong(155000),
    previousPricePaise: NumberLong(154500),
    dayHighPaise: NumberLong(157000),
    dayLowPaise: NumberLong(153000),
    volume: NumberLong(0),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    symbol: "ITC",
    name: "ITC Ltd",
    sector: "FMCG",
    currentPricePaise: NumberLong(44500),
    previousPricePaise: NumberLong(44200),
    dayHighPaise: NumberLong(45000),
    dayLowPaise: NumberLong(44000),
    volume: NumberLong(0),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    symbol: "WIPRO",
    name: "Wipro Ltd",
    sector: "IT",
    currentPricePaise: NumberLong(42000),
    previousPricePaise: NumberLong(41800),
    dayHighPaise: NumberLong(42500),
    dayLowPaise: NumberLong(41500),
    volume: NumberLong(0),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);

print("MongoDB initialized with 10 seed stocks");
