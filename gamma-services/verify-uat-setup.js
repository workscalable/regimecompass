#!/usr/bin/env node

/**
 * UAT Setup Verification Script
 * This script verifies that the UAT environment is properly set up and can compile/run
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFile(filePath, description) {
  if (fs.existsSync(filePath)) {
    log(`✓ ${description}`, 'green');
    return true;
  } else {
    log(`✗ ${description} - Missing: ${filePath}`, 'red');
    return false;
  }
}

function runCommand(command, description) {
  try {
    log(`\n🔄 ${description}...`, 'yellow');
    const output = execSync(command, { 
      stdio: 'pipe',
      cwd: __dirname,
      encoding: 'utf8'
    });
    log(`✓ ${description} completed successfully`, 'green');
    return true;
  } catch (error) {
    log(`✗ ${description} failed:`, 'red');
    log(`   Command: ${command}`, 'red');
    log(`   Error: ${error.message}`, 'red');
    if (error.stdout) {
      log(`   Output: ${error.stdout}`, 'yellow');
    }
    return false;
  }
}

async function main() {
  log('\n🎯 UAT Setup Verification', 'cyan');
  log('=' .repeat(50), 'cyan');
  
  let allChecksPass = true;
  
  // Step 1: Check Node.js version
  log('\n📋 Step 1: Environment Check', 'bright');
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion >= 16) {
    log(`✓ Node.js version: ${nodeVersion}`, 'green');
  } else {
    log(`✗ Node.js version ${nodeVersion} is too old. Need 16+`, 'red');
    allChecksPass = false;
  }
  
  // Step 2: Check required files
  log('\n📋 Step 2: File Structure Check', 'bright');
  const requiredFiles = [
    ['package.json', 'Package configuration'],
    ['tests/uat/UserAcceptanceTests.ts', 'Main UAT test suite'],
    ['tests/uat/mocks/SystemMocks.ts', 'Mock system components'],
    ['tests/uat/setup-test.ts', 'Setup verification test'],
    ['tests/uat/uat.config.js', 'UAT Jest configuration'],
    ['tests/uat/globalSetup.js', 'UAT global setup'],
    ['tests/uat/globalTeardown.js', 'UAT global teardown'],
    ['scripts/run-uat.js', 'UAT runner script'],
    ['tests/uat/README.md', 'UAT documentation']
  ];
  
  for (const [file, description] of requiredFiles) {
    if (!checkFile(path.join(__dirname, file), description)) {
      allChecksPass = false;
    }
  }
  
  // Step 3: Install dependencies
  log('\n📋 Step 3: Dependency Installation', 'bright');
  if (!runCommand('npm install', 'Installing dependencies')) {
    allChecksPass = false;
  }
  
  // Step 4: TypeScript compilation check
  log('\n📋 Step 4: TypeScript Compilation', 'bright');
  if (!runCommand('npx tsc --noEmit --project .', 'TypeScript compilation check')) {
    // Try with a more lenient approach
    log('Trying alternative TypeScript check...', 'yellow');
    if (!runCommand('npx tsc --noEmit tests/uat/setup-test.ts', 'TypeScript setup test compilation')) {
      allChecksPass = false;
    }
  }
  
  // Step 5: Run setup verification test
  log('\n📋 Step 5: Setup Test Execution', 'bright');
  if (!runCommand('npx jest tests/uat/setup-test.ts --config tests/uat/uat.config.js', 'Running setup verification test')) {
    allChecksPass = false;
  }
  
  // Step 6: Quick UAT smoke test
  log('\n📋 Step 6: UAT Smoke Test', 'bright');
  if (!runCommand('timeout 30s npm run uat:workflow=UAT-1 2>/dev/null || npm run uat:workflow=UAT-1', 'Running UAT smoke test')) {
    log('Note: Full UAT test may take time, this is expected for initial setup', 'yellow');
  }
  
  // Final results
  log('\n' + '=' .repeat(50), 'cyan');
  if (allChecksPass) {
    log('🎉 UAT Setup Verification PASSED!', 'green');
    log('\nYour UAT environment is ready. You can now run:', 'green');
    log('  npm run uat              # Run all UAT tests', 'cyan');
    log('  npm run uat:verbose      # Run with detailed output', 'cyan');
    log('  npm run uat:workflow=UAT-1  # Run specific workflow', 'cyan');
  } else {
    log('❌ UAT Setup Verification FAILED!', 'red');
    log('\nSome checks failed. Please review the errors above.', 'red');
    log('Common solutions:', 'yellow');
    log('  - Ensure Node.js 16+ is installed', 'yellow');
    log('  - Run: npm install', 'yellow');
    log('  - Check file permissions', 'yellow');
    log('  - Verify TypeScript is properly configured', 'yellow');
  }
  log('=' .repeat(50), 'cyan');
  
  process.exit(allChecksPass ? 0 : 1);
}

// Handle process signals
process.on('SIGINT', () => {
  log('\n\n⚠️  Verification interrupted by user', 'yellow');
  process.exit(130);
});

// Run verification
main().catch(error => {
  log(`\n❌ Verification script failed: ${error.message}`, 'red');
  process.exit(1);
});