// fix-recipe-ingredients.js
// Place this file in your backend folder and run it to fix ingredient names

const mongoose = require('mongoose');
const Recipe = require('./models/Recipe');
require('dotenv').config();

// Common ingredient names to replace placeholders
const REAL_INGREDIENT_NAMES = {
  proteins: [
    'Chicken Breast', 'Salmon Fillet', 'Ground Beef', 'Turkey Breast', 
    'Eggs', 'Tofu', 'Greek Yogurt', 'Cottage Cheese', 'Tuna', 
    'Shrimp', 'Pork Chops', 'Black Beans', 'Chickpeas', 'Lentils'
  ],
  vegetables: [
    'Spinach', 'Broccoli', 'Bell Peppers', 'Carrots', 'Tomatoes',
    'Onions', 'Garlic', 'Mushrooms', 'Zucchini', 'Cauliflower',
    'Sweet Potatoes', 'Green Beans', 'Asparagus', 'Kale', 'Cucumber'
  ],
  grains: [
    'Brown Rice', 'Quinoa', 'Oats', 'Whole Wheat Pasta', 'Barley',
    'Bulgur', 'Farro', 'Wild Rice', 'Couscous', 'Buckwheat'
  ],
  dairy: [
    'Milk', 'Cheddar Cheese', 'Mozzarella', 'Butter', 'Heavy Cream',
    'Parmesan Cheese', 'Feta Cheese', 'Sour Cream', 'Cream Cheese'
  ],
  fruits: [
    'Apples', 'Bananas', 'Berries', 'Oranges', 'Grapes',
    'Strawberries', 'Blueberries', 'Avocado', 'Mango', 'Pineapple'
  ],
  pantry: [
    'Olive Oil', 'Salt', 'Black Pepper', 'Soy Sauce', 'Honey',
    'Maple Syrup', 'Balsamic Vinegar', 'Coconut Oil', 'Almond Butter',
    'Peanut Butter', 'Tahini', 'Sesame Oil', 'Rice Vinegar'
  ],
  herbs_spices: [
    'Basil', 'Oregano', 'Thyme', 'Rosemary', 'Cilantro',
    'Parsley', 'Cumin', 'Paprika', 'Cinnamon', 'Turmeric',
    'Ginger', 'Chili Powder', 'Garlic Powder', 'Onion Powder'
  ]
};

// Function to get a realistic ingredient name based on category
function getRealIngredientName(currentName, category) {
  // If the name already looks real (doesn't contain 'ingredient_' or similar patterns)
  if (!currentName.match(/ingredient[_\s]?\d+/i) && 
      !currentName.match(/^item[_\s]?\d+/i) &&
      !currentName.match(/^food[_\s]?\d+/i)) {
    return currentName; // Keep the existing name if it's already real
  }

  // Map categories to ingredient lists
  const categoryMap = {
    'protein': REAL_INGREDIENT_NAMES.proteins,
    'vegetable': REAL_INGREDIENT_NAMES.vegetables,
    'grain': REAL_INGREDIENT_NAMES.grains,
    'dairy': REAL_INGREDIENT_NAMES.dairy,
    'fruit': REAL_INGREDIENT_NAMES.fruits,
    'fat': REAL_INGREDIENT_NAMES.pantry,
    'spice': REAL_INGREDIENT_NAMES.herbs_spices,
    'herb': REAL_INGREDIENT_NAMES.herbs_spices,
    'other': REAL_INGREDIENT_NAMES.pantry
  };

  // Get appropriate list based on category
  let ingredientList = categoryMap[category] || REAL_INGREDIENT_NAMES.pantry;
  
  // If no category match, pick from all ingredients
  if (!category) {
    const allIngredients = Object.values(REAL_INGREDIENT_NAMES).flat();
    ingredientList = allIngredients;
  }

  // Generate a consistent but varied index based on the current name
  const hash = currentName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const index = hash % ingredientList.length;
  
  return ingredientList[index];
}

// Function to fix a single recipe's ingredients
function fixRecipeIngredients(recipe) {
  let updated = false;
  
  if (!recipe.ingredients || recipe.ingredients.length === 0) {
    return { recipe, updated };
  }

  recipe.ingredients = recipe.ingredients.map((ingredient, index) => {
    // Check if ingredient name needs fixing
    if (ingredient.name && 
        (ingredient.name.match(/ingredient[_\s]?\d+/i) || 
         ingredient.name.match(/^item[_\s]?\d+/i) ||
         ingredient.name.match(/^food[_\s]?\d+/i))) {
      
      const newName = getRealIngredientName(ingredient.name, ingredient.category);
      console.log(`  Fixing: "${ingredient.name}" -> "${newName}"`);
      updated = true;
      
      return {
        ...ingredient,
        name: newName
      };
    }
    
    return ingredient;
  });

  return { recipe, updated };
}

// Main function to fix all recipes
async function fixAllRecipes() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/wellness-platform', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to MongoDB');
    
    // Fetch all recipes
    const recipes = await Recipe.find({});
    console.log(`Found ${recipes.length} recipes to check`);
    
    let fixedCount = 0;
    
    for (const recipe of recipes) {
      console.log(`\nChecking recipe: ${recipe.title}`);
      
      const { recipe: fixedRecipe, updated } = fixRecipeIngredients(recipe);
      
      if (updated) {
        await Recipe.findByIdAndUpdate(recipe._id, {
          ingredients: fixedRecipe.ingredients
        });
        fixedCount++;
        console.log(`  ✅ Fixed and saved`);
      } else {
        console.log(`  ✓ No fixes needed`);
      }
    }
    
    console.log(`\n========================================`);
    console.log(`Fixed ${fixedCount} out of ${recipes.length} recipes`);
    console.log(`========================================\n`);
    
  } catch (error) {
    console.error('Error fixing recipes:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Function to generate sample ingredients for database
async function generateSampleIngredients() {
  const Ingredient = require('./models/Ingredient');
  
  const sampleIngredients = [
    // Proteins
    { label: 'Chicken Breast', category: 'proteins', unit: { standard: 'g' }, 
      nutrition: { per100: { calories: 165, macros: { protein: 31, carbs: 0, fat: 3.6 }}}},
    { label: 'Salmon', category: 'proteins', unit: { standard: 'g' },
      nutrition: { per100: { calories: 208, macros: { protein: 20, carbs: 0, fat: 13 }}}},
    { label: 'Eggs', category: 'proteins', unit: { standard: 'piece' },
      nutrition: { per100: { calories: 155, macros: { protein: 13, carbs: 1.1, fat: 11 }}}},
    { label: 'Tofu', category: 'proteins', unit: { standard: 'g' },
      nutrition: { per100: { calories: 76, macros: { protein: 8, carbs: 1.9, fat: 4.8 }}}},
    
    // Vegetables
    { label: 'Broccoli', category: 'vegetables', unit: { standard: 'g' },
      nutrition: { per100: { calories: 34, macros: { protein: 2.8, carbs: 7, fat: 0.4 }}}},
    { label: 'Spinach', category: 'vegetables', unit: { standard: 'g' },
      nutrition: { per100: { calories: 23, macros: { protein: 2.9, carbs: 3.6, fat: 0.4 }}}},
    { label: 'Bell Peppers', category: 'vegetables', unit: { standard: 'g' },
      nutrition: { per100: { calories: 31, macros: { protein: 1, carbs: 6, fat: 0.3 }}}},
    
    // Grains
    { label: 'Brown Rice', category: 'grains', unit: { standard: 'g' },
      nutrition: { per100: { calories: 111, macros: { protein: 2.6, carbs: 23, fat: 0.9 }}}},
    { label: 'Quinoa', category: 'grains', unit: { standard: 'g' },
      nutrition: { per100: { calories: 120, macros: { protein: 4.4, carbs: 21.3, fat: 1.9 }}}},
    { label: 'Oats', category: 'grains', unit: { standard: 'g' },
      nutrition: { per100: { calories: 389, macros: { protein: 16.9, carbs: 66.3, fat: 6.9 }}}},
    
    // Add more as needed...
  ];

  let addedCount = 0;
  for (const ingredient of sampleIngredients) {
    try {
      const exists = await Ingredient.findOne({ label: ingredient.label });
      if (!exists) {
        await new Ingredient(ingredient).save();
        addedCount++;
        console.log(`Added ingredient: ${ingredient.label}`);
      }
    } catch (error) {
      console.error(`Error adding ${ingredient.label}:`, error.message);
    }
  }
  
  console.log(`Added ${addedCount} new ingredients`);
}

// Run the script
if (require.main === module) {
  console.log('Starting recipe ingredient fix...\n');
  
  // You can also run this to add sample ingredients
  // generateSampleIngredients().then(() => {
  //   fixAllRecipes();
  // });
  
  fixAllRecipes();
}