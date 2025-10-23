/**
 * Global teardown for UAT tests
 * Cleans up the test environment after running User Acceptance Tests
 */

const fs = require('fs');
const path = require('path');

module.exports = async () => {
  console.log('🧹 Cleaning up UAT test environment...');
  
  try {
    // 1. Clean up test database
    console.log('📊 Cleaning up test database...');
    
    const testDbPath = path.join(__dirname, '../../data/test/gamma-adaptive-test.db');
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
      console.log('✓ Test database cleaned up');
    }
    
    // 2. Clean up test fixtures
    console.log('📋 Cleaning up test fixtures...');
    
    const fixturesDir = path.join(__dirname, 'fixtures');
    if (fs.existsSync(fixturesDir)) {
      const files = fs.readdirSync(fixturesDir);
      for (const file of files) {
        fs.unlinkSync(path.join(fixturesDir, file));
      }
      fs.rmdirSync(fixturesDir);
      console.log('✓ Test fixtures cleaned up');
    }
    
    // 3. Clean up temporary files
    console.log('🗂️ Cleaning up temporary files...');
    
    const tempFiles = [
      path.join(__dirname, '../../logs/test.log'),
      path.join(__dirname, '../../cache/test-cache.json'),
      path.join(__dirname, '../../uat-results.json')
    ];
    
    for (const file of tempFiles) {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    }
    
    console.log('✓ Temporary files cleaned up');
    
    // 4. Reset environment variables
    console.log('⚙️ Resetting environment...');
    
    delete process.env.DATABASE_URL;
    delete process.env.REDIS_URL;
    delete process.env.POLYGON_API_KEY;
    delete process.env.TRADIER_API_KEY;
    delete process.env.TWELVEDATA_API_KEY;
    
    console.log('✓ Environment variables reset');
    
    // 5. Generate UAT summary report
    console.log('📊 Generating UAT summary...');
    
    const summaryPath = path.join(__dirname, '../../uat-summary.txt');
    const summary = `
UAT Test Run Summary
===================
Date: ${new Date().toISOString()}
Environment: Test
Duration: ${process.uptime().toFixed(2)} seconds

Test Categories Covered:
- Multi-Ticker Trading Workflow
- Risk Management and Portfolio Controls  
- Real-Time Dashboard and Monitoring
- Algorithm Learning and Adaptation
- System Performance and Scalability

For detailed results, check the Jest output above.
`;
    
    fs.writeFileSync(summaryPath, summary);
    console.log(`✓ UAT summary saved to: ${summaryPath}`);
    
    console.log('🎉 UAT cleanup complete!');
    
  } catch (error) {
    console.error('❌ UAT cleanup failed:', error.message);
    // Don't exit with error code as this is cleanup
  }
};