# Regime Compass

A sophisticated multi-factor market navigation system that detects market regimes using breadth analysis, momentum indicators, volatility metrics, gamma exposure, and volume confirmation.

## Features

- **Multi-Factor Regime Detection**: 5-pillar system (breadth, trend, volatility, gamma, momentum)
- **Predictive Analytics**: Forward-looking signals with momentum divergences and options flow
- **Sector Analysis**: Interactive heatmap with rotation recommendations
- **Risk Management**: Position sizing with volatility adjustments and drawdown controls
- **Real-time Data**: Integration with Polygon.io, Twelve Data, and Tradier APIs

## Getting Started

### Prerequisites

- Node.js 18+ 
- API keys for data sources (see .env.example)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env.local
   ```

4. Add your API keys to `.env.local`

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## API Keys Setup

### Required Services

- **Polygon.io**: Price and volume data for stocks/ETFs
- **Twelve Data**: VIX and market indicators  
- **Tradier**: Gamma exposure and options flow

### Configuration

Update `.env.local` with your API keys:

```bash
POLYGON_API_KEY=your_actual_polygon_key
TWELVEDATA_API_KEY=your_actual_twelvedata_key
TRADIER_API_KEY=your_actual_tradier_key
GEX_PROVIDER=proxy  # or 'none' for synthetic data
```

## Architecture

- **Frontend**: Next.js 14 with TypeScript and React
- **Data Layer**: Multi-source API integration with graceful fallbacks
- **Processing**: Real-time regime classification and predictive analytics
- **UI**: Responsive dashboard with interactive components

## Trading Regimes

- **BULL**: 70-80% long positioning, minimal hedging
- **BEAR**: 20-30% long positioning, 20-30% hedging  
- **NEUTRAL**: 50% long positioning, sector rotation focus

## License

Private - All rights reserved