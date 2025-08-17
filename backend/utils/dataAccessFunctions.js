// backend/utils/dataAccessFunctions.js
const HealthProfile = require('../models/HealthProfile');
const MealPlan = require('../models/MealPlan');
const UserPreferences = require('../models/UserPreferences');
const Recipe = require('../models/Recipe');
const HealthHistory = require('../models/HealthHistory');

/**
 * Function definitions for OpenAI function calling
 * Each function has a schema definition and an implementation
 */

// Function schemas for OpenAI
const functionSchemas = [
  {
    name: 'get_health_metrics',
    description: 'Get user health metrics including BMI, weight, wellness score, and goals',
    parameters: {
      type: 'object',
      properties: {
        metric_type: {
          type: 'string',
          enum: ['bmi', 'weight', 'wellness_score', 'all'],
          description: 'Type of metric to retrieve'
        },
        time_period: {
          type: 'string',
          enum: ['current', 'weekly', 'monthly'],
          description: 'Time period for the metrics'
        }
      },
      required: ['metric_type']
    }
  },
  {
    name: 'get_nutrition_data',
    description: 'Get nutrition-related data including meal plans, recipes, and nutritional analysis',
    parameters: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['meal_plan', 'recipe', 'nutritional_analysis', 'preferences'],
          description: 'Type of nutrition data to retrieve'
        },
        timeframe: {
          type: 'string',
          enum: ['today', 'week', 'month'],
          description: 'Timeframe for the data'
        },
        recipe_id: {
          type: 'string',
          description: 'Optional recipe ID for specific recipe lookup'
        }
      },
      required: ['type']
    }
  },
  {
    name: 'get_progress_summary',
    description: 'Get progress summary towards fitness and health goals',
    parameters: {
      type: 'object',
      properties: {
        goal_type: {
          type: 'string',
          enum: ['weight', 'fitness', 'nutrition', 'all'],
          description: 'Type of goal progress to retrieve'
        },
        include_recommendations: {
          type: 'boolean',
          description: 'Whether to include recommendations for improvement'
        }
      },
      required: ['goal_type']
    }
  },
  {
    name: 'get_general_insights',
    description: 'Get general wellness insights and recommendations',
    parameters: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          enum: ['sleep', 'exercise', 'stress', 'hydration', 'general'],
          description: 'Topic for insights'
        }
      },
      required: ['topic']
    }
  }
];

// Function implementations
const functionImplementations = {
  /**
   * Get health metrics for the user
   */
  async get_health_metrics(userId, params) {
    try {
      const { metric_type = 'all', time_period = 'current' } = params;
      
      // Validate parameters
      if (!['bmi', 'weight', 'wellness_score', 'all'].includes(metric_type)) {
        throw new Error(`Invalid metric_type: ${metric_type}`);
      }
      
      // Get current health profile
      const profile = await HealthProfile.findOne({ userId });
      
      if (!profile) {
        return {
          error: 'Health profile not found. Please create your health profile first.',
          data: null
        };
      }
      
      // Prepare response based on metric type
      let response = {
        timestamp: new Date(),
        period: time_period
      };
      
      if (metric_type === 'bmi' || metric_type === 'all') {
        response.bmi = {
          value: profile.physicalMetrics?.bmi?.value || 0,
          category: profile.physicalMetrics?.bmi?.category || 'unknown',
          unit: 'kg/m²'
        };
      }
      
      if (metric_type === 'weight' || metric_type === 'all') {
      response.weight = {
        current: profile.physicalMetrics?.weight?.value || 0,
        initial: profile.metadata?.initialWeight || profile.physicalMetrics?.weight?.value || 0,
        // FIXED: Handle targetWeight as object or number
        target: typeof profile.fitnessGoals?.targetWeight === 'object' 
          ? profile.fitnessGoals.targetWeight.value 
          : profile.fitnessGoals?.targetWeight || 0,
        unit: 'kg'
      };
        
        // Calculate progress
        if (profile.fitnessGoals?.targetWeight) {
          const initial = profile.metadata?.initialWeight || profile.physicalMetrics?.weight?.value;
          const current = profile.physicalMetrics?.weight?.value;
          const target = profile.fitnessGoals.targetWeight;
          
          if (initial && current && target) {
            const totalToLose = initial - target;
            const actualLost = initial - current;
            response.weight.progressPercentage = Math.round((actualLost / totalToLose) * 100);
          }
        }
      }
      
      if (metric_type === 'wellness_score' || metric_type === 'all') {
      // ADDED: Better handling of wellness score components
      response.wellnessScore = {
        overall: profile.wellnessScore?.overall || 0,
        components: {
          bmi: profile.wellnessScore?.components?.bmi || 0,
          activity: profile.wellnessScore?.components?.activity || 0,
          progress: profile.wellnessScore?.components?.progress || 0,
          habits: profile.wellnessScore?.components?.habits || 0
        },
        maxScore: 100
      };
      
      // ADDED: Log for debugging
      console.log('Wellness score retrieved:', response.wellnessScore);
    }
      
      if (metric_type === 'all') {
        response.goals = {
          primary: profile.fitnessGoals?.primary || 'general_fitness',
          secondary: profile.fitnessGoals?.secondary || [],
          activityLevel: profile.lifestyleIndicators?.activityLevel || 'moderate'
        };
      }
      
      // Get historical data if requested
      if (time_period !== 'current') {
        const daysAgo = time_period === 'weekly' ? 7 : 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysAgo);
        
        const history = await HealthHistory.find({
          userId,
          recordedAt: { $gte: startDate }
        }).sort({ recordedAt: 1 });
        
        if (history.length > 0) {
          response.trend = {
            dataPoints: history.length,
            startValue: history[0].metrics?.weight || 0,
            endValue: history[history.length - 1].metrics?.weight || 0,
            change: (history[history.length - 1].metrics?.weight || 0) - (history[0].metrics?.weight || 0)
          };
        }
      }
      
      return {
        error: null,
        data: response
      };
      
    } catch (error) {
      console.error('get_health_metrics error:', error);
      return {
        error: 'Failed to retrieve health metrics',
        data: null
      };
    }
  },

  /**
   * Get nutrition data for the user
   */
  async get_nutrition_data(userId, params) {
    try {
      const { type, timeframe = 'today', recipe_id } = params;
      
      // Validate parameters
      if (!['meal_plan', 'recipe', 'nutritional_analysis', 'preferences'].includes(type)) {
        throw new Error(`Invalid type: ${type}`);
      }
      
      let response = {
        timestamp: new Date(),
        type,
        timeframe
      };
      
      switch (type) {
        case 'meal_plan':
        let mealPlan = await MealPlan.findOne({
          userId,
          status: 'active'
        }).sort({ createdAt: -1 });
        
        // ADDED: If no active plan, try to find and activate the most recent one
        if (!mealPlan) {
          const recentPlan = await MealPlan.findOne({ userId }).sort({ createdAt: -1 });
          
          if (recentPlan) {
            console.log('No active plan found, activating most recent plan');
            recentPlan.status = 'active';
            await recentPlan.save();
            mealPlan = recentPlan;
          } else {
            return {
              error: 'No meal plan found. Would you like me to help you create one?',
              data: null
            };
          }
        }
          
          // Get relevant day(s) based on timeframe
          if (timeframe === 'today') {
            console.log('Meal plan found:', mealPlan._id);
  console.log('Daily plans:', mealPlan.dailyPlans);
  console.log('First day:', mealPlan.dailyPlans?.[0]);
  console.log('First day meals:', mealPlan.dailyPlans?.[0]?.meals);
            const today = new Date().getDay();
            response.data = mealPlan.dailyPlans?.[0];
          } else if (timeframe === 'week') {
            response.data = mealPlan.dailyPlans;
          }
          
          // Include nutritional summary
          if (response.data) {
            let totalNutrition = { calories: 0, protein: 0, carbs: 0, fat: 0 };
            const meals = Array.isArray(response.data) ? 
              response.data.flatMap(d => d.meals) : 
              response.data.meals;
              
            meals?.forEach(meal => {
              if (meal.nutrition) {
                totalNutrition.calories += meal.nutrition.calories || 0;
                totalNutrition.protein += meal.nutrition.protein || 0;
                totalNutrition.carbs += meal.nutrition.carbs || 0;
                totalNutrition.fat += meal.nutrition.fat || 0;
              }
            });
            
            response.nutritionSummary = {
              calories: Math.round(totalNutrition.calories),
              protein: Math.round(totalNutrition.protein) + 'g',
              carbs: Math.round(totalNutrition.carbs) + 'g',
              fat: Math.round(totalNutrition.fat) + 'g'
            };
          }
          break;
          
        case 'recipe':
          if (recipe_id) {
            const recipe = await Recipe.findById(recipe_id);
            response.data = recipe;
          } else {
            // Get recent recipes
            const recipes = await Recipe.find()
              .limit(5)
              .select('title description category nutrition cookTime');
            response.data = recipes;
          }
          break;
          
        case 'preferences':
          const preferences = await UserPreferences.findOne({ userId });
          
          if (!preferences) {
            return {
              error: 'Nutrition preferences not found. Please set up your preferences first.',
              data: null
            };
          }
          
          response.data = {
            dietary: preferences.dietaryPreferences || [],
            allergies: preferences.allergies || [],
            calorieTarget: preferences.calorieTarget || 2000,
            mealFrequency: preferences.mealFrequency || 3,
            cuisinePreferences: preferences.cuisinePreferences || []
          };
          break;
          
        case 'nutritional_analysis':
          // This would integrate with nutritionAnalysisService
          response.data = {
            message: 'Nutritional analysis requires meal plan data',
            suggestion: 'Please ensure you have an active meal plan for analysis'
          };
          break;
      }
      
      return {
        error: null,
        data: response
      };
      
    } catch (error) {
      console.error('get_nutrition_data error:', error);
      return {
        error: 'Failed to retrieve nutrition data',
        data: null
      };
    }
  },

  /**
   * Get progress summary for the user
   */
  async get_progress_summary(userId, params) {
    try {
      const { goal_type = 'all', include_recommendations = true } = params;
      
      // Validate parameters
      if (!['weight', 'fitness', 'nutrition', 'all'].includes(goal_type)) {
        throw new Error(`Invalid goal_type: ${goal_type}`);
      }
      
      const profile = await HealthProfile.findOne({ userId });
      
      if (!profile) {
        return {
          error: 'Health profile not found. Please create your health profile first.',
          data: null
        };
      }
      
      let response = {
        timestamp: new Date(),
        goalType: goal_type
      };
      
      // Weight progress
      if (goal_type === 'weight' || goal_type === 'all') {
        const initial = profile.metadata?.initialWeight || profile.physicalMetrics?.weight?.value;
        const current = profile.physicalMetrics?.weight?.value;
        const target = profile.fitnessGoals?.targetWeight;
        
        if (initial && current && target) {
          const totalToChange = Math.abs(target - initial);
          const actualChange = Math.abs(current - initial);
          const progressPercentage = totalToChange > 0 ? 
            Math.round((actualChange / totalToChange) * 100) : 0;
          
          response.weightProgress = {
            initial: initial + ' kg',
            current: current + ' kg',
            target: target + ' kg',
            change: (current - initial).toFixed(1) + ' kg',
            progressPercentage,
            onTrack: progressPercentage >= 20 // Simple check
          };
        }
      }
      
      // Fitness progress
      if (goal_type === 'fitness' || goal_type === 'all') {
        response.fitnessProgress = {
          currentActivityLevel: profile.lifestyleIndicators?.activityLevel || 'moderate',
          weeklyExerciseFrequency: profile.initialFitnessAssessment?.weeklyActivityFrequency || 0,
          primaryGoal: profile.fitnessGoals?.primary || 'general_fitness',
          achievements: []
        };
        
        // Add some achievements based on data
        if (profile.wellnessScore?.overall >= 70) {
          response.fitnessProgress.achievements.push('Wellness score above 70!');
        }
        if (profile.physicalMetrics?.bmi?.value >= 18.5 && profile.physicalMetrics?.bmi?.value <= 24.9) {
          response.fitnessProgress.achievements.push('BMI in healthy range');
        }
      }
      
      // Add recommendations if requested
      if (include_recommendations) {
        response.recommendations = [];
        
        if (profile.wellnessScore?.overall < 60) {
          response.recommendations.push('Focus on increasing daily activity to improve wellness score');
        }
        
        if (profile.lifestyleIndicators?.activityLevel === 'sedentary') {
          response.recommendations.push('Try to add 30 minutes of walking daily');
        }
        
        if (profile.initialFitnessAssessment?.weeklyActivityFrequency < 3) {
          response.recommendations.push('Aim for at least 3 exercise sessions per week');
        }
        
        if (response.recommendations.length === 0) {
          response.recommendations.push('Keep up the great work! You\'re on track with your goals.');
        }
      }
      
      return {
        error: null,
        data: response
      };
      
    } catch (error) {
      console.error('get_progress_summary error:', error);
      return {
        error: 'Failed to retrieve progress summary',
        data: null
      };
    }
  },

  /**
   * Get general wellness insights
   */
  async get_general_insights(userId, params) {
    try {
      const { topic = 'general' } = params;
      
      // Validate parameters
      if (!['sleep', 'exercise', 'stress', 'hydration', 'general'].includes(topic)) {
        throw new Error(`Invalid topic: ${topic}`);
      }
      
      const profile = await HealthProfile.findOne({ userId });
      
      let insights = {
        timestamp: new Date(),
        topic,
        insights: []
      };
      
      // Topic-specific insights
      switch (topic) {
        case 'sleep':
          insights.insights = [
            'Aim for 7-9 hours of quality sleep each night',
            'Maintain a consistent sleep schedule, even on weekends',
            'Avoid screens 1 hour before bedtime to improve sleep quality',
            'Create a cool, dark, and quiet sleeping environment'
          ];
          
          if (profile?.lifestyleIndicators?.stressLevel === 'high') {
            insights.insights.push('High stress can affect sleep - try relaxation techniques before bed');
          }
          break;
          
        case 'exercise':
          insights.insights = [
            'WHO recommends 150 minutes of moderate exercise per week',
            'Include both cardio and strength training in your routine',
            'Start with 10-minute sessions if you\'re new to exercise',
            'Walking is one of the best exercises for overall health'
          ];
          
          if (profile?.lifestyleIndicators?.activityLevel === 'sedentary') {
            insights.insights.push('Start small: Even 5 minutes of movement every hour helps');
          }
          break;
          
        case 'stress':
          insights.insights = [
            'Practice deep breathing exercises for 5 minutes daily',
            'Regular physical activity is one of the best stress relievers',
            'Consider meditation or mindfulness practices',
            'Maintain social connections for emotional support'
          ];
          break;
          
        case 'hydration':
          const weight = profile?.physicalMetrics?.weight?.value || 70;
          const waterIntake = Math.round(weight * 35); // ml per kg
          
          insights.insights = [
            `Based on your weight, aim for about ${waterIntake}ml (${(waterIntake/1000).toFixed(1)}L) of water daily`,
            'Drink water before, during, and after exercise',
            'Monitor urine color - pale yellow indicates good hydration',
            'Include water-rich foods like fruits and vegetables'
          ];
          break;
          
        case 'general':
          insights.insights = [
            'Focus on progress, not perfection',
            'Small, consistent changes lead to lasting results',
            'Listen to your body and rest when needed',
            'Celebrate small victories along your wellness journey'
          ];
          
          // Add personalized insights based on profile
          if (profile) {
            if (profile.wellnessScore?.overall >= 80) {
              insights.insights.push('Excellent wellness score! Keep maintaining your healthy habits');
            } else if (profile.wellnessScore?.overall < 60) {
              insights.insights.push('There\'s room for improvement - focus on one area at a time');
            }
          }
          break;
      }
      
      return {
        error: null,
        data: insights
      };
      
    } catch (error) {
      console.error('get_general_insights error:', error);
      return {
        error: 'Failed to retrieve insights',
        data: null
      };
    }
  }
};

/**
 * Execute a function call with proper validation and error handling
 */
async function executeFunction(functionName, userId, parameters) {
  try {
    // Security check - validate the function call
    const securityValidator = require('./securityValidator');
    const validation = securityValidator.validateFunctionCall(functionName, parameters, userId);
    
    if (!validation.valid) {
      console.warn(`[Security] Invalid function call: ${functionName} - ${validation.reason}`);
      return {
        error: 'Invalid function call parameters',
        data: null
      };
    }
    
    // Check if function exists
    if (!functionImplementations[functionName]) {
      return {
        error: `Function ${functionName} not found`,
        data: null
      };
    }
    
    // Validate userId
    if (!userId) {
      return {
        error: 'User ID required for data access',
        data: null
      };
    }
    
    // Ensure parameters don't contain other user IDs
    const safeParams = { ...parameters };
    delete safeParams.userId; // Remove any userId from params
    
    // Execute the function with user's ID only
    const result = await functionImplementations[functionName](userId, safeParams);
    
    // Log for debugging (sanitized)
    console.log(`[Function Call] ${functionName} executed for user ${userId.substring(0, 8)}...`);
    
    return result;
    
  } catch (error) {
    console.error(`Function execution error for ${functionName}:`, error);
    return {
      error: `Failed to execute ${functionName}: ${error.message}`,
      data: null
    };
  }
}

module.exports = {
  functionSchemas,
  executeFunction,
  functionImplementations
};