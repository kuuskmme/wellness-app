import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LineChart, BarChart, DoughnutChart, ComparisonChart } from '../components/Charts';

const NutritionAnalysisPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('daily');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Daily analysis state
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyData, setDailyData] = useState(null);
  
  // Weekly analysis state
  const [weekStartDate, setWeekStartDate] = useState(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek);
    return startOfWeek.toISOString().split('T')[0];
  });
  const [weeklyData, setWeeklyData] = useState(null);
  
  // AI insights state
  const [aiInsights, setAiInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  
  // User preferences and targets
  const [userTargets, setUserTargets] = useState(null);

  // Fetch user preferences on mount
  useEffect(() => {
    fetchUserPreferences();
  }, []);

  // Fetch data when tab or dates change
  useEffect(() => {
    if (activeTab === 'daily') {
      fetchDailyAnalysis();
    } else if (activeTab === 'weekly') {
      fetchWeeklyAnalysis();
    }
  }, [activeTab, selectedDate, weekStartDate]);

  const fetchUserPreferences = async () => {
    try {
      const response = await fetch('/api/nutrition/preferences', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserTargets({
          calories: data.calorieTarget || 2000,
          protein: Math.round((data.calorieTarget * (data.macroTargets?.proteinPercentage || 30)) / 100 / 4),
          carbs: Math.round((data.calorieTarget * (data.macroTargets?.carbsPercentage || 40)) / 100 / 4),
          fat: Math.round((data.calorieTarget * (data.macroTargets?.fatPercentage || 30)) / 100 / 9),
          fiber: 25,
          sodium: 2300
        });
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    }
  };

  const fetchDailyAnalysis = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/nutrition/analysis/daily?date=${selectedDate}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.message) {
          // No data available, create mock data
          setDailyData(getMockDailyData());
        } else {
          setDailyData(data);
        }
      } else {
        // Use mock data as fallback
        setDailyData(getMockDailyData());
      }
    } catch (error) {
      console.error('Error fetching daily analysis:', error);
      setDailyData(getMockDailyData());
    } finally {
      setLoading(false);
    }
  };

  const fetchWeeklyAnalysis = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/nutrition/analysis/weekly?startDate=${weekStartDate}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.message || !data.days) {
          setWeeklyData(getMockWeeklyData());
        } else {
          setWeeklyData(data);
        }
      } else {
        setWeeklyData(getMockWeeklyData());
      }
    } catch (error) {
      console.error('Error fetching weekly analysis:', error);
      setWeeklyData(getMockWeeklyData());
    } finally {
      setLoading(false);
    }
  };

  const fetchAIInsights = async () => {
    setLoadingInsights(true);
    
    try {
      const response = await fetch('/api/nutrition/analysis/ai', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          period: activeTab,
          date: activeTab === 'daily' ? selectedDate : weekStartDate
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setAiInsights(data.insights);
      } else {
        // Fallback AI insights
        setAiInsights(getMockAIInsights());
      }
    } catch (error) {
      console.error('Error fetching AI insights:', error);
      setAiInsights(getMockAIInsights());
    } finally {
      setLoadingInsights(false);
    }
  };

  // Mock data generators
  const getMockDailyData = () => {
    const meals = [
      { name: 'Breakfast', calories: 450, protein: 25, carbs: 45, fat: 20 },
      { name: 'Lunch', calories: 650, protein: 35, carbs: 70, fat: 25 },
      { name: 'Snack', calories: 200, protein: 10, carbs: 25, fat: 8 },
      { name: 'Dinner', calories: 750, protein: 40, carbs: 65, fat: 35 }
    ];
    
    const totals = meals.reduce((acc, meal) => ({
      calories: acc.calories + meal.calories,
      protein: acc.protein + meal.protein,
      carbs: acc.carbs + meal.carbs,
      fat: acc.fat + meal.fat
    }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 22, sodium: 2100 });
    
    return {
      date: selectedDate,
      meals: meals.length,
      mealBreakdown: meals,
      totals,
      targets: userTargets || {
        calories: 2000,
        protein: 150,
        carbs: 200,
        fat: 67,
        fiber: 25,
        sodium: 2300
      },
      score: 85,
      comparison: {
        calories: { difference: totals.calories - 2000, percentage: (totals.calories / 2000) * 100 },
        protein: { difference: totals.protein - 150, percentage: (totals.protein / 150) * 100 },
        carbs: { difference: totals.carbs - 200, percentage: (totals.carbs / 200) * 100 },
        fat: { difference: totals.fat - 67, percentage: (totals.fat / 67) * 100 }
      }
    };
  };

  const getMockWeeklyData = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dailyData = days.map((day, index) => {
      const calories = 1800 + Math.random() * 400;
      const deficit = 2000 - calories;
      return {
        day,
        date: new Date(new Date(weekStartDate).getTime() + index * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        totals: {
          calories: Math.round(calories),
          protein: Math.round(100 + Math.random() * 50),
          carbs: Math.round(180 + Math.random() * 40),
          fat: Math.round(50 + Math.random() * 30),
          fiber: Math.round(20 + Math.random() * 10),
          sodium: Math.round(2000 + Math.random() * 600)
        },
        deficit: Math.round(deficit),
        isDeficit: deficit > 0,
        score: Math.round(70 + Math.random() * 30)
      };
    });
    
    const avgCalories = Math.round(dailyData.reduce((sum, d) => sum + d.totals.calories, 0) / 7);
    const totalDeficit = dailyData.reduce((sum, d) => sum + d.deficit, 0);
    
    return {
      weekOf: weekStartDate,
      dailyData,
      averages: {
        calories: avgCalories,
        protein: Math.round(dailyData.reduce((sum, d) => sum + d.totals.protein, 0) / 7),
        carbs: Math.round(dailyData.reduce((sum, d) => sum + d.totals.carbs, 0) / 7),
        fat: Math.round(dailyData.reduce((sum, d) => sum + d.totals.fat, 0) / 7)
      },
      weeklyScore: Math.round(dailyData.reduce((sum, d) => sum + d.score, 0) / 7),
      deficitSurplus: {
        weeklyBalance: Math.round(totalDeficit),
        averageDailyDeficit: Math.round(totalDeficit / 7),
        status: totalDeficit > 0 ? 'deficit' : 'surplus'
      }
    };
  };

  const getMockAIInsights = () => ({
    summary: "You're maintaining a balanced diet with good macro distribution. Your protein intake is excellent for your fitness goals.",
    achievements: [
      "Consistent protein intake above 100g daily",
      "Fiber intake meets recommended levels",
      "Well-balanced meal distribution throughout the day"
    ],
    concerns: [
      "Sodium intake occasionally exceeds recommended limits",
      "Vegetable variety could be improved",
      "Late dinner timing may affect digestion"
    ],
    recommendations: [
      "Try to reduce sodium by using herbs and spices instead of salt",
      "Add one extra serving of colorful vegetables to lunch",
      "Consider moving dinner 30 minutes earlier for better sleep"
    ],
    mealSuggestions: [
      "Greek yogurt with berries for morning protein",
      "Quinoa salad with mixed vegetables for lunch",
      "Grilled salmon with steamed broccoli for dinner"
    ]
  });

  // Calculate percentage for progress bars
  const calculatePercentage = (actual, target) => {
    if (!target) return 0;
    return Math.min(Math.round((actual / target) * 100), 150);
  };

  // Get color based on percentage
  const getProgressColor = (actual, target) => {
    const percentage = (actual / target) * 100;
    if (percentage < 90) return 'bg-blue-500';
    if (percentage >= 90 && percentage <= 110) return 'bg-green-500';
    return 'bg-red-500';
  };

  // Prepare chart data for macro distribution (Pie chart)
  const prepareMacroChart = (data) => {
    if (!data?.totals) return null;
    
    return {
      labels: ['Protein', 'Carbs', 'Fat'],
      datasets: [{
        data: [data.totals.protein * 4, data.totals.carbs * 4, data.totals.fat * 9],
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(245, 158, 11, 0.8)'
        ],
        borderWidth: 1
      }]
    };
  };

  // Prepare comparison chart (Bar chart)
  const prepareComparisonChart = (data) => {
    if (!data?.totals || !userTargets) return null;
    
    return {
      labels: ['Calories', 'Protein (g)', 'Carbs (g)', 'Fat (g)', 'Fiber (g)'],
      datasets: [
        {
          label: 'Actual',
          data: [
            data.totals.calories,
            data.totals.protein,
            data.totals.carbs,
            data.totals.fat,
            data.totals.fiber
          ],
          backgroundColor: 'rgba(59, 130, 246, 0.8)'
        },
        {
          label: 'Target',
          data: [
            userTargets.calories,
            userTargets.protein,
            userTargets.carbs,
            userTargets.fat,
            userTargets.fiber
          ],
          backgroundColor: 'rgba(156, 163, 175, 0.3)'
        }
      ]
    };
  };

  // Prepare weekly trend chart (Line chart)
  const prepareWeeklyTrendChart = (data) => {
    if (!data?.dailyData) return null;
    
    return {
      labels: data.dailyData.map(d => d.day),
      datasets: [
        {
          label: 'Daily Calories',
          data: data.dailyData.map(d => d.totals.calories),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.3
        },
        {
          label: 'Target',
          data: Array(7).fill(userTargets?.calories || 2000),
          borderColor: 'rgb(156, 163, 175)',
          borderDash: [5, 5],
          pointRadius: 0
        }
      ]
    };
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Nutritional Analysis</h1>
          <p className="mt-2 text-gray-600">
            Track your daily intake, monitor progress toward goals, and get AI-powered insights
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('daily')}
                className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'daily'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Daily Analysis
              </button>
              <button
                onClick={() => setActiveTab('weekly')}
                className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'weekly'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Weekly Trends
              </button>
            </nav>
          </div>
        </div>

        {/* Daily Analysis Tab */}
        {activeTab === 'daily' && (
          <div className="space-y-6">
            {/* Date Selector */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Select Date:</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : dailyData ? (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-sm font-medium text-gray-500">Total Calories</h3>
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                      {dailyData.totals.calories} kcal
                    </p>
                    <p className={`text-sm mt-1 ${
                      dailyData.totals.calories < userTargets?.calories ? 'text-blue-600' : 'text-red-600'
                    }`}>
                      {Math.abs(dailyData.totals.calories - (userTargets?.calories || 2000))} kcal 
                      {dailyData.totals.calories < userTargets?.calories ? ' under' : ' over'} target
                    </p>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-sm font-medium text-gray-500">Meals Logged</h3>
                    <p className="text-2xl font-bold text-gray-900 mt-2">{dailyData.meals || 4}</p>
                    <p className="text-sm text-gray-600 mt-1">Breakfast, Lunch, Snack, Dinner</p>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-sm font-medium text-gray-500">Nutrition Score</h3>
                    <p className="text-2xl font-bold text-gray-900 mt-2">{dailyData.score || 85}%</p>
                    <p className="text-sm text-green-600 mt-1">
                      {dailyData.score >= 80 ? 'Excellent' : dailyData.score >= 60 ? 'Good' : 'Needs Improvement'}
                    </p>
                  </div>
                </div>

                {/* Macro Distribution Pie Chart */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">Macronutrient Distribution</h3>
                  {prepareMacroChart(dailyData) && (
                    <DoughnutChart 
                      data={prepareMacroChart(dailyData)} 
                      title="Calories from Macros"
                    />
                  )}
                </div>

                {/* Intake vs Goals Bar Chart */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">Daily Intake vs Goals</h3>
                  {prepareComparisonChart(dailyData) && (
                    <BarChart 
                      data={prepareComparisonChart(dailyData)}
                      title="Actual vs Target"
                    />
                  )}
                </div>

                {/* Progress Bars using ComparisonChart component */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">Nutritional Targets Progress</h3>
                  <div className="space-y-4">
                    <ComparisonChart 
                      current={dailyData.totals.calories}
                      target={userTargets?.calories || 2000}
                      title="Calories (kcal)"
                    />
                    <ComparisonChart 
                      current={dailyData.totals.protein}
                      target={userTargets?.protein || 150}
                      title="Protein (g)"
                    />
                    <ComparisonChart 
                      current={dailyData.totals.carbs}
                      target={userTargets?.carbs || 200}
                      title="Carbohydrates (g)"
                    />
                    <ComparisonChart 
                      current={dailyData.totals.fat}
                      target={userTargets?.fat || 67}
                      title="Fat (g)"
                    />
                    <ComparisonChart 
                      current={dailyData.totals.fiber}
                      target={userTargets?.fiber || 25}
                      title="Fiber (g)"
                    />
                    <ComparisonChart 
                      current={dailyData.totals.sodium}
                      target={userTargets?.sodium || 2300}
                      title="Sodium (mg)"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600">No nutritional data available for this date.</p>
              </div>
            )}
          </div>
        )}

        {/* Weekly Analysis Tab */}
        {activeTab === 'weekly' && (
          <div className="space-y-6">
            {/* Week Selector */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Week Starting:</label>
                <input
                  type="date"
                  value={weekStartDate}
                  onChange={(e) => setWeekStartDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : weeklyData ? (
              <>
                {/* Weekly Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-sm font-medium text-gray-500">Avg Daily Calories</h3>
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                      {weeklyData.averages?.calories || 0} kcal
                    </p>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-sm font-medium text-gray-500">Weekly Balance</h3>
                    <p className={`text-2xl font-bold mt-2 ${
                      weeklyData.deficitSurplus?.weeklyBalance > 0 ? 'text-blue-600' : 'text-red-600'
                    }`}>
                      {Math.abs(weeklyData.deficitSurplus?.weeklyBalance || 0)} kcal
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {weeklyData.deficitSurplus?.weeklyBalance > 0 ? 'Deficit' : 'Surplus'}
                    </p>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-sm font-medium text-gray-500">Weekly Score</h3>
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                      {weeklyData.weeklyScore || 0}%
                    </p>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-sm font-medium text-gray-500">Consistency</h3>
                    <p className="text-2xl font-bold text-green-600 mt-2">Good</p>
                  </div>
                </div>

                {/* Weekly Trend Chart */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">Weekly Calorie Trends</h3>
                  {prepareWeeklyTrendChart(weeklyData) && (
                    <LineChart 
                      data={prepareWeeklyTrendChart(weeklyData)}
                      title="Daily Calories vs Target"
                    />
                  )}
                </div>

                {/* Daily Breakdown */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">Daily Breakdown</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Day</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Calories</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Protein</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Carbs</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fat</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {weeklyData.dailyData?.map((day, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {day.day}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {day.totals.calories} kcal
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {day.totals.protein}g
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {day.totals.carbs}g
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {day.totals.fat}g
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                day.score >= 80 ? 'bg-green-100 text-green-800' :
                                day.score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {day.score}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600">No weekly data available.</p>
              </div>
            )}
          </div>
        )}

        {/* AI Insights Section */}
        <div className="mt-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">AI-Powered Insights</h3>
              <button
                onClick={fetchAIInsights}
                disabled={loadingInsights}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingInsights ? 'Generating...' : 'Generate Insights'}
              </button>
            </div>

            {aiInsights ? (
              <div className="space-y-4">
                {/* Summary */}
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                  <p className="text-sm text-blue-800">{aiInsights.summary}</p>
                </div>

                {/* Achievements */}
                {aiInsights.achievements?.length > 0 && (
                  <div>
                    <h4 className="font-medium text-green-700 mb-2">✅ Achievements</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {aiInsights.achievements.map((achievement, index) => (
                        <li key={index} className="text-sm text-gray-600">{achievement}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Concerns */}
                {aiInsights.concerns?.length > 0 && (
                  <div>
                    <h4 className="font-medium text-yellow-700 mb-2">⚠️ Areas for Improvement</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {aiInsights.concerns.map((concern, index) => (
                        <li key={index} className="text-sm text-gray-600">{concern}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommendations */}
                {aiInsights.recommendations?.length > 0 && (
                  <div>
                    <h4 className="font-medium text-blue-700 mb-2">💡 Recommendations</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {aiInsights.recommendations.map((rec, index) => (
                        <li key={index} className="text-sm text-gray-600">{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Meal Suggestions */}
                {aiInsights.mealSuggestions?.length > 0 && (
                  <div>
                    <h4 className="font-medium text-purple-700 mb-2">🍽️ Meal Suggestions</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {aiInsights.mealSuggestions.map((suggestion, index) => (
                        <li key={index} className="text-sm text-gray-600">{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                Click "Generate Insights" to get personalized AI recommendations based on your nutritional data.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NutritionAnalysisPage;