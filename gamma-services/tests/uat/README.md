# User Acceptance Tests (UAT) for Gamma Adaptive System

## Overview

The User Acceptance Tests (UAT) validate complete end-to-end workflows from a user perspective, ensuring that all system requirements are met in realistic trading scenarios. These tests simulate real user interactions and validate the entire system functionality.

## Test Categories

### UAT-1: Multi-Ticker Trading Workflow
**Purpose**: Tests the complete trading workflow from system startup to performance tracking.

**Workflow Steps**:
1. System startup and multi-ticker monitoring initialization
2. Signal generation across multiple tickers
3. Options recommendations based on signals
4. Trade execution with realistic market conditions
5. Performance tracking and analytics

**Validates Requirements**:
- Multi-ticker state management (Requirement 1)
- Advanced signal processing (Requirement 2)
- Smart options trading (Requirement 3)
- Performance analytics (Requirement 4)

### UAT-2: Risk Management and Portfolio Controls
**Purpose**: Validates comprehensive risk management and portfolio protection mechanisms.

**Workflow Steps**:
1. Portfolio heat limit enforcement
2. Confidence-based position sizing
3. Drawdown protection activation
4. Recovery mechanism validation

**Validates Requirements**:
- Risk management controls (Requirement 8)
- Portfolio heat limits (2% per trade, 20% total)
- Drawdown protection (5% threshold)
- Consecutive loss management

### UAT-3: Real-Time Dashboard and Monitoring
**Purpose**: Tests dashboard functionality and real-time system monitoring.

**Workflow Steps**:
1. Real-time ticker state updates
2. Multi-ticker dashboard data display
3. Performance analytics visualization
4. Live configuration updates

**Validates Requirements**:
- Real-time monitoring (Requirement 7)
- Dashboard functionality
- Configuration management (Requirement 9)
- Update latency (<100ms requirement)

### UAT-4: Algorithm Learning and Adaptation
**Purpose**: Validates machine learning capabilities and continuous improvement.

**Workflow Steps**:
1. Baseline performance establishment
2. Confidence calibration learning
3. Signal quality improvement
4. Performance optimization recommendations
5. Learning state persistence

**Validates Requirements**:
- Algorithm learning (Requirement 5)
- Confidence calibration (±20% bounds)
- Signal pattern recognition
- Performance optimization

### UAT-5: System Performance and Scalability
**Purpose**: Tests system performance under load and scalability requirements.

**Workflow Steps**:
1. Concurrent multi-ticker processing
2. Signal processing latency validation
3. Memory management testing
4. Database performance validation
5. Horizontal scaling verification

**Validates Requirements**:
- Performance optimization (Requirement 12)
- Tick-to-decision processing (<200ms)
- Concurrent operations (10+ tickers)
- Database response times (<100ms)

## Running UAT Tests

### Prerequisites

1. **Node.js**: Version 16 or higher
2. **Dependencies**: Run `npm install` to install all dependencies
3. **Database**: Test database will be created automatically
4. **Redis** (optional): For caching tests (will skip if not available)

### Basic Usage

```bash
# Run all UAT tests
npm run uat

# Run with verbose output
npm run uat:verbose

# Run specific workflow
npm run uat:workflow=UAT-1

# Run performance tests only
npm run uat:performance

# Stop on first failure
npm run uat:bail

# Watch mode for development
npm run uat:watch

# Include coverage report
npm run uat:coverage
```

### Advanced Usage

```bash
# Run specific workflow with custom options
node scripts/run-uat.js --workflow=UAT-2 --verbose --bail

# Get help and see all options
node scripts/run-uat.js --help
```

## Test Environment

### Automatic Setup
The UAT framework automatically sets up:
- Test database (SQLite)
- Mock API keys for external services
- Test data fixtures
- Environment variables
- Required directories

### Configuration
Tests use isolated configuration:
- `NODE_ENV=test`
- Separate test database
- Mock external API calls
- Reduced logging for cleaner output

### Cleanup
After tests complete, the framework automatically:
- Removes test database
- Cleans up temporary files
- Resets environment variables
- Generates summary reports

## Test Data and Mocking

### Market Data Simulation
Tests use realistic market data simulation:
- Price movements based on statistical models
- Volume patterns matching real market behavior
- Options chain data with realistic Greeks
- Volatility scenarios for different market conditions

### External API Mocking
External services are mocked to ensure:
- Consistent test results
- No dependency on external services
- Controlled test scenarios
- Fast test execution

## Results and Reporting

### Console Output
Real-time test progress with:
- ✅ Passed tests with workflow context
- ❌ Failed tests with error details
- ⏭️ Skipped tests with reasons
- 📊 Performance metrics during execution

### Detailed Reports
Generated after test completion:
- `uat-results.json`: Detailed test results with metrics
- `uat-summary.txt`: Human-readable summary report
- Console summary with requirements coverage

### Performance Metrics
Tracked during test execution:
- Processing latencies (tick-to-decision times)
- Memory usage patterns
- Database response times
- Concurrent operation performance
- System resource utilization

## Troubleshooting

### Common Issues

**Tests fail with database errors**:
```bash
# Ensure write permissions in test directory
chmod 755 gamma-services/data/test
```

**Memory-related failures**:
```bash
# Run with increased memory limit
node --max-old-space-size=4096 scripts/run-uat.js
```

**External service timeouts**:
- Tests use mocked services by default
- Check network connectivity if using real APIs
- Verify API keys are properly configured

### Debug Mode
For detailed debugging:
```bash
# Run with debug output
npm run test:debug -- --testPathPattern=uat

# Run single workflow with verbose logging
LOG_LEVEL=debug npm run uat:workflow=UAT-1
```

### Performance Issues
If tests run slowly:
1. Check system resources (CPU, memory)
2. Verify database performance
3. Consider running fewer concurrent operations
4. Use `--bail` to stop on first failure

## Integration with CI/CD

### GitHub Actions Example
```yaml
name: UAT Tests
on: [push, pull_request]
jobs:
  uat:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run uat:bail
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: uat-results
          path: |
            uat-results.json
            uat-summary.txt
```

### Jenkins Pipeline
```groovy
pipeline {
    agent any
    stages {
        stage('UAT') {
            steps {
                sh 'npm install'
                sh 'npm run uat:coverage'
            }
            post {
                always {
                    archiveArtifacts artifacts: 'uat-*.json,uat-*.txt'
                    publishTestResults testResultsPattern: 'uat-results.json'
                }
            }
        }
    }
}
```

## Best Practices

### Test Development
1. **Realistic Scenarios**: Tests should mirror real user workflows
2. **Data Isolation**: Each test should use independent data
3. **Performance Awareness**: Monitor test execution times
4. **Error Handling**: Test both success and failure scenarios

### Maintenance
1. **Regular Updates**: Keep tests aligned with system changes
2. **Performance Baselines**: Update performance expectations as system evolves
3. **Documentation**: Keep test documentation current
4. **Review Process**: Include UAT in code review process

### Monitoring
1. **Trend Analysis**: Track test performance over time
2. **Failure Patterns**: Identify recurring issues
3. **Coverage Gaps**: Ensure all requirements are tested
4. **Performance Regression**: Monitor for performance degradation

## Contributing

When adding new UAT tests:
1. Follow the existing workflow pattern
2. Include comprehensive error scenarios
3. Add performance validations
4. Update this documentation
5. Ensure tests are deterministic and reliable

For questions or issues with UAT tests, please refer to the main project documentation or create an issue in the project repository.