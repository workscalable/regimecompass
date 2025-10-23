const { parentPort, workerData } = require('worker_threads');
const { performance } = require('perf_hooks');

class TickerProcessingWorker {
  constructor() {
    this.assignedTickers = new Set();
    this.isShuttingDown = false;
    this.metrics = {
      processedSignals: 0,
      averageProcessingTime: 0,
      errorRate: 0,
      memoryUsage: 0,
      cpuUsage: 0
    };
    this.processingTimes = [];
    this.errorCount = 0;
    this.startTime = Date.now();
    
    this.setupMessageHandling();
    this.startMetricsCollection();
  }

  setupMessageHandling() {
    if (parentPort) {
      parentPort.on('message', async (message) => {
        try {
          await this.handleMessage(message);
        } catch (error) {
          this.sendError('MESSAGE_HANDLING', error);
        }
      });
    }
  }

  async handleMessage(message) {
    switch (message.type) {
      case 'ADD_TICKER':
        await this.addTicker(message.ticker);
        break;
      case 'REMOVE_TICKER':
        await this.removeTicker(message.ticker);
        break;
      case 'PROCESS_SIGNAL':
        await this.processSignal(message.signal);
        break;
      case 'HEALTH_CHECK':
        await this.handleHealthCheck();
        break;
      case 'SHUTDOWN':
        await this.shutdown();
        break;
      default:
        console.warn(`Unknown message type: ${message.type}`);
    }
  }

  async addTicker(ticker) {
    console.log(`Worker adding ticker: ${ticker}`);
    this.assignedTickers.add(ticker);
    
    this.sendMessage({
      type: 'STATUS_UPDATE',
      status: this.assignedTickers.size === 0 ? 'IDLE' : 'BUSY',
      tickerCount: this.assignedTickers.size
    });
  }

  async removeTicker(ticker) {
    console.log(`Worker removing ticker: ${ticker}`);
    this.assignedTickers.delete(ticker);
    
    this.sendMessage({
      type: 'STATUS_UPDATE',
      status: this.assignedTickers.size === 0 ? 'IDLE' : 'BUSY',
      tickerCount: this.assignedTickers.size
    });
  }

  async processSignal(signal) {
    if (this.isShuttingDown) return;
    
    const startTime = performance.now();
    
    try {
      // Simulate signal processing
      await this.simulateSignalProcessing(signal);
      
      const processingTime = performance.now() - startTime;
      this.recordProcessingTime(processingTime);
      
      this.sendMessage({
        type: 'SIGNAL_PROCESSED',
        ticker: signal.ticker,
        processingTime,
        success: true
      });
      
    } catch (error) {
      const processingTime = performance.now() - startTime;
      this.recordError();
      
      this.sendMessage({
        type: 'SIGNAL_PROCESSED',
        ticker: signal.ticker,
        processingTime,
        success: false,
        error: error.message
      });
    }
  }

  async simulateSignalProcessing(signal) {
    // Simulate various processing steps with realistic timing
    
    // Step 1: Data validation and preprocessing (10-30ms)
    await this.sleep(10 + Math.random() * 20);
    
    // Step 2: Technical indicator calculations (20-50ms)
    await this.sleep(20 + Math.random() * 30);
    
    // Step 3: Multi-factor analysis (30-80ms)
    await this.sleep(30 + Math.random() * 50);
    
    // Step 4: Risk calculations (10-25ms)
    await this.sleep(10 + Math.random() * 15);
    
    // Step 5: Options recommendations (20-40ms)
    await this.sleep(20 + Math.random() * 20);
    
    // Simulate occasional processing errors (1% error rate)
    if (Math.random() < 0.01) {
      throw new Error('Simulated processing error');
    }
    
    // Simulate memory-intensive operations
    if (Math.random() < 0.1) {
      const largeArray = new Array(100000).fill(Math.random());
      // Use the array briefly then let it be garbage collected
      largeArray.sort();
    }
  }

  async handleHealthCheck() {
    const memUsage = process.memoryUsage();
    const uptime = Date.now() - this.startTime;
    
    this.metrics.memoryUsage = memUsage.heapUsed;
    this.metrics.cpuUsage = process.cpuUsage().user + process.cpuUsage().system;
    
    this.sendMessage({
      type: 'HEALTH_RESPONSE',
      status: 'HEALTHY',
      metrics: {
        ...this.metrics,
        uptime,
        assignedTickers: this.assignedTickers.size,
        memoryUsage: memUsage
      }
    });
  }

  recordProcessingTime(time) {
    this.processingTimes.push(time);
    this.metrics.processedSignals++;
    
    // Keep only recent processing times for average calculation
    if (this.processingTimes.length > 100) {
      this.processingTimes = this.processingTimes.slice(-100);
    }
    
    // Update average processing time
    this.metrics.averageProcessingTime = 
      this.processingTimes.reduce((sum, time) => sum + time, 0) / this.processingTimes.length;
  }

  recordError() {
    this.errorCount++;
    this.metrics.errorRate = this.errorCount / Math.max(1, this.metrics.processedSignals);
  }

  startMetricsCollection() {
    // Send metrics update every 30 seconds
    setInterval(() => {
      if (!this.isShuttingDown) {
        this.sendMessage({
          type: 'METRICS_UPDATE',
          metrics: this.metrics
        });
      }
    }, 30000);
  }

  sendMessage(message) {
    if (parentPort && !this.isShuttingDown) {
      parentPort.postMessage(message);
    }
  }

  sendError(type, error) {
    this.recordError();
    this.sendMessage({
      type: 'ERROR',
      errorType: type,
      error: error.message,
      stack: error.stack
    });
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async shutdown() {
    console.log('Worker shutting down...');
    this.isShuttingDown = true;
    
    // Clean up any resources
    this.assignedTickers.clear();
    
    this.sendMessage({
      type: 'SHUTDOWN_COMPLETE',
      finalMetrics: this.metrics
    });
    
    // Exit the worker thread
    process.exit(0);
  }
}

// Initialize the worker
const worker = new TickerProcessingWorker();

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception in worker:', error);
  worker.sendError('UNCAUGHT_EXCEPTION', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection in worker:', reason);
  worker.sendError('UNHANDLED_REJECTION', new Error(String(reason)));
});

console.log('Ticker Processing Worker initialized');