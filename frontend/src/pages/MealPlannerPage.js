
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
      const response = await fetch('http://localhost:5000/api/nutrition/meal-plan?status=active&limit=1', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.mealPlans && data.mealPlans.length > 0) {
          // Fetch full plan details
          const fullPlanResponse = await fetch(`http://localhost:5000/api/nutrition/meal-plan/${data.mealPlans[0]._id}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (fullPlanResponse.ok) {
            const fullData = await fullPlanResponse.json();
            setActivePlan(fullData.mealPlan);
            // Expand today's meals by default
            const today = moment().format('YYYY-MM-DD');
            const todayIndex = fullData.mealPlan.dailyPlans.findIndex(
              day => moment(day.date).format('YYYY-MM-DD') === today
            );
            if (todayIndex >= 0) {
              setExpandedDays({ [todayIndex]: true });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching active plan:', error);
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
      const response = await fetch('http://localhost:5000/api/nutrition/meal-plan', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(planForm)
      });
      
      if (response.ok) {
        const data = await response.json();
        setActivePlan(data.mealPlan);
        setExpandedDays({ 0: true }); // Expand first day
        alert('Meal plan generated successfully!');
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to generate meal plan');
      }
    } catch (error) {
      console.error('Error generating meal plan:', error);
      alert('Error generating meal plan');
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
        body: JSON.stringify({ scope: 'all' })
      });
      
      if (response.ok) {
        const data = await response.json();
        setActivePlan(data.mealPlan);
        alert('Meal plan regenerated successfully!');
      }
    } catch (error) {
      console.error('Error regenerating plan:', error);
    } finally {
      setRegenerating(false);
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
          payload: { day1Index, meal1Index, day2Index, meal2Index }
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setActivePlan(data.mealPlan);
      }
    } catch (error) {
      console.error('Error swapping meals:', error);
    }
  };

  const toggleMealLock = async (dayIndex, mealIndex) => {
    const meal = activePlan.dailyPlans[dayIndex].meals[mealIndex];
    const action = meal.isLocked ? 'unlock' : 'lock';
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/nutrition/meal-plan/${activePlan._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          payload: { dayIndex, mealIndex }
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setActivePlan(data.mealPlan);
      }
    } catch (error) {
      console.error('Error toggling lock:', error);
    }
  };

  const removeMeal = async (dayIndex, mealIndex) => {
    if (!window.confirm('Remove this meal from the plan?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/nutrition/meal-plan/${activePlan._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'remove',
          payload: { dayIndex, mealIndex }
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setActivePlan(data.mealPlan);
      }
    } catch (error) {
      console.error('Error removing meal:', error);
    }
  };

  const addManualMeal = async () => {
    if (!manualMeal.name || manualMealDay === null) {
      alert('Please enter meal details');
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
          action: 'add_manual',
          payload: {
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
              isCustom: true
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
          <h1 className="text-3xl font-bold text-gray-900">Meal Planner</h1>
          <p className="mt-2 text-gray-600">
            AI-powered meal planning based on your health profile and preferences
          </p>
        </div>

        {/* Quick Stats */}
        {preferences && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-500">Daily Target</div>
              <div className="text-2xl font-bold text-gray-900">
                {preferences.nutritionalTargets?.dailyCalories || 2000} cal
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-500">Dietary</div>
              <div className="text-lg font-semibold text-gray-900">
                {preferences.dietaryPreferences?.filter(d => d !== 'none')[0] || 'Flexible'}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-500">Meals/Day</div>
              <div className="text-2xl font-bold text-gray-900">
                {preferences.mealPreferences?.mealsPerDay || 3}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-500">Active Plan</div>
              <div className="text-lg font-semibold text-gray-900">
                {activePlan ? `${activePlan.type === 'weekly' ? '7' : '1'} days` : 'None'}
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
                  Your meal plan will be personalized using AI with 3-step sequential prompting:
                  <ol className="list-decimal list-inside mt-1">
                    <li>Analyze your health profile and determine nutritional strategy</li>
                    <li>Build optimal meal structure based on your goals</li>
                    <li>Generate detailed meals with alternatives</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Active Meal Plan */}
        {activePlan && (
          <div className="space-y-6">
            {/* Plan Header */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-semibold">{activePlan.name}</h2>
                  <p className="text-gray-600">
                    {formatDate(activePlan.startDate)} - {formatDate(activePlan.endDate)}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={regenerateFullPlan}
                    disabled={regenerating}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${regenerating ? 'animate-spin' : ''}`} />
                    Regenerate All
                  </button>
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                  >
                    View Analytics
                  </button>
                </div>
              </div>
              
              {/* Version info */}
              <div className="text-sm text-gray-500">
                Version {activePlan.version} • 
                {activePlan.previousVersions?.length > 0 && (
                  <span> {activePlan.previousVersions.length} previous versions available</span>
                )}
              </div>
            </div>

            {/* Daily Plans */}
            {activePlan.dailyPlans.map((dayPlan, dayIndex) => (
              <div key={dayIndex} className="bg-white rounded-lg shadow">
                {/* Day Header */}
                <div
                  className="p-4 border-b cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleDayExpansion(dayIndex)}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      {expandedDays[dayIndex] ? (
                        <ChevronDown className="h-5 w-5 mr-2 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 mr-2 text-gray-400" />
                      )}
                      <div>
                        <h3 className="font-semibold text-lg">
                          {formatDate(dayPlan.date)}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {dayPlan.meals.length} meals • {dayPlan.totals?.calories || 0} calories
                        </p>
                      </div>
                    </div>
                    
                    {/* Day Totals */}
                    <div className="flex space-x-4 text-sm">
                      <div>
                        <span className="text-gray-500">Protein:</span>
                        <span className="font-semibold ml-1">{dayPlan.totals?.protein || 0}g</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Carbs:</span>
                        <span className="font-semibold ml-1">{dayPlan.totals?.carbs || 0}g</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Fat:</span>
                        <span className="font-semibold ml-1">{dayPlan.totals?.fat || 0}g</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Meals */}
                {expandedDays[dayIndex] && (
                  <div className="p-4 space-y-4">
                    {dayPlan.meals
                      .sort((a, b) => a.order - b.order)
                      .map((meal, mealIndex) => (
                      <div
                        key={mealIndex}
                        className={`border rounded-lg p-4 ${meal.isLocked ? 'bg-gray-50 border-gray-300' : 'hover:shadow-md transition-shadow'}`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center mb-2">
                              <span className="text-2xl mr-2">{getMealTypeIcon(meal.type)}</span>
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getMealTypeColor(meal.type)}`}>
                                {meal.type.charAt(0).toUpperCase() + meal.type.slice(1)}
                              </span>
                              {meal.isCustom && (
                                <span className="ml-2 px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs font-semibold">
                                  Custom
                                </span>
                              )}
                              {meal.isLocked && (
                                <Lock className="ml-2 h-4 w-4 text-gray-500" />
                              )}
                            </div>
                            
                            <h4 className="font-semibold text-lg mb-1">{meal.name}</h4>
                            
                            {/* Nutrition Info */}
                            <div className="flex space-x-4 text-sm text-gray-600 mb-2">
                              <span>{meal.nutrition.calories} cal</span>
                              <span>P: {meal.nutrition.protein}g</span>
                              <span>C: {meal.nutrition.carbs}g</span>
                              <span>F: {meal.nutrition.fat}g</span>
                            </div>
                            
                            {/* Alternatives */}
                            {meal.alternatives && meal.alternatives.length > 0 && (
                              <div className="mt-3 pt-3 border-t">
                                <p className="text-sm font-medium text-gray-700 mb-1">Alternatives:</p>
                                <div className="space-y-1">
                                  {meal.alternatives.slice(0, 2).map((alt, altIndex) => (
                                    <div key={altIndex} className="text-sm text-gray-600">
                                      • {alt.name} ({alt.calories} cal)
                                      {alt.reason && <span className="text-xs text-gray-500 ml-1">- {alt.reason}</span>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Meal Actions */}
                          <div className="flex space-x-1 ml-4">
                            <button
                              onClick={() => toggleMealLock(dayIndex, mealIndex)}
                              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                              title={meal.isLocked ? 'Unlock meal' : 'Lock meal'}
                            >
                              {meal.isLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                            </button>
                            
                            {!meal.isLocked && (
                              <>
                                <button
                                  onClick={() => regenerateMeal(dayIndex, mealIndex)}
                                  disabled={regenerating}
                                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50"
                                  title="Regenerate meal"
                                >
                                  <RefreshCw className={`h-4 w-4 ${regenerating ? 'animate-spin' : ''}`} />
                                </button>
                                
                                <button
                                  onClick={() => {
                                    setSelectedMeal({ dayIndex, mealIndex });
                                    // Implement swap UI
                                  }}
                                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                                  title="Swap meal"
                                >
                                  <Shuffle className="h-4 w-4" />
                                </button>
                                
                                <button
                                  onClick={() => removeMeal(dayIndex, mealIndex)}
                                  className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                                  title="Remove meal"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Add Manual Meal Button */}
                    <button
                      onClick={() => {
                        setManualMealDay(dayIndex);
                        setShowManualAdd(true);
                      }}
                      className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 flex items-center justify-center"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Add Manual Meal
                    </button>
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
              <h3 className="text-lg font-semibold mb-4">Add Manual Meal</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Meal Name
                  </label>
                  <input
                    type="text"
                    value={manualMeal.name}
                    onChange={(e) => setManualMeal({ ...manualMeal, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Grilled Chicken Salad"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Meal Type
                  </label>
                  <select
                    value={manualMeal.type}
                    onChange={(e) => setManualMeal({ ...manualMeal, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowManualAdd(false);
                    setManualMealDay(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
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

        {/* Plan History */}
        {planHistory.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Plans</h3>
            <div className="space-y-2">
              {planHistory.map((plan) => (
                <div key={plan._id} className="flex justify-between items-center py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium">{plan.name}</p>
                    <p className="text-sm text-gray-600">
                      {formatDate(plan.startDate)} • {plan.type}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    plan.status === 'active' ? 'bg-green-100 text-green-800' :
                    plan.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {plan.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MealPlannerPage;