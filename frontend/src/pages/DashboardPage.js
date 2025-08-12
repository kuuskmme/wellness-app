
import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  LineChart,
  BarChart,
  DoughnutChart,
  GaugeChart,
  ActivityHeatmap,
  ProgressRing,
  Sparkline,
  ComparisonChart
} from '../components/Charts';

const DashboardPage = () => {
  const { user } = useAuth();
  
  const [profile, setProfile] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);
  const [weeklySummary, setWeeklySummary] = useState(null);
  const [progressData, setProgressData] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedMetric, setSelectedMetric] = useState('weight');
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (selectedMetric && selectedPeriod) {
      fetchProgressData();
    }
  }, [selectedMetric, selectedPeriod]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch all data in parallel
      const [profileRes, metricsRes, insightsRes, summaryRes, historyRes] = await Promise.all([
        axios.get('/api/health-profile', { headers }).catch(() => null),
        axios.get('/api/analytics/health-metrics', { headers }).catch(() => null),
        axios.get('/api/analytics/ai-insights', { headers }).catch(() => null),
        axios.get('/api/analytics/health-summary/weekly', { headers }).catch(() => null),
        axios.get('/api/analytics/health-history?period=daily&limit=30', { headers }).catch(() => null)
      ]);

      if (profileRes?.data) setProfile(profileRes.data.profile);
      if (metricsRes?.data) setMetrics(metricsRes.data.metrics);
      if (insightsRes?.data) setAiInsights(insightsRes.data.insights);
      if (summaryRes?.data) setWeeklySummary(summaryRes.data);
      if (historyRes?.data) setHistoryData(historyRes.data);

      // Record daily snapshot
      await axios.post('/api/analytics/health-history', {}, { headers }).catch(() => {});
    } catch (error) {
      console.error('Dashboard data error:', error);
      setError('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProgressData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/analytics/progress-data', {
        params: { metric: selectedMetric, period: selectedPeriod },
        headers: { Authorization: `Bearer ${token}` }
      });
      setProgressData(response.data);
    } catch (error) {
      console.error('Progress data error:', error);
    }
  };

  const generateNewInsights = async () => {
    try {
      setInsightsLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/analytics/ai-insights', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAiInsights(response.data.insights);
    } catch (error) {
      console.error('Generate insights error:', error);
      setError('Failed to generate new insights');
    } finally {
      setInsightsLoading(false);
    }
  };

  const provideFeedback = async (recommendationId, helpful) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/analytics/ai-insights/feedback', {
        insightId: aiInsights._id,
        helpful,
        applied: helpful ? [recommendationId] : []
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Feedback error:', error);
    }
  };

  // Prepare chart data
  const prepareProgressChartData = () => {
    if (!progressData?.data || progressData.data.length === 0) return null;

    return {
      labels: progressData.data.map(d => new Date(d.date).toLocaleDateString()),
      datasets: [{
        label: selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1),
        data: progressData.data.map(d => d.value),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4
      }]
    };
  };

  const prepareWellnessScoreChartData = () => {
    if (!metrics?.wellnessScore?.components) return null;

    return {
      labels: Object.keys(metrics.wellnessScore.components).map(k => 
        k.charAt(0).toUpperCase() + k.slice(1)
      ),
      datasets: [{
        label: 'Score Components',
        data: Object.values(metrics.wellnessScore.components),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(251, 146, 60, 0.8)',
          'rgba(147, 51, 234, 0.8)'
        ],
        borderWidth: 0
      }]
    };
  };

  const prepareActivityHeatmapData = () => {
    if (!historyData?.history) return [];
    
    return historyData.history.map(record => ({
      date: new Date(record.period.startDate).toLocaleDateString(),
      count: record.activity?.weeklyFrequency || 0
    }));
  };

  const prepareSparklineData = () => {
    if (!historyData?.history || historyData.history.length < 7) {
      return Array(7).fill(0);
    }
    
    return historyData.history
      .slice(0, 7)
      .reverse()
      .map(h => h.metrics?.wellnessScore?.overall || 0);
  };

  const getBMIColor = (bmi) => {
    if (!bmi) return 'text-gray-500';
    if (bmi < 18.5) return 'text-yellow-600';
    if (bmi < 25) return 'text-green-600';
    if (bmi < 30) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreColor = (score) => {
    if (!score) return '#e5e7eb';
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    if (score >= 40) return '#fb923c';
    return '#ef4444';
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical':
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl">Loading dashboard...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <h2 className="text-2xl font-bold mb-4">Complete Your Profile</h2>
          <p className="text-gray-700 mb-4">
            Please complete your health profile to access your personalized dashboard and AI insights.
          </p>
          <Link 
            to="/profile" 
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Complete Profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Health Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Welcome back, {user?.email?.split('@')[0]}! Here's your wellness overview.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Quick Stats Cards */}
      <div className="grid lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-600">Wellness Score</p>
              <p className="text-2xl font-bold">{metrics?.wellnessScore?.overall || 0}</p>
            </div>
            <div className="w-16">
              <Sparkline 
                data={prepareSparklineData()} 
                color={getScoreColor(metrics?.wellnessScore?.overall)}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Current BMI</p>
          <p className={`text-2xl font-bold ${getBMIColor(metrics?.bmi?.value)}`}>
            {metrics?.bmi?.value?.toFixed(1) || '--'}
          </p>
          <p className="text-xs text-gray-500">{metrics?.bmi?.category}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Weekly Activity</p>
          <p className="text-2xl font-bold">
            {profile.initialFitnessAssessment?.weeklyActivityFrequency || 0}
          </p>
          <p className="text-xs text-gray-500">days per week</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600">Goal Progress</p>
          <div className="mt-2">
            <ProgressRing 
              progress={metrics?.progressToGoal?.percentage || 0}
              size={60}
              strokeWidth={6}
              color="#3b82f6"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {['overview', 'insights', 'progress', 'analytics'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* BMI Gauge */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">BMI Status</h3>
            <GaugeChart
              value={metrics?.bmi?.value || 0}
              max={40}
              title="Body Mass Index"
              zones={[
                { value: 18.5, color: '#fbbf24' },
                { value: 6.5, color: '#10b981' },
                { value: 5, color: '#fb923c' },
                { value: 10, color: '#ef4444' }
              ]}
            />
            <div className="mt-4 text-center">
              <p className={`text-lg font-semibold ${getBMIColor(metrics?.bmi?.value)}`}>
                {metrics?.bmi?.category || 'Unknown'}
              </p>
              <p className="text-sm text-gray-600">
                Optimal range: 18.5 - 24.9
              </p>
            </div>
          </div>

          {/* Wellness Score Breakdown */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Wellness Score Breakdown</h3>
            <DoughnutChart
              data={prepareWellnessScoreChartData()}
              title=""
            />
            <div className="mt-4">
              <p className="text-center text-2xl font-bold">
                {metrics?.wellnessScore?.overall || 0}/100
              </p>
            </div>
          </div>

          {/* Goal Progress Comparison */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Goals Progress</h3>
            <div className="space-y-4">
              {profile.fitnessGoals?.targetWeight && (
                <ComparisonChart
                  current={profile.physicalMetrics?.weight?.normalizedValue || 0}
                  target={profile.fitnessGoals.targetWeight.normalizedValue}
                  title="Weight Goal"
                />
              )}
              
              <ComparisonChart
                current={profile.initialFitnessAssessment?.weeklyActivityFrequency || 0}
                target={5}
                title="Weekly Activity Goal"
              />
              
              <ComparisonChart
                current={metrics?.wellnessScore?.overall || 0}
                target={80}
                title="Wellness Score Goal"
              />
            </div>
          </div>

          {/* Activity Heatmap */}
          <div className="bg-white rounded-lg shadow p-6">
            <ActivityHeatmap
              data={prepareActivityHeatmapData()}
              title="Activity Tracker (Last 12 Weeks)"
            />
          </div>
        </div>
      )}

      {activeTab === 'insights' && (
        <div className="space-y-6">
          {/* AI Insights Header */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">AI-Powered Insights</h3>
              <button
                onClick={generateNewInsights}
                disabled={insightsLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {insightsLoading ? 'Generating...' : 'Generate New Insights'}
              </button>
            </div>

            {aiInsights ? (
              <div className="space-y-6">
                {/* Recommendations with Visual Priority */}
                {aiInsights.recommendations?.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3">Personalized Recommendations</h4>
                    <div className="grid md:grid-cols-2 gap-3">
                      {aiInsights.recommendations.map((rec, index) => (
                        <div key={rec.id || index} className={`border rounded-lg p-4 ${getPriorityColor(rec.priority)}`}>
                          <div className="flex justify-between items-start mb-2">
                            <h5 className="font-semibold">{rec.title}</h5>
                            <span className="text-xs px-2 py-1 bg-white rounded">
                              {rec.category}
                            </span>
                          </div>
                          <p className="text-sm mb-3">{rec.description}</p>
                          
                          {rec.actionItems?.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs font-semibold mb-1">Action Items:</p>
                              <ul className="text-sm space-y-1">
                                {rec.actionItems.slice(0, 3).map((item, i) => (
                                  <li key={i} className="flex items-start">
                                    <span className="mr-2">•</span>
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div className="flex justify-between items-center mt-3">
                            <span className="text-xs">
                              {rec.timeframe} | {rec.difficulty}
                            </span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => provideFeedback(rec.id, true)}
                                className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => provideFeedback(rec.id, false)}
                                className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                              >
                                ✗
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Visual Achievements */}
                {aiInsights.achievements?.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3">Recent Achievements</h4>
                    <div className="grid md:grid-cols-3 gap-3">
                      {aiInsights.achievements.map((achievement, index) => (
                        <div key={index} className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 text-center">
                          <div className="text-3xl mb-2">{achievement.emoji || '🏆'}</div>
                          <p className="font-semibold text-green-800">{achievement.title}</p>
                          <p className="text-sm text-green-700">{achievement.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No insights available yet.</p>
                <button
                  onClick={generateNewInsights}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Generate Your First Insights
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'progress' && (
        <div className="space-y-6">
          {/* Controls */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">Progress Tracking</h3>
              <div className="flex gap-4">
                <select
                  value={selectedMetric}
                  onChange={(e) => setSelectedMetric(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="weight">Weight</option>
                  <option value="bmi">BMI</option>
                  <option value="wellness">Wellness Score</option>
                  <option value="activity">Activity Level</option>
                </select>
                
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="week">Last Week</option>
                  <option value="month">Last Month</option>
                  <option value="3months">Last 3 Months</option>
                  <option value="6months">Last 6 Months</option>
                  <option value="year">Last Year</option>
                </select>
              </div>
            </div>

            {/* Progress Chart */}
            {progressData?.data?.length > 0 ? (
              <LineChart
                data={prepareProgressChartData()}
                title={`${selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} Progress`}
              />
            ) : (
              <div className="text-center py-12 text-gray-500">
                No data available for the selected period
              </div>
            )}

            {/* Progress Summary Stats */}
            {progressData?.summary && (
              <div className="grid md:grid-cols-5 gap-4 mt-6">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-600">Start</p>
                  <p className="text-lg font-bold">
                    {progressData.summary.startValue?.toFixed(1)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-600">Current</p>
                  <p className="text-lg font-bold">
                    {progressData.summary.currentValue?.toFixed(1)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-600">Change</p>
                  <p className={`text-lg font-bold ${
                    progressData.summary.change > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {progressData.summary.change > 0 ? '+' : ''}
                    {progressData.summary.change?.toFixed(1)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-600">Average</p>
                  <p className="text-lg font-bold">
                    {progressData.summary.average?.toFixed(1)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-600">Trend</p>
                  <p className="text-lg font-bold capitalize">
                    {progressData.summary.trend}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Weekly Summary with Charts */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold mb-6">Weekly Analytics</h3>
            
            {weeklySummary ? (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <ProgressRing
                      progress={(weeklySummary.daysTracked / 7) * 100}
                      size={80}
                      strokeWidth={6}
                      color="#3b82f6"
                    />
                    <p className="text-sm text-blue-600 font-semibold mt-2">Days Tracked</p>
                    <p className="text-lg font-bold text-blue-800">
                      {weeklySummary.daysTracked}/7
                    </p>
                  </div>
                  
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-green-800">
                      {weeklySummary.metrics?.avgWellnessScore?.toFixed(0) || '--'}
                    </div>
                    <p className="text-sm text-green-600 font-semibold">Avg Wellness</p>
                  </div>
                  
                  <div className="bg-purple-50 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-purple-800">
                      {weeklySummary.metrics?.avgWeight?.toFixed(1) || '--'}
                    </div>
                    <p className="text-sm text-purple-600 font-semibold">Avg Weight (kg)</p>
                  </div>
                  
                  <div className="bg-orange-50 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-orange-800">
                      {weeklySummary.metrics?.avgBMI?.toFixed(1) || '--'}
                    </div>
                    <p className="text-sm text-orange-600 font-semibold">Avg BMI</p>
                  </div>
                </div>

                {/* Comparison Chart */}
                {historyData?.history?.length > 1 && (
                  <div>
                    <h4 className="font-semibold mb-3">Weekly Comparison</h4>
                    <BarChart
                      data={{
                        labels: ['Last Week', 'This Week'],
                        datasets: [{
                          label: 'Wellness Score',
                          data: [
                            historyData.history[1]?.metrics?.wellnessScore?.overall || 0,
                            historyData.history[0]?.metrics?.wellnessScore?.overall || 0
                          ],
                          backgroundColor: ['rgba(59, 130, 246, 0.8)', 'rgba(16, 185, 129, 0.8)']
                        }]
                      }}
                      title=""
                    />
                  </div>
                )}

                {/* Trends */}
                {weeklySummary.trends?.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Identified Trends</h4>
                    <div className="flex flex-wrap gap-2">
                      {weeklySummary.trends.map((trend, index) => (
                        <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                          {trend.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No analytics data available yet.</p>
                <p className="text-sm text-gray-400 mt-2">
                  Track your health daily to generate analytics.
                </p>
              </div>
            )}
          </div>

          {/* Historical Stats */}
          {historyData?.statistics && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Historical Statistics</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Best Wellness Score</p>
                  <p className="text-2xl font-bold text-green-600">
                    {historyData.statistics.bestWellnessScore || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Average Score</p>
                  <p className="text-2xl font-bold">
                    {historyData.statistics.averages?.avgWellnessScore?.toFixed(0) || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Consistency</p>
                  <p className="text-2xl font-bold">
                    {historyData.statistics.consistency || 0}%
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-8 flex gap-4 justify-center">
        <Link 
          to="/profile" 
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
        >
          Update Profile
        </Link>
        <button 
          onClick={fetchDashboardData}
          className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition"
        >
          Refresh Data
        </button>
      </div>
    </div>
  );
};

export default DashboardPage;