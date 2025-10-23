# Performance Analytics Engine

## Overview

The Performance Analytics Engine is a comprehensive system for real-time performance monitoring, analysis, and optimization of trading strategies. This system implements task 7.1 from the Gamma Adaptive System specification, providing advanced analytics capabilities for continuous strategy improvement.

## Key Features

### 1. Real-Time Performance Metrics
- **Comprehensive Metrics**: Win rate, profit factor, Sharpe ratio, maximum drawdown
- **Risk-Adjusted Analysis**: Volatility-adjusted returns and risk metrics
- **Advanced Statistics**: Consecutive wins/losses, holding periods, best/worst trades
- **Real-Time Updates**: Configurable update intervals (default: 5 seconds)

### 2. Confidence Effectiveness Analysis
- **Calibration Measurement**: How well confidence levels predict actual outcomes
- **Range-Based Analysis**: Performance breakdown by confidence ranges (0.4-0.6, 0.6-0.8, 0.8-1.0)
- **Automatic Adjustments**: Bounded confidence adjustments (±20%) to prevent overfitting
- **Accuracy Tracking**: Brier score-based accuracy measurement

### 3. Signal Accuracy Tracking
- **Multi-Factor Analysis**: Individual signal type effectiveness (trend, momentum, volume, ribbon, fibonacci, gamma)
- **Contribution Weighting**: Average contribution of each signal to overall confidence
- **Effectiveness Scoring**: Success rate weighted by signal contribution
- **Weight Recommendations**: Suggested adjustments for signal weighting

### 4. Performance Breakdown Analysis
- **Multi-Dimensional**: By ticker, strategy, market regime, confidence level, exit reason
- **Time-Based Analysis**: Daily, weekly, and monthly performance tracking
- **Comparative Analysis**: Performance comparison across different dimensions
- **Trend Identification**: Performance patterns and trends over time

## Architecture

```
PerformanceAnalyticsEngine
├── Real-Time Metrics Calculator
├── Confidence Effectiveness Analyzer
├── Signal Accuracy Tracker
├── Performance Breakdown Generator
├── Alert System
└── Configuration Manager

Supporting Components
├── Analytics Types & Schemas
├── Event System Integration
├── Database Integration
└── Caching System
```

## Core Metrics

### Basic Performance Metrics
- **Total Trades**: Number of completed trades
- **Win Rate**: Percentage of profitable trades
- **Total P&L**: Cumulative profit/loss
- **Average Win/Loss**: Mean profit of wins and losses
- **Profit Factor**: Ratio of gross profit to gross loss

### Risk-Adjusted Metrics
- **Sharpe Ratio**: Risk-adjusted return measurement
- **Maximum Drawdown**: Largest peak-to-trough decline
- **Current Drawdown**: Current decline from peak
- **Volatility**: Standard deviation of returns

### Advanced Metrics
- **Average Holding Period**: Mean time positions are held
- **Best/Worst Trade**: Largest profit and loss
- **Consecutive Wins/Losses**: Maximum streaks
- **Confidence Accuracy**: How well confidence predicts outcomes

## Configuration

### Default Configuration
```typescript
{
  lookbackPeriodDays: 30,           // Analysis period
  minTradesForAnalysis: 10,         // Minimum trades for statistical significance
  confidenceRanges: [0.4, 0.6, 0.8, 1.0], // Confidence buckets
  realTimeUpdateIntervalMs: 5000,   // Update frequency
  riskFreeRate: 0.02,              // For Sharpe ratio calculation
  minWinRateThreshold: 0.55,       // Alert threshold
  minProfitFactorThreshold: 1.5,   // Alert threshold
  maxDrawdownThreshold: 0.05       // Alert threshold (5%)
}
```

### Performance Thresholds
- **Excellent Win Rate**: ≥70%
- **Good Win Rate**: ≥60%
- **Acceptable Win Rate**: ≥55%
- **Excellent Profit Factor**: ≥2.0
- **Good Profit Factor**: ≥1.5
- **Acceptable Profit Factor**: ≥1.2
- **Maximum Acceptable Drawdown**: ≤5%

## Usage

### Basic Integration
```typescript
import { PerformanceAnalyticsEngine } from './PerformanceAnalyticsEngine';
import { DEFAULT_ANALYTICS_CONFIG } from './types/AnalyticsTypes';

// Initialize analytics engine
const analyticsEngine = new PerformanceAnalyticsEngine(
  eventBus,
  databaseManager,
  DEFAULT_ANALYTICS_CONFIG
);

// Start real-time analytics
await analyticsEngine.startRealTimeAnalytics();
```

### Real-Time Metrics
```typescript
// Get current performance metrics
const metrics = await analyticsEngine.calculateRealTimeMetrics();
console.log(`Win Rate: ${(metrics.winRate * 100).toFixed(1)}%`);
console.log(`Profit Factor: ${metrics.profitFactor.toFixed(2)}`);
console.log(`Sharpe Ratio: ${metrics.sharpeRatio.toFixed(2)}`);
console.log(`Max Drawdown: ${metrics.maxDrawdownPercent.toFixed(1)}%`);
```

### Confidence Analysis
```typescript
// Analyze confidence effectiveness
const effectiveness = await analyticsEngine.analyzeConfidenceEffectiveness();
effectiveness.forEach(range => {
  console.log(`${range.confidenceRange}: ${(range.winRate * 100).toFixed(1)}% win rate`);
  console.log(`Calibration: ${(range.calibration * 100).toFixed(1)}%`);
  console.log(`Recommended Adjustment: ${(range.recommendedAdjustment * 100).toFixed(1)}%`);
});
```

### Performance Breakdown
```typescript
// Generate comprehensive breakdown
const breakdown = await analyticsEngine.generatePerformanceBreakdown();

// Performance by ticker
Object.entries(breakdown.byTicker).forEach(([ticker, metrics]) => {
  console.log(`${ticker}: ${(metrics.winRate * 100).toFixed(1)}% win rate, $${metrics.totalPnL.toFixed(0)} P&L`);
});

// Performance by market regime
Object.entries(breakdown.byRegime).forEach(([regime, metrics]) => {
  console.log(`${regime}: ${metrics.totalTrades} trades, ${(metrics.winRate * 100).toFixed(1)}% win rate`);
});
```

## Event System

### Emitted Events
- `analytics:metrics:updated`: Real-time metrics update
- `analytics:performance:alert`: Performance threshold breach
- `analytics:insight:generated`: New learning insight available
- `analytics:calibration:adjusted`: Confidence calibration update

### Listened Events
- `paper:position:closed`: Trade completion for analysis
- `paper:account:update`: Account balance changes
- `paper:trade:analyzed`: Trade analysis data

## Alert System

### Performance Alerts
1. **Win Rate Alert**: Triggered when win rate falls below threshold
2. **Profit Factor Alert**: Triggered when profit factor is too low
3. **Drawdown Alert**: Triggered when drawdown exceeds threshold
4. **Consecutive Loss Alert**: Triggered after multiple consecutive losses
5. **Confidence Drift Alert**: Triggered when confidence calibration degrades

### Alert Configuration
```typescript
// Configure alert thresholds
analyticsEngine.updateConfig({
  minWinRateThreshold: 0.60,      // 60% minimum win rate
  minProfitFactorThreshold: 1.8,  // 1.8 minimum profit factor
  maxDrawdownThreshold: 0.03      // 3% maximum drawdown
});
```

## Confidence Calibration

### Calibration Process
1. **Range Analysis**: Group trades by confidence ranges
2. **Outcome Measurement**: Compare predicted vs actual win rates
3. **Calibration Scoring**: Calculate calibration accuracy (0-1 scale)
4. **Adjustment Calculation**: Determine recommended confidence adjustments
5. **Bounded Updates**: Apply adjustments within ±20% limits

### Calibration Metrics
- **Perfect Calibration**: Calibration score = 1.0
- **Good Calibration**: Calibration score ≥ 0.8
- **Poor Calibration**: Calibration score < 0.6
- **Overconfident**: Actual win rate < predicted
- **Underconfident**: Actual win rate > predicted

## Signal Effectiveness Analysis

### Signal Types Analyzed
- **Trend Signals**: Multi-timeframe trend analysis
- **Momentum Signals**: Price momentum and divergence
- **Volume Signals**: Volume profile and flow analysis
- **Ribbon Signals**: Moving average alignment
- **Fibonacci Signals**: Key level confluence
- **Gamma Signals**: Options market structure impact

### Effectiveness Metrics
- **Accuracy**: Success rate of signal predictions
- **Contribution**: Average weight in confidence calculation
- **Effectiveness**: Accuracy weighted by contribution
- **Recommended Weight**: Suggested signal weighting

## Performance Optimization

### Caching Strategy
- **In-Memory Cache**: Recent trades and analyses cached for fast access
- **Cache Invalidation**: Automatic refresh based on data age
- **Lazy Loading**: Data loaded on-demand to minimize memory usage
- **Batch Processing**: Multiple calculations batched for efficiency

### Real-Time Processing
- **Incremental Updates**: Only new data processed in real-time
- **Configurable Intervals**: Update frequency adjustable based on needs
- **Event-Driven**: Updates triggered by relevant events
- **Background Processing**: Heavy calculations performed asynchronously

## Database Integration

### Data Storage
- **Trade History**: Complete trade records with outcomes
- **Analysis Results**: Cached analysis results for performance
- **Configuration**: Persistent configuration storage
- **Metrics History**: Historical performance metrics

### Query Optimization
- **Indexed Queries**: Optimized database queries for fast retrieval
- **Connection Pooling**: Efficient database connection management
- **Batch Operations**: Multiple database operations batched
- **Caching Layer**: Frequently accessed data cached

## Monitoring and Observability

### Health Monitoring
```typescript
// Check analytics engine health
const health = await analyticsEngine.getHealthStatus();
console.log(`Running: ${health.isRunning}`);
console.log(`Cache Size: ${health.cacheSize} trades`);
console.log(`Last Update: ${health.lastUpdate}`);
```

### Performance Metrics
- **Processing Time**: Time to calculate metrics
- **Cache Hit Rate**: Efficiency of caching system
- **Memory Usage**: Memory consumption monitoring
- **Error Rate**: Frequency of calculation errors

## Error Handling

### Graceful Degradation
- **Calculation Errors**: Fallback to cached or default values
- **Data Unavailability**: Continue with available data
- **Database Issues**: In-memory operation continuation
- **Configuration Errors**: Validation and rollback

### Error Recovery
- **Automatic Retry**: Transient error retry logic
- **Circuit Breaker**: Protection against cascading failures
- **Fallback Modes**: Reduced functionality during issues
- **Alert Generation**: Notification of critical errors

## Testing

### Unit Tests
- **Metrics Calculation**: Comprehensive calculation testing
- **Confidence Analysis**: Calibration logic verification
- **Signal Analysis**: Effectiveness calculation testing
- **Event Handling**: Event system integration testing

### Integration Tests
- **Database Integration**: Data persistence and retrieval
- **Real-Time Processing**: End-to-end analytics workflow
- **Alert System**: Alert generation and handling
- **Configuration Management**: Dynamic configuration updates

## Examples

See `examples/PerformanceAnalyticsExample.ts` for comprehensive usage examples including:
- Real-time metrics calculation and interpretation
- Confidence effectiveness analysis
- Signal accuracy tracking
- Performance breakdown generation
- Real-time analytics and alerting
- Configuration management

## Requirements Fulfilled

This implementation satisfies the following requirements from task 7.1:

✅ **Real-time performance metrics calculation**
- Win rate, profit factor, Sharpe ratio, and maximum drawdown
- Comprehensive risk-adjusted metrics
- Advanced statistics and trend analysis

✅ **Confidence effectiveness measurement and signal accuracy tracking**
- Confidence calibration analysis across ranges
- Signal type effectiveness measurement
- Automatic adjustment recommendations

✅ **Performance breakdown by ticker, strategy, and market regime**
- Multi-dimensional performance analysis
- Time-based performance tracking
- Comparative analysis capabilities

## Future Enhancements

- Machine learning-based performance prediction
- Advanced statistical analysis (Monte Carlo simulations)
- Custom metric definitions and calculations
- Enhanced visualization and reporting
- Integration with external analytics platforms
- Real-time strategy optimization recommendations