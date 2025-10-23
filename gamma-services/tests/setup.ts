import { jest } from '@jest/globals';

// Global test setup
beforeAll(async () => {
  console.log('🧪 Setting up test environment...');
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error';
  
  // Mock external dependencies that aren't available in test environment
  jest.mock('pg', () => ({
    Pool: jest.fn().mockImplementation(() => ({
      connect: jest.fn().mockResolvedValue({
        query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
        release: jest.fn()
      }),
      query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0, duration: 50 }),
      end: jest.fn().mockResolvedValue(undefined),
      totalCount: 5,
      idleCount: 3,
      waitingCount: 0
    }))
  }));
  
  // Mock file system operations for cache persistence
  jest.mock('fs', () => ({
    promises: {
      writeFile: jest.fn().mockResolvedValue(undefined),
      readFile: jest.fn().mockResolvedValue('{}'),
      unlink: jest.fn().mockResolvedValue(undefined)
    }
  }));
  
  console.log('✅ Test environment setup complete');
});

afterAll(async () => {
  console.log('🧹 Cleaning up test environment...');
  
  // Clean up any global resources
  jest.clearAllMocks();
  jest.restoreAllMocks();
  
  console.log('✅ Test environment cleanup complete');
});

// Global error handler for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Increase timeout for integration tests
jest.setTimeout(30000);