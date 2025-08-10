// src/pages/NutritionPreferencesPage.js - Nutrition Preferences with Health Profile Integration
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
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

  const dietaryOptions = [
    { value: 'vegetarian', label: 'Vegetarian', emoji: '🥬' },
    { value: 'vegan', label: 'Vegan', emoji: '🌱' },
    { value: 'pescatarian', label: 'Pescatarian', emoji: '🐟' },
    { value: 'keto', label: 'Keto', emoji: '🥑' },
    { value: 'paleo', label: 'Paleo', emoji: '🥩' },
    { value: 'mediterranean', label: 'Mediterranean', emoji: '🫒' },
    { value: 'gluten_free', label: 'Gluten Free', emoji: '🌾' },
    { value: 'dairy_free', label: 'Dairy Free', emoji: '🥛' },
    { value: 'low_carb', label: 'Low Carb', emoji: '🍞' },
    { value: 'low_fat', label: 'Low Fat', emoji: '🧈' },
    { value: 'high_protein', label: 'High Protein', emoji: '💪' },
    { value: 'whole30', label: 'Whole30', emoji: '30' },
    { value: 'diabetic_friendly', label: 'Diabetic Friendly', emoji: '🩺' },
    { value: 'halal', label: 'Halal', emoji: '☪️' },
    { value: 'kosher', label: 'Kosher', emoji: '✡️' }
  ];

  const allergyOptions = [
    { value: 'nuts', label: 'Nuts', emoji: '🥜' },
    { value: 'peanuts', label: 'Peanuts', emoji: '🥜' },
    { value: 'gluten', label: 'Gluten', emoji: '🌾' },
    { value: 'dairy', label: 'Dairy', emoji: '🥛' },
    { value: 'eggs', label: 'Eggs', emoji: '🥚' },
    { value: 'soy', label: 'Soy', emoji: '🌱' },
    { value: 'shellfish', label: 'Shellfish', emoji: '🦐' },
    { value: 'fish', label: 'Fish', emoji: '🐟' },
    { value: 'sesame', label: 'Sesame', emoji: '🌿' },
    { value: 'tree_nuts', label: 'Tree Nuts', emoji: '🌰' }
  ];

  const cuisineOptions = [
    'italian', 'mexican', 'chinese', 'japanese', 'indian',
    'thai', 'greek', 'french', 'spanish', 'american',
    'mediterranean', 'middle_eastern', 'korean', 'vietnamese'
  ];

  const cookingMethods = [
    'baking', 'grilling', 'frying', 'steaming', 'boiling',
    'roasting', 'slow_cooking', 'pressure_cooking', 'raw'
  ];

  const kitchenEquipment = [
    'oven', 'stovetop', 'microwave', 'slow_cooker',
    'pressure_cooker', 'air_fryer', 'grill', 'blender',
    'food_processor', 'instant_pot'
  ];

  useEffect(() => {
    fetchPreferences();
    fetchHealthProfile();
  }, []);

  const fetchPreferences = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('/api/nutrition/preferences', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.data.preferences) {
        setPreferences(response.data.preferences);
        setCompletion(response.data.completion || 0);
        
        // Show sync message if data was imported
        if (response.data.syncStatus && response.data.lastSynced) {
          setSuccessMessage('✅ Preferences synced with your health profile');
          setTimeout(() => setSuccessMessage(''), 3000);
        }
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
      setError('Failed to load preferences');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHealthProfile = async () => {
    try {
      const response = await axios.get('/api/health-profile', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.data.profile) {
        setHealthProfileData(response.data.profile);
      }
    } catch (error) {
      console.error('Error fetching health profile:', error);
    }
  };

  const handleSyncWithHealthProfile = async () => {
    try {
      setIsSyncing(true);
      const response = await axios.post('/api/nutrition/preferences/sync', {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.data.preferences) {
        setPreferences(response.data.preferences);
        setSuccessMessage('✅ Successfully synced with health profile!');
        
        // Show imported data
        const imported = response.data.importedData;
        if (imported) {
          setSuccessMessage(
            `✅ Imported: Weight: ${imported.weight}kg, BMI: ${imported.bmi}, ` +
            `Activity: ${imported.activityLevel}, Goal: ${imported.fitnessGoal}`
          );
        }
      }
    } catch (error) {
      console.error('Sync error:', error);
      setError('Failed to sync with health profile');
    } finally {
      setIsSyncing(false);
      setTimeout(() => {
        setSuccessMessage('');
        setError('');
      }, 5000);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setIsLoading(true);
      const response = await axios.put('/api/nutrition/preferences', preferences, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      setSuccessMessage('✅ Preferences saved successfully!');
      setCompletion(response.data.completion || 0);
      
      setTimeout(() => {
        navigate('/meal-planner');
      }, 2000);
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
                    className="sr-only"
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
            
            {healthProfileData?.dietaryRestrictions?.allergies?.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  📋 Allergies imported from health profile: {healthProfileData.dietaryRestrictions.allergies.join(', ')}
                </p>
              </div>
            )}
            
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
                    className="sr-only"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
                  📊 Calculated from your health profile:
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>BMI: {healthProfileData.physicalMetrics?.bmi?.value}</div>
                  <div>Activity: {healthProfileData.lifestyleIndicators?.activityLevel}</div>
                  <div>Goal: {healthProfileData.fitnessGoals?.primary}</div>
                  <div>Target Weight: {healthProfileData.fitnessGoals?.targetWeight?.value}kg</div>
                </div>
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                min="1000"
                max="5000"
              />
              <p className="text-xs text-gray-500 mt-1">
                Auto-calculated based on your BMI, activity level, and fitness goals
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Macro Distribution</h4>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm">Protein (%)</label>
                  <input
                    type="number"
                    value={preferences.nutritionalTargets.macros.protein.percentage}
                    onChange={(e) => {
                      const percentage = parseInt(e.target.value);
                      const grams = (preferences.nutritionalTargets.dailyCalories * percentage / 100) / 4;
                      setPreferences(prev => ({
                        ...prev,
                        nutritionalTargets: {
                          ...prev.nutritionalTargets,
                          macros: {
                            ...prev.nutritionalTargets.macros,
                            protein: { percentage, grams: Math.round(grams) }
                          }
                        }
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    min="10"
                    max="40"
                  />
                  <p className="text-xs text-gray-500">{preferences.nutritionalTargets.macros.protein.grams}g</p>
                </div>
                
                <div>
                  <label className="text-sm">Carbs (%)</label>
                  <input
                    type="number"
                    value={preferences.nutritionalTargets.macros.carbs.percentage}
                    onChange={(e) => {
                      const percentage = parseInt(e.target.value);
                      const grams = (preferences.nutritionalTargets.dailyCalories * percentage / 100) / 4;
                      setPreferences(prev => ({
                        ...prev,
                        nutritionalTargets: {
                          ...prev.nutritionalTargets,
                          macros: {
                            ...prev.nutritionalTargets.macros,
                            carbs: { percentage, grams: Math.round(grams) }
                          }
                        }
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    min="20"
                    max="60"
                  />
                  <p className="text-xs text-gray-500">{preferences.nutritionalTargets.macros.carbs.grams}g</p>
                </div>
                
                <div>
                  <label className="text-sm">Fat (%)</label>
                  <input
                    type="number"
                    value={preferences.nutritionalTargets.macros.fat.percentage}
                    onChange={(e) => {
                      const percentage = parseInt(e.target.value);
                      const grams = (preferences.nutritionalTargets.dailyCalories * percentage / 100) / 9;
                      setPreferences(prev => ({
                        ...prev,
                        nutritionalTargets: {
                          ...prev.nutritionalTargets,
                          macros: {
                            ...prev.nutritionalTargets.macros,
                            fat: { percentage, grams: Math.round(grams) }
                          }
                        }
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    min="15"
                    max="40"
                  />
                  <p className="text-xs text-gray-500">{preferences.nutritionalTargets.macros.fat.grams}g</p>
                </div>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                  <option value="extra_large">Extra Large</option>
                </select>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Meal Timing (in {preferences.location.timezone})</h4>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm">Breakfast</label>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                
                <div>
                  <label className="text-sm">Lunch</label>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                
                <div>
                  <label className="text-sm">Dinner</label>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Times are stored in ISO 8601 format: {moment.tz(preferences.mealPreferences.mealTiming.breakfast, 'HH:mm', preferences.location.timezone).toISOString()}
              </p>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  min="5"
                  max="180"
                />
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Preferred Cooking Methods</h4>
              <div className="grid md:grid-cols-3 gap-2">
                {cookingMethods.map(method => (
                  <label key={method} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={preferences.cookingPreferences.preferredMethods?.includes(method)}
                      onChange={() => {
                        const current = preferences.cookingPreferences.preferredMethods || [];
                        setPreferences(prev => ({
                          ...prev,
                          cookingPreferences: {
                            ...prev.cookingPreferences,
                            preferredMethods: current.includes(method)
                              ? current.filter(m => m !== method)
                              : [...current, method]
                          }
                        }));
                      }}
                      className="mr-2"
                    />
                    <span className="capitalize text-sm">{method.replace('_', ' ')}</span>
                  </label>
                ))}
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
                <div className="flex">
                  <select
                    value={preferences.budgetPreferences.currency}
                    onChange={(e) => setPreferences(prev => ({
                      ...prev,
                      budgetPreferences: {
                        ...prev.budgetPreferences,
                        currency: e.target.value
                      }
                    }))}
                    className="px-3 py-2 border border-r-0 border-gray-300 rounded-l-lg"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="CAD">CAD</option>
                    <option value="AUD">AUD</option>
                  </select>
                  <input
                    type="number"
                    value={preferences.budgetPreferences.weeklyBudget}
                    onChange={(e) => setPreferences(prev => ({
                      ...prev,
                      budgetPreferences: {
                        ...prev.budgetPreferences,
                        weeklyBudget: parseInt(e.target.value)
                      }
                    }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-r-lg"
                    min="0"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Timezone
                </label>
                <select
                  value={preferences.location.timezone}
                  onChange={(e) => handleNestedChange('location', 'timezone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  {moment.tz.names().map(tz => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={preferences.budgetPreferences.prioritizeBudget}
                  onChange={(e) => setPreferences(prev => ({
                    ...prev,
                    budgetPreferences: {
                      ...prev.budgetPreferences,
                      prioritizeBudget: e.target.checked
                    }
                  }))}
                  className="mr-2"
                />
                <span className="text-sm">Prioritize budget-friendly options</span>
              </label>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl">Loading preferences...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Nutrition Preferences</h1>
            <p className="text-gray-600 mt-1">Customize your meal planning experience</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500 mb-2">Profile Completion</div>
            <div className="flex items-center gap-3">
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${completion}%` }}
                />
              </div>
              <span className="font-semibold">{completion}%</span>
            </div>
          </div>
        </div>

        {/* Sync Button */}
        {healthProfileData && (
          <button
            onClick={handleSyncWithHealthProfile}
            disabled={isSyncing}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
          >
            {isSyncing ? (
              <>
                <span className="animate-spin">⚙️</span> Syncing...
              </>
            ) : (
              <>
                <span>🔄</span> Sync with Health Profile
              </>
            )}
          </button>
        )}
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Main Content */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="flex border-b">
          {/* Section Navigation */}
          <div className="w-48 border-r bg-gray-50">
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-gray-100 transition ${
                  activeSection === section.id ? 'bg-white border-l-4 border-green-600' : ''
                }`}
              >
                <span className="text-xl">{section.icon}</span>
                <span className={activeSection === section.id ? 'font-semibold' : ''}>
                  {section.name}
                </span>
              </button>
            ))}
          </div>

          {/* Section Content */}
          <div className="flex-1 p-6">
            <form onSubmit={handleSubmit}>
              {renderSection()}

              {/* Form Actions */}
              <div className="flex justify-between mt-8 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => {
                    const currentIndex = sections.findIndex(s => s.id === activeSection);
                    if (currentIndex > 0) {
                      setActiveSection(sections[currentIndex - 1].id);
                    }
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  disabled={activeSection === sections[0].id}
                >
                  Previous
                </button>

                <div className="flex gap-3">
                  {activeSection === sections[sections.length - 1].id ? (
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-8 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                    >
                      {isLoading ? 'Saving...' : 'Save & Continue to Meal Planner'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        const currentIndex = sections.findIndex(s => s.id === activeSection);
                        if (currentIndex < sections.length - 1) {
                          setActiveSection(sections[currentIndex + 1].id);
                        }
                      }}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                    >
                      Next
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NutritionPreferencesPage;