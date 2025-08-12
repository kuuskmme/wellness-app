
const OpenAI = require('openai');
const Recipe = require('../models/Recipe');
const Ingredient = require('../models/Ingredient');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-fallback'
});

class RAGService {
  constructor() {
    this.embeddingModel = 'text-embedding-ada-002';
    this.generationModel = process.env.AI_MODEL || 'gpt-3.5-turbo';
  }

  // Generate embedding for text
  async generateEmbedding(text) {
    try {
      const response = await openai.embeddings.create({
        model: this.embeddingModel,
        input: text,
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error('Embedding generation error:', error);
      // Return a random vector as fallback for testing without API key
      return Array(1536).fill(0).map(() => Math.random());
    }
  }

  // Calculate cosine similarity between two vectors
  cosineSimilarity(vec1, vec2) {
    const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
    const magnitude1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
    const magnitude2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitude1 * magnitude2);
  }

  // Search recipes using vector similarity
  async searchRecipes(query, filters = {}) {
    try {
      // Generate embedding for the search query
      const queryEmbedding = await this.generateEmbedding(query);

      // Build MongoDB filter
      const mongoFilter = {};
      
      if (filters.dietary && filters.dietary.length > 0) {
        filters.dietary.forEach(diet => {
          if (diet === 'vegetarian') mongoFilter['dietaryInfo.isVegetarian'] = true;
          if (diet === 'vegan') mongoFilter['dietaryInfo.isVegan'] = true;
          if (diet === 'gluten_free') mongoFilter['dietaryInfo.isGlutenFree'] = true;
        });
      }

      if (filters.allergies && filters.allergies.length > 0) {
        mongoFilter['dietaryInfo.allergens'] = { $nin: filters.allergies };
      }

      if (filters.maxCalories) {
        mongoFilter['nutrition.calories'] = { $lte: parseInt(filters.maxCalories) };
      }

      if (filters.maxTime) {
        mongoFilter.cookingTime = { $lte: parseInt(filters.maxTime) };
      }

      if (filters.cuisine && filters.cuisine.length > 0) {
        mongoFilter.cuisine = { $in: filters.cuisine };
      }

      // Get all recipes matching filters
      let recipes = await Recipe.find(mongoFilter).limit(100);

      // If recipes have embeddings, calculate similarity
      if (recipes.length > 0 && recipes[0].embedding) {
        recipes = recipes.map(recipe => ({
          ...recipe.toObject(),
          similarity: this.cosineSimilarity(queryEmbedding, recipe.embedding)
        }));

        // Sort by similarity
        recipes.sort((a, b) => b.similarity - a.similarity);
      } else {
        // Fallback: search by text matching
        const searchRegex = new RegExp(query.split(' ').join('|'), 'i');
        recipes = await Recipe.find({
          ...mongoFilter,
          $or: [
            { title: searchRegex },
            { description: searchRegex },
            { 'ingredients.name': searchRegex }
          ]
        }).limit(20);
      }

      return recipes.slice(0, 20); // Return top 20 results
    } catch (error) {
      console.error('Recipe search error:', error);
      // Fallback to simple text search
      return Recipe.find({
        title: { $regex: query, $options: 'i' }
      }).limit(20);
    }
  }

  // Generate custom recipe using RAG
  async generateCustomRecipe(userPreferences, requirements = {}) {
    try {
      // Search for relevant recipes as context
      const searchQuery = [
        requirements.mealType,
        requirements.cuisine,
        userPreferences.dietaryPreferences.join(' '),
        requirements.mainIngredients?.join(' ')
      ].filter(Boolean).join(' ');

      const contextRecipes = await this.searchRecipes(searchQuery, {
        dietary: userPreferences.dietaryPreferences,
        allergies: userPreferences.allergies,
        maxCalories: requirements.maxCalories,
        maxTime: requirements.maxTime
      });

      // Prepare context for generation
      const context = contextRecipes.slice(0, 5).map(recipe => ({
        title: recipe.title,
        ingredients: recipe.ingredients.slice(0, 10),
        cookingTime: recipe.cookingTime,
        nutrition: recipe.nutrition
      }));

      // Generate recipe using AI with RAG context
      const prompt = `You are a professional chef creating a custom recipe.

Context - Similar recipes for inspiration:
${JSON.stringify(context, null, 2)}

User Requirements:
- Meal Type: ${requirements.mealType || 'any'}
- Cuisine: ${requirements.cuisine || 'any'}
- Dietary Restrictions: ${userPreferences.dietaryPreferences.join(', ')}
- Allergies: ${userPreferences.allergies.join(', ')}
- Max Calories: ${requirements.maxCalories || 'no limit'}
- Max Cooking Time: ${requirements.maxTime || 'no limit'} minutes
- Main Ingredients: ${requirements.mainIngredients?.join(', ') || 'chef\'s choice'}

Create a unique recipe that:
1. Is different from the context recipes but draws inspiration from them
2. Meets all dietary restrictions and avoids allergens
3. Has detailed, clear instructions
4. Includes nutritional information
5. Offers 2-3 variations

Respond with a JSON object containing:
{
  "title": "Recipe Name",
  "description": "Brief description",
  "cuisine": "cuisine type",
  "mealType": "breakfast/lunch/dinner/snack",
  "cookingTime": minutes,
  "servings": number,
  "difficulty": "easy/medium/hard",
  "ingredients": [
    {
      "name": "ingredient",
      "quantity": number,
      "unit": "g/ml/cup/tbsp/tsp/unit",
      "category": "vegetable/protein/grain/dairy/spice/oil",
      "notes": "optional notes"
    }
  ],
  "instructions": ["step 1", "step 2", ...],
  "nutrition": {
    "calories": number,
    "protein": number,
    "carbs": number,
    "fat": number,
    "fiber": number,
    "sodium": number
  },
  "variations": [
    {
      "name": "Variation Name",
      "description": "How to modify"
    }
  ],
  "tips": ["tip 1", "tip 2"],
  "tags": ["tag1", "tag2"]
}`;

      const response = await openai.chat.completions.create({
        model: this.generationModel,
        messages: [
          { 
            role: 'system', 
            content: 'You are a professional chef. Always respond with valid JSON for recipes.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        response_format: { type: "json_object" }
      });

      const generatedRecipe = JSON.parse(response.choices[0].message.content);
      
      // Add metadata
      generatedRecipe.isCustom = true;
      generatedRecipe.generatedAt = new Date();
      generatedRecipe.ragContext = {
        contextRecipes: contextRecipes.slice(0, 3).map(r => r._id),
        searchQuery,
        model: this.generationModel
      };

      // Generate embedding for the new recipe
      const recipeText = `${generatedRecipe.title} ${generatedRecipe.description} ${generatedRecipe.ingredients.map(i => i.name).join(' ')}`;
      generatedRecipe.embedding = await this.generateEmbedding(recipeText);

      return generatedRecipe;
    } catch (error) {
      console.error('Recipe generation error:', error);
      // Return a fallback recipe
      return this.generateFallbackRecipe(requirements, userPreferences);
    }
  }

  // Generate ingredient substitutions
  async generateSubstitutions(ingredient, reason, userPreferences) {
    try {
      // Find similar ingredients
      const ingredientDoc = await Ingredient.findOne({
        label: { $regex: new RegExp(ingredient, 'i') }
      });

      let contextIngredients = [];
      
      if (ingredientDoc && ingredientDoc.substitutes) {
        contextIngredients = ingredientDoc.substitutes;
      } else {
        // Search for similar ingredients by category
        const category = ingredientDoc?.category || 'general';
        contextIngredients = await Ingredient.find({
          category,
          label: { $ne: ingredient }
        }).limit(10);
      }

      const prompt = `Suggest substitutions for "${ingredient}".

Reason for substitution: ${reason}
User dietary restrictions: ${userPreferences.dietaryPreferences.join(', ')}
User allergies: ${userPreferences.allergies.join(', ')}

Available alternatives in database: ${contextIngredients.map(i => i.label || i).join(', ')}

Provide 3-5 substitutions with explanations. Consider:
1. Nutritional similarity
2. Texture and cooking properties
3. Flavor profile
4. Dietary compliance

Respond with JSON:
{
  "originalIngredient": "${ingredient}",
  "substitutions": [
    {
      "ingredient": "substitute name",
      "ratio": "conversion ratio (e.g., 1:1, 3:4)",
      "notes": "flavor/texture differences",
      "nutritionComparison": "brief comparison",
      "recommended": true/false
    }
  ]
}`;

      const response = await openai.chat.completions.create({
        model: this.generationModel,
        messages: [
          { 
            role: 'system', 
            content: 'You are a culinary expert specializing in ingredient substitutions.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('Substitution generation error:', error);
      // Return basic substitutions
      return {
        originalIngredient: ingredient,
        substitutions: this.getCommonSubstitutions(ingredient)
      };
    }
  }

  // Fallback recipe generation
  generateFallbackRecipe(requirements, userPreferences) {
    const recipes = {
      breakfast: {
        title: 'Customizable Overnight Oats',
        description: 'Healthy and adaptable breakfast',
        cookingTime: 10,
        ingredients: [
          { name: 'Oats', quantity: 50, unit: 'g' },
          { name: 'Milk (or plant-based)', quantity: 150, unit: 'ml' },
          { name: 'Honey', quantity: 1, unit: 'tbsp' },
          { name: 'Fruits', quantity: 100, unit: 'g' }
        ],
        instructions: [
          'Mix oats with milk in a jar',
          'Add honey and stir',
          'Refrigerate overnight',
          'Top with fruits before serving'
        ],
        nutrition: {
          calories: 350,
          protein: 12,
          carbs: 55,
          fat: 10,
          fiber: 8
        }
      },
      lunch: {
        title: 'Build-Your-Own Buddha Bowl',
        description: 'Nutritious and customizable lunch bowl',
        cookingTime: 20,
        ingredients: [
          { name: 'Quinoa', quantity: 100, unit: 'g' },
          { name: 'Mixed vegetables', quantity: 200, unit: 'g' },
          { name: 'Protein (tofu/chicken)', quantity: 150, unit: 'g' },
          { name: 'Tahini dressing', quantity: 2, unit: 'tbsp' }
        ],
        instructions: [
          'Cook quinoa according to package',
          'Roast or steam vegetables',
          'Cook protein of choice',
          'Assemble bowl and drizzle with dressing'
        ],
        nutrition: {
          calories: 450,
          protein: 25,
          carbs: 50,
          fat: 15,
          fiber: 10
        }
      },
      dinner: {
        title: 'One-Pan Roasted Vegetables with Protein',
        description: 'Simple and healthy dinner',
        cookingTime: 30,
        ingredients: [
          { name: 'Mixed vegetables', quantity: 300, unit: 'g' },
          { name: 'Protein choice', quantity: 200, unit: 'g' },
          { name: 'Olive oil', quantity: 2, unit: 'tbsp' },
          { name: 'Herbs and spices', quantity: 1, unit: 'tbsp' }
        ],
        instructions: [
          'Preheat oven to 200°C',
          'Chop vegetables and protein',
          'Toss with oil and seasonings',
          'Roast for 25-30 minutes'
        ],
        nutrition: {
          calories: 500,
          protein: 35,
          carbs: 40,
          fat: 20,
          fiber: 12
        }
      }
    };

    const mealType = requirements.mealType || 'lunch';
    const baseRecipe = recipes[mealType] || recipes.lunch;

    return {
      ...baseRecipe,
      mealType,
      cuisine: requirements.cuisine || 'international',
      servings: 2,
      difficulty: 'easy',
      isCustom: true,
      variations: [
        {
          name: 'Low-carb version',
          description: 'Replace grains with cauliflower rice'
        },
        {
          name: 'High-protein version',
          description: 'Add extra protein and Greek yogurt'
        }
      ],
      tips: [
        'Prep ingredients in advance',
        'Adjust seasonings to taste'
      ]
    };
  }

  // Common substitutions database
  getCommonSubstitutions(ingredient) {
    const substitutions = {
      'butter': [
        { ingredient: 'Coconut oil', ratio: '1:1', notes: 'Adds coconut flavor', recommended: true },
        { ingredient: 'Olive oil', ratio: '3:4', notes: 'Use for savory dishes', recommended: true },
        { ingredient: 'Applesauce', ratio: '1:2', notes: 'For baking, reduces fat', recommended: false }
      ],
      'egg': [
        { ingredient: 'Flax egg', ratio: '1:1', notes: '1 tbsp flax + 3 tbsp water per egg', recommended: true },
        { ingredient: 'Chia egg', ratio: '1:1', notes: '1 tbsp chia + 3 tbsp water per egg', recommended: true },
        { ingredient: 'Banana', ratio: '1:1', notes: '1/4 cup mashed per egg, adds sweetness', recommended: false }
      ],
      'milk': [
        { ingredient: 'Almond milk', ratio: '1:1', notes: 'Lighter, nutty flavor', recommended: true },
        { ingredient: 'Oat milk', ratio: '1:1', notes: 'Creamy, neutral taste', recommended: true },
        { ingredient: 'Coconut milk', ratio: '1:1', notes: 'Rich, adds coconut flavor', recommended: false }
      ]
    };

    const lowerIngredient = ingredient.toLowerCase();
    
    for (const [key, subs] of Object.entries(substitutions)) {
      if (lowerIngredient.includes(key)) {
        return subs;
      }
    }

    // Default substitutions
    return [
      { 
        ingredient: 'Similar ingredient from same category', 
        ratio: '1:1', 
        notes: 'Adjust to taste',
        recommended: true 
      }
    ];
  }

  // Update recipe embeddings in batch
  async updateRecipeEmbeddings() {
    try {
      const recipes = await Recipe.find({ embedding: { $exists: false } }).limit(50);
      
      for (const recipe of recipes) {
        const text = `${recipe.title} ${recipe.description || ''} ${recipe.cuisine} ${
          recipe.ingredients.map(i => i.name).join(' ')
        }`;
        
        recipe.embedding = await this.generateEmbedding(text);
        await recipe.save();
        
        console.log(`Updated embedding for recipe: ${recipe.title}`);
      }
      
      return { updated: recipes.length };
    } catch (error) {
      console.error('Batch embedding update error:', error);
      return { updated: 0, error: error.message };
    }
  }
}

module.exports = new RAGService();