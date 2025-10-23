# Gamma Adaptive System Test Suite

This directory contains comprehensive test suites for the Gamma Adaptive System, including System Integration Tests (SIT) and Component Acceptance Review (CAR) tests.

## Test Structure

```
tests/
├── integration/           # System Integration Tests (SIT)
│   └── SystemIntegrationTests.ts
├── acceptance/           # Component Acceptance Review (CAR) Tests
│   └── ComponentAcceptanceTests.ts
├── unit/                # Unit Tests (to be added)
├── performance/         # Performance Benchmarks
├── setup.ts            # Global test setup
├── jest.config.js      # Jest configuration
├── testSequencer.js    # Custom test sequencer
└── README.md          # This file
```

## Test Types

### System Integration Tests (SIT)
Tests that verify the entire system works together correctly:
- **SIT-001**: Performance Monitoring Integration
- **SIT-002**: Caching and Database Integration  
- **SIT-003**: Security Integration
- **SIT-004**: Performance Alerting and Scaling Integration
- **SIT-005**: End-to-End System Integration

### Component Acceptance Review (CAR) Tests
Tests that verify each component meets its acceptance criteria:
- **CAR-001**: Performance Monitor Component
- **CAR-002**: Cache Manager Component
- **CAR-003**: Database Optimizer Component
- **CAR-004**: Security Service Component
- **CAR-005**: Performance Alerting Component
- **CAR-006**: Auto Scaler Component

## Running Tests

### Prerequisites
```bash
npm install --save-dev jest @jest/globals ts-jest @types/jest
```

### Run All Tests
```bash
npm test
```

### Run Specific Test Suites
```bash
# System Integration Tests
npm test -- --testPathPattern=integration

# Component Acceptance Tests  
npm test -- --testPathPattern=acceptance

# Performance Benchmarks
npm test -- --testPathPattern=performance
```

### Run Tests with Coverage
```bash
npm test -- --coverage
```

### Run Tests in Watch Mode
```bash
npm test -- --watch
```

## Test Configuration

### Environment Variables
- `NODE_ENV=test` - Set automatically during test runs
- `LOG_LEVEL=error` - Reduces log noise during testing
- `DB_HOST`, `DB_PORT`, etc. - Database connection for integration tests

### Timeouts
- Default timeout: 30 seconds
- Integration tests: Extended timeout for complex operations
- Performance tests: Custom timeouts based on benchmark requirements

### Mocking Strategy
- External dependencies (databases, APIs) are mocked by default
- Real integrations can be enabled by setting appropriate environment variables
- Mock implementations provide realistic responses for testing

## Test Requirements Validation

### Performance Requirements
- ✅ Tick-to-decision processing time < 200ms
- ✅ Database response time < 100ms  
- ✅ Memory usage stability under load
- ✅ Concurrent operation support (10+ tickers)

### Security Requirements
- ✅ Rate limiting and DDoS protection
- ✅ Intrusion detection and prevention
- ✅ Threat analysis and recommendations
- ✅ Security monitoring and alerting

### Scalability Requirements
- ✅ Automatic scaling based on metrics
- ✅ Performance degradation detection
- ✅ Alert threshold management
- ✅ System health monitoring

### Reliability Requirements
- ✅ Cache invalidation and TTL management
- ✅ Database connection pooling
- ✅ Error handling and recovery
- ✅ Component lifecycle management

## Test Data Management

### Test Isolation
- Each test suite runs in isolation
- Database transactions are rolled back after tests
- Cache is cleared between test runs
- Mock state is reset between tests

### Test Data Generation
- Realistic test data generators for market data
- Performance metrics simulation
- Security event simulation
- Scaling scenario simulation

## Continuous Integration

### Test Pipeline
1. **Unit Tests**: Fast, isolated component tests
2. **Integration Tests**: Component interaction validation
3. **Acceptance Tests**: Requirements compliance verification
4. **Performance Tests**: Benchmark validation
5. **End-to-End Tests**: Complete workflow validation

### Quality Gates
- All tests must pass
- Code coverage > 80%
- Performance benchmarks must meet targets
- Security tests must pass
- No critical vulnerabilities

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Ensure test database is running
   - Check connection configuration
   - Verify mock setup if database not available

2. **Timeout Errors**
   - Increase test timeout for slow operations
   - Check for infinite loops or blocking operations
   - Verify async/await usage

3. **Memory Issues**
   - Monitor memory usage during tests
   - Ensure proper cleanup in afterAll hooks
   - Check for memory leaks in test code

4. **Flaky Tests**
   - Add proper wait conditions
   - Use deterministic test data
   - Avoid race conditions in async tests

### Debug Mode
```bash
# Run tests with debug output
npm test -- --verbose --detectOpenHandles

# Run specific test with debugging
npm test -- --testNamePattern="specific test name" --verbose
```

## Contributing

### Adding New Tests
1. Follow the existing test structure
2. Use descriptive test names with requirement IDs
3. Include proper setup and cleanup
4. Add documentation for complex test scenarios

### Test Naming Convention
- SIT-XXX: System Integration Test
- CAR-XXX: Component Acceptance Review Test  
- PERF-XXX: Performance Benchmark Test
- AC-XX-XXX: Acceptance Criteria Test

### Best Practices
- Keep tests focused and atomic
- Use realistic test data
- Mock external dependencies appropriately
- Include both positive and negative test cases
- Validate error conditions and edge cases

## Reporting

### Test Results
- Console output with detailed results
- HTML coverage reports in `coverage/` directory
- JUnit XML reports for CI integration
- Performance benchmark results

### Metrics Tracked
- Test execution time
- Code coverage percentage
- Performance benchmark results
- Memory usage during tests
- Error rates and failure patterns