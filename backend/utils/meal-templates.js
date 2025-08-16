// meal-templates.js
// Add this file to backend/utils/ or update your existing mealPlanningService.js

const MEAL_TEMPLATES = {
  breakfast: [
    {
      name: 'Protein Scramble',
      calories: 350,
      protein: 25,
      carbs: 20,
      fat: 18,
      ingredients: [
        { name: 'Eggs', quantity: 3, unit: 'unit', category: 'protein' },
        { name: 'Spinach', quantity: 50, unit: 'g', category: 'vegetable' },
        { name: 'Mushrooms', quantity: 50, unit: 'g', category: 'vegetable' },
        { name: 'Cheddar Cheese', quantity: 30, unit: 'g', category: 'dairy' },
        { name: 'Olive Oil', quantity: 1, unit: 'tsp', category: 'fat' }
      ]
    },
    {
      name: 'Overnight Oats',
      calories: 380,
      protein: 15,
      carbs: 55,
      fat: 12,
      ingredients: [
        { name: 'Rolled Oats', quantity: 60, unit: 'g', category: 'grain' },
        { name: 'Greek Yogurt', quantity: 100, unit: 'g', category: 'dairy' },
        { name: 'Blueberries', quantity: 50, unit: 'g', category: 'fruit' },
        { name: 'Almond Butter', quantity: 1, unit: 'tbsp', category: 'fat' },
        { name: 'Honey', quantity: 1, unit: 'tsp', category: 'other' }
      ]
    },
    {
      name: 'Avocado Toast with Egg',
      calories: 420,
      protein: 18,
      carbs: 35,
      fat: 24,
      ingredients: [
        { name: 'Whole Wheat Bread', quantity: 2, unit: 'slice', category: 'grain' },
        { name: 'Avocado', quantity: 100, unit: 'g', category: 'vegetable' },
        { name: 'Eggs', quantity: 2, unit: 'unit', category: 'protein' },
        { name: 'Cherry Tomatoes', quantity: 50, unit: 'g', category: 'vegetable' },
        { name: 'Everything Bagel Seasoning', quantity: 1, unit: 'tsp', category: 'spice' }
      ]
    },
    {
      name: 'Protein Smoothie Bowl',
      calories: 400,
      protein: 22,
      carbs: 48,
      fat: 14,
      ingredients: [
        { name: 'Banana', quantity: 1, unit: 'unit', category: 'fruit' },
        { name: 'Protein Powder', quantity: 30, unit: 'g', category: 'protein' },
        { name: 'Spinach', quantity: 30, unit: 'g', category: 'vegetable' },
        { name: 'Almond Milk', quantity: 200, unit: 'ml', category: 'dairy' },
        { name: 'Granola', quantity: 30, unit: 'g', category: 'grain' },
        { name: 'Mixed Berries', quantity: 50, unit: 'g', category: 'fruit' }
      ]
    }
  ],
  
  lunch: [
    {
      name: 'Grilled Chicken Bowl',
      calories: 480,
      protein: 35,
      carbs: 45,
      fat: 16,
      ingredients: [
        { name: 'Chicken Breast', quantity: 150, unit: 'g', category: 'protein' },
        { name: 'Brown Rice', quantity: 80, unit: 'g', category: 'grain' },
        { name: 'Broccoli', quantity: 100, unit: 'g', category: 'vegetable' },
        { name: 'Bell Peppers', quantity: 80, unit: 'g', category: 'vegetable' },
        { name: 'Teriyaki Sauce', quantity: 2, unit: 'tbsp', category: 'other' },
        { name: 'Sesame Seeds', quantity: 1, unit: 'tsp', category: 'other' }
      ]
    },
    {
      name: 'Mediterranean Quinoa Salad',
      calories: 420,
      protein: 18,
      carbs: 52,
      fat: 18,
      ingredients: [
        { name: 'Quinoa', quantity: 80, unit: 'g', category: 'grain' },
        { name: 'Chickpeas', quantity: 100, unit: 'g', category: 'protein' },
        { name: 'Cucumber', quantity: 100, unit: 'g', category: 'vegetable' },
        { name: 'Cherry Tomatoes', quantity: 100, unit: 'g', category: 'vegetable' },
        { name: 'Feta Cheese', quantity: 40, unit: 'g', category: 'dairy' },
        { name: 'Olive Oil', quantity: 1, unit: 'tbsp', category: 'fat' },
        { name: 'Lemon Juice', quantity: 1, unit: 'tbsp', category: 'other' }
      ]
    },
    {
      name: 'Turkey Wrap',
      calories: 450,
      protein: 30,
      carbs: 42,
      fat: 18,
      ingredients: [
        { name: 'Whole Wheat Tortilla', quantity: 1, unit: 'unit', category: 'grain' },
        { name: 'Turkey Breast', quantity: 120, unit: 'g', category: 'protein' },
        { name: 'Lettuce', quantity: 50, unit: 'g', category: 'vegetable' },
        { name: 'Tomatoes', quantity: 80, unit: 'g', category: 'vegetable' },
        { name: 'Swiss Cheese', quantity: 30, unit: 'g', category: 'dairy' },
        { name: 'Hummus', quantity: 2, unit: 'tbsp', category: 'other' },
        { name: 'Avocado', quantity: 50, unit: 'g', category: 'vegetable' }
      ]
    },
    {
      name: 'Salmon Poke Bowl',
      calories: 520,
      protein: 32,
      carbs: 48,
      fat: 22,
      ingredients: [
        { name: 'Salmon', quantity: 120, unit: 'g', category: 'protein' },
        { name: 'Sushi Rice', quantity: 100, unit: 'g', category: 'grain' },
        { name: 'Edamame', quantity: 50, unit: 'g', category: 'protein' },
        { name: 'Cucumber', quantity: 80, unit: 'g', category: 'vegetable' },
        { name: 'Avocado', quantity: 60, unit: 'g', category: 'vegetable' },
        { name: 'Seaweed Salad', quantity: 30, unit: 'g', category: 'vegetable' },
        { name: 'Soy Sauce', quantity: 1, unit: 'tbsp', category: 'other' }
      ]
    }
  ],
  
  dinner: [
    {
      name: 'Baked Cod with Vegetables',
      calories: 380,
      protein: 35,
      carbs: 32,
      fat: 12,
      ingredients: [
        { name: 'Cod Fillet', quantity: 180, unit: 'g', category: 'protein' },
        { name: 'Sweet Potatoes', quantity: 150, unit: 'g', category: 'vegetable' },
        { name: 'Green Beans', quantity: 100, unit: 'g', category: 'vegetable' },
        { name: 'Olive Oil', quantity: 1, unit: 'tbsp', category: 'fat' },
        { name: 'Lemon', quantity: 0.5, unit: 'unit', category: 'fruit' },
        { name: 'Garlic', quantity: 2, unit: 'unit', category: 'vegetable' }
      ]
    },
    {
      name: 'Beef Stir-Fry',
      calories: 480,
      protein: 32,
      carbs: 45,
      fat: 18,
      ingredients: [
        { name: 'Lean Beef', quantity: 150, unit: 'g', category: 'protein' },
        { name: 'Brown Rice', quantity: 80, unit: 'g', category: 'grain' },
        { name: 'Mixed Stir-Fry Vegetables', quantity: 200, unit: 'g', category: 'vegetable' },
        { name: 'Soy Sauce', quantity: 2, unit: 'tbsp', category: 'other' },
        { name: 'Ginger', quantity: 1, unit: 'tbsp', category: 'spice' },
        { name: 'Sesame Oil', quantity: 1, unit: 'tsp', category: 'fat' }
      ]
    },
    {
      name: 'Chicken Fajitas',
      calories: 450,
      protein: 38,
      carbs: 42,
      fat: 14,
      ingredients: [
        { name: 'Chicken Breast', quantity: 150, unit: 'g', category: 'protein' },
        { name: 'Whole Wheat Tortillas', quantity: 2, unit: 'unit', category: 'grain' },
        { name: 'Bell Peppers', quantity: 150, unit: 'g', category: 'vegetable' },
        { name: 'Onions', quantity: 80, unit: 'g', category: 'vegetable' },
        { name: 'Salsa', quantity: 3, unit: 'tbsp', category: 'other' },
        { name: 'Greek Yogurt', quantity: 2, unit: 'tbsp', category: 'dairy' },
        { name: 'Lime', quantity: 0.5, unit: 'unit', category: 'fruit' }
      ]
    },
    {
      name: 'Vegetarian Pasta Primavera',
      calories: 420,
      protein: 18,
      carbs: 58,
      fat: 14,
      ingredients: [
        { name: 'Whole Wheat Pasta', quantity: 100, unit: 'g', category: 'grain' },
        { name: 'Zucchini', quantity: 100, unit: 'g', category: 'vegetable' },
        { name: 'Cherry Tomatoes', quantity: 100, unit: 'g', category: 'vegetable' },
        { name: 'Mushrooms', quantity: 80, unit: 'g', category: 'vegetable' },
        { name: 'Parmesan Cheese', quantity: 30, unit: 'g', category: 'dairy' },
        { name: 'Olive Oil', quantity: 1, unit: 'tbsp', category: 'fat' },
        { name: 'Basil', quantity: 10, unit: 'g', category: 'herb' }
      ]
    }
  ],
  
  snack: [
    {
      name: 'Greek Yogurt with Berries',
      calories: 150,
      protein: 12,
      carbs: 18,
      fat: 3,
      ingredients: [
        { name: 'Greek Yogurt', quantity: 150, unit: 'g', category: 'dairy' },
        { name: 'Mixed Berries', quantity: 50, unit: 'g', category: 'fruit' },
        { name: 'Honey', quantity: 1, unit: 'tsp', category: 'other' }
      ]
    },
    {
      name: 'Apple with Almond Butter',
      calories: 200,
      protein: 5,
      carbs: 25,
      fat: 10,
      ingredients: [
        { name: 'Apple', quantity: 1, unit: 'unit', category: 'fruit' },
        { name: 'Almond Butter', quantity: 1, unit: 'tbsp', category: 'fat' }
      ]
    },
    {
      name: 'Protein Shake',
      calories: 180,
      protein: 25,
      carbs: 12,
      fat: 3,
      ingredients: [
        { name: 'Protein Powder', quantity: 30, unit: 'g', category: 'protein' },
        { name: 'Almond Milk', quantity: 250, unit: 'ml', category: 'dairy' },
        { name: 'Banana', quantity: 0.5, unit: 'unit', category: 'fruit' }
      ]
    },
    {
      name: 'Hummus with Vegetables',
      calories: 160,
      protein: 6,
      carbs: 20,
      fat: 8,
      ingredients: [
        { name: 'Hummus', quantity: 60, unit: 'g', category: 'other' },
        { name: 'Carrots', quantity: 80, unit: 'g', category: 'vegetable' },
        { name: 'Cucumber', quantity: 80, unit: 'g', category: 'vegetable' },
        { name: 'Bell Peppers', quantity: 50, unit: 'g', category: 'vegetable' }
      ]
    },
    {
      name: 'Trail Mix',
      calories: 180,
      protein: 6,
      carbs: 16,
      fat: 12,
      ingredients: [
        { name: 'Mixed Nuts', quantity: 20, unit: 'g', category: 'fat' },
        { name: 'Dried Cranberries', quantity: 15, unit: 'g', category: 'fruit' },
        { name: 'Dark Chocolate Chips', quantity: 10, unit: 'g', category: 'other' }
      ]
    }
  ]
};

// Export for use in your mealPlanningService.js
module.exports = MEAL_TEMPLATES;

// Function to get a random meal from a category
function getRandomMeal(mealType, dayIndex = 0) {
  const meals = MEAL_TEMPLATES[mealType] || MEAL_TEMPLATES.lunch;
  // Use dayIndex to vary meals across days
  const index = dayIndex % meals.length;
  return { ...meals[index] }; // Return a copy
}

// Function to ensure all ingredients have real names
function validateIngredients(ingredients) {
  return ingredients.map(ing => {
    // Check if the ingredient name looks like a placeholder
    if (ing.name && ing.name.match(/ingredient[_\s]?\d+/i)) {
      // Replace with a real name based on category
      const categoryDefaults = {
        protein: 'Chicken Breast',
        vegetable: 'Mixed Vegetables',
        grain: 'Brown Rice',
        dairy: 'Greek Yogurt',
        fruit: 'Apple',
        fat: 'Olive Oil',
        other: 'Seasoning Mix'
      };
      
      return {
        ...ing,
        name: categoryDefaults[ing.category] || 'Mixed Ingredients'
      };
    }
    return ing;
  });
}

// Export helper functions
module.exports.getRandomMeal = getRandomMeal;
module.exports.validateIngredients = validateIngredients;