import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import moment from 'moment-timezone';
import { Calendar, Clock, RefreshCw, Plus, Lock, Unlock, ChevronRight, ChevronDown, Utensils, Info, Save, Trash2, Move, Shuffle } from 'lucide-react';

const MealPlannerPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState(null);
  const [activePlan, setActivePlan] = useState(null);
  const [expandedDays, setExpandedDays] = useState({});
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualMealDay, setManualMealDay] = useState(null);
  const [regenerating, setRegenerating] = useState(false);
  const [planHistory, setPlanHistory] = useState([]);
  const [swapMode, setSwapMode] = useState(false);
  const [swapSource, setSwapSource] = useState(null);
  
  // Form state for new plan
  const [planForm, setPlanForm] = useState({
    duration: 'daily',
    startDate: moment().add(1, 'day').format('YYYY-MM-DD'),
    preferences: {}
  });

  // Manual meal form
  const [manualMeal, setManualMeal] = useState({
    name: '',
    type: 'lunch',
    calories: 400,
    protein: 25,
    carbs: 40,
    fat: 15
  });

  // Fetch user preferences and active plan
  useEffect(() => {
    fetchPreferences();
    fetchActivePlan();
    fetchPlanHistory();
  }, []);

  const fetchPreferences = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/nutrition/preferences', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPreferences(data.preferences);
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    }
  };

  const fetchActivePlan = async () => {
  try {
    const token = localStorage.getItem('token');
    
    // Get active meal plans
    const response = await fetch('http://localhost:5000/api/nutrition/meal-plan?status=active&limit=1', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.mealPlans && data.mealPlans.length > 0) {
        // We found an active plan
        const plan = data.mealPlans[0];
        setActivePlan(plan);
        
        // Expand today's meals by default
        const today = moment().format('YYYY-MM-DD');
        const todayIndex = plan.dailyPlans ? plan.dailyPlans.findIndex(
          day => moment(day.date).format('YYYY-MM-DD') === today
        ) : -1;
        
        if (todayIndex >= 0) {
          setExpandedDays({ [todayIndex]: true });
        } else {
          // If today is not in the plan, expand the first day
          setExpandedDays({ 0: true });
        }
        
        console.log('Active plan loaded:', plan);
      } else {
        console.log('No active meal plans found');
        setActivePlan(null);
      }
    } else {
      console.error('Failed to fetch active plan:', response.status);
      setActivePlan(null);
    }
  } catch (error) {
    console.error('Error fetching active plan:', error);
    setActivePlan(null);
  }
};

  const fetchPlanHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/nutrition/meal-plan?status=all&limit=5', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPlanHistory(data.mealPlans);
      }
    } catch (error) {
      console.error('Error fetching plan history:', error);
    }
  };

  const generateMealPlan = async () => {
  setLoading(true);
  try {
    const token = localStorage.getItem('token');
    
    // Prepare the request body
    const requestBody = {
      type: planForm.duration || 'daily',
      duration: planForm.duration || 'daily',
      startDate: planForm.startDate || new Date().toISOString(),
      requirements: planForm.preferences || {}
    };
    
    console.log('Generating meal plan with:', requestBody);
    
    const response = await fetch('http://localhost:5000/api/nutrition/meal-plan', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('Meal plan generated:', data);
      
      // Set the new plan as active
      if (data.mealPlan) {
        setActivePlan(data.mealPlan);
        
        // Expand first day
        setExpandedDays({ 0: true });
        
        // Refresh the plan history
        fetchPlanHistory();
        
        alert('Meal plan generated successfully!');
      } else {
        alert('Meal plan generated but data structure is unexpected');
        console.error('Unexpected response structure:', data);
      }
    } else {
      const error = await response.json();
      console.error('Generation failed:', error);
      alert(error.message || 'Failed to generate meal plan');
    }
  } catch (error) {
    console.error('Error generating meal plan:', error);
    alert('Error generating meal plan: ' + error.message);
  } finally {
    setLoading(false);
  }
};

  const regenerateMeal = async (dayIndex, mealIndex) => {
    setRegenerating(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/nutrition/meal-plan/${activePlan._id}/regenerate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          scope: 'meal',
          dayIndex,
          mealIndex
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setActivePlan(data.mealPlan);
      }
    } catch (error) {
      console.error('Error regenerating meal:', error);
    } finally {
      setRegenerating(false);
    }
  };

  const regenerateFullPlan = async () => {
    if (!window.confirm('This will regenerate the entire meal plan (locked meals will be kept). Continue?')) {
      return;
    }
    
    setRegenerating(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/nutrition/meal-plan/${activePlan._id}/regenerate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          scope: 'full'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setActivePlan(data.mealPlan);
        alert('Meal plan regenerated successfully!');
      }
    } catch (error) {
      console.error('Error regenerating plan:', error);
      alert('Failed to regenerate meal plan');
    } finally {
      setRegenerating(false);
    }
  };

  const toggleMealLock = async (dayIndex, mealIndex) => {
    try {
      const token = localStorage.getItem('token');
      const meal = activePlan.dailyPlans[dayIndex].meals[mealIndex];
      const action = meal.isLocked ? 'unlock' : 'lock';
      
      const response = await fetch(`http://localhost:5000/api/nutrition/meal-plan/${activePlan._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: action,
          data: {  // Changed from payload to data
            dayIndex: dayIndex,
            mealIndex: mealIndex
          }
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setActivePlan(data.mealPlan);
      } else {
        const error = await response.json();
        console.error('Lock/unlock error:', error);
      }
    } catch (error) {
      console.error('Error toggling meal lock:', error);
    }
  };

  const removeMeal = async (dayIndex, mealIndex) => {
    if (!window.confirm('Are you sure you want to remove this meal?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/nutrition/meal-plan/${activePlan._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'removeMeal',  // Changed from 'remove' to 'removeMeal'
          data: {  // Changed from payload to data
            dayIndex: dayIndex,
            mealIndex: mealIndex
          }
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setActivePlan(data.mealPlan);
      } else {
        const error = await response.json();
        console.error('Remove meal error:', error);
      }
    } catch (error) {
      console.error('Error removing meal:', error);
    }
  };

  const handleSwapMeals = (dayIndex, mealIndex) => {
    if (!swapMode) {
      // Start swap
      setSwapMode(true);
      setSwapSource({ dayIndex, mealIndex });
    } else {
      // Complete swap
      if (swapSource.dayIndex === dayIndex && swapSource.mealIndex === mealIndex) {
        // Cancel if same meal clicked
        setSwapMode(false);
        setSwapSource(null);
        return;
      }
      
      swapMeals(swapSource.dayIndex, swapSource.mealIndex, dayIndex, mealIndex);
      setSwapMode(false);
      setSwapSource(null);
    }
  };

  const swapMeals = async (day1Index, meal1Index, day2Index, meal2Index) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/nutrition/meal-plan/${activePlan._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'swap',
          data: {  // Changed from payload to data
            dayIndex1: day1Index,  // Changed property names
            mealIndex1: meal1Index,
            dayIndex2: day2Index,
            mealIndex2: meal2Index
          }
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setActivePlan(data.mealPlan);
      } else {
        const error = await response.json();
        console.error('Swap error:', error);
        alert('Failed to swap meals');
      }
    } catch (error) {
      console.error('Error swapping meals:', error);
    }
  };

  const addManualMeal = async () => {
    if (!manualMeal.name) {
      alert('Please enter a meal name');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/nutrition/meal-plan/${activePlan._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'addMeal',  // Changed from 'add_manual' to 'addMeal'
          data: {  // Changed from payload to data
            dayIndex: manualMealDay,
            meal: {
              type: manualMeal.type,
              name: manualMeal.name,
              nutrition: {
                calories: parseInt(manualMeal.calories),
                protein: parseInt(manualMeal.protein),
                carbs: parseInt(manualMeal.carbs),
                fat: parseInt(manualMeal.fat),
                fiber: 5
              },
              isCustom: true,
              customRecipe: {
                name: manualMeal.name,
                ingredients: [
                  { name: 'Custom ingredients', quantity: 1, unit: 'unit' }
                ],
                instructions: ['Prepare as desired'],
                cookingTime: 30
              }
            }
          }
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setActivePlan(data.mealPlan);
        setShowManualAdd(false);
        setManualMealDay(null);
        setManualMeal({
          name: '',
          type: 'lunch',
          calories: 400,
          protein: 25,
          carbs: 40,
          fat: 15
        });
      } else {
        const error = await response.json();
        console.error('Add meal error:', error);
        alert('Failed to add meal');
      }
    } catch (error) {
      console.error('Error adding manual meal:', error);
    }
  };

  const getMealTypeIcon = (type) => {
    const icons = {
      breakfast: '🌅',
      lunch: '☀️',
      dinner: '🌙',
      snack: '🥜'
    };
    return icons[type] || '🍽️';
  };

  const getMealTypeColor = (type) => {
    const colors = {
      breakfast: 'bg-yellow-100 text-yellow-800',
      lunch: 'bg-blue-100 text-blue-800',
      dinner: 'bg-purple-100 text-purple-800',
      snack: 'bg-green-100 text-green-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (date) => {
    return moment(date).format('dddd, MMM D');
  };

  const toggleDayExpansion = (index) => {
    setExpandedDays(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Meal Planner</h1>
          <p className="text-gray-600">
            Plan your meals for the day or week with AI-powered suggestions
          </p>
        </div>

        {/* Current Plan Status */}
        {activePlan && (
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-gray-700">Active Plan</h3>
                <p className="text-sm text-gray-500">
                  {formatDate(activePlan.startDate)} - {formatDate(activePlan.endDate)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  activePlan.type === 'weekly' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                }`}>
                  {activePlan.type === 'weekly' ? '7 days' : '1 day'}
                </span>
                <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                  {activePlan.dailyPlans.reduce((sum, day) => sum + day.meals.length, 0)} meals
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Generate New Plan */}
        {!activePlan && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Generate New Meal Plan</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration
                </label>
                <select
                  value={planForm.duration}
                  onChange={(e) => setPlanForm({ ...planForm, duration: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="daily">Daily (1 day)</option>
                  <option value="weekly">Weekly (7 days)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={planForm.startDate}
                  onChange={(e) => setPlanForm({ ...planForm, startDate: e.target.value })}
                  min={moment().format('YYYY-MM-DD')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={generateMealPlan}
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="animate-spin h-5 w-5 mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Utensils className="h-5 w-5 mr-2" />
                      Generate Plan
                    </>
                  )}
                </button>
              </div>
            </div>
            
            <div className="mt-4 p-4 bg-blue-50 rounded-md">
              <div className="flex">
                <Info className="h-5 w-5 text-blue-400 mr-2 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  Your meal plan will be personalized based on your dietary preferences and nutritional targets.
                  {!preferences && ' Set up your preferences first for better recommendations.'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Active Meal Plan */}
        {activePlan && (
          <div className="space-y-6">
            {/* Plan Actions */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={regenerateFullPlan}
                  disabled={regenerating}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${regenerating ? 'animate-spin' : ''}`} />
                  Regenerate Plan
                </button>
                
                {swapMode && (
                  <button
                    onClick={() => {
                      setSwapMode(false);
                      setSwapSource(null);
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center"
                  >
                    Cancel Swap
                  </button>
                )}
                
                <button
                  onClick={() => navigate('/nutrition/shopping-list')}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 flex items-center"
                >
                  View Shopping List
                </button>
              </div>
              
              {swapMode && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    Click on another meal to swap with the selected meal
                  </p>
                </div>
              )}
            </div>

            {/* Daily Plans */}
            {activePlan.dailyPlans.map((day, dayIndex) => (
              <div key={dayIndex} className="bg-white rounded-lg shadow overflow-hidden">
                {/* Day Header */}
                <div
                  className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 cursor-pointer"
                  onClick={() => toggleDayExpansion(dayIndex)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {expandedDays[dayIndex] ? (
                        <ChevronDown className="h-5 w-5 mr-3 text-gray-500" />
                      ) : (
                        <ChevronRight className="h-5 w-5 mr-3 text-gray-500" />
                      )}
                      <Calendar className="h-5 w-5 text-blue-600 mr-3" />
                      <h3 className="text-lg font-semibold text-gray-900">
                        {formatDate(day.date)}
                      </h3>
                      {dayIndex === 0 && (
                        <span className="ml-3 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          Today
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-500">
                        {day.meals?.length || 0} meals
                      </span>
                      {day.totals && (
                        <span className="text-sm font-medium text-gray-700">
                          {Math.round(day.totals.calories || 0)} cal
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Meals */}
                {expandedDays[dayIndex] && day.meals && (
                  <div className="p-6">
                    <div className="grid gap-4">
                      {day.meals.map((meal, mealIndex) => (
                        <div
                          key={mealIndex}
                          className={`border rounded-lg p-4 ${
                            swapMode && swapSource?.dayIndex === dayIndex && swapSource?.mealIndex === mealIndex
                              ? 'border-yellow-400 bg-yellow-50'
                              : swapMode
                              ? 'cursor-pointer hover:border-blue-400'
                              : ''
                          }`}
                          onClick={() => swapMode && handleSwapMeals(dayIndex, mealIndex)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xl">{getMealTypeIcon(meal.type)}</span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getMealTypeColor(meal.type)}`}>
                                  {meal.type}
                                </span>
                                {meal.isLocked && (
                                  <Lock className="h-4 w-4 text-yellow-600" />
                                )}
                                {meal.isCustom && (
                                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                                    Custom
                                  </span>
                                )}
                              </div>
                              
                              <h4 className="font-semibold text-gray-900 mb-1">{meal.name}</h4>
                              
                              <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                                <span>🔥 {meal.nutrition?.calories || 0} cal</span>
                                <span>🥩 {meal.nutrition?.protein || 0}g protein</span>
                                <span>🌾 {meal.nutrition?.carbs || 0}g carbs</span>
                                <span>🥑 {meal.nutrition?.fat || 0}g fat</span>
                              </div>
                              
                              {meal.alternatives && meal.alternatives.length > 0 && (
                                <div className="mt-2 text-xs text-gray-500">
                                  Alternatives available: {meal.alternatives.map(alt => alt.name).join(', ')}
                                </div>
                              )}
                            </div>
                            
                            {/* Meal Actions */}
                            {!swapMode && (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => toggleMealLock(dayIndex, mealIndex)}
                                  className="p-2 hover:bg-gray-100 rounded"
                                  title={meal.isLocked ? "Unlock meal" : "Lock meal"}
                                >
                                  {meal.isLocked ? (
                                    <Lock className="h-4 w-4 text-yellow-600" />
                                  ) : (
                                    <Unlock className="h-4 w-4 text-gray-400" />
                                  )}
                                </button>
                                
                                <button
                                  onClick={() => regenerateMeal(dayIndex, mealIndex)}
                                  disabled={meal.isLocked || regenerating}
                                  className="p-2 hover:bg-gray-100 rounded disabled:opacity-50"
                                  title="Regenerate meal"
                                >
                                  <RefreshCw className="h-4 w-4 text-gray-600" />
                                </button>
                                
                                <button
                                  onClick={() => handleSwapMeals(dayIndex, mealIndex)}
                                  className="p-2 hover:bg-gray-100 rounded"
                                  title="Swap meal"
                                >
                                  <Shuffle className="h-4 w-4 text-gray-600" />
                                </button>
                                
                                <button
                                  onClick={() => removeMeal(dayIndex, mealIndex)}
                                  className="p-2 hover:bg-gray-100 rounded"
                                  title="Remove meal"
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      {/* Add Manual Meal Button */}
                      {!swapMode && (
                        <button
                          onClick={() => {
                            setManualMealDay(dayIndex);
                            setShowManualAdd(true);
                          }}
                          className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-gray-400 flex items-center justify-center text-gray-500 hover:text-gray-700"
                        >
                          <Plus className="h-5 w-5 mr-2" />
                          Add Custom Meal
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Manual Meal Modal */}
        {showManualAdd && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">Add Custom Meal</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Meal Name
                  </label>
                  <input
                    type="text"
                    value={manualMeal.name}
                    onChange={(e) => setManualMeal({ ...manualMeal, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="e.g., Chicken Salad"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Meal Type
                  </label>
                  <select
                    value={manualMeal.type}
                    onChange={(e) => setManualMeal({ ...manualMeal, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                    <option value="snack">Snack</option>
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Calories
                    </label>
                    <input
                      type="number"
                      value={manualMeal.calories}
                      onChange={(e) => setManualMeal({ ...manualMeal, calories: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Protein (g)
                    </label>
                    <input
                      type="number"
                      value={manualMeal.protein}
                      onChange={(e) => setManualMeal({ ...manualMeal, protein: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Carbs (g)
                    </label>
                    <input
                      type="number"
                      value={manualMeal.carbs}
                      onChange={(e) => setManualMeal({ ...manualMeal, carbs: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fat (g)
                    </label>
                    <input
                      type="number"
                      value={manualMeal.fat}
                      onChange={(e) => setManualMeal({ ...manualMeal, fat: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowManualAdd(false);
                    setManualMealDay(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={addManualMeal}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add Meal
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MealPlannerPage;