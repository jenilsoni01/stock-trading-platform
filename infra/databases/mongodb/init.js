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
    currentPricePaise: NumberLong(48000),
    previousPricePaise: NumberLong(48500),
    dayHighPaise: NumberLong(49000),
    dayLowPaise: NumberLong(47500),
    volume: NumberLong(900000),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    symbol: "TATAMOTORS",
    name: "Tata Motors Ltd",
    sector: "Auto",
    currentPricePaise: NumberLong(92000),
    previousPricePaise: NumberLong(91500),
    dayHighPaise: NumberLong(93500),
    dayLowPaise: NumberLong(91000),
    volume: NumberLong(2100000),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    symbol: "MARUTI",
    name: "Maruti Suzuki India Ltd",
    sector: "Auto",
    currentPricePaise: NumberLong(1240000),
    previousPricePaise: NumberLong(1230000),
    dayHighPaise: NumberLong(1255000),
    dayLowPaise: NumberLong(1220000),
    volume: NumberLong(350000),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    symbol: "BAJFINANCE",
    name: "Bajaj Finance Ltd",
    sector: "Financial Services",
    currentPricePaise: NumberLong(685000),
    previousPricePaise: NumberLong(680000),
    dayHighPaise: NumberLong(695000),
    dayLowPaise: NumberLong(678000),
    volume: NumberLong(550000),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    symbol: "LT",
    name: "Larsen & Toubro Ltd",
    sector: "Infrastructure",
    currentPricePaise: NumberLong(345000),
    previousPricePaise: NumberLong(343000),
    dayHighPaise: NumberLong(349000),
    dayLowPaise: NumberLong(341000),
    volume: NumberLong(700000),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    symbol: "KOTAKBANK",
    name: "Kotak Mahindra Bank",
    sector: "Banking",
    currentPricePaise: NumberLong(175000),
    previousPricePaise: NumberLong(174500),
    dayHighPaise: NumberLong(176500),
    dayLowPaise: NumberLong(173500),
    volume: NumberLong(1200000),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    symbol: "SUNPHARMA",
    name: "Sun Pharmaceutical Industries",
    sector: "Healthcare",
    currentPricePaise: NumberLong(158000),
    previousPricePaise: NumberLong(156500),
    dayHighPaise: NumberLong(159500),
    dayLowPaise: NumberLong(155500),
    volume: NumberLong(800000),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    symbol: "TITAN",
    name: "Titan Company Ltd",
    sector: "Consumer Goods",
    currentPricePaise: NumberLong(325000),
    previousPricePaise: NumberLong(323000),
    dayHighPaise: NumberLong(328000),
    dayLowPaise: NumberLong(321000),
    volume: NumberLong(450000),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    symbol: "AXISBANK",
    name: "Axis Bank Ltd",
    sector: "Banking",
    currentPricePaise: NumberLong(112000),
    previousPricePaise: NumberLong(111500),
    dayHighPaise: NumberLong(113500),
    dayLowPaise: NumberLong(110500),
    volume: NumberLong(1600000),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    symbol: "ADANIENT",
    name: "Adani Enterprises Ltd",
    sector: "Conglomerate",
    currentPricePaise: NumberLong(289000),
    previousPricePaise: NumberLong(287000),
    dayHighPaise: NumberLong(293000),
    dayLowPaise: NumberLong(284000),
    volume: NumberLong(1300000),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    symbol: "NTPC",
    name: "NTPC Ltd",
    sector: "Energy",
    currentPricePaise: NumberLong(36000),
    previousPricePaise: NumberLong(35800),
    dayHighPaise: NumberLong(36500),
    dayLowPaise: NumberLong(35500),
    volume: NumberLong(1800000),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    symbol: "POWERGRID",
    name: "Power Grid Corp of India",
    sector: "Utilities",
    currentPricePaise: NumberLong(29000),
    previousPricePaise: NumberLong(28800),
    dayHighPaise: NumberLong(29400),
    dayLowPaise: NumberLong(28600),
    volume: NumberLong(1500000),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    symbol: "TATASTEEL",
    name: "Tata Steel Ltd",
    sector: "Metals",
    currentPricePaise: NumberLong(15200),
    previousPricePaise: NumberLong(15100),
    dayHighPaise: NumberLong(15450),
    dayLowPaise: NumberLong(14950),
    volume: NumberLong(4500000),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    symbol: "ONGC",
    name: "Oil & Natural Gas Corp",
    sector: "Energy",
    currentPricePaise: NumberLong(26500),
    previousPricePaise: NumberLong(26300),
    dayHighPaise: NumberLong(26900),
    dayLowPaise: NumberLong(26100),
    volume: NumberLong(2200000),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    symbol: "JSWSTEEL",
    name: "JSW Steel Ltd",
    sector: "Metals",
    currentPricePaise: NumberLong(89000),
    previousPricePaise: NumberLong(88500),
    dayHighPaise: NumberLong(90200),
    dayLowPaise: NumberLong(88000),
    volume: NumberLong(1100000),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    symbol: "M&M",
    name: "Mahindra & Mahindra Ltd",
    sector: "Auto",
    currentPricePaise: NumberLong(275000),
    previousPricePaise: NumberLong(273000),
    dayHighPaise: NumberLong(278000),
    dayLowPaise: NumberLong(271000),
    volume: NumberLong(950000),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
]);

print("MongoDB initialized with 25 seed stocks");
