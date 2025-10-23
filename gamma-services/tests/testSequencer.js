const Sequencer = require('@jest/test-sequencer').default;

class CustomSequencer extends Sequencer {
  sort(tests) {
    // Sort tests to run unit tests first, then integration, then acceptance
    const testOrder = [
      'unit',
      'integration', 
      'acceptance'
    ];
    
    return tests.sort((testA, testB) => {
      const getTestType = (test) => {
        if (test.path.includes('/unit/')) return 'unit';
        if (test.path.includes('/integration/')) return 'integration';
        if (test.path.includes('/acceptance/')) return 'acceptance';
        return 'unit'; // default
      };
      
      const typeA = getTestType(testA);
      const typeB = getTestType(testB);
      
      const indexA = testOrder.indexOf(typeA);
      const indexB = testOrder.indexOf(typeB);
      
      if (indexA !== indexB) {
        return indexA - indexB;
      }
      
      // If same type, sort alphabetically
      return testA.path.localeCompare(testB.path);
    });
  }
}

module.exports = CustomSequencer;