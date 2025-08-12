
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
    const { mealPlanId, excludeItems, includeCost, storeLayout } = req.query;
    
    if (!mealPlanId) {
      // Get active meal plan
      const activePlan = await MealPlan.findOne({
        userId: req.userId,
        status: 'active'
      }).sort({ createdAt: -1 });
      
      if (!activePlan) {
        return res.status(404).json({ message: 'No active meal plan found' });
      }
      
      mealPlanId = activePlan._id;
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

// Generate AI nutritional insights
router.post('/analysis/ai', verifyToken, async (req, res) => {
  try {
    const { analysisData, timeframe = 'weekly' } = req.body;
    
    let data = analysisData;
    
    // If no analysis data provided, generate it
    if (!data) {
      if (timeframe === 'daily') {
        data = await nutritionAnalysisService.analyzeDailyNutrition(req.userId);
      } else {
        data = await nutritionAnalysisService.analyzeWeeklyNutrition(req.userId);
      }
    }
    
    const insights = await nutritionAnalysisService.generateAIInsights(
      req.userId,
      data
    );
    
    res.json({
      message: 'AI insights generated successfully',
      insights
    });
  } catch (error) {
    console.error('AI insights error:', error);
    res.status(500).json({ message: 'Server error while generating AI insights' });
  }
});

// =====================
// USER PREFERENCES
// =====================

// Get user preferences (auto-sync with health profile)
router.get('/preferences', async (req, res) => {
  try {
    let preferences = await UserPreferences.findOne({ userId: req.userId });
    
    if (!preferences) {
      // Create new preferences and sync with health profile
      preferences = new UserPreferences({ userId: req.userId });
      
      // Try to sync with existing health profile
      const healthProfile = await HealthProfile.findOne({ userId: req.userId });
      if (healthProfile) {
        await preferences.syncWithHealthProfile(healthProfile);
        console.log('✅ Synced nutrition preferences with existing health profile');
      }
      
      await preferences.save();
    }
    
    // Calculate completion percentage
    preferences.calculateCompletion();
    
    res.json({
      preferences,
      syncStatus: preferences.healthProfileLink.syncEnabled,
      lastSynced: preferences.healthProfileLink.lastSynced,
      completion: preferences.metadata.completionPercentage
    });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ message: 'Server error while fetching preferences' });
  }
});

// Update user preferences (PUT /api/nutrition/preferences)
router.put('/preferences', [
  body('dietaryPreferences').optional().isArray(),
  body('allergies').optional().isArray(),
  body('cuisinePreferences').optional().isArray(),
  body('nutritionalTargets.dailyCalories').optional().isInt({ min: 1000, max: 5000 }),
  body('mealPreferences.mealsPerDay').optional().isInt({ min: 1, max: 6 }),
  body('location.timezone').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    let preferences = await UserPreferences.findOne({ userId: req.userId });
    
    if (!preferences) {
      preferences = new UserPreferences({ 
        userId: req.userId,
        ...req.body 
      });
    } else {
      // Update existing preferences
      Object.keys(req.body).forEach(key => {
        if (req.body[key] !== undefined) {
          if (typeof req.body[key] === 'object' && !Array.isArray(req.body[key])) {
            // For nested objects, merge
            preferences[key] = { ...preferences[key], ...req.body[key] };
          } else {
            preferences[key] = req.body[key];
          }
        }
      });
    }

    // Auto-sync with health profile if needed
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
    
    const mealPlanData = await mealPlanningService.generateMealPlan(
      req.userId, 
      planRequest
    );

    // Save the meal plan
    const mealPlan = new MealPlan(mealPlanData);
    await mealPlan.save();

    res.status(201).json({
      message: 'Meal plan generated successfully',
      mealPlan,
      metadata: {
        totalDays: mealPlan.dailyPlans.length,
        totalMeals: mealPlan.dailyPlans.reduce((sum, day) => sum + day.meals.length, 0),
        averageCalories: Math.round(
          mealPlan.dailyPlans.reduce((sum, day) => sum + (day.totals?.calories || 0), 0) / 
          mealPlan.dailyPlans.length
        )
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
    
    const mealPlans = await MealPlan.find({
      userId: req.userId,
      status: status === 'all' ? { $exists: true } : status
    })
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .select('name type startDate endDate status createdAt dailyPlans.totals');

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

// Update meal plan (swap, reorder, add manual meals)
router.put('/meal-plan/:id', async (req, res) => {
  try {
    const { action, payload } = req.body;
    
    const mealPlan = await MealPlan.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!mealPlan) {
      return res.status(404).json({ message: 'Meal plan not found' });
    }

    switch (action) {
      case 'swap':
        await mealPlan.swapMeals(
          payload.day1Index,
          payload.meal1Index,
          payload.day2Index,
          payload.meal2Index
        );
        break;
        
      case 'reorder':
        const dayPlan = mealPlan.dailyPlans[payload.dayIndex];
        const meals = dayPlan.meals;
        const [movedMeal] = meals.splice(payload.fromIndex, 1);
        meals.splice(payload.toIndex, 0, movedMeal);
        
        // Update order values
        meals.forEach((meal, index) => {
          meal.order = index;
        });
        
        await mealPlan.save();
        break;
        
      case 'add_manual':
        await mealPlan.addManualMeal(payload.dayIndex, payload.meal);
        break;
        
      case 'remove':
        mealPlan.dailyPlans[payload.dayIndex].meals.splice(payload.mealIndex, 1);
        await mealPlan.save();
        break;
        
      case 'lock':
        mealPlan.dailyPlans[payload.dayIndex].meals[payload.mealIndex].isLocked = true;
        await mealPlan.save();
        break;
        
      case 'unlock':
        mealPlan.dailyPlans[payload.dayIndex].meals[payload.mealIndex].isLocked = false;
        await mealPlan.save();
        break;
        
      default:
        return res.status(400).json({ message: 'Invalid action' });
    }

    res.json({
      message: `Meal plan ${action} completed`,
      mealPlan
    });
  } catch (error) {
    console.error('Update meal plan error:', error);
    res.status(500).json({ message: 'Server error while updating meal plan' });
  }
});

// Regenerate meals (whole plan or individual meals)
router.post('/meal-plan/:id/regenerate', async (req, res) => {
  try {
    const { scope = 'all', dayIndex, mealIndex } = req.body;
    
    const mealPlan = await MealPlan.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!mealPlan) {
      return res.status(404).json({ message: 'Meal plan not found' });
    }

    // Save current version before regenerating
    await mealPlan.saveVersion('Before regeneration');

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

      const newPlanData = await mealPlanningService.generateMealPlan(
        req.userId,
        planRequest
      );

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
      message: `${scope === 'meal' ? 'Meal' : 'Meal plan'} regenerated successfully`,
      mealPlan
    });
  } catch (error) {
    console.error('Regenerate meal plan error:', error);
    res.status(500).json({ message: 'Server error while regenerating meal plan' });
  }
});

// Restore previous version
router.post('/meal-plan/:id/restore', [
  body('version').isInt({ min: 1 })
], async (req, res) => {
  try {
    const mealPlan = await MealPlan.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!mealPlan) {
      return res.status(404).json({ message: 'Meal plan not found' });
    }

    await mealPlan.restoreVersion(req.body.version);

    res.json({
      message: `Meal plan restored to version ${req.body.version}`,
      mealPlan
    });
  } catch (error) {
    console.error('Restore meal plan error:', error);
    res.status(500).json({ message: 'Server error while restoring meal plan' });
  }
});

// =====================
// RECIPES WITH RAG
// =====================

// Search recipes with RAG
router.get('/recipes/search', async (req, res) => {
  try {
    const {
      query = '',
      dietary,
      cuisine,
      maxCalories,
      maxTime,
      allergies,
      ingredients,
      page = 1,
      limit = 20
    } = req.query;

    // Build filters
    const filters = {
      dietary: dietary ? dietary.split(',') : [],
      cuisine: cuisine ? cuisine.split(',') : [],
      allergies: allergies ? allergies.split(',') : [],
      maxCalories: maxCalories ? parseInt(maxCalories) : null,
      maxTime: maxTime ? parseInt(maxTime) : null
    };

    // Combine query with ingredients if provided
    const searchQuery = ingredients 
      ? `${query} ${ingredients}`.trim()
      : query;

    // Use RAG service for intelligent search
    const recipes = await ragService.searchRecipes(searchQuery, filters);

    res.json({
      recipes,
      query: searchQuery,
      filters,
      count: recipes.length
    });
  } catch (error) {
    console.error('Search recipes error:', error);
    res.status(500).json({ message: 'Server error while searching recipes' });
  }
});

// Generate custom recipe with RAG
router.post('/recipes/generate', verifyToken, async (req, res) => {
  try {
    const {
      mealType,
      cuisine,
      maxCalories,
      maxTime,
      mainIngredients,
      servings = 2
    } = req.body;

    // Get user preferences
    const userPreferences = await UserPreferences.findOne({ userId: req.userId });
    
    if (!userPreferences) {
      return res.status(400).json({ message: 'Please set up your nutrition preferences first' });
    }

    // Generate custom recipe using RAG
    const customRecipe = await ragService.generateCustomRecipe(
      userPreferences,
      {
        mealType,
        cuisine,
        maxCalories,
        maxTime,
        mainIngredients,
        servings
      }
    );

    // Optionally save to database
    if (req.body.save) {
      const recipe = new Recipe({
        ...customRecipe,
        userId: req.userId,
        isCustom: true
      });
      await recipe.save();
      customRecipe._id = recipe._id;
    }

    res.json({
      message: 'Custom recipe generated successfully',
      recipe: customRecipe
    });
  } catch (error) {
    console.error('Generate recipe error:', error);
    res.status(500).json({ message: 'Server error while generating recipe' });
  }
});

// Get ingredient substitutions
router.post('/recipes/substitute', verifyToken, async (req, res) => {
  try {
    const { ingredient, reason = 'preference', recipeId } = req.body;

    if (!ingredient) {
      return res.status(400).json({ message: 'Ingredient name is required' });
    }

    // Get user preferences
    const userPreferences = await UserPreferences.findOne({ userId: req.userId });

    // Generate substitutions using RAG
    const substitutions = await ragService.generateSubstitutions(
      ingredient,
      reason,
      userPreferences || { dietaryPreferences: [], allergies: [] }
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

// Adjust recipe portions with function calling recalculation
router.post('/recipes/:id/adjust', async (req, res) => {
  try {
    const { servings } = req.body;
    
    if (!servings || servings < 1 || servings > 20) {
      return res.status(400).json({ message: 'Invalid serving size (1-20)' });
    }

    const recipe = await Recipe.findById(req.params.id);
    
    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }

    // Use function calling to adjust portions
    const adjustmentResult = await nutritionCalculator.executeFunction('adjust_portions', {
      original_servings: recipe.servings,
      new_servings: servings,
      ingredients: recipe.ingredients,
      nutrition: recipe.nutrition
    });

    // Handle errors from function calling
    if (adjustmentResult._fallback) {
      console.warn('Using fallback calculation for portion adjustment');
    }

    const adjustedRecipe = {
      ...recipe.toObject(),
      servings: adjustmentResult.servings,
      ingredients: adjustmentResult.ingredients,
      nutrition: adjustmentResult.nutrition
    };

    res.json({
      message: 'Recipe adjusted successfully',
      recipe: adjustedRecipe,
      calculation_method: adjustmentResult._method || 'function_calling'
    });
  } catch (error) {
    console.error('Adjust recipe error:', error);
    res.status(500).json({ message: 'Server error while adjusting recipe' });
  }
});

// Calculate nutrition for custom recipe with function calling
router.post('/recipes/calculate-nutrition', verifyToken, async (req, res) => {
  try {
    const { ingredients, servings = 1 } = req.body;

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ message: 'Ingredients array is required' });
    }

    // Use function calling to calculate nutrition
    const nutritionResult = await nutritionCalculator.executeFunction('calculate_nutrition', {
      ingredients,
      servings,
      operation: 'per_serving'
    });

    // Validate the calculated nutrition
    const validation = await nutritionCalculator.executeFunction('validate_nutrition', {
      ...nutritionResult,
      servings
    });

    res.json({
      message: 'Nutrition calculated successfully',
      nutrition: nutritionResult,
      validation,
      calculation_method: nutritionResult._method || 'function_calling',
      fallback_used: nutritionResult._fallback || false
    });
  } catch (error) {
    console.error('Calculate nutrition error:', error);
    res.status(500).json({ message: 'Server error while calculating nutrition' });
  }
});

// Get recipe details
router.get('/recipes/search', async (req, res) => {
  try {
    const {
      query,
      dietary,
      cuisine,
      maxCalories,
      maxTime,
      page = 1,
      limit = 20
    } = req.query;

    const filter = {};
    
    if (query) {
      filter.$or = [
        { title: { $regex: query, $options: 'i' } },
        { 'ingredients.name': { $regex: query, $options: 'i' } }
      ];
    }
    
    if (dietary) {
      const dietaryArray = dietary.split(',');
      if (dietaryArray.includes('vegetarian')) filter['dietaryInfo.isVegetarian'] = true;
      if (dietaryArray.includes('vegan')) filter['dietaryInfo.isVegan'] = true;
      if (dietaryArray.includes('gluten_free')) filter['dietaryInfo.isGlutenFree'] = true;
    }
    
    if (cuisine) {
      filter.cuisine = { $in: cuisine.split(',') };
    }
    
    if (maxCalories) {
      filter['nutrition.calories'] = { $lte: parseInt(maxCalories) };
    }
    
    if (maxTime) {
      filter.cookingTime = { $lte: parseInt(maxTime) };
    }

    const skip = (page - 1) * limit;
    
    const recipes = await Recipe.find(filter)
      .skip(skip)
      .limit(parseInt(limit))
      .select('title cuisine cookingTime nutrition dietaryInfo image');

    const total = await Recipe.countDocuments(filter);

    res.json({
      recipes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Search recipes error:', error);
    res.status(500).json({ message: 'Server error while searching recipes' });
  }
});

// Get recipe details
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

// =====================
// INGREDIENTS
// =====================

// Search ingredients
router.get('/ingredients/search', async (req, res) => {
  try {
    const { query } = req.query;
    
    const filter = query 
      ? { label: { $regex: query, $options: 'i' } }
      : {};
    
    const ingredients = await Ingredient.find(filter)
      .limit(50)
      .select('label unit category nutritionPer100g');

    res.json({ ingredients });
  } catch (error) {
    console.error('Search ingredients error:', error);
    res.status(500).json({ message: 'Server error while searching ingredients' });
  }
});

// =====================
// DATA INITIALIZATION & EMBEDDINGS
// =====================

// Initialize sample data and embeddings
router.post('/init-data', async (req, res) => {
  try {
    // Check if data already exists
    const recipeCount = await Recipe.countDocuments();
    const ingredientCount = await Ingredient.countDocuments();
    
    if (recipeCount >= 500 && ingredientCount >= 500) {
      // Update embeddings for existing recipes
      const embeddingResult = await ragService.updateRecipeEmbeddings();
      
      return res.json({ 
        message: 'Data already initialized, embeddings updated',
        counts: { recipes: recipeCount, ingredients: ingredientCount },
        embeddings: embeddingResult
      });
    }

    // Generate sample recipes if needed
    if (recipeCount < 500) {
      const sampleRecipes = generateSampleRecipes(500 - recipeCount);
      await Recipe.insertMany(sampleRecipes);
    }

    // Generate sample ingredients if needed
    if (ingredientCount < 500) {
      const sampleIngredients = generateSampleIngredients(500 - ingredientCount);
      await Ingredient.insertMany(sampleIngredients);
    }

    const finalCounts = {
      recipes: await Recipe.countDocuments(),
      ingredients: await Ingredient.countDocuments()
    };

    res.json({
      message: 'Sample data initialized successfully',
      counts: finalCounts
    });
  } catch (error) {
    console.error('Init data error:', error);
    res.status(500).json({ message: 'Server error while initializing data' });
  }
});

// Helper functions for generating sample data
function generateSampleRecipes(count) {
  const recipes = [];
  const cuisines = ['italian', 'mexican', 'chinese', 'japanese', 'indian', 'thai', 'greek', 'american'];
  const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
  
  for (let i = 0; i < count; i++) {
    recipes.push({
      title: `Recipe ${i + 1}`,
      cuisine: cuisines[i % cuisines.length],
      mealType: mealTypes[i % mealTypes.length],
      description: `Delicious ${cuisines[i % cuisines.length]} dish`,
      cookingTime: 15 + Math.floor(Math.random() * 45),
      servings: 2 + Math.floor(Math.random() * 3),
      ingredients: [
        { name: 'ingredient1', quantity: 100, unit: 'g' },
        { name: 'ingredient2', quantity: 200, unit: 'ml' }
      ],
      instructions: ['Step 1', 'Step 2', 'Step 3'],
      nutrition: {
        calories: 200 + Math.floor(Math.random() * 600),
        protein: 10 + Math.floor(Math.random() * 40),
        carbs: 20 + Math.floor(Math.random() * 60),
        fat: 5 + Math.floor(Math.random() * 30),
        fiber: Math.floor(Math.random() * 15),
        sodium: 100 + Math.floor(Math.random() * 900),
        servings: 1
      },
      dietaryInfo: {
        isVegetarian: Math.random() > 0.5,
        isVegan: Math.random() > 0.7,
        isGlutenFree: Math.random() > 0.6,
        isDairyFree: Math.random() > 0.6,
        allergens: []
      }
    });
  }
  
  return recipes;
}

function generateSampleIngredients(count) {
  const ingredients = [];
  const categories = ['vegetable', 'fruit', 'protein', 'grain', 'dairy', 'spice', 'oil'];
  const units = ['g', 'ml', 'unit'];
  
  for (let i = 0; i < count; i++) {
    ingredients.push({
      label: `Ingredient ${i + 1}`,
      category: categories[i % categories.length],
      unit: units[i % units.length],
      nutritionPer100g: {
        calories: 50 + Math.floor(Math.random() * 300),
        protein: Math.floor(Math.random() * 30),
        carbs: Math.floor(Math.random() * 50),
        fat: Math.floor(Math.random() * 20),
        fiber: Math.floor(Math.random() * 10),
        sodium: Math.floor(Math.random() * 500)
      },
      commonMeasures: [
        { label: '1 cup', grams: 240 },
        { label: '1 tbsp', grams: 15 }
      ],
      allergens: [],
      substitutes: []
    });
  }
  
  return ingredients;
}

module.exports = router;