// backend/utils/mealPlanningService.js

const OpenAI = require('openai');
const Recipe = require('../models/Recipe');
const UserPreferences = require('../models/UserPreferences');
const HealthProfile = require('../models/HealthProfile');

// Initialize OpenAI only if API key exists
let openai = null;
if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'sk-fallback') {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
}

// Few-shot examples for each step
const FEW_SHOT_EXAMPLES = {
  step1: [
    {
      input: {
        bmi: 24.5,
        goal: 'weight_loss',
        activity: 'moderate',
        allergies: ['nuts'],
        dietary: ['vegetarian']
      },
      output: {
        strategy: 'caloric_deficit',
        calorieTarget: 1800,
        macroSplit: { protein: 30, carbs: 40, fat: 30 },
        mealFrequency: 5,
        restrictions: ['no_nuts', 'vegetarian_only'],
        focus: 'high_protein_plant_based'
      }
    }
  ],
  step2: [
    {
      input: {
        strategy: 'caloric_deficit',
        calorieTarget: 1800,
        mealFrequency: 5,
        duration: 'daily'
      },
      output: {
        structure: {
          breakfast: { calories: 350, type: 'light' },
          snack1: { calories: 150, type: 'protein' },
          lunch: { calories: 500, type: 'balanced' },
          snack2: { calories: 150, type: 'fruit' },
          dinner: { calories: 650, type: 'hearty' }
        }
      }
    }
  ],
  step3: [
    {
      input: {
        structure: { breakfast: { calories: 350 } },
        restrictions: ['vegetarian'],
        preferences: ['mediterranean']
      },
      output: {
        meal: {
          name: 'Mediterranean Veggie Scramble',
          type: 'breakfast',
          nutrition: { calories: 350, protein: 18, carbs: 28, fat: 16 }
        }
      }
    }
  ]
};

class MealPlanningService {
  constructor() {
    this.modelName = process.env.AI_MODEL || 'gpt-3.5-turbo';
    this.temperature = 0.7;
    this.topP = 0.9;
  }

  // Main function to generate meal plan
  async generateMealPlan(userId, planRequest) {
    // Check if OpenAI is available
    if (!openai) {
      console.log('OpenAI not configured, using fallback meal generation');
      return this.generateFallbackPlan(userId, planRequest);
    }

    try {
      // Get user data
      const preferences = await UserPreferences.findOne({ userId });
      const healthProfile = await HealthProfile.findOne({ userId });
      
      if (!preferences || !healthProfile) {
        console.log('User data not found, using fallback');
        return this.generateFallbackPlan(userId, planRequest);
      }

      // Sequential prompting process
      const step1Result = await this.step1AnalyzeProfile(healthProfile, preferences);
      const step2Result = await this.step2BuildStructure(step1Result, planRequest);
      const step3Result = await this.step3GenerateDetails(step2Result, preferences, planRequest);

      // Format the final meal plan
      const mealPlan = await this.formatMealPlan(
        step3Result,
        planRequest,
        {
          preferences: preferences.toObject(),
          healthProfile: healthProfile.toObject(),
          aiStrategy: {
            step1Analysis: step1Result,
            step2Structure: step2Result,
            step3Details: step3Result
          },
          method: 'ai-generated'
        }
      );

      return mealPlan;
    } catch (error) {
      console.error('Meal planning error:', error);
      // Fallback to simple generation if AI fails
      return this.generateFallbackPlan(userId, planRequest);
    }
  }

  // Step 1: Analyze user profile and determine strategy
  async step1AnalyzeProfile(healthProfile, preferences) {
    if (!openai) {
      return this.getDefaultStrategy(healthProfile, preferences);
    }

    const prompt = `Analyze this profile and create a meal planning strategy...`;

    try {
      const response = await openai.chat.completions.create({
        model: this.modelName,
        messages: [
          { role: 'system', content: 'You are a professional nutritionist.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        top_p: 0.9,
        response_format: { type: "json_object" }
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('Step 1 error:', error);
      return this.getDefaultStrategy(healthProfile, preferences);
    }
  }

  // Step 2: Build meal structure
  async step2BuildStructure(strategy, planRequest) {
    if (!openai) {
      return this.getDefaultMealStructure(strategy);
    }

    // AI implementation...
    try {
      // ... existing AI code
      return result;
    } catch (error) {
      return this.getDefaultMealStructure(strategy);
    }
  }

  // Step 3: Generate detailed meals
  async step3GenerateDetails(structure, preferences, planRequest) {
    if (!openai) {
      return this.generateBasicMeals(structure, preferences, planRequest);
    }

    // AI implementation...
    try {
      // ... existing AI code
      return result;
    } catch (error) {
      return this.generateBasicMeals(structure, preferences, planRequest);
    }
  }

  // Helper: Get default strategy without AI
  getDefaultStrategy(healthProfile, preferences) {
    const bmr = this.calculateBMR(
      healthProfile?.physicalMetrics?.weight?.normalizedValue || 70,
      healthProfile?.physicalMetrics?.height?.normalizedValue || 170,
      healthProfile?.demographics?.age || 30,
      healthProfile?.demographics?.gender || 'male'
    );

    return {
      strategy: 'maintenance',
      calorieTarget: preferences?.nutritionalTargets?.dailyCalories || bmr * 1.5,
      macroSplit: { protein: 25, carbs: 50, fat: 25 },
      mealFrequency: preferences?.mealPreferences?.mealsPerDay || 3,
      restrictions: [...(preferences?.allergies || []), ...(preferences?.dietaryPreferences || [])],
      focus: 'balanced_nutrition'
    };
  }

  // Calculate BMR
  calculateBMR(weight, height, age, gender) {
    if (gender === 'male') {
      return Math.round(10 * weight + 6.25 * height - 5 * age + 5);
    } else {
      return Math.round(10 * weight + 6.25 * height - 5 * age - 161);
    }
  }

  // Helper: Get default meal structure
  getDefaultMealStructure(strategy) {
    const totalCalories = strategy.calorieTarget || 2000;
    const mealCount = strategy.mealFrequency || 3;

    const structure = {
      mealStructure: {},
      timing: {}
    };

    if (mealCount === 3) {
      structure.mealStructure = {
        breakfast: { calories: Math.round(totalCalories * 0.25), type: 'balanced' },
        lunch: { calories: Math.round(totalCalories * 0.35), type: 'balanced' },
        dinner: { calories: Math.round(totalCalories * 0.40), type: 'hearty' }
      };
      structure.timing = {
        breakfast: '08:00',
        lunch: '12:30',
        dinner: '19:00'
      };
    } else if (mealCount === 5) {
      structure.mealStructure = {
        breakfast: { calories: Math.round(totalCalories * 0.20), type: 'light' },
        snack1: { calories: Math.round(totalCalories * 0.10), type: 'fruit' },
        lunch: { calories: Math.round(totalCalories * 0.30), type: 'balanced' },
        snack2: { calories: Math.round(totalCalories * 0.10), type: 'protein' },
        dinner: { calories: Math.round(totalCalories * 0.30), type: 'hearty' }
      };
    }

    return structure;
  }

  // Generate basic meals without AI - WITH INGREDIENTS
  generateBasicMeals(structure, preferences, planRequest) {
    const numDays = planRequest.duration === 'weekly' ? 7 : 1;
    const days = [];

    const mealTemplates = {
      breakfast: [
        { 
          name: 'Oatmeal with Berries', 
          calories: 350, protein: 10, carbs: 55, fat: 10,
          ingredients: [
            { name: 'Oats', quantity: 50, unit: 'g' },
            { name: 'Mixed Berries', quantity: 100, unit: 'g' },
            { name: 'Milk', quantity: 200, unit: 'ml' },
            { name: 'Honey', quantity: 1, unit: 'tbsp' }
          ]
        },
        { 
          name: 'Scrambled Eggs with Toast', 
          calories: 400, protein: 20, carbs: 35, fat: 18,
          ingredients: [
            { name: 'Eggs', quantity: 2, unit: 'unit' },
            { name: 'Bread', quantity: 2, unit: 'slice' },
            { name: 'Butter', quantity: 10, unit: 'g' },
            { name: 'Salt', quantity: 1, unit: 'g' },
            { name: 'Black Pepper', quantity: 1, unit: 'g' }
          ]
        },
        { 
          name: 'Greek Yogurt Parfait', 
          calories: 300, protein: 15, carbs: 40, fat: 8,
          ingredients: [
            { name: 'Greek Yogurt', quantity: 150, unit: 'g' },
            { name: 'Granola', quantity: 30, unit: 'g' },
            { name: 'Mixed Berries', quantity: 50, unit: 'g' },
            { name: 'Honey', quantity: 1, unit: 'tbsp' }
          ]
        }
      ],
      lunch: [
        { 
          name: 'Chicken Caesar Salad', 
          calories: 500, protein: 35, carbs: 30, fat: 25,
          ingredients: [
            { name: 'Chicken Breast', quantity: 150, unit: 'g' },
            { name: 'Romaine Lettuce', quantity: 100, unit: 'g' },
            { name: 'Caesar Dressing', quantity: 2, unit: 'tbsp' },
            { name: 'Parmesan Cheese', quantity: 20, unit: 'g' },
            { name: 'Croutons', quantity: 30, unit: 'g' }
          ]
        },
        { 
          name: 'Turkey Sandwich', 
          calories: 450, protein: 25, carbs: 45, fat: 15,
          ingredients: [
            { name: 'Turkey Slices', quantity: 100, unit: 'g' },
            { name: 'Bread', quantity: 2, unit: 'slice' },
            { name: 'Lettuce', quantity: 20, unit: 'g' },
            { name: 'Tomato', quantity: 50, unit: 'g' },
            { name: 'Mayonnaise', quantity: 1, unit: 'tbsp' },
            { name: 'Cheese', quantity: 30, unit: 'g' }
          ]
        },
        { 
          name: 'Veggie Buddha Bowl', 
          calories: 480, protein: 15, carbs: 65, fat: 18,
          ingredients: [
            { name: 'Quinoa', quantity: 60, unit: 'g' },
            { name: 'Mixed Vegetables', quantity: 200, unit: 'g' },
            { name: 'Chickpeas', quantity: 100, unit: 'g' },
            { name: 'Avocado', quantity: 50, unit: 'g' },
            { name: 'Tahini Dressing', quantity: 2, unit: 'tbsp' }
          ]
        }
      ],
      dinner: [
        { 
          name: 'Grilled Salmon with Quinoa', 
          calories: 650, protein: 40, carbs: 50, fat: 25,
          ingredients: [
            { name: 'Salmon Fillet', quantity: 180, unit: 'g' },
            { name: 'Quinoa', quantity: 80, unit: 'g' },
            { name: 'Broccoli', quantity: 150, unit: 'g' },
            { name: 'Olive Oil', quantity: 1, unit: 'tbsp' },
            { name: 'Lemon', quantity: 1, unit: 'unit' },
            { name: 'Garlic', quantity: 2, unit: 'unit' }
          ]
        },
        { 
          name: 'Chicken Stir Fry', 
          calories: 600, protein: 35, carbs: 55, fat: 20,
          ingredients: [
            { name: 'Chicken Breast', quantity: 150, unit: 'g' },
            { name: 'Rice', quantity: 75, unit: 'g' },
            { name: 'Mixed Stir Fry Vegetables', quantity: 200, unit: 'g' },
            { name: 'Soy Sauce', quantity: 2, unit: 'tbsp' },
            { name: 'Sesame Oil', quantity: 1, unit: 'tsp' },
            { name: 'Ginger', quantity: 10, unit: 'g' }
          ]
        },
        { 
          name: 'Beef and Vegetable Stew', 
          calories: 700, protein: 45, carbs: 40, fat: 30,
          ingredients: [
            { name: 'Beef Chunks', quantity: 200, unit: 'g' },
            { name: 'Potato', quantity: 150, unit: 'g' },
            { name: 'Carrots', quantity: 100, unit: 'g' },
            { name: 'Onion', quantity: 100, unit: 'g' },
            { name: 'Beef Broth', quantity: 250, unit: 'ml' },
            { name: 'Tomato Paste', quantity: 2, unit: 'tbsp' }
          ]
        }
      ],
      snack: [
        { 
          name: 'Apple with Almond Butter', 
          calories: 200, protein: 5, carbs: 25, fat: 10,
          ingredients: [
            { name: 'Apple', quantity: 1, unit: 'unit' },
            { name: 'Almond Butter', quantity: 2, unit: 'tbsp' }
          ]
        },
        { 
          name: 'Protein Shake', 
          calories: 150, protein: 20, carbs: 10, fat: 3,
          ingredients: [
            { name: 'Protein Powder', quantity: 30, unit: 'g' },
            { name: 'Milk', quantity: 250, unit: 'ml' },
            { name: 'Banana', quantity: 0.5, unit: 'unit' }
          ]
        },
        { 
          name: 'Mixed Nuts', 
          calories: 180, protein: 6, carbs: 8, fat: 16,
          ingredients: [
            { name: 'Mixed Nuts', quantity: 30, unit: 'g' }
          ]
        }
      ]
    };

    for (let day = 0; day < numDays; day++) {
      const meals = [];
      
      Object.entries(structure.mealStructure || {}).forEach(([mealType, mealInfo]) => {
        const templateType = mealType.includes('snack') ? 'snack' : mealType;
        const templates = mealTemplates[templateType] || mealTemplates.snack;
        const template = templates[day % templates.length];
        
        meals.push({
          type: mealType.includes('snack') ? 'snack' : mealType,
          name: template.name,
          nutrition: {
            calories: template.calories,
            protein: template.protein,
            carbs: template.carbs,
            fat: template.fat,
            fiber: 5
          },
          cookingTime: 20,
          // CRITICAL: Add customRecipe with ingredients for shopping list
          customRecipe: {
            name: template.name,
            ingredients: template.ingredients,
            instructions: ['Prepare and cook as directed'],
            cookingTime: 20
          },
          alternatives: [
            {
              name: templates[(day + 1) % templates.length].name,
              calories: templates[(day + 1) % templates.length].calories,
              reason: 'Similar nutritional profile'
            }
          ]
        });
      });

      const currentDate = new Date(planRequest.startDate);
      currentDate.setDate(currentDate.getDate() + day);
      
      days.push({
        date: currentDate.toISOString(),
        meals
      });
    }

    return { days };
  }

  // Helper: Format final meal plan
  async formatMealPlan(detailedMeals, planRequest, metadata) {
    const startDate = new Date(planRequest.startDate);
    const endDate = new Date(planRequest.startDate);
    
    if (planRequest.duration === 'weekly') {
      endDate.setDate(endDate.getDate() + 6);
    }

    const dailyPlans = detailedMeals.days.map((day, index) => {
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + index);

      return {
        date: currentDate,
        meals: day.meals.map((meal, mealIndex) => ({
          type: meal.type,
          name: meal.name,
          nutrition: meal.nutrition,
          servings: 1,
          alternatives: meal.alternatives || [],
          order: mealIndex,
          isLocked: false,
          isCustom: false,
          customRecipe: meal.customRecipe || null
        })),
        notes: day.notes || ''
      };
    });

    return {
      userId: planRequest.userId,
      type: planRequest.duration,
      startDate,
      endDate,
      dailyPlans,
      generationMetadata: metadata,
      status: 'active'
    };
  }

  // Fallback plan generation (when AI fails or not available)
  async generateFallbackPlan(userId, planRequest) {
    const preferences = await UserPreferences.findOne({ userId });
    const healthProfile = await HealthProfile.findOne({ userId });
    
    // Get default strategy
    const strategy = this.getDefaultStrategy(healthProfile, preferences);
    
    // Get default structure
    const structure = this.getDefaultMealStructure(strategy);
    
    // Generate basic meals with ingredients
    const detailedMeals = this.generateBasicMeals(structure, preferences, planRequest);
    
    // Format the plan
    return this.formatMealPlan(
      detailedMeals,
      planRequest,
      {
        method: 'fallback',
        preferences: preferences?.toObject(),
        healthProfile: healthProfile?.toObject()
      }
    );
  }

  // Helper: Format few-shot examples
  formatFewShotExamples(step) {
    const examples = FEW_SHOT_EXAMPLES[step];
    if (!examples || examples.length === 0) return '';

    return `Here are examples:\n${
      examples.map((ex, i) => 
        `Example ${i + 1}:\nInput: ${JSON.stringify(ex.input)}\nOutput: ${JSON.stringify(ex.output)}`
      ).join('\n\n')
    }\n`;
  }

  // Helper: Get relevant recipes from database
  async getRelevantRecipes(preferences) {
    const query = {};
    
    if (preferences?.allergies?.length > 0) {
      query['dietaryInfo.allergens'] = { $nin: preferences.allergies };
    }

    const recipes = await Recipe.find(query)
      .limit(50)
      .select('title nutrition cookingTime cuisine dietaryInfo');

    return recipes;
  }
}

module.exports = new MealPlanningService();