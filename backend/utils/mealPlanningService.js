
const OpenAI = require('openai');
const Recipe = require('../models/Recipe');
const UserPreferences = require('../models/UserPreferences');
const HealthProfile = require('../models/HealthProfile');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-fallback'
});

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
    },
    {
      input: {
        bmi: 19.2,
        goal: 'muscle_gain',
        activity: 'very_active',
        allergies: [],
        dietary: ['high_protein']
      },
      output: {
        strategy: 'caloric_surplus',
        calorieTarget: 3200,
        macroSplit: { protein: 35, carbs: 45, fat: 20 },
        mealFrequency: 6,
        restrictions: [],
        focus: 'muscle_building_nutrition'
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
        },
        timing: {
          breakfast: '07:00',
          snack1: '10:00',
          lunch: '13:00',
          snack2: '16:00',
          dinner: '19:00'
        }
      }
    },
    {
      input: {
        strategy: 'caloric_surplus',
        calorieTarget: 3200,
        mealFrequency: 6,
        duration: 'weekly'
      },
      output: {
        structure: {
          breakfast: { calories: 600, type: 'hearty' },
          snack1: { calories: 300, type: 'protein_shake' },
          lunch: { calories: 800, type: 'balanced' },
          snack2: { calories: 300, type: 'nuts_fruit' },
          dinner: { calories: 900, type: 'protein_heavy' },
          snack3: { calories: 300, type: 'casein' }
        },
        weeklyVariation: true,
        restDayAdjustment: -400
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
          nutrition: { calories: 350, protein: 18, carbs: 28, fat: 16 },
          alternatives: [
            { name: 'Greek Yogurt Parfait', calories: 340 },
            { name: 'Avocado Toast with Eggs', calories: 360 }
          ]
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
    try {
      // Get user data
      const preferences = await UserPreferences.findOne({ userId });
      const healthProfile = await HealthProfile.findOne({ userId });
      
      if (!preferences || !healthProfile) {
        throw new Error('User preferences or health profile not found');
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
          }
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
    const prompt = `You are a professional nutritionist creating a meal planning strategy.

${this.formatFewShotExamples('step1')}

Now analyze this profile and create a strategy:

User Profile:
- BMI: ${healthProfile.bmi || 22}
- Weight Goal: ${healthProfile.fitnessGoal || 'maintain'}
- Activity Level: ${healthProfile.activityLevel || 'moderate'}
- Current Weight: ${healthProfile.currentWeight} kg
- Target Weight: ${healthProfile.targetWeight} kg
- Allergies: ${preferences.allergies.join(', ') || 'none'}
- Dietary Preferences: ${preferences.dietaryPreferences.join(', ') || 'none'}
- Daily Calorie Target: ${preferences.nutritionalTargets.dailyCalories}

Respond with a JSON strategy object containing:
{
  "strategy": "caloric_deficit|caloric_surplus|maintenance",
  "calorieTarget": number,
  "macroSplit": { "protein": %, "carbs": %, "fat": % },
  "mealFrequency": number (3-6),
  "restrictions": [list],
  "focus": "description",
  "reasoning": "brief explanation"
}`;

    try {
      const response = await openai.chat.completions.create({
        model: this.modelName,
        messages: [
          { role: 'system', content: 'You are a professional nutritionist. Always respond with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3, // Lower for consistency in analysis
        top_p: 0.9,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content);
      console.log('Step 1 - Profile Analysis:', result);
      return result;
    } catch (error) {
      console.error('Step 1 error:', error);
      // Return default strategy
      return {
        strategy: 'maintenance',
        calorieTarget: preferences.nutritionalTargets.dailyCalories || 2000,
        macroSplit: { protein: 25, carbs: 50, fat: 25 },
        mealFrequency: preferences.mealPreferences.mealsPerDay || 3,
        restrictions: [...preferences.allergies, ...preferences.dietaryPreferences],
        focus: 'balanced_nutrition'
      };
    }
  }

  // Step 2: Build meal structure based on strategy
  async step2BuildStructure(strategy, planRequest) {
    const prompt = `You are structuring a meal plan based on the nutritional strategy.

${this.formatFewShotExamples('step2')}

Create a meal structure for:
Strategy: ${JSON.stringify(strategy)}
Duration: ${planRequest.duration} (daily or weekly)
Start Date: ${planRequest.startDate}

Requirements:
- Total calories should match ${strategy.calorieTarget} (±50 calories)
- Include ${strategy.mealFrequency} meals/snacks per day
- Follow the macro split: ${JSON.stringify(strategy.macroSplit)}

Respond with a JSON structure:
{
  "mealStructure": {
    "breakfast": { "calories": number, "type": "light|balanced|hearty", "macros": {...} },
    "lunch": { "calories": number, "type": "...", "macros": {...} },
    "dinner": { "calories": number, "type": "...", "macros": {...} },
    "snack1": { "calories": number, "type": "...", "macros": {...} },
    // ... more as needed
  },
  "timing": {
    "breakfast": "HH:MM",
    "lunch": "HH:MM",
    // ...
  },
  "dailyVariation": ${planRequest.duration === 'weekly'},
  "notes": "brief structure explanation"
}`;

    try {
      const response = await openai.chat.completions.create({
        model: this.modelName,
        messages: [
          { role: 'system', content: 'You are a meal planning expert. Create balanced meal structures.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.5, // Medium for some variety
        top_p: 0.9,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content);
      console.log('Step 2 - Meal Structure:', result);
      return result;
    } catch (error) {
      console.error('Step 2 error:', error);
      // Return basic structure
      return this.getDefaultMealStructure(strategy);
    }
  }

  // Step 3: Generate detailed meals with recipes
  async step3GenerateDetails(structure, preferences, planRequest) {
    // Get relevant recipes from database
    const recipes = await this.getRelevantRecipes(preferences);
    
    const prompt = `You are completing a detailed meal plan with specific recipes and alternatives.

${this.formatFewShotExamples('step3')}

Context:
- Meal Structure: ${JSON.stringify(structure.mealStructure)}
- Dietary Restrictions: ${preferences.allergies.join(', ')}
- Preferences: ${preferences.dietaryPreferences.join(', ')}
- Cuisine Preferences: ${preferences.cuisinePreferences.join(', ')}

Available Recipe Examples (use as inspiration):
${recipes.slice(0, 10).map(r => `- ${r.title}: ${r.nutrition.calories} cal, ${r.cookingTime} min`).join('\n')}

Generate a complete ${planRequest.duration} meal plan with:
1. Specific meal names and descriptions
2. Accurate nutritional values
3. 2-3 alternatives for each meal
4. Cooking time estimates

Respond with JSON:
{
  "days": [
    {
      "date": "ISO date",
      "meals": [
        {
          "type": "breakfast|lunch|dinner|snack",
          "name": "Specific meal name",
          "description": "brief description",
          "nutrition": {
            "calories": number,
            "protein": grams,
            "carbs": grams,
            "fat": grams,
            "fiber": grams
          },
          "cookingTime": minutes,
          "alternatives": [
            {
              "name": "Alternative meal",
              "calories": number,
              "reason": "why it's a good alternative"
            }
          ]
        }
      ]
    }
  ],
  "shoppingHighlights": ["key ingredients to buy"],
  "prepTips": ["meal prep suggestions"]
}`;

    try {
      const response = await openai.chat.completions.create({
        model: this.modelName,
        messages: [
          { role: 'system', content: 'You are a creative chef and nutritionist. Generate diverse, appealing meals.' },
          { role: 'user', content: prompt }
        ],
        temperature: this.temperature, // 0.7 for creativity
        top_p: this.topP, // 0.9 for diversity
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content);
      console.log('Step 3 - Detailed Meals Generated');
      return result;
    } catch (error) {
      console.error('Step 3 error:', error);
      // Generate basic meals
      return this.generateBasicMeals(structure, preferences, planRequest);
    }
  }

  // Helper: Format few-shot examples
  formatFewShotExamples(step) {
    const examples = FEW_SHOT_EXAMPLES[step];
    if (!examples || examples.length === 0) return '';

    return `Here are examples of good responses:\n\n${
      examples.map((ex, i) => 
        `Example ${i + 1}:\nInput: ${JSON.stringify(ex.input, null, 2)}\nOutput: ${JSON.stringify(ex.output, null, 2)}`
      ).join('\n\n')
    }\n`;
  }

  // Helper: Get relevant recipes from database
  async getRelevantRecipes(preferences) {
    const query = {
      'dietaryInfo.allergens': { $nin: preferences.allergies }
    };

    // Add dietary preference filters
    if (preferences.dietaryPreferences.includes('vegetarian')) {
      query['dietaryInfo.isVegetarian'] = true;
    }
    if (preferences.dietaryPreferences.includes('vegan')) {
      query['dietaryInfo.isVegan'] = true;
    }
    if (preferences.dietaryPreferences.includes('gluten_free')) {
      query['dietaryInfo.isGlutenFree'] = true;
    }

    // Add cuisine filter if specified
    if (preferences.cuisinePreferences.length > 0 && !preferences.cuisinePreferences.includes('any')) {
      query.cuisine = { $in: preferences.cuisinePreferences };
    }

    const recipes = await Recipe.find(query)
      .limit(50)
      .select('title nutrition cookingTime cuisine dietaryInfo');

    return recipes;
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
          isCustom: false
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

  // Fallback plan generation (when AI fails)
  async generateFallbackPlan(userId, planRequest) {
    const preferences = await UserPreferences.findOne({ userId });
    const recipes = await Recipe.find({
      'dietaryInfo.allergens': { $nin: preferences?.allergies || [] }
    }).limit(21);

    const startDate = new Date(planRequest.startDate);
    const numDays = planRequest.duration === 'weekly' ? 7 : 1;
    
    const dailyPlans = [];
    
    for (let i = 0; i < numDays; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + i);
      
      const meals = [
        {
          type: 'breakfast',
          name: recipes[i * 3]?.title || 'Oatmeal with Fruits',
          nutrition: recipes[i * 3]?.nutrition || { calories: 350, protein: 10, carbs: 55, fat: 10 },
          order: 0
        },
        {
          type: 'lunch',
          name: recipes[i * 3 + 1]?.title || 'Grilled Chicken Salad',
          nutrition: recipes[i * 3 + 1]?.nutrition || { calories: 500, protein: 35, carbs: 40, fat: 18 },
          order: 1
        },
        {
          type: 'dinner',
          name: recipes[i * 3 + 2]?.title || 'Salmon with Vegetables',
          nutrition: recipes[i * 3 + 2]?.nutrition || { calories: 650, protein: 40, carbs: 50, fat: 25 },
          order: 2
        }
      ];
      
      dailyPlans.push({
        date: currentDate,
        meals,
        notes: 'Auto-generated meal plan'
      });
    }

    return {
      userId,
      type: planRequest.duration,
      startDate,
      endDate: new Date(startDate.getTime() + (numDays - 1) * 24 * 60 * 60 * 1000),
      dailyPlans,
      status: 'active'
    };
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
      structure.timing = {
        breakfast: '07:00',
        snack1: '10:00',
        lunch: '13:00',
        snack2: '16:00',
        dinner: '19:00'
      };
    }

    return structure;
  }

  // Generate basic meals without AI
  generateBasicMeals(structure, preferences, planRequest) {
    const numDays = planRequest.duration === 'weekly' ? 7 : 1;
    const days = [];

    const mealTemplates = {
      breakfast: [
        { name: 'Oatmeal with Berries', calories: 350, protein: 10, carbs: 55, fat: 10 },
        { name: 'Scrambled Eggs with Toast', calories: 400, protein: 20, carbs: 35, fat: 18 },
        { name: 'Greek Yogurt Parfait', calories: 300, protein: 15, carbs: 40, fat: 8 }
      ],
      lunch: [
        { name: 'Chicken Caesar Salad', calories: 500, protein: 35, carbs: 30, fat: 25 },
        { name: 'Turkey Sandwich', calories: 450, protein: 25, carbs: 45, fat: 15 },
        { name: 'Veggie Buddha Bowl', calories: 480, protein: 15, carbs: 65, fat: 18 }
      ],
      dinner: [
        { name: 'Grilled Salmon with Quinoa', calories: 650, protein: 40, carbs: 50, fat: 25 },
        { name: 'Chicken Stir Fry', calories: 600, protein: 35, carbs: 55, fat: 20 },
        { name: 'Beef and Vegetable Stew', calories: 700, protein: 45, carbs: 40, fat: 30 }
      ],
      snack: [
        { name: 'Apple with Almond Butter', calories: 200, protein: 5, carbs: 25, fat: 10 },
        { name: 'Protein Shake', calories: 150, protein: 20, carbs: 10, fat: 3 },
        { name: 'Mixed Nuts', calories: 180, protein: 6, carbs: 8, fat: 16 }
      ]
    };

    for (let day = 0; day < numDays; day++) {
      const meals = [];
      
      Object.entries(structure.mealStructure).forEach(([mealType, mealInfo]) => {
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
          alternatives: [
            {
              name: templates[(day + 1) % templates.length].name,
              calories: templates[(day + 1) % templates.length].calories,
              reason: 'Similar nutritional profile'
            }
          ]
        });
      });

      days.push({
        date: new Date(planRequest.startDate).toISOString(),
        meals
      });
    }

    return { days };
  }
}

module.exports = new MealPlanningService();