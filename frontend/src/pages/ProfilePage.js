// src/pages/ProfilePage.js - Fixed Profile Page with Simplified Validation
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const ProfilePage = () => {
  const { user } = useAuth();
  
  // Initialize with empty/default values that won't cause validation errors
  const [profile, setProfile] = useState({
    demographics: { 
      age: 30, // Default age
      gender: 'prefer_not_to_say' // Default gender
    },
    physicalMetrics: {
      height: { value: 170, unit: 'cm' }, // Default height
      weight: { value: 70, unit: 'kg' }    // Default weight
    },
    lifestyleIndicators: {
      occupationType: 'moderate_activity',  // Default occupation
      activityLevel: 'moderately_active',   // Default activity
      sleepHours: 7,                        // Default sleep
      stressLevel: 5,                       // Default stress
      smokingStatus: 'never',               // Default smoking
      alcoholConsumption: 'none'            // Default alcohol
    },
    dietaryPreferences: [],
    dietaryRestrictions: {
      allergies: [],
      intolerances: [],
      medicalRestrictions: []
    },
    fitnessGoals: {
      primary: 'general_fitness',           // Default goal - IMPORTANT!
      secondary: [],
      targetWeight: { value: 65, unit: 'kg' }, // Default target
      targetDate: '',
      motivationLevel: 7
    },
    initialFitnessAssessment: {
      weeklyActivityFrequency: 3,           // Default frequency
      exerciseTypes: [],
      averageSessionDuration: 30,           // Default duration
      fitnessLevel: 'intermediate',         // Default level
      limitations: [],
      preferredWorkoutTime: 'morning'       // Default time
    }
  });

  const [activeTab, setActiveTab] = useState('basic');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errors, setErrors] = useState({});
  const [profileExists, setProfileExists] = useState(false);
  const [calculatedBMI, setCalculatedBMI] = useState(null);

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: '👤' },
    { id: 'lifestyle', label: 'Lifestyle', icon: '🏃' },
    { id: 'fitness', label: 'Fitness Goals', icon: '🎯' },
    { id: 'dietary', label: 'Dietary', icon: '🥗' }
  ];

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    calculateBMI();
  }, [profile.physicalMetrics.height.value, profile.physicalMetrics.weight.value]);

  const fetchProfile = async () => {
    try {
      const response = await axios.get('/api/health-profile', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.data.profile) {
        setProfile(response.data.profile);
        setProfileExists(true);
      }
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error('Error fetching profile:', error);
      }
    }
  };

  const calculateBMI = () => {
    const height = parseFloat(profile.physicalMetrics.height.value);
    const weight = parseFloat(profile.physicalMetrics.weight.value);
    
    if (height && weight && height > 0) {
      const heightInMeters = height / 100; // Convert cm to meters
      const bmi = weight / (heightInMeters * heightInMeters);
      
      let category = '';
      if (bmi < 18.5) category = 'Underweight';
      else if (bmi < 25) category = 'Normal weight';
      else if (bmi < 30) category = 'Overweight';
      else category = 'Obese';
      
      setCalculatedBMI({ value: bmi.toFixed(1), category });
    }
  };

  const handleInputChange = (section, field, value) => {
    setProfile(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleNestedInputChange = (section, field, subfield, value) => {
    setProfile(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: {
          ...prev[section][field],
          [subfield]: value
        }
      }
    }));
  };

  const validateCurrentTab = () => {
    const newErrors = {};
    
    switch(activeTab) {
      case 'basic':
        // Only validate essential fields
        if (!profile.demographics.age || profile.demographics.age < 1 || profile.demographics.age > 150) {
          newErrors.age = 'Age must be between 1 and 150';
        }
        if (!profile.physicalMetrics.height.value || profile.physicalMetrics.height.value < 30) {
          newErrors.height = 'Please enter a valid height';
        }
        if (!profile.physicalMetrics.weight.value || profile.physicalMetrics.weight.value < 1) {
          newErrors.weight = 'Please enter a valid weight';
        }
        break;
      
      case 'fitness':
        // Fitness goals are optional but if set, should be valid
        if (!profile.fitnessGoals.primary) {
          newErrors.primary = 'Please select a primary fitness goal';
        }
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    // Clear previous messages
    setSuccessMessage('');
    setErrors({});
    
    // Validate current tab only
    if (!validateCurrentTab()) {
      return;
    }

    setIsLoading(true);

    try {
      // Ensure we have minimal required fields with defaults
      const profileToSave = {
        ...profile,
        demographics: {
          age: profile.demographics.age || 30,
          gender: profile.demographics.gender || 'prefer_not_to_say'
        },
        physicalMetrics: {
          height: {
            value: profile.physicalMetrics.height.value || 170,
            unit: profile.physicalMetrics.height.unit || 'cm'
          },
          weight: {
            value: profile.physicalMetrics.weight.value || 70,
            unit: profile.physicalMetrics.weight.unit || 'kg'
          }
        },
        lifestyleIndicators: {
          occupationType: profile.lifestyleIndicators.occupationType || 'moderate_activity',
          activityLevel: profile.lifestyleIndicators.activityLevel || 'moderately_active',
          sleepHours: profile.lifestyleIndicators.sleepHours || 7,
          stressLevel: profile.lifestyleIndicators.stressLevel || 5,
          smokingStatus: profile.lifestyleIndicators.smokingStatus || 'never',
          alcoholConsumption: profile.lifestyleIndicators.alcoholConsumption || 'none'
        },
        fitnessGoals: {
          ...profile.fitnessGoals,
          primary: profile.fitnessGoals.primary || 'general_fitness'
        },
        initialFitnessAssessment: {
          weeklyActivityFrequency: profile.initialFitnessAssessment.weeklyActivityFrequency || 3,
          exerciseTypes: profile.initialFitnessAssessment.exerciseTypes || [],
          averageSessionDuration: profile.initialFitnessAssessment.averageSessionDuration || 30,
          fitnessLevel: profile.initialFitnessAssessment.fitnessLevel || 'intermediate',
          limitations: profile.initialFitnessAssessment.limitations || [],
          preferredWorkoutTime: profile.initialFitnessAssessment.preferredWorkoutTime || 'morning'
        }
      };

      const response = await axios.post('/api/health-profile', profileToSave, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      setProfileExists(true);
      setSuccessMessage(`✅ ${activeTab === 'basic' ? 'Basic info' : activeTab === 'fitness' ? 'Fitness goals' : activeTab} saved successfully!`);
      
      // Auto-clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
      
    } catch (error) {
      console.error('Save error:', error);
      if (error.response?.data?.errors) {
        const fieldErrors = {};
        error.response.data.errors.forEach(err => {
          const fieldName = err.path.split('.').pop();
          fieldErrors[fieldName] = err.msg;
        });
        setErrors(fieldErrors);
      } else {
        setErrors({ general: error.response?.data?.message || 'Failed to save profile' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const renderBasicInfo = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
      
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2">
            Age <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={profile.demographics.age}
            onChange={(e) => handleInputChange('demographics', 'age', parseInt(e.target.value))}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
              errors.age ? 'border-red-500' : 'border-gray-300'
            }`}
            min="1"
            max="150"
          />
          {errors.age && <p className="text-red-500 text-sm mt-1">{errors.age}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Gender</label>
          <select
            value={profile.demographics.gender}
            onChange={(e) => handleInputChange('demographics', 'gender', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="prefer_not_to_say">Prefer not to say</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Height <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={profile.physicalMetrics.height.value}
              onChange={(e) => handleNestedInputChange('physicalMetrics', 'height', 'value', parseFloat(e.target.value))}
              className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                errors.height ? 'border-red-500' : 'border-gray-300'
              }`}
              min="30"
              max="300"
            />
            <select
              value={profile.physicalMetrics.height.unit}
              onChange={(e) => handleNestedInputChange('physicalMetrics', 'height', 'unit', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="cm">cm</option>
              <option value="ft">ft</option>
            </select>
          </div>
          {errors.height && <p className="text-red-500 text-sm mt-1">{errors.height}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Weight <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={profile.physicalMetrics.weight.value}
              onChange={(e) => handleNestedInputChange('physicalMetrics', 'weight', 'value', parseFloat(e.target.value))}
              className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                errors.weight ? 'border-red-500' : 'border-gray-300'
              }`}
              min="1"
              max="500"
            />
            <select
              value={profile.physicalMetrics.weight.unit}
              onChange={(e) => handleNestedInputChange('physicalMetrics', 'weight', 'unit', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="kg">kg</option>
              <option value="lbs">lbs</option>
            </select>
          </div>
          {errors.weight && <p className="text-red-500 text-sm mt-1">{errors.weight}</p>}
        </div>
      </div>

      {calculatedBMI && (
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm font-medium">
            Calculated BMI: <span className="text-lg font-bold">{calculatedBMI.value}</span>
            <span className="ml-2 text-gray-600">({calculatedBMI.category})</span>
          </p>
        </div>
      )}
    </div>
  );

  const renderLifestyle = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">Lifestyle Indicators</h3>
      
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2">Activity Level</label>
          <select
            value={profile.lifestyleIndicators.activityLevel}
            onChange={(e) => handleInputChange('lifestyleIndicators', 'activityLevel', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="sedentary">Sedentary</option>
            <option value="lightly_active">Lightly Active</option>
            <option value="moderately_active">Moderately Active</option>
            <option value="very_active">Very Active</option>
            <option value="extremely_active">Extremely Active</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Occupation Type</label>
          <select
            value={profile.lifestyleIndicators.occupationType}
            onChange={(e) => handleInputChange('lifestyleIndicators', 'occupationType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="sedentary">Sedentary (Desk Job)</option>
            <option value="light_activity">Light Activity</option>
            <option value="moderate_activity">Moderate Activity</option>
            <option value="heavy_activity">Heavy Activity</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Sleep Hours (per night)</label>
          <input
            type="number"
            value={profile.lifestyleIndicators.sleepHours}
            onChange={(e) => handleInputChange('lifestyleIndicators', 'sleepHours', parseFloat(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            min="1"
            max="24"
            step="0.5"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Stress Level (1-10)</label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="1"
              max="10"
              value={profile.lifestyleIndicators.stressLevel}
              onChange={(e) => handleInputChange('lifestyleIndicators', 'stressLevel', parseInt(e.target.value))}
              className="flex-1"
            />
            <span className="text-lg font-semibold w-8">{profile.lifestyleIndicators.stressLevel}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderFitnessGoals = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">Fitness Goals</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Primary Goal <span className="text-red-500">*</span>
            <span className="ml-2 text-xs text-gray-500">(This will be referenced in all AI recommendations)</span>
          </label>
          <select
            value={profile.fitnessGoals.primary}
            onChange={(e) => handleInputChange('fitnessGoals', 'primary', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
              errors.primary ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="general_fitness">General Fitness</option>
            <option value="weight_loss">Weight Loss</option>
            <option value="muscle_gain">Muscle Gain</option>
            <option value="endurance">Endurance Improvement</option>
            <option value="flexibility">Flexibility</option>
            <option value="stress_reduction">Stress Reduction</option>
            <option value="health_maintenance">Health Maintenance</option>
          </select>
          {errors.primary && <p className="text-red-500 text-sm mt-1">{errors.primary}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Target Weight (Optional)</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={profile.fitnessGoals.targetWeight.value}
              onChange={(e) => handleNestedInputChange('fitnessGoals', 'targetWeight', 'value', parseFloat(e.target.value))}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Enter target weight"
            />
            <select
              value={profile.fitnessGoals.targetWeight.unit}
              onChange={(e) => handleNestedInputChange('fitnessGoals', 'targetWeight', 'unit', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="kg">kg</option>
              <option value="lbs">lbs</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Weekly Exercise Frequency</label>
          <select
            value={profile.initialFitnessAssessment.weeklyActivityFrequency}
            onChange={(e) => handleInputChange('initialFitnessAssessment', 'weeklyActivityFrequency', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {[0,1,2,3,4,5,6,7].map(num => (
              <option key={num} value={num}>{num} days per week</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Fitness Level</label>
          <select
            value={profile.initialFitnessAssessment.fitnessLevel}
            onChange={(e) => handleInputChange('initialFitnessAssessment', 'fitnessLevel', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
            <option value="elite">Elite</option>
          </select>
        </div>
      </div>

      {profile.fitnessGoals.primary && (
        <div className="mt-4 p-4 bg-green-50 rounded-lg">
          <p className="text-sm">
            <strong>Goal Set:</strong> {profile.fitnessGoals.primary.replace('_', ' ').charAt(0).toUpperCase() + profile.fitnessGoals.primary.replace('_', ' ').slice(1)}
            {profile.fitnessGoals.targetWeight.value && (
              <span> | Target: {profile.fitnessGoals.targetWeight.value} {profile.fitnessGoals.targetWeight.unit}</span>
            )}
          </p>
          <p className="text-xs text-gray-600 mt-1">
            All AI-generated insights will specifically reference this goal
          </p>
        </div>
      )}
    </div>
  );

  const renderDietary = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold mb-4">Dietary Preferences</h3>
      
      <div>
        <label className="block text-sm font-medium mb-2">Dietary Preferences</label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {['Vegetarian', 'Vegan', 'Pescatarian', 'Keto', 'Paleo', 'Mediterranean'].map(pref => (
            <label key={pref} className="flex items-center">
              <input
                type="checkbox"
                checked={profile.dietaryPreferences.includes(pref)}
                onChange={() => {
                  const current = profile.dietaryPreferences;
                  const updated = current.includes(pref)
                    ? current.filter(p => p !== pref)
                    : [...current, pref];
                  setProfile(prev => ({
                    ...prev,
                    dietaryPreferences: updated
                  }));
                }}
                className="mr-2"
              />
              {pref}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Allergies</label>
        <input
          type="text"
          value={profile.dietaryRestrictions.allergies.join(', ')}
          onChange={(e) => {
            const allergies = e.target.value.split(',').map(a => a.trim()).filter(a => a);
            setProfile(prev => ({
              ...prev,
              dietaryRestrictions: {
                ...prev.dietaryRestrictions,
                allergies
              }
            }));
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., Nuts, Shellfish, Dairy (comma-separated)"
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-lg">
            <h1 className="text-3xl font-bold">Health Profile</h1>
            <p className="mt-2 opacity-90">
              {profileExists ? 'Update your health information' : 'Create your health profile to get started'}
            </p>
          </div>

          {/* Tabs */}
          <div className="border-b">
            <nav className="flex">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-3 font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="p-6">
            {successMessage && (
              <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
                {successMessage}
              </div>
            )}

            {errors.general && (
              <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                {errors.general}
              </div>
            )}

            {activeTab === 'basic' && renderBasicInfo()}
            {activeTab === 'lifestyle' && renderLifestyle()}
            {activeTab === 'fitness' && renderFitnessGoals()}
            {activeTab === 'dietary' && renderDietary()}

            {/* Save Button */}
            <div className="mt-8 flex justify-between items-center">
              <p className="text-sm text-gray-500">
                * Required fields
              </p>
              <button
                onClick={handleSave}
                disabled={isLoading}
                className={`px-6 py-2 rounded-lg font-semibold text-white transition ${
                  isLoading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isLoading ? 'Saving...' : `Save ${tabs.find(t => t.id === activeTab)?.label}`}
              </button>
            </div>
          </div>
        </div>

        {/* Help Card */}
        <div className="mt-6 bg-blue-50 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">Quick Setup Guide</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
            <li>Fill in your basic information (age, height, weight)</li>
            <li>Set your primary fitness goal - this will appear in all AI recommendations</li>
            <li>Add any dietary preferences or restrictions</li>
            <li>Save your profile and go to the Dashboard to generate insights</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;