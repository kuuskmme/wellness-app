// backend/routes/nutrition.js

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const moment = require('moment-timezone');
const UserPreferences = require('../models/UserPreferences');
const Recipe = require('../models/Recipe');
const Ingredient = require('../models/Ingredient');
const MealPlan = require('../models/MealPlan');
const HealthProfile = require('../models/HealthProfile');
const { verifyToken } = require('../middleware/auth');
const mealPlanningService = require('../utils/mealPlanningService');
const ragService = require('../utils/ragService');
const nutritionCalculator = require('../utils/nutritionCalculator');
const shoppingListService = require('../utils/shoppingListService');
const nutritionAnalysisService = require('../utils/nutritionAnalysisService');

// All routes require authentication
router.use(verifyToken);

// =====================
// SHOPPING LISTS
// =====================

// Generate shopping list from meal plan
router.get('/shopping-list', verifyToken, async (req, res) => {
  try {
    const { excludeItems, includeCost, storeLayout } = req.query;
    let { mealPlanId } = req.query;  // Changed from const to let
    
    if (!mealPlanId) {
      // Get active meal plan
      const activePlan = await MealPlan.findOne({
        userId: req.userId,
        status: 'active'
      }).sort({ createdAt: -1 });
      
      if (!activePlan) {
        return res.status(404).json({ message: 'No active meal plan found' });
      }
      
      mealPlanId = activePlan._id;  // Now this works because mealPlanId is let
    }
    
    const options = {
      exclude: excludeItems ? excludeItems.split(',') : [],
      includeCost: includeCost === 'true',
      storeLayout: storeLayout || 'standard'
    };
    
    const shoppingList = await shoppingListService.generateFromMealPlan(mealPlanId, options);
    
    res.json({
      message: 'Shopping list generated successfully',
      shoppingList
    });
  } catch (error) {
    console.error('Generate shopping list error:', error);
    res.status(500).json({ message: 'Server error while generating shopping list' });
  }
});

// Update shopping list items
router.put('/shopping-list', verifyToken, async (req, res) => {
  try {
    const { shoppingList, updates } = req.body;
    
    if (!shoppingList || !updates) {
      return res.status(400).json({ message: 'Shopping list and updates required' });
    }
    
    const updatedList = shoppingListService.updateQuantities(shoppingList, updates);
    
    res.json({
      message: 'Shopping list updated successfully',
      shoppingList: updatedList
    });
  } catch (error) {
    console.error('Update shopping list error:', error);
    res.status(500).json({ message: 'Server error while updating shopping list' });
  }
});

// Export shopping list
router.post('/shopping-list/export', verifyToken, async (req, res) => {
  try {
    const { shoppingList, format = 'text' } = req.body;
    
    if (!shoppingList) {
      return res.status(400).json({ message: 'Shopping list required' });
    }
    
    const exported = shoppingListService.exportList(shoppingList, format);
    
    res.json({
      message: 'Shopping list exported successfully',
      format,
      data: exported
    });
  } catch (error) {
    console.error('Export shopping list error:', error);
    res.status(500).json({ message: 'Server error while exporting shopping list' });
  }
});

// =====================
// NUTRITIONAL ANALYSIS
// =====================

// Get daily nutritional analysis
router.get('/analysis/daily', verifyToken, async (req, res) => {
  try {
    const { date } = req.query;
    const analysisDate = date ? new Date(date) : new Date();
    
    const analysis = await nutritionAnalysisService.analyzeDailyNutrition(
      req.userId,
      analysisDate
    );
    
    res.json({
      message: 'Daily analysis completed',
      analysis
    });
  } catch (error) {
    console.error('Daily analysis error:', error);
    res.status(500).json({ message: 'Server error during daily analysis' });
  }
});

// Get weekly nutritional analysis
router.get('/analysis/weekly', verifyToken, async (req, res) => {
  try {
    const { weekStart } = req.query;
    const startDate = weekStart ? moment(weekStart) : moment().startOf('week');
    
    const analysis = await nutritionAnalysisService.analyzeWeeklyNutrition(
      req.userId,
      startDate
    );
    
    res.json({
      message: 'Weekly analysis completed',
      analysis
    });
  } catch (error) {
    console.error('Weekly analysis error:', error);
    res.status(500).json({ message: 'Server error during weekly analysis' });
  }
});

// Get AI-powered nutritional insights
router.post('/analysis/ai', verifyToken, async (req, res) => {
  try {
    const { analysisData } = req.body;
    
    if (!analysisData) {
      // Get latest analysis
      const dailyAnalysis = await nutritionAnalysisService.analyzeDailyNutrition(
        req.userId,
        new Date()
      );
      analysisData = dailyAnalysis;
    }
    
    const insights = await nutritionAnalysisService.generateAIInsights(
      req.userId,
      analysisData
    );
    
    res.json({
      message: 'AI insights generated',
      insights
    });
  } catch (error) {
    console.error('AI insights error:', error);
    res.status(500).json({ message: 'Server error generating AI insights' });
  }
});

// =====================
// USER PREFERENCES
// =====================

// Get user preferences
router.get('/preferences', async (req, res) => {
  try {
    let preferences = await UserPreferences.findOne({ userId: req.userId });
    
    if (!preferences) {
      // Create default preferences
      preferences = new UserPreferences({
        userId: req.userId,
        dietaryPreferences: [],
        allergies: [],
        dislikedIngredients: [],
        cuisinePreferences: ['any'],
        nutritionalTargets: {
          dailyCalories: 2000,
          proteinGrams: 50,
          carbsGrams: 250,
          fatGrams: 65,
          fiberGrams: 25
        },
        mealPreferences: {
          mealsPerDay: 3,
          mealTiming: {
            breakfast: '08:00',
            lunch: '12:30',
            dinner: '19:00',
            snacks: []
          }
        }
      });
      await preferences.save();
    }
    
    // Calculate completion percentage
    preferences.calculateCompletion();
    
    res.json({ 
      preferences,
      completion: preferences.metadata.completionPercentage
    });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ message: 'Server error while fetching preferences' });
  }
});

// Update user preferences
router.put('/preferences', async (req, res) => {
  try {
    const updates = req.body;
    
    let preferences = await UserPreferences.findOne({ userId: req.userId });
    
    if (!preferences) {
      preferences = new UserPreferences({
        userId: req.userId,
        ...updates
      });
    } else {
      // Update existing preferences
      Object.keys(updates).forEach(key => {
        if (key !== '_id' && key !== 'userId') {
          preferences[key] = updates[key];
        }
      });
    }
    
    // Sync with health profile if available
    if (preferences.healthProfileLink.syncEnabled) {
      const healthProfile = await HealthProfile.findOne({ userId: req.userId });
      if (healthProfile) {
        await preferences.syncWithHealthProfile(healthProfile);
      }
    }

    await preferences.save();
    preferences.calculateCompletion();

    res.json({
      message: 'Preferences updated successfully',
      preferences,
      completion: preferences.metadata.completionPercentage
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ message: 'Server error while updating preferences' });
  }
});

// Sync preferences with health profile
router.post('/preferences/sync', async (req, res) => {
  try {
    const preferences = await UserPreferences.findOne({ userId: req.userId });
    const healthProfile = await HealthProfile.findOne({ userId: req.userId });

    if (!preferences || !healthProfile) {
      return res.status(404).json({ message: 'Preferences or health profile not found' });
    }

    await preferences.syncWithHealthProfile(healthProfile);
    await preferences.save();

    res.json({
      message: 'Preferences synced with health profile',
      preferences,
      syncedFields: ['calorieTarget', 'activityLevel', 'fitnessGoal']
    });
  } catch (error) {
    console.error('Sync preferences error:', error);
    res.status(500).json({ message: 'Server error while syncing preferences' });
  }
});

// =====================
// MEAL PLANNING
// =====================

// Generate meal plan (POST /api/nutrition/meal-plan)
router.post('/meal-plan', [
  body('duration').isIn(['daily', 'weekly']),
  body('startDate').optional().isISO8601(),
  body('preferences').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { duration, startDate, preferences: customPrefs } = req.body;
    
    // Use provided start date or tomorrow
    const planStartDate = startDate 
      ? moment(startDate).startOf('day').toDate()
      : moment().add(1, 'day').startOf('day').toDate();

    // Check for existing active plan
    const existingPlan = await MealPlan.findOne({
      userId: req.userId,
      status: 'active',
      startDate: { $lte: planStartDate },
      endDate: { $gte: planStartDate }
    });

    if (existingPlan) {
      return res.status(400).json({ 
        message: 'You already have an active meal plan for this period',
        existingPlan: existingPlan._id
      });
    }

    // Generate meal plan using AI service
    const planRequest = {
      userId: req.userId,
      duration,
      startDate: planStartDate,
      customPreferences: customPrefs
    };

    console.log('🍽️ Generating meal plan:', planRequest);
    
    let mealPlanData;
    try {
      // Try with AI first if API key exists
      if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'sk-fallback') {
        mealPlanData = await mealPlanningService.generateMealPlan(
          req.userId, 
          planRequest
        );
      } else {
        // Use fallback if no API key
        console.log('⚠️ No OpenAI API key, using fallback meal generation');
        mealPlanData = await mealPlanningService.generateFallbackPlan(
          req.userId,
          planRequest
        );
      }
    } catch (aiError) {
      console.log('⚠️ AI generation failed, using fallback:', aiError.message);
      // Fallback to basic generation on any AI error
      mealPlanData = await mealPlanningService.generateFallbackPlan(
        req.userId,
        planRequest
      );
    }

    // Save the meal plan
    const mealPlan = new MealPlan(mealPlanData);
    await mealPlan.save();

    res.status(201).json({
      message: 'Meal plan generated successfully',
      mealPlan,
      metadata: {
        totalDays: mealPlan.dailyPlans.length,
        totalMeals: mealPlan.dailyPlans.reduce((sum, day) => sum + (day.meals ? day.meals.length : 0), 0),
        averageCalories: Math.round(
          mealPlan.dailyPlans.reduce((sum, day) => sum + (day.totals?.calories || 0), 0) / 
          mealPlan.dailyPlans.length
        ),
        generationMethod: mealPlanData.generationMetadata?.method || 'fallback'
      }
    });
  } catch (error) {
    console.error('Generate meal plan error:', error);
    res.status(500).json({ message: 'Server error while generating meal plan' });
  }
});

// Get meal plans
router.get('/meal-plan', async (req, res) => {
  try {
    const { status = 'active', limit = 10 } = req.query;
    
    const query = {
      userId: req.userId
    };
    
    if (status !== 'all') {
      query.status = status;
    }
    
    const mealPlans = await MealPlan.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    res.json({
      mealPlans,
      count: mealPlans.length
    });
  } catch (error) {
    console.error('Get meal plans error:', error);
    res.status(500).json({ message: 'Server error while fetching meal plans' });
  }
});

// Get specific meal plan
router.get('/meal-plan/:id', async (req, res) => {
  try {
    const mealPlan = await MealPlan.findOne({
      _id: req.params.id,
      userId: req.userId
    });
    
    if (!mealPlan) {
      return res.status(404).json({ message: 'Meal plan not found' });
    }
    
    res.json({ mealPlan });
  } catch (error) {
    console.error('Get meal plan error:', error);
    res.status(500).json({ message: 'Server error while fetching meal plan' });
  }
});

// Update meal plan
router.put('/meal-plan/:id', async (req, res) => {
  try {
    const mealPlan = await MealPlan.findOne({
      _id: req.params.id,
      userId: req.userId
    });
    
    if (!mealPlan) {
      return res.status(404).json({ message: 'Meal plan not found' });
    }
    
    const { action, data } = req.body;
    
    switch (action) {
      case 'swap':
        await mealPlan.swapMeals(
          data.dayIndex1,
          data.mealIndex1,
          data.dayIndex2,
          data.mealIndex2
        );
        break;
        
      case 'lock':
        mealPlan.dailyPlans[data.dayIndex].meals[data.mealIndex].isLocked = true;
        await mealPlan.save();
        break;
        
      case 'unlock':
        mealPlan.dailyPlans[data.dayIndex].meals[data.mealIndex].isLocked = false;
        await mealPlan.save();
        break;
        
      case 'addMeal':
        await mealPlan.addManualMeal(data.dayIndex, data.meal);
        break;
        
      case 'removeMeal':
        mealPlan.dailyPlans[data.dayIndex].meals.splice(data.mealIndex, 1);
        await mealPlan.save();
        break;
        
      case 'updateStatus':
        mealPlan.status = data.status;
        await mealPlan.save();
        break;
        
      default:
        return res.status(400).json({ message: 'Invalid action' });
    }
    
    res.json({
      message: 'Meal plan updated successfully',
      mealPlan
    });
  } catch (error) {
    console.error('Update meal plan error:', error);
    res.status(500).json({ message: 'Server error while updating meal plan' });
  }
});

// Regenerate meal or entire plan
router.post('/meal-plan/:id/regenerate', async (req, res) => {
  try {
    const { scope = 'full', dayIndex, mealIndex } = req.body;
    
    const mealPlan = await MealPlan.findOne({
      _id: req.params.id,
      userId: req.userId
    });
    
    if (!mealPlan) {
      return res.status(404).json({ message: 'Meal plan not found' });
    }
    
    if (scope === 'meal' && dayIndex !== undefined && mealIndex !== undefined) {
      // Regenerate single meal
      const meal = mealPlan.dailyPlans[dayIndex].meals[mealIndex];
      
      if (meal.isLocked) {
        return res.status(400).json({ message: 'Cannot regenerate locked meal' });
      }

      // Get user preferences for regeneration
      const preferences = await UserPreferences.findOne({ userId: req.userId });
      
      // Simple regeneration for individual meal
      const alternatives = meal.alternatives || [];
      if (alternatives.length > 0) {
        // Use an alternative
        const alt = alternatives[0];
        meal.name = alt.name;
        meal.nutrition.calories = alt.calories || meal.nutrition.calories;
      } else {
        // Generate new meal name
        meal.name = `Regenerated ${meal.type}`;
        meal.nutrition.calories = Math.round(meal.nutrition.calories * (0.9 + Math.random() * 0.2));
      }
      
      await mealPlan.save();
    } else {
      // Regenerate entire plan
      const planRequest = {
        userId: req.userId,
        duration: mealPlan.type,
        startDate: mealPlan.startDate
      };

      let newPlanData;
      try {
        if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'sk-fallback') {
          newPlanData = await mealPlanningService.generateMealPlan(
            req.userId,
            planRequest
          );
        } else {
          newPlanData = await mealPlanningService.generateFallbackPlan(
            req.userId,
            planRequest
          );
        }
      } catch (error) {
        console.log('Regeneration failed, using fallback:', error.message);
        newPlanData = await mealPlanningService.generateFallbackPlan(
          req.userId,
          planRequest
        );
      }

      // Keep locked meals
      mealPlan.dailyPlans.forEach((day, dayIdx) => {
        day.meals.forEach((meal, mealIdx) => {
          if (meal.isLocked && newPlanData.dailyPlans[dayIdx]) {
            newPlanData.dailyPlans[dayIdx].meals[mealIdx] = meal;
          }
        });
      });

      mealPlan.dailyPlans = newPlanData.dailyPlans;
      mealPlan.generationMetadata = newPlanData.generationMetadata;
      
      await mealPlan.save();
    }

    res.json({
      message: `${scope === 'meal' ? 'Meal' : 'Plan'} regenerated successfully`,
      mealPlan
    });
  } catch (error) {
    console.error('Regenerate error:', error);
    res.status(500).json({ message: 'Server error while regenerating' });
  }
});

// Restore previous version
router.post('/meal-plan/:id/restore', async (req, res) => {
  try {
    const { version } = req.body;
    
    const mealPlan = await MealPlan.findOne({
      _id: req.params.id,
      userId: req.userId
    });
    
    if (!mealPlan) {
      return res.status(404).json({ message: 'Meal plan not found' });
    }
    
    await mealPlan.restoreVersion(version);
    
    res.json({
      message: 'Version restored successfully',
      mealPlan
    });
  } catch (error) {
    console.error('Restore version error:', error);
    res.status(500).json({ message: 'Server error while restoring version' });
  }
});

// Delete meal plan
router.delete('/meal-plan/:id', async (req, res) => {
  try {
    const result = await MealPlan.deleteOne({
      _id: req.params.id,
      userId: req.userId
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Meal plan not found' });
    }
    
    res.json({ message: 'Meal plan deleted successfully' });
  } catch (error) {
    console.error('Delete meal plan error:', error);
    res.status(500).json({ message: 'Server error while deleting meal plan' });
  }
});

// =====================
// RECIPES
// =====================

// Search recipes
router.get('/recipes/search', async (req, res) => {
  try {
    const { 
      query = '', 
      dietary, 
      allergies, 
      maxCalories, 
      maxTime,
      cuisine,
      mealType 
    } = req.query;
    
    const filters = {
      dietary: dietary ? dietary.split(',') : [],
      allergies: allergies ? allergies.split(',') : [],
      maxCalories: maxCalories ? parseInt(maxCalories) : null,
      maxTime: maxTime ? parseInt(maxTime) : null,
      cuisine,
      mealType
    };
    
    const recipes = await ragService.searchRecipes(query, filters);
    
    res.json({
      recipes,
      count: recipes.length,
      filters
    });
  } catch (error) {
    console.error('Recipe search error:', error);
    res.status(500).json({ message: 'Server error while searching recipes' });
  }
});

// Get recipe by ID
router.get('/recipes/:id', async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id);
    
    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }
    
    res.json({ recipe });
  } catch (error) {
    console.error('Get recipe error:', error);
    res.status(500).json({ message: 'Server error while fetching recipe' });
  }
});

// Generate custom recipe
router.post('/recipes/generate', async (req, res) => {
  try {
    const { requirements = {} } = req.body;
    
    const preferences = await UserPreferences.findOne({ userId: req.userId });
    
    if (!preferences) {
      return res.status(404).json({ message: 'User preferences not found' });
    }
    
    const generatedRecipe = await ragService.generateCustomRecipe(
      preferences,
      requirements
    );
    
    // Save the generated recipe
    const recipe = new Recipe(generatedRecipe);
    await recipe.save();
    
    res.status(201).json({
      message: 'Recipe generated successfully',
      recipe
    });
  } catch (error) {
    console.error('Generate recipe error:', error);
    res.status(500).json({ message: 'Server error while generating recipe' });
  }
});

// Adjust recipe portions
router.post('/recipes/:id/adjust', async (req, res) => {
  try {
    const { servings } = req.body;
    
    if (!servings || servings < 1 || servings > 20) {
      return res.status(400).json({ message: 'Invalid servings (1-20)' });
    }
    
    const recipe = await Recipe.findById(req.params.id);
    
    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }
    
    const adjustedRecipe = await nutritionCalculator.adjustPortions(
      recipe,
      servings
    );
    
    res.json({
      message: 'Recipe adjusted successfully',
      recipe: adjustedRecipe
    });
  } catch (error) {
    console.error('Adjust recipe error:', error);
    res.status(500).json({ message: 'Server error while adjusting recipe' });
  }
});

// Generate ingredient substitutions
router.post('/recipes/:id/substitute', async (req, res) => {
  try {
    const { ingredient, reason = 'preference' } = req.body;
    
    if (!ingredient) {
      return res.status(400).json({ message: 'Ingredient name required' });
    }
    
    const preferences = await UserPreferences.findOne({ userId: req.userId });
    
    const substitutions = await ragService.generateSubstitutions(
      ingredient,
      reason,
      preferences
    );
    
    res.json({
      message: 'Substitutions generated successfully',
      substitutions
    });
  } catch (error) {
    console.error('Generate substitutions error:', error);
    res.status(500).json({ message: 'Server error while generating substitutions' });
  }
});

// =====================
// INGREDIENTS
// =====================

// Search ingredients
router.get('/ingredients/search', async (req, res) => {
  try {
    const { query = '', category } = req.query;
    
    const filter = {};
    
    if (query) {
      filter.label = { $regex: query, $options: 'i' };
    }
    
    if (category) {
      filter.category = category;
    }
    
    const ingredients = await Ingredient.find(filter)
      .limit(50)
      .select('label category unit nutrition');
    
    res.json({
      ingredients,
      count: ingredients.length
    });
  } catch (error) {
    console.error('Ingredient search error:', error);
    res.status(500).json({ message: 'Server error while searching ingredients' });
  }
});

// =====================
// DATA INITIALIZATION
// =====================

// Initialize sample data
router.post('/init-data', async (req, res) => {
  try {
    // Check if data already exists
    const recipeCount = await Recipe.countDocuments();
    const ingredientCount = await Ingredient.countDocuments();
    
    if (recipeCount > 100 && ingredientCount > 100) {
      return res.json({
        message: 'Data already initialized',
        recipes: recipeCount,
        ingredients: ingredientCount
      });
    }
    
    // Initialize sample recipes and ingredients
    // This would normally be done via a seeder script
    
    res.json({
      message: 'Sample data initialized',
      recipes: await Recipe.countDocuments(),
      ingredients: await Ingredient.countDocuments()
    });
  } catch (error) {
    console.error('Initialize data error:', error);
    res.status(500).json({ message: 'Server error while initializing data' });
  }
});

module.exports = router;