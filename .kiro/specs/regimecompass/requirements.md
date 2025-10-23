# Requirements Document

## Introduction

The Regime Compass is a sophisticated multi-factor market navigation system that detects market regimes using breadth analysis, momentum indicators, volatility metrics, gamma exposure, and volume confirmation. The system provides real-time regime classification (BULL/BEAR/NEUTRAL) with forward-looking predictive capabilities to generate actionable trading signals. It integrates multiple data sources including Polygon.io, Twelve Data, and Tradier to deliver comprehensive market analysis with proper risk management and position sizing recommendations.

## Requirements

### Requirement 1: Multi-Factor Regime Detection System

**User Story:** As a trader, I want the system to accurately classify market regimes using multiple confirmation factors, so that I can make informed trading decisions based on systematic analysis rather than subjective interpretation.

#### Acceptance Criteria

1. WHEN market data is analyzed THEN the system SHALL evaluate all 5 regime factors: breadth percentage, EMA alignment, 9-day trend score, VIX level/direction, and gamma exposure
2. WHEN breadth percentage is >= 62% AND EMA20 > EMA50 * 1.0025 AND trend score >= 3 AND (VIX < 20 OR VIX declining) AND (gamma <= 0 OR zero gamma distance < 0.01) THEN the system SHALL classify regime as BULL
3. WHEN breadth percentage is <= 38% AND EMA20 < EMA50 * 0.9975 AND trend score <= -3 AND (VIX > 20 OR VIX rising) AND gamma < 0 THEN the system SHALL classify regime as BEAR
4. WHEN neither BULL nor BEAR conditions are met THEN the system SHALL classify regime as NEUTRAL
5. WHEN regime classification changes THEN the system SHALL update all dependent calculations and trading signals immediately

### Requirement 2: Real-Time Data Integration and Processing

**User Story:** As a trader, I want the system to fetch and process real-time market data from multiple reliable sources, so that regime classifications and trading signals are based on current market conditions.

#### Acceptance Criteria

1. WHEN the system initializes THEN it SHALL establish connections to Polygon.io for price/volume data, Twelve Data for VIX indicators, and Tradier for options/gamma data
2. WHEN any primary data source fails THEN the system SHALL gracefully degrade to backup data sources or synthetic data without crashing
3. WHEN market data is requested THEN the system SHALL fetch data concurrently from all sources using Promise.allSettled pattern
4. WHEN data is received THEN the system SHALL validate data integrity using Zod schemas before processing
5. WHEN data refresh is triggered THEN the system SHALL update all calculations within 5 seconds
6. WHEN market is closed THEN the system SHALL use the most recent available data and indicate data staleness

### Requirement 3: Predictive Signal Generation

**User Story:** As a trader, I want forward-looking predictive signals that anticipate regime changes and market moves, so that I can position myself ahead of major market shifts rather than reacting after they occur.

#### Acceptance Criteria

1. WHEN price and RSI data is analyzed THEN the system SHALL detect momentum divergences (bullish, bearish, hidden) with strength scoring
2. WHEN volume and price data is processed THEN the system SHALL identify volume confirmation signals including up/down thrusts and exhaustion patterns
3. WHEN options flow data is available THEN the system SHALL analyze unusual options activity and calculate forward bias with confidence levels
4. WHEN institutional flow data is processed THEN the system SHALL detect accumulation/distribution patterns and dark pool activity
5. WHEN all predictive signals are calculated THEN the system SHALL generate regime probability forecasts for next week and next month
6. WHEN early regime change signals are detected THEN the system SHALL provide warning levels (low/medium/high) with expected timeframes

### Requirement 4: Sector Analysis and Heatmap Visualization

**User Story:** As a trader, I want to see sector strength and weakness through visual heatmaps with quantitative scores, so that I can identify the best sectors to overweight and underweight in my portfolio.

#### Acceptance Criteria

1. WHEN sector data is processed THEN the system SHALL calculate 9-day trend scores for each major sector ETF
2. WHEN sector scores are computed THEN the system SHALL display scores ranging from -9 to +9 with color-coded visualization
3. WHEN sectors have scores >= 5 THEN the system SHALL classify them as "strong" and recommend for overweighting
4. WHEN sectors have scores <= -3 THEN the system SHALL classify them as "weak" and recommend for underweighting
5. WHEN sector rotation is analyzed THEN the system SHALL provide top 3 sectors for overweighting and identify sectors to avoid
6. WHEN heatmap is displayed THEN it SHALL update in real-time with current sector performance and trend changes

### Requirement 5: Trading Signal Generation and Risk Management

**User Story:** As a trader, I want clear, actionable trading signals with proper position sizing and risk management parameters, so that I can execute trades systematically with appropriate risk controls.

#### Acceptance Criteria

1. WHEN regime is BULL THEN the system SHALL recommend 70-80% long positioning with 0-10% hedging and position size factor 1.0-1.25
2. WHEN regime is BEAR THEN the system SHALL recommend 20-30% long positioning with 20-30% hedging and position size factor 0.5-0.8
3. WHEN regime is NEUTRAL THEN the system SHALL recommend 50% long positioning with 10-20% hedging and reduced position sizes
4. WHEN calculating position size THEN the system SHALL use formula: (risk per trade / ATR risk) * volatility adjustment, capped at 10% per position
5. WHEN generating trade signals THEN the system SHALL provide entry levels, stop losses (2% or 1x ATR), and profit targets (1.5x ATR)
6. WHEN VIX exceeds 25 THEN the system SHALL automatically reduce all position sizes by 50%
7. WHEN portfolio drawdown reaches 5% THEN the system SHALL trigger position size reduction by 50%
8. WHEN portfolio drawdown reaches 7% THEN the system SHALL recommend moving to 100% cash

### Requirement 6: User Interface and Dashboard Components

**User Story:** As a trader, I want an intuitive dashboard that clearly displays regime status, predictive signals, sector analysis, and trading recommendations, so that I can quickly assess market conditions and make trading decisions.

#### Acceptance Criteria

1. WHEN the dashboard loads THEN it SHALL display current regime classification with visual indicators and confidence levels
2. WHEN predictive signals are available THEN the dashboard SHALL show momentum divergences, volume analysis, and options flow with clear visual cues
3. WHEN sector analysis is complete THEN the dashboard SHALL display an interactive heatmap with sector scores and recommendations
4. WHEN trading signals are generated THEN the dashboard SHALL show long candidates, hedge suggestions, and sectors to avoid
5. WHEN risk metrics are calculated THEN the dashboard SHALL display position sizing recommendations, stop loss levels, and volatility adjustments
6. WHEN data is loading THEN the system SHALL show appropriate loading states and progress indicators
7. WHEN errors occur THEN the system SHALL display user-friendly error messages with fallback options

### Requirement 7: API Integration and Health Monitoring

**User Story:** As a system administrator, I want robust API integration with health monitoring and error handling, so that the system remains reliable and provides consistent service even when external dependencies fail.

#### Acceptance Criteria

1. WHEN API keys are configured THEN the system SHALL validate connectivity to all data providers during initialization
2. WHEN API rate limits are approached THEN the system SHALL implement appropriate throttling and caching strategies
3. WHEN API calls fail THEN the system SHALL retry with exponential backoff and log detailed error information
4. WHEN health check endpoint is accessed THEN it SHALL return system status including API connectivity and data freshness
5. WHEN multiple API failures occur THEN the system SHALL gracefully degrade to backup data sources or cached data
6. WHEN system performance degrades THEN monitoring SHALL alert administrators with specific error details and affected components

### Requirement 8: Performance and Scalability

**User Story:** As a user, I want the system to load quickly and respond to interactions promptly, so that I can make time-sensitive trading decisions without delays.

#### Acceptance Criteria

1. WHEN the application initially loads THEN it SHALL complete loading within 3 seconds
2. WHEN data refresh is triggered THEN new data SHALL be displayed within 5 seconds
3. WHEN user interactions occur THEN the interface SHALL respond within 500 milliseconds
4. WHEN multiple users access the system THEN performance SHALL remain consistent without degradation
5. WHEN large datasets are processed THEN the system SHALL use lazy loading and pagination to maintain responsiveness
6. WHEN mobile devices access the system THEN the interface SHALL be fully responsive and functional

### Requirement 9: Data Export and Integration Capabilities

**User Story:** As a quantitative trader, I want to export system data and signals in multiple formats, so that I can integrate the regime analysis with my existing trading systems and perform additional analysis.

#### Acceptance Criteria

1. WHEN export is requested THEN the system SHALL provide data in JSON format for API integration
2. WHEN CSV export is requested THEN the system SHALL generate downloadable files with regime history and signals
3. WHEN webhook integration is configured THEN the system SHALL send real-time alerts for regime changes and critical signals
4. WHEN brokerage integration is needed THEN the system SHALL provide compatible data formats for Alpaca, TD Ameritrade, Interactive Brokers, and Tradier APIs
5. WHEN historical analysis is required THEN the system SHALL maintain data history for backtesting and performance analysis

### Requirement 10: Security and Configuration Management

**User Story:** As a system administrator, I want secure configuration management and proper access controls, so that sensitive API keys and trading data are protected while maintaining system functionality.

#### Acceptance Criteria

1. WHEN API keys are stored THEN they SHALL be kept in environment variables and never exposed in client-side code
2. WHEN the application is deployed THEN it SHALL implement proper CORS configuration and security headers
3. WHEN user sessions are managed THEN appropriate authentication and authorization controls SHALL be enforced
4. WHEN configuration changes are made THEN they SHALL be validated and applied without requiring system restart
5. WHEN sensitive data is transmitted THEN it SHALL be encrypted using industry-standard protocols
6. WHEN logs are generated THEN they SHALL exclude sensitive information while providing adequate debugging detail