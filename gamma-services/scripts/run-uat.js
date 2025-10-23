#!/usr/bin/env node

/**
 * UAT Test Runner
 * Executes User Acceptance Tests for the Gamma Adaptive System
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function printHeader() {
  log('\n' + '='.repeat(80), 'cyan');
  log('🎯 GAMMA ADAPTIVE SYSTEM - USER ACCEPTANCE TESTS', 'bright');
  log('='.repeat(80), 'cyan');
  log('Testing complete end-to-end workflows and user scenarios', 'blue');
  log('='.repeat(80), 'cyan');
}

function printUsage() {
  log('\nUsage:', 'bright');
  log('  npm run uat              # Run all UAT tests');
  log('  npm run uat:workflow     # Run specific workflow tests');
  log('  npm run uat:performance  # Run performance tests only');
  log('  npm run uat:verbose      # Run with verbose output');
  log('');
  log('Options:', 'bright');
  log('  --workflow=<name>        # Run specific workflow (e.g., UAT-1, UAT-2)');
  log('  --bail                   # Stop on first failure');
  log('  --verbose                # Detailed output');
  log('  --coverage               # Include coverage report');
  log('  --watch                  # Watch mode for development');
}

function validateEnvironment() {
  log('\n🔍 Validating test environment...', 'yellow');
  
  // Check if required files exist
  const requiredFiles = [
    'tests/uat/UserAcceptanceTests.ts',
    'tests/uat/uat.config.js',
    'gamma-adaptive/orchestrators/MultiTickerOrchestrator.ts'
  ];
  
  for (const file of requiredFiles) {
    const filePath = path.join(__dirname, '..', file);
    if (!fs.existsSync(filePath)) {
      log(`❌ Required file missing: ${file}`, 'red');
      process.exit(1);
    }
  }
  
  // Check Node.js version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  if (majorVersion < 16) {
    log(`❌ Node.js version ${nodeVersion} is not supported. Please use Node.js 16 or higher.`, 'red');
    process.exit(1);
  }
  
  log('✅ Environment validation passed', 'green');
}

function parseArguments() {
  const args = process.argv.slice(2);
  const options = {
    workflow: null,
    bail: false,
    verbose: false,
    coverage: false,
    watch: false
  };
  
  for (const arg of args) {
    if (arg.startsWith('--workflow=')) {
      options.workflow = arg.split('=')[1];
    } else if (arg === '--bail') {
      options.bail = true;
    } else if (arg === '--verbose') {
      options.verbose = true;
    } else if (arg === '--coverage') {
      options.coverage = true;
    } else if (arg === '--watch') {
      options.watch = true;
    } else if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }
  }
  
  return options;
}

function buildJestCommand(options) {
  const jestConfig = path.join(__dirname, '..', 'tests', 'uat', 'uat.config.js');
  let command = `npx jest --config="${jestConfig}"`;
  
  // Add test pattern based on workflow
  if (options.workflow) {
    command += ` --testNamePattern="${options.workflow}"`;
    log(`🎯 Running workflow: ${options.workflow}`, 'blue');
  } else {
    log('🎯 Running all UAT workflows', 'blue');
  }
  
  // Add options
  if (options.bail) {
    command += ' --bail';
  }
  
  if (options.verbose) {
    command += ' --verbose';
  }
  
  if (options.coverage) {
    command += ' --coverage';
  }
  
  if (options.watch) {
    command += ' --watch';
  }
  
  // Always run with colors and show console output
  command += ' --colors --verbose';
  
  return command;
}

function runTests(command) {
  log('\n🚀 Starting UAT execution...', 'yellow');
  log(`Command: ${command}`, 'blue');
  log('');
  
  try {
    execSync(command, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    
    log('\n🎉 UAT execution completed successfully!', 'green');
    
    // Check if results file was generated
    const resultsFile = path.join(__dirname, '..', 'uat-results.json');
    if (fs.existsSync(resultsFile)) {
      log(`📊 Detailed results available in: ${resultsFile}`, 'blue');
    }
    
    const summaryFile = path.join(__dirname, '..', 'uat-summary.txt');
    if (fs.existsSync(summaryFile)) {
      log(`📋 Summary report available in: ${summaryFile}`, 'blue');
    }
    
  } catch (error) {
    log('\n❌ UAT execution failed!', 'red');
    log(`Exit code: ${error.status}`, 'red');
    
    if (error.status === 1) {
      log('\n💡 Common solutions:', 'yellow');
      log('  - Check that all system components are properly implemented');
      log('  - Verify test database is accessible');
      log('  - Ensure Redis is running (if required)');
      log('  - Review the test output above for specific failures');
    }
    
    process.exit(error.status || 1);
  }
}

function printWorkflowSummary() {
  log('\n📋 Available UAT Workflows:', 'bright');
  log('');
  log('  UAT-1: Multi-Ticker Trading Workflow', 'cyan');
  log('    Tests complete trading flow from signal generation to execution');
  log('');
  log('  UAT-2: Risk Management and Portfolio Controls', 'cyan');
  log('    Validates risk limits, position sizing, and drawdown protection');
  log('');
  log('  UAT-3: Real-Time Dashboard and Monitoring', 'cyan');
  log('    Tests dashboard functionality and real-time updates');
  log('');
  log('  UAT-4: Algorithm Learning and Adaptation', 'cyan');
  log('    Validates machine learning and performance optimization');
  log('');
  log('  UAT-5: System Performance and Scalability', 'cyan');
  log('    Tests concurrent processing and performance requirements');
  log('');
}

// Main execution
function main() {
  printHeader();
  
  const options = parseArguments();
  
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    printUsage();
    printWorkflowSummary();
    return;
  }
  
  validateEnvironment();
  
  if (!options.workflow) {
    printWorkflowSummary();
  }
  
  const command = buildJestCommand(options);
  runTests(command);
}

// Handle process signals
process.on('SIGINT', () => {
  log('\n\n⚠️  UAT execution interrupted by user', 'yellow');
  process.exit(130);
});

process.on('SIGTERM', () => {
  log('\n\n⚠️  UAT execution terminated', 'yellow');
  process.exit(143);
});

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main, parseArguments, buildJestCommand };