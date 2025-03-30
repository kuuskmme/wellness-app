// Test file for analyticsUtils.js
const analyticsUtils = require('./analyticsUtils');

// Test BMI calculation
console.log('\nTesting BMI Calculation:');
const bmi1 = analyticsUtils.calculateBMI(70, 175);
console.log('BMI for 70kg, 175cm:', bmi1);

const bmi2 = analyticsUtils.calculateBMI(100, 180);
console.log('BMI for 100kg, 180cm:', bmi2);

// Test wellness score calculation
console.log('\nTesting Wellness Score:');
const mockHealthProfile = {
  physicalMetrics: [
    {
      height: { value: 175, unit: 'cm' },
      weight: { value: 70, unit: 'kg' }
    }
  ],
  lifestyle: {
    sleepHours: 7,
    activityLevel: 'moderate',
    stressLevel: 'moderate'
  },
  dietaryPreferences: {
    diet: 'omnivore'
  }
};

const wellnessScore = analyticsUtils.calculateWellnessScore(mockHealthProfile);
console.log('Wellness score:', wellnessScore);

// Test health insights
console.log('\nTesting Health Insights:');
const insights = analyticsUtils.generateHealthInsights(mockHealthProfile);
console.log('Health insights:', insights);

console.log('\nAnalytics utils tests completed.');