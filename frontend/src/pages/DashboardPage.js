// src/pages/DashboardPage.js - Dashboard with basic metrics display
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const DashboardPage = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bmi, setBmi] = useState(null);
  const [bmiCategory, setBmiCategory] = useState('');

  // Temporary user ID for testing
  const userId = localStorage.getItem('userId') || 'temp-user-123';

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await axios.get('/api/health-profile', {
        headers: { 'X-User-Id': userId }
      });
      if (response.data.profile) {
        setProfile(response.data.profile);
        calculateBMI(response.data.profile.physicalMetrics);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateBMI = (metrics) => {
    if (metrics?.bmi?.value) {
      setBmi(metrics.bmi.value);
      setBmiCategory(metrics.bmi.category);
    }
  };

  const getBMIColor = (category) => {
    switch(category) {
      case 'underweight': return 'text-blue-600';
      case 'normal': return 'text-green-600';
      case 'overweight': return 'text-yellow-600';
      case 'obese': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getWellnessScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <h2 className="text-3xl font-bold mb-4">Welcome to Your Dashboard!</h2>
        <p className="text-gray-600 mb-8">
          Complete your health profile to see your wellness metrics and AI insights.
        </p>
        <Link 
          to="/profile" 
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
        >
          Complete Your Profile
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Health Dashboard</h1>

      {/* Quick Stats Grid */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        {/* BMI Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm text-gray-500 mb-2">BMI</h3>
          <p className={`text-3xl font-bold ${getBMIColor(bmiCategory)}`}>
            {bmi || '--'}
          </p>
          <p className="text-sm text-gray-600 mt-1 capitalize">
            {bmiCategory || 'Not calculated'}
          </p>
        </div>

        {/* Wellness Score Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm text-gray-500 mb-2">Wellness Score</h3>
          <p className={`text-3xl font-bold ${getWellnessScoreColor(profile.wellnessScore?.overall || 0)}`}>
            {profile.wellnessScore?.overall || 0}
          </p>
          <p className="text-sm text-gray-600 mt-1">out of 100</p>
        </div>

        {/* Activity Level Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm text-gray-500 mb-2">Activity Level</h3>
          <p className="text-lg font-semibold text-gray-800">
            {profile.lifestyleIndicators?.activityLevel?.replace('_', ' ') || 'Not set'}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            {profile.initialFitnessAssessment?.weeklyActivityFrequency || 0} days/week
          </p>
        </div>

        {/* Profile Completeness Card */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm text-gray-500 mb-2">Profile Complete</h3>
          <p className="text-3xl font-bold text-purple-600">
            {profile.metadata?.profileCompleteness || 0}%
          </p>
          <Link to="/profile" className="text-sm text-blue-600 hover:underline mt-1 inline-block">
            Update Profile
          </Link>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Current Metrics */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Current Metrics</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Age:</span>
              <span className="font-medium">{profile.demographics?.age || '--'} years</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Height:</span>
              <span className="font-medium">
                {profile.physicalMetrics?.height?.value || '--'} {profile.physicalMetrics?.height?.unit || 'cm'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Weight:</span>
              <span className="font-medium">
                {profile.physicalMetrics?.weight?.value || '--'} {profile.physicalMetrics?.weight?.unit || 'kg'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Target Weight:</span>
              <span className="font-medium">
                {profile.fitnessGoals?.targetWeight?.value || '--'} {profile.fitnessGoals?.targetWeight?.unit || 'kg'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Sleep:</span>
              <span className="font-medium">{profile.lifestyleIndicators?.sleepHours || '--'} hours/night</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Stress Level:</span>
              <span className="font-medium">{profile.lifestyleIndicators?.stressLevel || '--'}/10</span>
            </div>
          </div>
        </div>

        {/* Goals & Progress */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Goals & Progress</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-1">Primary Goal</p>
              <p className="font-medium text-lg capitalize">
                {profile.fitnessGoals?.primary?.replace('_', ' ') || 'Not set'}
              </p>
            </div>
            
            {profile.fitnessGoals?.targetWeight?.value && profile.physicalMetrics?.weight?.normalizedValue && (
              <div>
                <p className="text-sm text-gray-600 mb-2">Weight Progress</p>
                <div className="bg-gray-200 rounded-full h-4 relative">
                  <div 
                    className="bg-blue-600 h-4 rounded-full"
                    style={{
                      width: `${Math.min(100, Math.max(0, 
                        ((profile.physicalMetrics.weight.normalizedValue - profile.fitnessGoals.targetWeight.normalizedValue) / 
                        profile.physicalMetrics.weight.normalizedValue) * 100
                      ))}%`
                    }}
                  />
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {Math.abs(profile.physicalMetrics.weight.normalizedValue - profile.fitnessGoals.targetWeight.normalizedValue).toFixed(1)} kg to go
                </p>
              </div>
            )}

            <div>
              <p className="text-sm text-gray-600 mb-1">Exercise Types</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {profile.initialFitnessAssessment?.exerciseTypes?.map(type => (
                  <span key={type} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    {type.replace('_', ' ')}
                  </span>
                )) || <span className="text-gray-500">No exercises selected</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Insights Placeholder */}
      <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">AI Insights</h2>
        <p className="text-gray-600">
          AI-powered recommendations will appear here once you complete your profile and we analyze your data.
        </p>
        <ul className="mt-4 space-y-2 text-sm text-gray-600">
          <li>• Personalized workout recommendations</li>
          <li>• Dietary suggestions based on your goals</li>
          <li>• Progress predictions and motivational tips</li>
          <li>• Health risk assessments and preventive measures</li>
        </ul>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 flex gap-4 justify-center">
        <Link 
          to="/profile" 
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
        >
          Update Profile
        </Link>
        <button 
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition"
        >
          Refresh Data
        </button>
      </div>
    </div>
  );
};

export default DashboardPage;