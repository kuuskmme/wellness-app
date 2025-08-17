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
   * Handles: BMI, weight, wellness score queries
   * Interprets: Trends, comparisons to goals, health categories
   */
  static async handleHealthMetrics(userId, query, context) {
    try {
      const lowerQuery = query.toLowerCase();
      
      // Determine what specific metric is being asked about
      const isWeightChange = lowerQuery.includes('weight') && (
        lowerQuery.includes('change') || 
        lowerQuery.includes('this month') || 
        lowerQuery.includes('lost') ||
        lowerQuery.includes('gained')
      );
      
      const isWellnessScore = lowerQuery.includes('wellness') && (
        lowerQuery.includes('score') || 
        lowerQuery.includes('improve') ||
        lowerQuery.includes('focus')
      );
      
      // Get comprehensive health data
      const metricsResult = await executeFunction('get_health_metrics', userId, {
        metric_type: 'all',
        time_period: isWeightChange ? 'monthly' : 'current'
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
      
      // Handle specific weight change queries
      if (isWeightChange) {
        response += `Hi ${userName}! Let me check your weight changes this month:\n\n`;
        
        if (data.trend) {
          const change = data.trend.change;
          const startWeight = data.trend.startValue;
          const currentWeight = data.trend.endValue || data.weight?.current;
          
          response += `**📊 Monthly Weight Summary:**\n`;
          response += `• Start of month: ${startWeight} kg\n`;
          response += `• Current weight: ${currentWeight} kg\n`;
          
          if (change < 0) {
            response += `• **You've lost ${Math.abs(change).toFixed(1)} kg this month!** 🎉\n\n`;
            response += `That's excellent progress! A healthy weight loss rate is 0.5-1 kg per week, so you're doing great.`;
          } else if (change > 0) {
            response += `• **You've gained ${change.toFixed(1)} kg this month**\n\n`;
            
            // Context-aware response based on goals
            if (data.goals?.primary === 'muscle_gain') {
              response += `This could be positive if you're building muscle! Make sure you're combining this with strength training.`;
            } else if (data.goals?.primary === 'weight_loss') {
              response += `This isn't aligned with your weight loss goal. Let's review your nutrition and exercise routine.`;
            } else {
              response += `Weight fluctuation is normal. Focus on how you feel and your overall wellness.`;
            }
          } else {
            response += `• **Your weight has remained stable this month**\n\n`;
            response += `Maintaining weight shows good consistency! Focus on other health markers too.`;
          }
        } else {
          response += `I don't have enough historical data to show weight changes. Keep logging your weight regularly for trend analysis!`;
        }
        
        return {
          response,
          functionCalls: [{
            name: 'get_health_metrics',
            parameters: { metric_type: 'all', time_period: 'monthly' },
            result: metricsResult
          }]
        };
      }
      
      // Handle wellness score improvement queries
      if (isWellnessScore) {
        response += `Hi ${userName}! Let's look at your wellness score and how to improve it:\n\n`;
        
        if (data.wellnessScore) {
          response += `**🌟 Current Wellness Score: ${data.wellnessScore.overall}/100**\n\n`;
          
          // Check if we have components data
          if (data.wellnessScore.components && typeof data.wellnessScore.components === 'object') {
            const components = data.wellnessScore.components;
            
            // Convert components to array and filter valid values
            const componentArray = Object.entries(components)
              .filter(([key, value]) => value !== undefined && value !== null && !isNaN(value))
              .map(([key, value]) => ({ 
                name: key.charAt(0).toUpperCase() + key.slice(1), 
                score: Number(value) 
              }));
            
            if (componentArray.length > 0) {
              // Sort by score (lowest first for improvement focus)
              componentArray.sort((a, b) => a.score - b.score);
              
              response += `**📊 Component Breakdown:**\n`;
              componentArray.forEach(comp => {
                const emoji = comp.score >= 20 ? '✅' : comp.score >= 15 ? '⚠️' : '❌';
                response += `${emoji} ${comp.name}: ${comp.score}/25\n`;
              });
              
              response += `\n**🎯 Focus Areas for Improvement:**\n\n`;
              
              // Get the lowest scoring components for focused recommendations
              const improvementAreas = componentArray.filter(c => c.score < 20);
              
              if (improvementAreas.length > 0) {
                improvementAreas.slice(0, 3).forEach((area, index) => {
                  response += `**${index + 1}. ${area.name} (${area.score}/25)**\n`;
                  
                  switch(area.name.toLowerCase()) {
                    case 'bmi':
                      response += `   • Work towards a healthy BMI range (18.5-24.9)\n`;
                      response += `   • Aim for gradual weight changes (0.5-1 kg/week)\n`;
                      response += `   • Track your calories and maintain portion control\n`;
                      break;
                    case 'activity':
                      response += `   • Increase to 150 minutes of moderate exercise weekly\n`;
                      response += `   • Start with 20-minute daily walks\n`;
                      response += `   • Add strength training 2x per week\n`;
                      break;
                    case 'progress':
                      response += `   • Set realistic, measurable goals\n`;
                      response += `   • Track your metrics weekly\n`;
                      response += `   • Celebrate small victories along the way\n`;
                      break;
                    case 'habits':
                      response += `   • Prioritize 7-9 hours of quality sleep\n`;
                      response += `   • Manage stress with meditation or yoga\n`;
                      response += `   • Stay hydrated with 8+ glasses of water daily\n`;
                      break;
                    case 'nutrition':
                      response += `   • Balance your macronutrients (protein, carbs, fats)\n`;
                      response += `   • Eat 5+ servings of fruits and vegetables daily\n`;
                      response += `   • Limit processed foods and added sugars\n`;
                      break;
                    case 'sleep':
                      response += `   • Maintain consistent sleep/wake times\n`;
                      response += `   • Create a relaxing bedtime routine\n`;
                      response += `   • Keep your bedroom cool and dark\n`;
                      break;
                    default:
                      response += `   • Focus on consistent daily habits\n`;
                      response += `   • Track your progress regularly\n`;
                      response += `   • Seek support when needed\n`;
                  }
                  response += '\n';
                });
                
                response += `**💡 Quick Win:** Start with your lowest scoring area (${improvementAreas[0].name}) for the biggest impact on your overall wellness!\n\n`;
                response += `**📈 Potential Impact:** Improving your ${improvementAreas[0].name} score by just 5 points could boost your overall wellness score by ${Math.round(5 / componentArray.length)}+ points!`;
              } else {
                // All components are doing well
                response += `Great job! All your components are scoring well (20+/25). To push your score even higher:\n\n`;
                response += `• **Consistency is key:** Maintain your current healthy habits\n`;
                response += `• **Fine-tune:** Small improvements in each area add up\n`;
                response += `• **Challenge yourself:** Set slightly more ambitious goals\n`;
                response += `• **Track trends:** Monitor your progress over time\n`;
              }
            } else {
              // No valid components found
              response += `I'm having trouble loading your wellness score components. Please ensure your health profile is complete.\n\n`;
              response += `**To improve your wellness score:**\n`;
              response += `• Complete all sections of your health profile\n`;
              response += `• Log your activities and meals regularly\n`;
              response += `• Set clear fitness goals\n`;
              response += `• Track your progress consistently\n`;
            }
          } else {
            // Components object is missing or invalid
            response += `**To calculate detailed wellness components:**\n`;
            response += `• Complete your health profile\n`;
            response += `• Add your fitness goals\n`;
            response += `• Log your daily activities\n`;
            response += `• Track your nutrition\n\n`;
            response += `Once you have more data logged, I can provide specific improvement recommendations!`;
          }
        } else {
          response += `I don't see a wellness score yet. Complete your health profile to get started!`;
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
      
      // Default comprehensive health metrics response
      response += `Hi ${userName}! Here's your health metrics overview:\n\n`;
      
      // BMI section
      if (data.bmi) {
        response += `**📏 BMI: ${data.bmi.value}** (${data.bmi.category})\n`;
        response += `• Normal range: 18.5 - 24.9\n`;
        
        if (data.bmi.value < 18.5) {
          response += `• You're underweight. Consider increasing caloric intake with nutritious foods.\n`;
        } else if (data.bmi.value >= 25 && data.bmi.value < 30) {
          response += `• You're slightly overweight. Small lifestyle changes can make a big difference!\n`;
        } else if (data.bmi.value >= 30) {
          response += `• Your BMI indicates obesity. Consider consulting a healthcare provider for a personalized plan.\n`;
        } else {
          response += `• Great job maintaining a healthy BMI! 🎉\n`;
        }
      }
      
      // Weight section
      if (data.weight) {
        response += `\n**⚖️ Weight Status:**\n`;
        response += `• Current: ${data.weight.current} kg\n`;
        
        if (data.goals?.targetWeight) {
          const targetValue = typeof data.goals.targetWeight === 'object' 
            ? data.goals.targetWeight.value 
            : data.goals.targetWeight;
          
          if (targetValue) {
            response += `• Target: ${targetValue} kg\n`;
            
            const difference = Math.abs(data.weight.current - targetValue);
            const toGo = data.weight.current > targetValue ? 'lose' : 'gain';
            
            response += `• To go: ${difference.toFixed(1)} kg to ${toGo}\n`;
            
            // Progress calculation
            const initialWeight = data.weight.initial || data.weight.current;
            const totalToChange = Math.abs(initialWeight - targetValue);
            const actualChange = Math.abs(initialWeight - data.weight.current);
            const progressPercent = totalToChange > 0 ? 
              Math.round((actualChange / totalToChange) * 100) : 0;
            
            response += `• Progress: ${progressPercent}% complete\n`;
            
            if (progressPercent >= 75) {
              response += `\n🎉 Amazing! You're almost at your goal!`;
            } else if (progressPercent >= 50) {
              response += `\n💪 Great progress! You're more than halfway there.`;
            } else if (progressPercent >= 25) {
              response += `\n👍 Good start! Keep up the momentum.`;
            } else {
              response += `\n🚀 You're on your way! Every step counts.`;
            }
          }
        }
      }
      
      // Wellness score interpretation
      if (data.wellnessScore) {
        response += `\n\n**🌟 Wellness Score: ${data.wellnessScore.overall}/100**\n`;
        
        // Only show component breakdown if we have valid data
        if (data.wellnessScore.components) {
          const components = data.wellnessScore.components;
          const validComponents = Object.entries(components)
            .filter(([key, value]) => value !== undefined && value !== null)
            .map(([key, value]) => ({ name: key, score: value }));
          
          if (validComponents.length > 0) {
            validComponents.sort((a, b) => b.score - a.score);
            
            response += `• Strongest area: ${validComponents[0].name} (${validComponents[0].score}/25)\n`;
            if (validComponents.length > 1) {
              response += `• Area to improve: ${validComponents[validComponents.length - 1].name} (${validComponents[validComponents.length - 1].score}/25)\n`;
            }
          }
        }
        
        // Overall interpretation
        if (data.wellnessScore.overall >= 80) {
          response += `\n🏆 Excellent wellness score! You're doing fantastic!`;
        } else if (data.wellnessScore.overall >= 60) {
          response += `\n✨ Good wellness score! There's room for improvement, but you're on the right track.`;
        } else {
          response += `\n📈 Your wellness score shows opportunity for improvement. Let's work on building healthier habits together!`;
        }
      }
      
      return {
        response,
        functionCalls: [{
          name: 'get_health_metrics',
          parameters: { metric_type: 'all', time_period: 'current' },
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
      // Get today's meal plan for analysis
      const mealPlanResult = await executeFunction('get_nutrition_data', userId, {
        type: 'meal_plan',
        timeframe: 'today'
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
      
      const nutritionSummary = mealPlanResult.data.nutritionSummary;
      const preferences = prefsResult.data?.data || {};
      const userName = context.userProfile?.name || 'there';
      
      let response = `${userName}, here's your nutritional analysis:\n\n`;
      
      // Calorie analysis
      response += `**🔥 Calorie Analysis:**\n`;
      const calories = nutritionSummary?.calories || 0;
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
      
      // Macro breakdown
      response += `\n**🥗 Macronutrient Breakdown:**\n`;
      
      const protein = nutritionSummary?.protein || 0;
      const carbs = nutritionSummary?.carbs || 0;
      const fat = nutritionSummary?.fat || 0;
      const totalMacros = protein + carbs + fat;
      
      if (totalMacros > 0) {
        const proteinPercent = Math.round((protein * 4 / calories) * 100) || 0;
        const carbsPercent = Math.round((carbs * 4 / calories) * 100) || 0;
        const fatPercent = Math.round((fat * 9 / calories) * 100) || 0;
        
        response += `• Protein: ${protein}g (${proteinPercent}% of calories)\n`;
        response += `• Carbs: ${carbs}g (${carbsPercent}% of calories)\n`;
        response += `• Fat: ${fat}g (${fatPercent}% of calories)\n`;
        
        // Ideal macro ratios feedback
        response += `\n**📊 Balance Assessment:**\n`;
        
        if (proteinPercent < 15) {
          response += `• Consider increasing protein intake for muscle maintenance\n`;
        } else if (proteinPercent > 35) {
          response += `• Protein intake is quite high - ensure balanced nutrition\n`;
        } else {
          response += `• ✅ Protein intake is well-balanced\n`;
        }
        
        if (carbsPercent < 45) {
          response += `• Carb intake is low - may affect energy levels\n`;
        } else if (carbsPercent > 65) {
          response += `• High carb intake - consider more protein and healthy fats\n`;
        } else {
          response += `• ✅ Carbohydrate intake is appropriate\n`;
        }
        
        if (fatPercent < 20) {
          response += `• Fat intake is low - include healthy fats for hormone health\n`;
        } else if (fatPercent > 35) {
          response += `• Fat intake is high - monitor saturated fat sources\n`;
        } else {
          response += `• ✅ Fat intake is within healthy range\n`;
        }
      }
      
      // Micronutrients if available
      if (nutritionSummary?.fiber) {
        response += `\n**🌾 Fiber:** ${nutritionSummary.fiber}g`;
        if (nutritionSummary.fiber < 25) {
          response += ` (Consider adding more vegetables and whole grains)`;
        } else {
          response += ` (Great fiber intake!)`;
        }
        response += '\n';
      }
      
      // Personalized recommendations
      response += `\n**💡 Recommendations:**\n`;
      response += `1. Stay hydrated - aim for 8 glasses of water daily\n`;
      response += `2. Include a variety of colorful vegetables\n`;
      response += `3. Balance each meal with protein, carbs, and healthy fats\n`;
      
      return {
        response,
        functionCalls: [
          {
            name: 'get_nutrition_data',
            parameters: { type: 'meal_plan', timeframe: 'today' },
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
        response: "I'm having trouble analyzing your nutrition. Please try again.",
        functionCalls: []
      };
    }
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