/**
 * Jest configuration specifically for User Acceptance Tests (UAT)
 */

module.exports = {
  displayName: 'UAT - User Acceptance Tests',
  testMatch: ['**/tests/uat/**/*.test.ts', '**/tests/uat/**/UserAcceptanceTests.ts'],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 60000, // 60 seconds for complex UAT workflows
  maxWorkers: 1, // Run UAT tests sequentially to avoid conflicts
  verbose: true,
  collectCoverage: false, // UAT focuses on functionality, not coverage
  
  // Transform TypeScript files
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  
  // Module path mapping
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@gamma-adaptive/(.*)$': '<rootDir>/gamma-adaptive/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
  },
  
  // Test environment setup
  globalSetup: '<rootDir>/tests/uat/globalSetup.js',
  globalTeardown: '<rootDir>/tests/uat/globalTeardown.js',
  
  // Custom reporters for UAT
  reporters: [
    'default',
    ['<rootDir>/tests/uat/uatReporter.js', {
      outputFile: 'uat-results.json',
      includeConsoleOutput: true
    }]
  ],
  
  // Fail fast on first failure for UAT
  bail: 1,
  
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
};