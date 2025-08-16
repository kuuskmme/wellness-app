// backend/routes/nutrition.js - COMPLETE FILE
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
    
    let preferences = await UserPreferences.findOne({ userId: req.userId });
    
    if (!preferences) {
      preferences = new UserPreferences({ userId: req.userId });
    }
    
    // Update preferences with request body
    Object.assign(preferences, req.body);
    
    // Link to health profile
    preferences.healthProfileLink = {
      profileId: healthProfile._id,
      lastSynced: new Date()
    };
    
    await preferences.save();
    
    res.json(preferences);
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Sync preferences with health profile
router.post('/preferences/sync', auth, async (req, res) => {
  try {
    // Get both health profile and preferences
    const [healthProfile, preferences] = await Promise.all([
      HealthProfile.findOne({ userId: req.userId }),
      UserPreferences.findOne({ userId: req.userId })
    ]);
    
    if (!healthProfile) {
      return res.status(404).json({ 
        message: 'Health profile not found. Please create your health profile first.' 
      });
    }
    
    if (!preferences) {
      return res.status(404).json({ 
        message: 'Preferences not found. Please set your preferences first.' 
      });
    }
    
    // Calculate calorie targets based on health profile
    const weight = healthProfile.physicalMetrics?.weight?.normalizedValue || 70;
    const height = healthProfile.physicalMetrics?.height?.normalizedValue || 170;
    const age = healthProfile.demographics?.age || 30;
    const gender = healthProfile.demographics?.gender || 'other';
    const activityLevel = healthProfile.lifestyleIndicators?.activityLevel || 'moderately_active';
    const fitnessGoal = healthProfile.fitnessGoals?.primary || 'health_maintenance';
    
    // Calculate BMR
    let bmr;
    if (gender === 'male') {
      bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
    } else {
      bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
    }
    
    // Activity multipliers
    const activityMultipliers = {
      sedentary: 1.2,
      lightly_active: 1.375,
      moderately_active: 1.55,
      very_active: 1.725,
      extremely_active: 1.9
    };
    
    const multiplier = activityMultipliers[activityLevel] || 1.55;
    let targetCalories = Math.round(bmr * multiplier);
    
    // Adjust for fitness goals
    if (fitnessGoal === 'weight_loss') {
      targetCalories -= 500; // 500 calorie deficit for ~1lb/week loss
    } else if (fitnessGoal === 'muscle_gain') {
      targetCalories += 300; // 300 calorie surplus for lean gains
    }
    
    // Update preferences with calculated values
    preferences.calorieTarget = targetCalories;
    preferences.healthProfileLink = {
      profileId: healthProfile._id,
      lastSynced: new Date(),
      importedData: {
        bmi: healthProfile.physicalMetrics?.bmi?.value,
        weight: weight,
        height: height,
        age: age,
        activityLevel: activityLevel,
        fitnessGoal: fitnessGoal,
        targetWeight: healthProfile.fitnessGoals?.targetWeight?.normalizedValue
      }
    };
    
    // Calculate macro targets based on goals
    preferences.nutritionalTargets = {
      calories: targetCalories,
      macros: {
        protein: {
          grams: Math.round(
            fitnessGoal === 'muscle_gain' ? 
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
    
    // Save the meal plan - THIS IS CRITICAL
    try {
      const savedPlan = new MealPlan(mealPlan);
      await savedPlan.save();
      
      console.log('Meal plan saved successfully with ID:', savedPlan._id);
      
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
    
    // IMPORTANT: Mark the subdocuments as modified
    mealPlan.markModified('dailyPlans');
    mealPlan.markModified('modifications');
    
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
// VERSIONING ROUTES - FIXED TO PERSIST PROPERLY
// =====================

// Save version of meal plan before major changes
router.post('/meal-plan/:id/save-version', auth, async (req, res) => {
  try {
    const { reason = 'Manual save' } = req.body;
    
    const mealPlan = await MealPlan.findOne({
      _id: req.params.id,
      userId: req.userId
    });
    
    if (!mealPlan) {
      return res.status(404).json({ message: 'Meal plan not found' });
    }
    
    // Use the model method to save version
    await mealPlan.saveVersion(reason);
    
    // IMPORTANT: Ensure the version is properly saved
    console.log('Version saved:', {
      planId: mealPlan._id,
      version: mealPlan.version,
      previousVersionsCount: mealPlan.previousVersions.length
    });
    
    res.json({
      message: 'Version saved successfully',
      version: mealPlan.version,
      totalVersions: mealPlan.previousVersions.length
    });
  } catch (error) {
    console.error('Save version error:', error);
    res.status(500).json({ message: 'Server error while saving version' });
  }
});

// Get version history
router.get('/meal-plan/:id/versions', auth, async (req, res) => {
  try {
    const mealPlan = await MealPlan.findOne({
      _id: req.params.id,
      userId: req.userId
    }).select('previousVersions version');
    
    if (!mealPlan) {
      return res.status(404).json({ message: 'Meal plan not found' });
    }
    
    const versions = mealPlan.previousVersions.map(v => ({
      version: v.version,
      savedAt: v.savedAt,
      reason: v.reason
    }));
    
    res.json({
      currentVersion: mealPlan.version,
      versions: versions
    });
  } catch (error) {
    console.error('Get versions error:', error);
    res.status(500).json({ message: 'Server error while fetching versions' });
  }
});

// Restore specific version
router.post('/meal-plan/:id/restore', auth, async (req, res) => {
  try {
    const { versionNumber } = req.body;
    
    if (!versionNumber) {
      return res.status(400).json({ message: 'Version number required' });
    }
    
    const mealPlan = await MealPlan.findOne({
      _id: req.params.id,
      userId: req.userId
    });
    
    if (!mealPlan) {
      return res.status(404).json({ message: 'Meal plan not found' });
    }
    
    // Restore the version using the model method
    await mealPlan.restoreVersion(versionNumber);
    
    res.json({
      message: 'Version restored successfully',
      mealPlan: mealPlan
    });
  } catch (error) {
    console.error('Restore version error:', error);
    res.status(500).json({ 
      message: error.message || 'Server error while restoring version' 
    });
  }
});

// Archive old meal plans and create new one
router.post('/meal-plan/archive-and-create', auth, async (req, res) => {
  try {
    // Archive all active plans for this user
    await MealPlan.updateMany(
      { 
        userId: req.userId, 
        status: 'active' 
      },
      { 
        $set: { 
          status: 'archived',
          archivedAt: new Date()
        } 
      }
    );
    
    // Now create new plan (reuse existing generation logic)
    const { type = 'daily', startDate, requirements = {} } = req.body;
    
    let preferences = await UserPreferences.findOne({ userId: req.userId });
    
    if (!preferences) {
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
    
    const planStartDate = startDate ? new Date(startDate) : new Date();
    const planRequest = {
      userId: req.userId,
      duration: type,
      type: type,
      startDate: planStartDate,
      requirements: requirements
    };
    
    let mealPlan;
    try {
      mealPlan = await mealPlanningService.generateMealPlan(req.userId, planRequest);
    } catch (serviceError) {
      console.error('Service generation failed, using fallback:', serviceError);
      mealPlan = await mealPlanningService.generateFallbackPlan(req.userId, planRequest);
    }
    
    // Ensure proper structure
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
    
    // Save the new meal plan
    const savedPlan = new MealPlan(mealPlan);
    await savedPlan.save();
    
    res.status(201).json({
      message: 'Previous plans archived and new plan created',
      mealPlan: savedPlan,
      archivedCount: await MealPlan.countDocuments({ 
        userId: req.userId, 
        status: 'archived' 
      })
    });
  } catch (error) {
    console.error('Archive and create error:', error);
    res.status(500).json({ 
      message: 'Server error while creating new plan',
      error: error.message 
    });
  }
});

// Get all meal plans with pagination
router.get('/meal-plans/all', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status = 'all',
      sortBy = 'createdAt',
      order = 'desc' 
    } = req.query;
    
    const filter = { userId: req.userId };
    
    if (status !== 'all') {
      filter.status = status;
    }
    
    const skip = (page - 1) * limit;
    const sortOrder = order === 'asc' ? 1 : -1;
    
    const [mealPlans, total] = await Promise.all([
      MealPlan.find(filter)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(parseInt(limit))
        .select('-dailyPlans'), // Exclude daily plans for list view
      MealPlan.countDocuments(filter)
    ]);
    
    res.json({
      mealPlans,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get all meal plans error:', error);
    res.status(500).json({ message: 'Server error while fetching meal plans' });
  }
});

// =====================
// RECIPES & SEARCH
// =====================

// Search recipes
router.get('/recipes/search', auth, async (req, res) => {
  try {
    const { query, dietary, allergies, cuisine, maxCalories, maxTime, limit = 10 } = req.query;
    
    const filter = {};
    
    if (query) {
      filter.$or = [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { 'ingredients.name': { $regex: query, $options: 'i' } }
      ];
    }
    
    if (dietary) {
      filter.dietaryTags = { $in: dietary.split(',') };
    }
    
    if (allergies) {
      filter.allergens = { $nin: allergies.split(',') };
    }
    
    if (cuisine) {
      filter.cuisine = cuisine;
    }
    
    if (maxCalories) {
      filter['nutritionalInfo.calories'] = { $lte: parseInt(maxCalories) };
    }
    
    if (maxTime) {
      filter.totalTime = { $lte: parseInt(maxTime) };
    }
    
    const recipes = await Recipe.find(filter).limit(parseInt(limit));
    
    res.json({ recipes });
  } catch (error) {
    console.error('Search recipes error:', error);
    res.status(500).json({ message: 'Server error while searching recipes' });
  }
});

// Get recipe by ID
router.get('/recipes/:id', auth, async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id);
    
    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }
    
    res.json(recipe);
  } catch (error) {
    console.error('Get recipe error:', error);
    res.status(500).json({ message: 'Server error while fetching recipe' });
  }
});

// Generate custom recipe
router.post('/recipes/generate', auth, async (req, res) => {
  try {
    const { requirements = {} } = req.body;
    const preferences = await UserPreferences.findOne({ userId: req.userId });
    
    const recipe = await ragService.generateCustomRecipe(preferences, requirements);
    
    // Save the generated recipe
    const newRecipe = new Recipe({
      ...recipe,
      isCustom: true,
      createdBy: req.userId
    });
    
    await newRecipe.save();
    
    res.status(201).json({
      message: 'Custom recipe generated successfully',
      recipe: newRecipe
    });
  } catch (error) {
    console.error('Generate recipe error:', error);
    res.status(500).json({ message: 'Server error while generating recipe' });
  }
});

// Adjust recipe portions
router.post('/recipes/:id/adjust', auth, async (req, res) => {
  try {
    const { servings } = req.body;
    const recipe = await Recipe.findById(req.params.id);
    
    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }
    
    const adjustedRecipe = await nutritionCalculator.adjustPortions(recipe, servings);
    
    res.json({
      message: 'Recipe adjusted successfully',
      recipe: adjustedRecipe
    });
  } catch (error) {
    console.error('Adjust recipe error:', error);
    res.status(500).json({ message: 'Server error while adjusting recipe' });
  }
});

// Ingredient substitution
router.post('/recipes/:id/substitute', auth, async (req, res) => {
  try {
    const { ingredientId, reason } = req.body;
    const recipe = await Recipe.findById(req.params.id);
    
    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }
    
    const preferences = await UserPreferences.findOne({ userId: req.userId });
    const substitution = await ragService.suggestSubstitution(
      recipe,
      ingredientId,
      preferences,
      reason
    );
    
    res.json({
      message: 'Substitution suggested successfully',
      substitution
    });
  } catch (error) {
    console.error('Substitute ingredient error:', error);
    res.status(500).json({ message: 'Server error while suggesting substitution' });
  }
});

// =====================
// SHOPPING LIST
// =====================

// Generate shopping list
router.get('/shopping-list', auth, async (req, res) => {
  try {
    const { mealPlanId, startDate, endDate } = req.query;
    
    let mealPlan;
    
    if (mealPlanId) {
      mealPlan = await MealPlan.findOne({
        _id: mealPlanId,
        userId: req.userId
      });
    } else {
      // Get active meal plan
      mealPlan = await MealPlan.findOne({
        userId: req.userId,
        status: 'active',
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() }
      });
    }
    
    if (!mealPlan) {
      return res.status(404).json({ message: 'No meal plan found' });
    }
    
    const shoppingList = await shoppingListService.generateShoppingList(
      mealPlan,
      startDate,
      endDate
    );
    
    res.json({
      shoppingList,
      mealPlanId: mealPlan._id,
      period: {
        start: startDate || mealPlan.startDate,
        end: endDate || mealPlan.endDate
      }
    });
  } catch (error) {
    console.error('Generate shopping list error:', error);
    res.status(500).json({ message: 'Server error while generating shopping list' });
  }
});

// Update shopping list
router.put('/shopping-list', auth, async (req, res) => {
  try {
    const { mealPlanId, items } = req.body;
    
    const mealPlan = await MealPlan.findOne({
      _id: mealPlanId,
      userId: req.userId
    });
    
    if (!mealPlan) {
      return res.status(404).json({ message: 'Meal plan not found' });
    }
    
    mealPlan.shoppingList = {
      generated: true,
      items: items,
      lastUpdated: new Date()
    };
    
    await mealPlan.save();
    
    res.json({
      message: 'Shopping list updated successfully',
      shoppingList: mealPlan.shoppingList
    });
  } catch (error) {
    console.error('Update shopping list error:', error);
    res.status(500).json({ message: 'Server error while updating shopping list' });
  }
});

// =====================
// NUTRITIONAL ANALYSIS
// =====================

// Get daily nutrition analysis
router.get('/analysis/daily', auth, async (req, res) => {
  try {
    const { date = new Date() } = req.query;
    
    const analysis = await nutritionAnalysisService.analyzeDailyNutrition(
      req.userId,
      new Date(date)
    );
    
    res.json(analysis);
  } catch (error) {
    console.error('Daily analysis error:', error);
    res.status(500).json({ message: 'Server error while analyzing nutrition' });
  }
});

// Get weekly nutrition analysis
router.get('/analysis/weekly', auth, async (req, res) => {
  try {
    const { startDate = new Date() } = req.query;
    
    const analysis = await nutritionAnalysisService.analyzeWeeklyNutrition(
      req.userId,
      new Date(startDate)
    );
    
    res.json(analysis);
  } catch (error) {
    console.error('Weekly analysis error:', error);
    res.status(500).json({ message: 'Server error while analyzing nutrition' });
  }
});

// Get AI-powered nutrition analysis
router.post('/analysis/ai', auth, async (req, res) => {
  try {
    const { period = 'week', goals } = req.body;
    
    const analysis = await nutritionAnalysisService.generateAIAnalysis(
      req.userId,
      period,
      goals
    );
    
    res.json({
      analysis,
      generatedAt: new Date()
    });
  } catch (error) {
    console.error('AI analysis error:', error);
    res.status(500).json({ message: 'Server error while generating AI analysis' });
  }
});

// =====================
// INGREDIENTS
// =====================

// Search ingredients
router.get('/ingredients/search', auth, async (req, res) => {
  try {
    const { query, category, limit = 20 } = req.query;
    
    const filter = {};
    
    if (query) {
      filter.label = { $regex: query, $options: 'i' };
    }
    
    if (category) {
      filter.category = category;
    }
    
    const ingredients = await Ingredient.find(filter).limit(parseInt(limit));
    
    res.json({ ingredients });
  } catch (error) {
    console.error('Search ingredients error:', error);
    res.status(500).json({ message: 'Server error while searching ingredients' });
  }
});

// =====================
// DATA INITIALIZATION
// =====================

// Initialize sample data (for development)
router.post('/init-data', auth, async (req, res) => {
  try {
    // Check if data already exists
    const recipeCount = await Recipe.countDocuments();
    const ingredientCount = await Ingredient.countDocuments();
    
    if (recipeCount > 100 && ingredientCount > 100) {
      return res.json({
        message: 'Data already initialized',
        counts: {
          recipes: recipeCount,
          ingredients: ingredientCount
        }
      });
    }
    
    // Initialize data using the services
    const result = await ragService.initializeData();
    
    res.json({
      message: 'Data initialized successfully',
      result
    });
  } catch (error) {
    console.error('Init data error:', error);
    res.status(500).json({ message: 'Server error while initializing data' });
  }
});

// Helper function to calculate nutrition score
function calculateNutritionScore(preferences) {
  let score = 0;
  let factors = 0;
  
  // Check if dietary preferences are set
  if (preferences.dietaryPreferences && preferences.dietaryPreferences.length > 0) {
    score += 20;
    factors++;
  }
  
  // Check if calorie target is reasonable
  if (preferences.calorieTarget >= 1200 && preferences.calorieTarget <= 4000) {
    score += 20;
    factors++;
  }
  
  // Check if macro targets are balanced
  const macros = preferences.nutritionalTargets?.macros;
  if (macros) {
    const total = (macros.protein?.percentage || 0) + 
                  (macros.carbs?.percentage || 0) + 
                  (macros.fat?.percentage || 0);
    if (total >= 95 && total <= 105) {
      score += 20;
      factors++;
    }
  }
  
  // Check if meal timing is set
  if (preferences.mealTiming && Object.keys(preferences.mealTiming).length >= 3) {
    score += 20;
    factors++;
  }
  
  // Check if health profile is linked
  if (preferences.healthProfileLink?.profileId) {
    score += 20;
    factors++;
  }
  
  return factors > 0 ? Math.round(score) : 50;
}

module.exports = router;