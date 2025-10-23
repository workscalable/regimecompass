#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🎭 Starting User Acceptance Tests (UAT) - End-to-End Scenarios');
console.log('=' .repeat(80));

// Test configuration
const testConfig = {
  testMatch: ['**/tests/uat/**/*.ts'],
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  testTimeout: 60000, // 60 seconds for UAT tests
  maxWorkers: 1, // Run UAT tests sequentially
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts']
};

// Create Jest command
const jestArgs = [
  '--config', 'tests/jest.config.js',
  '--testPathPattern=uat',
  '--verbose',
  '--detectOpenHandles',
  '--forceExit',
  '--maxWorkers=1',
  '--testTimeout=60000'
];

console.log('🚀 Executing UAT Test Suite...');
console.log(`Command: npx jest ${jestArgs.join(' ')}`);
console.log('');

// Run Jest
const jestProcess = spawn('npx', ['jest', ...jestArgs], {
  stdio: 'inherit',
  cwd: process.cwd()
});

jestProcess.on('close', (code) => {
  console.log('');
  console.log('=' .repeat(80));
  
  if (code === 0) {
    console.log('✅ User Acceptance Tests PASSED');
    console.log('🎯 All end-to-end scenarios completed successfully');
    console.log('📊 System meets all user acceptance criteria');
  } else {
    console.log('❌ User Acceptance Tests FAILED');
    console.log('🔍 Review test output above for failure details');
    console.log('🛠️ Fix issues and re-run tests');
  }
  
  console.log('=' .repeat(80));
  process.exit(code);
});

jestProcess.on('error', (error) => {
  console.error('❌ Failed to start UAT tests:', error);
  process.exit(1);
});