# UAT Installation and Verification Guide

## Quick Start

To install and verify the UAT (User Acceptance Tests) system locally:

```bash
# 1. Navigate to the project directory
cd gamma-services

# 2. Install dependencies
npm install

# 3. Verify setup (recommended)
npm run uat:verify

# 4. Run a quick setup test
npm run uat:setup-test

# 5. Run full UAT suite
npm run uat:verbose
```

## Step-by-Step Installation

### Prerequisites

- **Node.js 16+** (check with `node --version`)
- **npm 8+** (check with `npm --version`)

### Installation Steps

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Verify TypeScript Compilation**
   ```bash
   npx tsc --noEmit
   ```

3. **Run Setup Verification**
   ```bash
   npm run uat:verify
   ```
   This script will:
   - Check Node.js version
   - Verify all required files exist
   - Install dependencies
   - Test TypeScript compilation
   - Run a basic setup test

4. **Test Individual Components**
   ```bash
   # Test setup only
   npm run uat:setup-test
   
   # Test specific workflow
   npm run uat:workflow=UAT-1
   ```

5. **Run Full UAT Suite**
   ```bash
   # All tests with verbose output
   npm run uat:verbose
   
   # All tests (standard output)
   npm run uat
   ```

## Verification Commands

### Quick Verification
```bash
npm run uat:verify
```

### Manual Verification Steps
```bash
# 1. Check files exist
ls tests/uat/UserAcceptanceTests.ts
ls tests/uat/mocks/SystemMocks.ts
ls scripts/run-uat.js

# 2. Test TypeScript compilation
npx tsc --noEmit tests/uat/setup-test.ts

# 3. Run setup test
npm run uat:setup-test

# 4. Run single UAT workflow
npm run uat:workflow=UAT-1
```

## Expected Output

### Successful Setup Verification
```
🎯 UAT Setup Verification
==================================================

📋 Step 1: Environment Check
✓ Node.js version: v18.17.0

📋 Step 2: File Structure Check
✓ Package configuration
✓ Main UAT test suite
✓ Mock system components
✓ Setup verification test
✓ UAT Jest configuration
✓ UAT global setup
✓ UAT global teardown
✓ UAT runner script
✓ UAT documentation

📋 Step 3: Dependency Installation
✓ Installing dependencies completed successfully

📋 Step 4: TypeScript Compilation
✓ TypeScript compilation check completed successfully

📋 Step 5: Setup Test Execution
✓ Running setup verification test completed successfully

🎉 UAT Setup Verification PASSED!

Your UAT environment is ready. You can now run:
  npm run uat              # Run all UAT tests
  npm run uat:verbose      # Run with detailed output
  npm run uat:workflow=UAT-1  # Run specific workflow
```

### Successful UAT Test Run
```
🎯 Starting User Acceptance Tests (UAT)
============================================================
Testing complete end-to-end workflows for Gamma Adaptive System
============================================================

✅ UAT-1: Multi-Ticker Trading Workflow → Complete workflow: System startup → Signal generation → Options recommendation → Trade execution → Performance tracking
✅ UAT-2: Risk Management and Portfolio Controls → Risk limits enforcement: Portfolio heat → Position sizing → Drawdown protection → Recovery
✅ UAT-3: Real-Time Dashboard and Monitoring → Dashboard workflow: Real-time updates → Multi-ticker display → Performance analytics → Configuration changes
✅ UAT-4: Algorithm Learning and Adaptation → Learning workflow: Trade outcomes → Confidence calibration → Signal improvement → Performance optimization
✅ UAT-5: System Performance and Scalability → Performance workflow: Concurrent processing → Latency validation → Resource monitoring → Scaling verification

============================================================
🎯 UAT Results Summary
============================================================

📊 Overall Results:
   Total Tests: 5
   ✅ Passed: 5
   ❌ Failed: 0
   ⏭️  Skipped: 0
   ⏱️  Duration: 45.23s

🔄 Workflow Results:
   ✅ UAT-1: 1/1 (100.0%)
   ✅ UAT-2: 1/1 (100.0%)
   ✅ UAT-3: 1/1 (100.0%)
   ✅ UAT-4: 1/1 (100.0%)
   ✅ UAT-5: 1/1 (100.0%)

============================================================
🎉 ALL UAT WORKFLOWS PASSED - SYSTEM READY FOR PRODUCTION
============================================================
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Node.js Version Error
```
Error: Node.js version v14.x.x is too old. Need 16+
```
**Solution**: Install Node.js 16 or higher from [nodejs.org](https://nodejs.org)

#### 2. TypeScript Compilation Errors
```
Error: Cannot find module '@jest/globals'
```
**Solution**: 
```bash
npm install --save-dev @jest/globals @types/jest
```

#### 3. Permission Errors (Windows)
```
Error: EACCES: permission denied
```
**Solution**: Run as administrator or fix permissions:
```bash
icacls gamma-services /grant Everyone:F /T
```

#### 4. Missing Files Error
```
Error: Required file missing: tests/uat/UserAcceptanceTests.ts
```
**Solution**: Ensure all files were created properly. Re-run the setup.

#### 5. Jest Configuration Issues
```
Error: Jest configuration not found
```
**Solution**: 
```bash
# Verify config file exists
ls tests/uat/uat.config.js

# Run with explicit config
npx jest --config tests/uat/uat.config.js tests/uat/setup-test.ts
```

### Debug Mode

For detailed debugging:
```bash
# Enable debug logging
DEBUG=* npm run uat:verbose

# Run with Node.js debugging
node --inspect scripts/run-uat.js --verbose

# Check specific test file
npx jest tests/uat/setup-test.ts --verbose --no-cache
```

### Performance Issues

If tests run slowly:
```bash
# Run with increased memory
node --max-old-space-size=4096 scripts/run-uat.js

# Run single workflow to isolate issues
npm run uat:workflow=UAT-1

# Check system resources
npm run uat:performance
```

## File Structure

After successful installation, you should have:

```
gamma-services/
├── package.json                    # Updated with UAT scripts
├── tsconfig.json                   # TypeScript configuration
├── verify-uat-setup.js            # Setup verification script
├── INSTALL-UAT.md                 # This installation guide
├── scripts/
│   └── run-uat.js                 # UAT runner script
└── tests/
    └── uat/
        ├── UserAcceptanceTests.ts  # Main UAT test suite
        ├── setup-test.ts          # Setup verification test
        ├── uat.config.js          # Jest configuration for UAT
        ├── globalSetup.js         # Test environment setup
        ├── globalTeardown.js      # Test environment cleanup
        ├── uatReporter.js         # Custom UAT reporter
        ├── README.md              # UAT documentation
        └── mocks/
            └── SystemMocks.ts     # Mock system components
```

## Next Steps

After successful installation:

1. **Explore UAT Tests**: Read `tests/uat/README.md` for detailed documentation
2. **Run Specific Workflows**: Use `npm run uat:workflow=UAT-X` to test individual workflows
3. **Integrate with CI/CD**: Add UAT tests to your deployment pipeline
4. **Customize Tests**: Modify tests in `tests/uat/UserAcceptanceTests.ts` as needed

## Support

If you encounter issues:
1. Run `npm run uat:verify` to diagnose problems
2. Check the troubleshooting section above
3. Review logs in the console output
4. Ensure all prerequisites are met

The UAT system is designed to work out-of-the-box with mock components, so you can test the complete system functionality without requiring the full Gamma Adaptive System implementation.