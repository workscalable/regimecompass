# Configuration Guide

Complete configuration reference for the Paper Trading System.

## Table of Contents

- [Environment Variables](#environment-variables)
- [Configuration Files](#configuration-files)
- [Trading Configuration](#trading-configuration)
- [Risk Management Settings](#risk-management-settings)
- [API Configuration](#api-configuration)
- [Database Configuration](#database-configuration)
- [Monitoring Configuration](#monitoring-configuration)
- [Alert Configuration](#alert-configuration)
- [Development vs Production](#development-vs-production)

## Environment Variables

The system uses environment variables for configuration. Create a `.env` file in the project root.

### Required Variables

```bash
# API Keys
POLYGON_API_KEY=your_polygon_api_key_here
TRADIER_API_KEY=your_tradier_api_key_here

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=paper_trading
DB_USER=postgres
DB_PASSWORD=your_secure_password

# Application Settings
NODE_ENV=development
PORT=3000
```

### Optional Variables

```bash
# Logging
LOG_LEVEL=INFO                    # DEBUG, INFO, WARN, ERROR
LOG_FORMAT=json                   # json, text
LOG_FILE=logs/app.log

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Security
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h
BCRYPT_ROUNDS=12

# Trading Defaults
DEFAULT_ACCOUNT_BALANCE=100000
MAX_RISK_PER_TRADE=0.02
MAX_PORTFOLIO_HEAT=0.20
MAX_DRAWDOWN=0.10

# API Rate Limits
API_RATE_LIMIT=1000              # Requests per minute
TRADING_RATE_LIMIT=10            # Trades per minute

# External API Settings
POLYGON_RATE_LIMIT=5             # Requests per second
TRADIER_RATE_LIMIT=120           # Requests per minute
API_TIMEOUT=30000                # Timeout in milliseconds

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090
HEALTH_CHECK_INTERVAL=30000      # Health check interval in ms

# Alerts
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
WEBHOOK_URL=https://your-webhook-endpoint.com

# Development
ENABLE_CORS=true
CORS_ORIGIN=http://localhost:3000
ENABLE_SWAGGER=true
```

## Configuration Files

### Trading Configuration (`config/trading.json`)

```json
{
  "defaultSettings": {
    "accountBalance": 100000,
    "maxRiskPerTrade": 0.02,
    "maxPortfolioHeat": 0.20,
    "maxDrawdown": 0.10,
    "positionSizing": "FIXED_RISK",
    "currency": "USD"
  },
  "confidenceThresholds": {
    "high": 0.8,
    "medium": 0.6,
    "low": 0.4,
    "minimum": 0.3
  },
  "timeframes": {
    "1D": {
      "maxHoldingPeriod": "7d",
      "profitTargetMultiplier": 3.0,
      "stopLossMultiplier": 2.0
    },
    "1W": {
      "maxHoldingPeriod": "30d",
      "profitTargetMultiplier": 2.5,
      "stopLossMultiplier": 1.5
    },
    "1M": {
      "maxHoldingPeriod": "90d",
      "profitTargetMultiplier": 2.0,
      "stopLossMultiplier": 1.0
    }
  },
  "optionsSelection": {
    "deltaRange": [0.3, 0.7],
    "daysToExpiration": {
      "min": 7,
      "max": 45,
      "preferred": 21
    },
    "liquidityThreshold": {
      "minVolume": 100,
      "minOpenInterest": 500,
      "maxBidAskSpread": 0.10
    }
  },
  "marketHours": {
    "timezone": "America/New_York",
    "regular": {
      "start": "09:30",
      "end": "16:00"
    },
    "extended": {
      "preMarket": {
        "start": "04:00",
        "end": "09:30"
      },
      "afterHours": {
        "start": "16:00",
        "end": "20:00"
      }
    }
  }
}
```

### Risk Management Configuration (`config/risk.json`)

```json
{
  "globalLimits": {
    "maxAccountDrawdown": 0.10,
    "maxDailyLoss": 0.05,
    "maxWeeklyLoss": 0.08,
    "maxMonthlyLoss": 0.15
  },
  "positionLimits": {
    "maxRiskPerTrade": 0.02,
    "maxPortfolioHeat": 0.20,
    "maxPositionsPerTicker": 3,
    "maxTotalPositions": 20,
    "concentrationLimit": 0.25
  },
  "stopLoss": {
    "enabled": true,
    "type": "TRAILING",
    "initialStop": 2.0,
    "trailingDistance": 1.5,
    "maxLoss": 0.50
  },
  "profitTarget": {
    "enabled": true,
    "multiplier": 3.0,
    "partialExit": {
      "enabled": true,
      "firstTarget": 1.5,
      "firstTargetPercent": 0.5,
      "secondTarget": 3.0,
      "secondTargetPercent": 0.5
    }
  },
  "riskAdjustment": {
    "confidenceBased": true,
    "regimeBased": true,
    "volatilityBased": true,
    "drawdownBased": true
  }
}
```

### Database Configuration (`config/database.json`)

```json
{
  "development": {
    "host": "localhost",
    "port": 5432,
    "database": "paper_trading_dev",
    "username": "postgres",
    "password": "password",
    "dialect": "postgres",
    "logging": true,
    "pool": {
      "max": 5,
      "min": 0,
      "acquire": 30000,
      "idle": 10000
    }
  },
  "test": {
    "host": "localhost",
    "port": 5432,
    "database": "paper_trading_test",
    "username": "postgres",
    "password": "password",
    "dialect": "postgres",
    "logging": false
  },
  "production": {
    "host": "${DB_HOST}",
    "port": "${DB_PORT}",
    "database": "${DB_NAME}",
    "username": "${DB_USER}",
    "password": "${DB_PASSWORD}",
    "dialect": "postgres",
    "logging": false,
    "pool": {
      "max": 20,
      "min": 5,
      "acquire": 60000,
      "idle": 10000
    },
    "ssl": {
      "require": true,
      "rejectUnauthorized": false
    }
  }
}
```

## Trading Configuration

### Position Sizing Methods

```javascript
// Fixed Risk - Risk same dollar amount per trade
{
  "positionSizing": "FIXED_RISK",
  "riskAmount": 2000  // Risk $2000 per trade
}

// Fixed Percentage - Risk same percentage per trade
{
  "positionSizing": "FIXED_PERCENTAGE",
  "riskPercentage": 0.02  // Risk 2% per trade
}

// Confidence Based - Adjust size based on confidence
{
  "positionSizing": "CONFIDENCE_BASED",
  "baseRisk": 0.02,
  "confidenceMultiplier": {
    "high": 1.5,    // 3% risk for high confidence
    "medium": 1.0,  // 2% risk for medium confidence
    "low": 0.5      // 1% risk for low confidence
  }
}

// Kelly Criterion - Optimal position sizing
{
  "positionSizing": "KELLY",
  "kellyFraction": 0.25,  // Use 25% of Kelly recommendation
  "maxKelly": 0.05        // Cap at 5% regardless of Kelly
}
```

### Options Selection Criteria

```javascript
{
  "optionsSelection": {
    // Delta range for option selection
    "deltaRange": {
      "calls": [0.3, 0.7],
      "puts": [-0.7, -0.3]
    },
    
    // Days to expiration preferences
    "daysToExpiration": {
      "min": 7,        // Minimum DTE
      "max": 45,       // Maximum DTE
      "preferred": 21, // Preferred DTE
      "avoidWeekly": false
    },
    
    // Liquidity requirements
    "liquidity": {
      "minVolume": 100,
      "minOpenInterest": 500,
      "maxBidAskSpread": 0.10,
      "maxBidAskSpreadPercent": 0.05
    },
    
    // Strike selection
    "strikes": {
      "method": "DELTA_BASED", // DELTA_BASED, MONEYNESS_BASED
      "preferredMoneyness": 1.0,
      "maxStrikeSpacing": 5.0
    }
  }
}
```

## Risk Management Settings

### Dynamic Risk Adjustment

```javascript
{
  "riskAdjustment": {
    // Adjust risk based on confidence level
    "confidenceBased": {
      "enabled": true,
      "multipliers": {
        "high": 1.5,
        "medium": 1.0,
        "low": 0.5
      }
    },
    
    // Adjust risk based on market regime
    "regimeBased": {
      "enabled": true,
      "regimes": {
        "trending": 1.2,
        "ranging": 0.8,
        "volatile": 0.6,
        "crisis": 0.3
      }
    },
    
    // Adjust risk based on portfolio drawdown
    "drawdownBased": {
      "enabled": true,
      "thresholds": {
        "0.02": 1.0,   // Normal risk up to 2% drawdown
        "0.05": 0.75,  // Reduce risk at 5% drawdown
        "0.08": 0.5,   // Half risk at 8% drawdown
        "0.10": 0.0    // Stop trading at 10% drawdown
      }
    },
    
    // Adjust risk based on volatility
    "volatilityBased": {
      "enabled": true,
      "vixThresholds": {
        "15": 1.2,     // Increase risk in low vol
        "20": 1.0,     // Normal risk
        "30": 0.8,     // Reduce risk in high vol
        "40": 0.5      // Significantly reduce in extreme vol
      }
    }
  }
}
```

### Stop Loss Configuration

```javascript
{
  "stopLoss": {
    "type": "TRAILING",           // FIXED, TRAILING, ATR_BASED
    "initialStop": 2.0,           // Initial stop at 2x risk
    "trailingDistance": 1.5,      // Trail by 1.5x risk
    "maxLoss": 0.50,             // Never lose more than 50% of premium
    
    // Time-based stops
    "timeStop": {
      "enabled": true,
      "maxHoldingPeriod": "7d",   // Exit after 7 days regardless
      "weekendExit": false        // Don't force weekend exits
    },
    
    // Volatility-based stops
    "volatilityStop": {
      "enabled": true,
      "atrMultiplier": 2.0,       // Stop at 2x ATR
      "lookbackPeriod": 14        // Use 14-day ATR
    }
  }
}
```

## API Configuration

### External API Settings

```javascript
{
  "apis": {
    "polygon": {
      "baseUrl": "https://api.polygon.io",
      "apiKey": "${POLYGON_API_KEY}",
      "rateLimit": 5,              // Requests per second
      "timeout": 10000,            // 10 second timeout
      "retries": 3,
      "retryDelay": 1000,
      "endpoints": {
        "quotes": "/v2/last/trade",
        "options": "/v3/reference/options/contracts",
        "chains": "/v3/snapshot/options"
      }
    },
    
    "tradier": {
      "baseUrl": "https://api.tradier.com",
      "apiKey": "${TRADIER_API_KEY}",
      "rateLimit": 120,            // Requests per minute
      "timeout": 15000,
      "retries": 2,
      "retryDelay": 2000,
      "endpoints": {
        "quotes": "/v1/markets/quotes",
        "options": "/v1/markets/options/chains",
        "lookup": "/v1/markets/lookup"
      }
    }
  },
  
  "fallback": {
    "enabled": true,
    "primaryProvider": "polygon",
    "fallbackProvider": "tradier",
    "switchThreshold": 3,          // Switch after 3 failures
    "healthCheckInterval": 60000   // Check health every minute
  }
}
```

### Rate Limiting Configuration

```javascript
{
  "rateLimiting": {
    "global": {
      "windowMs": 60000,          // 1 minute window
      "max": 1000,                // Max requests per window
      "message": "Too many requests"
    },
    
    "trading": {
      "windowMs": 60000,
      "max": 10,                  // Max 10 trades per minute
      "skipSuccessfulRequests": false
    },
    
    "quotes": {
      "windowMs": 1000,           // 1 second window
      "max": 5,                   // Max 5 quote requests per second
      "skipSuccessfulRequests": true
    }
  }
}
```

## Database Configuration

### Connection Pooling

```javascript
{
  "database": {
    "pool": {
      "max": 20,                  // Maximum connections
      "min": 5,                   // Minimum connections
      "acquire": 60000,           // Max time to get connection
      "idle": 10000,              // Max idle time
      "evict": 1000,              // Eviction run interval
      "handleDisconnects": true
    },
    
    "retry": {
      "max": 3,                   // Max retry attempts
      "timeout": 5000,            // Timeout per attempt
      "backoff": "exponential"    // Backoff strategy
    },
    
    "ssl": {
      "require": true,
      "rejectUnauthorized": false,
      "ca": "path/to/ca-cert.pem"
    }
  }
}
```

### Migration Settings

```javascript
{
  "migrations": {
    "directory": "./database/migrations",
    "tableName": "migrations",
    "schemaName": "public",
    "disableTransactions": false
  },
  
  "seeds": {
    "directory": "./database/seeds"
  }
}
```

## Monitoring Configuration

### Metrics Collection

```javascript
{
  "monitoring": {
    "metrics": {
      "enabled": true,
      "port": 9090,
      "path": "/metrics",
      "collectDefaultMetrics": true,
      "customMetrics": {
        "trades": true,
        "positions": true,
        "performance": true,
        "errors": true
      }
    },
    
    "healthChecks": {
      "enabled": true,
      "interval": 30000,          // Check every 30 seconds
      "timeout": 5000,            // 5 second timeout
      "checks": {
        "database": true,
        "redis": true,
        "externalApis": true,
        "diskSpace": true,
        "memory": true
      }
    },
    
    "logging": {
      "level": "INFO",
      "format": "json",
      "file": "logs/app.log",
      "maxSize": "100MB",
      "maxFiles": 10,
      "compress": true
    }
  }
}
```

### Performance Monitoring

```javascript
{
  "performance": {
    "apm": {
      "enabled": true,
      "serviceName": "paper-trading-system",
      "environment": "${NODE_ENV}",
      "sampleRate": 0.1           // Sample 10% of transactions
    },
    
    "profiling": {
      "enabled": false,           // Enable in development only
      "cpuProfiling": true,
      "heapProfiling": true,
      "interval": 60000           // Profile every minute
    }
  }
}
```

## Alert Configuration

### Alert Channels

```javascript
{
  "alerts": {
    "channels": {
      "email": {
        "enabled": true,
        "smtp": {
          "host": "${SMTP_HOST}",
          "port": 587,
          "secure": false,
          "auth": {
            "user": "${SMTP_USER}",
            "pass": "${SMTP_PASSWORD}"
          }
        },
        "from": "alerts@paper-trading.com",
        "to": ["admin@company.com"]
      },
      
      "slack": {
        "enabled": true,
        "webhookUrl": "${SLACK_WEBHOOK_URL}",
        "channel": "#trading-alerts",
        "username": "Paper Trading Bot"
      },
      
      "webhook": {
        "enabled": true,
        "url": "${WEBHOOK_URL}",
        "method": "POST",
        "headers": {
          "Authorization": "Bearer ${WEBHOOK_TOKEN}"
        },
        "timeout": 10000
      }
    },
    
    "rules": {
      "system": {
        "severity": "HIGH",
        "channels": ["email", "slack"]
      },
      "trading": {
        "severity": "MEDIUM",
        "channels": ["slack"]
      },
      "risk": {
        "severity": "HIGH",
        "channels": ["email", "slack", "webhook"]
      }
    }
  }
}
```

### Alert Thresholds

```javascript
{
  "alertThresholds": {
    "system": {
      "cpuUsage": 80,             // Alert at 80% CPU
      "memoryUsage": 85,          // Alert at 85% memory
      "diskUsage": 90,            // Alert at 90% disk
      "errorRate": 0.05,          // Alert at 5% error rate
      "responseTime": 5000        // Alert at 5s response time
    },
    
    "trading": {
      "portfolioHeat": 0.20,      // Alert at 20% portfolio heat
      "drawdown": 0.05,           // Alert at 5% drawdown
      "dailyLoss": 0.03,          // Alert at 3% daily loss
      "consecutiveLosses": 5,     // Alert after 5 consecutive losses
      "positionSize": 0.10        // Alert if position > 10% of portfolio
    },
    
    "api": {
      "rateLimitUsage": 0.90,     // Alert at 90% rate limit usage
      "failureRate": 0.10,        // Alert at 10% API failure rate
      "latency": 2000             // Alert at 2s API latency
    }
  }
}
```

## Development vs Production

### Development Configuration

```bash
# .env.development
NODE_ENV=development
LOG_LEVEL=DEBUG
ENABLE_CORS=true
ENABLE_SWAGGER=true
DB_LOGGING=true
RATE_LIMIT_SKIP=true
```

### Production Configuration

```bash
# .env.production
NODE_ENV=production
LOG_LEVEL=INFO
ENABLE_CORS=false
ENABLE_SWAGGER=false
DB_LOGGING=false
RATE_LIMIT_SKIP=false

# Security
HELMET_ENABLED=true
COMPRESSION_ENABLED=true
TRUST_PROXY=true

# Performance
CLUSTER_MODE=true
CLUSTER_WORKERS=4
CACHE_TTL=300
```

### Docker Configuration

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    environment:
      - NODE_ENV=${NODE_ENV}
      - DB_HOST=postgres
      - REDIS_HOST=redis
    depends_on:
      - postgres
      - redis
    
  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=${DB_NAME}
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
```

## Configuration Validation

The system validates all configuration on startup:

```javascript
// Example validation errors
{
  "configErrors": [
    {
      "path": "trading.maxRiskPerTrade",
      "message": "Must be between 0.001 and 0.1",
      "value": 0.15
    },
    {
      "path": "apis.polygon.apiKey",
      "message": "API key is required",
      "value": null
    }
  ]
}
```

For configuration troubleshooting, check the application logs or use the health check endpoint:

```bash
curl http://localhost:3000/api/health?detailed=true
```