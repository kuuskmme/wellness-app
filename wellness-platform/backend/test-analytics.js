// test-analytics.js
const analyticsUtils = require('./utils/analyticsUtils');

// Test BMI calculation
const testBMI = () => {
  console.log('\n--- BMI Calculation Test ---');
  
  const testCases = [
    { weight: 70, height: 175, expected: { range: [22, 23], category: 'normal' } },
    { weight: 60, height: 180, expected: { range: [18, 19], category: 'normal' } },
    { weight: 100, height: 180, expected: { range: [30, 31], category: 'obese' } },
    { weight: 50, height: 170, expected: { range: [17, 18], category: 'underweight' } },
    { weight: 85, height: 175, expected: { range: [27, 28], category: 'overweight' } }
  ];
  
  testCases.forEach((testCase, index) => {
    const result = analyticsUtils.calculateBMI(testCase.weight, testCase.height);
    
    const passRange = result.value >= testCase.expected.range[0] && 
                      result.value <= testCase.expected.range[1];
    const passCategory = result.category === testCase.expected.category;
    
    console.log(`Test ${index + 1}: ${testCase.weight}kg, ${testCase.height}cm`);
    console.log(`  BMI: ${result.value} (Expected range: ${testCase.expected.range[0]}-${testCase.expected.range[1]}) - ${passRange ? 'PASS' : 'FAIL'}`);
    console.log(`  Category: ${result.category} (Expected: ${testCase.expected.category}) - ${passCategory ? 'PASS' : 'FAIL'}`);
  });
};

// Test wellness score calculation
const testWellnessScore = () => {
  console.log('\n--- Wellness Score Test ---');
  
  const testCases = [
    {
      profile: {
        physicalMetrics: [{ 
          height: { value: 175, unit: 'cm' },
          weight: { value: 70, unit: 'kg' }
        }],
        lifestyle: {
          sleepHours: 8,
          activityLevel: 'active',
          stressLevel: 'low'
        },
        dietaryPreferences: {
          diet: 'vegan'
        }
      },
      expectedRange: [80, 100]
    },
    {
      profile: {
        physicalMetrics: [{ 
          height: { value: 180, unit: 'cm' },
          weight: { value: 100, unit: 'kg' }
        }],
        lifestyle: {
          sleepHours: 5,
          activityLevel: 'sedentary',
          stressLevel: 'high'
        },
        dietaryPreferences: {
          diet: 'omnivore'
        }
      },
      expectedRange: [30, 50]
    }
  ];
  
  testCases.forEach((testCase, index) => {
    const result = analyticsUtils.calculateWellnessScore(testCase.profile);
    
    const pass = result.score >= testCase.expectedRange[0] && 
                 result.score <= testCase.expectedRange[1];
    
    console.log(`Test ${index + 1}:`);
    console.log(`  Score: ${result.score} (Expected range: ${testCase.expectedRange[0]}-${testCase.expectedRange[1]}) - ${pass ? 'PASS' : 'FAIL'}`);
    console.log(`  Factors: ${JSON.stringify(result.factors)}`);
  });
};

// Test health insights generation
const testHealthInsights = () => {
  console.log('\n--- Health Insights Test ---');
  
  const testCases = [
    {
      profile: {
        physicalMetrics: [{ 
          height: { value: 175, unit: 'cm' },
          weight: { value: 70, unit: 'kg' }
        }],
        lifestyle: {
          sleepHours: 8,
          activityLevel: 'active',
          stressLevel: 'low'
        }
      },
      expectedCategories: ['nutrition']
    },
    {
      profile: {
        physicalMetrics: [{ 
          height: { value: 180, unit: 'cm' },
          weight: { value: 100, unit: 'kg' }
        }],
        lifestyle: {
          sleepHours: 5,
          activityLevel: 'sedentary',
          stressLevel: 'high'
        }
      },
      expectedCategories: ['nutrition', 'sleep', 'activity', 'stress']
    }
  ];
  
  testCases.forEach((testCase, index) => {
    const insights = analyticsUtils.generateHealthInsights(testCase.profile);
    
    const categories = insights.map(insight => insight.category);
    const missingCategories = testCase.expectedCategories.filter(cat => !categories.includes(cat));
    
    console.log(`Test ${index + 1}:`);
    console.log(`  Generated ${insights.length} insights`);
    console.log(`  Categories: ${categories.join(', ')}`);
    console.log(`  Missing expected categories: ${missingCategories.length ? missingCategories.join(', ') : 'None'}`);
    console.log(`  Result: ${missingCategories.length === 0 ? 'PASS' : 'FAIL'}`);
  });
};

// Run all tests
const runAllTests = () => {
  console.log('RUNNING ANALYTICS UTILITY TESTS');
  testBMI();
  testWellnessScore();
  testHealthInsights();
  console.log('\nALL TESTS COMPLETED');
};

runAllTests();