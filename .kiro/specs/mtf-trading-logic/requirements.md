# Requirements Document

## Introduction

The Multi-Timeframe Integrated Trading Logic v3.0 is a production-ready MTF trading engine that enhances the existing paper trading system with sophisticated temporal state sequencing, multi-timeframe confluence scoring, and comprehensive alerting capabilities. The system implements a READY → SET → GO → TRADE → EXIT state machine with intelligent transitions based on multi-timeframe signal analysis, providing professional-grade trading decision logic that mirrors prop firm workflows.

## Requirements

### Requirement 1: Multi-Timeframe Confluence Scoring

**User Story:** As a trader, I want the system to analyze signals across multiple timeframes (Daily, Hourly, 30-minute) and compute a weighted confluence score, so that trading decisions are based on comprehensive market analysis rather than single timeframe signals.

#### Acceptance Criteria

1. WHEN computing MTF confluence THEN the system SHALL use weighted scoring: Daily (40%), Hourly (35%), 30-minute (25%)
2. WHEN power candle is detected on 30-minute timeframe THEN the system SHALL add 4% confidence bonus
3. WHEN volume surge occurs THEN the system SHALL add 3% confidence bonus  
4. WHEN ribbon alignment exceeds 80% across timeframes THEN the system SHALL add 5% confluence bonus
5. WHEN gamma exposure is negative (trend acceleration) THEN the system SHALL apply positive adjustment up to +10%
6. WHEN Fibonacci zone is in compression (<0.5) THEN the system SHALL add 3% bonus, in exhaustion (>1.618) SHALL subtract 5%

### Requirement 2: Temporal State Sequencing

**User Story:** As a trading system, I want intelligent state transitions that prevent premature entries and ensure proper trade sequencing, so that trades are executed only when all timeframes align with optimal timing.

#### Acceptance Criteria

1. WHEN in READY state AND 30m confidence > 55% AND hourly confidence > 50% THEN system SHALL transition to SET within 1 hour
2. WHEN in SET state AND hourly confidence > 60% AND daily bias aligns AND MTF confluence > 65% THEN system SHALL transition to GO
3. WHEN in GO state AND power candle detected AND Fibonacci zone <= 1.27 AND MTF confluence > 70% THEN system SHALL transition to TRADE
4. WHEN in TRADE state AND hourly confidence < 50% OR confluence < 50% THEN system SHALL transition to EXIT
5. WHEN major timeframe divergence detected THEN system SHALL transition to ABORT regardless of current state
6. WHEN in EXIT/ABORT state THEN system SHALL return to READY after 5-minute cooldown

### Requirement 3: Dynamic Risk Management

**User Story:** As a risk manager, I want position sizing and risk parameters to adjust dynamically based on confluence quality and market conditions, so that risk is appropriately scaled to signal strength.

#### Acceptance Criteria

1. WHEN confidence > 70% THEN system SHALL increase position size by 25% and tighten stops by 20%
2. WHEN confidence between 60-70% THEN system SHALL use standard 1.1x position sizing
3. WHEN confidence < 60% THEN system SHALL reduce position size by 50%
4. WHEN in GO state THEN system SHALL use 50% position size, in TRADE state SHALL use full size
5. WHEN Fibonacci zone > 1.27 (extended) THEN system SHALL tighten stops by 30% and reduce time decay buffer by 20%
6. WHEN regime bias > 0.5 THEN system SHALL increase position size by 10%, when < 0.5 SHALL reduce by 10%

### Requirement 4: Comprehensive Multi-Channel Alerting

**User Story:** As a trader, I want real-time alerts across multiple channels when state transitions occur, so that I can monitor system decisions and take manual action when needed.

#### Acceptance Criteria

1. WHEN state transition occurs THEN system SHALL send alerts to configured channels (Slack, Telegram, Discord, Dashboard)
2. WHEN TRADE state reached THEN system SHALL send HIGH priority alert with confidence, sizing, and rationale
3. WHEN ABORT state triggered THEN system SHALL send HIGH priority alert with divergence details
4. WHEN EXIT conditions met THEN system SHALL send MEDIUM priority alert with exit reason and PnL
5. WHEN alert cooldown active THEN system SHALL respect priority-based cooldown periods (CRITICAL: 30s, HIGH: 1m, MEDIUM: 2m, LOW: 5m)
6. WHEN alert fails to send THEN system SHALL retry with exponential backoff and log failure details

### Requirement 5: Production-Grade Persistence and Audit

**User Story:** As a system administrator, I want complete audit trails and state persistence for all trading decisions, so that system behavior can be analyzed and regulatory compliance maintained.

#### Acceptance Criteria

1. WHEN trade decision made THEN system SHALL persist complete decision context to trade_state_log.json
2. WHEN active signal exists THEN system SHALL maintain real-time state in active_signals.json
3. WHEN system restarts THEN system SHALL recover previous states from persistent storage
4. WHEN querying recent decisions THEN system SHALL provide filtered results by ticker and time range
5. WHEN terminal state reached (EXIT/ABORT/READY) THEN system SHALL remove from active signals
6. WHEN audit trail accessed THEN system SHALL provide complete decision history with timestamps and reasoning

### Requirement 6: Temporal Context Management

**User Story:** As a trading algorithm, I want sophisticated temporal context tracking that prevents rapid state cycling and enforces minimum state durations, so that trading decisions are stable and well-timed.

#### Acceptance Criteria

1. WHEN tracking sequence age THEN system SHALL measure time since sequence start and reset on major transitions
2. WHEN transition count exceeds 3 in 5 minutes THEN system SHALL prevent further transitions to avoid cycling
3. WHEN enforcing minimum state times THEN system SHALL require: READY(1m), SET(2m), GO(1m), TRADE(30s), EXIT(30s), ABORT(10s)
4. WHEN sequence timeout occurs (2 hours without progression) THEN system SHALL automatically reset to READY
5. WHEN recording transitions THEN system SHALL track transition count, timing, and context for analysis
6. WHEN validating transitions THEN system SHALL check temporal constraints before allowing state changes

### Requirement 7: Advanced Signal Processing Integration

**User Story:** As a signal processing system, I want sophisticated analysis of timeframe signals including power candle detection, momentum divergence, and ribbon alignment, so that confluence scoring reflects true market conditions.

#### Acceptance Criteria

1. WHEN analyzing timeframe signals THEN system SHALL process confidence, bias, power candle, volume surge, ribbon alignment, and momentum divergence
2. WHEN calculating ribbon alignment THEN system SHALL average alignment scores across all timeframes
3. WHEN detecting momentum divergence THEN system SHALL compare price action vs momentum indicators
4. WHEN measuring VWAP deviation THEN system SHALL track distance from volume-weighted average price
5. WHEN assessing gamma exposure THEN system SHALL incorporate options market structure impact
6. WHEN evaluating Fibonacci zones THEN system SHALL determine expansion level and apply appropriate adjustments

### Requirement 8: Event-Driven Architecture Integration

**User Story:** As a system integrator, I want seamless integration with the existing EventBus and paper trading system, so that MTF logic enhances rather than replaces current functionality.

#### Acceptance Criteria

1. WHEN MTF decision made THEN system SHALL emit trade:state:transition events with complete context
2. WHEN integrating with EventBus THEN system SHALL listen for market data updates and signal events
3. WHEN connecting to paper trading THEN system SHALL provide enhanced signal processing while maintaining existing interfaces
4. WHEN dashboard updates needed THEN system SHALL emit real-time events for UI consumption
5. WHEN system health monitored THEN system SHALL provide status and performance metrics via EventBus
6. WHEN error conditions occur THEN system SHALL emit error events with recovery context

### Requirement 9: Configuration and Customization

**User Story:** As a system administrator, I want configurable parameters for confluence weights, state transition thresholds, and risk adjustments, so that the system can be tuned for different market conditions and trading styles.

#### Acceptance Criteria

1. WHEN configuring timeframe weights THEN system SHALL allow adjustment of Daily/Hourly/30-minute percentages
2. WHEN setting confidence thresholds THEN system SHALL accept custom values for state transitions
3. WHEN adjusting risk parameters THEN system SHALL allow modification of position sizing multipliers
4. WHEN configuring alerts THEN system SHALL support channel selection and priority settings
5. WHEN updating configuration THEN system SHALL validate parameters and apply changes without restart
6. WHEN configuration invalid THEN system SHALL reject changes and maintain previous settings with error logging

### Requirement 10: Performance and Scalability

**User Story:** As a system operator, I want the MTF trading logic to process signals efficiently and scale to handle multiple concurrent tickers, so that system performance remains optimal under load.

#### Acceptance Criteria

1. WHEN processing MTF signals THEN system SHALL complete analysis within 200ms per ticker
2. WHEN handling concurrent tickers THEN system SHALL support at least 10 simultaneous ticker analyses
3. WHEN persisting decisions THEN system SHALL complete file operations within 50ms
4. WHEN sending alerts THEN system SHALL dispatch to all channels within 500ms
5. WHEN memory usage monitored THEN system SHALL maintain stable memory footprint under continuous operation
6. WHEN error recovery needed THEN system SHALL restore operations within 1 second of failure resolution