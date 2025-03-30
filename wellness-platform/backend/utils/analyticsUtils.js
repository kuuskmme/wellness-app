/**
 * Utility functions for health analytics calculations
 */

/**
 * Calculate BMI (Body Mass Index)
 * @param {Number} weightKg - Weight in kilograms
 * @param {Number} heightCm - Height in centimeters
 * @returns {Object} BMI value and category
 */
exports.calculateBMI = (weightKg, heightCm) => {
  // Convert height from cm to meters
  const heightM = heightCm / 100;
  
  // Calculate BMI: weight (kg) / (height (m) * height (m))
  const bmi = weightKg / (heightM * heightM);
  
  // Round to 1 decimal place
  const roundedBMI = Math.round(bmi * 10) / 10;
  
  // Categorize BMI
  let category;
  if (roundedBMI < 18.5) {
    category = 'underweight';
  } else if (roundedBMI < 25) {
    category = 'normal';
  } else if (roundedBMI < 30) {
    category = 'overweight';
  } else {
    category = 'obese';
  }
  
  return {
    value: roundedBMI,
    category
  };
};

/**
 * Calculate wellness score (0-100)
 * Based on physical metrics, lifestyle, and goals progress
 * @param {Object} healthProfile - User health profile
 * @returns {Object} Wellness score and factor breakdown
 */
exports.calculateWellnessScore = (healthProfile) => {
  // Default factors with equal weights
  const factors = {
    physical: 0,
    nutrition: 0,
    activity: 0,
    sleep: 0,
    stress: 0
  };
  
  // Physical metrics score (0-20)
  if (healthProfile.physicalMetrics && healthProfile.physicalMetrics.length > 0) {
    const latestMetrics = healthProfile.physicalMetrics[healthProfile.physicalMetrics.length - 1];
    
    if (latestMetrics.height && latestMetrics.weight) {
      // Convert height/weight to standard units if needed
      const weightKg = latestMetrics.weight.unit === 'lb' 
        ? latestMetrics.weight.value * 0.453592 
        : latestMetrics.weight.value;
      
      const heightCm = latestMetrics.height.unit === 'in' 
        ? latestMetrics.height.value * 2.54 
        : latestMetrics.height.value;
      
      // Calculate BMI
      const bmi = this.calculateBMI(weightKg, heightCm);
      
      // Score based on BMI category
      switch (bmi.category) {
        case 'normal':
          factors.physical = 20;
          break;
        case 'underweight':
        case 'overweight':
          factors.physical = 15;
          break;
        case 'obese':
          factors.physical = 10;
          break;
        default:
          factors.physical = 10;
      }
    }
  }
  
  // Nutrition score (0-20)
  if (healthProfile.dietaryPreferences) {
    // Base nutrition score
    factors.nutrition = 15;
    
    // Adjust based on diet quality (simplified)
    if (healthProfile.dietaryPreferences.diet === 'vegan' || 
        healthProfile.dietaryPreferences.diet === 'vegetarian') {
      factors.nutrition += 3;
    }
    
    // Cap at 20
    factors.nutrition = Math.min(factors.nutrition, 20);
  }
  
  // Activity score (0-20)
  if (healthProfile.lifestyle && healthProfile.lifestyle.activityLevel) {
    switch (healthProfile.lifestyle.activityLevel) {
      case 'very-active':
        factors.activity = 20;
        break;
      case 'active':
        factors.activity = 18;
        break;
      case 'moderate':
        factors.activity = 15;
        break;
      case 'light':
        factors.activity = 10;
        break;
      case 'sedentary':
        factors.activity = 5;
        break;
      default:
        factors.activity = 10;
    }
  }
  
  // Sleep score (0-20)
  if (healthProfile.lifestyle && healthProfile.lifestyle.sleepHours) {
    const sleepHours = healthProfile.lifestyle.sleepHours;
    
    if (sleepHours >= 7 && sleepHours <= 9) {
      factors.sleep = 20;
    } else if (sleepHours >= 6 && sleepHours < 7) {
      factors.sleep = 15;
    } else if (sleepHours > 9) {
      factors.sleep = 15;
    } else {
      factors.sleep = 10;
    }
  }
  
  // Stress score (0-20)
  if (healthProfile.lifestyle && healthProfile.lifestyle.stressLevel) {
    switch (healthProfile.lifestyle.stressLevel) {
      case 'low':
        factors.stress = 20;
        break;
      case 'moderate':
        factors.stress = 15;
        break;
      case 'high':
        factors.stress = 5;
        break;
      default:
        factors.stress = 10;
    }
  }
  
  // Calculate total score (sum of all factors)
  const totalScore = Object.values(factors).reduce((sum, value) => sum + value, 0);
  
  return {
    score: totalScore,
    factors
  };
};

/**
 * Calculate goal progress percentage
 * @param {Object} goal - Fitness goal object
 * @param {Object} latestMetrics - Latest physical metrics
 * @returns {Number} Progress percentage (0-100)
 */
exports.calculateGoalProgress = (goal, latestMetrics) => {
  // If goal already has progress set, return it
  if (goal.progress !== undefined && goal.progress !== null) {
    return goal.progress;
  }
  
  // If no target or metrics, return 0
  if (!goal.target || !goal.target.value || !latestMetrics) {
    return 0;
  }
  
  let progress = 0;
  
  // Calculate progress based on goal type
  switch (goal.type) {
    case 'weight':
      if (latestMetrics.weight && latestMetrics.weight.value) {
        const currentWeight = latestMetrics.weight.value;
        const targetWeight = goal.target.value;
        
        // Assuming starting weight is stored or can be retrieved
        // For this simplified version, we'll use a fixed starting point
        const startingWeight = currentWeight + 10; // Default assumption
        
        if (targetWeight < startingWeight) {
          // Weight loss goal
          const totalToLose = startingWeight - targetWeight;
          const lostSoFar = startingWeight - currentWeight;
          progress = Math.min(100, Math.max(0, (lostSoFar / totalToLose) * 100));
        } else {
          // Weight gain goal
          const totalToGain = targetWeight - startingWeight;
          const gainedSoFar = currentWeight - startingWeight;
          progress = Math.min(100, Math.max(0, (gainedSoFar / totalToGain) * 100));
        }
      }
      break;
      
    // Add other goal types here (strength, endurance, etc.)
    default:
      progress = 0;
  }
  
  return Math.round(progress);
};

/**
 * Generate health insights based on user's health profile
 * @param {Object} healthProfile - User health profile
 * @returns {Array} Array of insight objects
 */
exports.generateHealthInsights = (healthProfile) => {
  const insights = [];
  
  // Get latest metrics if available
  const latestMetrics = healthProfile.physicalMetrics && healthProfile.physicalMetrics.length > 0
    ? healthProfile.physicalMetrics[healthProfile.physicalMetrics.length - 1]
    : null;
  
  // BMI-based insights
  if (latestMetrics && latestMetrics.height && latestMetrics.weight) {
    const weightKg = latestMetrics.weight.unit === 'lb' 
      ? latestMetrics.weight.value * 0.453592 
      : latestMetrics.weight.value;
    
    const heightCm = latestMetrics.height.unit === 'in' 
      ? latestMetrics.height.value * 2.54 
      : latestMetrics.height.value;
    
    const bmi = this.calculateBMI(weightKg, heightCm);
    
    // Add insight based on BMI category
    switch (bmi.category) {
      case 'underweight':
        insights.push({
          category: 'nutrition',
          insight: 'Your BMI indicates you may be underweight.',
          recommendation: 'Consider increasing caloric intake with nutritious foods and consult with a healthcare provider.'
        });
        break;
      case 'overweight':
      case 'obese':
        insights.push({
          category: 'nutrition',
          insight: `Your BMI indicates you may be ${bmi.category}.`,
          recommendation: 'Consider a balanced diet and regular exercise routine. Consult with a healthcare provider for personalized advice.'
        });
        break;
      case 'normal':
        insights.push({
          category: 'nutrition',
          insight: 'Your BMI is within the normal range.',
          recommendation: 'Maintain your healthy lifestyle with balanced nutrition and regular physical activity.'
        });
        break;
    }
  }
  
  // Sleep-based insights
  if (healthProfile.lifestyle && healthProfile.lifestyle.sleepHours) {
    const sleepHours = healthProfile.lifestyle.sleepHours;
    
    if (sleepHours < 7) {
      insights.push({
        category: 'sleep',
        insight: 'You may not be getting enough sleep.',
        recommendation: 'Aim for 7-9 hours of sleep per night for optimal health and recovery.'
      });
    } else if (sleepHours > 9) {
      insights.push({
        category: 'sleep',
        insight: 'You may be getting more sleep than necessary.',
        recommendation: 'While sleep is important, excessive sleep can sometimes indicate other health issues. Consider consulting a healthcare provider if you feel fatigued despite long sleep hours.'
      });
    }
  }
  
  // Activity level insights
  if (healthProfile.lifestyle && healthProfile.lifestyle.activityLevel) {
    if (healthProfile.lifestyle.activityLevel === 'sedentary' || 
        healthProfile.lifestyle.activityLevel === 'light') {
      insights.push({
        category: 'activity',
        insight: 'Your activity level is on the lower side.',
        recommendation: 'Try to incorporate more movement into your day. Even short walks can have significant health benefits.'
      });
    }
  }
  
  // Stress level insights
  if (healthProfile.lifestyle && healthProfile.lifestyle.stressLevel === 'high') {
    insights.push({
      category: 'stress',
      insight: 'Your reported stress level is high.',
      recommendation: 'Consider stress-reduction techniques such as meditation, deep breathing, or physical activity. If stress is significantly impacting your life, consider speaking with a mental health professional.'
    });
  }
  
  return insights;
};