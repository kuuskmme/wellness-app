
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Clock, Flame, ChefHat, Plus, RefreshCw, Zap, Edit3 } from 'lucide-react';
import { DoughnutChart } from '../components/Charts';

const RecipeSearchPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    dietary: [],
    cuisine: [],
    maxCalories: '',
    maxTime: '',
    allergies: []
  });
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [showSubstitute, setShowSubstitute] = useState(false);
  const [substituteIngredient, setSubstituteIngredient] = useState('');
  const [substitutions, setSubstitutions] = useState(null);
  const [userPreferences, setUserPreferences] = useState(null);
  
  // Generation form
  const [generateForm, setGenerateForm] = useState({
    mealType: 'lunch',
    cuisine: 'any',
    maxCalories: '',
    maxTime: '30',
    mainIngredients: '',
    servings: 2
  });

  const dietaryOptions = [
    'vegetarian', 'vegan', 'gluten_free', 'dairy_free', 
    'keto', 'paleo', 'low_carb', 'high_protein'
  ];

  const cuisineOptions = [
    'italian', 'mexican', 'chinese', 'japanese', 'indian',
    'thai', 'greek', 'french', 'american', 'mediterranean'
  ];

  useEffect(() => {
    fetchUserPreferences();
    performSearch();
  }, []);

  const fetchUserPreferences = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/nutrition/preferences', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserPreferences(data.preferences);
        
        // Pre-populate filters with user preferences
        setFilters(prev => ({
          ...prev,
          dietary: data.preferences.dietaryPreferences || [],
          allergies: data.preferences.allergies || []
        }));
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    }
  };

  const performSearch = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      if (searchQuery) params.append('query', searchQuery);
      if (filters.dietary.length > 0) params.append('dietary', filters.dietary.join(','));
      if (filters.cuisine.length > 0) params.append('cuisine', filters.cuisine.join(','));
      if (filters.maxCalories) params.append('maxCalories', filters.maxCalories);
      if (filters.maxTime) params.append('maxTime', filters.maxTime);
      if (filters.allergies.length > 0) params.append('allergies', filters.allergies.join(','));

      const response = await fetch(`http://localhost:5000/api/nutrition/recipes/search?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        setRecipes(data.recipes);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateCustomRecipe = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/nutrition/recipes/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...generateForm,
          mainIngredients: generateForm.mainIngredients.split(',').map(i => i.trim()).filter(i => i)
        })
      });

      if (response.ok) {
        const data = await response.json();
        setRecipes([data.recipe, ...recipes]);
        setShowGenerate(false);
        alert('Custom recipe generated successfully!');
      }
    } catch (error) {
      console.error('Generation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSubstitutions = async () => {
    if (!substituteIngredient) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/nutrition/recipes/substitute', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ingredient: substituteIngredient,
          reason: 'dietary preference'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSubstitutions(data.substitutions);
      }
    } catch (error) {
      console.error('Substitution error:', error);
    } finally {
      setLoading(false);
    }
  };

  const adjustServings = async (recipeId, newServings) => {
    try {
      const response = await fetch(`http://localhost:5000/api/nutrition/recipes/${recipeId}/adjust`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ servings: newServings })
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedRecipe(data.recipe);
      }
    } catch (error) {
      console.error('Adjust servings error:', error);
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
      hard: 'bg-red-100 text-red-800'
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
            AI-powered recipe search with personalized recommendations
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
              {loading ? <RefreshCw className="h-5 w-5 animate-spin" /> : 'Search'}
            </button>
            
            <button
              onClick={() => setShowGenerate(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
            >
              <Zap className="h-5 w-5 mr-2" />
              Generate
            </button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t">
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dietary Preferences
                  </label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {dietaryOptions.map(option => (
                      <label key={option} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={filters.dietary.includes(option)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFilters(prev => ({
                                ...prev,
                                dietary: [...prev.dietary, option]
                              }));
                            } else {
                              setFilters(prev => ({
                                ...prev,
                                dietary: prev.dietary.filter(d => d !== option)
                              }));
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm capitalize">{option.replace('_', ' ')}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cuisine
                  </label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {cuisineOptions.map(cuisine => (
                      <label key={cuisine} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={filters.cuisine.includes(cuisine)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFilters(prev => ({
                                ...prev,
                                cuisine: [...prev.cuisine, cuisine]
                              }));
                            } else {
                              setFilters(prev => ({
                                ...prev,
                                cuisine: prev.cuisine.filter(c => c !== cuisine)
                              }));
                            }
                          }}
                          className="mr-2"
                        />
                        <span className="text-sm capitalize">{cuisine}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Calories
                  </label>
                  <input
                    type="number"
                    value={filters.maxCalories}
                    onChange={(e) => setFilters(prev => ({ ...prev, maxCalories: e.target.value }))}
                    placeholder="e.g., 500"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Time (minutes)
                  </label>
                  <input
                    type="number"
                    value={filters.maxTime}
                    onChange={(e) => setFilters(prev => ({ ...prev, maxTime: e.target.value }))}
                    placeholder="e.g., 30"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => {
                    setFilters({
                      dietary: userPreferences?.dietaryPreferences || [],
                      cuisine: [],
                      maxCalories: '',
                      maxTime: '',
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

        {/* Recipe Results */}
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
                    <ChefHat className="h-4 w-4 mr-1" />
                    {recipe.servings || 2} servings
                  </div>
                </div>

                {recipe.cuisine && (
                  <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded mr-2">
                    {recipe.cuisine}
                  </span>
                )}
                
                {recipe.difficulty && (
                  <span className={`inline-block px-2 py-1 text-xs rounded ${getDifficultyColor(recipe.difficulty)}`}>
                    {recipe.difficulty}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {!loading && recipes.length === 0 && (
          <div className="text-center py-12">
            <ChefHat className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No recipes found</h3>
            <p className="text-gray-600">Try adjusting your search or filters</p>
          </div>
        )}

        {/* Recipe Detail Modal */}
        {selectedRecipe && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-2xl font-bold">{selectedRecipe.title}</h2>
                  <button
                    onClick={() => setSelectedRecipe(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Left Column - Recipe Details */}
                  <div>
                    <h3 className="font-semibold mb-3">Ingredients</h3>
                    <div className="space-y-2 mb-6">
                      {selectedRecipe.ingredients?.map((ing, idx) => (
                        <div key={idx} className="flex justify-between items-center">
                          <span className="text-sm">
                            {ing.quantity} {ing.unit} {ing.name}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSubstituteIngredient(ing.name);
                              setShowSubstitute(true);
                            }}
                            className="text-blue-600 hover:text-blue-700 text-xs"
                          >
                            Substitute
                          </button>
                        </div>
                      ))}
                    </div>

                    <h3 className="font-semibold mb-3">Instructions</h3>
                    <ol className="list-decimal list-inside space-y-2">
                      {selectedRecipe.instructions?.map((step, idx) => (
                        <li key={idx} className="text-sm text-gray-700">{step}</li>
                      ))}
                    </ol>

                    {/* Servings Adjuster */}
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                      <label className="block text-sm font-medium mb-2">
                        Adjust Servings
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => adjustServings(selectedRecipe._id, Math.max(1, (selectedRecipe.servings || 2) - 1))}
                          className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                        >
                          -
                        </button>
                        <span className="px-4 py-1 bg-white rounded">
                          {selectedRecipe.servings || 2}
                        </span>
                        <button
                          onClick={() => adjustServings(selectedRecipe._id, (selectedRecipe.servings || 2) + 1)}
                          className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Nutrition */}
                  <div>
                    <h3 className="font-semibold mb-3">Nutrition per Serving</h3>
                    
                    {/* Macro Chart */}
                    {selectedRecipe.nutrition && (
                      <div className="mb-6">
                        <DoughnutChart
                          data={prepareMacroChartData(selectedRecipe.nutrition)}
                          options={{
                            plugins: {
                              legend: {
                                position: 'bottom'
                              }
                            }
                          }}
                        />
                      </div>
                    )}

                    {/* Nutrition Details */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-gray-50 rounded">
                        <p className="text-xs text-gray-500">Calories</p>
                        <p className="text-lg font-semibold">{selectedRecipe.nutrition?.calories || 0}</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded">
                        <p className="text-xs text-gray-500">Protein</p>
                        <p className="text-lg font-semibold">{selectedRecipe.nutrition?.protein || 0}g</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded">
                        <p className="text-xs text-gray-500">Carbs</p>
                        <p className="text-lg font-semibold">{selectedRecipe.nutrition?.carbs || 0}g</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded">
                        <p className="text-xs text-gray-500">Fat</p>
                        <p className="text-lg font-semibold">{selectedRecipe.nutrition?.fat || 0}g</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded">
                        <p className="text-xs text-gray-500">Fiber</p>
                        <p className="text-lg font-semibold">{selectedRecipe.nutrition?.fiber || 0}g</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded">
                        <p className="text-xs text-gray-500">Sodium</p>
                        <p className="text-lg font-semibold">{selectedRecipe.nutrition?.sodium || 0}mg</p>
                      </div>
                    </div>

                    {/* Variations */}
                    {selectedRecipe.variations && selectedRecipe.variations.length > 0 && (
                      <div className="mt-6">
                        <h3 className="font-semibold mb-3">Variations</h3>
                        <div className="space-y-2">
                          {selectedRecipe.variations.map((variation, idx) => (
                            <div key={idx} className="p-3 bg-blue-50 rounded">
                              <p className="font-medium text-sm">{variation.name}</p>
                              <p className="text-xs text-gray-600">{variation.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Generate Recipe Modal */}
        {showGenerate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold mb-4">Generate Custom Recipe</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Meal Type</label>
                  <select
                    value={generateForm.mealType}
                    onChange={(e) => setGenerateForm(prev => ({ ...prev, mealType: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                    <option value="snack">Snack</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Cuisine</label>
                  <select
                    value={generateForm.cuisine}
                    onChange={(e) => setGenerateForm(prev => ({ ...prev, cuisine: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="any">Any</option>
                    {cuisineOptions.map(c => (
                      <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Main Ingredients (comma-separated)</label>
                  <input
                    type="text"
                    value={generateForm.mainIngredients}
                    onChange={(e) => setGenerateForm(prev => ({ ...prev, mainIngredients: e.target.value }))}
                    placeholder="e.g., chicken, rice, vegetables"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Max Calories</label>
                    <input
                      type="number"
                      value={generateForm.maxCalories}
                      onChange={(e) => setGenerateForm(prev => ({ ...prev, maxCalories: e.target.value }))}
                      placeholder="500"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Max Time (min)</label>
                    <input
                      type="number"
                      value={generateForm.maxTime}
                      onChange={(e) => setGenerateForm(prev => ({ ...prev, maxTime: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Servings</label>
                  <input
                    type="number"
                    value={generateForm.servings}
                    onChange={(e) => setGenerateForm(prev => ({ ...prev, servings: parseInt(e.target.value) }))}
                    min="1"
                    max="10"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowGenerate(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={generateCustomRecipe}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Generating...' : 'Generate Recipe'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Substitution Modal */}
        {showSubstitute && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold mb-4">Find Substitutions</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Ingredient to substitute</label>
                <input
                  type="text"
                  value={substituteIngredient}
                  onChange={(e) => setSubstituteIngredient(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              {substitutions && (
                <div className="space-y-3 mb-4">
                  <h4 className="font-medium">Suggested Substitutions:</h4>
                  {substitutions.substitutions?.map((sub, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{sub.ingredient}</p>
                          <p className="text-sm text-gray-600">Ratio: {sub.ratio}</p>
                          <p className="text-xs text-gray-500 mt-1">{sub.notes}</p>
                        </div>
                        {sub.recommended && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                            Recommended
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowSubstitute(false);
                    setSubstitutions(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={getSubstitutions}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Finding...' : 'Find Substitutions'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecipeSearchPage;