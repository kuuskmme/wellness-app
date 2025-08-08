// src/pages/ProfilePage.js - Health Profile page
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ProfilePage = () => {
  const [profile, setProfile] = useState({
    demographics: { age: '', gender: '' },
    physicalMetrics: {
      height: { value: '', unit: 'cm' },
      weight: { value: '', unit: 'kg' }
    },
    lifestyleIndicators: {
      occupationType: '',
      activityLevel: '',
      sleepHours: '',
      stressLevel: ''
    },
    dietaryPreferences: [],
    fitnessGoals: {
      primary: '',
      targetWeight: { value: '', unit: 'kg' }
    },
    initialFitnessAssessment: {
      weeklyActivityFrequency: '',
      exerciseTypes: [],
      averageSessionDuration: '',
      fitnessLevel: ''
    }
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Temporary user ID for testing (will be replaced with auth in Step 2)
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
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleInputChange = (section, field, value, subField = null) => {
    setProfile(prev => {
      const newProfile = { ...prev };
      if (subField) {
        newProfile[section][field][subField] = value;
      } else {
        newProfile[section][field] = value;
      }
      return newProfile;
    });
  };

  const handleArrayChange = (section, field, value) => {
    setProfile(prev => {
      const newProfile = { ...prev };
      const currentArray = newProfile[section][field] || [];
      if (currentArray.includes(value)) {
        newProfile[section][field] = currentArray.filter(item => item !== value);
      } else {
        newProfile[section][field] = [...currentArray, value];
      }
      return newProfile;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});
    setSuccessMessage('');

    try {
      const response = await axios.post('/api/health-profile', profile, {
        headers: { 'X-User-Id': userId }
      });
      setSuccessMessage('Profile saved successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      if (error.response?.data?.errors) {
        const newErrors = {};
        error.response.data.errors.forEach(err => {
          newErrors[err.path] = err.msg;
        });
        setErrors(newErrors);
      } else {
        setErrors({ general: 'Failed to save profile' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await axios.get('/api/health-profile/export', {
        headers: { 'X-User-Id': userId }
      });
      
      // Create and download JSON file
      const dataStr = JSON.stringify(response.data, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileDefaultName = `health-profile-${Date.now()}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } catch (error) {
      console.error('Export error:', error);
      setErrors({ general: 'Failed to export profile' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold">Health Profile</h2>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            Export Data 📥
          </button>
        </div>

        {successMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {successMessage}
          </div>
        )}

        {errors.general && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Demographics Section */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4">Demographics</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Age</label>
                <input
                  type="number"
                  min="1"
                  max="150"
                  value={profile.demographics.age}
                  onChange={(e) => handleInputChange('demographics', 'age', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Gender</label>
                <select
                  value={profile.demographics.gender}
                  onChange={(e) => handleInputChange('demographics', 'gender', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>
            </div>
          </div>

          {/* Physical Metrics Section */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4">Physical Metrics</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Height</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="30"
                    max="300"
                    value={profile.physicalMetrics.height.value}
                    onChange={(e) => handleInputChange('physicalMetrics', 'height', e.target.value, 'value')}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <select
                    value={profile.physicalMetrics.height.unit}
                    onChange={(e) => handleInputChange('physicalMetrics', 'height', e.target.value, 'unit')}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="cm">cm</option>
                    <option value="inches">inches</option>
                    <option value="feet">feet</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Weight</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={profile.physicalMetrics.weight.value}
                    onChange={(e) => handleInputChange('physicalMetrics', 'weight', e.target.value, 'value')}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <select
                    value={profile.physicalMetrics.weight.unit}
                    onChange={(e) => handleInputChange('physicalMetrics', 'weight', e.target.value, 'unit')}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="kg">kg</option>
                    <option value="lbs">lbs</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Lifestyle Indicators Section */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4">Lifestyle Indicators</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Occupation Type</label>
                <select
                  value={profile.lifestyleIndicators.occupationType}
                  onChange={(e) => handleInputChange('lifestyleIndicators', 'occupationType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Type</option>
                  <option value="sedentary">Sedentary (Desk job)</option>
                  <option value="light_activity">Light Activity</option>
                  <option value="moderate_activity">Moderate Activity</option>
                  <option value="heavy_activity">Heavy Activity</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Activity Level</label>
                <select
                  value={profile.lifestyleIndicators.activityLevel}
                  onChange={(e) => handleInputChange('lifestyleIndicators', 'activityLevel', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Level</option>
                  <option value="sedentary">Sedentary</option>
                  <option value="lightly_active">Lightly Active</option>
                  <option value="moderately_active">Moderately Active</option>
                  <option value="very_active">Very Active</option>
                  <option value="extremely_active">Extremely Active</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Sleep Hours (per night)</label>
                <input
                  type="number"
                  min="0"
                  max="24"
                  step="0.5"
                  value={profile.lifestyleIndicators.sleepHours}
                  onChange={(e) => handleInputChange('lifestyleIndicators', 'sleepHours', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Stress Level (1-10)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={profile.lifestyleIndicators.stressLevel}
                  onChange={(e) => handleInputChange('lifestyleIndicators', 'stressLevel', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Dietary Preferences Section */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4">Dietary Preferences</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {['vegetarian', 'vegan', 'pescatarian', 'keto', 'paleo', 'mediterranean', 
                'gluten_free', 'dairy_free', 'nut_free'].map(diet => (
                <label key={diet} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={profile.dietaryPreferences.includes(diet)}
                    onChange={() => handleArrayChange('dietaryPreferences', '', diet)}
                    className="mr-2"
                  />
                  <span className="text-sm">{diet.replace('_', ' ').charAt(0).toUpperCase() + diet.replace('_', ' ').slice(1)}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Fitness Goals Section */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4">Fitness Goals</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Primary Goal</label>
                <select
                  value={profile.fitnessGoals.primary}
                  onChange={(e) => handleInputChange('fitnessGoals', 'primary', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Goal</option>
                  <option value="weight_loss">Weight Loss</option>
                  <option value="muscle_gain">Muscle Gain</option>
                  <option value="endurance">Endurance</option>
                  <option value="flexibility">Flexibility</option>
                  <option value="general_fitness">General Fitness</option>
                  <option value="stress_reduction">Stress Reduction</option>
                  <option value="health_maintenance">Health Maintenance</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Target Weight</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={profile.fitnessGoals.targetWeight.value}
                    onChange={(e) => handleInputChange('fitnessGoals', 'targetWeight', e.target.value, 'value')}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    value={profile.fitnessGoals.targetWeight.unit}
                    onChange={(e) => handleInputChange('fitnessGoals', 'targetWeight', e.target.value, 'unit')}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="kg">kg</option>
                    <option value="lbs">lbs</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Initial Fitness Assessment Section */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4">Initial Fitness Assessment</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Weekly Activity Frequency (days)</label>
                <input
                  type="number"
                  min="0"
                  max="7"
                  value={profile.initialFitnessAssessment.weeklyActivityFrequency}
                  onChange={(e) => handleInputChange('initialFitnessAssessment', 'weeklyActivityFrequency', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Average Session Duration (minutes)</label>
                <input
                  type="number"
                  min="0"
                  max="480"
                  value={profile.initialFitnessAssessment.averageSessionDuration}
                  onChange={(e) => handleInputChange('initialFitnessAssessment', 'averageSessionDuration', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Fitness Level</label>
                <select
                  value={profile.initialFitnessAssessment.fitnessLevel}
                  onChange={(e) => handleInputChange('initialFitnessAssessment', 'fitnessLevel', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Level</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="expert">Expert</option>
                </select>
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">Exercise Types</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {['cardio', 'strength_training', 'yoga', 'pilates', 'swimming', 'cycling', 
                  'running', 'walking', 'sports'].map(exercise => (
                  <label key={exercise} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={profile.initialFitnessAssessment.exerciseTypes.includes(exercise)}
                      onChange={() => handleArrayChange('initialFitnessAssessment', 'exerciseTypes', exercise)}
                      className="mr-2"
                    />
                    <span className="text-sm">{exercise.replace('_', ' ').charAt(0).toUpperCase() + exercise.replace('_', ' ').slice(1)}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className={`px-6 py-2 rounded-lg font-semibold text-white transition ${
                isLoading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isLoading ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;