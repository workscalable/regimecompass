# Paper Trading System API Documentation

Comprehensive API reference for the Paper Trading System.

## Table of Contents

- [Authentication](#authentication)
- [Base URL](#base-url)
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Endpoints](#endpoints)
  - [Accounts](#accounts)
  - [Trading](#trading)
  - [Positions](#positions)
  - [Performance](#performance)
  - [Configuration](#configuration)
  - [Monitoring](#monitoring)
  - [Alerts](#alerts)
- [WebSocket API](#websocket-api)
- [SDK Examples](#sdk-examples)

## Authentication

The API uses JWT (JSON Web Token) authentication for secure access.

### Getting a Token

```bash
POST /api/auth/login
Content-Type: application/json

{
  "username": "your_username",
  "password": "your_password"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600,
    "user": {
      "id": "user-123",
      "username": "your_username",
      "role": "trader"
    }
  }
}
```

### Using the Token

Include the JWT token in the Authorization header:

```bash
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Base URL

- **Development**: `http://localhost:3000/api`
- **Production**: `https://your-domain.com/api`

## Response Format

All API responses follow a consistent format:

### Success Response

```json
{
  "status": "success",
  "data": {
    // Response data
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Error Response

```json
{
  "status": "error",
  "message": "Error description",
  "code": "ERROR_CODE",
  "details": {
    // Additional error details
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## Error Handling

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 429 | Rate Limited |
| 500 | Internal Server Error |

### Error Codes

| Code | Description |
|------|-------------|
| `INVALID_REQUEST` | Request validation failed |
| `UNAUTHORIZED` | Authentication required |
| `FORBIDDEN` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `RATE_LIMITED` | Too many requests |
| `TRADE_REJECTED` | Trade validation failed |
| `INSUFFICIENT_FUNDS` | Not enough account balance |
| `POSITION_NOT_FOUND` | Position does not exist |
| `MARKET_CLOSED` | Market is closed |
| `API_ERROR` | External API error |

## Rate Limiting

- **Default**: 100 requests per minute per IP
- **Authenticated**: 1000 requests per minute per user
- **Trading**: 10 trades per minute per account

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642248600
```

## Endpoints

### Accounts

#### List Accounts

```bash
GET /api/accounts
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "accounts": [
      {
        "id": "acc-123",
        "name": "My Paper Account",
        "initialBalance": 100000,
        "currentBalance": 105250.75,
        "totalPnL": 5250.75,
        "totalPnLPercent": 5.25,
        "status": "ACTIVE",
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "total": 1
  }
}
```

#### Create Account

```bash
POST /api/accounts
Content-Type: application/json

{
  "name": "My New Account",
  "initialBalance": 50000,
  "riskSettings": {
    "maxRiskPerTrade": 0.02,
    "maxPortfolioHeat": 0.15
  }
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "account": {
      "id": "acc-456",
      "name": "My New Account",
      "initialBalance": 50000,
      "currentBalance": 50000,
      "status": "ACTIVE",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

#### Get Account Details

```bash
GET /api/accounts/{accountId}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "account": {
      "id": "acc-123",
      "name": "My Paper Account",
      "initialBalance": 100000,
      "currentBalance": 105250.75,
      "availableBalance": 98750.25,
      "marginUsed": 6500.50,
      "totalPnL": 5250.75,
      "totalPnLPercent": 5.25,
      "riskSettings": {
        "maxRiskPerTrade": 0.02,
        "maxPortfolioHeat": 0.20,
        "maxDrawdown": 0.10
      },
      "statistics": {
        "totalTrades": 45,
        "winningTrades": 28,
        "losingTrades": 17,
        "winRate": 62.22,
        "profitFactor": 1.85,
        "sharpeRatio": 1.42
      },
      "status": "ACTIVE",
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-15T10:25:00Z"
    }
  }
}
```

### Trading

#### Execute Trade

```bash
POST /api/trades
Content-Type: application/json

{
  "accountId": "acc-123",
  "ticker": "AAPL",
  "side": "LONG",
  "confidence": 0.85,
  "expectedMove": 0.03,
  "timeframe": "1D",
  "signalId": "signal-789",
  "metadata": {
    "strategy": "momentum",
    "regime": "trending"
  }
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "trade": {
      "id": "trade-456",
      "positionId": "pos-789",
      "accountId": "acc-123",
      "ticker": "AAPL",
      "optionSymbol": "AAPL240119C00185000",
      "side": "LONG",
      "contractType": "CALL",
      "strike": 185.00,
      "expiration": "2024-01-19",
      "quantity": 5,
      "entryPrice": 2.45,
      "premium": 1225.00,
      "confidence": 0.85,
      "executedAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

For complete API documentation, see the full file at docs/api.md