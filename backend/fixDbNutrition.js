// Quick script to fix database recipes - save as fixDbNutrition.js in backend/
const mongoose = require('mongoose');
const Recipe = require('./models/Recipe');
require('dotenv').config();

async function fixDatabaseNutrition() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/wellness-platform');
  
  const recipes = await Recipe.find({});
  console.log(`Found ${recipes.length} recipes to fix`);
  
  for (const recipe of recipes) {
    // Check if nutrition exists and has values
    if (!recipe.nutrition || !recipe.nutrition.calories) {
      recipe.nutrition = {
        calories: 400,
        protein: 20,
        carbs: 45,
        fat: 15,
        fiber: 6,
        sugar: 8,
        sodium: 400
      };
      
      await recipe.save();
      console.log(`Fixed nutrition for: ${recipe.title}`);
    }
  }
  
  console.log('Done!');
  process.exit(0);
}

fixDatabaseNutrition();
