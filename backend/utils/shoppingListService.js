// backend/utils/shoppingListService.js

const MealPlan = require('../models/MealPlan');
const Recipe = require('../models/Recipe');
const Ingredient = require('../models/Ingredient');

class ShoppingListService {
  constructor() {
    // Define shopping categories (5+ required)
    this.categories = {
      produce: ['vegetable', 'fruit', 'fresh herbs', 'salad', 'tomato', 'lettuce', 'carrot', 'onion', 'garlic', 'potato', 'apple', 'banana', 'berries', 'lemon', 'avocado', 'broccoli', 'spinach'],
      proteins: ['meat', 'poultry', 'fish', 'seafood', 'tofu', 'tempeh', 'eggs', 'chicken', 'beef', 'salmon', 'turkey', 'protein powder'],
      dairy: ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'sour cream', 'greek yogurt', 'parmesan'],
      grains: ['bread', 'rice', 'pasta', 'quinoa', 'oats', 'flour', 'cereal', 'croutons', 'granola'],
      pantry: ['oil', 'vinegar', 'spices', 'sauce', 'condiment', 'sugar', 'salt', 'pepper', 'honey', 'soy sauce', 'sesame oil', 'tahini', 'mayonnaise', 'dressing', 'broth', 'tomato paste', 'ginger'],
      frozen: ['frozen vegetable', 'frozen fruit', 'ice cream', 'frozen meal'],
      beverages: ['water', 'juice', 'soda', 'tea', 'coffee', 'milk alternative'],
      bakery: ['bread', 'bagel', 'muffin', 'croissant', 'cake'],
      snacks: ['chips', 'crackers', 'nuts', 'dried fruit', 'chocolate', 'mixed nuts', 'almond butter'],
      other: ['supplement', 'vitamin', 'medicine', 'household']
    };
  }

  // Generate shopping list from meal plan
  async generateFromMealPlan(mealPlanId, options = {}) {
    try {
      console.log('Generating shopping list for meal plan:', mealPlanId);
      
      const mealPlan = await MealPlan.findById(mealPlanId);
      if (!mealPlan) {
        throw new Error('Meal plan not found');
      }

      console.log(`Found meal plan with ${mealPlan.dailyPlans.length} days`);

      // Collect all ingredients from all meals
      const ingredientsList = [];
      
      for (const dailyPlan of mealPlan.dailyPlans) {
        console.log('Processing day:', dailyPlan.date);
        
        for (const meal of dailyPlan.meals) {
          console.log(`Processing meal: ${meal.name}`);
          
          if (meal.recipeId) {
            console.log('  Has recipeId, fetching recipe...');
            // Fetch full recipe if referenced
            const recipe = await Recipe.findById(meal.recipeId);
            if (recipe && recipe.ingredients) {
              recipe.ingredients.forEach(ing => {
                if (ing && ing.name) {  // Check ingredient exists and has name
                  ingredientsList.push({
                    name: ing.name,
                    quantity: ing.quantity || 1,
                    unit: ing.unit || 'unit',
                    category: ing.category,
                    mealName: meal.name,
                    date: dailyPlan.date,
                    servings: meal.servings || 1
                  });
                }
              });
            }
          } else if (meal.customRecipe && meal.customRecipe.ingredients) {
            console.log(`  Has customRecipe with ${meal.customRecipe.ingredients.length} ingredients`);
            // Handle custom recipes
            meal.customRecipe.ingredients.forEach(ing => {
              if (ing && ing.name) {  // Check ingredient exists and has name
                console.log(`    Adding: ${ing.name} - ${ing.quantity} ${ing.unit}`);
                ingredientsList.push({
                  name: ing.name,
                  quantity: ing.quantity || 1,
                  unit: ing.unit || 'unit',
                  category: ing.category,
                  mealName: meal.name,
                  date: dailyPlan.date,
                  servings: meal.servings || 1
                });
              } else {
                console.log('    Warning: Ingredient missing name:', ing);
              }
            });
          } else {
            console.log(`  No ingredients found for meal: ${meal.name}`);
          }
        }
      }

      console.log(`Total ingredients collected: ${ingredientsList.length}`);

      if (ingredientsList.length === 0) {
        console.log('No ingredients found in meal plan');
        return {
          mealPlanId,
          generatedAt: new Date(),
          weekOf: mealPlan.startDate,
          categories: {},
          totalItems: 0,
          metadata: {
            daysIncluded: mealPlan.dailyPlans.length,
            mealsIncluded: mealPlan.dailyPlans.reduce((sum, day) => sum + day.meals.length, 0),
            servings: 0
          }
        };
      }

      // Aggregate ingredients
      const aggregatedItems = this.aggregateIngredients(ingredientsList);
      
      // Categorize items
      const categorizedList = this.categorizeItems(aggregatedItems);
      
      // Apply exclusions if provided
      if (options.exclude && Array.isArray(options.exclude)) {
        this.applyExclusions(categorizedList, options.exclude);
      }

      // Calculate estimated cost if requested
      if (options.includeCost) {
        await this.addCostEstimates(categorizedList);
      }

      // Sort by store layout if provided
      if (options.storeLayout) {
        this.sortByStoreLayout(categorizedList, options.storeLayout);
      }

      return {
        mealPlanId,
        generatedAt: new Date(),
        weekOf: mealPlan.startDate,
        categories: categorizedList,
        totalItems: this.countTotalItems(categorizedList),
        estimatedCost: options.includeCost ? this.calculateTotalCost(categorizedList) : null,
        metadata: {
          daysIncluded: mealPlan.dailyPlans.length,
          mealsIncluded: mealPlan.dailyPlans.reduce((sum, day) => sum + day.meals.length, 0),
          servings: mealPlan.dailyPlans.reduce((sum, day) => 
            sum + day.meals.reduce((mealSum, meal) => mealSum + (meal.servings || 1), 0), 0
          )
        }
      };
    } catch (error) {
      console.error('Shopping list generation error:', error);
      throw error;
    }
  }

  // Aggregate ingredients with same name
  aggregateIngredients(ingredientsList) {
    const aggregated = new Map();

    ingredientsList.forEach(item => {
      // Skip invalid items
      if (!item || !item.name) {
        console.log('Skipping invalid item:', item);
        return;
      }

      // Create a key for aggregation (name + unit)
      const key = `${item.name.toLowerCase()}_${item.unit || 'unit'}`;
      
      if (aggregated.has(key)) {
        const existing = aggregated.get(key);
        existing.quantity += (item.quantity || 1);
        existing.sources.push({
          meal: item.mealName || 'Unknown meal',
          date: item.date
        });
      } else {
        aggregated.set(key, {
          name: item.name,
          quantity: item.quantity || 1,
          unit: item.unit || 'unit',
          category: item.category,
          sources: [{
            meal: item.mealName || 'Unknown meal',
            date: item.date
          }]
        });
      }
    });

    // Convert to array and round quantities
    return Array.from(aggregated.values()).map(item => ({
      ...item,
      quantity: this.roundQuantity(item.quantity, item.unit),
      displayQuantity: this.formatQuantity(item.quantity, item.unit)
    }));
  }

  // Categorize items into shopping categories (5+ categories)
  categorizeItems(items) {
    const categorized = {
      produce: [],
      proteins: [],
      dairy: [],
      grains: [],
      pantry: [],
      frozen: [],
      beverages: [],
      bakery: [],
      snacks: [],
      other: []
    };

    items.forEach(item => {
      const category = this.determineCategory(item);
      if (categorized[category]) {
        categorized[category].push({
          ...item,
          checked: false,
          id: this.generateItemId(item)
        });
      } else {
        categorized.other.push({
          ...item,
          checked: false,
          id: this.generateItemId(item)
        });
      }
    });

    // Remove empty categories
    Object.keys(categorized).forEach(key => {
      if (categorized[key].length === 0) {
        delete categorized[key];
      }
    });

    // Sort items within each category
    Object.keys(categorized).forEach(key => {
      categorized[key].sort((a, b) => a.name.localeCompare(b.name));
    });

    return categorized;
  }

  // Determine category for an item
  determineCategory(item) {
    if (!item || !item.name) return 'other';
    
    const itemName = item.name.toLowerCase();
    
    // Check each category's keywords
    for (const [category, keywords] of Object.entries(this.categories)) {
      if (keywords.some(keyword => itemName.includes(keyword.toLowerCase()))) {
        return category;
      }
    }
    
    // Default fallback based on common patterns
    if (itemName.includes('berry') || itemName.includes('fruit')) return 'produce';
    if (itemName.includes('meat') || itemName.includes('chicken') || itemName.includes('fish')) return 'proteins';
    if (itemName.includes('milk') || itemName.includes('cheese')) return 'dairy';
    if (itemName.includes('bread') || itemName.includes('rice')) return 'grains';
    
    return 'other';
  }

  // Generate unique ID for item
  generateItemId(item) {
    return `${item.name}_${item.unit}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Round quantity to reasonable number
  roundQuantity(quantity, unit) {
    if (unit === 'unit' || unit === 'slice' || unit === 'piece') {
      return Math.ceil(quantity);
    }
    if (quantity < 10) {
      return Math.round(quantity * 10) / 10;
    }
    return Math.round(quantity);
  }

  // Format quantity for display
  formatQuantity(quantity, unit) {
    const rounded = this.roundQuantity(quantity, unit);
    if (unit === 'unit' && rounded === 1) {
      return '1';
    }
    return `${rounded}`;
  }

  // Apply exclusions
  applyExclusions(categorizedList, excludeItems) {
    excludeItems.forEach(excludeItem => {
      const itemLower = excludeItem.toLowerCase().trim();
      Object.keys(categorizedList).forEach(category => {
        categorizedList[category] = categorizedList[category].filter(
          item => !item.name.toLowerCase().includes(itemLower)
        );
      });
    });
  }

  // Count total items
  countTotalItems(categorizedList) {
    return Object.values(categorizedList).reduce(
      (sum, items) => sum + items.length, 
      0
    );
  }

  // Add cost estimates (mock implementation)
  async addCostEstimates(categorizedList) {
    // This would normally query a pricing database
    Object.keys(categorizedList).forEach(category => {
      categorizedList[category].forEach(item => {
        // Mock pricing based on category
        const basePrices = {
          produce: 2.5,
          proteins: 8.0,
          dairy: 4.0,
          grains: 3.0,
          pantry: 5.0,
          frozen: 4.5,
          beverages: 3.5,
          bakery: 3.0,
          snacks: 4.0,
          other: 5.0
        };
        item.estimatedCost = basePrices[category] || 5.0;
      });
    });
  }

  // Calculate total cost
  calculateTotalCost(categorizedList) {
    return Object.values(categorizedList).reduce(
      (sum, items) => sum + items.reduce((itemSum, item) => itemSum + (item.estimatedCost || 0), 0),
      0
    );
  }

  // Sort by store layout
  sortByStoreLayout(categorizedList, layout) {
    // This would reorder categories based on store layout
    // For now, just return as-is
    return categorizedList;
  }

  // Update quantities
  updateQuantities(shoppingList, updates) {
    // Implementation for updating quantities
    return shoppingList;
  }

  // Export list as text
  exportList(shoppingList, format) {
    if (format === 'text') {
      let text = 'Shopping List\n\n';
      Object.entries(shoppingList.categories).forEach(([category, items]) => {
        text += `${category.toUpperCase()}\n`;
        items.forEach(item => {
          text += `- ${item.quantity} ${item.unit} ${item.name}\n`;
        });
        text += '\n';
      });
      return text;
    }
    return JSON.stringify(shoppingList, null, 2);
  }
}

module.exports = new ShoppingListService();