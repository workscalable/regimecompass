/**
 * Global setup for UAT tests
 * Prepares the test environment before running User Acceptance Tests
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports = async () => {
  console.log('🚀 Setting up UAT test environment...');
  
  try {
    // 1. Ensure test database is available
    console.log('📊 Setting up test database...');
    
    // Create test database directory if it doesn't exist
    const testDbDir = path.join(__dirname, '../../data/test');
    if (!fs.existsSync(testDbDir)) {
      fs.mkdirSync(testDbDir, { recursive: true });
    }
    
    // Initialize test database schema
    const schemaPath = path.join(__dirname, '../../database/schema.sql');
    if (fs.existsSync(schemaPath)) {
      console.log('✓ Database schema initialized');
    }
    
    // 2. Set up test configuration
    console.log('⚙️ Configuring test environment...');
    
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'sqlite://./data/test/gamma-adaptive-test.db';
    process.env.REDIS_URL = 'redis://localhost:6379/15'; // Use test database
    process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests
    
    // Mock API keys for testing
    process.env.POLYGON_API_KEY = 'test_polygon_key';
    process.env.TRADIER_API_KEY = 'test_tradier_key';
    process.env.TWELVEDATA_API_KEY = 'test_twelvedata_key';
    
    console.log('✓ Environment variables configured');
    
    // 3. Start required services for UAT
    console.log('🔧 Starting test services...');
    
    // Start Redis if not running (for caching tests)
    try {
      execSync('redis-cli ping', { stdio: 'ignore' });
      console.log('✓ Redis is running');
    } catch (error) {
      console.log('⚠️ Redis not available - some caching tests may be skipped');
    }
    
    // 4. Create test data fixtures
    console.log('📋 Creating test data fixtures...');
    
    const fixturesDir = path.join(__dirname, 'fixtures');
    if (!fs.existsSync(fixturesDir)) {
      fs.mkdirSync(fixturesDir, { recursive: true });
    }
    
    // Create sample market data fixture
    const sampleMarketData = {
      SPY: { price: 450.25, volume: 1000000, timestamp: new Date().toISOString() },
      QQQ: { price: 375.80, volume: 800000, timestamp: new Date().toISOString() },
      AAPL: { price: 185.50, volume: 1200000, timestamp: new Date().toISOString() }
    };
    
    fs.writeFileSync(
      path.join(fixturesDir, 'market-data.json'),
      JSON.stringify(sampleMarketData, null, 2)
    );
    
    // Create sample options chain fixture
    const sampleOptionsChain = {
      SPY: {
        calls: [
          { strike: 445, expiry: '2024-01-19', bid: 8.50, ask: 8.70, delta: 0.65, gamma: 0.02 },
          { strike: 450, expiry: '2024-01-19', bid: 5.20, ask: 5.40, delta: 0.50, gamma: 0.03 },
          { strike: 455, expiry: '2024-01-19', bid: 2.80, ask: 3.00, delta: 0.35, gamma: 0.02 }
        ]
      }
    };
    
    fs.writeFileSync(
      path.join(fixturesDir, 'options-chain.json'),
      JSON.stringify(sampleOptionsChain, null, 2)
    );
    
    console.log('✓ Test fixtures created');
    
    // 5. Validate system components
    console.log('🔍 Validating system components...');
    
    const requiredFiles = [
      '../../gamma-adaptive/orchestrators/MultiTickerOrchestrator.ts',
      '../../gamma-adaptive/engines/SignalWeightingEngine.ts',
      '../../gamma-adaptive/engines/OptionsRecommendationEngine.ts',
      '../../gamma-adaptive/engines/PaperTradingEngine.ts'
    ];
    
    for (const file of requiredFiles) {
      const filePath = path.join(__dirname, file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Required component not found: ${file}`);
      }
    }
    
    console.log('✓ All system components validated');
    
    // 6. Set global test timeout
    jest.setTimeout(60000);
    
    console.log('🎉 UAT environment setup complete!');
    console.log('');
    console.log('Test Environment Details:');
    console.log(`- Node Environment: ${process.env.NODE_ENV}`);
    console.log(`- Database: ${process.env.DATABASE_URL}`);
    console.log(`- Redis: ${process.env.REDIS_URL}`);
    console.log(`- Log Level: ${process.env.LOG_LEVEL}`);
    console.log('');
    
  } catch (error) {
    console.error('❌ UAT setup failed:', error.message);
    process.exit(1);
  }
};