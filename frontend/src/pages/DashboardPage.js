// src/pages/DashboardPage.js - Dashboard with Fixed AI Insights and Accept/Decline
import React, { useState, useEffect } from 'react';
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
  const [insightsStale, setInsightsStale] = useState(false);
  const [acceptedRecommendations, setAcceptedRecommendations] = useState(new Set());
  const [declinedRecommendations, setDeclinedRecommendations] = useState(new Set());

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
      
      // Handle AI insights and check if they're stale
      if (insightsRes?.data) {
        setAiInsights(insightsRes.data.insights);
        setInsightsStale(insightsRes.data.isStale || false);
        
        // Load previously accepted/declined recommendations
        if (insightsRes.data.insights?.feedback) {
          setAcceptedRecommendations(
            new Set(insightsRes.data.insights.feedback.appliedRecommendations || [])
          );
          setDeclinedRecommendations(
            new Set(insightsRes.data.insights.feedback.ignoredRecommendations || [])
          );
        }
      }
      
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
      setError(null);
      const token = localStorage.getItem('token');
      
      // Force regenerate to get fresh insights based on latest data
      const response = await axios.post('/api/analytics/ai-insights', 
        { forceRegenerate: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setAiInsights(response.data.insights);
      setInsightsStale(false);
      setAcceptedRecommendations(new Set());
      setDeclinedRecommendations(new Set());
      
      // Show success message
      if (response.data.message) {
        console.log(response.data.message);
      }
    } catch (error) {
      console.error('Generate insights error:', error);
      setError('Failed to generate new insights. Please try again.');
    } finally {
      setInsightsLoading(false);
    }
  };

  // Handle accepting a recommendation
  const handleAcceptRecommendation = async (recommendationId) => {
    try {
      const token = localStorage.getItem('token');
      
      // Send feedback to backend
      const response = await axios.post('/api/analytics/ai-insights/feedback', {
        insightId: aiInsights._id,
        action: 'accept',
        recommendationId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update local state
      setAcceptedRecommendations(prev => new Set([...prev, recommendationId]));
      setDeclinedRecommendations(prev => {
        const newSet = new Set(prev);
        newSet.delete(recommendationId);
        return newSet;
      });
      
      console.log(`Recommendation accepted: ${recommendationId}`);
    } catch (error) {
      console.error('Accept recommendation error:', error);
      setError('Failed to save feedback. Please try again.');
    }
  };

  // Handle declining a recommendation
  const handleDeclineRecommendation = async (recommendationId) => {
    try {
      const token = localStorage.getItem('token');
      
      // Send feedback to backend
      const response = await axios.post('/api/analytics/ai-insights/feedback', {
        insightId: aiInsights._id,
        action: 'decline',
        recommendationId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update local state
      setDeclinedRecommendations(prev => new Set([...prev, recommendationId]));
      setAcceptedRecommendations(prev => {
        const newSet = new Set(prev);
        newSet.delete(recommendationId);
        return newSet;
      });
      
      console.log(`Recommendation declined: ${recommendationId}`);
    } catch (error) {
      console.error('Decline recommendation error:', error);
      setError('Failed to save feedback. Please try again.');
    }
  };

  // Helper function to get priority color
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'border-red-200 bg-red-50';
      case 'medium':
        return 'border-yellow-200 bg-yellow-50';
      case 'low':
        return 'border-green-200 bg-green-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  // Prepare chart data functions
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
          'rgba(34, 197, 94, 0.8)',
          'rgba(251, 146, 60, 0.8)',
          'rgba(163, 230, 53, 0.8)'
        ]
      }]
    };
  };

  const prepareActivityHeatmapData = () => {
    if (!historyData || historyData.length === 0) return [];
    
    return historyData.map(h => ({
      date: h.period.startDate,
      value: h.aggregates?.avgWellnessScore || 0
    }));
  };

  const prepareBMIChartData = () => {
    if (!historyData || historyData.length === 0) return null;

    const data = historyData
      .filter(h => h.metrics?.bmi?.value)
      .map(h => ({
        date: new Date(h.period.startDate).toLocaleDateString(),
        value: h.metrics.bmi.value
      }))
      .reverse();

    return {
      labels: data.map(d => d.date),
      datasets: [{
        label: 'BMI Trend',
        data: data.map(d => d.value),
        borderColor: 'rgb(147, 51, 234)',
        backgroundColor: 'rgba(147, 51, 234, 0.1)',
        fill: true,
        tension: 0.4
      }]
    };
  };

  const prepareNutritionOverview = () => {
    if (!metrics) return null;

    return {
      calories: metrics.dailyCalorieNeeds || 2000,
      water: metrics.waterIntakeGoal || 2.5,
      exercise: metrics.exerciseMinutesGoal || 150,
      progress: metrics.progressToGoal || 0
    };
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your wellness dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.name || user?.email}!
        </h1>
        <p className="text-gray-600 mt-2">
          Your personalized health insights and progress tracking
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Stale Data Alert */}
      {insightsStale && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800">
            Your health data has been updated since these insights were generated. 
            <button 
              onClick={generateNewInsights}
              className="ml-2 text-yellow-900 underline font-semibold"
            >
              Generate fresh insights
            </button>
          </p>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Wellness Score</h3>
          <p className="text-2xl font-bold text-blue-600">
            {metrics?.wellnessScore?.overall || 0}/100
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {metrics?.wellnessScore?.overall >= 80 ? 'Excellent' :
             metrics?.wellnessScore?.overall >= 60 ? 'Good' :
             metrics?.wellnessScore?.overall >= 40 ? 'Fair' : 'Needs Improvement'}
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">BMI</h3>
          <p className="text-2xl font-bold">
            {metrics?.bmi?.value?.toFixed(1) || '--'}
          </p>
          <p className="text-xs text-gray-500">{metrics?.bmi?.category}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Daily Calories</h3>
          <p className="text-2xl font-bold">
            {metrics?.dailyCalorieNeeds || '--'}
          </p>
          <p className="text-xs text-gray-500">kcal/day</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Goal Progress</h3>
          <p className="text-2xl font-bold">
            {metrics?.progressToGoal || 0}%
          </p>
          <p className="text-xs text-gray-500">{profile?.fitnessGoals?.primary?.replace('_', ' ')}</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          {['overview', 'insights', 'progress', 'nutrition'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Wellness Score Breakdown */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold mb-4">Wellness Score Breakdown</h3>
            <div className="grid md:grid-cols-2 gap-6">
              {prepareWellnessScoreChartData() && (
                <DoughnutChart
                  data={prepareWellnessScoreChartData()}
                  title="Component Scores"
                />
              )}
              <GaugeChart
                value={metrics?.wellnessScore?.overall || 0}
                max={100}
                title="Overall Score"
              />
            </div>
          </div>

          {/* Recent Progress */}
          {historyData && historyData.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-semibold mb-4">Recent Progress</h3>
              {prepareBMIChartData() && (
                <LineChart
                  data={prepareBMIChartData()}
                  title="BMI Trend (Last 30 Days)"
                />
              )}
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid md:grid-cols-3 gap-4">
            <Link
              to="/profile"
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition text-center"
            >
              <div className="text-3xl mb-2">📊</div>
              <h3 className="font-semibold">Update Profile</h3>
              <p className="text-sm text-gray-600">Keep your health data current</p>
            </Link>
            
            <Link
              to="/meal-planner"
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition text-center"
            >
              <div className="text-3xl mb-2">🍽️</div>
              <h3 className="font-semibold">Plan Meals</h3>
              <p className="text-sm text-gray-600">Get personalized meal suggestions</p>
            </Link>
            
            <Link
              to="/nutrition-analysis"
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition text-center"
            >
              <div className="text-3xl mb-2">📈</div>
              <h3 className="font-semibold">Nutrition Analysis</h3>
              <p className="text-sm text-gray-600">Track your nutritional intake</p>
            </Link>
          </div>

          {/* Weekly Summary */}
          {weeklySummary && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-semibold mb-4">Weekly Summary</h3>
              <div className="grid md:grid-cols-4 gap-4">
                {weeklySummary.metrics && Object.entries(weeklySummary.metrics).map(([key, value]) => (
                  value !== null && (
                    <div key={key} className="text-center">
                      <p className="text-sm text-gray-500">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                      <p className="text-lg font-semibold">{typeof value === 'number' ? value.toFixed(1) : value}</p>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}
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
                {/* Display fitness goal prominently */}
                {profile?.fitnessGoals?.primary && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">Your Fitness Goal</h4>
                    <p className="text-blue-800">
                      Primary Goal: <strong>{profile.fitnessGoals.primary.replace('_', ' ')}</strong>
                      {profile.fitnessGoals.targetWeight && (
                        <span className="ml-2">
                          | Target Weight: <strong>{profile.fitnessGoals.targetWeight.normalizedValue}kg</strong>
                        </span>
                      )}
                      {profile.fitnessGoals.timeline && (
                        <span className="ml-2">
                          | Timeline: <strong>{profile.fitnessGoals.timeline}</strong>
                        </span>
                      )}
                    </p>
                    {profile.fitnessGoals.secondary && profile.fitnessGoals.secondary.length > 0 && (
                      <p className="text-sm text-blue-700 mt-1">
                        Secondary Goals: {profile.fitnessGoals.secondary.join(', ').replace(/_/g, ' ')}
                      </p>
                    )}
                  </div>
                )}

                {/* Recommendations with Visual Priority */}
                {aiInsights.insights?.recommendations?.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3">Personalized Recommendations</h4>
                    <div className="grid md:grid-cols-2 gap-3">
                      {aiInsights.insights.recommendations.map((rec, index) => (
                        <div 
                          key={rec.id || index} 
                          className={`border rounded-lg p-4 ${getPriorityColor(rec.priority)} ${
                            acceptedRecommendations.has(rec.id) ? 'ring-2 ring-green-500' : 
                            declinedRecommendations.has(rec.id) ? 'opacity-50' : ''
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h5 className="font-semibold">{rec.title}</h5>
                            <span className="text-xs px-2 py-1 bg-white rounded">
                              {rec.category}
                            </span>
                          </div>
                          <p className="text-sm mb-3">{rec.description}</p>
                          
                          {/* Show goal alignment */}
                          {rec.goalAlignment && (
                            <div className="mb-3 p-2 bg-white bg-opacity-60 rounded">
                              <p className="text-xs font-semibold text-gray-700">Goal Alignment:</p>
                              <p className="text-xs text-gray-600">{rec.goalAlignment}</p>
                            </div>
                          )}
                          
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
                                onClick={() => handleAcceptRecommendation(rec.id)}
                                disabled={acceptedRecommendations.has(rec.id)}
                                className={`text-xs px-3 py-1.5 rounded transition ${
                                  acceptedRecommendations.has(rec.id)
                                    ? 'bg-green-600 text-white'
                                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                                }`}
                                title="Accept and apply this recommendation"
                              >
                                {acceptedRecommendations.has(rec.id) ? '✓ Accepted' : '✓ Accept'}
                              </button>
                              <button
                                onClick={() => handleDeclineRecommendation(rec.id)}
                                disabled={declinedRecommendations.has(rec.id)}
                                className={`text-xs px-3 py-1.5 rounded transition ${
                                  declinedRecommendations.has(rec.id)
                                    ? 'bg-red-600 text-white'
                                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                                }`}
                                title="Decline this recommendation"
                              >
                                {declinedRecommendations.has(rec.id) ? '✗ Declined' : '✗ Decline'}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Warnings */}
                {aiInsights.insights?.warnings?.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3">Health Alerts</h4>
                    <div className="space-y-2">
                      {aiInsights.insights.warnings.map((warning, index) => (
                        <div key={index} className={`border rounded-lg p-4 ${
                          warning.type === 'alert' ? 'bg-red-50 border-red-200' :
                          warning.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                          'bg-blue-50 border-blue-200'
                        }`}>
                          <h5 className="font-semibold mb-1">{warning.message}</h5>
                          <p className="text-sm mb-2">{warning.reason}</p>
                          <p className="text-sm font-medium">Suggested Action: {warning.suggestedAction}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Achievements */}
                {aiInsights.insights?.achievements?.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3">Recent Achievements</h4>
                    <div className="grid md:grid-cols-3 gap-3">
                      {aiInsights.insights.achievements.map((achievement, index) => (
                        <div key={index} className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 text-center">
                          <div className="text-3xl mb-2">{achievement.emoji || '🏆'}</div>
                          <p className="font-semibold text-green-800">{achievement.title}</p>
                          <p className="text-sm text-green-700">{achievement.description}</p>
                          {achievement.improvement && (
                            <p className="text-xs mt-2 text-green-600">{achievement.improvement}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Motivation */}
                {aiInsights.insights?.motivation && (
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-6">
                    <h4 className="font-semibold mb-3">Daily Motivation</h4>
                    {aiInsights.insights.motivation.quote && (
                      <blockquote className="text-lg italic text-purple-900 mb-3">
                        "{aiInsights.insights.motivation.quote}"
                      </blockquote>
                    )}
                    {aiInsights.insights.motivation.tip && (
                      <p className="text-sm text-purple-800 mb-2">
                        <strong>Tip:</strong> {aiInsights.insights.motivation.tip}
                      </p>
                    )}
                    {aiInsights.insights.motivation.challenge && (
                      <p className="text-sm text-purple-800">
                        <strong>Weekly Challenge:</strong> {aiInsights.insights.motivation.challenge}
                      </p>
                    )}
                  </div>
                )}

                {/* Summary */}
                {aiInsights.insights?.summary && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                    <h4 className="font-semibold mb-3">Summary</h4>
                    <p className="text-sm mb-3">{aiInsights.insights.summary.overview}</p>
                    
                    {aiInsights.insights.summary.keyPoints?.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-semibold mb-1">Key Points:</p>
                        <ul className="text-sm space-y-1">
                          {aiInsights.insights.summary.keyPoints.map((point, i) => (
                            <li key={i} className="flex items-start">
                              <span className="mr-2">•</span>
                              <span>{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {aiInsights.insights.summary.progressAssessment && (
                      <p className="text-sm mb-3">
                        <strong>Progress Assessment:</strong> {aiInsights.insights.summary.progressAssessment}
                      </p>
                    )}
                    
                    {aiInsights.insights.summary.nextSteps?.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold mb-1">Next Steps:</p>
                        <ul className="text-sm space-y-1">
                          {aiInsights.insights.summary.nextSteps.map((step, i) => (
                            <li key={i} className="flex items-start">
                              <span className="mr-2">→</span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">No insights available yet.</p>
                <button
                  onClick={generateNewInsights}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
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
          {/* Progress Controls */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Progress Tracking</h3>
              <div className="flex gap-2">
                <select
                  value={selectedMetric}
                  onChange={(e) => setSelectedMetric(e.target.value)}
                  className="px-3 py-2 border rounded-lg"
                >
                  <option value="weight">Weight</option>
                  <option value="bmi">BMI</option>
                  <option value="wellness">Wellness Score</option>
                  <option value="sleep">Sleep</option>
                  <option value="stress">Stress</option>
                </select>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="px-3 py-2 border rounded-lg"
                >
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                  <option value="quarter">Quarter</option>
                  <option value="year">Year</option>
                </select>
              </div>
            </div>

            {/* Progress Chart */}
            {progressData && (
              <div className="mb-6">
                {prepareProgressChartData() && (
                  <LineChart
                    data={prepareProgressChartData()}
                    title={`${selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)} Over Time`}
                  />
                )}
                
                {/* Statistics */}
                <div className="grid grid-cols-4 gap-4 mt-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-500">Average</p>
                    <p className="text-lg font-semibold">{progressData.stats?.average || '--'}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500">Latest</p>
                    <p className="text-lg font-semibold">{progressData.stats?.latest || '--'}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500">Trend</p>
                    <p className="text-lg font-semibold capitalize">{progressData.stats?.trend || '--'}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500">Data Points</p>
                    <p className="text-lg font-semibold">{progressData.stats?.dataPoints || 0}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Comparison Charts */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <ComparisonChart
                current={profile?.initialFitnessAssessment?.weeklyActivityFrequency || 0}
                target={5}
                title="Weekly Activity Goal"
              />
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
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
              title="Activity Tracker (Last 30 Days)"
            />
          </div>

          {/* Goal Progress */}
          {profile?.fitnessGoals?.targetWeight && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-semibold mb-4">Goal Progress</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">Weight Progress</p>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm">Current: {profile.physicalMetrics?.weight?.normalizedValue}kg</span>
                    <span className="text-sm">Target: {profile.fitnessGoals.targetWeight.normalizedValue}kg</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${Math.min(100, Math.max(0, metrics?.progressToGoal || 0))}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-500">Remaining</p>
                    <p className="text-lg font-semibold">
                      {Math.abs(profile.fitnessGoals.targetWeight.normalizedValue - profile.physicalMetrics?.weight?.normalizedValue).toFixed(1)}kg
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-500">Est. Time</p>
                    <p className="text-lg font-semibold">
                      {Math.ceil(Math.abs(profile.fitnessGoals.targetWeight.normalizedValue - profile.physicalMetrics?.weight?.normalizedValue) / 0.5)} weeks
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'nutrition' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold mb-4">Nutrition Hub</h3>
            
            {/* Nutrition Overview */}
            {prepareNutritionOverview() && (
              <div className="grid md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">Daily Calories</p>
                  <p className="text-2xl font-bold text-blue-600">{prepareNutritionOverview().calories}</p>
                  <p className="text-xs text-gray-500">kcal/day</p>
                </div>
                <div className="text-center p-4 bg-cyan-50 rounded-lg">
                  <p className="text-sm text-gray-600">Water Intake</p>
                  <p className="text-2xl font-bold text-cyan-600">{prepareNutritionOverview().water}</p>
                  <p className="text-xs text-gray-500">liters/day</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">Exercise Goal</p>
                  <p className="text-2xl font-bold text-green-600">{prepareNutritionOverview().exercise}</p>
                  <p className="text-xs text-gray-500">minutes/week</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-gray-600">Goal Progress</p>
                  <p className="text-2xl font-bold text-purple-600">{prepareNutritionOverview().progress}%</p>
                  <p className="text-xs text-gray-500">to target</p>
                </div>
              </div>
            )}
            
            <div className="grid md:grid-cols-2 gap-6">
              <Link
                to="/nutrition-preferences"
                className="border rounded-lg p-6 hover:shadow-lg transition"
              >
                <div className="flex items-start">
                  <div className="text-2xl mr-4">🥗</div>
                  <div>
                    <h4 className="font-semibold mb-2">Dietary Preferences</h4>
                    <p className="text-sm text-gray-600">Update your dietary restrictions, allergies, and preferences</p>
                    {profile?.dietaryPreferences?.length > 0 && (
                      <p className="text-xs text-gray-500 mt-2">
                        Current: {profile.dietaryPreferences.slice(0, 3).join(', ')}
                        {profile.dietaryPreferences.length > 3 && '...'}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
              
              <Link
                to="/meal-planner"
                className="border rounded-lg p-6 hover:shadow-lg transition"
              >
                <div className="flex items-start">
                  <div className="text-2xl mr-4">📅</div>
                  <div>
                    <h4 className="font-semibold mb-2">Meal Planner</h4>
                    <p className="text-sm text-gray-600">Generate personalized daily or weekly meal plans</p>
                    <p className="text-xs text-gray-500 mt-2">AI-powered recommendations</p>
                  </div>
                </div>
              </Link>
              
              <Link
                to="/recipe-search"
                className="border rounded-lg p-6 hover:shadow-lg transition"
              >
                <div className="flex items-start">
                  <div className="text-2xl mr-4">🔍</div>
                  <div>
                    <h4 className="font-semibold mb-2">Recipe Search</h4>
                    <p className="text-sm text-gray-600">Find and generate recipes tailored to your needs</p>
                    <p className="text-xs text-gray-500 mt-2">500+ recipes available</p>
                  </div>
                </div>
              </Link>
              
              <Link
                to="/nutrition-analysis"
                className="border rounded-lg p-6 hover:shadow-lg transition"
              >
                <div className="flex items-start">
                  <div className="text-2xl mr-4">📊</div>
                  <div>
                    <h4 className="font-semibold mb-2">Nutrition Analysis</h4>
                    <p className="text-sm text-gray-600">Track and analyze your nutritional intake</p>
                    <p className="text-xs text-gray-500 mt-2">Detailed macro tracking</p>
                  </div>
                </div>
              </Link>
              
              <Link
                to="/shopping-list"
                className="border rounded-lg p-6 hover:shadow-lg transition"
              >
                <div className="flex items-start">
                  <div className="text-2xl mr-4">🛒</div>
                  <div>
                    <h4 className="font-semibold mb-2">Shopping List</h4>
                    <p className="text-sm text-gray-600">Generate shopping lists from your meal plans</p>
                    <p className="text-xs text-gray-500 mt-2">Organized by categories</p>
                  </div>
                </div>
              </Link>
              
              <div className="border rounded-lg p-6 bg-gradient-to-br from-blue-50 to-purple-50">
                <div className="flex items-start">
                  <div className="text-2xl mr-4">✨</div>
                  <div>
                    <h4 className="font-semibold mb-2">Nutrition Insights</h4>
                    <p className="text-sm text-gray-600">AI analyzes your nutrition patterns</p>
                    <button
                      onClick={() => setActiveTab('insights')}
                      className="text-xs text-blue-600 hover:text-blue-700 mt-2 underline"
                    >
                      View your insights →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Recent Meals */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold mb-4">Quick Start</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Generate Today's Meal Plan</p>
                  <p className="text-sm text-gray-600">Get personalized meals for today</p>
                </div>
                <Link
                  to="/meal-planner"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
                >
                  Generate
                </Link>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Update Dietary Preferences</p>
                  <p className="text-sm text-gray-600">Ensure meals match your needs</p>
                </div>
                <Link
                  to="/nutrition-preferences"
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-sm"
                >
                  Update
                </Link>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Track Today's Nutrition</p>
                  <p className="text-sm text-gray-600">Log meals and analyze intake</p>
                </div>
                <Link
                  to="/nutrition-analysis"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
                >
                  Track
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;