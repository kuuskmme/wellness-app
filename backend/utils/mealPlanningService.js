const OpenAI = require('openai');
const Recipe = require('../models/Recipe');
const UserPreferences = require('../models/UserPreferences');
const HealthProfile = require('../models/HealthProfile');
const MealPlan = require('../models/MealPlan');

// Initialize OpenAI with fallback
let openai = null;
if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'sk-fallback') {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
}

// Few-shot examples for sequential prompting
const FEW_SHOT_EXAMPLES = {
  step1: [
    {
      input: { 
        age: 30, 
        gender: 'male', 
        weight: 80, 
        activityLevel: 'moderate',
        goal: 'maintenance' 
      },
      output: {
        strategy: 'balanced_nutrition',
        calorieTarget: 2400,
        macroSplit: { protein: 25, carbs: 45, fat: 30 },
        mealFrequency: 3,
        focus: 'sustained_energy'
      }
    },
    {
      input: { 
        age: 25, 
        gender: 'female', 
        weight: 65, 
        activityLevel: 'high',
        goal: 'muscle_gain' 
      },
      output: {
        strategy: 'high_protein',
        calorieTarget: 2200,
        macroSplit: { protein: 35, carbs: 40, fat: 25 },
        mealFrequency: 5,
        focus: 'muscle_recovery'
      }
    }
  ],
  step2: [
    {
      input: {
        strategy: 'balanced_nutrition',
        calorieTarget: 2400,
        mealFrequency: 3
      },
      output: {
        mealStructure: {
          breakfast: { calories: 600, type: 'balanced' },
          lunch: { calories: 800, type: 'hearty' },
          dinner: { calories: 1000, type: 'satisfying' }
        },
        timing: {
          breakfast: '07:00-09:00',
          lunch: '12:00-14:00',
          dinner: '18:00-20:00'
        }
      }
    }
  ],
  step3: [
    {
      input: {
        meal: 'breakfast',
        calories: 600,
        preferences: ['vegetarian'],
        allergies: ['nuts']
      },
      output: {
        name: 'Mediterranean Breakfast Bowl',
        ingredients: ['eggs', 'spinach', 'feta', 'tomatoes', 'whole grain toast'],
        nutrition: { calories: 580, protein: 25, carbs: 60, fat: 22 },
        cookingTime: 15
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
   // Enhanced meal templates with detailed cooking instructions
  getDetailedMealTemplates() {
    return {
      breakfast: [
        {
          name: 'Oatmeal with Berries and Nuts',
          calories: 350,
          protein: 12,
          carbs: 55,
          fat: 8,
          prepTime: 10,
          ingredients: [
            { name: 'Rolled oats', quantity: 80, unit: 'g' },
            { name: 'Almond milk', quantity: 250, unit: 'ml' },
            { name: 'Mixed berries', quantity: 100, unit: 'g' },
            { name: 'Walnuts', quantity: 20, unit: 'g' },
            { name: 'Honey', quantity: 1, unit: 'tbsp' },
            { name: 'Cinnamon', quantity: 1, unit: 'tsp' }
          ],
          instructions: [
            'Bring almond milk to a gentle boil in a medium saucepan over medium heat',
            'Add oats and reduce heat to low, stirring occasionally for 5-7 minutes until creamy',
            'While oats cook, rinse berries and roughly chop walnuts',
            'Remove oats from heat when they reach desired consistency',
            'Stir in honey and cinnamon until well combined',
            'Transfer to a bowl and top with fresh berries and chopped walnuts',
            'Let cool for 1-2 minutes before enjoying'
          ]
        },
        {
          name: 'Scrambled Eggs with Avocado Toast',
          calories: 420,
          protein: 22,
          carbs: 35,
          fat: 20,
          prepTime: 15,
          ingredients: [
            { name: 'Eggs', quantity: 3, unit: 'large' },
            { name: 'Whole grain bread', quantity: 2, unit: 'slices' },
            { name: 'Avocado', quantity: 100, unit: 'g' },
            { name: 'Butter', quantity: 1, unit: 'tbsp' },
            { name: 'Salt', quantity: 0.5, unit: 'tsp' },
            { name: 'Black pepper', quantity: 0.25, unit: 'tsp' },
            { name: 'Lime juice', quantity: 1, unit: 'tsp' }
          ],
          instructions: [
            'Toast bread slices until golden brown',
            'While bread toasts, crack eggs into a bowl and whisk with salt and pepper',
            'Heat butter in a non-stick pan over medium-low heat',
            'Pour in eggs and let sit for 20 seconds',
            'Using a spatula, gently push eggs from edges toward center, creating soft curds',
            'Continue cooking slowly, stirring every 20-30 seconds until eggs are just set but still creamy',
            'Meanwhile, mash avocado with lime juice and a pinch of salt',
            'Spread mashed avocado on toast',
            'Plate scrambled eggs alongside avocado toast and serve immediately'
          ]
        },
        {
          name: 'Greek Yogurt Parfait',
          calories: 300,
          protein: 15,
          carbs: 40,
          fat: 8,
          prepTime: 5,
          ingredients: [
            { name: 'Greek Yogurt', quantity: 150, unit: 'g' },
            { name: 'Granola', quantity: 30, unit: 'g' },
            { name: 'Mixed Berries', quantity: 50, unit: 'g' },
            { name: 'Honey', quantity: 1, unit: 'tbsp' }
          ],
          instructions: [
            'In a glass or bowl, add half the Greek yogurt',
            'Drizzle with half the honey',
            'Add half the berries and granola',
            'Layer remaining yogurt on top',
            'Finish with remaining berries, granola, and honey',
            'Enjoy immediately for best texture'
          ]
        }
      ],
      
      lunch: [
        {
          name: 'Chicken Caesar Salad',
          calories: 450,
          protein: 35,
          carbs: 25,
          fat: 22,
          prepTime: 20,
          ingredients: [
            { name: 'Chicken breast', quantity: 150, unit: 'g' },
            { name: 'Romaine lettuce', quantity: 200, unit: 'g' },
            { name: 'Caesar dressing', quantity: 2, unit: 'tbsp' },
            { name: 'Parmesan cheese', quantity: 30, unit: 'g' },
            { name: 'Croutons', quantity: 30, unit: 'g' },
            { name: 'Olive oil', quantity: 1, unit: 'tbsp' },
            { name: 'Garlic powder', quantity: 0.5, unit: 'tsp' },
            { name: 'Black pepper', quantity: 0.25, unit: 'tsp' }
          ],
          instructions: [
            'Season chicken breast with garlic powder, salt, and pepper on both sides',
            'Heat olive oil in a skillet over medium-high heat',
            'Cook chicken for 6-7 minutes per side until golden and internal temp reaches 165°F',
            'Remove chicken and let rest for 5 minutes',
            'Meanwhile, wash and chop romaine lettuce into bite-sized pieces',
            'Place lettuce in a large bowl',
            'Slice chicken into strips',
            'Add chicken to lettuce along with croutons',
            'Drizzle with Caesar dressing and toss to combine',
            'Top with freshly grated Parmesan cheese',
            'Serve immediately for best texture'
          ]
        },
        {
          name: 'Mediterranean Quinoa Bowl',
          calories: 480,
          protein: 18,
          carbs: 65,
          fat: 18,
          prepTime: 25,
          ingredients: [
            { name: 'Quinoa', quantity: 80, unit: 'g' },
            { name: 'Chickpeas', quantity: 100, unit: 'g' },
            { name: 'Cherry tomatoes', quantity: 100, unit: 'g' },
            { name: 'Cucumber', quantity: 100, unit: 'g' },
            { name: 'Feta cheese', quantity: 40, unit: 'g' },
            { name: 'Olive oil', quantity: 1, unit: 'tbsp' },
            { name: 'Lemon juice', quantity: 2, unit: 'tbsp' },
            { name: 'Fresh parsley', quantity: 10, unit: 'g' }
          ],
          instructions: [
            'Rinse quinoa under cold water until water runs clear',
            'Bring 160ml water to boil, add quinoa and a pinch of salt',
            'Reduce heat to low, cover, and simmer for 15 minutes',
            'Remove from heat and let stand covered for 5 minutes, then fluff with fork',
            'While quinoa cooks, dice cucumber and halve cherry tomatoes',
            'Drain and rinse chickpeas if using canned',
            'Chop parsley finely',
            'In a small bowl, whisk together olive oil, lemon juice, salt and pepper for dressing',
            'Combine cooked quinoa, chickpeas, tomatoes, and cucumber in a bowl',
            'Drizzle with dressing and toss to combine',
            'Top with crumbled feta cheese and fresh parsley',
            'Serve warm or at room temperature'
          ]
        },
        {
          name: 'Turkey Sandwich',
          calories: 450,
          protein: 28,
          carbs: 45,
          fat: 15,
          prepTime: 10,
          ingredients: [
            { name: 'Turkey Breast', quantity: 100, unit: 'g' },
            { name: 'Whole Wheat Bread', quantity: 2, unit: 'slice' },
            { name: 'Lettuce', quantity: 20, unit: 'g' },
            { name: 'Tomato', quantity: 50, unit: 'g' },
            { name: 'Mustard', quantity: 1, unit: 'tbsp' },
            { name: 'Swiss cheese', quantity: 30, unit: 'g' }
          ],
          instructions: [
            'Toast bread slices lightly if desired',
            'Spread mustard on one slice of bread',
            'Layer turkey breast on the bread',
            'Add swiss cheese on top of turkey',
            'Wash and dry lettuce leaves',
            'Slice tomato into 1/4 inch thick rounds',
            'Layer lettuce and tomato on top of cheese',
            'Top with second slice of bread',
            'Cut diagonally if desired and serve'
          ]
        }
      ],
      
      dinner: [
        {
          name: 'Grilled Salmon with Roasted Vegetables',
          calories: 550,
          protein: 40,
          carbs: 35,
          fat: 25,
          prepTime: 30,
          ingredients: [
            { name: 'Salmon fillet', quantity: 180, unit: 'g' },
            { name: 'Broccoli', quantity: 150, unit: 'g' },
            { name: 'Sweet potato', quantity: 150, unit: 'g' },
            { name: 'Olive oil', quantity: 2, unit: 'tbsp' },
            { name: 'Lemon', quantity: 1, unit: 'whole' },
            { name: 'Garlic', quantity: 2, unit: 'cloves' },
            { name: 'Fresh dill', quantity: 5, unit: 'g' },
            { name: 'Salt and pepper', quantity: 1, unit: 'tsp' }
          ],
          instructions: [
            'Preheat oven to 425°F (220°C)',
            'Peel and dice sweet potato into 1-inch cubes',
            'Cut broccoli into florets',
            'Toss vegetables with 1 tbsp olive oil, salt, and pepper',
            'Spread vegetables on a baking sheet and roast for 20 minutes',
            'Meanwhile, pat salmon dry with paper towels',
            'Season salmon with salt, pepper, and minced garlic',
            'Heat remaining olive oil in an oven-safe skillet over medium-high heat',
            'Place salmon skin-side up and sear for 3-4 minutes until golden',
            'Flip salmon and transfer skillet to oven',
            'Bake for 8-10 minutes until salmon flakes easily',
            'Remove vegetables when tender and slightly caramelized',
            'Squeeze fresh lemon over salmon and vegetables',
            'Garnish with fresh dill and serve immediately'
          ]
        },
        {
          name: 'Beef Stir-Fry with Brown Rice',
          calories: 520,
          protein: 35,
          carbs: 55,
          fat: 18,
          prepTime: 35,
          ingredients: [
            { name: 'Lean beef strips', quantity: 150, unit: 'g' },
            { name: 'Brown rice', quantity: 80, unit: 'g' },
            { name: 'Mixed stir-fry vegetables', quantity: 200, unit: 'g' },
            { name: 'Soy sauce', quantity: 2, unit: 'tbsp' },
            { name: 'Sesame oil', quantity: 1, unit: 'tbsp' },
            { name: 'Ginger', quantity: 1, unit: 'tsp' },
            { name: 'Garlic', quantity: 2, unit: 'cloves' },
            { name: 'Cornstarch', quantity: 1, unit: 'tsp' }
          ],
          instructions: [
            'Cook brown rice according to package directions (typically 25-30 minutes)',
            'While rice cooks, slice beef against the grain into thin strips',
            'Toss beef with cornstarch and a pinch of salt',
            'Mince garlic and grate fresh ginger',
            'Heat wok or large skillet over high heat',
            'Add half the sesame oil and swirl to coat',
            'Add beef in a single layer and let sear for 1 minute without stirring',
            'Stir-fry beef for another 2 minutes until browned, then remove from pan',
            'Add remaining oil to pan with garlic and ginger, stir for 30 seconds',
            'Add vegetables and stir-fry for 3-4 minutes until crisp-tender',
            'Return beef to pan with soy sauce',
            'Toss everything together for 1 minute',
            'Serve over brown rice immediately'
          ]
        },
        {
          name: 'Chicken Stir-Fry',
          calories: 520,
          protein: 38,
          carbs: 50,
          fat: 18,
          prepTime: 25,
          ingredients: [
            { name: 'Chicken Breast', quantity: 150, unit: 'g' },
            { name: 'Mixed Stir-Fry Vegetables', quantity: 200, unit: 'g' },
            { name: 'Rice', quantity: 100, unit: 'g' },
            { name: 'Soy Sauce', quantity: 2, unit: 'tbsp' },
            { name: 'Sesame Oil', quantity: 1, unit: 'tsp' },
            { name: 'Ginger', quantity: 1, unit: 'tsp' },
            { name: 'Garlic', quantity: 2, unit: 'cloves' }
          ],
          instructions: [
            'Cook rice according to package directions',
            'Cut chicken into bite-sized pieces',
            'Mince garlic and ginger',
            'Heat sesame oil in a wok or large skillet over high heat',
            'Add chicken and stir-fry for 3-4 minutes until golden',
            'Add garlic and ginger, stir for 30 seconds',
            'Add vegetables and stir-fry for 3-4 minutes',
            'Add soy sauce and toss everything together',
            'Cook for another minute until sauce coats everything',
            'Serve immediately over rice'
          ]
        }
      ],
      
      snack: [
        {
          name: 'Greek Yogurt Parfait',
          calories: 180,
          protein: 15,
          carbs: 20,
          fat: 5,
          prepTime: 5,
          ingredients: [
            { name: 'Greek yogurt', quantity: 150, unit: 'g' },
            { name: 'Granola', quantity: 20, unit: 'g' },
            { name: 'Mixed berries', quantity: 50, unit: 'g' },
            { name: 'Honey', quantity: 1, unit: 'tsp' }
          ],
          instructions: [
            'In a glass or bowl, add half the Greek yogurt',
            'Drizzle with half the honey',
            'Add half the berries and granola',
            'Layer remaining yogurt on top',
            'Finish with remaining berries, granola, and honey',
            'Enjoy immediately for best texture'
          ]
        },
        {
          name: 'Hummus with Veggie Sticks',
          calories: 150,
          protein: 6,
          carbs: 18,
          fat: 7,
          prepTime: 10,
          ingredients: [
            { name: 'Hummus', quantity: 80, unit: 'g' },
            { name: 'Carrot sticks', quantity: 80, unit: 'g' },
            { name: 'Cucumber sticks', quantity: 60, unit: 'g' },
            { name: 'Bell pepper strips', quantity: 60, unit: 'g' }
          ],
          instructions: [
            'Peel carrots and cut into 3-inch sticks',
            'Slice cucumber into similar-sized sticks',
            'Remove seeds from bell pepper and cut into strips',
            'Arrange vegetables on a plate',
            'Place hummus in a small bowl in the center',
            'Optional: drizzle hummus with olive oil and sprinkle with paprika',
            'Serve immediately or store vegetables in water to keep crisp'
          ]
        },
        {
          name: 'Apple with Almond Butter',
          calories: 200,
          protein: 5,
          carbs: 25,
          fat: 10,
          prepTime: 3,
          ingredients: [
            { name: 'Apple', quantity: 1, unit: 'medium' },
            { name: 'Almond Butter', quantity: 1, unit: 'tbsp' }
          ],
          instructions: [
            'Wash and core the apple',
            'Cut apple into 8 wedges',
            'Arrange on a plate',
            'Place almond butter in a small bowl for dipping',
            'Or spread almond butter directly on apple slices',
            'Enjoy immediately to prevent browning'
          ]
        }
      ]
    };
  }

  // Main entry point for meal plan generation
  async generateMealPlan(userId, planRequest) {
    try {
      const preferences = await UserPreferences.findOne({ userId });
      const healthProfile = await HealthProfile.findOne({ userId });

      if (!openai) {
        console.log('No OpenAI API key, using fallback generation');
        return this.generateFallbackPlan(userId, planRequest);
      }

      // Sequential prompting - 3 steps minimum
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

    const prompt = `Analyze this profile and create a meal planning strategy.

User Profile:
- Age: ${healthProfile?.demographics?.age || 30}
- Gender: ${healthProfile?.demographics?.gender || 'not specified'}
- Weight: ${healthProfile?.physicalMetrics?.weight?.value || 70} kg
- Height: ${healthProfile?.physicalMetrics?.height?.value || 170} cm
- Activity Level: ${healthProfile?.lifestyle?.activityLevel || 'moderate'}
- Goal: ${healthProfile?.goals?.primary || 'general health'}

Dietary Preferences: ${preferences?.dietaryPreferences?.join(', ') || 'none'}
Allergies: ${preferences?.allergies?.join(', ') || 'none'}

${this.formatFewShotExamples('step1')}

Create a nutrition strategy with:
1. Strategy name
2. Daily calorie target
3. Macro split (protein%, carbs%, fat%)
4. Meal frequency
5. Key focus areas

Return as JSON.`;

    try {
      const response = await openai.chat.completions.create({
        model: this.modelName,
        messages: [
          { role: 'system', content: 'You are a professional nutritionist creating personalized meal strategies.' },
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

    const prompt = `Build a meal structure based on this strategy.

Strategy:
${JSON.stringify(strategy, null, 2)}

Duration: ${planRequest.duration}
Start Date: ${planRequest.startDate}

${this.formatFewShotExamples('step2')}

Create a meal structure with:
1. Calorie distribution per meal
2. Meal timing recommendations
3. Meal types (light/balanced/hearty)

Return as JSON.`;

    try {
      const response = await openai.chat.completions.create({
        model: this.modelName,
        messages: [
          { role: 'system', content: 'You are structuring meals based on nutritional strategy.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.5,
        top_p: 0.9,
        response_format: { type: "json_object" }
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('Step 2 error:', error);
      return this.getDefaultMealStructure(strategy);
    }
  }

  // Step 3: Generate detailed meals
  async step3GenerateDetails(structure, preferences, planRequest) {
    if (!openai) {
      return this.generateBasicMeals(structure, preferences, planRequest);
    }

    const numDays = planRequest.duration === 'weekly' ? 7 : 1;
    const days = [];

    for (let day = 0; day < numDays; day++) {
      const meals = [];
      
      for (const [mealType, mealInfo] of Object.entries(structure.mealStructure)) {
        const prompt = `Generate a specific meal.

Meal Type: ${mealType}
Target Calories: ${mealInfo.calories}
Dietary Preferences: ${preferences?.dietaryPreferences?.join(', ') || 'none'}
Allergies: ${preferences?.allergies?.join(', ') || 'none'}
Day: ${day + 1} of ${numDays}

${this.formatFewShotExamples('step3')}

Create a meal with:
1. Name
2. Ingredients list with quantities
3. Nutrition breakdown
4. Cooking time
5. Instructions

Return as JSON.`;

        try {
          const response = await openai.chat.completions.create({
            model: this.modelName,
            messages: [
              { role: 'system', content: 'You are creating specific, delicious meals.' },
              { role: 'user', content: prompt }
            ],
            temperature: this.temperature,
            top_p: this.topP,
            response_format: { type: "json_object" }
          });

          const mealDetails = JSON.parse(response.choices[0].message.content);
          meals.push({
            type: mealType,
            ...mealDetails
          });
        } catch (error) {
          console.error(`Step 3 error for ${mealType}:`, error);
          // Use fallback meal
          meals.push(this.getDefaultMeal(mealType, mealInfo.calories));
        }
      }

      days.push({ 
        date: new Date(planRequest.startDate).toISOString(),
        meals 
      });
    }

    return { days };
  }

  // Helper: Get default strategy without AI
  async getDefaultStrategy(healthProfile, preferences) {
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
  // Helper: Get default meal
  getDefaultMeal(mealType, targetCalories) {
    // Check if getDetailedMealTemplates exists and use it
    if (this.getDetailedMealTemplates) {
      const templates = this.getDetailedMealTemplates();
      const mealTemplates = templates[mealType] || templates.lunch;
      const template = mealTemplates[0]; // Use first template as default
      
      return {
        type: mealType,
        name: template.name,
        nutrition: {
          calories: template.calories || targetCalories || 400,
          protein: template.protein || Math.round(targetCalories * 0.25 / 4),
          carbs: template.carbs || Math.round(targetCalories * 0.45 / 4),
          fat: template.fat || Math.round(targetCalories * 0.30 / 9),
          fiber: 5,
          sodium: 300,
          sugar: 10
        },
        prepTime: template.prepTime || 20,
        customRecipe: {
          name: template.name,
          ingredients: template.ingredients,
          instructions: template.instructions,
          cookingTime: template.prepTime || 20
        },
        servings: 1,
        alternatives: [],
        isCustom: false
      };
    }
    
    // Fallback to basic template if method doesn't exist
    return {
      type: mealType,
      name: `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} Meal`,
      nutrition: {
        calories: targetCalories || 400,
        protein: Math.round(targetCalories * 0.25 / 4),
        carbs: Math.round(targetCalories * 0.45 / 4),
        fat: Math.round(targetCalories * 0.30 / 9),
        fiber: 5,
        sodium: 300,
        sugar: 10
      },
      customRecipe: {
        name: `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} Meal`,
        ingredients: [
          { name: 'Main protein', quantity: 150, unit: 'g' },
          { name: 'Vegetables', quantity: 200, unit: 'g' },
          { name: 'Whole grain', quantity: 100, unit: 'g' }
        ],
        instructions: [
          'Prepare all ingredients',
          'Cook protein source',
          'Prepare vegetables',
          'Cook grains if needed',
          'Combine and season to taste'
        ],
        cookingTime: 25
      },
      alternatives: [],
      isCustom: false,
      servings: 1
    };
  }

  // Generate basic meals without AI - WITH INGREDIENTS - FIXED
  generateBasicMeals(structure, preferences, planRequest) {
    const numDays = planRequest?.duration === 'weekly' ? 7 : 1;
    const days = [];

    // Fix: Ensure we have a valid start date
    let startDate;
    if (planRequest?.startDate instanceof Date && !isNaN(planRequest.startDate.getTime())) {
      startDate = new Date(planRequest.startDate.getTime());
    } else if (typeof planRequest?.startDate === 'string') {
      startDate = new Date(planRequest.startDate);
      if (isNaN(startDate.getTime())) {
        startDate = new Date();
      }
    } else {
      startDate = new Date();
    }

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
          calories: 450, protein: 28, carbs: 45, fat: 15,
          ingredients: [
            { name: 'Turkey Breast', quantity: 100, unit: 'g' },
            { name: 'Whole Wheat Bread', quantity: 2, unit: 'slice' },
            { name: 'Lettuce', quantity: 20, unit: 'g' },
            { name: 'Tomato', quantity: 50, unit: 'g' },
            { name: 'Mustard', quantity: 1, unit: 'tbsp' }
          ]
        },
        { 
          name: 'Quinoa Buddha Bowl', 
          calories: 480, protein: 18, carbs: 65, fat: 16,
          ingredients: [
            { name: 'Quinoa', quantity: 80, unit: 'g' },
            { name: 'Mixed Vegetables', quantity: 150, unit: 'g' },
            { name: 'Chickpeas', quantity: 100, unit: 'g' },
            { name: 'Tahini Dressing', quantity: 2, unit: 'tbsp' }
          ]
        }
      ],
      dinner: [
        { 
          name: 'Grilled Salmon with Vegetables', 
          calories: 550, protein: 40, carbs: 35, fat: 25,
          ingredients: [
            { name: 'Salmon Fillet', quantity: 180, unit: 'g' },
            { name: 'Broccoli', quantity: 150, unit: 'g' },
            { name: 'Sweet Potato', quantity: 150, unit: 'g' },
            { name: 'Olive Oil', quantity: 1, unit: 'tbsp' }
          ]
        },
        { 
          name: 'Chicken Stir-Fry', 
          calories: 520, protein: 38, carbs: 50, fat: 18,
          ingredients: [
            { name: 'Chicken Breast', quantity: 150, unit: 'g' },
            { name: 'Mixed Stir-Fry Vegetables', quantity: 200, unit: 'g' },
            { name: 'Rice', quantity: 100, unit: 'g' },
            { name: 'Soy Sauce', quantity: 2, unit: 'tbsp' },
            { name: 'Sesame Oil', quantity: 1, unit: 'tsp' }
          ]
        },
        { 
          name: 'Vegetarian Pasta', 
          calories: 500, protein: 18, carbs: 70, fat: 15,
          ingredients: [
            { name: 'Whole Wheat Pasta', quantity: 100, unit: 'g' },
            { name: 'Marinara Sauce', quantity: 150, unit: 'ml' },
            { name: 'Mixed Vegetables', quantity: 150, unit: 'g' },
            { name: 'Parmesan Cheese', quantity: 20, unit: 'g' }
          ]
        }
      ],
      snack: [
        { 
          name: 'Apple with Almond Butter', 
          calories: 200, protein: 5, carbs: 25, fat: 10,
          ingredients: [
            { name: 'Apple', quantity: 1, unit: 'unit' },
            { name: 'Almond Butter', quantity: 1, unit: 'tbsp' }
          ]
        },
        { 
          name: 'Greek Yogurt', 
          calories: 150, protein: 12, carbs: 18, fat: 3,
          ingredients: [
            { name: 'Greek Yogurt', quantity: 150, unit: 'g' }
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

    // Generate meals for each day
    for (let day = 0; day < numDays; day++) {
      const meals = [];
      
      // Default meal structure if not provided
      const mealStructure = structure?.mealStructure || {
        breakfast: {},
        lunch: {},
        dinner: {}
      };
      
      Object.keys(mealStructure).forEach(mealType => {
        const templateType = mealType.includes('snack') ? 'snack' : mealType;
        const templates = mealTemplates[templateType] || mealTemplates.lunch;
        const template = templates[day % templates.length];
        
        meals.push({
          type: mealType.includes('snack') ? 'snack' : mealType,
          name: template.name,
          nutrition: {
            calories: template.calories,
            protein: template.protein,
            carbs: template.carbs,
            fat: template.fat,
            fiber: 5,
            sodium: 300,
            sugar: 10
          },
          cookingTime: 20,
          customRecipe: {
            name: template.name,
            ingredients: template.ingredients,
            instructions: ['Prepare ingredients', 'Cook as directed', 'Serve and enjoy'],
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

      // Create a valid date for this day
      const currentDate = new Date(startDate.getTime());
      currentDate.setDate(currentDate.getDate() + day);
      
      // Only add day if date is valid
      if (!isNaN(currentDate.getTime())) {
        days.push({
          date: currentDate.toISOString(),
          meals: meals
        });
      }
    }

    // Ensure we have at least one day
    if (days.length === 0) {
      days.push({
        date: new Date().toISOString(),
        meals: [{
          type: 'lunch',
          name: 'Default Meal',
          nutrition: {
            calories: 400,
            protein: 20,
            carbs: 50,
            fat: 15,
            fiber: 5,
            sodium: 300,
            sugar: 10
          },
          cookingTime: 20,
          customRecipe: {
            name: 'Default Meal',
            ingredients: [{ name: 'Mixed ingredients', quantity: 200, unit: 'g' }],
            instructions: ['Prepare and cook'],
            cookingTime: 20
          },
          alternatives: []
        }]
      });
    }

    return { days };
  }

  // Helper: Format final meal plan - FIXED
  async formatMealPlan(detailedMeals, planRequest, metadata) {
    // Fix: Ensure valid dates with proper fallback
    let startDate;
    
    // Handle various input formats for startDate
    if (planRequest.startDate instanceof Date && !isNaN(planRequest.startDate.getTime())) {
      startDate = planRequest.startDate;
    } else if (typeof planRequest.startDate === 'string') {
      startDate = new Date(planRequest.startDate);
      if (isNaN(startDate.getTime())) {
        console.log('Invalid string date, using current date');
        startDate = new Date();
      }
    } else {
      console.log('No valid start date provided, using current date');
      startDate = new Date();
    }
    
    // Create endDate based on valid startDate
    const endDate = new Date(startDate.getTime()); // Clone the date
    
    // Set duration - handle both 'weekly' and 'daily' types
    const duration = planRequest.duration || planRequest.type || 'daily';
    if (duration === 'weekly') {
      endDate.setDate(endDate.getDate() + 6);
    }

    // Create daily plans with valid dates
    const dailyPlans = [];
    
    if (detailedMeals && detailedMeals.days) {
      detailedMeals.days.forEach((day, index) => {
        const currentDate = new Date(startDate.getTime());
        currentDate.setDate(currentDate.getDate() + index);
        
        // Ensure date is valid
        if (isNaN(currentDate.getTime())) {
          console.error('Invalid date for day', index);
          currentDate = new Date();
          currentDate.setDate(currentDate.getDate() + index);
        }

        dailyPlans.push({
          date: currentDate,
          meals: (day.meals || []).map((meal, mealIndex) => ({
            type: meal.type || 'lunch',
            name: meal.name || 'Unnamed Meal',
            nutrition: meal.nutrition || {
              calories: 400,
              protein: 20,
              carbs: 50,
              fat: 15,
              fiber: 5,
              sodium: 300,
              sugar: 10
            },
            servings: meal.servings || 1,
            alternatives: meal.alternatives || [],
            order: mealIndex,
            isLocked: false,
            isCustom: meal.isCustom || false,
            customRecipe: meal.customRecipe || null
          })),
          notes: day.notes || '',
          totals: day.totals || {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            fiber: 0,
            sodium: 0,
            sugar: 0
          }
        });
      });
    }

    // Ensure we have at least one daily plan
    if (dailyPlans.length === 0) {
      const defaultDate = new Date();
      dailyPlans.push({
        date: defaultDate,
        meals: [],
        notes: 'No meals generated',
        totals: {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          fiber: 0,
          sodium: 0,
          sugar: 0
        }
      });
    }

    return {
      userId: planRequest.userId,
      type: duration,
      name: `Meal Plan - ${startDate.toISOString().split('T')[0]}`,
      startDate: startDate,
      endDate: endDate,
      dailyPlans: dailyPlans,
      generationMetadata: metadata || {
        method: 'fallback',
        generatedAt: new Date()
      },
      status: 'active'
    };
  }

  // Fallback plan generation - COMPLETELY FIXED
   async generateFallbackPlan(userId, planRequest) {
    try {
      const preferences = await UserPreferences.findOne({ userId });
      const templates = this.getDetailedMealTemplates();
      const duration = planRequest.duration || 'daily';
      const numDays = duration === 'weekly' ? 7 : 1;
      
      const startDate = planRequest.startDate || new Date();
      const endDate = new Date(startDate);
      if (duration === 'weekly') {
        endDate.setDate(endDate.getDate() + 6);
      }
      
      const dailyPlans = [];
      
      for (let day = 0; day < numDays; day++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() + day);
        
        const meals = [];
        const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
        
        for (const mealType of mealTypes) {
          const mealTemplateArray = templates[mealType];
          const template = mealTemplateArray[day % mealTemplateArray.length];
          
          meals.push({
            type: mealType,
            name: template.name,
            nutrition: {
              calories: template.calories,
              protein: template.protein,
              carbs: template.carbs,
              fat: template.fat,
              fiber: 5,
              sodium: 300,
              sugar: 10
            },
            prepTime: template.prepTime,
            servings: 1,
            customRecipe: {
              name: template.name,
              ingredients: template.ingredients,
              instructions: template.instructions,
              cookingTime: template.prepTime
            },
            alternatives: [],
            order: mealTypes.indexOf(mealType),
            isLocked: false,
            isCustom: false
          });
        }
        
        const totals = meals.reduce((acc, meal) => ({
          calories: acc.calories + meal.nutrition.calories,
          protein: acc.protein + meal.nutrition.protein,
          carbs: acc.carbs + meal.nutrition.carbs,
          fat: acc.fat + meal.nutrition.fat,
          fiber: acc.fiber + (meal.nutrition.fiber || 0),
          sodium: acc.sodium + (meal.nutrition.sodium || 0),
          sugar: acc.sugar + (meal.nutrition.sugar || 0)
        }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0, sugar: 0 });
        
        dailyPlans.push({
          date: currentDate,
          meals: meals,
          totals: totals,
          notes: `Day ${day + 1} meal plan`
        });
      }
      
      
      return {
        userId: userId,
        type: duration,
        name: `Meal Plan - ${startDate.toISOString().split('T')[0]}`,
        startDate: startDate,
        endDate: endDate,
        dailyPlans: dailyPlans,
        generationMetadata: {
          method: 'enhanced-fallback',
          generatedAt: new Date()
        },
        status: 'active'
      };
    } catch (error) {
      console.error('Enhanced fallback generation error:', error);
      // Return basic structure if all else fails
      return this.getBasicFallbackPlan(userId, planRequest);
    }
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

  // Helper: Get default meal
  getDefaultMeal(mealType, targetCalories) {
  const templates = this.getDetailedMealTemplates();
  const mealTemplates = templates[mealType] || templates.lunch;
  const template = mealTemplates[0]; // Use first template as default
  
  return {
    type: mealType,
    name: template.name,
    nutrition: {
      calories: template.calories || targetCalories || 400,
      protein: template.protein || Math.round(targetCalories * 0.25 / 4),
      carbs: template.carbs || Math.round(targetCalories * 0.45 / 4),
      fat: template.fat || Math.round(targetCalories * 0.30 / 9),
      fiber: 5,
      sodium: 300,
      sugar: 10
    },
    prepTime: template.prepTime || 20,
    customRecipe: {
      name: template.name,
      ingredients: template.ingredients,
      instructions: template.instructions,
      cookingTime: template.prepTime || 20
    },
    servings: 1,
    alternatives: [],
    isCustom: false
  };
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

  // Generate single meal (for regeneration)
  async generateSingleMeal(preferences, mealType, requirements = {}) {
    const mealTemplates = {
      breakfast: [
        { 
          name: 'Power Breakfast Bowl', 
          calories: 400, protein: 18, carbs: 50, fat: 12,
          ingredients: [
            { name: 'Eggs', quantity: 2, unit: 'unit' },
            { name: 'Avocado', quantity: 50, unit: 'g' },
            { name: 'Whole grain toast', quantity: 2, unit: 'slice' },
            { name: 'Spinach', quantity: 50, unit: 'g' }
          ]
        }
      ],
      lunch: [
        { 
          name: 'Protein Power Lunch', 
          calories: 500, protein: 35, carbs: 45, fat: 18,
          ingredients: [
            { name: 'Grilled chicken', quantity: 150, unit: 'g' },
            { name: 'Brown rice', quantity: 100, unit: 'g' },
            { name: 'Mixed vegetables', quantity: 150, unit: 'g' }
          ]
        }
      ],
      dinner: [
        { 
          name: 'Balanced Dinner', 
          calories: 550, protein: 32, carbs: 55, fat: 20,
          ingredients: [
            { name: 'Lean beef', quantity: 150, unit: 'g' },
            { name: 'Sweet potato', quantity: 200, unit: 'g' },
            { name: 'Green beans', quantity: 150, unit: 'g' }
          ]
        }
      ],
      snack: [
        { 
          name: 'Protein Snack', 
          calories: 180, protein: 10, carbs: 15, fat: 8,
          ingredients: [
            { name: 'Protein bar', quantity: 1, unit: 'unit' }
          ]
        }
      ]
    };

    const templates = mealTemplates[mealType] || mealTemplates.lunch;
    const template = templates[Math.floor(Math.random() * templates.length)];

    return {
      type: mealType,
      name: template.name,
      nutrition: {
        calories: template.calories,
        protein: template.protein,
        carbs: template.carbs,
        fat: template.fat,
        fiber: 5,
        sodium: 300,
        sugar: 10
      },
      customRecipe: {
        name: template.name,
        ingredients: template.ingredients,
        instructions: ['Prepare and cook as directed'],
        cookingTime: 20
      },
      alternatives: [],
      isCustom: false,
      servings: 1
    };
  }
}

module.exports = new MealPlanningService();