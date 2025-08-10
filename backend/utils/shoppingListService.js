// utils/shoppingListService.js - Shopping list generation with categorization
const MealPlan = require('../models/MealPlan');
const Recipe = require('../models/Recipe');
const Ingredient = require('../models/Ingredient');

class ShoppingListService {
  constructor() {
    // Define shopping categories (5+ required)
    this.categories = {
      produce: ['vegetable', 'fruit', 'fresh herbs', 'salad'],
      proteins: ['meat', 'poultry', 'fish', 'seafood', 'tofu', 'tempeh', 'eggs'],
      dairy: ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'sour cream'],
      grains: ['bread', 'rice', 'pasta', 'quinoa', 'oats', 'flour', 'cereal'],
      pantry: ['oil', 'vinegar', 'spices', 'sauce', 'condiment', 'sugar', 'salt'],
      frozen: ['frozen vegetable', 'frozen fruit', 'ice cream', 'frozen meal'],
      beverages: ['water', 'juice', 'soda', 'tea', 'coffee', 'milk alternative'],
      bakery: ['bread', 'bagel', 'muffin', 'croissant', 'cake'],
      snacks: ['chips', 'crackers', 'nuts', 'dried fruit', 'chocolate'],
      other: ['supplement', 'vitamin', 'medicine', 'household']
    };
  }

  // Generate shopping list from meal plan
  async generateFromMealPlan(mealPlanId, options = {}) {
    try {
      const mealPlan = await MealPlan.findById(mealPlanId);
      if (!mealPlan) {
        throw new Error('Meal plan not found');
      }

      // Collect all ingredients from all meals
      const ingredientsList = [];
      
      for (const dailyPlan of mealPlan.dailyPlans) {
        for (const meal of dailyPlan.meals) {
          if (meal.recipeId) {
            // Fetch full recipe if referenced
            const recipe = await Recipe.findById(meal.recipeId);
            if (recipe && recipe.ingredients) {
              recipe.ingredients.forEach(ing => {
                ingredientsList.push({
                  ...ing,
                  mealName: meal.name,
                  date: dailyPlan.date,
                  servings: meal.servings || 1
                });
              });
            }
          } else if (meal.customRecipe && meal.customRecipe.ingredients) {
            // Handle custom recipes
            meal.customRecipe.ingredients.forEach(ing => {
              ingredientsList.push({
                ...ing,
                mealName: meal.name,
                date: dailyPlan.date,
                servings: meal.servings || 1
              });
            });
          }
        }
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

  // Generate shopping list from selected recipes
  async generateFromRecipes(recipeIds, servingsMap = {}) {
    try {
      const recipes = await Recipe.find({ _id: { $in: recipeIds } });
      
      const ingredientsList = [];
      
      for (const recipe of recipes) {
        const servings = servingsMap[recipe._id] || recipe.servings || 2;
        const ratio = servings / recipe.servings;
        
        recipe.ingredients.forEach(ing => {
          ingredientsList.push({
            name: ing.name,
            quantity: ing.quantity * ratio,
            unit: ing.unit,
            category: ing.category,
            recipeName: recipe.title,
            recipeId: recipe._id
          });
        });
      }

      const aggregatedItems = this.aggregateIngredients(ingredientsList);
      const categorizedList = this.categorizeItems(aggregatedItems);

      return {
        generatedAt: new Date(),
        recipes: recipes.map(r => ({ id: r._id, title: r.title })),
        categories: categorizedList,
        totalItems: this.countTotalItems(categorizedList)
      };
    } catch (error) {
      console.error('Recipe shopping list error:', error);
      throw error;
    }
  }

  // Aggregate ingredients with same name
  aggregateIngredients(ingredientsList) {
    const aggregated = new Map();

    ingredientsList.forEach(item => {
      const key = `${item.name.toLowerCase()}_${item.unit}`;
      
      if (aggregated.has(key)) {
        const existing = aggregated.get(key);
        existing.quantity += item.quantity;
        existing.sources.push({
          meal: item.mealName || item.recipeName,
          date: item.date
        });
      } else {
        aggregated.set(key, {
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          category: item.category,
          sources: [{
            meal: item.mealName || item.recipeName,
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
    const itemName = item.name.toLowerCase();
    const itemCategory = item.category?.toLowerCase();

    // Check by ingredient category first
    if (itemCategory) {
      if (itemCategory === 'vegetable' || itemCategory === 'fruit') return 'produce';
      if (itemCategory === 'protein') return 'proteins';
      if (itemCategory === 'dairy') return 'dairy';
      if (itemCategory === 'grain') return 'grains';
      if (itemCategory === 'spice' || itemCategory === 'oil') return 'pantry';
    }

    // Check by name keywords
    for (const [category, keywords] of Object.entries(this.categories)) {
      if (keywords.some(keyword => itemName.includes(keyword))) {
        return category;
      }
    }

    // Special categorization rules
    if (itemName.includes('frozen')) return 'frozen';
    if (itemName.includes('bread') || itemName.includes('roll')) return 'bakery';
    if (itemName.includes('juice') || itemName.includes('soda')) return 'beverages';
    
    // Default category
    return 'other';
  }

  // Apply exclusions to the list
  applyExclusions(categorizedList, exclusions) {
    exclusions.forEach(excludeItem => {
      const excludeLower = excludeItem.toLowerCase();
      
      Object.keys(categorizedList).forEach(category => {
        categorizedList[category] = categorizedList[category].filter(
          item => !item.name.toLowerCase().includes(excludeLower)
        );
      });
    });

    // Remove empty categories after exclusions
    Object.keys(categorizedList).forEach(key => {
      if (categorizedList[key].length === 0) {
        delete categorizedList[key];
      }
    });
  }

  // Add cost estimates to items
  async addCostEstimates(categorizedList) {
    // Simplified cost estimation - in production, use actual price API
    const avgPrices = {
      produce: 2.50,
      proteins: 8.00,
      dairy: 3.50,
      grains: 2.00,
      pantry: 3.00,
      frozen: 4.00,
      beverages: 2.00,
      bakery: 3.00,
      snacks: 3.50,
      other: 5.00
    };

    Object.keys(categorizedList).forEach(category => {
      categorizedList[category].forEach(item => {
        // Estimate based on category and quantity
        const basePrice = avgPrices[category] || 5.00;
        const quantityFactor = this.getQuantityFactor(item.quantity, item.unit);
        item.estimatedCost = Math.round(basePrice * quantityFactor * 100) / 100;
      });
    });
  }

  // Sort categories by store layout
  sortByStoreLayout(categorizedList, layout) {
    const layoutOrder = {
      'standard': ['produce', 'bakery', 'dairy', 'proteins', 'frozen', 'grains', 'pantry', 'snacks', 'beverages', 'other'],
      'perimeter': ['produce', 'proteins', 'dairy', 'bakery', 'frozen', 'grains', 'pantry', 'beverages', 'snacks', 'other'],
      'entrance': ['produce', 'bakery', 'proteins', 'dairy', 'frozen', 'pantry', 'grains', 'snacks', 'beverages', 'other']
    };

    const order = layoutOrder[layout] || layoutOrder.standard;
    
    const sorted = {};
    order.forEach(category => {
      if (categorizedList[category]) {
        sorted[category] = categorizedList[category];
      }
    });

    // Add any remaining categories not in the layout
    Object.keys(categorizedList).forEach(category => {
      if (!sorted[category]) {
        sorted[category] = categorizedList[category];
      }
    });

    return sorted;
  }

  // Update item quantities
  updateQuantities(shoppingList, updates) {
    updates.forEach(update => {
      Object.keys(shoppingList.categories).forEach(category => {
        const item = shoppingList.categories[category].find(i => i.id === update.id);
        if (item) {
          item.quantity = update.quantity;
          item.displayQuantity = this.formatQuantity(update.quantity, item.unit);
          if (update.hasOwnProperty('checked')) {
            item.checked = update.checked;
          }
        }
      });
    });

    return shoppingList;
  }

  // Helper functions
  roundQuantity(quantity, unit) {
    // Round to sensible values based on unit
    if (unit === 'g' || unit === 'ml') {
      return Math.round(quantity / 10) * 10; // Round to nearest 10
    } else if (unit === 'kg' || unit === 'l') {
      return Math.round(quantity * 10) / 10; // Round to 1 decimal
    } else {
      return Math.round(quantity * 10) / 10; // Default to 1 decimal
    }
  }

  formatQuantity(quantity, unit) {
    // Format for display
    if (quantity === Math.floor(quantity)) {
      return `${quantity} ${unit}`;
    } else {
      return `${quantity.toFixed(1)} ${unit}`;
    }
  }

  getQuantityFactor(quantity, unit) {
    // Convert to standard factor for pricing
    const factors = {
      'g': quantity / 500,
      'kg': quantity * 2,
      'ml': quantity / 500,
      'l': quantity * 2,
      'cup': quantity * 0.5,
      'tbsp': quantity * 0.1,
      'tsp': quantity * 0.05,
      'unit': quantity
    };
    
    return factors[unit] || quantity;
  }

  generateItemId(item) {
    return `${item.name.toLowerCase().replace(/\s+/g, '-')}-${item.unit}`;
  }

  countTotalItems(categorizedList) {
    return Object.values(categorizedList).reduce(
      (sum, items) => sum + items.length, 0
    );
  }

  calculateTotalCost(categorizedList) {
    let total = 0;
    Object.values(categorizedList).forEach(items => {
      items.forEach(item => {
        total += item.estimatedCost || 0;
      });
    });
    return Math.round(total * 100) / 100;
  }

  // Export shopping list to different formats
  exportList(shoppingList, format = 'text') {
    if (format === 'text') {
      let text = 'Shopping List\n';
      text += `Generated: ${new Date(shoppingList.generatedAt).toLocaleDateString()}\n\n`;
      
      Object.entries(shoppingList.categories).forEach(([category, items]) => {
        text += `${category.toUpperCase()}\n`;
        items.forEach(item => {
          const check = item.checked ? '✓' : '☐';
          text += `${check} ${item.displayQuantity} ${item.name}\n`;
        });
        text += '\n';
      });
      
      if (shoppingList.estimatedCost) {
        text += `\nEstimated Total: $${shoppingList.estimatedCost}`;
      }
      
      return text;
    } else if (format === 'json') {
      return JSON.stringify(shoppingList, null, 2);
    } else if (format === 'csv') {
      let csv = 'Category,Item,Quantity,Unit,Checked\n';
      
      Object.entries(shoppingList.categories).forEach(([category, items]) => {
        items.forEach(item => {
          csv += `${category},${item.name},${item.quantity},${item.unit},${item.checked}\n`;
        });
      });
      
      return csv;
    }
    
    return shoppingList;
  }
}

module.exports = new ShoppingListService();