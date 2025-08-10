// pages/NutritionPreferencesPage.js - Fixed Nutrition Preferences Page
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import moment from 'moment-timezone';

const NutritionPreferencesPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState('dietary');
  const [completion, setCompletion] = useState(0);
  const [healthProfileData, setHealthProfileData] = useState(null);
  
  const [preferences, setPreferences] = useState({
    dietaryPreferences: [],
    allergies: [],
    dislikedIngredients: [],
    cuisinePreferences: [],
    nutritionalTargets: {
      dailyCalories: 2000,
      macros: {
        protein: { grams: 50, percentage: 25 },
        carbs: { grams: 250, percentage: 50 },
        fat: { grams: 65, percentage: 25 }
      }
    },
    mealPreferences: {
      mealsPerDay: 3,
      mealTiming: {
        breakfast: '08:00',
        lunch: '12:30',
        dinner: '19:00',
        snacks: []
      },
      mealStructure: {
        includeBreakfast: true,
        includeLunch: true,
        includeDinner: true,
        includeSnacks: true,
        snacksPerDay: 2
      },
      portionSize: 'medium'
    },
    cookingPreferences: {
      skillLevel: 'intermediate',
      maxCookingTime: 30,
      preferredMethods: [],
      kitchenEquipment: []
    },
    budgetPreferences: {
      weeklyBudget: 100,
      currency: 'USD',
      prioritizeBudget: false
    },
    location: {
      timezone: moment.tz.guess(),
      measurementSystem: 'metric'
    },
    healthProfileLink: {
      syncEnabled: true
    }
  });

  // Dietary options
  const dietaryOptions = [
    { value: 'none', label: 'No Restrictions', emoji: '🍴' },
    { value: 'vegetarian', label: 'Vegetarian', emoji: '🥬' },
    { value: 'vegan', label: 'Vegan', emoji: '🌱' },
    { value: 'pescatarian', label: 'Pescatarian', emoji: '🐟' },
    { value: 'keto', label: 'Keto', emoji: '🥑' },
    { value: 'paleo', label: 'Paleo', emoji: '🍖' },
    { value: 'mediterranean', label: 'Mediterranean', emoji: '🫒' },
    { value: 'gluten_free', label: 'Gluten-Free', emoji: '🌾' },
    { value: 'dairy_free', label: 'Dairy-Free', emoji: '🥛' },
    { value: 'low_carb', label: 'Low Carb', emoji: '🍞' },
    { value: 'low_fat', label: 'Low Fat', emoji: '🧈' },
    { value: 'high_protein', label: 'High Protein', emoji: '💪' },
    { value: 'whole30', label: 'Whole30', emoji: '🥗' },
    { value: 'diabetic_friendly', label: 'Diabetic Friendly', emoji: '🩺' },
    { value: 'fodmap', label: 'Low FODMAP', emoji: '🌿' },
    { value: 'halal', label: 'Halal', emoji: '☪️' },
    { value: 'kosher', label: 'Kosher', emoji: '✡️' },
    { value: 'intermittent_fasting', label: 'Intermittent Fasting', emoji: '⏰' }
  ];

  // Allergy options
  const allergyOptions = [
    { value: 'none', label: 'No Allergies', emoji: '✅' },
    { value: 'nuts', label: 'Tree Nuts', emoji: '🥜' },
    { value: 'peanuts', label: 'Peanuts', emoji: '🥜' },
    { value: 'gluten', label: 'Gluten', emoji: '🌾' },
    { value: 'dairy', label: 'Dairy', emoji: '🥛' },
    { value: 'eggs', label: 'Eggs', emoji: '🥚' },
    { value: 'soy', label: 'Soy', emoji: '🌱' },
    { value: 'shellfish', label: 'Shellfish', emoji: '🦐' },
    { value: 'fish', label: 'Fish', emoji: '🐟' },
    { value: 'sesame', label: 'Sesame', emoji: '🌰' },
    { value: 'wheat', label: 'Wheat', emoji: '🌾' },
    { value: 'corn', label: 'Corn', emoji: '🌽' },
    { value: 'sulfites', label: 'Sulfites', emoji: '🍷' },
    { value: 'nightshades', label: 'Nightshades', emoji: '🍅' }
  ];

  const cuisineOptions = [
    'any', 'italian', 'mexican', 'chinese', 'japanese', 'indian',
    'thai', 'greek', 'french', 'spanish', 'american', 'mediterranean',
    'middle_eastern', 'korean', 'vietnamese', 'caribbean'
  ];

  const cookingMethods = [
    'baking', 'grilling', 'frying', 'steaming', 'boiling',
    'roasting', 'slow_cooking', 'pressure_cooking', 'raw', 'microwave'
  ];

  const kitchenEquipment = [
    'oven', 'stovetop', 'microwave', 'slow_cooker', 'pressure_cooker',
    'air_fryer', 'grill', 'blender', 'food_processor', 'instant_pot'
  ];

  // Fetch existing preferences on mount
  useEffect(() => {
    fetchPreferences();
    fetchHealthProfile();
  }, []);

  const fetchPreferences = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch('http://localhost:5000/api/nutrition/preferences', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.preferences) {
          setPreferences(data.preferences);
          setCompletion(data.completion || 0);
        }
      } else if (response.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('token');
        navigate('/login');
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
      setError('Failed to load preferences');
    }
  };

  const fetchHealthProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/health-profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setHealthProfileData(data);
      }
    } catch (error) {
      console.error('Error fetching health profile:', error);
    }
  };

  const syncWithHealthProfile = async () => {
    setIsSyncing(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/nutrition/preferences/sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPreferences(data.preferences);
        setSuccessMessage('✅ Synced with health profile!');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (error) {
      console.error('Sync error:', error);
      setError('Failed to sync with health profile');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleArrayToggle = (field, value) => {
    setPreferences(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(item => item !== value)
        : [...prev[field], value]
    }));
  };

  const handleNestedChange = (section, field, value) => {
    setPreferences(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleDeepNestedChange = (section, subsection, field, value) => {
    setPreferences(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [subsection]: {
          ...prev[section][subsection],
          [field]: value
        }
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setIsLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch('http://localhost:5000/api/nutrition/preferences', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(preferences)
      });
      
      if (response.ok) {
        const data = await response.json();
        setSuccessMessage('✅ Preferences saved successfully!');
        setCompletion(data.completion || 0);
        
        setTimeout(() => {
          navigate('/nutrition/meal-planner');
        }, 2000);
      } else if (response.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to save preferences');
      }
    } catch (error) {
      console.error('Save error:', error);
      setError('Failed to save preferences');
    } finally {
      setIsLoading(false);
    }
  };

  const sections = [
    { id: 'dietary', name: 'Dietary', icon: '🥗' },
    { id: 'allergies', name: 'Allergies', icon: '⚠️' },
    { id: 'nutrition', name: 'Nutrition', icon: '📊' },
    { id: 'meals', name: 'Meals', icon: '🍽️' },
    { id: 'cooking', name: 'Cooking', icon: '👨‍🍳' },
    { id: 'budget', name: 'Budget', icon: '💰' }
  ];

  const renderSection = () => {
    switch (activeSection) {
      case 'dietary':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold mb-4">Dietary Preferences</h3>
            
            {healthProfileData?.dietaryPreferences?.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  📋 Pre-filled from your health profile. Confirm or modify as needed.
                </p>
              </div>
            )}
            
            <div className="grid md:grid-cols-3 gap-3">
              {dietaryOptions.map(option => (
                <label
                  key={option.value}
                  className={`flex items-center p-3 border rounded-lg cursor-pointer transition ${
                    preferences.dietaryPreferences.includes(option.value)
                      ? 'bg-blue-50 border-blue-500'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={preferences.dietaryPreferences.includes(option.value)}
                    onChange={() => handleArrayToggle('dietaryPreferences', option.value)}
                    className="mr-2"
                  />
                  <span className="text-2xl mr-2">{option.emoji}</span>
                  <span className="text-sm font-medium">{option.label}</span>
                </label>
              ))}
            </div>

            <div>
              <h4 className="font-semibold mb-3">Cuisine Preferences</h4>
              <div className="grid md:grid-cols-4 gap-2">
                {cuisineOptions.map(cuisine => (
                  <label key={cuisine} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={preferences.cuisinePreferences.includes(cuisine)}
                      onChange={() => handleArrayToggle('cuisinePreferences', cuisine)}
                      className="mr-2"
                    />
                    <span className="capitalize text-sm">{cuisine.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        );

      case 'allergies':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold mb-4">Allergies & Intolerances</h3>
            
            <div className="grid md:grid-cols-2 gap-3">
              {allergyOptions.map(option => (
                <label
                  key={option.value}
                  className={`flex items-center p-3 border rounded-lg cursor-pointer transition ${
                    preferences.allergies.includes(option.value)
                      ? 'bg-red-50 border-red-500'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={preferences.allergies.includes(option.value)}
                    onChange={() => handleArrayToggle('allergies', option.value)}
                    className="mr-2"
                  />
                  <span className="text-2xl mr-2">{option.emoji}</span>
                  <span className="text-sm font-medium">{option.label}</span>
                </label>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Disliked Ingredients (comma-separated)
              </label>
              <textarea
                value={preferences.dislikedIngredients.join(', ')}
                onChange={(e) => setPreferences(prev => ({
                  ...prev,
                  dislikedIngredients: e.target.value.split(',').map(i => i.trim()).filter(i => i)
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., mushrooms, olives, anchovies"
                rows="3"
              />
            </div>
          </div>
        );

      case 'nutrition':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold mb-4">Nutritional Targets</h3>
            
            {healthProfileData && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-green-800 mb-2">
                  📊 Calculated from your health profile
                </p>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium mb-2">
                Daily Calorie Target
              </label>
              <input
                type="number"
                value={preferences.nutritionalTargets.dailyCalories}
                onChange={(e) => handleNestedChange('nutritionalTargets', 'dailyCalories', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1000"
                max="5000"
                step="100"
              />
              <p className="text-xs text-gray-500 mt-1">
                Recommended: {healthProfileData?.recommendedCalories || 2000} calories
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Protein (g)
                </label>
                <input
                  type="number"
                  value={preferences.nutritionalTargets.macros.protein.grams}
                  onChange={(e) => handleDeepNestedChange('nutritionalTargets', 'macros', 'protein', {
                    ...preferences.nutritionalTargets.macros.protein,
                    grams: parseInt(e.target.value)
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  max="300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Carbs (g)
                </label>
                <input
                  type="number"
                  value={preferences.nutritionalTargets.macros.carbs.grams}
                  onChange={(e) => handleDeepNestedChange('nutritionalTargets', 'macros', 'carbs', {
                    ...preferences.nutritionalTargets.macros.carbs,
                    grams: parseInt(e.target.value)
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  max="500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Fat (g)
                </label>
                <input
                  type="number"
                  value={preferences.nutritionalTargets.macros.fat.grams}
                  onChange={(e) => handleDeepNestedChange('nutritionalTargets', 'macros', 'fat', {
                    ...preferences.nutritionalTargets.macros.fat,
                    grams: parseInt(e.target.value)
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  max="200"
                />
              </div>
            </div>
          </div>
        );

      case 'meals':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold mb-4">Meal Preferences</h3>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Meals Per Day
                </label>
                <select
                  value={preferences.mealPreferences.mealsPerDay}
                  onChange={(e) => handleNestedChange('mealPreferences', 'mealsPerDay', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {[1, 2, 3, 4, 5, 6].map(num => (
                    <option key={num} value={num}>{num} meals</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Portion Size
                </label>
                <select
                  value={preferences.mealPreferences.portionSize}
                  onChange={(e) => handleNestedChange('mealPreferences', 'portionSize', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                  <option value="extra_large">Extra Large</option>
                </select>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Meal Timing</h4>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Breakfast
                  </label>
                  <input
                    type="time"
                    value={preferences.mealPreferences.mealTiming.breakfast}
                    onChange={(e) => setPreferences(prev => ({
                      ...prev,
                      mealPreferences: {
                        ...prev.mealPreferences,
                        mealTiming: {
                          ...prev.mealPreferences.mealTiming,
                          breakfast: e.target.value
                        }
                      }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Lunch
                  </label>
                  <input
                    type="time"
                    value={preferences.mealPreferences.mealTiming.lunch}
                    onChange={(e) => setPreferences(prev => ({
                      ...prev,
                      mealPreferences: {
                        ...prev.mealPreferences,
                        mealTiming: {
                          ...prev.mealPreferences.mealTiming,
                          lunch: e.target.value
                        }
                      }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Dinner
                  </label>
                  <input
                    type="time"
                    value={preferences.mealPreferences.mealTiming.dinner}
                    onChange={(e) => setPreferences(prev => ({
                      ...prev,
                      mealPreferences: {
                        ...prev.mealPreferences,
                        mealTiming: {
                          ...prev.mealPreferences.mealTiming,
                          dinner: e.target.value
                        }
                      }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 'cooking':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold mb-4">Cooking Preferences</h3>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Skill Level
                </label>
                <select
                  value={preferences.cookingPreferences.skillLevel}
                  onChange={(e) => handleNestedChange('cookingPreferences', 'skillLevel', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="expert">Expert</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Max Cooking Time (minutes)
                </label>
                <input
                  type="number"
                  value={preferences.cookingPreferences.maxCookingTime}
                  onChange={(e) => handleNestedChange('cookingPreferences', 'maxCookingTime', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="5"
                  max="180"
                />
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Kitchen Equipment</h4>
              <div className="grid md:grid-cols-3 gap-2">
                {kitchenEquipment.map(equipment => (
                  <label key={equipment} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={preferences.cookingPreferences.kitchenEquipment?.includes(equipment)}
                      onChange={() => {
                        const current = preferences.cookingPreferences.kitchenEquipment || [];
                        setPreferences(prev => ({
                          ...prev,
                          cookingPreferences: {
                            ...prev.cookingPreferences,
                            kitchenEquipment: current.includes(equipment)
                              ? current.filter(e => e !== equipment)
                              : [...current, equipment]
                          }
                        }));
                      }}
                      className="mr-2"
                    />
                    <span className="capitalize text-sm">{equipment.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        );

      case 'budget':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold mb-4">Budget Preferences</h3>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Weekly Budget
                </label>
                <input
                  type="number"
                  value={preferences.budgetPreferences.weeklyBudget}
                  onChange={(e) => handleNestedChange('budgetPreferences', 'weeklyBudget', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  max="1000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Currency
                </label>
                <select
                  value={preferences.budgetPreferences.currency}
                  onChange={(e) => handleNestedChange('budgetPreferences', 'currency', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="CAD">CAD ($)</option>
                  <option value="AUD">AUD ($)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={preferences.budgetPreferences.prioritizeBudget}
                  onChange={(e) => handleNestedChange('budgetPreferences', 'prioritizeBudget', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm">Prioritize budget over variety</span>
              </label>
              <p className="text-xs text-gray-500 mt-1">
                When enabled, meal suggestions will focus on cost-effectiveness
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Nutrition Preferences</h1>
          <p className="mt-2 text-gray-600">
            Customize your meal planning preferences for personalized recommendations
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Profile Completion</span>
            <span>{completion}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${completion}%` }}
            />
          </div>
        </div>

        {/* Sync Button */}
        {healthProfileData && (
          <div className="mb-6 bg-white rounded-lg shadow p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold">Health Profile Connected</p>
                <p className="text-sm text-gray-600">
                  Auto-sync nutrition targets with your health data
                </p>
              </div>
              <button
                onClick={syncWithHealthProfile}
                disabled={isSyncing}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </button>
            </div>
          </div>
        )}

        {/* Messages */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
          </div>
        )}
        
        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800">{successMessage}</p>
          </div>
        )}

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow">
          <div className="flex border-b">
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex-1 py-4 px-6 text-center transition-colors ${
                  activeSection === section.id
                    ? 'bg-blue-50 border-b-2 border-blue-600 text-blue-600'
                    : 'hover:bg-gray-50 text-gray-600'
                }`}
              >
                <span className="text-2xl mb-1 block">{section.icon}</span>
                <span className="text-sm font-medium">{section.name}</span>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            {renderSection()}

            {/* Action Buttons */}
            <div className="mt-8 flex justify-between">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default NutritionPreferencesPage;