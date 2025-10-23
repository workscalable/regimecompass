/**
 * Custom Jest reporter for UAT tests
 * Provides detailed reporting specifically for User Acceptance Tests
 */

class UATReporter {
  constructor(globalConfig, options) {
    this._globalConfig = globalConfig;
    this._options = options;
    this._results = {
      startTime: null,
      endTime: null,
      testResults: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        workflows: {}
      }
    };
  }

  onRunStart() {
    this._results.startTime = new Date();
    console.log('\n🎯 Starting User Acceptance Tests (UAT)');
    console.log('=' .repeat(60));
    console.log('Testing complete end-to-end workflows for Gamma Adaptive System');
    console.log('=' .repeat(60));
  }

  onTestResult(test, testResult) {
    const { testResults } = testResult;
    
    testResults.forEach(result => {
      this._results.total++;
      
      if (result.status === 'passed') {
        this._results.passed++;
        console.log(`✅ ${result.ancestorTitles.join(' → ')} → ${result.title}`);
      } else if (result.status === 'failed') {
        this._results.failed++;
        console.log(`❌ ${result.ancestorTitles.join(' → ')} → ${result.title}`);
        if (result.failureMessages.length > 0) {
          console.log(`   Error: ${result.failureMessages[0].split('\n')[0]}`);
        }
      } else if (result.status === 'skipped') {
        this._results.skipped++;
        console.log(`⏭️  ${result.ancestorTitles.join(' → ')} → ${result.title}`);
      }
      
      // Track workflow-level results
      const workflow = result.ancestorTitles[0];
      if (workflow && workflow.startsWith('UAT-')) {
        if (!this._results.summary.workflows[workflow]) {
          this._results.summary.workflows[workflow] = { passed: 0, failed: 0, total: 0 };
        }
        this._results.summary.workflows[workflow].total++;
        if (result.status === 'passed') {
          this._results.summary.workflows[workflow].passed++;
        } else if (result.status === 'failed') {
          this._results.summary.workflows[workflow].failed++;
        }
      }
      
      this._results.testResults.push({
        workflow,
        title: result.title,
        status: result.status,
        duration: result.duration,
        failureMessage: result.failureMessages[0] || null
      });
    });
  }

  onRunComplete() {
    this._results.endTime = new Date();
    const duration = (this._results.endTime - this._results.startTime) / 1000;
    
    console.log('\n' + '=' .repeat(60));
    console.log('🎯 UAT Results Summary');
    console.log('=' .repeat(60));
    
    // Overall summary
    console.log(`\n📊 Overall Results:`);
    console.log(`   Total Tests: ${this._results.total}`);
    console.log(`   ✅ Passed: ${this._results.passed}`);
    console.log(`   ❌ Failed: ${this._results.failed}`);
    console.log(`   ⏭️  Skipped: ${this._results.skipped}`);
    console.log(`   ⏱️  Duration: ${duration.toFixed(2)}s`);
    
    // Workflow-level summary
    console.log(`\n🔄 Workflow Results:`);
    Object.entries(this._results.summary.workflows).forEach(([workflow, stats]) => {
      const status = stats.failed === 0 ? '✅' : '❌';
      const percentage = ((stats.passed / stats.total) * 100).toFixed(1);
      console.log(`   ${status} ${workflow}: ${stats.passed}/${stats.total} (${percentage}%)`);
    });
    
    // Requirements coverage
    console.log(`\n📋 Requirements Coverage:`);
    const requirementsCovered = this._analyzeRequirementsCoverage();
    requirementsCovered.forEach(req => {
      console.log(`   ✓ ${req}`);
    });
    
    // Performance metrics
    console.log(`\n⚡ Performance Highlights:`);
    const performanceMetrics = this._extractPerformanceMetrics();
    performanceMetrics.forEach(metric => {
      console.log(`   ${metric}`);
    });
    
    // Final verdict
    const allWorkflowsPassed = Object.values(this._results.summary.workflows)
      .every(stats => stats.failed === 0);
    
    console.log('\n' + '=' .repeat(60));
    if (allWorkflowsPassed && this._results.failed === 0) {
      console.log('🎉 ALL UAT WORKFLOWS PASSED - SYSTEM READY FOR PRODUCTION');
    } else {
      console.log('⚠️  SOME UAT WORKFLOWS FAILED - REVIEW REQUIRED BEFORE PRODUCTION');
    }
    console.log('=' .repeat(60));
    
    // Save detailed results to file
    if (this._options.outputFile) {
      const fs = require('fs');
      const detailedResults = {
        ...this._results,
        summary: {
          ...this._results.summary,
          duration,
          allWorkflowsPassed,
          requirementsCovered,
          performanceMetrics
        }
      };
      
      fs.writeFileSync(this._options.outputFile, JSON.stringify(detailedResults, null, 2));
      console.log(`\n📄 Detailed results saved to: ${this._options.outputFile}`);
    }
  }

  _analyzeRequirementsCoverage() {
    // Map test workflows to requirements they validate
    const workflowRequirements = {
      'UAT-1': ['Multi-Ticker State Management', 'Signal Processing', 'Options Trading', 'Performance Analytics'],
      'UAT-2': ['Risk Management', 'Portfolio Controls', 'Drawdown Protection'],
      'UAT-3': ['Real-Time Dashboard', 'Monitoring', 'Configuration Management'],
      'UAT-4': ['Algorithm Learning', 'Confidence Calibration', 'Performance Optimization'],
      'UAT-5': ['System Performance', 'Scalability', 'Concurrent Processing']
    };
    
    const covered = [];
    Object.entries(this._results.summary.workflows).forEach(([workflow, stats]) => {
      if (stats.failed === 0 && stats.total > 0) {
        const requirements = workflowRequirements[workflow] || [];
        covered.push(...requirements);
      }
    });
    
    return [...new Set(covered)]; // Remove duplicates
  }

  _extractPerformanceMetrics() {
    // Extract performance-related information from test results
    const metrics = [];
    
    // Look for performance-related test results
    this._results.testResults.forEach(result => {
      if (result.title.includes('latency') || result.title.includes('performance')) {
        if (result.status === 'passed') {
          metrics.push(`${result.title}: PASSED`);
        }
      }
    });
    
    // Add some standard metrics
    metrics.push(`Average test duration: ${(this._results.testResults.reduce((sum, r) => sum + (r.duration || 0), 0) / this._results.testResults.length).toFixed(0)}ms`);
    
    if (metrics.length === 0) {
      metrics.push('Performance metrics will be available after test execution');
    }
    
    return metrics;
  }
}

module.exports = UATReporter;