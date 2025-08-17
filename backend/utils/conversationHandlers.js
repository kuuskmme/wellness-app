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
      // Get comprehensive health data
      const metricsResult = await executeFunction('get_health_metrics', userId, {
        metric_type: 'all',
        time_period: 'monthly'
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
      
      // Personalized greeting
      response += `Hi ${userName}! Let me share your current health metrics:\n\n`;
      
      // BMI interpretation
      if (data.bmi) {
        response += `**📊 BMI: ${data.bmi.value}** (${data.bmi.category})\n`;
        
        // Add interpretation
        if (data.bmi.value < 18.5) {
          response += `This indicates you're underweight. Consider increasing your caloric intake with nutrient-dense foods.\n`;
        } else if (data.bmi.value >= 18.5 && data.bmi.value < 25) {
          response += `Great news! You're in the healthy weight range. Keep maintaining your current lifestyle.\n`;
        } else if (data.bmi.value >= 25 && data.bmi.value < 30) {
          response += `You're slightly overweight. Small changes to diet and exercise can help you reach the healthy range.\n`;
        } else {
          response += `This indicates obesity. I recommend consulting with a healthcare provider for a personalized weight management plan.\n`;
        }
      }
      
      // Weight progress interpretation
      if (data.weight) {
        response += `\n**⚖️ Weight Progress:**\n`;
        response += `• Current: ${data.weight.current} kg\n`;
        
        if (data.weight.target) {
          response += `• Target: ${data.weight.target} kg\n`;
          const toGo = Math.abs(data.weight.current - data.weight.target);
          
          if (data.weight.progressPercentage !== undefined) {
            response += `• Progress: ${data.weight.progressPercentage}% complete\n`;
            
            if (data.weight.progressPercentage >= 75) {
              response += `\n🎉 Amazing! You're almost at your goal - just ${toGo.toFixed(1)} kg to go!\n`;
            } else if (data.weight.progressPercentage >= 50) {
              response += `\n💪 Great progress! You're more than halfway to your goal.\n`;
            } else if (data.weight.progressPercentage >= 25) {
              response += `\n👍 Good start! Keep up the momentum.\n`;
            } else {
              response += `\n🚀 You're on your way! Every step counts.\n`;
            }
          }
        }
      }
      
      // Wellness score interpretation
      if (data.wellnessScore) {
        response += `\n**🌟 Wellness Score: ${data.wellnessScore.overall}/100**\n`;
        
        // Identify strongest and weakest components
        const components = data.wellnessScore.components;
        const componentArray = Object.entries(components).map(([key, value]) => ({
          name: key,
          score: value
        }));
        componentArray.sort((a, b) => b.score - a.score);
        
        response += `• Strongest area: ${componentArray[0].name} (${componentArray[0].score}/25)\n`;
        response += `• Area to improve: ${componentArray[componentArray.length - 1].name} (${componentArray[componentArray.length - 1].score}/25)\n`;
        
        // Overall interpretation
        if (data.wellnessScore.overall >= 80) {
          response += `\n🏆 Excellent wellness score! You're doing fantastic!\n`;
        } else if (data.wellnessScore.overall >= 60) {
          response += `\n✨ Good wellness score! There's room for improvement, but you're on the right track.\n`;
        } else {
          response += `\n📈 Your wellness score shows opportunity for improvement. Let's work on building healthier habits together!\n`;
        }
      }
      
      // Trend analysis if available
      if (data.trend) {
        response += `\n**📈 30-Day Trend:**\n`;
        const change = data.trend.change;
        if (change < 0) {
          response += `You've lost ${Math.abs(change).toFixed(1)} kg this month - great progress!\n`;
        } else if (change > 0) {
          response += `You've gained ${change.toFixed(1)} kg this month.\n`;
        } else {
          response += `Your weight has remained stable this month.\n`;
        }
      }
      
      return {
        response,
        functionCalls: [{
          name: 'get_health_metrics',
          parameters: { metric_type: 'all', time_period: 'monthly' },
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
      // Determine timeframe from query
      const isWeekly = query.toLowerCase().includes('week');
      const timeframe = isWeekly ? 'week' : 'today';
      
      const mealPlanResult = await executeFunction('get_nutrition_data', userId, {
        type: 'meal_plan',
        timeframe: timeframe
      });
      
      if (!mealPlanResult.data || !mealPlanResult.data.data) {
        return {
          response: "You don't have an active meal plan yet. Would you like me to help you create one? I can design a personalized plan based on your dietary preferences and goals.",
          functionCalls: []
        };
      }
      
      const data = mealPlanResult.data;
      const userName = context.userProfile?.name || 'there';
      let response = '';
      
      if (timeframe === 'today') {
        response += `${userName}, here's your meal plan for today:\n\n`;
        
        const todayPlan = data.data;
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
            response += `📍 ${meal.name}\n`;
            
            if (meal.description) {
              response += `${meal.description}\n`;
            }
            
            if (meal.ingredients && meal.ingredients.length > 0) {
              response += `Ingredients: ${meal.ingredients.slice(0, 5).join(', ')}\n`;
            }
            
            if (meal.nutrition) {
              response += `📊 ${meal.nutrition.calories} cal | `;
              response += `${meal.nutrition.protein}g protein | `;
              response += `${meal.nutrition.carbs}g carbs | `;
              response += `${meal.nutrition.fat}g fat\n`;
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
          response += `• Protein: ${data.nutritionSummary.protein}\n`;
          response += `• Carbs: ${data.nutritionSummary.carbs}\n`;
          response += `• Fat: ${data.nutritionSummary.fat}\n`;
          
          // Compare to targets if available
          const prefsResult = await executeFunction('get_nutrition_data', userId, {
            type: 'preferences'
          });
          
          if (prefsResult.data && prefsResult.data.data) {
            const target = prefsResult.data.data.calorieTarget;
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
              if (meal.nutrition) {
                response += ` (${meal.nutrition.calories} cal)`;
              }
              response += '\n';
            });
            response += '\n';
          }
        });
      }
      
      // Add variety analysis
      response += this.analyzeMealVariety(data.data);
      
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
   * Handles: Recipe searches, recommendations, nutritional info
   * Interprets: Suitability for goals, preparation complexity
   */
  static async handleRecipes(userId, query, context) {
    try {
      const recipeResult = await executeFunction('get_nutrition_data', userId, {
        type: 'recipe'
      });
      
      if (!recipeResult.data || !recipeResult.data.data) {
        return {
          response: "I'm having trouble finding recipes right now. Please try again later.",
          functionCalls: []
        };
      }
      
      const recipes = Array.isArray(recipeResult.data.data) ? 
        recipeResult.data.data : [recipeResult.data.data];
      const userName = context.userProfile?.name || 'there';
      
      let response = `${userName}, here are some recipe suggestions:\n\n`;
      
      // Get user preferences for better recommendations
      const prefsResult = await executeFunction('get_nutrition_data', userId, {
        type: 'preferences'
      });
      
      const preferences = prefsResult.data?.data || {};
      
      recipes.forEach((recipe, index) => {
        if (recipe) {
          response += `**${index + 1}. ${recipe.title}** 🍳\n`;
          
          if (recipe.description) {
            response += `${recipe.description}\n`;
          }
          
          // Check if suitable for user's dietary preferences
          if (preferences.dietary && preferences.dietary.length > 0) {
            const suitable = this.checkRecipeSuitability(recipe, preferences);
            if (suitable.issuitable) {
              response += `✅ Suitable for your ${preferences.dietary.join(', ')} diet\n`;
            } else if (suitable.warning) {
              response += `⚠️ ${suitable.warning}\n`;
            }
          }
          
          if (recipe.category) {
            response += `📂 Category: ${recipe.category}\n`;
          }
          
          if (recipe.cookTime) {
            response += `⏱️ Cook time: ${recipe.cookTime} minutes\n`;
            
            // Add complexity interpretation
            if (recipe.cookTime <= 15) {
              response += `⚡ Quick & Easy!\n`;
            } else if (recipe.cookTime <= 30) {
              response += `👍 Moderate prep time\n`;
            } else {
              response += `🍖 Worth the wait!\n`;
            }
          }
          
          if (recipe.nutrition) {
            response += `\n📊 **Nutrition per serving:**\n`;
            response += `• Calories: ${recipe.nutrition.calories}\n`;
            response += `• Protein: ${recipe.nutrition.protein}g\n`;
            response += `• Carbs: ${recipe.nutrition.carbs}g\n`;
            response += `• Fat: ${recipe.nutrition.fat}g\n`;
            
            // Goal alignment
            if (context.userProfile?.goals) {
              const primaryGoal = context.userProfile.goals[0];
              if (primaryGoal === 'weight_loss' && recipe.nutrition.calories < 400) {
                response += `✨ Great for weight loss!\n`;
              } else if (primaryGoal === 'muscle_gain' && recipe.nutrition.protein > 25) {
                response += `💪 High protein - perfect for muscle building!\n`;
              }
            }
          }
          
          response += '\n';
        }
      });
      
      response += `💡 **Tip:** Choose recipes that align with your goals and dietary preferences. Need something specific? Just ask!`;
      
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
        response += `📝 You're ${Math.abs(calorieDiff)} calories under. Don't forget to fuel your body!\n`;
      }
      
      // Macro analysis
      response += `\n**🥗 Macronutrient Breakdown:**\n`;
      const protein = parseInt(nutritionSummary?.protein) || 0;
      const carbs = parseInt(nutritionSummary?.carbs) || 0;
      const fat = parseInt(nutritionSummary?.fat) || 0;
      
      // Calculate percentages
      const totalMacros = protein * 4 + carbs * 4 + fat * 9;
      const proteinPercent = Math.round((protein * 4 / totalMacros) * 100);
      const carbsPercent = Math.round((carbs * 4 / totalMacros) * 100);
      const fatPercent = Math.round((fat * 9 / totalMacros) * 100);
      
      response += `• Protein: ${protein}g (${proteinPercent}%)\n`;
      response += `• Carbs: ${carbs}g (${carbsPercent}%)\n`;
      response += `• Fat: ${fat}g (${fatPercent}%)\n`;
      
      // Macro targets comparison
      if (preferences.macroTargets) {
        response += `\n**📊 vs. Your Targets:**\n`;
        const targets = preferences.macroTargets;
        
        if (Math.abs(proteinPercent - targets.proteinPercentage) > 10) {
          response += `• Protein: ${proteinPercent > targets.proteinPercentage ? 'Higher' : 'Lower'} than target (${targets.proteinPercentage}%)\n`;
        } else {
          response += `• Protein: ✓ On target!\n`;
        }
        
        if (Math.abs(carbsPercent - targets.carbsPercentage) > 10) {
          response += `• Carbs: ${carbsPercent > targets.carbsPercentage ? 'Higher' : 'Lower'} than target (${targets.carbsPercentage}%)\n`;
        } else {
          response += `• Carbs: ✓ On target!\n`;
        }
        
        if (Math.abs(fatPercent - targets.fatPercentage) > 10) {
          response += `• Fat: ${fatPercent > targets.fatPercentage ? 'Higher' : 'Lower'} than target (${targets.fatPercentage}%)\n`;
        } else {
          response += `• Fat: ✓ On target!\n`;
        }
      }
      
      // Goal-specific recommendations
      response += `\n**💡 Personalized Recommendations:**\n`;
      
      if (context.userProfile?.goals) {
        const primaryGoal = context.userProfile.goals[0];
        
        if (primaryGoal === 'weight_loss') {
          if (protein < 0.8 * (context.lastMetrics?.weight || 70)) {
            response += `• Increase protein to preserve muscle during weight loss\n`;
          }
          if (calorieDiff > 0) {
            response += `• Create a slight calorie deficit for weight loss\n`;
          }
        } else if (primaryGoal === 'muscle_gain') {
          if (protein < 1.6 * (context.lastMetrics?.weight || 70)) {
            response += `• Increase protein intake for muscle growth (aim for 1.6-2.2g per kg body weight)\n`;
          }
          if (calorieDiff < 0) {
            response += `• Ensure calorie surplus for muscle building\n`;
          }
        }
      }
      
      // Hydration reminder
      response += `\n💧 Don't forget hydration! Aim for ${Math.round((context.lastMetrics?.weight || 70) * 35)}ml of water today.`;
      
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
        response: "I'm having trouble analyzing your nutrition right now. Please try again.",
        functionCalls: []
      };
    }
  }

  /**
   * 6. GENERAL WELLNESS HANDLER
   * Handles: Exercise, sleep, stress, hydration tips
   * Interprets: Lifestyle factors, personalized advice
   */
  static async handleGeneralWellness(userId, query, context) {
    try {
      // Determine topic from query
      let topic = 'general';
      const lowerQuery = query.toLowerCase();
      
      if (lowerQuery.includes('sleep')) topic = 'sleep';
      else if (lowerQuery.includes('exercise') || lowerQuery.includes('workout')) topic = 'exercise';
      else if (lowerQuery.includes('stress')) topic = 'stress';
      else if (lowerQuery.includes('water') || lowerQuery.includes('hydration')) topic = 'hydration';
      
      const insightsResult = await executeFunction('get_general_insights', userId, {
        topic: topic
      });
      
      // Get user's profile for personalization
      const metricsResult = await executeFunction('get_health_metrics', userId, {
        metric_type: 'all',
        time_period: 'current'
      });
      
      const userName = context.userProfile?.name || 'there';
      const userGoals = context.userProfile?.goals || [];
      const activityLevel = metricsResult.data?.goals?.activityLevel || 'moderate';
      
      let response = `${userName}, here's your personalized wellness guidance:\n\n`;
      
      // Topic-specific header with emoji
      const topicEmojis = {
        sleep: '😴',
        exercise: '💪',
        stress: '🧘',
        hydration: '💧',
        general: '🌟'
      };
      
      response += `**${topicEmojis[topic]} ${topic.charAt(0).toUpperCase() + topic.slice(1)} Insights:**\n\n`;
      
      // Add personalized context
      if (topic === 'exercise') {
        response += `Based on your activity level (${activityLevel}) and goals (${userGoals[0]?.replace(/_/g, ' ') || 'general fitness'}):\n\n`;
        
        // Personalized exercise plan
        if (activityLevel === 'sedentary') {
          response += `**🚶 Beginner's Plan:**\n`;
          response += `• Week 1-2: 10-minute walks daily\n`;
          response += `• Week 3-4: 20-minute walks + 5 min stretching\n`;
          response += `• Week 5+: Add bodyweight exercises (squats, push-ups)\n\n`;
        } else if (activityLevel === 'lightly_active') {
          response += `**🏃 Building Consistency:**\n`;
          response += `• 3x/week: 30-min cardio (walking, cycling)\n`;
          response += `• 2x/week: 20-min strength training\n`;
          response += `• Daily: 10-min morning stretches\n\n`;
        } else {
          response += `**🔥 Advanced Training:**\n`;
          response += `• 4-5x/week: Varied cardio (HIIT, steady-state)\n`;
          response += `• 3x/week: Strength training (compound movements)\n`;
          response += `• 1-2x/week: Active recovery (yoga, swimming)\n\n`;
        }
      }
      
      // Add insights
      if (insightsResult.data && insightsResult.data.insights) {
        insightsResult.data.insights.forEach(insight => {
          response += `• ${insight}\n`;
        });
      }
      
      // Add personalized tips based on metrics
      if (metricsResult.data) {
        response += `\n**📊 Based on Your Profile:**\n`;
        
        if (metricsResult.data.wellnessScore) {
          const score = metricsResult.data.wellnessScore.overall;
          if (score < 60 && topic === 'general') {
            response += `• Your wellness score (${score}/100) suggests focusing on building consistent healthy habits\n`;
          }
        }
        
        if (metricsResult.data.bmi && topic === 'exercise') {
          const bmi = metricsResult.data.bmi.value;
          if (bmi > 25) {
            response += `• Focus on low-impact exercises to protect joints while building fitness\n`;
          } else if (bmi < 18.5) {
            response += `• Include strength training to build healthy muscle mass\n`;
          }
        }
      }
      
      // Action items
      response += `\n**✅ Action Items:**\n`;
      
      switch(topic) {
        case 'sleep':
          response += `1. Set a consistent bedtime tonight\n`;
          response += `2. Create a 30-min wind-down routine\n`;
          response += `3. Remove screens from bedroom\n`;
          break;
        case 'exercise':
          response += `1. Schedule tomorrow's workout now\n`;
          response += `2. Prepare workout clothes tonight\n`;
          response += `3. Start with just 10 minutes if needed\n`;
          break;
        case 'stress':
          response += `1. Try 5-minute breathing exercise today\n`;
          response += `2. Schedule 15-min daily "me time"\n`;
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
}

module.exports = ConversationHandlers;