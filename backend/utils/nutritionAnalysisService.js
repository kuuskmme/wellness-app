// utils/nutritionAnalysisService.js - Comprehensive nutritional analysis
const OpenAI = require('openai');
const MealPlan = require('../models/MealPlan');
const UserPreferences = require('../models/UserPreferences');
const HealthProfile = require('../models/HealthProfile');
const moment = require('moment-timezone');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-fallback'
});

class NutritionAnalysisService {
  constructor() {
    this.model = process.env.AI_MODEL || 'gpt-3.5-turbo';
  }

  // Analyze daily nutrition
  async analyzeDailyNutrition(userId, date = new Date()) {
    try {
      const startOfDay = moment(date).startOf('day').toDate();
      const endOfDay = moment(date).endOf('day').toDate();

      // Get meal plan for the day
      const mealPlan = await MealPlan.findOne({
        userId,
        status: 'active',
        startDate: { $lte: endOfDay },
        endDate: { $gte: startOfDay }
      });

      if (!mealPlan) {
        return { message: 'No active meal plan for this date' };
      }

      // Find the specific day's plan
      const dayPlan = mealPlan.dailyPlans.find(
        dp => moment(dp.date).format('YYYY-MM-DD') === moment(date).format('YYYY-MM-DD')
      );

      if (!dayPlan) {
        return { message: 'No meals planned for this date' };
      }

      // Get user preferences and health profile
      const [preferences, healthProfile] = await Promise.all([
        UserPreferences.findOne({ userId }),
        HealthProfile.findOne({ userId })
      ]);

      // Calculate totals
      const totals = this.calculateDailyTotals(dayPlan);
      
      // Compare with targets
      const comparison = this.compareWithTargets(totals, preferences.nutritionalTargets);
      
      // Calculate meal distribution
      const mealDistribution = this.analyzeMealDistribution(dayPlan);
      
      // Check nutritional balance
      const balance = this.assessNutritionalBalance(totals, preferences);

      return {
        date: moment(date).format('YYYY-MM-DD'),
        meals: dayPlan.meals.length,
        totals,
        targets: preferences.nutritionalTargets,
        comparison,
        mealDistribution,
        balance,
        score: this.calculateNutritionScore(totals, preferences.nutritionalTargets),
        recommendations: this.generateDailyRecommendations(totals, comparison, balance)
      };
    } catch (error) {
      console.error('Daily nutrition analysis error:', error);
      throw error;
    }
  }

  // Analyze weekly nutrition
  async analyzeWeeklyNutrition(userId, weekStartDate = moment().startOf('week')) {
    try {
      const weekStart = moment(weekStartDate).startOf('week').toDate();
      const weekEnd = moment(weekStartDate).endOf('week').toDate();

      // Get all meal plans for the week
      const mealPlans = await MealPlan.find({
        userId,
        status: 'active',
        $or: [
          { startDate: { $gte: weekStart, $lte: weekEnd } },
          { endDate: { $gte: weekStart, $lte: weekEnd } },
          { startDate: { $lte: weekStart }, endDate: { $gte: weekEnd } }
        ]
      });

      // Aggregate daily data
      const dailyData = [];
      for (let i = 0; i < 7; i++) {
        const currentDate = moment(weekStart).add(i, 'days').toDate();
        const dayAnalysis = await this.analyzeDailyNutrition(userId, currentDate);
        dailyData.push(dayAnalysis);
      }

      // Calculate weekly averages
      const weeklyAverages = this.calculateWeeklyAverages(dailyData);
      
      // Identify trends
      const trends = this.identifyTrends(dailyData);
      
      // Calculate deficit/surplus
      const deficitSurplus = this.calculateDeficitSurplus(dailyData);

      // Get user preferences for context
      const preferences = await UserPreferences.findOne({ userId });

      return {
        weekOf: moment(weekStart).format('YYYY-MM-DD'),
        days: dailyData,
        averages: weeklyAverages,
        trends,
        deficitSurplus,
        weeklyScore: this.calculateWeeklyScore(dailyData),
        insights: await this.generateWeeklyInsights(weeklyAverages, trends, preferences)
      };
    } catch (error) {
      console.error('Weekly nutrition analysis error:', error);
      throw error;
    }
  }

  // Generate AI-powered insights
  async generateAIInsights(userId, analysisData) {
    try {
      const [preferences, healthProfile] = await Promise.all([
        UserPreferences.findOne({ userId }),
        HealthProfile.findOne({ userId })
      ]);

      // Prepare context for AI
      const context = {
        userProfile: {
          age: this.calculateAge(healthProfile.personalInfo?.dateOfBirth),
          gender: healthProfile.personalInfo?.gender,
          activityLevel: healthProfile.lifestyleIndicators?.activityLevel,
          fitnessGoal: healthProfile.fitnessGoals?.primary,
          currentWeight: healthProfile.physicalMetrics?.weight?.value,
          targetWeight: healthProfile.fitnessGoals?.targetWeight?.value,
          bmi: healthProfile.physicalMetrics?.bmi?.value
        },
        preferences: {
          dietary: preferences.dietaryPreferences,
          allergies: preferences.allergies,
          targets: preferences.nutritionalTargets
        },
        analysisData
      };

      // Use sequential prompting for comprehensive insights
      const insights = await this.generateSequentialInsights(context);

      return {
        generatedAt: new Date(),
        insights: {
          summary: insights.summary,
          achievements: insights.achievements,
          concerns: insights.concerns,
          recommendations: insights.recommendations,
          mealSuggestions: insights.mealSuggestions,
          timingOptimizations: insights.timingOptimizations,
          portionAdjustments: insights.portionAdjustments,
          alternativeOptions: insights.alternativeOptions
        },
        confidenceScore: insights.confidenceScore || 0.85
      };
    } catch (error) {
      console.error('AI insights generation error:', error);
      // Return fallback insights
      return this.generateFallbackInsights(analysisData);
    }
  }

  // Sequential AI insight generation
  async generateSequentialInsights(context) {
    try {
      // Step 1: Analyze current state
      const analysisPrompt = `Analyze this user's nutritional data:
${JSON.stringify(context, null, 2)}

Identify:
1. Key nutritional achievements
2. Areas of concern
3. Patterns in eating habits
4. Progress toward goals

Respond in JSON format.`;

      const analysisResponse = await openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: 'You are a professional nutritionist analyzing dietary data.' },
          { role: 'user', content: analysisPrompt }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      });

      const analysis = JSON.parse(analysisResponse.choices[0].message.content);

      // Step 2: Generate recommendations based on analysis
      const recommendationPrompt = `Based on this nutritional analysis:
${JSON.stringify(analysis, null, 2)}

Generate specific, actionable recommendations for:
1. Improving nutritional balance
2. Meeting fitness goals
3. Addressing deficiencies
4. Optimizing meal timing
5. Portion adjustments

Consider the user's preferences and restrictions:
${JSON.stringify(context.preferences, null, 2)}

Respond in JSON format with detailed recommendations.`;

      const recommendationResponse = await openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: 'You are a nutritionist providing personalized recommendations.' },
          { role: 'user', content: recommendationPrompt }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      });

      const recommendations = JSON.parse(recommendationResponse.choices[0].message.content);

      return {
        summary: analysis.summary || 'Your nutrition is being tracked and analyzed.',
        achievements: analysis.achievements || [],
        concerns: analysis.concerns || [],
        recommendations: recommendations.recommendations || [],
        mealSuggestions: recommendations.mealSuggestions || [],
        timingOptimizations: recommendations.timingOptimizations || [],
        portionAdjustments: recommendations.portionAdjustments || [],
        alternativeOptions: recommendations.alternativeOptions || [],
        confidenceScore: 0.85
      };
    } catch (error) {
      console.error('Sequential insights error:', error);
      return this.generateFallbackInsights(context.analysisData);
    }
  }

  // Helper methods for calculations
  calculateDailyTotals(dayPlan) {
    const totals = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sodium: 0,
      sugar: 0
    };

    dayPlan.meals.forEach(meal => {
      if (meal.nutrition) {
        totals.calories += meal.nutrition.calories || 0;
        totals.protein += meal.nutrition.protein || 0;
        totals.carbs += meal.nutrition.carbs || 0;
        totals.fat += meal.nutrition.fat || 0;
        totals.fiber += meal.nutrition.fiber || 0;
        totals.sodium += meal.nutrition.sodium || 0;
        totals.sugar += meal.nutrition.sugar || 0;
      }
    });

    // Round values
    Object.keys(totals).forEach(key => {
      totals[key] = Math.round(totals[key] * 10) / 10;
    });

    return totals;
  }

  compareWithTargets(totals, targets) {
    const comparison = {};
    
    comparison.calories = {
      actual: totals.calories,
      target: targets.dailyCalories,
      difference: totals.calories - targets.dailyCalories,
      percentage: Math.round((totals.calories / targets.dailyCalories) * 100)
    };

    ['protein', 'carbs', 'fat'].forEach(macro => {
      comparison[macro] = {
        actual: totals[macro],
        target: targets.macros[macro].grams,
        difference: totals[macro] - targets.macros[macro].grams,
        percentage: Math.round((totals[macro] / targets.macros[macro].grams) * 100)
      };
    });

    return comparison;
  }

  analyzeMealDistribution(dayPlan) {
    const distribution = {
      breakfast: { calories: 0, percentage: 0 },
      lunch: { calories: 0, percentage: 0 },
      dinner: { calories: 0, percentage: 0 },
      snacks: { calories: 0, percentage: 0 }
    };

    let totalCalories = 0;

    dayPlan.meals.forEach(meal => {
      const calories = meal.nutrition?.calories || 0;
      totalCalories += calories;
      
      if (distribution[meal.type]) {
        distribution[meal.type].calories += calories;
      } else {
        distribution.snacks.calories += calories;
      }
    });

    // Calculate percentages
    Object.keys(distribution).forEach(mealType => {
      distribution[mealType].percentage = totalCalories > 0
        ? Math.round((distribution[mealType].calories / totalCalories) * 100)
        : 0;
    });

    return distribution;
  }

  assessNutritionalBalance(totals, preferences) {
    const balance = {
      overall: 'balanced',
      macroBalance: {},
      micronutrients: {},
      hydration: 'unknown',
      variety: 'unknown'
    };

    // Check macro balance
    const totalMacroCalories = (totals.protein * 4) + (totals.carbs * 4) + (totals.fat * 9);
    
    balance.macroBalance = {
      protein: Math.round((totals.protein * 4 / totalMacroCalories) * 100),
      carbs: Math.round((totals.carbs * 4 / totalMacroCalories) * 100),
      fat: Math.round((totals.fat * 9 / totalMacroCalories) * 100)
    };

    // Assess if balanced
    const targetMacros = preferences.nutritionalTargets.macros;
    let imbalanceCount = 0;
    
    ['protein', 'carbs', 'fat'].forEach(macro => {
      const diff = Math.abs(balance.macroBalance[macro] - targetMacros[macro].percentage);
      if (diff > 10) imbalanceCount++;
    });

    if (imbalanceCount >= 2) balance.overall = 'imbalanced';
    else if (imbalanceCount === 1) balance.overall = 'slightly imbalanced';

    // Check micronutrients
    balance.micronutrients = {
      fiber: totals.fiber >= 25 ? 'adequate' : 'low',
      sodium: totals.sodium > 2300 ? 'high' : totals.sodium < 500 ? 'low' : 'adequate'
    };

    return balance;
  }

  calculateNutritionScore(totals, targets) {
    let score = 100;
    
    // Calorie accuracy (max 25 points deduction)
    const calorieDiff = Math.abs(totals.calories - targets.dailyCalories) / targets.dailyCalories;
    score -= Math.min(25, calorieDiff * 50);
    
    // Macro balance (max 30 points deduction)
    ['protein', 'carbs', 'fat'].forEach(macro => {
      const diff = Math.abs(totals[macro] - targets.macros[macro].grams) / targets.macros[macro].grams;
      score -= Math.min(10, diff * 20);
    });
    
    // Fiber (max 10 points deduction)
    if (totals.fiber < 25) {
      score -= (25 - totals.fiber) * 0.4;
    }
    
    // Sodium (max 10 points deduction)
    if (totals.sodium > 2300) {
      score -= Math.min(10, (totals.sodium - 2300) / 100);
    }
    
    return Math.max(0, Math.round(score));
  }

  generateDailyRecommendations(totals, comparison, balance) {
    const recommendations = [];
    
    // Calorie recommendations
    if (comparison.calories.percentage < 90) {
      recommendations.push({
        type: 'increase_calories',
        message: `You're ${Math.abs(comparison.calories.difference)} calories below target. Consider adding a healthy snack.`,
        priority: 'medium'
      });
    } else if (comparison.calories.percentage > 110) {
      recommendations.push({
        type: 'reduce_calories',
        message: `You're ${comparison.calories.difference} calories over target. Consider smaller portions tomorrow.`,
        priority: 'medium'
      });
    }
    
    // Macro recommendations
    if (comparison.protein.percentage < 80) {
      recommendations.push({
        type: 'increase_protein',
        message: 'Protein intake is low. Add lean meats, legumes, or protein-rich snacks.',
        priority: 'high'
      });
    }
    
    // Fiber recommendation
    if (totals.fiber < 25) {
      recommendations.push({
        type: 'increase_fiber',
        message: `Fiber intake is ${totals.fiber}g. Aim for 25-30g with more vegetables and whole grains.`,
        priority: 'low'
      });
    }
    
    // Balance recommendation
    if (balance.overall === 'imbalanced') {
      recommendations.push({
        type: 'improve_balance',
        message: 'Macro nutrient balance is off. Review your meal composition.',
        priority: 'medium'
      });
    }
    
    return recommendations;
  }

  calculateWeeklyAverages(dailyData) {
    const validDays = dailyData.filter(day => day.totals);
    
    if (validDays.length === 0) {
      return null;
    }
    
    const averages = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sodium: 0
    };
    
    validDays.forEach(day => {
      Object.keys(averages).forEach(key => {
        averages[key] += day.totals[key] || 0;
      });
    });
    
    Object.keys(averages).forEach(key => {
      averages[key] = Math.round(averages[key] / validDays.length * 10) / 10;
    });
    
    return averages;
  }

  identifyTrends(dailyData) {
    const trends = {
      calories: 'stable',
      consistency: 'consistent',
      improvement: []
    };
    
    // Check calorie trend
    const validDays = dailyData.filter(day => day.totals);
    if (validDays.length >= 3) {
      const firstHalf = validDays.slice(0, Math.floor(validDays.length / 2));
      const secondHalf = validDays.slice(Math.floor(validDays.length / 2));
      
      const firstAvg = firstHalf.reduce((sum, day) => sum + day.totals.calories, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, day) => sum + day.totals.calories, 0) / secondHalf.length;
      
      if (secondAvg > firstAvg * 1.1) trends.calories = 'increasing';
      else if (secondAvg < firstAvg * 0.9) trends.calories = 'decreasing';
    }
    
    // Check consistency
    const scores = validDays.map(day => day.score || 0);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / scores.length;
    
    if (variance > 400) trends.consistency = 'inconsistent';
    else if (variance < 100) trends.consistency = 'very consistent';
    
    return trends;
  }

  calculateDeficitSurplus(dailyData) {
    const validDays = dailyData.filter(day => day.comparison);
    
    const totals = {
      dailyDeficit: 0,
      dailySurplus: 0,
      weeklyBalance: 0
    };
    
    validDays.forEach(day => {
      const diff = day.comparison.calories.difference;
      if (diff < 0) {
        totals.dailyDeficit += Math.abs(diff);
      } else {
        totals.dailySurplus += diff;
      }
      totals.weeklyBalance += diff;
    });
    
    return {
      averageDailyDeficit: Math.round(totals.dailyDeficit / validDays.length),
      averageDailySurplus: Math.round(totals.dailySurplus / validDays.length),
      weeklyBalance: Math.round(totals.weeklyBalance),
      recommendation: totals.weeklyBalance < -3500 ? 'significant deficit' :
                     totals.weeklyBalance > 3500 ? 'significant surplus' : 'balanced'
    };
  }

  calculateWeeklyScore(dailyData) {
    const validDays = dailyData.filter(day => day.score !== undefined);
    
    if (validDays.length === 0) return 0;
    
    const totalScore = validDays.reduce((sum, day) => sum + day.score, 0);
    return Math.round(totalScore / validDays.length);
  }

  async generateWeeklyInsights(averages, trends, preferences) {
    const insights = [];
    
    // Trend insights
    if (trends.calories === 'increasing') {
      insights.push({
        type: 'trend',
        message: 'Your calorie intake is trending upward this week.',
        recommendation: 'Monitor portion sizes if weight loss is your goal.'
      });
    }
    
    // Consistency insights
    if (trends.consistency === 'inconsistent') {
      insights.push({
        type: 'consistency',
        message: 'Your daily nutrition varies significantly.',
        recommendation: 'Try to maintain more consistent meal patterns.'
      });
    }
    
    // Achievement insights
    if (averages && preferences) {
      const proteinTarget = preferences.nutritionalTargets.macros.protein.grams;
      if (averages.protein >= proteinTarget * 0.95) {
        insights.push({
          type: 'achievement',
          message: 'Great job meeting your protein targets this week!',
          recommendation: 'Keep up the good work with protein-rich meals.'
        });
      }
    }
    
    return insights;
  }

  generateFallbackInsights(analysisData) {
    return {
      generatedAt: new Date(),
      insights: {
        summary: 'Continue tracking your nutrition for personalized insights.',
        achievements: ['Consistent meal tracking', 'Meeting calorie targets'],
        concerns: ['Consider increasing vegetable intake', 'Watch sodium levels'],
        recommendations: [
          {
            category: 'balance',
            suggestion: 'Aim for more balanced macro distribution',
            priority: 'medium'
          },
          {
            category: 'timing',
            suggestion: 'Try spacing meals 3-4 hours apart',
            priority: 'low'
          }
        ],
        mealSuggestions: ['Add a serving of vegetables to lunch', 'Include protein with snacks'],
        timingOptimizations: ['Consider earlier dinner time for better digestion'],
        portionAdjustments: ['Slightly reduce dinner portions if feeling too full'],
        alternativeOptions: ['Try plant-based protein sources 2-3 times per week']
      },
      confidenceScore: 0.7
    };
  }

  calculateAge(dateOfBirth) {
    if (!dateOfBirth) return null;
    return moment().diff(moment(dateOfBirth), 'years');
  }
}

module.exports = new NutritionAnalysisService();