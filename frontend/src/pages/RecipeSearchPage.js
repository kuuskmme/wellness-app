import React, { useState, useEffect } from 'react';
import { Search, Filter, Clock, ChefHat, Plus, AlertCircle, Flame, X, Users, BookOpen, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DoughnutChart, BarChart } from '../components/Charts';

export default function RecipeSearchPage() {
  // Authentication
  const { accessToken, isAuthenticated, refreshAccessToken } = useAuth();
  const token = accessToken || localStorage.getItem('token') || localStorage.getItem('accessToken');
  
  // State
  const [recipes, setRecipes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    dietary: [],
    allergies: [],
    maxCalories: '',
    maxTime: '',
    cuisine: '',
    mealType: ''
  });
  const [loading, setLoading] = useState(false);
  const [generatingRecipe, setGeneratingRecipe] = useState(false);
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [userPreferences, setUserPreferences] = useState(null);

  // Fetch user preferences and initial recipes on mount
  useEffect(() => {
    fetchUserPreferences();
    performSearch(); // Load initial recipes
  }, []);

  // Update token when accessToken changes
  useEffect(() => {
    const newToken = accessToken || localStorage.getItem('token') || localStorage.getItem('accessToken');
    console.log('Token updated:', !!newToken);
  }, [accessToken]);

  const fetchUserPreferences = async () => {
    if (!token) return;
    
    try {
      const res = await fetch('http://localhost:5000/api/nutrition/preferences', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setUserPreferences(data);
        // Pre-populate filters with user's dietary preferences if logged in
        if (data) {
          setFilters(prev => ({
            ...prev,
            dietary: data.dietaryPreferences || [],
            allergies: data.allergies || []
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    }
  };

  const performSearch = async () => {
    setLoading(true);
    setError('');
    
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      
      if (filters.dietary.length > 0) {
        params.append('dietary', filters.dietary.join(','));
      }
      if (filters.allergies.length > 0) {
        params.append('allergies', filters.allergies.join(','));
      }
      if (filters.maxCalories) {
        params.append('maxCalories', filters.maxCalories);
      }
      if (filters.maxTime) {
        params.append('maxTime', filters.maxTime);
      }
      if (filters.cuisine) {
        params.append('cuisine', filters.cuisine);
      }
      if (filters.mealType) {
        params.append('mealType', filters.mealType);
      }

      // Build headers - only add auth if token exists
      const headers = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`http://localhost:5000/api/nutrition/recipes/search?${params}`, {
        headers
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Search failed');
      }
      
      const data = await res.json();
      setRecipes(data.recipes || []);
      
      // Clear any previous errors if successful
      if (data.recipes && data.recipes.length > 0) {
        setError('');
      }
    } catch (error) {
      setError(error.message || 'Failed to search recipes. Please try again.');
      console.error('Search error:', error);
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  };

  const generateCustomRecipe = async () => {
    if (!token) {
      setError('Please login to generate custom recipes');
      alert('Please login to generate custom recipes with AI');
      return;
    }
    
    setGeneratingRecipe(true);
    setError('');
    
    try {
      const res = await fetch('http://localhost:5000/api/nutrition/recipes/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requirements: {
            mealType: filters.mealType || 'dinner',
            cuisine: filters.cuisine || 'other',
            maxCalories: filters.maxCalories,
            maxTime: filters.maxTime,
            mainIngredients: searchQuery ? searchQuery.split(' ').filter(word => word.length > 3) : []
          }
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Generation failed');
      }
      
      const data = await res.json();
      if (data.recipe) {
        // Add the generated recipe to the top of the list
        setRecipes([data.recipe, ...recipes]);
        setSelectedRecipe(data.recipe);
        setError('');
        
        // Show success message
        alert('Custom recipe generated successfully!');
      }
    } catch (error) {
      setError(error.message || 'Failed to generate custom recipe. Please try again.');
      console.error('Generation error:', error);
      
      // More informative error message
      if (error.message.includes('expired') || error.message.includes('Authentication')) {
        alert('Your session has expired. Please refresh the page and try again.');
      } else {
        alert('AI generation unavailable. Using template recipes instead.');
      }
    } finally {
      setGeneratingRecipe(false);
    }
  };

  // Helper function to prepare macro chart data
  const prepareMacroChartData = (nutrition) => {
    if (!nutrition) return null;
    
    return {
      labels: ['Protein', 'Carbs', 'Fat'],
      datasets: [{
        data: [
          nutrition.protein || 0,
          nutrition.carbs || 0,
          nutrition.fat || 0
        ],
        backgroundColor: [
          '#ef4444', // red for protein
          '#3b82f6', // blue for carbs
          '#f59e0b'  // yellow for fat
        ],
        borderWidth: 0
      }]
    };
  };

  // Helper function for difficulty colors
  const getDifficultyColor = (difficulty) => {
    const colors = {
      easy: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      hard: 'bg-red-100 text-red-800',
      expert: 'bg-purple-100 text-purple-800'
    };
    return colors[difficulty] || 'bg-gray-100 text-gray-800';
  };

  // Function to adjust recipe servings
  const adjustServings = async (recipeId, newServings) => {
    if (newServings < 1 || newServings > 20) return;
    
    try {
      const headers = {
        'Content-Type': 'application/json'
      };
      
      // Add auth header if token exists
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`http://localhost:5000/api/nutrition/recipes/${recipeId}/adjust`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          servings: newServings
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Adjustment failed');
      }
      
      const data = await res.json();
      
      // Update the recipe in state
      if (data.recipe) {
        setSelectedRecipe(data.recipe);
        setRecipes(recipes.map(r => 
          r._id === recipeId ? data.recipe : r
        ));
      }
    } catch (error) {
      console.error('Adjust servings error:', error);
      
      // Fallback: adjust locally without API
      const ratio = newServings / (selectedRecipe.servings || 2);
      const adjustedRecipe = {
        ...selectedRecipe,
        servings: newServings,
        ingredients: selectedRecipe.ingredients.map(ing => ({
          ...ing,
          quantity: Math.round(ing.quantity * ratio * 10) / 10
        })),
        nutrition: {
          calories: Math.round((selectedRecipe.nutrition?.calories || 0) * ratio),
          protein: Math.round((selectedRecipe.nutrition?.protein || 0) * ratio),
          carbs: Math.round((selectedRecipe.nutrition?.carbs || 0) * ratio),
          fat: Math.round((selectedRecipe.nutrition?.fat || 0) * ratio),
          fiber: Math.round((selectedRecipe.nutrition?.fiber || 0) * ratio),
          sugar: Math.round((selectedRecipe.nutrition?.sugar || 0) * ratio),
          sodium: Math.round((selectedRecipe.nutrition?.sodium || 0) * ratio)
        }
      };
      setSelectedRecipe(adjustedRecipe);
    }
  };

  // Function to request ingredient substitution
  const substituteIngredientRequest = async (recipeId, ingredient) => {
    try {
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('http://localhost:5000/api/nutrition/recipes/substitute', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ingredient,
          reason: 'dietary preference'
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Substitution failed');
      }
      
      const data = await res.json();
      const subs = data.substitutions?.substitutions || data.substitutions || [];
      
      if (subs.length > 0) {
        const subList = subs.map(s => `${s.ingredient} (${s.ratio}): ${s.notes}`).join('\n');
        alert(`Suggested substitutes for ${ingredient}:\n\n${subList}`);
      } else {
        alert(`No substitutes found for ${ingredient}`);
      }
    } catch (error) {
      console.error('Substitution error:', error);
      
      // Provide fallback substitutions
      const commonSubs = {
        'butter': 'Coconut oil (1:1), Olive oil (3:4), or Applesauce (1:2)',
        'milk': 'Almond milk (1:1), Oat milk (1:1), or Coconut milk (1:1)',
        'eggs': 'Flax egg (1 tbsp flax + 3 tbsp water), Chia egg, or Applesauce (1/4 cup per egg)',
        'flour': 'Almond flour (1:1), Coconut flour (1:4), or Oat flour (1:1)',
        'sugar': 'Honey (3:4), Maple syrup (3:4), or Stevia (1:8)'
      };
      
      const fallbackSub = commonSubs[ingredient.toLowerCase()];
      if (fallbackSub) {
        alert(`Common substitutes for ${ingredient}:\n\n${fallbackSub}`);
      } else {
        alert('Unable to find substitutes at this time. Try searching online for alternatives.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Recipe Search & Generator</h1>
          <p className="mt-2 text-gray-600">
            Search our recipe database or generate custom recipes with AI
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6 flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>{error}</span>
          </div>
        )}

        {/* Search Bar and Action Buttons */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          {/* Search Row */}
          <div className="flex gap-2 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && performSearch()}
                placeholder="Search recipes by name, ingredients, or cuisine..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center"
            >
              <Filter className="h-5 w-5 mr-2" />
              Filters
              {(filters.dietary.length > 0 || filters.allergies.length > 0) && (
                <span className="ml-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                  {filters.dietary.length + filters.allergies.length}
                </span>
              )}
            </button>
            
            <button
              onClick={performSearch}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>

          {/* AI Generate Button - Prominent placement */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                <Sparkles className="h-4 w-4 inline mr-1" />
                Can't find what you're looking for? Generate a custom recipe with AI!
              </div>
              <button
                onClick={generateCustomRecipe}
                disabled={generatingRecipe || !token}
                className={`px-6 py-2 rounded-lg font-medium flex items-center transition-all ${
                  token 
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 disabled:opacity-50' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                title={!token ? 'Login required to generate custom recipes' : 'Generate a custom recipe with AI'}
              >
                {generatingRecipe ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Plus className="h-5 w-5 mr-2" />
                    Generate Custom Recipe
                  </>
                )}
              </button>
            </div>
            {!token && (
              <p className="text-xs text-gray-500 mt-2 text-right">
                Please <a href="/login" className="text-blue-600 hover:underline">login</a> to use AI recipe generation
              </p>
            )}
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t">
              <div className="grid md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Meal Type</label>
                  <select
                    value={filters.mealType || ''}
                    onChange={(e) => setFilters({...filters, mealType: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Any</option>
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                    <option value="snack">Snack</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Max Calories</label>
                  <input
                    type="number"
                    value={filters.maxCalories}
                    onChange={(e) => setFilters({...filters, maxCalories: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="e.g., 500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Max Time (min)</label>
                  <input
                    type="number"
                    value={filters.maxTime}
                    onChange={(e) => setFilters({...filters, maxTime: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="e.g., 30"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Cuisine</label>
                  <select
                    value={filters.cuisine}
                    onChange={(e) => setFilters({...filters, cuisine: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">Any Cuisine</option>
                    <option value="italian">Italian</option>
                    <option value="mexican">Mexican</option>
                    <option value="chinese">Chinese</option>
                    <option value="indian">Indian</option>
                    <option value="mediterranean">Mediterranean</option>
                    <option value="american">American</option>
                    <option value="thai">Thai</option>
                    <option value="japanese">Japanese</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results Section */}
        {recipes.length === 0 && !loading && (
          <div className="text-center py-12">
            <ChefHat className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? 'No recipes found' : 'Ready to discover recipes?'}
            </h3>
            <p className="text-gray-600">
              {searchQuery 
                ? `No recipes match "${searchQuery}". Try different keywords or generate a custom recipe!`
                : 'Search our database or generate a custom recipe with AI.'}
            </p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Searching recipes...</p>
          </div>
        )}

        {/* Recipe Grid */}
        {!loading && recipes.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recipes.map((recipe, index) => (
              <div 
                key={recipe._id || index}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedRecipe(recipe)}
              >
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg">{recipe.title}</h3>
                    {recipe.isCustom && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                        AI Generated
                      </span>
                    )}
                  </div>

                  {recipe.description && (
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">{recipe.description}</p>
                  )}

                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {recipe.cookingTime} min
                    </div>
                    <div className="flex items-center">
                      <Flame className="h-4 w-4 mr-1" />
                      {recipe.nutrition?.calories || 'N/A'} cal
                    </div>
                    {recipe.servings && (
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        {recipe.servings} servings
                      </div>
                    )}
                  </div>

                  {recipe.cuisine && (
                    <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                      {recipe.cuisine}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recipe Detail Modal */}
        {selectedRecipe && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">{selectedRecipe.title}</h2>
                    <p className="text-gray-600 mb-3">{selectedRecipe.description}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {selectedRecipe.cookingTime} min
                      </div>
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        <span>{selectedRecipe.servings || 2} servings</span>
                      </div>
                      {selectedRecipe.difficulty && (
                        <span className={`px-2 py-1 rounded ${getDifficultyColor(selectedRecipe.difficulty)}`}>
                          {selectedRecipe.difficulty}
                        </span>
                      )}
                      {selectedRecipe.cuisine && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                          {selectedRecipe.cuisine}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedRecipe(null)}
                    className="p-2 hover:bg-gray-100 rounded-full"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Servings Adjuster */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Adjust Servings:</label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => adjustServings(selectedRecipe._id, Math.max(1, (selectedRecipe.servings || 2) - 1))}
                        className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded"
                      >
                        -
                      </button>
                      <span className="px-4 py-1 bg-white rounded font-medium">
                        {selectedRecipe.servings || 2}
                      </span>
                      <button
                        onClick={() => adjustServings(selectedRecipe._id, (selectedRecipe.servings || 2) + 1)}
                        className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Content Grid */}
                <div className="grid md:grid-cols-3 gap-6">
                  {/* Left Column - Ingredients & Instructions */}
                  <div className="md:col-span-2 space-y-6">
                    {/* Ingredients */}
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h3 className="font-semibold mb-3 flex items-center">
                        <ChefHat className="h-5 w-5 mr-2" />
                        Ingredients
                      </h3>
                      <div className="space-y-2">
                        {selectedRecipe.ingredients && selectedRecipe.ingredients.map((ingredient, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-white rounded hover:bg-gray-50">
                            <div className="flex-1">
                              <span className="font-medium">{ingredient.name}</span>
                              {ingredient.notes && (
                                <span className="text-sm text-gray-500 ml-2">({ingredient.notes})</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-700">
                                {ingredient.quantity} {ingredient.unit}
                              </span>
                              <button
                                onClick={() => substituteIngredientRequest(selectedRecipe._id, ingredient.name)}
                                className="text-xs text-blue-600 hover:text-blue-800"
                              >
                                Substitute
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Instructions */}
                    <div className="bg-yellow-50 rounded-lg p-4">
                      <h3 className="font-semibold mb-3 flex items-center">
                        <BookOpen className="h-5 w-5 mr-2" />
                        Instructions
                      </h3>
                      <ol className="space-y-3">
                        {selectedRecipe.instructions && selectedRecipe.instructions.map((instruction, index) => (
                          <li key={index} className="flex">
                            <span className="flex-shrink-0 w-8 h-8 bg-yellow-200 text-yellow-800 rounded-full flex items-center justify-center font-semibold mr-3">
                              {index + 1}
                            </span>
                            <span className="text-gray-700 pt-1">{instruction}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* Tips & Variations */}
                    <div className="grid md:grid-cols-2 gap-4">
                      {selectedRecipe.tips && selectedRecipe.tips.length > 0 && (
                        <div className="bg-purple-50 rounded-lg p-4">
                          <h4 className="font-semibold mb-2">💡 Tips</h4>
                          <ul className="text-sm text-gray-600 space-y-1">
                            {selectedRecipe.tips.map((tip, idx) => (
                              <li key={idx}>• {tip}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {selectedRecipe.variations && selectedRecipe.variations.length > 0 && (
                        <div className="bg-indigo-50 rounded-lg p-4">
                          <h4 className="font-semibold mb-2">🔄 Variations</h4>
                          <div className="space-y-2">
                            {selectedRecipe.variations.map((variation, idx) => (
                              <div key={idx} className="text-sm">
                                <p className="font-medium">{variation.name}</p>
                                <p className="text-gray-600 text-xs">{variation.description}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column - Nutrition */}
                  <div className="md:col-span-1">
                    <div className="bg-green-50 rounded-lg p-4 sticky top-0">
                      <h3 className="font-semibold mb-3 flex items-center">
                        <Flame className="h-5 w-5 mr-2" />
                        Nutrition per Serving
                      </h3>
                      
                      {/* Calories Display */}
                      <div className="text-center mb-4 p-3 bg-white rounded">
                        <div className="text-3xl font-bold text-gray-900">
                          {selectedRecipe.nutrition?.calories || 0}
                        </div>
                        <div className="text-sm text-gray-600">Calories</div>
                      </div>

                      {/* Macro Doughnut Chart */}
                      {selectedRecipe.nutrition && (
                        <div className="mb-4 bg-white p-3 rounded">
                          <DoughnutChart
                            data={prepareMacroChartData(selectedRecipe.nutrition)}
                            options={{
                              plugins: {
                                legend: {
                                  position: 'bottom',
                                  labels: {
                                    padding: 10,
                                    font: { size: 11 }
                                  }
                                },
                                title: {
                                  display: true,
                                  text: 'Macronutrient Breakdown',
                                  font: { size: 12 }
                                }
                              },
                              maintainAspectRatio: true
                            }}
                          />
                        </div>
                      )}

                      {/* Detailed Nutrition Grid */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 bg-white rounded">
                          <p className="text-xs text-gray-500">Protein</p>
                          <p className="font-semibold">{selectedRecipe.nutrition?.protein || 0}g</p>
                        </div>
                        <div className="p-2 bg-white rounded">
                          <p className="text-xs text-gray-500">Carbs</p>
                          <p className="font-semibold">{selectedRecipe.nutrition?.carbs || 0}g</p>
                        </div>
                        <div className="p-2 bg-white rounded">
                          <p className="text-xs text-gray-500">Fat</p>
                          <p className="font-semibold">{selectedRecipe.nutrition?.fat || 0}g</p>
                        </div>
                        <div className="p-2 bg-white rounded">
                          <p className="text-xs text-gray-500">Fiber</p>
                          <p className="font-semibold">{selectedRecipe.nutrition?.fiber || 0}g</p>
                        </div>
                        <div className="p-2 bg-white rounded">
                          <p className="text-xs text-gray-500">Sugar</p>
                          <p className="font-semibold">{selectedRecipe.nutrition?.sugar || 0}g</p>
                        </div>
                        <div className="p-2 bg-white rounded">
                          <p className="text-xs text-gray-500">Sodium</p>
                          <p className="font-semibold">{selectedRecipe.nutrition?.sodium || 0}mg</p>
                        </div>
                      </div>

                      {/* Nutrition Bar Chart */}
                      <div className="mt-4 bg-white p-3 rounded">
                        <BarChart
                          data={{
                            labels: ['Protein', 'Carbs', 'Fat', 'Fiber'],
                            datasets: [{
                              label: 'Grams',
                              data: [
                                selectedRecipe.nutrition?.protein || 0,
                                selectedRecipe.nutrition?.carbs || 0,
                                selectedRecipe.nutrition?.fat || 0,
                                selectedRecipe.nutrition?.fiber || 0
                              ],
                              backgroundColor: [
                                'rgba(239, 68, 68, 0.8)',
                                'rgba(59, 130, 246, 0.8)',
                                'rgba(245, 158, 11, 0.8)',
                                'rgba(34, 197, 94, 0.8)'
                              ]
                            }]
                          }}
                          options={{
                            plugins: {
                              legend: { display: false },
                              title: {
                                display: true,
                                text: 'Nutritional Content',
                                font: { size: 12 }
                              }
                            },
                            scales: {
                              y: {
                                beginAtZero: true,
                                title: {
                                  display: true,
                                  text: 'Grams'
                                }
                              }
                            }
                          }}
                        />
                      </div>
                    </div>

                    {/* Dietary Info Tags */}
                    {selectedRecipe.dietaryInfo && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {selectedRecipe.dietaryInfo.isVegetarian && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            🌱 Vegetarian
                          </span>
                        )}
                        {selectedRecipe.dietaryInfo.isVegan && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            🌿 Vegan
                          </span>
                        )}
                        {selectedRecipe.dietaryInfo.isGlutenFree && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            🌾 Gluten-Free
                          </span>
                        )}
                        {selectedRecipe.dietaryInfo.isDairyFree && (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                            🥛 Dairy-Free
                          </span>
                        )}
                        {selectedRecipe.dietaryInfo.isHighProtein && (
                          <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                            💪 High Protein
                          </span>
                        )}
                        {selectedRecipe.dietaryInfo.allergens?.map((allergen, idx) => (
                          <span key={idx} className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                            ⚠️ Contains {allergen}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}