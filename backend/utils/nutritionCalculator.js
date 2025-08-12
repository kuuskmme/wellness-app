
const OpenAI = require('openai');
const Ingredient = require('../models/Ingredient');
const Recipe = require('../models/Recipe');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-fallback'
});

class NutritionCalculator {
  constructor() {
    this.model = process.env.AI_MODEL || 'gpt-3.5-turbo';
    this.retryAttempts = 3;
    this.timeout = 30000; // 30 seconds
    this.cache = new Map(); // Simple in-memory cache
  }

  // Define available functions for OpenAI
  getFunctionDefinitions() {
    return [
      {
        name: 'calculate_nutrition',
        description: 'Calculate nutritional values for ingredients or recipes',
        parameters: {
          type: 'object',
          properties: {
            ingredients: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: 'Ingredient name' },
                  quantity: { type: 'number', description: 'Quantity of ingredient' },
                  unit: { type: 'string', description: 'Unit of measurement (g, ml, cup, etc)' }
                },
                required: ['name', 'quantity', 'unit']
              }
            },
            servings: {
              type: 'number',
              description: 'Number of servings',
              default: 1
            },
            operation: {
              type: 'string',
              enum: ['sum', 'per_serving', 'adjust_portions'],
              description: 'Type of calculation to perform'
            }
          },
          required: ['ingredients', 'operation']
        }
      },
      {
        name: 'adjust_portions',
        description: 'Adjust recipe portions and recalculate nutrition',
        parameters: {
          type: 'object',
          properties: {
            original_servings: { type: 'number' },
            new_servings: { type: 'number' },
            ingredients: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  quantity: { type: 'number' },
                  unit: { type: 'string' }
                }
              }
            },
            nutrition: {
              type: 'object',
              properties: {
                calories: { type: 'number' },
                protein: { type: 'number' },
                carbs: { type: 'number' },
                fat: { type: 'number' }
              }
            }
          },
          required: ['original_servings', 'new_servings']
        }
      },
      {
        name: 'validate_nutrition',
        description: 'Validate if nutritional values are reasonable',
        parameters: {
          type: 'object',
          properties: {
            calories: { type: 'number' },
            protein: { type: 'number' },
            carbs: { type: 'number' },
            fat: { type: 'number' },
            servings: { type: 'number' }
          },
          required: ['calories', 'protein', 'carbs', 'fat']
        }
      }
    ];
  }

  // Execute function with comprehensive error handling
  async executeFunction(functionName, parameters) {
    const startTime = Date.now();
    
    try {
      // Check cache first
      const cacheKey = `${functionName}_${JSON.stringify(parameters)}`;
      if (this.cache.has(cacheKey)) {
        console.log('📦 Returning cached result for:', functionName);
        return this.cache.get(cacheKey);
      }

      // Validate parameters
      const validation = this.validateParameters(functionName, parameters);
      if (!validation.valid) {
        throw new Error(`Invalid parameters: ${validation.error}`);
      }

      // Set timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Function execution timeout')), this.timeout);
      });

      // Execute function with timeout
      const result = await Promise.race([
        this.executeFunctionInternal(functionName, parameters),
        timeoutPromise
      ]);

      // Cache successful result
      this.cache.set(cacheKey, result);
      
      // Log execution time
      console.log(`✅ Function ${functionName} executed in ${Date.now() - startTime}ms`);
      
      return result;
    } catch (error) {
      console.error(`❌ Function execution error for ${functionName}:`, error);
      
      // Handle specific error types
      if (error.message.includes('timeout')) {
        return this.handleTimeout(functionName, parameters);
      } else if (error.message.includes('rate limit')) {
        return this.handleRateLimit(functionName, parameters);
      } else if (error.message.includes('parsing')) {
        return this.handleParsingError(functionName, parameters);
      } else {
        return this.handleGenericError(functionName, parameters, error);
      }
    }
  }

  // Internal function execution
  async executeFunctionInternal(functionName, parameters) {
    switch (functionName) {
      case 'calculate_nutrition':
        return await this.calculateNutrition(parameters);
      case 'adjust_portions':
        return await this.adjustPortions(parameters);
      case 'validate_nutrition':
        return await this.validateNutrition(parameters);
      default:
        throw new Error(`Unknown function: ${functionName}`);
    }
  }

  // Calculate nutrition for ingredients
  async calculateNutrition(params) {
    try {
      const { ingredients, servings = 1, operation = 'sum' } = params;
      
      // Look up nutritional data for each ingredient
      const nutritionData = await Promise.all(
        ingredients.map(async (ing) => {
          // Try to find in database first
          const dbIngredient = await Ingredient.findOne({
            label: { $regex: new RegExp(ing.name, 'i') }
          });

          if (dbIngredient && dbIngredient.nutritionPer100g) {
            // Calculate based on quantity
            const factor = this.convertToGrams(ing.quantity, ing.unit) / 100;
            return {
              name: ing.name,
              calories: Math.round(dbIngredient.nutritionPer100g.calories * factor),
              protein: Math.round(dbIngredient.nutritionPer100g.protein * factor * 10) / 10,
              carbs: Math.round(dbIngredient.nutritionPer100g.carbs * factor * 10) / 10,
              fat: Math.round(dbIngredient.nutritionPer100g.fat * factor * 10) / 10,
              fiber: Math.round((dbIngredient.nutritionPer100g.fiber || 0) * factor * 10) / 10,
              sodium: Math.round((dbIngredient.nutritionPer100g.sodium || 0) * factor)
            };
          }

          // Fallback: Use AI estimation
          return await this.estimateNutritionWithAI(ing);
        })
      );

      // Perform requested operation
      if (operation === 'sum') {
        const totals = nutritionData.reduce((acc, item) => ({
          calories: acc.calories + item.calories,
          protein: acc.protein + item.protein,
          carbs: acc.carbs + item.carbs,
          fat: acc.fat + item.fat,
          fiber: acc.fiber + item.fiber,
          sodium: acc.sodium + item.sodium
        }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0 });

        return totals;
      } else if (operation === 'per_serving') {
        const totals = nutritionData.reduce((acc, item) => ({
          calories: acc.calories + item.calories,
          protein: acc.protein + item.protein,
          carbs: acc.carbs + item.carbs,
          fat: acc.fat + item.fat,
          fiber: acc.fiber + item.fiber,
          sodium: acc.sodium + item.sodium
        }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0 });

        return {
          calories: Math.round(totals.calories / servings),
          protein: Math.round(totals.protein / servings * 10) / 10,
          carbs: Math.round(totals.carbs / servings * 10) / 10,
          fat: Math.round(totals.fat / servings * 10) / 10,
          fiber: Math.round(totals.fiber / servings * 10) / 10,
          sodium: Math.round(totals.sodium / servings)
        };
      }

      return nutritionData;
    } catch (error) {
      console.error('Nutrition calculation error:', error);
      throw error;
    }
  }

  // Adjust portions and recalculate
  async adjustPortions(params) {
    const { original_servings, new_servings, ingredients, nutrition } = params;
    const ratio = new_servings / original_servings;

    const adjustedIngredients = ingredients ? ingredients.map(ing => ({
      ...ing,
      quantity: Math.round(ing.quantity * ratio * 10) / 10
    })) : [];

    const adjustedNutrition = nutrition ? {
      calories: Math.round(nutrition.calories * ratio),
      protein: Math.round(nutrition.protein * ratio * 10) / 10,
      carbs: Math.round(nutrition.carbs * ratio * 10) / 10,
      fat: Math.round(nutrition.fat * ratio * 10) / 10,
      fiber: nutrition.fiber ? Math.round(nutrition.fiber * ratio * 10) / 10 : 0,
      sodium: nutrition.sodium ? Math.round(nutrition.sodium * ratio) : 0
    } : null;

    return {
      servings: new_servings,
      ratio,
      ingredients: adjustedIngredients,
      nutrition: adjustedNutrition
    };
  }

  // Validate nutritional values
  async validateNutrition(params) {
    const { calories, protein, carbs, fat, servings = 1 } = params;
    
    // Calculate expected calories from macros (4 cal/g protein & carbs, 9 cal/g fat)
    const expectedCalories = (protein * 4) + (carbs * 4) + (fat * 9);
    const calorieDeviation = Math.abs(calories - expectedCalories) / expectedCalories;

    const validation = {
      valid: true,
      warnings: [],
      errors: []
    };

    // Check calorie calculation accuracy
    if (calorieDeviation > 0.2) {
      validation.warnings.push(`Calorie count deviates ${Math.round(calorieDeviation * 100)}% from macros`);
    }

    // Check reasonable ranges per serving
    const caloriesPerServing = calories / servings;
    const proteinPerServing = protein / servings;
    const carbsPerServing = carbs / servings;
    const fatPerServing = fat / servings;

    if (caloriesPerServing > 2000) {
      validation.warnings.push('Unusually high calories per serving');
    }
    if (caloriesPerServing < 50) {
      validation.warnings.push('Unusually low calories per serving');
    }
    if (proteinPerServing > 100) {
      validation.warnings.push('Unusually high protein per serving');
    }
    if (carbsPerServing > 200) {
      validation.warnings.push('Unusually high carbs per serving');
    }
    if (fatPerServing > 100) {
      validation.warnings.push('Unusually high fat per serving');
    }

    validation.valid = validation.errors.length === 0;
    
    return validation;
  }

  // Estimate nutrition using AI when database lookup fails
  async estimateNutritionWithAI(ingredient) {
    try {
      const prompt = `Estimate nutritional values for ${ingredient.quantity} ${ingredient.unit} of ${ingredient.name}.
      Provide in JSON format: { calories, protein, carbs, fat, fiber, sodium }`;

      const response = await openai.chat.completions.create({
        model: this.model,
        messages: [
          { 
            role: 'system', 
            content: 'You are a nutrition expert. Provide accurate nutritional estimates.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      // Return conservative estimates as fallback
      return {
        name: ingredient.name,
        calories: 100,
        protein: 5,
        carbs: 10,
        fat: 3,
        fiber: 2,
        sodium: 100
      };
    }
  }

  // Convert various units to grams
  convertToGrams(quantity, unit) {
    const conversions = {
      'g': 1,
      'kg': 1000,
      'oz': 28.35,
      'lb': 453.592,
      'cup': 240, // approximate for most ingredients
      'tbsp': 15,
      'tsp': 5,
      'ml': 1, // assuming water density
      'l': 1000
    };

    return quantity * (conversions[unit] || 1);
  }

  // Parameter validation
  validateParameters(functionName, params) {
    const validation = { valid: true, error: null };

    switch (functionName) {
      case 'calculate_nutrition':
        if (!params.ingredients || !Array.isArray(params.ingredients)) {
          validation.valid = false;
          validation.error = 'Ingredients array is required';
        } else if (params.ingredients.length === 0) {
          validation.valid = false;
          validation.error = 'At least one ingredient is required';
        } else {
          // Validate each ingredient
          for (const ing of params.ingredients) {
            if (!ing.name || !ing.quantity || !ing.unit) {
              validation.valid = false;
              validation.error = `Invalid ingredient: ${JSON.stringify(ing)}`;
              break;
            }
            if (typeof ing.quantity !== 'number' || ing.quantity <= 0) {
              validation.valid = false;
              validation.error = `Invalid quantity for ${ing.name}`;
              break;
            }
          }
        }
        break;

      case 'adjust_portions':
        if (!params.original_servings || !params.new_servings) {
          validation.valid = false;
          validation.error = 'Both original and new servings are required';
        } else if (params.original_servings <= 0 || params.new_servings <= 0) {
          validation.valid = false;
          validation.error = 'Servings must be positive numbers';
        }
        break;

      case 'validate_nutrition':
        if (params.calories === undefined || params.protein === undefined || 
            params.carbs === undefined || params.fat === undefined) {
          validation.valid = false;
          validation.error = 'All macro nutrients are required';
        }
        break;
    }

    return validation;
  }

  // Error handlers
  handleTimeout(functionName, parameters) {
    console.error(`⏱️ Timeout for ${functionName}, using cached or default values`);
    
    // Return cached result if available
    const cacheKey = `${functionName}_fallback`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Return sensible defaults
    if (functionName === 'calculate_nutrition') {
      return {
        calories: 200,
        protein: 10,
        carbs: 20,
        fat: 8,
        fiber: 3,
        sodium: 200,
        _fallback: true
      };
    }
    
    return { error: 'timeout', _fallback: true };
  }

  handleRateLimit(functionName, parameters) {
    console.error(`🚫 Rate limit hit for ${functionName}`);
    
    // Use simpler calculation without AI
    if (functionName === 'calculate_nutrition') {
      return this.calculateNutritionOffline(parameters);
    }
    
    return { error: 'rate_limit', _fallback: true };
  }

  handleParsingError(functionName, parameters) {
    console.error(`📝 Parsing error for ${functionName}`);
    
    // Try to fix common parsing issues
    if (typeof parameters === 'string') {
      try {
        parameters = JSON.parse(parameters);
        return this.executeFunction(functionName, parameters);
      } catch (e) {
        return { error: 'parsing_failed', _fallback: true };
      }
    }
    
    return { error: 'parsing', _fallback: true };
  }

  handleGenericError(functionName, parameters, error) {
    console.error(`❌ Generic error for ${functionName}:`, error.message);
    
    // Log to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      // Log to monitoring service
      console.error('Function call failed:', {
        function: functionName,
        parameters,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
    
    return { 
      error: 'execution_failed', 
      message: error.message,
      _fallback: true 
    };
  }

  // Offline nutrition calculation (no AI/API calls)
  calculateNutritionOffline(params) {
    const { ingredients, servings = 1 } = params;
    
    // Use hardcoded estimates for common ingredients
    const estimates = {
      'chicken': { calories: 165, protein: 31, carbs: 0, fat: 3.6 }, // per 100g
      'rice': { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
      'vegetables': { calories: 25, protein: 1, carbs: 5, fat: 0.2 },
      'oil': { calories: 884, protein: 0, carbs: 0, fat: 100 },
      'bread': { calories: 265, protein: 9, carbs: 49, fat: 3.2 },
      'egg': { calories: 155, protein: 13, carbs: 1.1, fat: 11 },
      'milk': { calories: 42, protein: 3.4, carbs: 5, fat: 1 },
      'cheese': { calories: 402, protein: 25, carbs: 1.3, fat: 33 },
      'pasta': { calories: 131, protein: 5, carbs: 25, fat: 1.1 },
      'default': { calories: 100, protein: 5, carbs: 15, fat: 3 }
    };

    const totals = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0 };
    
    ingredients.forEach(ing => {
      const grams = this.convertToGrams(ing.quantity, ing.unit);
      const factor = grams / 100;
      
      // Find best match in estimates
      let nutritionData = estimates.default;
      for (const [key, value] of Object.entries(estimates)) {
        if (ing.name.toLowerCase().includes(key)) {
          nutritionData = value;
          break;
        }
      }
      
      totals.calories += nutritionData.calories * factor;
      totals.protein += nutritionData.protein * factor;
      totals.carbs += nutritionData.carbs * factor;
      totals.fat += nutritionData.fat * factor;
    });

    // Round and divide by servings
    return {
      calories: Math.round(totals.calories / servings),
      protein: Math.round(totals.protein / servings * 10) / 10,
      carbs: Math.round(totals.carbs / servings * 10) / 10,
      fat: Math.round(totals.fat / servings * 10) / 10,
      fiber: 2, // default estimate
      sodium: 200, // default estimate
      _fallback: true,
      _method: 'offline_estimation'
    };
  }

  // Retry mechanism with exponential backoff
  async retryWithBackoff(fn, retries = this.retryAttempts) {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === retries - 1) throw error;
        
        const delay = Math.pow(2, i) * 1000; // Exponential backoff
        console.log(`Retry ${i + 1}/${retries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // Clear cache (call periodically)
  clearCache() {
    const oldSize = this.cache.size;
    this.cache.clear();
    console.log(`🗑️ Cleared ${oldSize} cached calculations`);
  }

  // Get cache statistics
  getCacheStats() {
    return {
      size: this.cache.size,
      items: Array.from(this.cache.keys())
    };
  }
}

module.exports = new NutritionCalculator();