// routes/nutrition.js - Nutrition platform routes
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const UserPreferences = require('../models/UserPreferences');
const Recipe = require('../models/Recipe');
const Ingredient = require('../models/Ingredient');
const HealthProfile = require('../models/HealthProfile');
const { verifyToken } = require('../middleware/auth');

// All routes require authentication
router.use(verifyToken);

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

// Update user preferences
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
          preferences[key] = req.body[key];
        }
      });
    }
    
    // Re-sync with health profile if requested
    if (req.body.syncWithHealthProfile) {
      const healthProfile = await HealthProfile.findOne({ userId: req.userId });
      if (healthProfile) {
        await preferences.syncWithHealthProfile(healthProfile);
      }
    }
    
    preferences.metadata.updatedAt = new Date();
    preferences.metadata.lastModifiedBy = 'user';
    preferences.calculateCompletion();
    
    await preferences.save();
    
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
    
    if (!preferences) {
      return res.status(404).json({ message: 'Preferences not found' });
    }
    
    if (!healthProfile) {
      return res.status(404).json({ message: 'Health profile not found. Please complete your health profile first.' });
    }
    
    await preferences.syncWithHealthProfile(healthProfile);
    
    res.json({
      message: 'Successfully synced with health profile',
      preferences,
      importedData: preferences.healthProfileLink.importedData
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ message: 'Server error while syncing' });
  }
});

// =====================
// RECIPES
// =====================

// Search recipes
router.get('/recipes/search', async (req, res) => {
  try {
    const {
      query,
      cuisine,
      mealType,
      maxCalories,
      maxTime,
      dietary,
      excludeAllergens,
      page = 1,
      limit = 20
    } = req.query;
    
    // Build search query
    const searchQuery = {};
    
    if (query) {
      searchQuery.$text = { $search: query };
    }
    
    if (cuisine) {
      searchQuery.cuisine = cuisine;
    }
    
    if (mealType) {
      searchQuery.mealType = mealType;
    }
    
    if (maxCalories) {
      searchQuery['nutrition.perServing.calories'] = { $lte: parseInt(maxCalories) };
    }
    
    if (maxTime) {
      searchQuery['time.total'] = { $lte: parseInt(maxTime) };
    }
    
    // Handle dietary filters
    if (dietary) {
      const dietaryFilters = dietary.split(',');
      dietaryFilters.forEach(diet => {
        if (diet === 'vegetarian') searchQuery['dietaryInfo.isVegetarian'] = true;
        if (diet === 'vegan') searchQuery['dietaryInfo.isVegan'] = true;
        if (diet === 'gluten_free') searchQuery['dietaryInfo.isGlutenFree'] = true;
        if (diet === 'dairy_free') searchQuery['dietaryInfo.isDairyFree'] = true;
      });
    }
    
    // Exclude allergens
    if (excludeAllergens) {
      const allergens = excludeAllergens.split(',');
      searchQuery['dietaryInfo.allergens'] = { $nin: allergens };
    }
    
    const skip = (page - 1) * limit;
    
    const recipes = await Recipe.find(searchQuery)
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ 'ratings.average': -1, 'metadata.popularity': -1 });
    
    const total = await Recipe.countDocuments(searchQuery);
    
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
    console.error('Recipe search error:', error);
    res.status(500).json({ message: 'Server error while searching recipes' });
  }
});

// Get recipe by ID
router.get('/recipes/:id', async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id)
      .populate('ingredients.ingredientId');
    
    if (!recipe) {
      return res.status(404).json({ message: 'Recipe not found' });
    }
    
    // Check compatibility with user preferences
    const preferences = await UserPreferences.findOne({ userId: req.userId });
    if (preferences) {
      const compatibility = recipe.checkDietaryCompatibility(
        preferences.dietaryPreferences,
        preferences.allergies
      );
      
      res.json({
        recipe,
        compatibility,
        userPreferences: {
          canEat: compatibility.suitable,
          warnings: compatibility.warnings,
          conflicts: compatibility.conflicts
        }
      });
    } else {
      res.json({ recipe });
    }
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
    const { query, category, limit = 10 } = req.query;
    
    const searchQuery = {};
    
    if (query) {
      searchQuery.$or = [
        { label: new RegExp(query, 'i') },
        { alternativeNames: new RegExp(query, 'i') }
      ];
    }
    
    if (category) {
      searchQuery.category = category;
    }
    
    const ingredients = await Ingredient.find(searchQuery)
      .limit(parseInt(limit))
      .sort({ 'metadata.popularity': -1 });
    
    res.json({ ingredients });
  } catch (error) {
    console.error('Ingredient search error:', error);
    res.status(500).json({ message: 'Server error while searching ingredients' });
  }
});

// Get ingredient nutrition
router.get('/ingredients/:id/nutrition', async (req, res) => {
  try {
    const { quantity = 100, unit = 'g' } = req.query;
    
    const ingredient = await Ingredient.findById(req.params.id);
    
    if (!ingredient) {
      return res.status(404).json({ message: 'Ingredient not found' });
    }
    
    const nutrition = ingredient.calculateNutrition(parseFloat(quantity), unit);
    
    res.json({
      ingredient: {
        id: ingredient.id,
        label: ingredient.label,
        category: ingredient.category
      },
      quantity: parseFloat(quantity),
      unit,
      nutrition
    });
  } catch (error) {
    console.error('Get nutrition error:', error);
    res.status(500).json({ message: 'Server error while calculating nutrition' });
  }
});

// =====================
// INITIALIZATION
// =====================

// Initialize database with sample data (development only)
router.post('/init-data', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ message: 'Not allowed in production' });
    }
    
    // Check if data already exists
    const recipeCount = await Recipe.countDocuments();
    const ingredientCount = await Ingredient.countDocuments();
    
    if (recipeCount >= 500 && ingredientCount >= 500) {
      return res.json({
        message: 'Database already initialized',
        counts: { recipes: recipeCount, ingredients: ingredientCount }
      });
    }
    
    // Generate sample ingredients
    const sampleIngredients = generateSampleIngredients();
    const ingredients = await Ingredient.insertMany(sampleIngredients);
    
    // Generate sample recipes using the ingredients
    const sampleRecipes = generateSampleRecipes(ingredients);
    const recipes = await Recipe.insertMany(sampleRecipes);
    
    res.json({
      message: 'Database initialized with sample data',
      counts: {
        ingredients: ingredients.length,
        recipes: recipes.length
      }
    });
  } catch (error) {
    console.error('Init data error:', error);
    res.status(500).json({ message: 'Server error while initializing data' });
  }
});

// Helper function to generate sample ingredients
function generateSampleIngredients() {
  const categories = {
    vegetables: ['tomato', 'onion', 'garlic', 'carrot', 'potato', 'spinach', 'broccoli', 'bell pepper'],
    fruits: ['apple', 'banana', 'orange', 'strawberry', 'blueberry', 'lemon', 'avocado'],
    proteins: ['chicken breast', 'ground beef', 'salmon', 'tofu', 'eggs', 'black beans', 'lentils'],
    grains: ['rice', 'pasta', 'quinoa', 'oats', 'bread', 'flour'],
    dairy: ['milk', 'cheese', 'yogurt', 'butter', 'cream'],
    herbs_spices: ['salt', 'pepper', 'oregano', 'basil', 'cumin', 'paprika', 'cinnamon'],
    oils_fats: ['olive oil', 'coconut oil', 'butter', 'vegetable oil']
  };
  
  const ingredients = [];
  let id = 1;
  
  Object.entries(categories).forEach(([category, items]) => {
    items.forEach(item => {
      ingredients.push({
        id: `ing_${id++}`,
        label: item,
        category,
        unit: { standard: category === 'oils_fats' || category === 'dairy' ? 'ml' : 'g' },
        nutrition: {
          per100: {
            calories: Math.floor(Math.random() * 300) + 20,
            macros: {
              protein: Math.random() * 30,
              carbs: Math.random() * 50,
              fat: Math.random() * 20,
              fiber: Math.random() * 10,
              sugar: Math.random() * 15
            },
            micronutrients: {
              sodium: Math.floor(Math.random() * 500),
              cholesterol: Math.floor(Math.random() * 100)
            }
          }
        },
        dietaryInfo: {
          isVegetarian: category !== 'proteins' || ['tofu', 'eggs', 'black beans', 'lentils'].includes(item),
          isVegan: category !== 'proteins' && category !== 'dairy',
          isGlutenFree: category !== 'grains' || ['rice', 'quinoa', 'oats'].includes(item),
          isDairyFree: category !== 'dairy'
        }
      });
    });
  });
  
  // Generate more to reach 500
  while (ingredients.length < 500) {
    const randomCategory = Object.keys(categories)[Math.floor(Math.random() * Object.keys(categories).length)];
    ingredients.push({
      id: `ing_${id++}`,
      label: `ingredient_${id}`,
      category: randomCategory,
      unit: { standard: 'g' },
      nutrition: {
        per100: {
          calories: Math.floor(Math.random() * 300) + 20,
          macros: {
            protein: Math.random() * 30,
            carbs: Math.random() * 50,
            fat: Math.random() * 20,
            fiber: Math.random() * 10,
            sugar: Math.random() * 15
          },
          micronutrients: {
            sodium: Math.floor(Math.random() * 500),
            cholesterol: Math.floor(Math.random() * 100)
          }
        }
      },
      dietaryInfo: {
        isVegetarian: Math.random() > 0.3,
        isVegan: Math.random() > 0.5,
        isGlutenFree: Math.random() > 0.4,
        isDairyFree: Math.random() > 0.4
      }
    });
  }
  
  return ingredients;
}

// Helper function to generate sample recipes
function generateSampleRecipes(ingredients) {
  const cuisines = ['italian', 'mexican', 'chinese', 'japanese', 'indian', 'thai', 'american', 'mediterranean'];
  const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
  const recipes = [];
  
  for (let i = 1; i <= 500; i++) {
    const numIngredients = Math.floor(Math.random() * 8) + 3;
    const recipeIngredients = [];
    
    for (let j = 0; j < numIngredients; j++) {
      const randomIngredient = ingredients[Math.floor(Math.random() * ingredients.length)];
      recipeIngredients.push({
        ingredientId: randomIngredient._id,
        name: randomIngredient.label,
        quantity: Math.floor(Math.random() * 200) + 10,
        unit: 'g'
      });
    }
    
    const totalCalories = recipeIngredients.reduce((sum, ing) => {
      const ingredient = ingredients.find(i => i._id === ing.ingredientId);
      return sum + (ingredient.nutrition.per100.calories * ing.quantity / 100);
    }, 0);
    
    const servings = 4;
    
    recipes.push({
      id: `recipe_${i}`,
      title: `Recipe ${i}`,
      cuisine: cuisines[Math.floor(Math.random() * cuisines.length)],
      ingredients: recipeIngredients,
      instructions: [
        { stepNumber: 1, instruction: 'Prepare ingredients', duration: 10 },
        { stepNumber: 2, instruction: 'Cook ingredients', duration: 20 },
        { stepNumber: 3, instruction: 'Serve hot', duration: 5 }
      ],
      nutrition: {
        servingSize: { value: 1, unit: 'serving' },
        servings,
        perServing: {
          calories: Math.round(totalCalories / servings),
          macros: {
            protein: Math.random() * 30,
            carbs: Math.random() * 60,
            fat: Math.random() * 25,
            fiber: Math.random() * 10,
            sugar: Math.random() * 20
          },
          micronutrients: {
            sodium: Math.floor(Math.random() * 800),
            cholesterol: Math.floor(Math.random() * 100)
          }
        }
      },
      time: {
        prep: 15,
        cook: 30,
        total: 45
      },
      mealType: [mealTypes[Math.floor(Math.random() * mealTypes.length)]],
      dietaryInfo: {
        isVegetarian: Math.random() > 0.5,
        isVegan: Math.random() > 0.7,
        isGlutenFree: Math.random() > 0.6,
        isDairyFree: Math.random() > 0.5
      },
      difficulty: 'medium',
      tags: ['quick', 'easy', 'healthy']
    });
  }
  
  return recipes;
}

module.exports = router;