# Implementation Plan

- [x] 1. Set up project foundation and core infrastructure


  - Initialize Next.js project with TypeScript configuration and required dependencies
  - Create project directory structure following the specified architecture
  - Configure environment variables and API key management
  - Set up basic error boundaries and loading components
  - _Requirements: 2.1, 2.4, 7.1, 10.1_

- [x] 1.1 Initialize Next.js project structure


  - Create Next.js project with TypeScript and configure tsconfig.json
  - Install required dependencies: axios, date-fns, zod, react, next
  - Set up .env.example and .env.local files with API key placeholders
  - _Requirements: 2.1, 10.1_



- [x] 1.2 Create core directory structure and base files



  - Create src/lib, src/services, src/components, src/app directory structure
  - Implement basic layout.tsx and page.tsx files


  - Create globals.css with base styling
  - _Requirements: 2.1_



- [x] 1.3 Implement error boundaries and loading components



  - Create ErrorBoundary component for graceful error handling
  - Implement LoadingSpinner component for loading states
  - Add Tooltip component for UI enhancements
  - _Requirements: 6.6, 7.3_



- [x] 2. Implement core data models and type definitions

  - Define TypeScript interfaces for MarketSnapshot, RegimeClassification, and PredictiveSignals
  - Create Zod validation schemas for runtime data validation


  - Implement core mathematical functions for trend scoring and calculations
  - _Requirements: 1.1, 2.4, 3.5_

- [x] 2.1 Create comprehensive type definitions


  - Define MarketSnapshot, IndexData, SectorData, and BreadthData interfaces
  - Create RegimeClassification and PredictiveSignals type definitions


  - Implement TradingCandidate and RiskMetrics interfaces
  - _Requirements: 1.1, 5.5_

- [x] 2.2 Implement Zod validation schemas


  - Create MarketSnapshotSchema for data validation
  - Implement IndexDataSchema and SectorDataSchema
  - Add validation for API responses and user inputs


  - _Requirements: 2.4_

- [x] 2.3 Build core mathematical functions


  - Implement trendScore9 calculation function


  - Create EMA calculation and comparison functions
  - Add ATR (Average True Range) calculation utilities
  - _Requirements: 1.2, 1.3_



- [x] 3. Develop data service layer with API integrations

  - Implement Polygon.io service for price and volume data
  - Create Twelve Data service for VIX and technical indicators
  - Build Tradier service for options and gamma data


  - Add graceful degradation and error handling for API failures
  - _Requirements: 2.1, 2.2, 2.3, 7.3_



- [x] 3.1 Implement Polygon.io service integration


  - Create PolygonService class with fetchMarketData method
  - Implement sector ETF data fetching functionality
  - Add volume data retrieval for breadth calculations
  - _Requirements: 2.1, 2.3_



- [x] 3.2 Build Twelve Data service for VIX and indicators


  - Create TwelveDataService class with VIX data fetching
  - Implement moving average data retrieval


  - Add technical indicator calculation support
  - _Requirements: 2.1, 2.3_

- [x] 3.3 Create Tradier service for options data


  - Implement TradierService class for gamma exposure data
  - Add options flow analysis capabilities


  - Create unusual options activity detection
  - _Requirements: 2.1, 3.3_

- [x] 3.4 Implement data source manager with fallback logic





  - Create DataSourcesManager to coordinate multiple APIs
  - Implement Promise.allSettled pattern for concurrent data fetching
  - Add graceful degradation when APIs fail


  - _Requirements: 2.2, 2.3, 7.3_

- [x] 4. Build regime classification engine

  - Implement the 5-factor regime detection algorithm


  - Create breadth calculation and analysis functions
  - Build regime strength scoring and early warning detection
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_



- [x] 4.1 Implement core regime classification logic



  - Create RegimeCompass class with classify method
  - Implement 5-factor evaluation: breadth, EMA, trend, VIX, gamma
  - Add BULL/BEAR/NEUTRAL regime determination logic


  - _Requirements: 1.1, 1.2, 1.3, 1.4_



- [x] 4.2 Build breadth calculation system


  - Implement breadth percentage calculation from sector data
  - Create advancing/declining stock analysis
  - Add breadth momentum and trend analysis
  - _Requirements: 1.1, 4.1, 4.2_



- [x] 4.3 Create regime strength scoring


  - Implement quantitative regime strength calculation (0-100 scale)
  - Add early warning signal detection for regime changes
  - Create confidence level assessment for regime classifications


  - _Requirements: 1.5, 3.1_

- [x] 5. Develop predictive analytics engine

  - Implement momentum divergence detection algorithms
  - Create volume analysis and confirmation signals
  - Build options flow analysis and institutional sentiment detection
  - Add regime probability forecasting capabilities
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_



- [x] 5.1 Implement momentum divergence detection


  - Create detectDivergences function for RSI and price analysis
  - Add bullish/bearish divergence identification


  - Implement hidden divergence detection algorithms
  - _Requirements: 3.1_

- [x] 5.2 Build volume analysis system


  - Implement volumeConfirmation function for price/volume analysis
  - Create volume thrust and exhaustion signal detection
  - Add accumulation/distribution pattern recognition
  - _Requirements: 3.2_

- [x] 5.3 Create options flow analysis


  - Implement analyzeOptionsFlow function for unusual activity detection
  - Add put/call ratio analysis and interpretation
  - Create forward bias calculation with confidence levels
  - _Requirements: 3.3_

- [x] 5.4 Build predictive engine orchestrator



  - Create PredictiveEngine class to coordinate all predictive signals
  - Implement generatePredictions method combining all analyses
  - Add regime probability forecasting for next week and month

  - _Requirements: 3.5_

- [x] 6. Implement sector analysis and heatmap functionality

  - Create sector scoring system with 9-day trend calculations
  - Build sector rotation recommendations and overweight/underweight logic
  - Implement visual heatmap data preparation
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 6.1 Build sector scoring system


  - Implement 9-day trend score calculation for each sector ETF
  - Create sector strength classification (strong >= 5, weak <= -3)
  - Add relative strength analysis between sectors
  - _Requirements: 4.1, 4.2_

- [x] 6.2 Create sector rotation logic


  - Implement sector recommendation engine for overweight/underweight
  - Add top 3 sector identification for portfolio allocation
  - Create sector avoidance list for weak performers
  - _Requirements: 4.3, 4.4, 4.5_

- [x] 7. Build trading signal generation and risk management


  - Implement position sizing calculations with volatility adjustments
  - Create trading signal generation for different regime types
  - Build risk management system with drawdown controls and stop losses
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

- [x] 7.1 Implement position sizing calculator


  - Create calculatePositionSize function with ATR-based risk calculation
  - Add volatility adjustment factors for different market conditions
  - Implement maximum position size limits (10% per position)
  - _Requirements: 5.4, 5.5_

- [x] 7.2 Build trading signal generator


  - Create regime-specific positioning recommendations (BULL: 70-80% long, BEAR: 20-30% long)
  - Implement entry/exit signal generation with stop losses and targets
  - Add trade candidate identification and ranking system
  - _Requirements: 5.1, 5.2, 5.3, 5.5_

- [x] 7.3 Create risk management system


  - Implement portfolio-level drawdown monitoring (5% reduction trigger, 7% stop)
  - Add VIX-based position size adjustments (50% reduction when VIX > 25)
  - Create stop loss and profit target calculation system
  - _Requirements: 5.6, 5.7, 5.8_

- [x] 8. Develop user interface components


  - Create main RegimeCompass dashboard component
  - Build PredictiveDashboard with forward-looking signals
  - Implement SectorHeatmap visualization component
  - Create TradeCompass for actionable trading signals
  - Build RiskMetrics display component
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 8.1 Build main RegimeCompass dashboard

  - Create RegimeCompass component displaying current regime status
  - Add visual regime indicators with confidence levels
  - Implement real-time data display with loading states
  - _Requirements: 6.1, 6.2_

- [x] 8.2 Implement PredictiveDashboard component



  - Create component displaying momentum divergences and volume analysis
  - Add options flow visualization with bias indicators
  - Implement forward guidance display with probability forecasts



  - _Requirements: 6.2, 6.3_

- [x] 8.3 Create SectorHeatmap visualization


  - Build interactive heatmap component with color-coded sector scores
  - Add sector recommendation display (overweight/underweight)
  - Implement real-time sector performance updates
  - _Requirements: 6.3, 4.6_


- [x] 8.4 Build TradeCompass component


  - Create component displaying long candidates and hedge suggestions
  - Add sector avoidance list with reasoning
  - Implement actionable trade signals with entry/exit levels
  - _Requirements: 6.4_


- [x] 8.5 Implement RiskMetrics component

  - Create position sizing calculator display
  - Add stop loss level visualization
  - Implement volatility adjustment indicators
  - _Requirements: 6.5_

- [x] 9. Create API endpoints and data orchestration


  - Build daily route handler for market data processing
  - Implement health check endpoint for system monitoring
  - Create snapshot builder to orchestrate all data sources
  - _Requirements: 2.5, 7.1, 7.4_

- [x] 9.1 Implement daily API route handler


  - Create /api/daily route for market snapshot generation
  - Add error handling and response formatting
  - Implement caching strategy for API responses
  - _Requirements: 2.5, 7.4_

- [x] 9.2 Build health check endpoint


  - Create /api/health route for system status monitoring
  - Add API connectivity checks for all data sources
  - Implement data freshness validation
  - _Requirements: 7.4, 7.5_

- [x] 9.3 Create snapshot builder orchestrator

  - Implement SnapshotBuilder class to coordinate data fetching
  - Add data validation and integrity checking
  - Create market snapshot assembly from multiple data sources
  - _Requirements: 2.3, 2.4_

- [x] 10. Implement performance optimization and monitoring


  - Add caching strategies for API responses and calculations
  - Implement lazy loading for large datasets
  - Create performance monitoring and logging system
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 10.1 Implement caching and performance optimization


  - Add response caching for external API calls
  - Implement lazy loading for sector heatmap data
  - Create performance monitoring for component render times
  - _Requirements: 8.1, 8.2, 8.5_

- [x] 10.2 Build logging and monitoring system

  - Create comprehensive logging for API calls and errors
  - Add performance metrics collection
  - Implement error tracking and reporting
  - _Requirements: 7.6, 8.4_

- [x] 11. Add export capabilities and integration features


  - Implement JSON API export for quantitative systems
  - Create CSV export functionality for spreadsheet analysis
  - Build webhook integration for real-time alerts
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 11.1 Create data export APIs



  - Implement JSON export endpoint for regime history and signals
  - Add CSV export functionality with downloadable files
  - Create webhook system for real-time regime change alerts
  - _Requirements: 9.1, 9.2, 9.3_


- [x] 11.2 Build brokerage integration compatibility

  - Create data format compatibility for major brokerage APIs
  - Add export formats for Alpaca, TD Ameritrade, Interactive Brokers
  - Implement historical data storage for backtesting
  - _Requirements: 9.4, 9.5_

- [x] 12. Implement security and configuration management


  - Add environment variable validation and security measures
  - Implement CORS configuration and security headers
  - Create secure API key management system
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 12.1 Implement security measures


  - Add CORS configuration and security headers
  - Implement API key validation and secure storage
  - Create input sanitization and validation
  - _Requirements: 10.1, 10.2, 10.5_

- [x] 12.2 Build configuration management

  - Create environment variable validation system
  - Add configuration change handling without restart
  - Implement secure logging without sensitive data exposure
  - _Requirements: 10.3, 10.4, 10.6_

- [x]* 13. Create comprehensive test suite


  - Write unit tests for core regime classification logic
  - Create integration tests for data service layer
  - Build component tests for React UI components
  - Add end-to-end tests for complete user workflows
  - _Requirements: All requirements validation_

- [x]* 13.1 Write unit tests for core logic


  - Test regime classification algorithm with various market conditions
  - Create tests for predictive signal generation accuracy
  - Add tests for mathematical calculations and edge cases
  - _Requirements: 1.1, 1.2, 1.3, 3.1, 3.2_

- [x]* 13.2 Create integration tests


  - Test API service integration with mock responses
  - Create tests for data validation and error handling
  - Add tests for snapshot builder orchestration
  - _Requirements: 2.1, 2.2, 2.3, 7.3_

- [x]* 13.3 Build component and E2E tests


  - Test React component rendering and user interactions
  - Create end-to-end tests for complete dashboard workflows
  - Add performance tests for load times and responsiveness
  - _Requirements: 6.1, 6.2, 6.3, 8.1, 8.2, 8.3_