// backend/utils/conversationHandlers.js
const { executeFunction } = require('./dataAccessFunctions');

/**
 * Conversation Type Handlers
 * Each handler specializes in a specific type of user query
 * with personalized responses and data interpretation
 */

class ConversationHandlers {
  /**
  * 1. HEALTH METRICS HANDLER
 * Handles: BMI, weight, wellness score queries, weight trends from charts
 * Interprets: Trends, comparisons to goals, health categories, pattern analysis
 */
static async handleHealthMetrics(userId, query, context) {
  try {
    const lowerQuery = query.toLowerCase();
    
    // Enhanced detection for trend/chart queries
    const isTrendQuery = 
      (lowerQuery.includes('trend') || 
       lowerQuery.includes('chart') || 
       lowerQuery.includes('graph') ||
       lowerQuery.includes('pattern') ||
       lowerQuery.includes('history')) &&
      (lowerQuery.includes('weight') || 
       lowerQuery.includes('progress'));
    
    // Determine what specific metric is being asked about
    const isWeightChange = lowerQuery.includes('weight') && (
      lowerQuery.includes('change') || 
      lowerQuery.includes('this month') || 
      lowerQuery.includes('lost') ||
      lowerQuery.includes('gained') ||
      lowerQuery.includes('week')
    );
    
    // Wellness score improvement queries
    const isWellnessImprovement = 
      (lowerQuery.includes('wellness') || lowerQuery.includes('score')) && 
      (lowerQuery.includes('improve') || lowerQuery.includes('increase') || 
       lowerQuery.includes('boost') || lowerQuery.includes('better'));
    
    // Determine time period for data retrieval
    let timePeriod = 'current';
    if (isTrendQuery || lowerQuery.includes('month')) {
      timePeriod = 'monthly';
    } else if (lowerQuery.includes('week')) {
      timePeriod = 'weekly';
    }
    
    // Get comprehensive health data
    const metricsResult = await executeFunction('get_health_metrics', userId, {
      metric_type: 'all',
      time_period: timePeriod
    });
    
    if (!metricsResult.data) {
      return {
        response: "I'd love to help you track your health metrics, but I don't see a health profile yet. Would you like to set one up? It only takes a few minutes and will help me provide personalized insights.",
        functionCalls: []
      };
    }
    
    const data = metricsResult.data;
    const userName = context.userProfile?.name || 'there';
    let response = '';
    
    // Handle weight trend/chart queries
    if (isTrendQuery) {
      response = `${userName}, here's your weight trend analysis:\n\n`;
      
      if (data.trend && data.trend.dataPoints > 0) {
        const trendData = data.trend;
        const change = trendData.change || 0;
        const startWeight = trendData.startValue || data.weight?.initial;
        const currentWeight = trendData.endValue || data.weight?.current;
        const dataPoints = trendData.dataPoints;
        
        response += `**📊 Weight Trend Analysis:**\n`;
        response += `• Period analyzed: Last ${timePeriod === 'weekly' ? 'week' : '30 days'}\n`;
        response += `• Data points tracked: ${dataPoints}\n`;
        response += `• Starting weight: ${startWeight} kg\n`;
        response += `• Current weight: ${currentWeight} kg\n`;
        response += `• Total change: ${change > 0 ? '+' : ''}${change.toFixed(1)} kg\n\n`;
        
        // Analyze the pattern
        response += `**📈 Pattern Description:**\n`;
        
        if (Math.abs(change) < 0.5) {
          response += `Your weight has been **stable** with minimal fluctuation (less than 0.5 kg change).\n`;
          response += `This indicates consistent habits and good maintenance.\n`;
        } else if (change < -2) {
          response += `You're showing a **steady decline** in weight.\n`;
          const weeklyRate = Math.abs(change) / (dataPoints / 7);
          response += `• Average loss: ${weeklyRate.toFixed(2)} kg per week\n`;
          
          if (weeklyRate > 1) {
            response += `⚠️ This is faster than the recommended 0.5-1 kg/week. Consider slowing down for sustainable results.\n`;
          } else {
            response += `✅ This is a healthy, sustainable rate of weight loss!\n`;
          }
        } else if (change < 0) {
          response += `You're showing a **gradual decline** in weight.\n`;
          response += `• Average loss: ${(Math.abs(change) / (dataPoints / 7)).toFixed(2)} kg per week\n`;
          response += `This is a healthy, controlled pace.\n`;
        } else if (change > 2) {
          response += `You're showing a **significant increase** in weight.\n`;
          response += `• Average gain: ${(change / (dataPoints / 7)).toFixed(2)} kg per week\n`;
          
          if (data.goals?.primary === 'muscle_gain') {
            response += `This aligns with your muscle-building goals. Ensure you're strength training to maximize muscle gain.\n`;
          } else {
            response += `Consider reviewing your caloric intake and activity levels.\n`;
          }
        } else {
          response += `You're showing a **slight increase** in weight.\n`;
          response += `• Average gain: ${(change / (dataPoints / 7)).toFixed(2)} kg per week\n`;
          response += `Small fluctuations are normal. Focus on long-term consistency.\n`;
        }
        
        // Visual trend indicator
        response += `\n**Trend Direction:** `;
        if (change < -0.5) {
          response += `📉 Decreasing\n`;
        } else if (change > 0.5) {
          response += `📈 Increasing\n`;
        } else {
          response += `➡️ Stable\n`;
        }
        
        // Add key insights
        response += `\n**💡 Key Insights:**\n`;
        
        // Calculate volatility (simplified)
        if (dataPoints >= 3) {
          response += `• Consistency: `;
          if (Math.abs(change) / dataPoints < 0.2) {
            response += `High (minimal daily fluctuations)\n`;
          } else {
            response += `Moderate (normal fluctuations)\n`;
          }
        }
        
        // Progress to goal
        if (data.weight?.target) {
          const targetWeight = typeof data.weight.target === 'object' ? 
            (data.weight.target.value || data.weight.target.normalizedValue) : 
            data.weight.target;
          
          const toGo = Math.abs(currentWeight - targetWeight);
          response += `• Distance to goal: ${toGo.toFixed(1)} kg\n`;
          
          if (change < 0 && targetWeight < currentWeight) {
            response += `• On track: Yes! Moving toward your target\n`;
          } else if (change > 0 && targetWeight > currentWeight) {
            response += `• On track: Yes! Moving toward your target\n`;
          } else if (Math.abs(change) < 0.1) {
            response += `• On track: Stable, but not progressing toward goal\n`;
          } else {
            response += `• On track: No, moving away from target\n`;
          }
        }
        
        // Timeframe predictions
        if (data.weight?.target && Math.abs(change) > 0.1) {
          const targetWeight = typeof data.weight.target === 'object' ? 
            (data.weight.target.value || data.weight.target.normalizedValue) : 
            data.weight.target;
          
          const remaining = Math.abs(currentWeight - targetWeight);
          const currentRate = Math.abs(change) / (dataPoints / 7); // per week
          
          if (currentRate > 0) {
            const weeksToGoal = Math.round(remaining / currentRate);
            response += `\n**🎯 Projection:**\n`;
            response += `At your current rate, you'll reach your goal in approximately ${weeksToGoal} weeks.\n`;
          }
        }
        
      } else {
        // No trend data available - provide current status
        response += `I don't have enough historical data points to show a complete trend yet.\n\n`;
        response += `**Current Status:**\n`;
        response += `• Weight: ${data.weight?.current || 'Not recorded'} kg\n`;
        
        if (data.bmi) {
          response += `• BMI: ${data.bmi.value} (${data.bmi.category})\n`;
        }
        
        response += `\n💡 **Tip:** Regular tracking helps identify patterns. Try to record your weight at the same time each week for the most accurate trends.\n`;
      }
      
      return {
        response,
        functionCalls: [{
          name: 'get_health_metrics',
          parameters: { metric_type: 'all', time_period: timePeriod },
          result: metricsResult
        }]
      };
    }
    
    // Handle specific weight change queries (existing code)
    if (isWeightChange) {
      response += `${userName}, let me check your weight changes:\n\n`;
      
      if (data.trend) {
        const change = data.trend.change;
        const startWeight = data.trend.startValue;
        const currentWeight = data.trend.endValue || data.weight?.current;
        
        response += `**📊 Weight Summary:**\n`;
        response += `• Start of period: ${startWeight} kg\n`;
        response += `• Current weight: ${currentWeight} kg\n`;
        
        if (change < 0) {
          response += `• **You've lost ${Math.abs(change).toFixed(1)} kg!** 🎉\n\n`;
          response += `That's excellent progress! A healthy weight loss rate is 0.5-1 kg per week.`;
        } else if (change > 0) {
          response += `• **You've gained ${change.toFixed(1)} kg**\n\n`;
          
          // Context-aware response based on goals
          if (data.goals?.primary === 'muscle_gain') {
            response += `This could be positive if you're building muscle! Make sure you're combining this with strength training.`;
          } else if (data.goals?.primary === 'weight_loss') {
            response += `This isn't aligned with your weight loss goal. Let's review your nutrition and activity levels.`;
          } else {
            response += `Weight fluctuations are normal. Focus on overall trends rather than daily changes.`;
          }
        } else {
          response += `• **Your weight has remained stable** (no change)\n\n`;
          response += `Maintaining a stable weight shows good consistency!`;
        }
        
        // Add progress towards goal if applicable
        if (data.weight?.target && data.weight?.progressPercentage !== undefined) {
          response += `\n\n**Progress to Goal:** ${data.weight.progressPercentage}% complete`;
          const remaining = Math.abs(currentWeight - data.weight.target);
          response += `\n• ${remaining.toFixed(1)} kg to go!`;
        }
        
      } else {
        response += `I don't have enough historical data to show changes yet.\n\n`;
        response += `**Current Weight:** ${data.weight?.current || 'Not recorded'} kg\n`;
      }
      
      return {
        response,
        functionCalls: [{
          name: 'get_health_metrics',
          parameters: { metric_type: 'all', time_period: timePeriod },
          result: metricsResult
        }]
      };
    }
    
    // Handle wellness score improvement queries
    if (isWellnessImprovement) {
      response += `${userName}, let's improve your wellness score!\n\n`;
      
      if (data.wellnessScore) {
        response += `**🌟 Current Wellness Score: ${data.wellnessScore.overall}/100**\n\n`;
        
        response += `**Breakdown:**\n`;
        const components = data.wellnessScore.components;
        const sortedComponents = Object.entries(components || {})
          .sort((a, b) => a[1] - b[1]); // Sort by score, lowest first
        
        sortedComponents.forEach(([component, score]) => {
          const emoji = score >= 20 ? '✅' : score >= 15 ? '⚠️' : '❌';
          response += `${emoji} ${component.charAt(0).toUpperCase() + component.slice(1)}: ${score}/25\n`;
        });
        
        // Focus on lowest scoring areas
        const lowestArea = sortedComponents[0];
        response += `\n**🎯 Focus Area:** ${lowestArea[0].charAt(0).toUpperCase() + lowestArea[0].slice(1)}\n`;
        
        // Provide specific recommendations
        response += `\n**💡 Recommendations to improve:**\n`;
        
        switch(lowestArea[0]) {
          case 'bmi':
            response += `• Work on reaching a healthy BMI (18.5-24.9)\n`;
            response += `• Focus on balanced nutrition and regular exercise\n`;
            break;
          case 'activity':
            response += `• Increase weekly exercise to 150+ minutes\n`;
            response += `• Add strength training 2-3 times per week\n`;
            response += `• Take 10,000 steps daily\n`;
            break;
          case 'nutrition':
            response += `• Track your meals consistently\n`;
            response += `• Balance macronutrients (protein, carbs, fats)\n`;
            response += `• Increase vegetable intake to 5 servings daily\n`;
            break;
          case 'habits':
            response += `• Improve sleep quality (7-9 hours nightly)\n`;
            response += `• Manage stress with meditation or yoga\n`;
            response += `• Stay hydrated (8+ glasses of water daily)\n`;
            break;
        }
        
        response += `\n**Potential improvement:** +${25 - lowestArea[1]} points by focusing on ${lowestArea[0]}!`;
      }
      
      return {
        response,
        functionCalls: [{
          name: 'get_health_metrics',
          parameters: { metric_type: 'all', time_period: 'current' },
          result: metricsResult
        }]
      };
    }
    
    // Default: Show current health metrics
    response += `Hi ${userName}! Here's your health metrics overview:\n\n`;
    
    // BMI
    if (data.bmi) {
      response += `**📏 BMI: ${data.bmi.value}** (${data.bmi.category})\n`;
      response += `• Normal range: 18.5 - 24.9\n`;
      
      if (data.bmi.value >= 18.5 && data.bmi.value < 25) {
        response += `• Great job maintaining a healthy BMI! 🎉\n`;
      }
    }
    
    // Weight
    if (data.weight) {
      response += `\n**⚖️ Weight Status:**\n`;
      response += `• Current: ${data.weight.current} kg\n`;
      
      if (data.weight.target) {
        const targetWeight = typeof data.weight.target === 'object' ? 
          (data.weight.target.value || data.weight.target.normalizedValue) : 
          data.weight.target;
        response += `• Target: ${targetWeight} kg\n`;
        
        if (data.weight.progressPercentage) {
          response += `• Progress: ${data.weight.progressPercentage}% complete\n`;
        }
      }
    }
    
    // Wellness Score
    if (data.wellnessScore) {
      response += `\n**🌟 Wellness Score: ${data.wellnessScore.overall}/100**\n`;
      
      // Find strongest and weakest areas
      const components = Object.entries(data.wellnessScore.components || {});
      if (components.length > 0) {
        const strongest = components.reduce((a, b) => a[1] > b[1] ? a : b);
        const weakest = components.reduce((a, b) => a[1] < b[1] ? a : b);
        
        response += `• Strongest area: ${strongest[0]} (${strongest[1]}/25)\n`;
        response += `• Area to improve: ${weakest[0]} (${weakest[1]}/25)\n`;
      }
      
      // Overall assessment
      if (data.wellnessScore.overall >= 80) {
        response += `\n🏆 Excellent wellness score! You're doing fantastic!`;
      } else if (data.wellnessScore.overall >= 60) {
        response += `\n👍 Good wellness score! Keep up the great work!`;
      } else {
        response += `\n💪 Room for improvement - let's work on boosting your score!`;
      }
    }
    
    return {
      response,
      functionCalls: [{
        name: 'get_health_metrics',
        parameters: { metric_type: 'all', time_period: timePeriod },
        result: metricsResult
      }]
    };
    
  } catch (error) {
    console.error('Health metrics handler error:', error);
    return {
      response: "I'm having trouble accessing your health metrics right now. Please try again in a moment.",
      functionCalls: []
    };
  }
}

  /**
   * 2. PROGRESS HANDLER
   * Handles: Goal progress, achievements, milestones
   * Interprets: Progress rate, time estimates, motivation
   */
  static async handleProgress(userId, query, context) {
    try {
      const progressResult = await executeFunction('get_progress_summary', userId, {
        goal_type: 'all',
        include_recommendations: true
      });
      
      if (!progressResult.data) {
        return {
          response: "I don't have any progress data to share yet. Once you set up your health profile and goals, I'll be able to track your journey and celebrate your achievements!",
          functionCalls: []
        };
      }
      
      const data = progressResult.data;
      const userName = context.userProfile?.name || 'there';
      let response = `${userName}, here's your progress update:\n\n`;
      
      // Weight progress with motivation
      if (data.weightProgress) {
        const wp = data.weightProgress;
        response += `**🎯 Weight Goal Progress:**\n`;
        response += `• Started at: ${wp.initial}\n`;
        response += `• Currently: ${wp.current}\n`;
        response += `• Target: ${wp.target}\n`;
        response += `• Total change: ${wp.change}\n`;
        response += `• Completion: ${wp.progressPercentage}%\n\n`;
        
        // Progress bar visualization
        const progressBar = this.createProgressBar(wp.progressPercentage);
        response += progressBar + '\n\n';
        
        // Motivational message based on progress
        if (wp.progressPercentage >= 90) {
          response += `🏁 **You're in the final stretch!** Just a little more to reach your goal!\n`;
        } else if (wp.progressPercentage >= 75) {
          response += `🔥 **Incredible progress!** You're 3/4 of the way there!\n`;
        } else if (wp.progressPercentage >= 50) {
          response += `⭐ **Halfway there!** You've come so far already!\n`;
        } else if (wp.progressPercentage >= 25) {
          response += `💪 **Great start!** You're building momentum!\n`;
        } else if (wp.progressPercentage > 0) {
          response += `🌱 **Journey begun!** Every step forward counts!\n`;
        } else {
          response += `🚀 **Ready to start!** Your journey to better health begins now!\n`;
        }
        
        // Time estimate (if progress is positive)
        if (wp.progressPercentage > 10) {
          const estimatedWeeks = this.estimateTimeToGoal(wp);
          if (estimatedWeeks > 0) {
            response += `\n📅 At your current rate, you could reach your goal in about ${estimatedWeeks} weeks.\n`;
          }
        }
      }
      
      // Fitness achievements
      if (data.fitnessProgress) {
        response += `\n**🏃 Fitness Status:**\n`;
        response += `• Activity Level: ${data.fitnessProgress.currentActivityLevel}\n`;
        response += `• Weekly Exercise: ${data.fitnessProgress.weeklyExerciseFrequency} sessions\n`;
        
        if (data.fitnessProgress.achievements.length > 0) {
          response += `\n**🏆 Achievements:**\n`;
          data.fitnessProgress.achievements.forEach(achievement => {
            response += `• ${achievement}\n`;
          });
        }
      }
      
      // Personalized recommendations
      if (data.recommendations && data.recommendations.length > 0) {
        response += `\n**💡 Personalized Recommendations:**\n`;
        data.recommendations.forEach((rec, index) => {
          response += `${index + 1}. ${rec}\n`;
        });
      }
      
      // Add encouragement
      response += `\n*Remember: Progress isn't always linear. What matters is that you keep moving forward!* 💚`;
      
      return {
        response,
        functionCalls: [{
          name: 'get_progress_summary',
          parameters: { goal_type: 'all', include_recommendations: true },
          result: progressResult
        }]
      };
      
    } catch (error) {
      console.error('Progress handler error:', error);
      return {
        response: "I'm having trouble calculating your progress right now. Please try again.",
        functionCalls: []
      };
    }
  }

  /**
   * 3. MEAL PLAN HANDLER
   * Handles: Daily/weekly meal plans, meal suggestions
   * Interprets: Nutritional balance, variety, preferences
   */
  static async handleMealPlans(userId, query, context) {
  try {
    // Check if asking about preparation/cooking instructions
    const lowerQuery = query.toLowerCase();
    const isPrepareQuery = lowerQuery.includes('prepare') || 
                          lowerQuery.includes('cook') || 
                          lowerQuery.includes('make') ||
                          lowerQuery.includes('recipe for');
    
    // Determine which meal they're asking about
    let mealType = null;
    if (lowerQuery.includes('breakfast')) mealType = 'breakfast';
    else if (lowerQuery.includes('lunch')) mealType = 'lunch';
    else if (lowerQuery.includes('dinner') || lowerQuery.includes('tonight')) mealType = 'dinner';
    else if (lowerQuery.includes('snack')) mealType = 'snack';
    
    // Get today's meal plan
    const mealPlanResult = await executeFunction('get_nutrition_data', userId, {
      type: 'meal_plan',
      timeframe: 'today'
    });
    
    if (!mealPlanResult.data || !mealPlanResult.data.data) {
      return {
        response: "You don't have an active meal plan yet. Would you like me to help you create one? I can design a personalized plan based on your dietary preferences and goals.",
        functionCalls: []
      };
    }
    
    const todayPlan = mealPlanResult.data.data;
    const userName = context.userProfile?.name || 'there';
    
    // Handle preparation/recipe instructions
    if (isPrepareQuery && mealType) {
      const meal = todayPlan.meals?.find(m => 
        m.type.toLowerCase() === mealType
      );
      
      if (meal && meal.customRecipe && meal.customRecipe.instructions) {
        let response = `${userName}, here's how to prepare ${meal.name} for ${mealType}:\n\n`;
        response += `**📍 ${meal.name}**\n\n`;
        
        // Add ingredients if available
        if (meal.customRecipe.ingredients && meal.customRecipe.ingredients.length > 0) {
          response += `**🛒 Ingredients:**\n`;
          meal.customRecipe.ingredients.forEach(ing => {
            // Handle both object and string formats
            if (typeof ing === 'object' && ing.name) {
              response += `• ${ing.quantity || ''} ${ing.unit || ''} ${ing.name}`.trim() + '\n';
            } else if (typeof ing === 'string') {
              response += `• ${ing}\n`;
            }
          });
          response += '\n';
        }
        
        // Add instructions
        response += `**👨‍🍳 Instructions:**\n`;
        if (Array.isArray(meal.customRecipe.instructions)) {
          meal.customRecipe.instructions.forEach((step, index) => {
            response += `${index + 1}. ${step}\n`;
          });
        } else if (typeof meal.customRecipe.instructions === 'string') {
          // Handle single string instructions
          response += `${meal.customRecipe.instructions}\n`;
        }
        
        // Add prep time if available
        if (meal.prepTime) {
          response += `\n⏱️ **Prep time:** ${meal.prepTime} minutes\n`;
        }
        
        // Add nutrition info
        if (meal.nutrition) {
          response += `\n📊 **Nutrition:** ${meal.nutrition.calories || 0} cal | `;
          response += `${meal.nutrition.protein || 0}g protein | `;
          response += `${meal.nutrition.carbs || 0}g carbs | `;
          response += `${meal.nutrition.fat || 0}g fat\n`;
        }
        
        return {
          response,
          functionCalls: [{
            name: 'get_nutrition_data',
            parameters: { type: 'meal_plan', timeframe: 'today' },
            result: mealPlanResult
          }]
        };
      }
    }
    
    // Regular meal plan display (daily or weekly)
    const isWeekly = lowerQuery.includes('week');
    const timeframe = isWeekly ? 'week' : 'today';
    
    // If weekly requested but we only have today's data, fetch weekly
    if (isWeekly && !Array.isArray(mealPlanResult.data.data)) {
      const weeklyResult = await executeFunction('get_nutrition_data', userId, {
        type: 'meal_plan',
        timeframe: 'week'
      });
      if (weeklyResult.data) {
        mealPlanResult.data = weeklyResult.data;
      }
    }
    
    let response = '';
    const data = mealPlanResult.data;
    
    if (timeframe === 'today') {
      response += `${userName}, here's your meal plan for today:\n\n`;
      
      if (todayPlan && todayPlan.meals) {
        const mealEmojis = {
          breakfast: '🌅',
          lunch: '☀️',
          dinner: '🌙',
          snack: '🍎'
        };
        
        todayPlan.meals.forEach(meal => {
          const emoji = mealEmojis[meal.type.toLowerCase()] || '🍽️';
          response += `**${emoji} ${meal.type}:**\n`;
          response += `🍴 ${meal.name}\n`;
          
          if (meal.description) {
            response += `${meal.description}\n`;
          }
          
          if (meal.ingredients && meal.ingredients.length > 0) {
            response += `Ingredients: ${meal.ingredients.slice(0, 5).join(', ')}\n`;
          }
          
          // FIX 1: Use meal.nutrition?.calories instead of meal.calories
          if (meal.nutrition) {
            response += `📊 ${meal.nutrition.calories || 0} cal | `;
            response += `${meal.nutrition.protein || 0}g protein | `;
            response += `${meal.nutrition.carbs || 0}g carbs | `;
            response += `${meal.nutrition.fat || 0}g fat\n`;
          }
          
          if (meal.prepTime) {
            response += `⏱️ Prep time: ${meal.prepTime} minutes\n`;
          }
          
          response += '\n';
        });
      }
      
      // Daily nutrition summary
      if (data.nutritionSummary) {
        response += `**📈 Daily Nutrition Summary:**\n`;
        response += `• Total Calories: ${data.nutritionSummary.calories}\n`;
        
        // FIX 3: Don't add 'g' as it's already in the data
        response += `• Protein: ${data.nutritionSummary.protein}\n`;
        response += `• Carbs: ${data.nutritionSummary.carbs}\n`;
        response += `• Fat: ${data.nutritionSummary.fat}\n`;
        
        // Compare to targets if available
        const prefsResult = await executeFunction('get_nutrition_data', userId, {
          type: 'preferences'
        });
        
        if (prefsResult.data && prefsResult.data.data) {
          const target = prefsResult.data.data.calorieTarget || 2000;
          const diff = data.nutritionSummary.calories - target;
          
          if (Math.abs(diff) < 100) {
            response += `\n✅ Perfect! Right on track with your ${target} calorie target!\n`;
          } else if (diff > 0) {
            response += `\n⚠️ ${diff} calories over your ${target} target. Consider lighter portions.\n`;
          } else {
            response += `\n📝 ${Math.abs(diff)} calories under your ${target} target. You could add a healthy snack.\n`;
          }
        }
      }
      
    } else {
      // Weekly view
      response += `${userName}, here's your meal plan for this week:\n\n`;
      
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      const plans = Array.isArray(data.data) ? data.data : [data.data];
      
      plans.forEach((dayPlan, index) => {
        if (dayPlan && index < days.length) {
          response += `**📅 ${days[index]}:**\n`;
          
          dayPlan.meals?.forEach(meal => {
            response += `• ${meal.type}: ${meal.name}`;
            // FIX 1: Use meal.nutrition?.calories instead of meal.calories
            if (meal.nutrition?.calories) {
              response += ` (${meal.nutrition.calories} cal)`;
            }
            response += '\n';
          });
          response += '\n';
        }
      });
      
      // Add variety analysis
      response += this.analyzeMealVariety(data.data);
    }
    
    // Add helpful tip about preparation
    if (!isPrepareQuery) {
      response += `\n💡 **Tip:** Ask me "How do I prepare [meal name]?" for detailed cooking instructions!`;
    }
    
    return {
      response,
      functionCalls: [{
        name: 'get_nutrition_data',
        parameters: { type: 'meal_plan', timeframe },
        result: mealPlanResult
      }]
    };
    
  } catch (error) {
    console.error('Meal plan handler error:', error);
    return {
      response: "I'm having trouble accessing your meal plan. Please try again.",
      functionCalls: []
    };
  }
}

  /**
   * 4. RECIPE HANDLER
   * Handles: Recipe search, recommendations, customization
   * Interprets: Dietary fit, preparation complexity, nutritional value
   */
  static async handleRecipes(userId, query, context) {
    try {
      // Get user preferences for context
      const prefsResult = await executeFunction('get_nutrition_data', userId, {
        type: 'preferences'
      });
      
      const preferences = prefsResult.data?.data || {};
      
      // Get recipe suggestions
      const recipeResult = await executeFunction('get_nutrition_data', userId, {
        type: 'recipe',
        category: this.extractRecipeCategory(query)
      });
      
      if (!recipeResult.data || recipeResult.data.length === 0) {
        return {
          response: "I couldn't find any recipes matching your criteria. Try searching in the Recipe Search page for more options!",
          functionCalls: []
        };
      }
      
      const recipes = Array.isArray(recipeResult.data) ? recipeResult.data : [recipeResult.data];
      const userName = context.userProfile?.name || 'there';
      
      let response = `${userName}, here are some recipe suggestions for you:\n\n`;
      
      // Display up to 3 recipes
      const recipesToShow = recipes.slice(0, 3);
      
      recipesToShow.forEach((recipe, index) => {
        response += `**${index + 1}. ${recipe.name}** ⏱️ ${recipe.prepTime || '30'} mins\n`;
        
        // Check dietary compatibility
        const suitability = this.checkRecipeSuitability(recipe, preferences);
        if (!suitability.issuitable) {
          response += `⚠️ *Note: ${suitability.warning}*\n`;
        }
        
        // Nutritional highlights
        response += `• Calories: ${recipe.calories || 'N/A'} kcal per serving\n`;
        
        if (recipe.macros) {
          response += `• Macros: ${recipe.macros.protein}g protein, ${recipe.macros.carbs}g carbs, ${recipe.macros.fat}g fat\n`;
        }
        
        // Key ingredients
        if (recipe.ingredients && recipe.ingredients.length > 0) {
          response += `• Key ingredients: ${recipe.ingredients.slice(0, 5).join(', ')}\n`;
        }
        
        // Dietary tags
        if (recipe.tags && recipe.tags.length > 0) {
          response += `• Tags: ${recipe.tags.join(', ')}\n`;
        }
        
        // Quick description
        if (recipe.description) {
          response += `• ${recipe.description.substring(0, 100)}...\n`;
        }
        
        response += '\n';
      });
      
      // Personalized recommendation based on preferences
      if (preferences.dietaryRestrictions && preferences.dietaryRestrictions.length > 0) {
        response += `**🎯 Filtered for your dietary preferences:**\n`;
        response += `• ${preferences.dietaryRestrictions.join(', ')}\n\n`;
      }
      
      response += `💡 *Pro tip: You can search for specific recipes or create custom ones in the Recipe Search page!*`;
      
      return {
        response,
        functionCalls: [{
          name: 'get_nutrition_data',
          parameters: { type: 'recipe' },
          result: recipeResult
        }]
      };
      
    } catch (error) {
      console.error('Recipe handler error:', error);
      return {
        response: "I'm having trouble with recipe suggestions right now. Please try again.",
        functionCalls: []
      };
    }
  }

  /**
   * 5. NUTRITION ANALYSIS HANDLER
   * Handles: Macro tracking, calorie analysis, nutritional balance
   * Interprets: Deficiencies, excesses, balance recommendations
   */
  static async handleNutritionAnalysis(userId, query, context) {
  try {
    const lowerQuery = query.toLowerCase();
    
    // Determine timeframe - check for weekly analysis
    const isWeekly = lowerQuery.includes('week') || lowerQuery.includes('weekly');
    const timeframe = isWeekly ? 'week' : 'today';
    
    // Get meal plan data for analysis
    const mealPlanResult = await executeFunction('get_nutrition_data', userId, {
      type: 'meal_plan',
      timeframe: timeframe
    });
    
    // Get user's nutritional targets
    const prefsResult = await executeFunction('get_nutrition_data', userId, {
      type: 'preferences'
    });
    
    if (!mealPlanResult.data) {
      return {
        response: "I need an active meal plan to analyze your nutrition. Would you like to create one?",
        functionCalls: []
      };
    }
    
    const preferences = prefsResult.data?.data || {};
    const userName = context.userProfile?.name || 'there';
    
    // Check if specifically asking about protein
    const isProteinQuery = lowerQuery.includes('protein');
    
    if (isWeekly) {
      // Weekly analysis
      return this.handleWeeklyNutritionAnalysis(
        mealPlanResult.data, 
        preferences, 
        userName, 
        isProteinQuery
      );
    }
    
    // Daily analysis
    const nutritionSummary = mealPlanResult.data.nutritionSummary;
    
    // Parse nutrition values - handle both "85g" and 85 formats
    const parseNutritionValue = (value) => {
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        // Remove 'g' or any other units and parse
        return parseInt(value.replace(/[^0-9]/g, '')) || 0;
      }
      return 0;
    };
    
    const calories = nutritionSummary?.calories || 0;
    const protein = parseNutritionValue(nutritionSummary?.protein);
    const carbs = parseNutritionValue(nutritionSummary?.carbs);
    const fat = parseNutritionValue(nutritionSummary?.fat);
    
    // If asking specifically about protein
    if (isProteinQuery) {
      let response = `${userName}, here's your protein intake analysis:\n\n`;
      
      response += `**💪 Protein Intake Today:**\n`;
      response += `• Current: ${protein}g\n`;
      
      // Calculate protein targets based on body weight and goals
      const bodyWeight = context.userProfile?.weight || 70;
      const minProtein = Math.round(bodyWeight * 0.8); // Minimum for maintenance
      const optimalProtein = Math.round(bodyWeight * 1.6); // Optimal for active individuals
      const maxProtein = Math.round(bodyWeight * 2.2); // Maximum for muscle building
      
      response += `• Minimum needed: ${minProtein}g (0.8g/kg body weight)\n`;
      response += `• Optimal range: ${optimalProtein}-${maxProtein}g\n`;
      
      // Visual progress bar
      const proteinPercent = Math.round((protein / optimalProtein) * 100);
      response += `\n${this.createProgressBar(proteinPercent)}\n\n`;
      
      // Assessment
      if (protein >= optimalProtein) {
        response += `✅ **Excellent!** You're getting plenty of protein!\n`;
      } else if (protein >= minProtein) {
        response += `👍 **Good!** You're meeting minimum requirements.\n`;
        response += `Consider adding ${optimalProtein - protein}g more for optimal intake.\n`;
      } else {
        response += `⚠️ **Low protein intake!** You need at least ${minProtein - protein}g more.\n`;
      }
      
      // Protein sources breakdown if available
      if (mealPlanResult.data.data?.meals) {
        response += `\n**Protein sources today:**\n`;
        mealPlanResult.data.data.meals.forEach(meal => {
          if (meal.nutrition?.protein) {
            const mealProtein = parseNutritionValue(meal.nutrition.protein);
            response += `• ${meal.type}: ${meal.name} (${mealProtein}g)\n`;
          }
        });
      }
      
      // Recommendations
      response += `\n**💡 Protein Tips:**\n`;
      if (protein < optimalProtein) {
        response += `• Add a protein shake or Greek yogurt as a snack\n`;
        response += `• Include lean meats, fish, eggs, or legumes in each meal\n`;
        response += `• Consider protein-rich breakfast options\n`;
      } else {
        response += `• Continue spreading protein throughout the day\n`;
        response += `• Great job maintaining adequate protein intake!\n`;
      }
      
      return {
        response,
        functionCalls: [{
          name: 'get_nutrition_data',
          parameters: { type: 'meal_plan', timeframe: 'today' },
          result: mealPlanResult
        }]
      };
    }
    
    // Full nutritional analysis
    let response = `${userName}, here's your nutritional analysis:\n\n`;
    
    // Calorie analysis
    response += `**🔥 Calorie Analysis:**\n`;
    const target = preferences.calorieTarget || 2000;
    const calorieDiff = calories - target;
    const caloriePercent = Math.round((calories / target) * 100);
    
    response += `• Consumed: ${calories} kcal\n`;
    response += `• Target: ${target} kcal\n`;
    response += `• ${caloriePercent}% of daily goal\n`;
    
    // Visual representation
    response += `\n${this.createProgressBar(caloriePercent)}\n\n`;
    
    if (Math.abs(calorieDiff) < 100) {
      response += `✅ Excellent! You're right on target!\n`;
    } else if (calorieDiff > 200) {
      response += `⚠️ You're ${calorieDiff} calories over. Consider reducing portion sizes.\n`;
    } else if (calorieDiff < -200) {
      response += `📝 You're ${Math.abs(calorieDiff)} calories under. Make sure you're eating enough!\n`;
    }
    
    // Macro analysis - only show if we have valid data
    if (protein > 0 || carbs > 0 || fat > 0) {
      response += `\n**🥗 Macronutrient Breakdown:**\n`;
      
      // Calculate percentages
      const totalMacroCalories = (protein * 4) + (carbs * 4) + (fat * 9);
      
      if (totalMacroCalories > 0) {
        const proteinPercent = Math.round((protein * 4 / totalMacroCalories) * 100);
        const carbsPercent = Math.round((carbs * 4 / totalMacroCalories) * 100);
        const fatPercent = Math.round((fat * 9 / totalMacroCalories) * 100);
        
        response += `• Protein: ${protein}g (${proteinPercent}%)\n`;
        response += `• Carbs: ${carbs}g (${carbsPercent}%)\n`;
        response += `• Fat: ${fat}g (${fatPercent}%)\n`;
        
        // Macro targets comparison if available
        if (preferences.macroTargets) {
          response += `\n**📊 vs. Your Targets:**\n`;
          const targets = preferences.macroTargets;
          
          if (targets.proteinPercentage) {
            if (Math.abs(proteinPercent - targets.proteinPercentage) > 10) {
              response += `• Protein: ${proteinPercent > targets.proteinPercentage ? 'Higher' : 'Lower'} than target (${targets.proteinPercentage}%)\n`;
            } else {
              response += `• Protein: ✓ On target!\n`;
            }
          }
          
          if (targets.carbsPercentage) {
            if (Math.abs(carbsPercent - targets.carbsPercentage) > 10) {
              response += `• Carbs: ${carbsPercent > targets.carbsPercentage ? 'Higher' : 'Lower'} than target (${targets.carbsPercentage}%)\n`;
            } else {
              response += `• Carbs: ✓ On target!\n`;
            }
          }
          
          if (targets.fatPercentage) {
            if (Math.abs(fatPercent - targets.fatPercentage) > 10) {
              response += `• Fat: ${fatPercent > targets.fatPercentage ? 'Higher' : 'Lower'} than target (${targets.fatPercentage}%)\n`;
            } else {
              response += `• Fat: ✓ On target!\n`;
            }
          }
        }
      }
    }
    
    // Goal-specific recommendations
    response += `\n**💡 Recommendations:**\n`;
    
    // Protein-specific recommendations
    const bodyWeight = context.userProfile?.weight || 70;
    const minProtein = Math.round(bodyWeight * 0.8);
    
    if (protein < minProtein) {
      response += `1. Increase protein intake (currently ${protein}g, need ${minProtein}g minimum)\n`;
    } else {
      response += `1. Protein intake is adequate (${protein}g) ✓\n`;
    }
    
    // General recommendations
    response += `2. Stay hydrated - aim for 8 glasses of water daily\n`;
    response += `3. Include a variety of colorful vegetables\n`;
    
    // Add balance recommendation
    if (protein > 0 && carbs > 0 && fat > 0) {
      response += `4. Balance each meal with protein, carbs, and healthy fats\n`;
    }
    
    // Hydration reminder
    const waterIntake = Math.round((bodyWeight) * 35);
    response += `\n💧 **Hydration Goal:** ${waterIntake}ml of water today`;
    
    return {
      response,
      functionCalls: [
        {
          name: 'get_nutrition_data',
          parameters: { type: 'meal_plan', timeframe: timeframe },
          result: mealPlanResult
        },
        {
          name: 'get_nutrition_data',
          parameters: { type: 'preferences' },
          result: prefsResult
        }
      ]
    };
    
  } catch (error) {
    console.error('Nutrition analysis handler error:', error);
    return {
      response: "I'm having trouble analyzing your nutrition right now. Please try again.",
      functionCalls: []
    };
  }
}

static handleWeeklyNutritionAnalysis(data, preferences, userName, isProteinQuery) {
  let response = `${userName}, here's your weekly nutrition analysis:\n\n`;
  
  // Parse nutrition values helper
  const parseNutritionValue = (value) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      return parseInt(value.replace(/[^0-9]/g, '')) || 0;
    }
    return 0;
  };
  
  // Calculate weekly totals
  let weeklyTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  let dailyData = [];
  
  if (Array.isArray(data.data)) {
    data.data.forEach((day, index) => {
      if (day.meals) {
        let dayTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
        
        day.meals.forEach(meal => {
          if (meal.nutrition) {
            dayTotals.calories += meal.nutrition.calories || 0;
            dayTotals.protein += parseNutritionValue(meal.nutrition.protein);
            dayTotals.carbs += parseNutritionValue(meal.nutrition.carbs);
            dayTotals.fat += parseNutritionValue(meal.nutrition.fat);
          }
        });
        
        dailyData.push(dayTotals);
        weeklyTotals.calories += dayTotals.calories;
        weeklyTotals.protein += dayTotals.protein;
        weeklyTotals.carbs += dayTotals.carbs;
        weeklyTotals.fat += dayTotals.fat;
      }
    });
  }
  
  const daysTracked = dailyData.length || 1;
  const avgCalories = Math.round(weeklyTotals.calories / daysTracked);
  const avgProtein = Math.round(weeklyTotals.protein / daysTracked);
  const avgCarbs = Math.round(weeklyTotals.carbs / daysTracked);
  const avgFat = Math.round(weeklyTotals.fat / daysTracked);
  
  if (isProteinQuery) {
    response += `**💪 Weekly Protein Intake:**\n`;
    response += `• Total this week: ${weeklyTotals.protein}g\n`;
    response += `• Daily average: ${avgProtein}g\n`;
    response += `• Days tracked: ${daysTracked}\n\n`;
    
    // Daily breakdown
    response += `**Daily Breakdown:**\n`;
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    dailyData.forEach((day, index) => {
      if (index < days.length) {
        response += `• ${days[index]}: ${day.protein}g\n`;
      }
    });
    
    // Assessment
    const bodyWeight = 70; // Default if not available
    const targetProtein = Math.round(bodyWeight * 1.6);
    
    response += `\n**Assessment:**\n`;
    if (avgProtein >= targetProtein) {
      response += `✅ Great job! You're averaging ${avgProtein}g daily, meeting your protein goals!\n`;
    } else {
      response += `📝 You're averaging ${avgProtein}g daily. Consider increasing to ${targetProtein}g for optimal results.\n`;
    }
  } else {
    // Full weekly analysis
    response += `**📊 Weekly Summary:**\n`;
    response += `• Days tracked: ${daysTracked}\n`;
    response += `• Total calories: ${weeklyTotals.calories} kcal\n`;
    response += `• Average daily: ${avgCalories} kcal\n\n`;
    
    response += `**Average Daily Macros:**\n`;
    response += `• Protein: ${avgProtein}g\n`;
    response += `• Carbs: ${avgCarbs}g\n`;
    response += `• Fat: ${avgFat}g\n`;
    
    // Consistency analysis
    response += `\n**Consistency Analysis:**\n`;
    const target = preferences.calorieTarget || 2000;
    let consistentDays = 0;
    
    dailyData.forEach(day => {
      if (Math.abs(day.calories - target) < 200) {
        consistentDays++;
      }
    });
    
    const consistencyPercent = Math.round((consistentDays / daysTracked) * 100);
    response += `• ${consistentDays}/${daysTracked} days within target range\n`;
    response += `• Consistency score: ${consistencyPercent}%\n`;
    
    if (consistencyPercent >= 80) {
      response += `✅ Excellent consistency!\n`;
    } else if (consistencyPercent >= 60) {
      response += `👍 Good consistency, room for improvement\n`;
    } else {
      response += `📝 Try to be more consistent with daily targets\n`;
    }
  }
  
  return {
    response,
    functionCalls: []
  };
}

  /**
   * 6. GENERAL WELLNESS HANDLER
   * Handles: General health advice, lifestyle tips, wellness questions
   * Interprets: Holistic health approach, preventive care
   */
  static async handleGeneralWellness(userId, query, context) {
    try {
      // Extract topic from query
      const topic = this.extractWellnessTopic(query);
      
      const insightsResult = await executeFunction('get_general_insights', userId, {
        topic: topic
      });
      
      // Get current metrics for context
      const metricsResult = await executeFunction('get_health_metrics', userId, {
        metric_type: 'all',
        time_period: 'current'
      });
      
      const userName = context.userProfile?.name || 'there';
      const hasProfile = metricsResult.data !== null;
      
      let response = `${userName}, `;
      
      // Topic-specific wellness advice
      switch(topic) {
        case 'sleep':
          response += `here's guidance on improving your sleep:\n\n`;
          response += `**😴 Sleep Optimization Tips:**\n`;
          response += `• **Consistency:** Go to bed and wake up at the same time daily\n`;
          response += `• **Environment:** Keep bedroom cool (60-67°F), dark, and quiet\n`;
          response += `• **Wind-down routine:** No screens 1 hour before bed\n`;
          response += `• **Avoid:** Caffeine after 2 PM, large meals 3 hours before bed\n`;
          response += `• **Try:** Meditation, reading, or gentle stretching before sleep\n`;
          
          if (hasProfile && metricsResult.data.lifestyleIndicators?.sleepHours) {
            const sleepHours = metricsResult.data.lifestyleIndicators.sleepHours;
            response += `\n**Your Sleep:** ${sleepHours} hours/night\n`;
            if (sleepHours < 7) {
              response += `⚠️ You're getting less than the recommended 7-9 hours. Prioritize sleep for better health.\n`;
            } else if (sleepHours > 9) {
              response += `You're sleeping more than average. If you still feel tired, consider sleep quality over quantity.\n`;
            } else {
              response += `✅ Great! You're within the healthy 7-9 hour range.\n`;
            }
          }
          break;
          
        case 'stress':
          response += `let's address stress management:\n\n`;
          response += `**🧘 Stress Reduction Strategies:**\n`;
          response += `• **Breathing:** Try 4-7-8 breathing (inhale 4, hold 7, exhale 8)\n`;
          response += `• **Movement:** Even 10 minutes of walking reduces stress hormones\n`;
          response += `• **Mindfulness:** 5-minute daily meditation can lower cortisol\n`;
          response += `• **Social:** Connect with friends/family for emotional support\n`;
          response += `• **Boundaries:** Learn to say no to overwhelming commitments\n`;
          
          if (hasProfile && metricsResult.data.lifestyleIndicators?.stressLevel) {
            const stress = metricsResult.data.lifestyleIndicators.stressLevel;
            response += `\n**Your Stress Level:** ${stress}/10\n`;
            if (stress > 7) {
              response += `⚠️ High stress detected. Consider professional support if it persists.\n`;
            } else if (stress > 4) {
              response += `Moderate stress. Regular relaxation practices can help.\n`;
            } else {
              response += `✅ Low stress levels - keep up your current coping strategies!\n`;
            }
          }
          break;
          
        case 'hydration':
          response += `let's talk about proper hydration:\n\n`;
          response += `**💧 Hydration Guidelines:**\n`;
          response += `• **Daily target:** 8-10 glasses (2-2.5 liters) of water\n`;
          response += `• **Timing:** Start with water upon waking\n`;
          response += `• **Exercise:** Add 500ml for every hour of exercise\n`;
          response += `• **Signs of dehydration:** Dark urine, headaches, fatigue\n`;
          response += `• **Pro tip:** Keep a water bottle visible as a reminder\n`;
          break;
          
        case 'exercise':
          response += `here's your exercise guidance:\n\n`;
          response += `**🏃 Exercise Recommendations:**\n`;
          response += `• **Cardio:** 150 min moderate or 75 min vigorous weekly\n`;
          response += `• **Strength:** 2-3 sessions per week, all major muscle groups\n`;
          response += `• **Flexibility:** Daily stretching, yoga 2-3x weekly\n`;
          response += `• **Start small:** 10-minute walks if you're inactive\n`;
          response += `• **Progress:** Increase duration/intensity by 10% weekly\n`;
          
          if (hasProfile && metricsResult.data.activityLevel) {
            const activity = metricsResult.data.activityLevel;
            response += `\n**Your Activity Level:** ${activity}\n`;
            if (activity === 'sedentary') {
              response += `Start with short walks and gradually build up activity.\n`;
            } else if (activity === 'lightly_active') {
              response += `Good foundation! Try adding one more workout weekly.\n`;
            } else {
              response += `✅ Keep up the great activity level!\n`;
            }
          }
          break;
          
        default:
          response += `here are general wellness tips:\n\n`;
          response += `**🌟 Holistic Wellness Approach:**\n`;
          response += `• **Nutrition:** Eat whole foods, limit processed items\n`;
          response += `• **Movement:** Find activities you enjoy\n`;
          response += `• **Sleep:** Prioritize 7-9 hours nightly\n`;
          response += `• **Stress:** Practice daily relaxation\n`;
          response += `• **Connection:** Nurture relationships\n`;
          response += `• **Purpose:** Engage in meaningful activities\n`;
          response += `• **Prevention:** Regular health check-ups\n`;
      }
      
      // Add actionable next steps
      response += `\n**📋 Your Action Items:**\n`;
      switch(topic) {
        case 'sleep':
          response += `1. Set a consistent bedtime tonight\n`;
          response += `2. Remove electronics from bedroom\n`;
          response += `3. Try a relaxation app before bed\n`;
          break;
        case 'stress':
          response += `1. Take 5 deep breaths right now\n`;
          response += `2. Schedule 10 minutes of "me time" today\n`;
          response += `3. Practice saying "no" to one commitment\n`;
          break;
        case 'hydration':
          response += `1. Drink a glass of water right now\n`;
          response += `2. Set hourly water reminders\n`;
          response += `3. Keep water bottle visible\n`;
          break;
        default:
          response += `1. Choose one small habit to start today\n`;
          response += `2. Track your progress daily\n`;
          response += `3. Celebrate small wins\n`;
      }
      
      // Motivational closer
      response += `\n💚 Remember: Small steps lead to big changes. You've got this!`;
      
      return {
        response,
        functionCalls: [
          {
            name: 'get_general_insights',
            parameters: { topic },
            result: insightsResult
          },
          {
            name: 'get_health_metrics',
            parameters: { metric_type: 'all', time_period: 'current' },
            result: metricsResult
          }
        ]
      };
      
    } catch (error) {
      console.error('General wellness handler error:', error);
      return {
        response: "I'm having trouble providing wellness insights right now. Please try again.",
        functionCalls: []
      };
    }
  }

  // Helper methods
  static createProgressBar(percentage) {
    const filled = Math.round(percentage / 10);
    const empty = 10 - filled;
    return '█'.repeat(filled) + '░'.repeat(empty) + ` ${percentage}%`;
  }
  
  static estimateTimeToGoal(weightProgress) {
    // Simple estimation based on healthy weight loss rate (0.5-1kg per week)
    const remaining = Math.abs(parseFloat(weightProgress.target) - parseFloat(weightProgress.current));
    const weeksEstimate = Math.round(remaining / 0.75); // Assume 0.75kg per week average
    return weeksEstimate;
  }
  
  static analyzeMealVariety(mealData) {
    // Analyze variety in meal plan
    let analysis = '\n**🎨 Variety Analysis:**\n';
    
    if (Array.isArray(mealData)) {
      const allMeals = mealData.flatMap(day => day.meals || []);
      const uniqueMeals = new Set(allMeals.map(m => m.name));
      
      if (uniqueMeals.size / allMeals.length > 0.7) {
        analysis += '✅ Great variety in your meal plan!\n';
      } else {
        analysis += '💡 Consider adding more variety to prevent boredom.\n';
      }
    }
    
    return analysis;
  }
  
  static checkRecipeSuitability(recipe, preferences) {
    // Check if recipe suits user's dietary preferences
    const result = { issuitable: true, warning: null };
    
    if (preferences.allergies && preferences.allergies.length > 0) {
      // Check for allergens (simplified - would need ingredient parsing in production)
      const recipeText = JSON.stringify(recipe).toLowerCase();
      
      for (const allergy of preferences.allergies) {
        if (recipeText.includes(allergy.toLowerCase())) {
          result.issuitable = false;
          result.warning = `May contain ${allergy}`;
          return result;
        }
      }
    }
    
    return result;
  }
  
  static extractRecipeCategory(query) {
    const lower = query.toLowerCase();
    if (lower.includes('breakfast')) return 'breakfast';
    if (lower.includes('lunch')) return 'lunch';
    if (lower.includes('dinner')) return 'dinner';
    if (lower.includes('snack')) return 'snack';
    if (lower.includes('dessert')) return 'dessert';
    return 'all';
  }
  
  static extractWellnessTopic(query) {
    const lower = query.toLowerCase();
    if (lower.includes('sleep')) return 'sleep';
    if (lower.includes('stress')) return 'stress';
    if (lower.includes('water') || lower.includes('hydrat')) return 'hydration';
    if (lower.includes('exercise') || lower.includes('workout')) return 'exercise';
    return 'general';
  }
}

module.exports = ConversationHandlers;