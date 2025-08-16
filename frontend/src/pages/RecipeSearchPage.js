import React, { useState, useEffect } from 'react';
import { Search, Filter, Clock, ChefHat, Plus, AlertCircle, Flame, X, Users, BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { DoughnutChart, BarChart } from '../components/Charts';

export default function RecipeSearchPage() {
  const { token } = useAuth();
  const [recipes, setRecipes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    dietary: [],
    allergies: [],
    maxCalories: '',
    maxTime: '',
    cuisine: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [showGenerate, setShowGenerate] = useState(false);
  const [showSubstitute, setShowSubstitute] = useState(false);
  const [substituteIngredient, setSubstituteIngredient] = useState('');
  const [userPreferences, setUserPreferences] = useState(null);

  // Fetch user preferences and initial recipes on mount
  useEffect(() => {
    fetchUserPreferences();
    performSearch(); // Load initial recipes
  }, []);

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
      } else if (!searchQuery) {
        // Only show message if no recipes and no search query
        setRecipes([]); // Clear recipes
      }
    } catch (error) {
      setError(error.message || 'Failed to search recipes. Please try again.');
      console.error('Search error:', error);
      setRecipes([]); // Clear recipes on error
    } finally {
      setLoading(false);
    }
  };

  const generateCustomRecipe = async () => {
    if (!token) {
      setError('Please login to generate custom recipes');
      return;
    }
    
    setLoading(true);
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
            mealType: 'dinner',
            cuisine: filters.cuisine || 'international',
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
        setRecipes([data.recipe, ...recipes]);
        setSelectedRecipe(data.recipe);
        setError('');
      }
    } catch (error) {
      setError(error.message || 'Failed to generate custom recipe. Please try again.');
      console.error('Generation error:', error);
    } finally {
      setLoading(false);
      setShowGenerate(false);
    }
  };

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
      alert('Could not find suitable substitutes. Try a different ingredient.');
    } finally {
      setShowSubstitute(false);
      setSubstituteIngredient('');
    }
  };

  const adjustServings = async (recipeId, newServings) => {
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
      } else {
        // For mock recipes, adjust locally
        const adjustedRecipe = {
          ...selectedRecipe,
          servings: newServings,
          ingredients: selectedRecipe.ingredients.map(ing => ({
            ...ing,
            quantity: Math.round((ing.quantity * newServings / selectedRecipe.servings) * 10) / 10
          })),
          nutrition: {
            calories: Math.round(selectedRecipe.nutrition.calories * newServings / selectedRecipe.servings),
            protein: Math.round(selectedRecipe.nutrition.protein * newServings / selectedRecipe.servings),
            carbs: Math.round(selectedRecipe.nutrition.carbs * newServings / selectedRecipe.servings),
            fat: Math.round(selectedRecipe.nutrition.fat * newServings / selectedRecipe.servings),
            fiber: Math.round((selectedRecipe.nutrition.fiber || 0) * newServings / selectedRecipe.servings),
            sugar: Math.round((selectedRecipe.nutrition.sugar || 0) * newServings / selectedRecipe.servings),
            sodium: Math.round((selectedRecipe.nutrition.sodium || 0) * newServings / selectedRecipe.servings)
          }
        };
        setSelectedRecipe(adjustedRecipe);
      }
    } catch (error) {
      console.error('Adjust servings error:', error);
      // Silently fail and adjust locally
      const adjustedRecipe = {
        ...selectedRecipe,
        servings: newServings,
        ingredients: selectedRecipe.ingredients.map(ing => ({
          ...ing,
          quantity: Math.round((ing.quantity * newServings / selectedRecipe.servings) * 10) / 10
        }))
      };
      setSelectedRecipe(adjustedRecipe);
    }
  };

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

  const getDifficultyColor = (difficulty) => {
    const colors = {
      easy: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      hard: 'bg-red-100 text-red-800',
      expert: 'bg-purple-100 text-purple-800'
    };
    return colors[difficulty] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Recipe Search</h1>
          <p className="mt-2 text-gray-600">
            Discover delicious recipes with detailed nutrition information
          </p>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex gap-2">
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
            
            {token && (
              <button
                onClick={generateCustomRecipe}
                disabled={loading}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center"
              >
                <Plus className="h-5 w-5 mr-2" />
                Generate Recipe
              </button>
            )}
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-4 p-4 border-t">
              <div className="grid md:grid-cols-4 gap-4">
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
                    <option value="">Any</option>
                    <option value="italian">Italian</option>
                    <option value="mexican">Mexican</option>
                    <option value="chinese">Chinese</option>
                    <option value="indian">Indian</option>
                    <option value="thai">Thai</option>
                    <option value="mediterranean">Mediterranean</option>
                    <option value="american">American</option>
                  </select>
                </div>
                
                <button
                  onClick={() => {
                    setFilters({
                      dietary: userPreferences?.dietaryPreferences || [],
                      maxCalories: '',
                      maxTime: '',
                      cuisine: '',
                      allergies: userPreferences?.allergies || []
                    });
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {/* Recipe Results */}
        {!loading && recipes.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recipes.map((recipe, index) => (
              <div 
                key={recipe._id || index}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedRecipe(recipe)}
              >
                {recipe.image && (
                  <img 
                    src={recipe.image} 
                    alt={recipe.title}
                    className="w-full h-48 object-cover rounded-t-lg"
                  />
                )}
                
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
                    <p className="text-gray-600 text-sm mb-3">{recipe.description}</p>
                  )}

                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {recipe.cookingTime} min
                    </div>
                    <div className="flex items-center">
                      <Flame className="h-4 w-4 mr-1" />
                      {recipe.nutrition?.calories || 0} cal
                    </div>
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-1" />
                      {recipe.servings || 2} servings
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {recipe.cuisine && (
                      <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                        {recipe.cuisine}
                      </span>
                    )}
                    
                    {recipe.difficulty && (
                      <span className={`inline-block px-2 py-1 text-xs rounded ${getDifficultyColor(recipe.difficulty)}`}>
                        {recipe.difficulty}
                      </span>
                    )}
                    
                    {recipe.mealType && (
                      <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                        {recipe.mealType}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && recipes.length === 0 && !error && (
          <div className="text-center py-12">
            <ChefHat className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No recipes found</h3>
            <p className="text-gray-600">
              {searchQuery 
                ? `No recipes match "${searchQuery}". Try different keywords or adjust filters.`
                : 'Start by searching for a recipe or ingredient above.'}
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

        {/* Recipe Detail Modal */}
        {selectedRecipe && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">{selectedRecipe.title}</h2>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {selectedRecipe.cookingTime} min
                      </div>
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        {selectedRecipe.servings || 2} servings
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

                {selectedRecipe.description && (
                  <p className="text-gray-600 mb-6">{selectedRecipe.description}</p>
                )}

                <div className="grid md:grid-cols-3 gap-6">
                  {/* Left Column - Ingredients */}
                  <div className="md:col-span-1">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h3 className="font-semibold mb-3 flex items-center">
                        <BookOpen className="h-5 w-5 mr-2" />
                        Ingredients
                      </h3>
                      
                      {/* Servings Adjuster */}
                      <div className="mb-4 p-3 bg-white rounded">
                        <label className="block text-xs font-medium text-gray-600 mb-2">
                          Adjust Servings
                        </label>
                        <div className="flex items-center justify-center gap-3">
                          <button
                            onClick={() => adjustServings(selectedRecipe._id, Math.max(1, (selectedRecipe.servings || 2) - 1))}
                            className="w-8 h-8 bg-gray-200 rounded hover:bg-gray-300 font-medium"
                          >
                            −
                          </button>
                          <span className="px-4 py-1 bg-gray-100 rounded min-w-[40px] text-center">
                            {selectedRecipe.servings || 2}
                          </span>
                          <button
                            onClick={() => adjustServings(selectedRecipe._id, (selectedRecipe.servings || 2) + 1)}
                            className="w-8 h-8 bg-gray-200 rounded hover:bg-gray-300 font-medium"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {selectedRecipe.ingredients?.map((ing, idx) => (
                          <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
                            <span className="text-sm">
                              <span className="font-medium">{ing.quantity}</span> {ing.unit} {ing.name}
                              {ing.notes && (
                                <span className="text-gray-500 text-xs block">{ing.notes}</span>
                              )}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                substituteIngredientRequest(selectedRecipe._id, ing.name);
                              }}
                              className="text-blue-600 hover:text-blue-700 text-xs"
                            >
                              Substitute
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Middle Column - Instructions */}
                  <div className="md:col-span-1">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h3 className="font-semibold mb-3 flex items-center">
                        <ChefHat className="h-5 w-5 mr-2" />
                        Step-by-Step Instructions
                      </h3>
                      <ol className="space-y-3">
                        {selectedRecipe.instructions?.map((step, idx) => (
                          <li key={idx} className="flex">
                            <span className="flex-shrink-0 w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium mr-3">
                              {idx + 1}
                            </span>
                            <span className="text-sm text-gray-700 pt-1">{step}</span>
                          </li>
                        ))}
                      </ol>

                      {/* Tips Section */}
                      {selectedRecipe.tips && selectedRecipe.tips.length > 0 && (
                        <div className="mt-4 p-3 bg-yellow-50 rounded">
                          <p className="font-medium text-sm mb-2">💡 Tips</p>
                          <ul className="text-xs text-gray-600 space-y-1">
                            {selectedRecipe.tips.map((tip, idx) => (
                              <li key={idx}>• {tip}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column - Nutrition */}
                  <div className="md:col-span-1">
                    <div className="bg-green-50 rounded-lg p-4">
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

                      {/* Macro Chart */}
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
                            scales: {
                              y: {
                                beginAtZero: true,
                                title: {
                                  display: true,
                                  text: 'Grams',
                                  font: { size: 10 }
                                }
                              }
                            },
                            plugins: {
                              legend: { display: false },
                              title: {
                                display: true,
                                text: 'Macronutrient Distribution',
                                font: { size: 12 }
                              }
                            },
                            maintainAspectRatio: true
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Variations Section at Bottom */}
                {selectedRecipe.variations && selectedRecipe.variations.length > 0 && (
                  <div className="mt-6 p-4 bg-purple-50 rounded-lg">
                    <h3 className="font-semibold mb-3">Recipe Variations</h3>
                    <div className="grid md:grid-cols-3 gap-3">
                      {selectedRecipe.variations.map((variation, idx) => (
                        <div key={idx} className="p-3 bg-white rounded">
                          <p className="font-medium text-sm">{variation.name}</p>
                          <p className="text-xs text-gray-600 mt-1">{variation.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dietary Info */}
                {selectedRecipe.dietaryInfo && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedRecipe.dietaryInfo.isVegetarian && (
                      <span className="px-3 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        🌱 Vegetarian
                      </span>
                    )}
                    {selectedRecipe.dietaryInfo.isVegan && (
                      <span className="px-3 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        🌿 Vegan
                      </span>
                    )}
                    {selectedRecipe.dietaryInfo.isGlutenFree && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        🌾 Gluten-Free
                      </span>
                    )}
                    {selectedRecipe.dietaryInfo.isDairyFree && (
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                        🥛 Dairy-Free
                      </span>
                    )}
                    {selectedRecipe.dietaryInfo.isHighProtein && (
                      <span className="px-3 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                        💪 High Protein
                      </span>
                    )}
                    {selectedRecipe.dietaryInfo.allergens?.map((allergen, idx) => (
                      <span key={idx} className="px-3 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                        ⚠️ Contains {allergen}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}