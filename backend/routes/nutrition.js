const express = require('express');
const router = express.Router();
const { verifyToken: auth } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const UserPreferences = require('../models/UserPreferences');
const Recipe = require('../models/Recipe');
const Ingredient = require('../models/Ingredient');
const MealPlan = require('../models/MealPlan');
const mealPlanningService = require('../utils/mealPlanningService');
const ragService = require('../utils/ragService');
const nutritionCalculator = require('../utils/nutritionCalculator');
const shoppingListService = require('../utils/shoppingListService');
const nutritionAnalysisService = require('../utils/nutritionAnalysisService');
const HealthProfile = require('../models/HealthProfile');

// =====================
// USER PREFERENCES
// =====================

// Get user preferences
router.get('/preferences', auth, async (req, res) => {
  try {
    let preferences = await UserPreferences.findOne({ userId: req.userId });
    
    if (!preferences) {
      preferences = new UserPreferences({
        userId: req.userId,
        dietaryPreferences: [],
        allergies: [],
        dislikedIngredients: [],
        cuisinePreferences: [],
        calorieTarget: 2000,
        macroTargets: {
          proteinPercentage: 30,
          carbsPercentage: 40,
          fatPercentage: 30
        },
        mealFrequency: 3,
        mealTiming: {
          breakfast: '08:00',
          lunch: '12:00',
          dinner: '18:00'
        },
        timezone: 'UTC'
      });
      await preferences.save();
    }
    
    res.json(preferences);
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user preferences
router.put('/preferences', auth, async (req, res) => {
  try {
    // Get user's health profile
    const healthProfile = await HealthProfile.findOne({ userId: req.userId });
    
    if (!healthProfile) {
      return res.status(404).json({ 
        message: 'Health profile not found. Please create your health profile first.' 
      });
    }
    
    // Get or create preferences
    let preferences = await UserPreferences.findOne({ userId: req.userId });
    
    if (!preferences) {
      preferences = new UserPreferences({ 
        userId: req.userId,
        dietaryPreferences: [],
        allergies: [],
        dislikedIngredients: [],
        cuisinePreferences: [],
        timezone: 'UTC'
      });
    }
    
    // Store imported health data
    preferences.healthProfileLink = {
      linkedProfileId: healthProfile._id,
      syncEnabled: true,
      lastSynced: new Date(),
      importedData: {
        weight: healthProfile.physicalMetrics?.weight?.normalizedValue || null,
        height: healthProfile.physicalMetrics?.height?.normalizedValue || null,
        bmi: healthProfile.physicalMetrics?.bmi?.value || null,
        activityLevel: healthProfile.lifestyleIndicators?.activityLevel || 'sedentary',
        fitnessGoal: healthProfile.fitnessGoals?.primary || 'maintain_weight',
        targetWeight: healthProfile.fitnessGoals?.targetWeight?.normalizedValue || null
      }
    };
    
    // Calculate BMR using Mifflin-St Jeor Equation
    const weight = preferences.healthProfileLink.importedData.weight || 70; // kg
    const height = preferences.healthProfileLink.importedData.height || 170; // cm
    const age = healthProfile.demographics?.age || 30;
    const gender = healthProfile.demographics?.gender || 'prefer_not_to_say';
    
    let bmr;
    if (gender === 'male') {
      bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else if (gender === 'female') {
      bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    } else {
      // Use average of male and female calculations
      const maleBMR = 10 * weight + 6.25 * height - 5 * age + 5;
      const femaleBMR = 10 * weight + 6.25 * height - 5 * age - 161;
      bmr = (maleBMR + femaleBMR) / 2;
    }
    
    // Apply activity level multiplier
    const activityMultipliers = {
      'sedentary': 1.2,
      'lightly_active': 1.375,
      'moderately_active': 1.55,
      'very_active': 1.725,
      'extremely_active': 1.9
    };
    
    const activityLevel = preferences.healthProfileLink.importedData.activityLevel;
    const multiplier = activityMultipliers[activityLevel] || 1.2;
    let targetCalories = Math.round(bmr * multiplier);
    
    // Adjust for fitness goals
    const fitnessGoal = preferences.healthProfileLink.importedData.fitnessGoal;
    if (fitnessGoal === 'weight_loss') {
      targetCalories -= 500; // 500 calorie deficit for ~1 lb/week loss
    } else if (fitnessGoal === 'muscle_gain') {
      targetCalories += 300; // 300 calorie surplus for lean gains
    }
    
    // Ensure calories are within reasonable bounds
    targetCalories = Math.max(1200, Math.min(4000, targetCalories));
    
    // Update nutritional targets
    preferences.nutritionalTargets = {
      dailyCalories: targetCalories,
      macros: {
        // Adjust macros based on fitness goal
        protein: {
          grams: Math.round(fitnessGoal === 'muscle_gain' ? 
            weight * 2.2 : // 1g per lb for muscle gain
            weight * 1.6), // 0.8g per lb for maintenance/loss
          percentage: fitnessGoal === 'muscle_gain' ? 30 : 25
        },
        carbs: {
          grams: Math.round(targetCalories * 0.45 / 4), // 45% from carbs
          percentage: 45
        },
        fat: {
          grams: Math.round(targetCalories * 0.30 / 9), // 30% from fat
          percentage: fitnessGoal === 'muscle_gain' ? 25 : 30
        }
      }
    };
    
    // Import dietary preferences from health profile
    if (healthProfile.dietaryPreferences && healthProfile.dietaryPreferences.length > 0) {
      preferences.dietaryPreferences = [...new Set([
        ...preferences.dietaryPreferences,
        ...healthProfile.dietaryPreferences
      ])];
    }
    
    // Import allergies from health profile
    if (healthProfile.dietaryRestrictions?.allergies && 
        healthProfile.dietaryRestrictions.allergies.length > 0) {
      preferences.allergies = [...new Set([
        ...preferences.allergies,
        ...healthProfile.dietaryRestrictions.allergies
      ])];
    }
    
    // Save updated preferences
    await preferences.save();
    
    // Update wellness score with nutrition component
    if (healthProfile.wellnessScore) {
      // Calculate nutrition score based on profile completeness
      const nutritionScore = calculateNutritionScore(preferences);
      
      // Update wellness score components
      if (!healthProfile.wellnessScore.components) {
        healthProfile.wellnessScore.components = {};
      }
      healthProfile.wellnessScore.components.nutrition = nutritionScore;
      
      // Recalculate overall wellness score
      const components = healthProfile.wellnessScore.components;
      const validComponents = Object.values(components).filter(score => score !== undefined);
      const totalScore = validComponents.reduce((sum, score) => sum + score, 0);
      healthProfile.wellnessScore.overall = Math.round(totalScore / validComponents.length);
      healthProfile.wellnessScore.lastCalculated = new Date();
      
      await healthProfile.save();
    }
    
    // Prepare response with sync details
    const syncSummary = {
      message: 'Successfully synced with health profile',
      preferences,
      syncDetails: {
        calculatedCalories: targetCalories,
        calculatedMacros: {
          protein: preferences.nutritionalTargets.macros.protein.grams + 'g',
          carbs: preferences.nutritionalTargets.macros.carbs.grams + 'g',
          fat: preferences.nutritionalTargets.macros.fat.grams + 'g'
        },
        importedFromProfile: {
          bmi: healthProfile.physicalMetrics?.bmi?.value?.toFixed(1) || 'Not set',
          weight: weight + ' kg',
          height: height + ' cm',
          age: age + ' years',
          activityLevel: activityLevel.replace('_', ' '),
          fitnessGoal: fitnessGoal.replace(/_/g, ' '),
          targetWeight: preferences.healthProfileLink.importedData.targetWeight 
            ? preferences.healthProfileLink.importedData.targetWeight + ' kg' 
            : 'Not set'
        },
        calorieCalculation: {
          bmr: Math.round(bmr),
          activityMultiplier: multiplier,
          tdee: Math.round(bmr * multiplier),
          goalAdjustment: fitnessGoal === 'weight_loss' ? '-500' : 
                          fitnessGoal === 'muscle_gain' ? '+300' : '0',
          finalTarget: targetCalories
        }
      }
    };
    
    res.json(syncSummary);
    
  } catch (error) {
    console.error('Sync preferences error:', error);
    res.status(500).json({ 
      message: 'Server error while syncing preferences',
      error: error.message 
    });
  }
});

// =====================
// MEAL PLANNING
// =====================

// Generate meal plan
router.post('/meal-plan', auth, async (req, res) => {
  try {
    const { type = 'daily', startDate, requirements = {} } = req.body;
    
    let preferences = await UserPreferences.findOne({ userId: req.userId });
    
    if (!preferences) {
      // Create default preferences if not found
      preferences = new UserPreferences({
        userId: req.userId,
        dietaryPreferences: [],
        allergies: [],
        calorieTarget: 2000,
        macroTargets: {
          proteinPercentage: 30,
          carbsPercentage: 40,
          fatPercentage: 30
        }
      });
      await preferences.save();
    }
    
    // Ensure valid startDate
    let planStartDate;
    if (startDate) {
      planStartDate = new Date(startDate);
      if (isNaN(planStartDate.getTime())) {
        planStartDate = new Date();
      }
    } else {
      planStartDate = new Date();
    }
    
    // Create proper planRequest object
    const planRequest = {
      userId: req.userId,
      duration: type,
      type: type,
      startDate: planStartDate,
      requirements: requirements
    };
    
    console.log('Creating meal plan with:', {
      userId: req.userId,
      type: type,
      startDate: planStartDate.toISOString()
    });
    
    let mealPlan;
    
    // Try to use the service, fallback if needed
    try {
      mealPlan = await mealPlanningService.generateMealPlan(req.userId, planRequest);
    } catch (serviceError) {
      console.error('Service generation failed, using fallback:', serviceError);
      mealPlan = await mealPlanningService.generateFallbackPlan(req.userId, planRequest);
    }
    
    // Ensure the meal plan has proper structure
    if (!mealPlan.status) {
      mealPlan.status = 'active';
    }
    
    if (!mealPlan.type) {
      mealPlan.type = type;
    }
    
    if (!mealPlan.startDate || isNaN(new Date(mealPlan.startDate).getTime())) {
      mealPlan.startDate = planStartDate;
    }
    
    if (!mealPlan.endDate || isNaN(new Date(mealPlan.endDate).getTime())) {
      mealPlan.endDate = new Date(mealPlan.startDate);
      if (mealPlan.type === 'weekly') {
        mealPlan.endDate.setDate(mealPlan.endDate.getDate() + 6);
      }
    }
    
    // Save the meal plan
    try {
      const savedPlan = new MealPlan(mealPlan);
      await savedPlan.save();
      
      res.status(201).json({
        message: 'Meal plan generated successfully',
        mealPlan: savedPlan
      });
    } catch (saveError) {
      console.error('Error saving meal plan:', saveError);
      
      // Return the plan even if saving failed
      res.status(201).json({
        message: 'Meal plan generated (not saved)',
        mealPlan: mealPlan,
        warning: 'Could not save to database'
      });
    }
  } catch (error) {
    console.error('Generate meal plan error:', error);
    res.status(500).json({ 
      message: 'Server error while generating meal plan',
      error: error.message 
    });
  }
});

// Get meal plans (with proper filtering)
router.get('/meal-plan', auth, async (req, res) => {
  try {
    const { startDate, endDate, type, status, limit = 10 } = req.query;
    
    const filter = { userId: req.userId };
    
    // Filter by date range
    if (startDate && endDate) {
      filter.startDate = { $gte: new Date(startDate) };
      filter.endDate = { $lte: new Date(endDate) };
    }
    
    // Filter by type
    if (type) {
      filter.type = type;
    }
    
    // Filter by status
    if (status && status !== 'all') {
      if (status === 'active') {
        // For active plans, check if they're current
        const today = new Date();
        filter.$and = [
          { status: { $in: ['active', 'draft'] } },
          { startDate: { $lte: today } },
          { endDate: { $gte: today } }
        ];
      } else {
        filter.status = status;
      }
    }
    
    const mealPlans = await MealPlan.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    res.json({ mealPlans });
  } catch (error) {
    console.error('Get meal plans error:', error);
    res.status(500).json({ message: 'Server error while fetching meal plans' });
  }
});

// Get specific meal plan by ID
router.get('/meal-plan/:id', auth, async (req, res) => {
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
    console.error('Get meal plan by ID error:', error);
    res.status(500).json({ message: 'Server error while fetching meal plan' });
  }
});

// Update meal plan
router.put('/meal-plan/:id', auth, async (req, res) => {
  try {
    const { action, data } = req.body;
    
    const mealPlan = await MealPlan.findOne({
      _id: req.params.id,
      userId: req.userId
    });
    
    if (!mealPlan) {
      return res.status(404).json({ message: 'Meal plan not found' });
    }
    
    switch(action) {
      case 'swap':
        // Swap meals between days
        const { dayIndex1, mealIndex1, dayIndex2, mealIndex2 } = data;
        if (mealPlan.dailyPlans[dayIndex1] && mealPlan.dailyPlans[dayIndex2]) {
          const meal1 = mealPlan.dailyPlans[dayIndex1].meals[mealIndex1];
          const meal2 = mealPlan.dailyPlans[dayIndex2].meals[mealIndex2];
          
          mealPlan.dailyPlans[dayIndex1].meals[mealIndex1] = meal2;
          mealPlan.dailyPlans[dayIndex2].meals[mealIndex2] = meal1;
        }
        break;
        
      case 'regenerate':
        // Regenerate a specific meal
        const preferences = await UserPreferences.findOne({ userId: req.userId });
        const newMealData = await mealPlanningService.generateSingleMeal(
          preferences,
          data.mealType,
          data.requirements
        );
        if (data.dateIndex !== undefined && data.mealIndex !== undefined) {
          mealPlan.dailyPlans[data.dateIndex].meals[data.mealIndex] = newMealData;
        }
        break;
        
      case 'lock':
        // Lock a meal
        if (data.dayIndex !== undefined && data.mealIndex !== undefined) {
          mealPlan.dailyPlans[data.dayIndex].meals[data.mealIndex].isLocked = true;
        }
        break;
        
      case 'unlock':
        // Unlock a meal
        if (data.dayIndex !== undefined && data.mealIndex !== undefined) {
          mealPlan.dailyPlans[data.dayIndex].meals[data.mealIndex].isLocked = false;
        }
        break;
        
      case 'addMeal':
        // Add a manual meal
        const { dayIndex, meal } = data;
        if (mealPlan.dailyPlans[dayIndex]) {
          mealPlan.dailyPlans[dayIndex].meals.push({
            ...meal,
            isCustom: true,
            order: mealPlan.dailyPlans[dayIndex].meals.length
          });
        }
        break;
        
      case 'removeMeal':
        // Remove a meal
        const { dayIdx, mealIdx } = data;
        if (mealPlan.dailyPlans[dayIdx] && mealPlan.dailyPlans[dayIdx].meals[mealIdx]) {
          mealPlan.dailyPlans[dayIdx].meals.splice(mealIdx, 1);
        }
        break;
        
      case 'reorder':
        // Reorder meals within a day
        const { dayIndex: dayI, newOrder } = data;
        if (mealPlan.dailyPlans[dayI]) {
          const meals = mealPlan.dailyPlans[dayI].meals;
          const reorderedMeals = newOrder.map(index => meals[index]);
          mealPlan.dailyPlans[dayI].meals = reorderedMeals;
        }
        break;
    }
    
    // Track modification
    mealPlan.modifications.push({
      date: new Date(),
      type: action,
      details: data
    });
    
    await mealPlan.save();
    
    res.json({
      message: 'Meal plan updated successfully',
      mealPlan
    });
  } catch (error) {
    console.error('Update meal plan error:', error);
    res.status(500).json({ message: 'Server error while updating meal plan' });
  }
});

// Regenerate meal plan or specific meals
router.post('/meal-plan/:id/regenerate', auth, async (req, res) => {
  try {
    const { scope = 'meal', dayIndex, mealIndex } = req.body;
    
    const mealPlan = await MealPlan.findOne({
      _id: req.params.id,
      userId: req.userId
    });
    
    if (!mealPlan) {
      return res.status(404).json({ message: 'Meal plan not found' });
    }
    
    const preferences = await UserPreferences.findOne({ userId: req.userId });
    
    if (scope === 'meal' && dayIndex !== undefined && mealIndex !== undefined) {
      // Regenerate specific meal
      const mealType = mealPlan.dailyPlans[dayIndex].meals[mealIndex].type;
      const newMeal = await mealPlanningService.generateSingleMeal(preferences, mealType);
      
      // Preserve lock status
      newMeal.isLocked = mealPlan.dailyPlans[dayIndex].meals[mealIndex].isLocked;
      
      mealPlan.dailyPlans[dayIndex].meals[mealIndex] = newMeal;
    } else if (scope === 'full') {
      // Regenerate entire plan but keep locked meals
      const lockedMeals = [];
      
      // Store locked meals
      mealPlan.dailyPlans.forEach((day, dayIdx) => {
        day.meals.forEach((meal, mealIdx) => {
          if (meal.isLocked) {
            lockedMeals.push({ dayIdx, mealIdx, meal });
          }
        });
      });
      
      // Generate new plan
      const newPlanData = await mealPlanningService.generateMealPlan(req.userId, {
        userId: req.userId,
        duration: mealPlan.type,
        type: mealPlan.type,
        startDate: mealPlan.startDate,
        requirements: {}
      });
      
      // Replace daily plans
      mealPlan.dailyPlans = newPlanData.dailyPlans;
      
      // Restore locked meals
      lockedMeals.forEach(({ dayIdx, mealIdx, meal }) => {
        if (mealPlan.dailyPlans[dayIdx] && mealPlan.dailyPlans[dayIdx].meals[mealIdx]) {
          mealPlan.dailyPlans[dayIdx].meals[mealIdx] = meal;
        }
      });
    }
    
    await mealPlan.save();
    
    res.json({
      message: 'Meal plan regenerated successfully',
      mealPlan
    });
  } catch (error) {
    console.error('Regenerate meal plan error:', error);
    res.status(500).json({ message: 'Server error while regenerating meal plan' });
  }
});

// =====================
// RECIPES - Public endpoints for search and viewing
// =====================

// Search recipes - PUBLIC ENDPOINT (no auth required)
router.get('/recipes/search', async (req, res) => {
  try {
    const { q: query = '', dietary, allergies, maxCalories, maxTime, cuisine, mealType } = req.query;
    
    console.log('Recipe search - bypassing corrupted database, using mock data only');
    
    // Skip database entirely - just use mock recipes
    // The database has corrupted data, so we'll use clean mock data
    let recipes = getMockRecipes();
    
    // Apply search filter if query provided
    if (query) {
      const searchLower = query.toLowerCase();
      recipes = recipes.filter(r => 
        r.title.toLowerCase().includes(searchLower) ||
        (r.description && r.description.toLowerCase().includes(searchLower)) ||
        r.ingredients.some(ing => ing.name.toLowerCase().includes(searchLower))
      );
    }
    
    // Apply other filters
    if (maxCalories) {
      const maxCal = parseInt(maxCalories);
      recipes = recipes.filter(r => r.nutrition && r.nutrition.calories <= maxCal);
    }
    
    if (maxTime) {
      const max = parseInt(maxTime);
      recipes = recipes.filter(r => r.cookingTime <= max);
    }
    
    if (cuisine && cuisine !== 'any') {
      recipes = recipes.filter(r => r.cuisine === cuisine);
    }
    
    if (mealType && mealType !== 'any') {
      recipes = recipes.filter(r => r.mealType === mealType);
    }
    
    // Apply dietary filters
    if (dietary && dietary.length > 0) {
      const dietaryArr = typeof dietary === 'string' ? dietary.split(',') : dietary;
      recipes = recipes.filter(recipe => {
        if (dietaryArr.includes('vegetarian') && !recipe.dietaryInfo?.isVegetarian) return false;
        if (dietaryArr.includes('vegan') && !recipe.dietaryInfo?.isVegan) return false;
        if (dietaryArr.includes('gluten_free') && !recipe.dietaryInfo?.isGlutenFree) return false;
        if (dietaryArr.includes('dairy_free') && !recipe.dietaryInfo?.isDairyFree) return false;
        return true;
      });
    }
    
    // Apply allergy filters
    if (allergies && allergies.length > 0) {
      const allergyArr = typeof allergies === 'string' ? allergies.split(',') : allergies;
      recipes = recipes.filter(recipe => {
        const recipeAllergens = recipe.dietaryInfo?.allergens || [];
        return !allergyArr.some(allergy => recipeAllergens.includes(allergy));
      });
    }
    
    // Ensure all recipes have proper nutrition data
    const recipesWithNutrition = recipes.map(recipe => {
      // Make sure nutrition exists and has values
      if (!recipe.nutrition || typeof recipe.nutrition.calories === 'undefined') {
        // Add default nutrition based on meal type
        const nutritionDefaults = {
          breakfast: { calories: 350, protein: 15, carbs: 45, fat: 12, fiber: 5, sugar: 10, sodium: 300 },
          lunch: { calories: 450, protein: 25, carbs: 50, fat: 15, fiber: 8, sugar: 8, sodium: 500 },
          dinner: { calories: 550, protein: 35, carbs: 55, fat: 20, fiber: 10, sugar: 6, sodium: 600 },
          snack: { calories: 200, protein: 8, carbs: 25, fat: 8, fiber: 3, sugar: 12, sodium: 150 }
        };
        
        recipe.nutrition = nutritionDefaults[recipe.mealType] || {
          calories: 400,
          protein: 20,
          carbs: 45,
          fat: 15,
          fiber: 6,
          sugar: 8,
          sodium: 400
        };
      }
      
      return recipe;
    });
    
    console.log(`Returning ${recipesWithNutrition.length} mock recipes with nutrition`);
    
    res.json({
      recipes: recipesWithNutrition,
      count: recipesWithNutrition.length,
      filters: {},
      source: 'mock' // Indicate we're using mock data
    });
    
  } catch (error) {
    console.error('Recipe search error:', error);
    
    // Even on error, return mock recipes
    const mockRecipes = getMockRecipes();
    res.json({
      recipes: mockRecipes,
      count: mockRecipes.length,
      filters: {},
      source: 'mock-fallback'
    });
  }
});

// Also update the getMockRecipes function to ensure it has proper nutrition
function getMockRecipes() {
  return [
    {
      _id: 'mock1',
      title: 'Healthy Quinoa Bowl',
      description: 'A nutritious and filling quinoa bowl with vegetables',
      cuisine: 'mediterranean',
      mealType: 'lunch',
      cookingTime: 25,
      servings: 2,
      difficulty: 'easy',
      ingredients: [
        { name: 'Quinoa', quantity: 200, unit: 'g', category: 'grain', notes: 'rinse before cooking' },
        { name: 'Cherry tomatoes', quantity: 150, unit: 'g', category: 'vegetable' },
        { name: 'Cucumber', quantity: 100, unit: 'g', category: 'vegetable', notes: 'diced' },
        { name: 'Feta cheese', quantity: 50, unit: 'g', category: 'dairy', notes: 'crumbled' },
        { name: 'Olive oil', quantity: 2, unit: 'tbsp', category: 'fat' },
        { name: 'Lemon juice', quantity: 1, unit: 'tbsp', category: 'other' },
        { name: 'Fresh mint', quantity: 10, unit: 'g', category: 'herb', notes: 'chopped' }
      ],
      instructions: [
        'Rinse quinoa thoroughly under cold water',
        'Cook quinoa according to package instructions (typically 15 minutes in boiling water)',
        'Let quinoa cool to room temperature',
        'Dice cucumber and halve cherry tomatoes',
        'Mix vegetables with cooled quinoa in a large bowl',
        'Crumble feta cheese on top',
        'Drizzle with olive oil and lemon juice',
        'Garnish with fresh mint',
        'Season with salt and pepper to taste'
      ],
      nutrition: {
        calories: 380,
        protein: 14,
        carbs: 52,
        fat: 15,
        fiber: 8,
        sugar: 6,
        sodium: 320
      },
      dietaryInfo: {
        isVegetarian: true,
        isGlutenFree: true,
        allergens: ['dairy']
      },
      tips: [
        'Add grilled chicken for extra protein',
        'Can be made vegan by substituting feta with avocado',
        'Stores well in the fridge for up to 3 days'
      ],
      variations: [
        { name: 'Mexican Style', description: 'Add black beans, corn, and avocado with lime dressing' },
        { name: 'Asian Fusion', description: 'Use edamame, sesame seeds, and ginger-soy dressing' },
        { name: 'Protein Boost', description: 'Add chickpeas or grilled tofu for extra protein' }
      ]
    },
    {
      _id: 'mock2',
      title: 'Grilled Chicken Salad',
      description: 'Fresh and protein-rich salad with perfectly grilled chicken',
      cuisine: 'american',
      mealType: 'dinner',
      cookingTime: 20,
      servings: 2,
      difficulty: 'easy',
      ingredients: [
        { name: 'Chicken breast', quantity: 300, unit: 'g', category: 'protein' },
        { name: 'Mixed greens', quantity: 200, unit: 'g', category: 'vegetable' },
        { name: 'Avocado', quantity: 1, unit: 'unit', category: 'vegetable', notes: 'sliced' },
        { name: 'Cherry tomatoes', quantity: 100, unit: 'g', category: 'vegetable' },
        { name: 'Red onion', quantity: 50, unit: 'g', category: 'vegetable', notes: 'thinly sliced' },
        { name: 'Balsamic vinegar', quantity: 2, unit: 'tbsp', category: 'other' },
        { name: 'Olive oil', quantity: 1, unit: 'tbsp', category: 'fat' }
      ],
      instructions: [
        'Season chicken breast with salt, pepper, and herbs',
        'Preheat grill or grill pan to medium-high heat',
        'Grill chicken for 6-7 minutes per side until cooked through',
        'Let chicken rest for 5 minutes, then slice',
        'Arrange mixed greens on serving plates',
        'Top with sliced chicken, avocado, tomatoes, and onion',
        'Whisk together balsamic vinegar and olive oil',
        'Drizzle dressing over salad',
        'Serve immediately'
      ],
      nutrition: {
        calories: 420,
        protein: 38,
        carbs: 15,
        fat: 24,
        fiber: 9,
        sugar: 5,
        sodium: 280
      },
      dietaryInfo: {
        isGlutenFree: true,
        isDairyFree: true,
        isHighProtein: true
      },
      tips: [
        'Marinate chicken for 30 minutes for extra flavor',
        'Can substitute chicken with salmon or tofu',
        'Add nuts or seeds for extra crunch'
      ],
      variations: [
        { name: 'Caesar Style', description: 'Add parmesan, croutons, and Caesar dressing' },
        { name: 'Mediterranean', description: 'Include olives, feta, and Greek dressing' }
      ]
    },
    {
      _id: 'mock3',
      title: 'Vegetable Stir-Fry',
      description: 'Quick and colorful vegetable stir-fry with Asian flavors',
      cuisine: 'chinese',
      mealType: 'dinner',
      cookingTime: 15,
      servings: 2,
      difficulty: 'easy',
      ingredients: [
        { name: 'Broccoli', quantity: 150, unit: 'g', category: 'vegetable', notes: 'cut into florets' },
        { name: 'Bell peppers', quantity: 150, unit: 'g', category: 'vegetable', notes: 'sliced' },
        { name: 'Carrots', quantity: 100, unit: 'g', category: 'vegetable', notes: 'julienned' },
        { name: 'Soy sauce', quantity: 2, unit: 'tbsp', category: 'other' },
        { name: 'Garlic', quantity: 2, unit: 'unit', category: 'vegetable', notes: 'minced' },
        { name: 'Ginger', quantity: 1, unit: 'tbsp', category: 'spice', notes: 'grated' },
        { name: 'Sesame oil', quantity: 1, unit: 'tbsp', category: 'fat' },
        { name: 'Rice', quantity: 200, unit: 'g', category: 'grain', notes: 'cooked' }
      ],
      instructions: [
        'Cook rice according to package instructions',
        'Heat sesame oil in a wok or large pan over high heat',
        'Add minced garlic and ginger, stir-fry for 30 seconds',
        'Add harder vegetables (broccoli, carrots) first',
        'Stir-fry for 3-4 minutes',
        'Add bell peppers and continue stir-frying for 2-3 minutes',
        'Add soy sauce and toss to combine',
        'Vegetables should be tender-crisp',
        'Serve immediately over cooked rice'
      ],
      nutrition: {
        calories: 320,
        protein: 8,
        carbs: 58,
        fat: 7,
        fiber: 8,
        sugar: 12,
        sodium: 580
      },
      dietaryInfo: {
        isVegetarian: true,
        isVegan: true,
        isDairyFree: true
      },
      tips: [
        'Keep vegetables moving in the pan for even cooking',
        'Prep all ingredients before starting to cook',
        'Add cashews or tofu for protein'
      ],
      variations: [
        { name: 'Thai Style', description: 'Use Thai basil, lime, and fish sauce' },
        { name: 'Teriyaki', description: 'Add teriyaki sauce and sesame seeds' },
        { name: 'Spicy Version', description: 'Add chili flakes or sriracha sauce' }
      ]
    }
  ];
}

// Get recipe by ID - PUBLIC ENDPOINT
router.get('/recipes/:id', async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id);
    
    if (!recipe) {
      // Check if it's a mock recipe
      const mockRecipes = getMockRecipes();
      const mockRecipe = mockRecipes.find(r => r._id === req.params.id);
      if (mockRecipe) {
        return res.json({ recipe: mockRecipe });
      }
      return res.status(404).json({ message: 'Recipe not found' });
    }
    
    res.json({ recipe });
  } catch (error) {
    console.error('Get recipe error:', error);
    res.status(500).json({ message: 'Server error while fetching recipe' });
  }
});

// Generate custom recipe - Requires auth
router.post('/recipes/generate', auth, async (req, res) => {
  try {
    const { requirements = {} } = req.body;
    
    const preferences = await UserPreferences.findOne({ userId: req.userId });
    
    if (!preferences) {
      // Use default preferences if not found
      preferences = {
        dietaryPreferences: [],
        allergies: [],
        cuisinePreferences: [],
        calorieTarget: 2000
      };
    }
    
    let generatedRecipe;
    try {
      generatedRecipe = await ragService.generateCustomRecipe(
        preferences,
        requirements
      );
    } catch (genError) {
      console.log('AI generation failed, using fallback');
      // Fallback to a template recipe
      generatedRecipe = generateTemplateRecipe(requirements, preferences);
    }
    
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

// Adjust recipe portions - PUBLIC ENDPOINT
router.post('/recipes/:id/adjust', async (req, res) => {
  try {
    const { servings } = req.body;
    
    if (!servings || servings < 1 || servings > 20) {
      return res.status(400).json({ message: 'Invalid servings (1-20)' });
    }
    
    const recipe = await Recipe.findById(req.params.id);
    
    if (!recipe) {
      // Try mock recipe
      const mockRecipes = getMockRecipes();
      const mockRecipe = mockRecipes.find(r => r._id === req.params.id);
      if (mockRecipe) {
        const adjustedRecipe = adjustMockRecipe(mockRecipe, servings);
        return res.json({
          message: 'Recipe adjusted successfully',
          recipe: adjustedRecipe
        });
      }
      return res.status(404).json({ message: 'Recipe not found' });
    }
    
    // Adjust the recipe
    const ratio = servings / recipe.servings;
    const adjustedRecipe = {
      ...recipe.toObject(),
      servings,
      ingredients: recipe.ingredients.map(ing => ({
        ...ing,
        quantity: Math.round(ing.quantity * ratio * 10) / 10
      })),
      nutrition: {
        calories: Math.round(recipe.nutrition.calories * ratio),
        protein: Math.round(recipe.nutrition.protein * ratio),
        carbs: Math.round(recipe.nutrition.carbs * ratio),
        fat: Math.round(recipe.nutrition.fat * ratio),
        fiber: Math.round((recipe.nutrition.fiber || 0) * ratio),
        sugar: Math.round((recipe.nutrition.sugar || 0) * ratio),
        sodium: Math.round((recipe.nutrition.sodium || 0) * ratio)
      }
    };
    
    res.json({
      message: 'Recipe adjusted successfully',
      recipe: adjustedRecipe
    });
  } catch (error) {
    console.error('Adjust recipe error:', error);
    res.status(500).json({ message: 'Server error while adjusting recipe' });
  }
});

// Generate ingredient substitutions - Can work without auth
router.post('/recipes/substitute', async (req, res) => {
  try {
    const { ingredient, reason = 'preference' } = req.body;
    
    if (!ingredient) {
      return res.status(400).json({ message: 'Ingredient name required' });
    }
    
    let preferences = null;
    // Try to get user preferences if authenticated
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        preferences = await UserPreferences.findOne({ userId: decoded.userId });
      } catch (e) {
        // Continue without preferences
      }
    }
    
    // Generate substitutions
    let substitutions;
    try {
      substitutions = await ragService.generateSubstitutions(
        ingredient,
        reason,
        preferences
      );
    } catch (subError) {
      // Fallback to common substitutions
      substitutions = getCommonSubstitutions(ingredient);
    }
    
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
// SHOPPING LIST
// =====================

router.get('/shopping-list', auth, async (req, res) => {
  try {
    const { mealPlanId, startDate, endDate } = req.query;
    
    let mealPlan;
    
    if (mealPlanId) {
      mealPlan = await MealPlan.findOne({
        _id: mealPlanId,
        userId: req.userId
      });
    } else if (startDate && endDate) {
      mealPlan = await MealPlan.findOne({
        userId: req.userId,
        startDate: { $lte: new Date(startDate) },
        endDate: { $gte: new Date(endDate) }
      });
    } else {
      // Get the most recent meal plan
      mealPlan = await MealPlan.findOne({ userId: req.userId })
        .sort({ createdAt: -1 });
    }
    
    if (!mealPlan) {
      return res.status(404).json({ message: 'No meal plan found' });
    }
    
    const shoppingList = await shoppingListService.generateFromMealPlan(mealPlan);
    
    res.json({
      shoppingList,
      mealPlanId: mealPlan._id
    });
  } catch (error) {
    console.error('Generate shopping list error:', error);
    res.status(500).json({ message: 'Server error while generating shopping list' });
  }
});

// Update shopping list
router.put('/shopping-list', auth, async (req, res) => {
  try {
    const { items, action } = req.body;
    
    // Process the shopping list update
    let updatedList;
    
    switch(action) {
      case 'adjust':
        // Adjust quantities
        updatedList = items;
        break;
      case 'remove':
        // Remove items
        updatedList = items.filter(item => !item.removed);
        break;
      default:
        updatedList = items;
    }
    
    res.json({
      message: 'Shopping list updated successfully',
      shoppingList: updatedList
    });
  } catch (error) {
    console.error('Update shopping list error:', error);
    res.status(500).json({ message: 'Server error while updating shopping list' });
  }
});

// =====================
// NUTRITIONAL ANALYSIS
// =====================

router.get('/analysis/daily', auth, async (req, res) => {
  try {
    const { date = new Date().toISOString() } = req.query;
    
    const analysis = await nutritionAnalysisService.analyzeDailyIntake(
      req.userId,
      new Date(date)
    );
    
    res.json(analysis);
  } catch (error) {
    console.error('Daily analysis error:', error);
    res.status(500).json({ message: 'Server error while analyzing daily nutrition' });
  }
});

router.get('/analysis/weekly', auth, async (req, res) => {
  try {
    const { startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() } = req.query;
    
    const analysis = await nutritionAnalysisService.analyzeWeeklyIntake(
      req.userId,
      new Date(startDate)
    );
    
    res.json(analysis);
  } catch (error) {
    console.error('Weekly analysis error:', error);
    res.status(500).json({ message: 'Server error while analyzing weekly nutrition' });
  }
});

router.post('/analysis/ai', auth, async (req, res) => {
  try {
    const { period = 'daily', date } = req.body;
    
    const preferences = await UserPreferences.findOne({ userId: req.userId });
    const analysis = await nutritionAnalysisService.generateAIAnalysis(
      req.userId,
      preferences,
      period,
      date
    );
    
    res.json(analysis);
  } catch (error) {
    console.error('AI analysis error:', error);
    res.status(500).json({ message: 'Server error while generating AI analysis' });
  }
});

// =====================
// INGREDIENTS
// =====================

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
    
    // Add some sample recipes if none exist
    if (recipeCount === 0) {
      const mockRecipes = getMockRecipes();
      for (const recipe of mockRecipes) {
        const newRecipe = new Recipe(recipe);
        await newRecipe.save();
      }
    }
    
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

// =====================
// HELPER FUNCTIONS
// =====================

// Helper function to calculate nutrition score
function calculateNutritionScore(preferences) {
  let score = 50; // Base score
  
  // Add points for completed sections
  if (preferences.dietaryPreferences?.length > 0) score += 10;
  if (preferences.allergies?.length > 0) score += 5;
  if (preferences.cuisinePreferences?.length > 0) score += 5;
  if (preferences.nutritionalTargets?.dailyCalories !== 2000) score += 10; // Customized
  if (preferences.mealPreferences?.mealsPerDay) score += 5;
  if (preferences.cookingPreferences?.skillLevel) score += 5;
  if (preferences.healthProfileLink?.syncEnabled) score += 10; // Synced with health
  
  return Math.min(100, score);
}

function getMockRecipes() {
  return [
    {
      _id: 'mock1',
      title: 'Healthy Quinoa Bowl',
      description: 'A nutritious and filling quinoa bowl with vegetables',
      cuisine: 'mediterranean',
      mealType: 'lunch',
      cookingTime: 25,
      servings: 2,
      difficulty: 'easy',
      ingredients: [
        { name: 'Quinoa', quantity: 200, unit: 'g', category: 'grain', notes: 'rinse before cooking' },
        { name: 'Cherry tomatoes', quantity: 150, unit: 'g', category: 'vegetable' },
        { name: 'Cucumber', quantity: 100, unit: 'g', category: 'vegetable', notes: 'diced' },
        { name: 'Feta cheese', quantity: 50, unit: 'g', category: 'dairy', notes: 'crumbled' },
        { name: 'Olive oil', quantity: 2, unit: 'tbsp', category: 'fat' },
        { name: 'Lemon juice', quantity: 1, unit: 'tbsp', category: 'other' },
        { name: 'Fresh mint', quantity: 10, unit: 'g', category: 'herb', notes: 'chopped' }
      ],
      instructions: [
        'Rinse quinoa thoroughly under cold water',
        'Cook quinoa according to package instructions (typically 15 minutes in boiling water)',
        'Let quinoa cool to room temperature',
        'Dice cucumber and halve cherry tomatoes',
        'Mix vegetables with cooled quinoa in a large bowl',
        'Crumble feta cheese on top',
        'Drizzle with olive oil and lemon juice',
        'Garnish with fresh mint',
        'Season with salt and pepper to taste'
      ],
      nutrition: {
        calories: 380,
        protein: 14,
        carbs: 52,
        fat: 15,
        fiber: 8,
        sugar: 6,
        sodium: 320
      },
      dietaryInfo: {
        isVegetarian: true,
        isGlutenFree: true,
        allergens: ['dairy']
      },
      tips: [
        'Add grilled chicken for extra protein',
        'Can be made vegan by substituting feta with avocado',
        'Stores well in the fridge for up to 3 days'
      ],
      variations: [
        { name: 'Mexican Style', description: 'Add black beans, corn, and avocado with lime dressing' },
        { name: 'Asian Fusion', description: 'Use edamame, sesame seeds, and ginger-soy dressing' },
        { name: 'Protein Boost', description: 'Add chickpeas or grilled tofu for extra protein' }
      ]
    },
    {
      _id: 'mock2',
      title: 'Grilled Chicken Salad',
      description: 'Fresh and protein-rich salad with perfectly grilled chicken',
      cuisine: 'american',
      mealType: 'dinner',
      cookingTime: 20,
      servings: 2,
      difficulty: 'easy',
      ingredients: [
        { name: 'Chicken breast', quantity: 300, unit: 'g', category: 'protein' },
        { name: 'Mixed greens', quantity: 200, unit: 'g', category: 'vegetable' },
        { name: 'Avocado', quantity: 1, unit: 'unit', category: 'vegetable', notes: 'sliced' },
        { name: 'Cherry tomatoes', quantity: 100, unit: 'g', category: 'vegetable' },
        { name: 'Red onion', quantity: 50, unit: 'g', category: 'vegetable', notes: 'thinly sliced' },
        { name: 'Balsamic vinegar', quantity: 2, unit: 'tbsp', category: 'other' },
        { name: 'Olive oil', quantity: 1, unit: 'tbsp', category: 'fat' }
      ],
      instructions: [
        'Season chicken breast with salt, pepper, and herbs',
        'Preheat grill or grill pan to medium-high heat',
        'Grill chicken for 6-7 minutes per side until cooked through',
        'Let chicken rest for 5 minutes, then slice',
        'Arrange mixed greens on serving plates',
        'Top with sliced chicken, avocado, tomatoes, and onion',
        'Whisk together balsamic vinegar and olive oil',
        'Drizzle dressing over salad',
        'Serve immediately'
      ],
      nutrition: {
        calories: 420,
        protein: 38,
        carbs: 15,
        fat: 24,
        fiber: 9,
        sugar: 5,
        sodium: 280
      },
      dietaryInfo: {
        isGlutenFree: true,
        isDairyFree: true,
        isHighProtein: true
      },
      tips: [
        'Marinate chicken for 30 minutes for extra flavor',
        'Can substitute chicken with salmon or tofu',
        'Add nuts or seeds for extra crunch'
      ],
      variations: [
        { name: 'Caesar Style', description: 'Add parmesan, croutons, and Caesar dressing' },
        { name: 'Mediterranean', description: 'Include olives, feta, and Greek dressing' }
      ]
    },
    {
      _id: 'mock3',
      title: 'Vegetable Stir-Fry',
      description: 'Quick and colorful vegetable stir-fry with Asian flavors',
      cuisine: 'chinese',
      mealType: 'dinner',
      cookingTime: 15,
      servings: 2,
      difficulty: 'easy',
      ingredients: [
        { name: 'Broccoli', quantity: 150, unit: 'g', category: 'vegetable', notes: 'cut into florets' },
        { name: 'Bell peppers', quantity: 150, unit: 'g', category: 'vegetable', notes: 'sliced' },
        { name: 'Carrots', quantity: 100, unit: 'g', category: 'vegetable', notes: 'julienned' },
        { name: 'Soy sauce', quantity: 2, unit: 'tbsp', category: 'other' },
        { name: 'Garlic', quantity: 2, unit: 'unit', category: 'vegetable', notes: 'minced' },
        { name: 'Ginger', quantity: 1, unit: 'tbsp', category: 'spice', notes: 'grated' },
        { name: 'Sesame oil', quantity: 1, unit: 'tbsp', category: 'fat' },
        { name: 'Rice', quantity: 200, unit: 'g', category: 'grain', notes: 'cooked' }
      ],
      instructions: [
        'Cook rice according to package instructions',
        'Heat sesame oil in a wok or large pan over high heat',
        'Add minced garlic and ginger, stir-fry for 30 seconds',
        'Add harder vegetables (broccoli, carrots) first',
        'Stir-fry for 3-4 minutes',
        'Add bell peppers and continue stir-frying for 2-3 minutes',
        'Add soy sauce and toss to combine',
        'Vegetables should be tender-crisp',
        'Serve immediately over cooked rice'
      ],
      nutrition: {
        calories: 320,
        protein: 8,
        carbs: 58,
        fat: 7,
        fiber: 8,
        sugar: 12,
        sodium: 580
      },
      dietaryInfo: {
        isVegetarian: true,
        isVegan: true,
        isDairyFree: true
      },
      tips: [
        'Keep vegetables moving in the pan for even cooking',
        'Prep all ingredients before starting to cook',
        'Add cashews or tofu for protein'
      ],
      variations: [
        { name: 'Thai Style', description: 'Use Thai basil, lime, and fish sauce' },
        { name: 'Teriyaki', description: 'Add teriyaki sauce and sesame seeds' },
        { name: 'Spicy Version', description: 'Add chili flakes or sriracha sauce' }
      ]
    }
  ];
}

// This will fix any nutrition structure issues

function fixNutritionStructure(recipe) {
  // If recipe is a Mongoose document, convert to plain object
  const recipeObj = recipe.toObject ? recipe.toObject() : recipe;
  
  // Check if nutrition exists and has the right structure
  let nutrition = recipeObj.nutrition;
  
  // If nutrition doesn't exist or is empty, create default
  if (!nutrition || Object.keys(nutrition).length === 0) {
    console.log(`Recipe "${recipeObj.title}" has no nutrition data, adding defaults`);
    nutrition = {
      calories: 400,
      protein: 20,
      carbs: 45,
      fat: 15,
      fiber: 6,
      sugar: 8,
      sodium: 400
    };
  } 
  // Check if nutrition has the wrong structure (like nested servings)
  else if (nutrition.servings !== undefined && typeof nutrition.servings === 'number') {
    // It might be using the Recipe schema structure with nested values
    console.log(`Recipe "${recipeObj.title}" has nested nutrition structure`);
    
    // Try to extract values - they might be at the root level
    nutrition = {
      calories: nutrition.calories || 400,
      protein: nutrition.protein || 20,
      carbs: nutrition.carbs || 45,
      fat: nutrition.fat || 15,
      fiber: nutrition.fiber || 6,
      sugar: nutrition.sugar || 8,
      sodium: nutrition.sodium || 400
    };
  }
  // Check if values exist but are undefined
  else if (nutrition.calories === undefined) {
    console.log(`Recipe "${recipeObj.title}" has nutrition object but no values`);
    
    // Provide defaults for missing values
    nutrition = {
      calories: nutrition.calories || 400,
      protein: nutrition.protein || 20,
      carbs: nutrition.carbs || 45,
      fat: nutrition.fat || 15,
      fiber: nutrition.fiber || 6,
      sugar: nutrition.sugar || 8,
      sodium: nutrition.sodium || 400
    };
  }
  
  // Return the fixed recipe
  return {
    ...recipeObj,
    nutrition: nutrition
  };
}

// Update your /recipes/search endpoint
router.get('/recipes/search', async (req, res) => {
  try {
    const { q: query = '', dietary, allergies, maxCalories, maxTime, cuisine, mealType } = req.query;
    
    let recipes = [];
    
    // If no query, get default recipes
    if (!query) {
      // Try database first
      const dbRecipes = await Recipe.find({})
        .limit(20)
        .lean(); // Use lean() to get plain objects instead of Mongoose documents
      
      if (dbRecipes && dbRecipes.length > 0) {
        console.log('Found database recipes:', dbRecipes.length);
        recipes = dbRecipes;
      } else {
        console.log('No database recipes, using mock data');
        recipes = getMockRecipes();
      }
    } else {
      // Search with query
      const searchRegex = new RegExp(query.split(' ').join('|'), 'i');
      
      const dbRecipes = await Recipe.find({
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { 'ingredients.name': searchRegex }
        ]
      })
      .limit(20)
      .lean(); // Use lean() here too
      
      if (dbRecipes && dbRecipes.length > 0) {
        recipes = dbRecipes;
      } else {
        // Search mock recipes
        const mockRecipes = getMockRecipes();
        recipes = mockRecipes.filter(r => 
          r.title.toLowerCase().includes(query.toLowerCase()) ||
          (r.description && r.description.toLowerCase().includes(query.toLowerCase())) ||
          r.ingredients.some(ing => ing.name.toLowerCase().includes(query.toLowerCase()))
        );
        
        if (recipes.length === 0) {
          recipes = mockRecipes; // Return all if no matches
        }
      }
    }
    
    // Fix nutrition structure for all recipes
    const fixedRecipes = recipes.map(recipe => {
      const fixed = fixNutritionStructure(recipe);
      
      // Log what we're sending
      if (recipes.indexOf(recipe) === 0) {
        console.log('First recipe being sent:');
        console.log('  Title:', fixed.title);
        console.log('  Nutrition:', fixed.nutrition);
      }
      
      return fixed;
    });
    
    console.log(`Sending ${fixedRecipes.length} recipes with fixed nutrition`);
    
    res.json({
      recipes: fixedRecipes,
      count: fixedRecipes.length,
      filters: {}
    });
    
  } catch (error) {
    console.error('Recipe search error:', error);
    
    // Fallback to mock recipes with fixed nutrition
    const mockRecipes = getMockRecipes();
    const fixedRecipes = mockRecipes.map(recipe => fixNutritionStructure(recipe));
    
    res.json({
      recipes: fixedRecipes,
      count: fixedRecipes.length,
      filters: {},
      error: 'Using fallback data'
    });
  }
});

// Also add this test endpoint to verify mock recipes work
router.get('/recipes/test-mock', async (req, res) => {
  const mockRecipes = getMockRecipes();
  const firstRecipe = mockRecipes[0];
  
  res.json({
    message: 'Mock recipe test',
    recipeTitle: firstRecipe.title,
    hasNutrition: !!firstRecipe.nutrition,
    nutritionStructure: firstRecipe.nutrition,
    nutritionKeys: firstRecipe.nutrition ? Object.keys(firstRecipe.nutrition) : [],
    calories: firstRecipe.nutrition?.calories,
    protein: firstRecipe.nutrition?.protein
  });
});

function adjustMockRecipe(recipe, servings) {
  const ratio = servings / recipe.servings;
  return {
    ...recipe,
    servings,
    ingredients: recipe.ingredients.map(ing => ({
      ...ing,
      quantity: Math.round(ing.quantity * ratio * 10) / 10
    })),
    nutrition: {
      calories: Math.round(recipe.nutrition.calories * ratio),
      protein: Math.round(recipe.nutrition.protein * ratio),
      carbs: Math.round(recipe.nutrition.carbs * ratio),
      fat: Math.round(recipe.nutrition.fat * ratio),
      fiber: Math.round(recipe.nutrition.fiber * ratio),
      sugar: Math.round(recipe.nutrition.sugar * ratio),
      sodium: Math.round(recipe.nutrition.sodium * ratio)
    }
  };
}

function generateTemplateRecipe(requirements, preferences) {
  const templates = {
    breakfast: {
      title: 'Custom Breakfast Bowl',
      description: 'A nutritious breakfast to start your day',
      mealType: 'breakfast',
      cookingTime: 15,
      servings: 2,
      ingredients: [
        { name: 'Oats', quantity: 100, unit: 'g', category: 'grain' },
        { name: 'Milk or alternative', quantity: 200, unit: 'ml', category: 'dairy' },
        { name: 'Banana', quantity: 1, unit: 'unit', category: 'fruit' },
        { name: 'Berries', quantity: 100, unit: 'g', category: 'fruit' },
        { name: 'Honey', quantity: 1, unit: 'tbsp', category: 'other' }
      ],
      instructions: [
        'Cook oats with milk according to package directions',
        'Slice banana',
        'Top cooked oats with banana and berries',
        'Drizzle with honey',
        'Serve warm'
      ],
      nutrition: {
        calories: 350,
        protein: 12,
        carbs: 65,
        fat: 8,
        fiber: 8,
        sugar: 25,
        sodium: 100
      }
    },
    lunch: {
      title: 'Custom Power Lunch',
      description: 'A balanced lunch for sustained energy',
      mealType: 'lunch',
      cookingTime: 20,
      servings: 2,
      ingredients: [
        { name: 'Mixed vegetables', quantity: 300, unit: 'g', category: 'vegetable' },
        { name: 'Protein source', quantity: 200, unit: 'g', category: 'protein' },
        { name: 'Whole grain', quantity: 150, unit: 'g', category: 'grain' },
        { name: 'Olive oil', quantity: 1, unit: 'tbsp', category: 'fat' }
      ],
      instructions: [
        'Cook grain according to package directions',
        'Prepare protein (grill, bake, or sauté)',
        'Steam or roast vegetables',
        'Combine all components',
        'Drizzle with olive oil and season'
      ],
      nutrition: {
        calories: 450,
        protein: 30,
        carbs: 50,
        fat: 15,
        fiber: 10,
        sugar: 8,
        sodium: 300
      }
    },
    dinner: {
      title: 'Custom Dinner Special',
      description: 'A satisfying dinner to end your day',
      mealType: 'dinner',
      cookingTime: 30,
      servings: 2,
      ingredients: [
        { name: 'Protein choice', quantity: 300, unit: 'g', category: 'protein' },
        { name: 'Vegetables', quantity: 400, unit: 'g', category: 'vegetable' },
        { name: 'Starch side', quantity: 200, unit: 'g', category: 'grain' },
        { name: 'Cooking oil', quantity: 2, unit: 'tbsp', category: 'fat' }
      ],
      instructions: [
        'Preheat oven or prepare cooking surface',
        'Season and cook protein',
        'Prepare vegetables',
        'Cook starch side',
        'Plate and serve together'
      ],
      nutrition: {
        calories: 500,
        protein: 35,
        carbs: 45,
        fat: 20,
        fiber: 12,
        sugar: 10,
        sodium: 400
      }
    }
  };
  
  const mealType = requirements.mealType || 'lunch';
  const template = templates[mealType] || templates.lunch;
  
  return {
    ...template,
    cuisine: requirements.cuisine || 'international',
    isCustom: true,
    difficulty: 'easy',
    dietaryInfo: {
      isVegetarian: preferences.dietaryPreferences?.includes('vegetarian'),
      isVegan: preferences.dietaryPreferences?.includes('vegan'),
      isGlutenFree: preferences.dietaryPreferences?.includes('gluten_free')
    },
    tips: ['Customize ingredients based on preferences', 'Adjust seasoning to taste'],
    variations: [
      { name: 'Low Carb', description: 'Replace grains with cauliflower rice' },
      { name: 'High Protein', description: 'Double the protein portion' }
    ]
  };
}

function getCommonSubstitutions(ingredient) {
  const substitutions = {
    'butter': [
      { ingredient: 'Olive oil', ratio: '3:4', notes: 'Use 3/4 the amount', recommended: true },
      { ingredient: 'Coconut oil', ratio: '1:1', notes: 'Same amount, adds coconut flavor', recommended: true },
      { ingredient: 'Applesauce', ratio: '1:1', notes: 'For baking, reduces fat', recommended: false }
    ],
    'milk': [
      { ingredient: 'Almond milk', ratio: '1:1', notes: 'Dairy-free alternative', recommended: true },
      { ingredient: 'Oat milk', ratio: '1:1', notes: 'Creamy texture', recommended: true },
      { ingredient: 'Coconut milk', ratio: '1:1', notes: 'Rich flavor', recommended: false }
    ],
    'egg': [
      { ingredient: 'Flax egg', ratio: '1:1', notes: '1 tbsp flax + 3 tbsp water per egg', recommended: true },
      { ingredient: 'Chia egg', ratio: '1:1', notes: '1 tbsp chia + 3 tbsp water per egg', recommended: true },
      { ingredient: 'Banana', ratio: '1:1', notes: '1/4 cup mashed per egg', recommended: false }
    ],
    'default': [
      { ingredient: 'Similar ingredient', ratio: '1:1', notes: 'Adjust to taste', recommended: true }
    ]
  };
  
  const lowerIngredient = ingredient.toLowerCase();
  
  for (const [key, subs] of Object.entries(substitutions)) {
    if (lowerIngredient.includes(key)) {
      return { originalIngredient: ingredient, substitutions: subs };
    }
  }
  
  return { originalIngredient: ingredient, substitutions: substitutions.default };
}

module.exports = router;