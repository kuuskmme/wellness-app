// frontend/src/pages/MealPlannerPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import moment from 'moment-timezone';
import { 
  Calendar, Clock, RefreshCw, Plus, Lock, Unlock, 
  ChevronRight, ChevronDown, Utensils, Info, Save, 
  Trash2, Move, Shuffle, History, Archive, Copy 
} from 'lucide-react';

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
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [versions, setVersions] = useState([]);
  const [showAllPlans, setShowAllPlans] = useState(false);
  const [allPlans, setAllPlans] = useState([]);
  
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

  // Fetch user preferences and plans on mount
  useEffect(() => {
    fetchPreferences();
    fetchActivePlan();
    fetchAllPlans();
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
        setPreferences(data);
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    }
  };

  const fetchActivePlan = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Get the most recent active meal plan
      const response = await fetch('http://localhost:5000/api/nutrition/meal-plan?status=active&limit=1', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.mealPlans && data.mealPlans.length > 0) {
          const plan = data.mealPlans[0];
          setActivePlan(plan);
          
          // Expand today's meals by default
          const today = moment().format('YYYY-MM-DD');
          const todayIndex = plan.dailyPlans?.findIndex(
            day => moment(day.date).format('YYYY-MM-DD') === today
          ) || 0;
          
          setExpandedDays({ [todayIndex >= 0 ? todayIndex : 0]: true });
          
          console.log('Active plan loaded:', plan);
        } else {
          console.log('No active meal plans found');
          setActivePlan(null);
        }
      }
    } catch (error) {
      console.error('Error fetching active plan:', error);
    }
  };

  const fetchAllPlans = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/nutrition/meal-plans/all?limit=20', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAllPlans(data.mealPlans);
        setPlanHistory(data.mealPlans.slice(0, 5)); // Show recent 5 in history
      }
    } catch (error) {
      console.error('Error fetching all plans:', error);
    }
  };

  const loadPlan = async (planId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/nutrition/meal-plan/${planId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setActivePlan(data.mealPlan);
        setExpandedDays({ 0: true });
        setShowAllPlans(false);
        alert('Plan loaded successfully!');
      }
    } catch (error) {
      console.error('Error loading plan:', error);
      alert('Failed to load meal plan');
    }
  };

  const saveVersion = async () => {
    if (!activePlan) return;
    
    const reason = prompt('Enter a reason for saving this version (optional):') || 'Manual save';
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/nutrition/meal-plan/${activePlan._id}/save-version`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });
      
      if (response.ok) {
        const data = await response.json();
        alert(`Version ${data.version} saved successfully!`);
        fetchVersionHistory();
      }
    } catch (error) {
      console.error('Error saving version:', error);
      alert('Failed to save version');
    }
  };

  const fetchVersionHistory = async () => {
    if (!activePlan) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/nutrition/meal-plan/${activePlan._id}/versions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setVersions(data.versions);
        setShowVersionHistory(true);
      }
    } catch (error) {
      console.error('Error fetching versions:', error);
    }
  };

  const restoreVersion = async (versionNumber) => {
    if (!window.confirm(`Restore version ${versionNumber}? Current changes will be saved as a new version.`)) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/nutrition/meal-plan/${activePlan._id}/restore`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ versionNumber })
      });
      
      if (response.ok) {
        const data = await response.json();
        setActivePlan(data.mealPlan);
        setShowVersionHistory(false);
        alert('Version restored successfully!');
      }
    } catch (error) {
      console.error('Error restoring version:', error);
      alert('Failed to restore version');
    }
  };

  const generateMealPlan = async (archiveExisting = false) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      const endpoint = archiveExisting 
        ? 'http://localhost:5000/api/nutrition/meal-plan/archive-and-create'
        : 'http://localhost:5000/api/nutrition/meal-plan';
      
      const requestBody = {
        type: planForm.duration || 'daily',
        duration: planForm.duration || 'daily',
        startDate: planForm.startDate || new Date().toISOString(),
        requirements: planForm.preferences || {}
      };
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.mealPlan) {
          setActivePlan(data.mealPlan);
          setExpandedDays({ 0: true });
          fetchAllPlans(); // Refresh the plans list
          
          if (archiveExisting && data.archivedCount) {
            alert(`Meal plan generated! ${data.archivedCount} previous plan(s) archived.`);
          } else {
            alert('Meal plan generated successfully!');
          }
        }
      } else {
        const error = await response.json();
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
          data: {
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
          action: 'removeMeal',
          data: {
            dayIdx: dayIndex,
            mealIdx: mealIndex
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
          data: {
            dayIndex1: day1Index,
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
          action: 'addMeal',
          data: {
            dayIndex: manualMealDay,
            meal: {
              name: manualMeal.name,
              type: manualMeal.type,
              nutrition: {
                calories: manualMeal.calories,
                protein: manualMeal.protein,
                carbs: manualMeal.carbs,
                fat: manualMeal.fat
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
      }
    } catch (error) {
      console.error('Error adding manual meal:', error);
    }
  };

  const toggleDayExpansion = (index) => {
    setExpandedDays(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const getMealTypeColor = (type) => {
    const colors = {
      breakfast: 'bg-yellow-100 text-yellow-800',
      lunch: 'bg-green-100 text-green-800',
      dinner: 'bg-blue-100 text-blue-800',
      snack: 'bg-purple-100 text-purple-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Meal Planner</h1>
        <p className="text-gray-600 mt-2">
          Plan your meals for optimal nutrition
        </p>
      </div>

      {/* Version History Modal */}
      {showVersionHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-96 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Version History</h3>
            {versions.length > 0 ? (
              <div className="space-y-2">
                {versions.map((version) => (
                  <div key={version.version} className="border rounded p-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">Version {version.version}</p>
                        <p className="text-sm text-gray-600">
                          {moment(version.savedAt).format('MMM DD, YYYY HH:mm')}
                        </p>
                        <p className="text-sm text-gray-500">{version.reason}</p>
                      </div>
                      <button
                        onClick={() => restoreVersion(version.version)}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Restore
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No previous versions available</p>
            )}
            <button
              onClick={() => setShowVersionHistory(false)}
              className="mt-4 w-full px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* All Plans Modal */}
      {showAllPlans && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-96 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">All Meal Plans</h3>
            {allPlans.length > 0 ? (
              <div className="space-y-2">
                {allPlans.map((plan) => (
                  <div key={plan._id} className="border rounded p-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">
                          {plan.type === 'weekly' ? 'Weekly' : 'Daily'} Plan
                        </p>
                        <p className="text-sm text-gray-600">
                          {moment(plan.startDate).format('MMM DD')} - {moment(plan.endDate).format('MMM DD, YYYY')}
                        </p>
                        <p className="text-sm">
                          <span className={`px-2 py-1 rounded text-xs ${
                            plan.status === 'active' ? 'bg-green-100 text-green-800' :
                            plan.status === 'archived' ? 'bg-gray-100 text-gray-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {plan.status}
                          </span>
                        </p>
                      </div>
                      <button
                        onClick={() => loadPlan(plan._id)}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Load
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No meal plans found</p>
            )}
            <button
              onClick={() => setShowAllPlans(false)}
              className="mt-4 w-full px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Manual Meal Add Modal */}
      {showManualAdd && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Add Manual Meal</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Meal Name</label>
                <input
                  type="text"
                  value={manualMeal.name}
                  onChange={(e) => setManualMeal({ ...manualMeal, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Enter meal name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <select
                  value={manualMeal.type}
                  onChange={(e) => setManualMeal({ ...manualMeal, type: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="snack">Snack</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Calories</label>
                  <input
                    type="number"
                    value={manualMeal.calories}
                    onChange={(e) => setManualMeal({ ...manualMeal, calories: parseInt(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Protein (g)</label>
                  <input
                    type="number"
                    value={manualMeal.protein}
                    onChange={(e) => setManualMeal({ ...manualMeal, protein: parseInt(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Carbs (g)</label>
                  <input
                    type="number"
                    value={manualMeal.carbs}
                    onChange={(e) => setManualMeal({ ...manualMeal, carbs: parseInt(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fat (g)</label>
                  <input
                    type="number"
                    value={manualMeal.fat}
                    onChange={(e) => setManualMeal({ ...manualMeal, fat: parseInt(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowManualAdd(false);
                  setManualMealDay(null);
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={addManualMeal}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Meal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => generateMealPlan(false)}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Generating...' : 'Generate New Plan'}
        </button>
        
        <button
          onClick={() => generateMealPlan(true)}
          disabled={loading}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400"
        >
          <Archive className="inline mr-2 h-4 w-4" />
          Archive & Create New
        </button>
        
        {activePlan && (
          <>
            <button
              onClick={saveVersion}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Save className="inline mr-2 h-4 w-4" />
              Save Version
            </button>
            
            <button
              onClick={fetchVersionHistory}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              <History className="inline mr-2 h-4 w-4" />
              Version History
            </button>
            
            <button
              onClick={regenerateFullPlan}
              disabled={regenerating}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400"
            >
              <RefreshCw className="inline mr-2 h-4 w-4" />
              Regenerate All
            </button>
          </>
        )}
        
        <button
          onClick={() => setShowAllPlans(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <Copy className="inline mr-2 h-4 w-4" />
          View All Plans
        </button>
        
        {swapMode && (
          <button
            onClick={() => {
              setSwapMode(false);
              setSwapSource(null);
            }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Cancel Swap
          </button>
        )}
      </div>

      {/* Plan Generation Form */}
      {!activePlan && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Generate New Meal Plan</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Duration</label>
              <select
                value={planForm.duration}
                onChange={(e) => setPlanForm({ ...planForm, duration: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Start Date</label>
              <input
                type="date"
                value={planForm.startDate}
                onChange={(e) => setPlanForm({ ...planForm, startDate: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Active Meal Plan Display */}
      {activePlan && activePlan.dailyPlans && (
        <div className="space-y-4">
          <div className="bg-white shadow rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {activePlan.type === 'weekly' ? 'Weekly' : 'Daily'} Meal Plan
              </h2>
              <span className="text-sm text-gray-600">
                {moment(activePlan.startDate).format('MMM DD')} - {moment(activePlan.endDate).format('MMM DD, YYYY')}
              </span>
            </div>
            
            {activePlan.dailyPlans.map((day, dayIndex) => (
              <div key={dayIndex} className="border rounded-lg mb-4">
                <div
                  className="p-4 bg-gray-50 cursor-pointer flex justify-between items-center"
                  onClick={() => toggleDayExpansion(dayIndex)}
                >
                  <div className="flex items-center">
                    {expandedDays[dayIndex] ? (
                      <ChevronDown className="h-5 w-5 mr-2" />
                    ) : (
                      <ChevronRight className="h-5 w-5 mr-2" />
                    )}
                    <h3 className="font-medium">
                      {moment(day.date).format('dddd, MMM DD')}
                    </h3>
                  </div>
                  <div className="text-sm text-gray-600">
                    {day.totals?.calories || 0} calories
                  </div>
                </div>
                
                {expandedDays[dayIndex] && (
                  <div className="p-4">
                    <div className="space-y-3">
                      {day.meals.map((meal, mealIndex) => (
                        <div
                          key={mealIndex}
                          className={`border rounded-lg p-4 ${
                            swapMode && swapSource && 
                            swapSource.dayIndex === dayIndex && 
                            swapSource.mealIndex === mealIndex
                              ? 'border-blue-500 bg-blue-50'
                              : ''
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`px-2 py-1 rounded text-xs ${getMealTypeColor(meal.type)}`}>
                                  {meal.type}
                                </span>
                                {meal.isLocked && (
                                  <Lock className="h-4 w-4 text-gray-500" />
                                )}
                                {meal.isCustom && (
                                  <span className="text-xs text-gray-500">(Manual)</span>
                                )}
                              </div>
                              <h4 className="font-medium">{meal.name}</h4>
                              <p className="text-sm text-gray-600 mt-1">
                                {meal.nutrition?.calories || 0} cal | 
                                P: {meal.nutrition?.protein || 0}g | 
                                C: {meal.nutrition?.carbs || 0}g | 
                                F: {meal.nutrition?.fat || 0}g
                              </p>
                              {meal.recipe && (
                                <button
                                  onClick={() => setSelectedMeal(meal)}
                                  className="text-sm text-blue-600 hover:text-blue-800 mt-2"
                                >
                                  View Recipe →
                                </button>
                              )}
                            </div>
                            
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleSwapMeals(dayIndex, mealIndex)}
                                className="p-1 text-gray-500 hover:text-gray-700"
                                title="Swap meal"
                              >
                                <Shuffle className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => toggleMealLock(dayIndex, mealIndex)}
                                className="p-1 text-gray-500 hover:text-gray-700"
                                title={meal.isLocked ? 'Unlock meal' : 'Lock meal'}
                              >
                                {meal.isLocked ? (
                                  <Unlock className="h-4 w-4" />
                                ) : (
                                  <Lock className="h-4 w-4" />
                                )}
                              </button>
                              <button
                                onClick={() => regenerateMeal(dayIndex, mealIndex)}
                                disabled={regenerating || meal.isLocked}
                                className="p-1 text-gray-500 hover:text-gray-700 disabled:text-gray-300"
                                title="Regenerate meal"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => removeMeal(dayIndex, mealIndex)}
                                className="p-1 text-gray-500 hover:text-red-600"
                                title="Remove meal"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      <button
                        onClick={() => {
                          setManualMealDay(dayIndex);
                          setShowManualAdd(true);
                        }}
                        className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600"
                      >
                        <Plus className="inline h-4 w-4 mr-2" />
                        Add Manual Meal
                      </button>
                    </div>
                    
                    {/* Day Totals */}
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">Day Total:</span>
                        <span>
                          {day.totals?.calories || 0} cal | 
                          P: {day.totals?.protein || 0}g | 
                          C: {day.totals?.carbs || 0}g | 
                          F: {day.totals?.fat || 0}g
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MealPlannerPage;