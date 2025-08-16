import React, { useState, useEffect } from 'react';
import { Calendar, TrendingUp, TrendingDown, AlertCircle, Check, X, ChevronLeft, ChevronRight, Info, Target, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LineChart, BarChart, DoughnutChart } from '../components/Charts';

export default function NutritionAnalysisPage() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedWeek, setSelectedWeek] = useState(getWeekDates(new Date()));
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [timeRange, setTimeRange] = useState('weekly'); // weekly or monthly for trends
  const [dailyData, setDailyData] = useState(null);
  const [weeklyData, setWeeklyData] = useState(null);
  const [monthlyData, setMonthlyData] = useState(null);
  const [userTargets, setUserTargets] = useState(null);
  const [loading, setLoading] = useState(false);

  // Helper function to get week dates
  function getWeekDates(date) {
    const week = [];
    const current = new Date(date);
    const first = current.getDate() - current.getDay();
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(current.setDate(first + i));
      week.push(day.toISOString().split('T')[0]);
    }
    return week;
  }

  // Get month dates
  function getMonthDates(month, year) {
    const dates = [];
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
      dates.push(new Date(year, month, i).toISOString().split('T')[0]);
    }
    return dates;
  }

  useEffect(() => {
    fetchUserTargets();
  }, []);

  useEffect(() => {
    if (activeTab === 'daily') {
      fetchDailyAnalysis();
    } else if (activeTab === 'weekly') {
      fetchWeeklyAnalysis();
    } else if (activeTab === 'trends') {
      if (timeRange === 'weekly') {
        fetchWeeklyAnalysis();
      } else {
        fetchMonthlyAnalysis();
      }
    }
  }, [selectedDate, selectedWeek, selectedMonth, activeTab, timeRange]);

  const fetchUserTargets = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/nutrition/preferences', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      if (res.ok) {
        const data = await res.json();
        setUserTargets({
          calories: data?.nutritionalTargets?.dailyCalories || 2000,
          protein: data?.nutritionalTargets?.macros?.protein?.grams || 50,
          carbs: data?.nutritionalTargets?.macros?.carbs?.grams || 250,
          fat: data?.nutritionalTargets?.macros?.fat?.grams || 65,
          fiber: data?.nutritionalTargets?.fiber || 25,
          sodium: data?.nutritionalTargets?.sodium || 2300
        });
      } else {
        // Default targets
        setUserTargets({
          calories: 2000,
          protein: 50,
          carbs: 250,
          fat: 65,
          fiber: 25,
          sodium: 2300
        });
      }
    } catch (error) {
      console.error('Error fetching targets:', error);
      setUserTargets({
        calories: 2000,
        protein: 50,
        carbs: 250,
        fat: 65,
        fiber: 25,
        sodium: 2300
      });
    }
  };

  const fetchDailyAnalysis = async () => {
    setLoading(true);
    try {
      // Mock data for demonstration
      setDailyData(getMockDailyData());
    } finally {
      setLoading(false);
    }
  };

  const fetchWeeklyAnalysis = async () => {
    setLoading(true);
    try {
      setWeeklyData(getMockWeeklyData());
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyAnalysis = async () => {
    setLoading(true);
    try {
      setMonthlyData(getMockMonthlyData());
    } finally {
      setLoading(false);
    }
  };

  // Mock data generators with deficit/surplus calculations
  const getMockDailyData = () => {
    const actualCalories = 1450 + Math.random() * 400;
    const targetCalories = userTargets?.calories || 2000;
    const deficit = targetCalories - actualCalories;
    
    return {
      date: selectedDate,
      meals: [
        {
          type: 'breakfast',
          name: 'Oatmeal with Berries',
          time: '08:00',
          nutrition: { calories: 350, protein: 12, carbs: 58, fat: 8, fiber: 8, sodium: 150 }
        },
        {
          type: 'lunch',
          name: 'Grilled Chicken Salad',
          time: '12:30',
          nutrition: { calories: 450, protein: 35, carbs: 30, fat: 18, fiber: 6, sodium: 580 }
        },
        {
          type: 'snack',
          name: 'Greek Yogurt',
          time: '15:00',
          nutrition: { calories: 150, protein: 12, carbs: 18, fat: 3, fiber: 0, sodium: 80 }
        },
        {
          type: 'dinner',
          name: 'Salmon with Vegetables',
          time: '19:00',
          nutrition: { calories: Math.round(actualCalories - 950), protein: 38, carbs: 35, fat: 24, fiber: 10, sodium: 420 }
        }
      ],
      totals: {
        calories: Math.round(actualCalories),
        protein: 97,
        carbs: 141,
        fat: 53,
        fiber: 24,
        sodium: 1230
      },
      targets: userTargets || {
        calories: 2000,
        protein: 50,
        carbs: 250,
        fat: 65,
        fiber: 25,
        sodium: 2300
      },
      deficit: Math.round(deficit),
      isDeficit: deficit > 0,
      score: 85
    };
  };

  const getMockWeeklyData = () => {
    const targetCalories = userTargets?.calories || 2000;
    const dailyData = selectedWeek.map((date, index) => {
      const actualCalories = 1400 + Math.random() * 600;
      const deficit = targetCalories - actualCalories;
      return {
        date,
        day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(date).getDay()],
        totals: {
          calories: Math.round(actualCalories),
          protein: 80 + Math.random() * 40,
          carbs: 150 + Math.random() * 100,
          fat: 45 + Math.random() * 30,
          fiber: 20 + Math.random() * 15,
          sodium: 1800 + Math.random() * 800
        },
        deficit: Math.round(deficit),
        isDeficit: deficit > 0,
        score: 70 + Math.random() * 30
      };
    });

    const weeklyTotalCalories = dailyData.reduce((sum, day) => sum + day.totals.calories, 0);
    const weeklyTargetCalories = targetCalories * 7;
    const weeklyDeficit = weeklyTargetCalories - weeklyTotalCalories;

    return {
      weekOf: selectedWeek[0],
      dailyData,
      averages: {
        calories: Math.round(weeklyTotalCalories / 7),
        protein: 95,
        carbs: 195,
        fat: 58,
        fiber: 26,
        sodium: 2100
      },
      totals: {
        weeklyCalories: Math.round(weeklyTotalCalories),
        weeklyTarget: weeklyTargetCalories,
        weeklyDeficit: Math.round(weeklyDeficit),
        isDeficit: weeklyDeficit > 0
      },
      trends: {
        calories: weeklyDeficit > 0 ? 'deficit' : 'surplus',
        consistency: 'good'
      }
    };
  };

  const getMockMonthlyData = () => {
    const dates = getMonthDates(selectedMonth, selectedYear);
    const targetCalories = userTargets?.calories || 2000;
    
    const dailyData = dates.map(date => {
      const actualCalories = 1400 + Math.random() * 600;
      const deficit = targetCalories - actualCalories;
      return {
        date,
        calories: Math.round(actualCalories),
        deficit: Math.round(deficit),
        isDeficit: deficit > 0
      };
    });

    const monthlyTotalCalories = dailyData.reduce((sum, day) => sum + day.calories, 0);
    const monthlyTargetCalories = targetCalories * dates.length;
    const monthlyDeficit = monthlyTargetCalories - monthlyTotalCalories;

    return {
      month: selectedMonth,
      year: selectedYear,
      dailyData,
      totals: {
        monthlyCalories: Math.round(monthlyTotalCalories),
        monthlyTarget: monthlyTargetCalories,
        monthlyDeficit: Math.round(monthlyDeficit),
        isDeficit: monthlyDeficit > 0,
        averageDaily: Math.round(monthlyTotalCalories / dates.length)
      }
    };
  };

  // Calculate percentage and get color for progress bars
  const calculatePercentage = (actual, target) => {
    if (!target) return 0;
    return Math.min(Math.round((actual / target) * 100), 150);
  };

  // Color-coded progress based on deficit/surplus
  const getProgressColor = (actual, target) => {
    const percentage = (actual / target) * 100;
    if (percentage < 90) return 'bg-blue-500'; // Deficit (under target)
    if (percentage >= 90 && percentage <= 110) return 'bg-green-500'; // On target
    return 'bg-red-500'; // Surplus (over target)
  };

  // Get text color for deficit/surplus
  const getDeficitSurplusColor = (value) => {
    if (value > 0) return 'text-blue-600'; // Deficit
    if (value < 0) return 'text-red-600'; // Surplus
    return 'text-green-600'; // Balanced
  };

  // Prepare trend line data for weekly view
  const prepareWeeklyTrendLine = (weeklyData) => {
    if (!weeklyData) return null;
    
    return {
      labels: weeklyData.dailyData.map(d => d.day),
      datasets: [
        {
          label: 'Daily Deficit/Surplus',
          data: weeklyData.dailyData.map(d => -d.deficit), // Negative for surplus visualization
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.3,
          fill: true,
          pointBackgroundColor: weeklyData.dailyData.map(d => 
            d.isDeficit ? '#3b82f6' : '#ef4444'
          ),
          pointRadius: 6,
          pointHoverRadius: 8
        },
        {
          label: 'Target Line',
          data: Array(7).fill(0),
          borderColor: '#10b981',
          borderDash: [5, 5],
          backgroundColor: 'transparent',
          pointRadius: 0
        }
      ]
    };
  };

  // Prepare trend line data for monthly view
  const prepareMonthlyTrendLine = (monthlyData) => {
    if (!monthlyData) return null;
    
    return {
      labels: monthlyData.dailyData.map(d => new Date(d.date).getDate()),
      datasets: [
        {
          label: 'Daily Deficit/Surplus',
          data: monthlyData.dailyData.map(d => -d.deficit),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.3,
          fill: true,
          pointBackgroundColor: monthlyData.dailyData.map(d => 
            d.isDeficit ? '#3b82f6' : '#ef4444'
          ),
          pointRadius: 4,
          pointHoverRadius: 6
        },
        {
          label: 'Target Line',
          data: Array(monthlyData.dailyData.length).fill(0),
          borderColor: '#10b981',
          borderDash: [5, 5],
          backgroundColor: 'transparent',
          pointRadius: 0
        }
      ]
    };
  };

  // Prepare comparison chart
  const prepareComparisonChart = (data, isWeekly = false) => {
    if (!data) return null;
    
    const labels = isWeekly 
      ? data.dailyData.map(d => d.day)
      : ['Actual', 'Target'];
    
    const actualData = isWeekly
      ? data.dailyData.map(d => d.totals.calories)
      : [data.totals.calories];
    
    const targetData = isWeekly
      ? Array(7).fill(userTargets?.calories || 2000)
      : [userTargets?.calories || 2000];
    
    return {
      labels,
      datasets: [
        {
          label: 'Actual Intake',
          data: actualData,
          backgroundColor: actualData.map(val => {
            const target = userTargets?.calories || 2000;
            if (val < target * 0.9) return 'rgba(59, 130, 246, 0.8)'; // Deficit
            if (val > target * 1.1) return 'rgba(239, 68, 68, 0.8)'; // Surplus
            return 'rgba(34, 197, 94, 0.8)'; // On target
          })
        },
        {
          label: 'Target',
          data: targetData,
          backgroundColor: 'rgba(156, 163, 175, 0.3)',
          borderColor: 'rgba(156, 163, 175, 1)',
          borderWidth: 2,
          type: 'line'
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
            Track your nutritional intake, compare to goals, and monitor your progress
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
                Weekly Comparison
              </button>
              <button
                onClick={() => setActiveTab('trends')}
                className={`py-3 px-6 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'trends'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Trend Analysis
              </button>
            </nav>
          </div>

          {/* Date/Period Selection */}
          <div className="p-4">
            {activeTab === 'daily' && (
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    const prev = new Date(selectedDate);
                    prev.setDate(prev.getDate() - 1);
                    setSelectedDate(prev.toISOString().split('T')[0]);
                  }}
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-gray-500" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3 py-1 border rounded"
                  />
                </div>
                <button
                  onClick={() => {
                    const next = new Date(selectedDate);
                    next.setDate(next.getDate() + 1);
                    setSelectedDate(next.toISOString().split('T')[0]);
                  }}
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            )}
            
            {activeTab === 'weekly' && (
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    const firstDay = new Date(selectedWeek[0]);
                    firstDay.setDate(firstDay.getDate() - 7);
                    setSelectedWeek(getWeekDates(firstDay));
                  }}
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Week of</p>
                  <p className="font-medium">
                    {new Date(selectedWeek[0]).toLocaleDateString()} - {new Date(selectedWeek[6]).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => {
                    const firstDay = new Date(selectedWeek[0]);
                    firstDay.setDate(firstDay.getDate() + 7);
                    setSelectedWeek(getWeekDates(firstDay));
                  }}
                  className="p-2 hover:bg-gray-100 rounded"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            )}

            {activeTab === 'trends' && (
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={() => setTimeRange('weekly')}
                    className={`px-4 py-2 rounded ${
                      timeRange === 'weekly' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Weekly Trends
                  </button>
                  <button
                    onClick={() => setTimeRange('monthly')}
                    className={`px-4 py-2 rounded ${
                      timeRange === 'monthly' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Monthly Trends
                  </button>
                </div>
                
                {timeRange === 'monthly' && (
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                      className="px-3 py-1 border rounded"
                    >
                      {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, i) => (
                        <option key={i} value={i}>{month}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                      className="px-3 py-1 border rounded w-20"
                      min="2020"
                      max="2030"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading analysis...</p>
          </div>
        )}

        {/* Daily Analysis View */}
        {!loading && activeTab === 'daily' && dailyData && (
          <div className="space-y-6">
            {/* Key Metrics with Deficit/Surplus */}
            <div className="grid md:grid-cols-4 gap-4">
              {/* Calorie Intake vs Target */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600">Calorie Intake</h3>
                  <Target className="h-4 w-4 text-gray-400" />
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {dailyData.totals.calories} kcal
                </div>
                <div className="text-sm text-gray-500">
                  Target: {dailyData.targets.calories} kcal
                </div>
                <div className={`text-sm font-medium mt-2 ${getDeficitSurplusColor(dailyData.deficit)}`}>
                  {dailyData.isDeficit ? '↓' : '↑'} {Math.abs(dailyData.deficit)} kcal {dailyData.isDeficit ? 'deficit' : 'surplus'}
                </div>
              </div>

              {/* Progress Bar Card */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-600 mb-2">Daily Progress</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Calories</span>
                    <span>{calculatePercentage(dailyData.totals.calories, dailyData.targets.calories)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${getProgressColor(dailyData.totals.calories, dailyData.targets.calories)}`}
                      style={{ width: `${calculatePercentage(dailyData.totals.calories, dailyData.targets.calories)}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 text-center">
                    {dailyData.totals.calories < dailyData.targets.calories * 0.9 && '🔵 Deficit'}
                    {dailyData.totals.calories >= dailyData.targets.calories * 0.9 && dailyData.totals.calories <= dailyData.targets.calories * 1.1 && '🟢 On Target'}
                    {dailyData.totals.calories > dailyData.targets.calories * 1.1 && '🔴 Surplus'}
                  </div>
                </div>
              </div>

              {/* Macro Distribution */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-600 mb-2">Macro Split</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Protein</span>
                    <span className="font-medium">{dailyData.totals.protein}g</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Carbs</span>
                    <span className="font-medium">{dailyData.totals.carbs}g</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fat</span>
                    <span className="font-medium">{dailyData.totals.fat}g</span>
                  </div>
                </div>
              </div>

              {/* Daily Score */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-600 mb-2">Nutrition Score</h3>
                <div className="text-3xl font-bold text-gray-900">{dailyData.score}/100</div>
                <div className="text-sm text-gray-500">
                  {dailyData.score >= 80 ? 'Excellent' : dailyData.score >= 60 ? 'Good' : 'Needs Improvement'}
                </div>
              </div>
            </div>

            {/* Comparison to Goals - Bar Chart */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Daily Intake vs Goals</h3>
              <BarChart
                data={prepareComparisonChart(dailyData)}
                options={{
                  plugins: {
                    legend: { display: true },
                    title: {
                      display: true,
                      text: 'Actual vs Target Calories'
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      title: {
                        display: true,
                        text: 'Calories (kcal)'
                      }
                    }
                  }
                }}
              />
            </div>

            {/* Color-Coded Progress Bars for All Nutrients */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Nutritional Targets Progress</h3>
              <div className="space-y-4">
                {Object.entries(dailyData.totals).map(([nutrient, value]) => {
                  const target = dailyData.targets[nutrient];
                  if (!target) return null;
                  const percentage = calculatePercentage(value, target);
                  const color = getProgressColor(value, target);
                  
                  return (
                    <div key={nutrient}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium capitalize">{nutrient}</span>
                        <span className="text-sm">
                          {value}{nutrient === 'sodium' ? 'mg' : nutrient === 'calories' ? ' kcal' : 'g'} / {target}{nutrient === 'sodium' ? 'mg' : nutrient === 'calories' ? ' kcal' : 'g'}
                          <span className="text-gray-500 ml-2">({percentage}%)</span>
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${color}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center justify-center gap-4 text-xs">
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div> Deficit
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-500 rounded"></div> On Target
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-500 rounded"></div> Surplus
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Weekly Comparison View */}
        {!loading && activeTab === 'weekly' && weeklyData && (
          <div className="space-y-6">
            {/* Weekly Summary Cards */}
            <div className="grid md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow p-4">
                <h4 className="text-sm font-medium text-gray-500 mb-1">Weekly Total</h4>
                <p className="text-2xl font-bold">{weeklyData.totals.weeklyCalories.toLocaleString()} kcal</p>
                <p className="text-xs text-gray-500">Target: {weeklyData.totals.weeklyTarget.toLocaleString()} kcal</p>
              </div>
              
              <div className="bg-white rounded-lg shadow p-4">
                <h4 className="text-sm font-medium text-gray-500 mb-1">Weekly Balance</h4>
                <p className={`text-2xl font-bold ${getDeficitSurplusColor(weeklyData.totals.weeklyDeficit)}`}>
                  {weeklyData.totals.isDeficit ? '↓' : '↑'} {Math.abs(weeklyData.totals.weeklyDeficit)} kcal
                </p>
                <p className="text-xs text-gray-500">
                  {weeklyData.totals.isDeficit ? 'Deficit' : 'Surplus'}
                </p>
              </div>
              
              <div className="bg-white rounded-lg shadow p-4">
                <h4 className="text-sm font-medium text-gray-500 mb-1">Daily Average</h4>
                <p className="text-2xl font-bold">{weeklyData.averages.calories} kcal</p>
                <p className="text-xs text-gray-500">Target: {userTargets?.calories || 2000} kcal</p>
              </div>
              
              <div className="bg-white rounded-lg shadow p-4">
                <h4 className="text-sm font-medium text-gray-500 mb-1">Trend</h4>
                <div className="flex items-center">
                  {weeklyData.trends.calories === 'deficit' ? (
                    <TrendingDown className="h-6 w-6 text-blue-500 mr-2" />
                  ) : (
                    <TrendingUp className="h-6 w-6 text-red-500 mr-2" />
                  )}
                  <p className="text-2xl font-bold capitalize">{weeklyData.trends.calories}</p>
                </div>
              </div>
            </div>

            {/* Daily Comparison Bar Chart */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Daily Intake Comparison</h3>
              <BarChart
                data={prepareComparisonChart(weeklyData, true)}
                options={{
                  plugins: {
                    legend: { display: true },
                    title: {
                      display: true,
                      text: 'Daily Calories vs Target Throughout the Week'
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      title: {
                        display: true,
                        text: 'Calories (kcal)'
                      }
                    }
                  }
                }}
              />
            </div>

            {/* Weekly Deficit/Surplus Table */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Daily Deficit/Surplus Breakdown</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Day</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Intake</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {weeklyData.dailyData.map((day, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{day.day}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(day.date).toLocaleDateString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{day.totals.calories} kcal</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{userTargets?.calories || 2000} kcal</td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getDeficitSurplusColor(day.deficit)}`}>
                          {day.isDeficit ? '↓' : '↑'} {Math.abs(day.deficit)} kcal
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            day.isDeficit ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {day.isDeficit ? 'Deficit' : 'Surplus'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Trends View with Trend Lines */}
        {!loading && activeTab === 'trends' && (
          <div className="space-y-6">
            {/* Trend Summary */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  {timeRange === 'weekly' ? 'Weekly' : 'Monthly'} Caloric Trend Analysis
                </h3>
                <Activity className="h-5 w-5 text-gray-400" />
              </div>
              
              {/* Info Box */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                  <Info className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium mb-1">Understanding Your Trend Line:</p>
                    <ul className="space-y-1">
                      <li>• <span className="font-medium">Below zero line (blue area)</span>: Caloric deficit days</li>
                      <li>• <span className="font-medium">Above zero line (red area)</span>: Caloric surplus days</li>
                      <li>• <span className="font-medium">Green dashed line</span>: Your balance target (maintenance)</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Trend Line Chart */}
              {timeRange === 'weekly' && weeklyData && (
                <>
                  <LineChart
                    data={prepareWeeklyTrendLine(weeklyData)}
                    options={{
                      plugins: {
                        legend: { display: true },
                        title: {
                          display: true,
                          text: 'Daily Caloric Deficit/Surplus Trend'
                        },
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              const value = context.parsed.y;
                              if (context.datasetIndex === 0) {
                                return value > 0 
                                  ? `Surplus: ${Math.abs(value)} kcal` 
                                  : `Deficit: ${Math.abs(value)} kcal`;
                              }
                              return 'Target Balance';
                            }
                          }
                        }
                      },
                      scales: {
                        y: {
                          title: {
                            display: true,
                            text: '← Deficit (kcal) | Surplus (kcal) →'
                          },
                          grid: {
                            color: (context) => {
                              if (context.tick.value === 0) {
                                return '#10b981';
                              }
                              return 'rgba(0, 0, 0, 0.1)';
                            },
                            lineWidth: (context) => {
                              if (context.tick.value === 0) {
                                return 2;
                              }
                              return 1;
                            }
                          }
                        }
                      }
                    }}
                  />
                  
                  {/* Weekly Summary Stats */}
                  <div className="grid md:grid-cols-3 gap-4 mt-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600">Total Weekly Deficit</p>
                      <p className="text-xl font-bold text-blue-600">
                        {weeklyData.dailyData.filter(d => d.isDeficit).reduce((sum, d) => sum + Math.abs(d.deficit), 0)} kcal
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600">Total Weekly Surplus</p>
                      <p className="text-xl font-bold text-red-600">
                        {weeklyData.dailyData.filter(d => !d.isDeficit).reduce((sum, d) => sum + Math.abs(d.deficit), 0)} kcal
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600">Net Weekly Balance</p>
                      <p className={`text-xl font-bold ${getDeficitSurplusColor(weeklyData.totals.weeklyDeficit)}`}>
                        {weeklyData.totals.isDeficit ? '↓' : '↑'} {Math.abs(weeklyData.totals.weeklyDeficit)} kcal
                      </p>
                    </div>
                  </div>
                </>
              )}

              {timeRange === 'monthly' && monthlyData && (
                <>
                  <LineChart
                    data={prepareMonthlyTrendLine(monthlyData)}
                    options={{
                      plugins: {
                        legend: { display: true },
                        title: {
                          display: true,
                          text: `Daily Caloric Deficit/Surplus Trend - ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][selectedMonth]} ${selectedYear}`
                        },
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              const value = context.parsed.y;
                              if (context.datasetIndex === 0) {
                                return value > 0 
                                  ? `Surplus: ${Math.abs(value)} kcal` 
                                  : `Deficit: ${Math.abs(value)} kcal`;
                              }
                              return 'Target Balance';
                            }
                          }
                        }
                      },
                      scales: {
                        y: {
                          title: {
                            display: true,
                            text: '← Deficit (kcal) | Surplus (kcal) →'
                          },
                          grid: {
                            color: (context) => {
                              if (context.tick.value === 0) {
                                return '#10b981';
                              }
                              return 'rgba(0, 0, 0, 0.1)';
                            },
                            lineWidth: (context) => {
                              if (context.tick.value === 0) {
                                return 2;
                              }
                              return 1;
                            }
                          }
                        },
                        x: {
                          title: {
                            display: true,
                            text: 'Day of Month'
                          }
                        }
                      }
                    }}
                  />
                  
                  {/* Monthly Summary Stats */}
                  <div className="grid md:grid-cols-4 gap-4 mt-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600">Monthly Average</p>
                      <p className="text-xl font-bold">{monthlyData.totals.averageDaily} kcal/day</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600">Days in Deficit</p>
                      <p className="text-xl font-bold text-blue-600">
                        {monthlyData.dailyData.filter(d => d.isDeficit).length} days
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600">Days in Surplus</p>
                      <p className="text-xl font-bold text-red-600">
                        {monthlyData.dailyData.filter(d => !d.isDeficit).length} days
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-600">Net Monthly Balance</p>
                      <p className={`text-xl font-bold ${getDeficitSurplusColor(monthlyData.totals.monthlyDeficit)}`}>
                        {monthlyData.totals.isDeficit ? '↓' : '↑'} {Math.abs(monthlyData.totals.monthlyDeficit)} kcal
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}