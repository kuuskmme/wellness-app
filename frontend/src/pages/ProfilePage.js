// src/pages/ProfilePage.js - Complete Profile page with 2FA Security Section
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import TwoFactorSetup from '../components/TwoFactorSetup';

const ProfilePage = () => {
  const { user } = useAuth();
  
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
      stressLevel: '',
      smokingStatus: '',
      alcoholConsumption: ''
    },
    dietaryPreferences: [],
    dietaryRestrictions: {
      allergies: [],
      intolerances: [],
      medicalRestrictions: []
    },
    fitnessGoals: {
      primary: '',
      secondary: [],
      targetWeight: { value: '', unit: 'kg' },
      targetDate: '',
      motivationLevel: 5
    },
    initialFitnessAssessment: {
      weeklyActivityFrequency: '',
      exerciseTypes: [],
      averageSessionDuration: '',
      fitnessLevel: '',
      limitations: [],
      preferredWorkoutTime: ''
    }
  });

  const [dataConsent, setDataConsent] = useState({
    given: false,
    timestamp: null
  });

  const [dataSharing, setDataSharing] = useState({
    publicVisibility: false,
    emailNotifications: true,
    aiInsights: true
  });

  const [calculatedBMI, setCalculatedBMI] = useState(null);
  const [profileCompleteness, setProfileCompleteness] = useState(0);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [activeSection, setActiveSection] = useState('demographics');

  // Updated sections array with Security
  const sections = [
    { id: 'demographics', label: 'Demographics', icon: '👤' },
    { id: 'physical', label: 'Physical Metrics', icon: '📏' },
    { id: 'lifestyle', label: 'Lifestyle', icon: '🏃' },
    { id: 'dietary', label: 'Dietary', icon: '🥗' },
    { id: 'fitness', label: 'Fitness Goals', icon: '🎯' },
    { id: 'assessment', label: 'Fitness Assessment', icon: '💪' },
    { id: 'security', label: 'Security', icon: '🔐' },
    { id: 'privacy', label: 'Privacy & Data', icon: '🔒' }
  ];

  useEffect(() => {
    fetchProfile();
    fetchPreferences();
  }, []);

  useEffect(() => {
    calculateBMI();
    calculateCompleteness();
  }, [profile]);

  const fetchProfile = async () => {
    try {
      const response = await axios.get('/api/health-profile', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.data.profile) {
        setProfile(response.data.profile);
      }
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error('Error fetching profile:', error);
      }
    }
  };

  const fetchPreferences = async () => {
    try {
      const response = await axios.get('/api/auth/user-preferences', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.data) {
        setDataConsent(response.data.dataConsent || { given: false });
        setDataSharing(response.data.dataSharing || {
          publicVisibility: false,
          emailNotifications: true,
          aiInsights: true
        });
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    }
  };

  const calculateBMI = () => {
    const height = parseFloat(profile.physicalMetrics.height.value);
    const weight = parseFloat(profile.physicalMetrics.weight.value);
    
    if (height && weight) {
      let heightInMeters = height;
      if (profile.physicalMetrics.height.unit === 'cm') {
        heightInMeters = height / 100;
      } else if (profile.physicalMetrics.height.unit === 'ft') {
        heightInMeters = height * 0.3048;
      }
      
      let weightInKg = weight;
      if (profile.physicalMetrics.weight.unit === 'lbs') {
        weightInKg = weight * 0.453592;
      }
      
      const bmi = weightInKg / (heightInMeters * heightInMeters);
      let category = '';
      
      if (bmi < 18.5) category = 'Underweight';
      else if (bmi < 25) category = 'Normal weight';
      else if (bmi < 30) category = 'Overweight';
      else category = 'Obese';
      
      setCalculatedBMI({ value: bmi.toFixed(1), category });
    }
  };

  const calculateCompleteness = () => {
    let filledFields = 0;
    let totalFields = 0;

    const checkField = (value) => {
      totalFields++;
      if (value && value !== '' && (Array.isArray(value) ? value.length > 0 : true)) {
        filledFields++;
      }
    };

    Object.values(profile.demographics).forEach(checkField);
    checkField(profile.physicalMetrics.height.value);
    checkField(profile.physicalMetrics.weight.value);
    Object.values(profile.lifestyleIndicators).forEach(checkField);
    checkField(profile.dietaryPreferences);
    Object.values(profile.dietaryRestrictions).forEach(checkField);
    Object.values(profile.fitnessGoals).forEach(value => {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        Object.values(value).forEach(checkField);
      } else {
        checkField(value);
      }
    });
    Object.values(profile.initialFitnessAssessment).forEach(checkField);

    const completeness = Math.round((filledFields / totalFields) * 100);
    setProfileCompleteness(completeness);
  };

  const handleInputChange = (section, field, value) => {
    setProfile(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
    
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[`${section}.${field}`];
      delete newErrors.general;
      return newErrors;
    });
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

  const handleArrayInput = (section, field, value) => {
    if (value.includes(',')) {
      const items = value.split(',').map(item => item.trim()).filter(item => item);
      setProfile(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: items
        }
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!dataConsent.given) {
      newErrors.consent = 'You must consent to data collection to save your profile';
    }

    if (profile.demographics.age && (profile.demographics.age < 1 || profile.demographics.age > 150)) {
      newErrors['demographics.age'] = 'Age must be between 1 and 150';
    }

    if (profile.physicalMetrics.height.value) {
      const height = parseFloat(profile.physicalMetrics.height.value);
      if (height < 30 || height > 300) {
        newErrors['physicalMetrics.height'] = 'Height seems unrealistic';
      }
    }

    if (profile.physicalMetrics.weight.value) {
      const weight = parseFloat(profile.physicalMetrics.weight.value);
      if (weight < 1 || weight > 500) {
        newErrors['physicalMetrics.weight'] = 'Weight seems unrealistic';
      }
    }

    if (calculatedBMI && (calculatedBMI.value < 0 || calculatedBMI.value > 100)) {
      newErrors.bmi = 'Invalid BMI calculation';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setSuccessMessage('');
      return;
    }

    setIsLoading(true);
    setErrors({});
    setSuccessMessage('');

    try {
      const profileResponse = await axios.post('/api/health-profile', profile, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      await axios.put('/api/auth/user-preferences', {
        dataConsent,
        dataSharing
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      setSuccessMessage('✅ Profile saved successfully!');
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      if (error.response?.data?.errors) {
        const newErrors = {};
        error.response.data.errors.forEach(err => {
          newErrors[err.path] = err.msg;
        });
        setErrors(newErrors);
      } else {
        setErrors({ general: error.response?.data?.message || 'Failed to save profile' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await axios.get('/api/health-profile/export', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `health-profile-${Date.now()}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      setSuccessMessage('✅ Profile exported successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Export error:', error);
      setErrors({ general: 'Failed to export profile' });
    }
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'demographics':
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold mb-4">Demographics</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Age *</label>
                <input
                  type="number"
                  value={profile.demographics.age}
                  onChange={(e) => handleInputChange('demographics', 'age', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg ${errors['demographics.age'] ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="Enter your age"
                />
                {errors['demographics.age'] && (
                  <p className="text-red-500 text-xs mt-1">{errors['demographics.age']}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Gender</label>
                <select
                  value={profile.demographics.gender}
                  onChange={(e) => handleInputChange('demographics', 'gender', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer-not-to-say">Prefer not to say</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 'physical':
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold mb-4">Physical Metrics</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Height</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={profile.physicalMetrics.height.value}
                    onChange={(e) => handleNestedInputChange('physicalMetrics', 'height', 'value', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Height"
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
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Weight</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={profile.physicalMetrics.weight.value}
                    onChange={(e) => handleNestedInputChange('physicalMetrics', 'weight', 'value', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Weight"
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
              </div>
            </div>
            {calculatedBMI && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium">
                  BMI: <span className="text-lg font-bold">{calculatedBMI.value}</span> - {calculatedBMI.category}
                </p>
              </div>
            )}
          </div>
        );

      case 'lifestyle':
  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold mb-4">Lifestyle Indicators</h3>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Activity Level</label>
          <select
            value={profile.lifestyleIndicators.activityLevel}
            onChange={(e) => handleInputChange('lifestyleIndicators', 'activityLevel', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">Select activity level</option>
            <option value="sedentary">Sedentary (little to no exercise)</option>
            <option value="lightly-active">Lightly Active (1-3 days/week)</option>
            <option value="moderately-active">Moderately Active (3-5 days/week)</option>
            <option value="very-active">Very Active (6-7 days/week)</option>
            <option value="extra-active">Extra Active (physical job/2x daily)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Sleep Hours</label>
          <input
            type="number"
            value={profile.lifestyleIndicators.sleepHours}
            onChange={(e) => handleInputChange('lifestyleIndicators', 'sleepHours', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            placeholder="Average hours per night"
            min="0"
            max="24"
            step="0.5"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Stress Level (1-10)</label>
          <input
            type="number"
            value={profile.lifestyleIndicators.stressLevel || ''}
            onChange={(e) => handleInputChange('lifestyleIndicators', 'stressLevel', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            placeholder="1 (low) to 10 (high)"
            min="1"
            max="10"
          />
          <p className="text-xs text-gray-500 mt-1">1-3: Low, 4-6: Moderate, 7-10: High</p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Occupation Type</label>
          <select
            value={profile.lifestyleIndicators.occupationType}
            onChange={(e) => handleInputChange('lifestyleIndicators', 'occupationType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">Select occupation type</option>
            <option value="sedentary">Sedentary (desk job)</option>
            <option value="light">Light Activity</option>
            <option value="moderate">Moderate Activity</option>
            <option value="heavy">Heavy Physical Work</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Smoking Status</label>
          <select
            value={profile.lifestyleIndicators.smokingStatus}
            onChange={(e) => handleInputChange('lifestyleIndicators', 'smokingStatus', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">Select status</option>
            <option value="never">Never Smoked</option>
            <option value="former">Former Smoker</option>
            <option value="current">Current Smoker</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Alcohol Consumption</label>
          <select
            value={profile.lifestyleIndicators.alcoholConsumption}
            onChange={(e) => handleInputChange('lifestyleIndicators', 'alcoholConsumption', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">Select consumption</option>
            <option value="none">None</option>
            <option value="occasional">Occasional (1-2 drinks/week)</option>
            <option value="moderate">Moderate (3-7 drinks/week)</option>
            <option value="heavy">Heavy (8+ drinks/week)</option>
          </select>
        </div>
      </div>
    </div>
  );

      case 'dietary':
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold mb-4">Dietary Preferences & Restrictions</h3>
            <div>
              <label className="block text-sm font-medium mb-2">Dietary Preferences</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {['Vegetarian', 'Vegan', 'Pescatarian', 'Keto', 'Paleo', 'Mediterranean'].map(pref => (
                  <label key={pref} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={profile.dietaryPreferences.includes(pref.toLowerCase())}
                      onChange={() => handleArrayChange('dietaryPreferences', null, pref.toLowerCase())}
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
                placeholder="Enter allergies separated by commas"
                onBlur={(e) => handleArrayInput('dietaryRestrictions', 'allergies', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              {profile.dietaryRestrictions.allergies.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {profile.dietaryRestrictions.allergies.map((allergy, idx) => (
                    <span key={idx} className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                      {allergy}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 'fitness':
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold mb-4">Fitness Goals</h3>
            
            {/* Success message for this section */}
            {successMessage && (
              <div className="p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
                {successMessage}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium mb-2">Primary Goal *</label>
              <select
                value={profile.fitnessGoals.primary || ''}
                onChange={(e) => handleInputChange('fitnessGoals', 'primary', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select primary goal</option>
                <option value="weight-loss">Weight Loss</option>
                <option value="muscle-gain">Muscle Gain</option>
                <option value="endurance">Improve Endurance</option>
                <option value="strength">Build Strength</option>
                <option value="flexibility">Improve Flexibility</option>
                <option value="general-health">General Health</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">This goal will be referenced in all AI recommendations</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Target Weight</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={profile.fitnessGoals.targetWeight.value || ''}
                  onChange={(e) => handleNestedInputChange('fitnessGoals', 'targetWeight', 'value', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Target weight"
                  min="1"
                  max="500"
                />
                <select
                  value={profile.fitnessGoals.targetWeight.unit || 'kg'}
                  onChange={(e) => handleNestedInputChange('fitnessGoals', 'targetWeight', 'unit', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="kg">kg</option>
                  <option value="lbs">lbs</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Target Date</label>
              <input
                type="date"
                value={profile.fitnessGoals.targetDate || ''}
                onChange={(e) => handleInputChange('fitnessGoals', 'targetDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Motivation Level</label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={profile.fitnessGoals.motivationLevel || 5}
                  onChange={(e) => handleInputChange('fitnessGoals', 'motivationLevel', e.target.value)}
                  className="flex-1"
                />
                <span className="text-lg font-semibold w-8">{profile.fitnessGoals.motivationLevel || 5}</span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Secondary Goals (Optional)</label>
              <div className="grid grid-cols-2 gap-2">
                {['Lose Fat', 'Build Muscle', 'Increase Stamina', 'Improve Flexibility', 'Better Sleep', 'Reduce Stress'].map(goal => (
                  <label key={goal} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={profile.fitnessGoals.secondary?.includes(goal) || false}
                      onChange={() => {
                        const current = profile.fitnessGoals.secondary || [];
                        const updated = current.includes(goal) 
                          ? current.filter(g => g !== goal)
                          : [...current, goal];
                        handleInputChange('fitnessGoals', 'secondary', updated);
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm">{goal}</span>
                  </label>
                ))}
              </div>
            </div>
            
            {/* Preview of how goals will appear in AI */}
            {profile.fitnessGoals.primary && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-sm mb-2">AI Insights Preview:</h4>
                <p className="text-sm text-gray-700">
                  "All recommendations will be tailored for your <strong>{profile.fitnessGoals.primary.replace(/-/g, ' ')}</strong> goal
                  {profile.fitnessGoals.targetWeight.value && ` with a target weight of ${profile.fitnessGoals.targetWeight.value} ${profile.fitnessGoals.targetWeight.unit}`}."
                </p>
              </div>
            )}
          </div>
        );

      case 'assessment':
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold mb-4">Initial Fitness Assessment</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Weekly Activity Frequency</label>
                <select
                  value={profile.initialFitnessAssessment.weeklyActivityFrequency}
                  onChange={(e) => handleInputChange('initialFitnessAssessment', 'weeklyActivityFrequency', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select frequency</option>
                  <option value="0">No regular activity</option>
                  <option value="1-2">1-2 times per week</option>
                  <option value="3-4">3-4 times per week</option>
                  <option value="5-6">5-6 times per week</option>
                  <option value="7+">Daily or more</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Average Session Duration</label>
                <select
                  value={profile.initialFitnessAssessment.averageSessionDuration}
                  onChange={(e) => handleInputChange('initialFitnessAssessment', 'averageSessionDuration', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select duration</option>
                  <option value="<15">Less than 15 minutes</option>
                  <option value="15-30">15-30 minutes</option>
                  <option value="30-45">30-45 minutes</option>
                  <option value="45-60">45-60 minutes</option>
                  <option value=">60">More than 60 minutes</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Current Fitness Level</label>
                <select
                  value={profile.initialFitnessAssessment.fitnessLevel}
                  onChange={(e) => handleInputChange('initialFitnessAssessment', 'fitnessLevel', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select fitness level</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="athlete">Athlete</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Preferred Workout Time</label>
                <select
                  value={profile.initialFitnessAssessment.preferredWorkoutTime}
                  onChange={(e) => handleInputChange('initialFitnessAssessment', 'preferredWorkoutTime', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select preferred time</option>
                  <option value="early-morning">Early Morning (5-7 AM)</option>
                  <option value="morning">Morning (7-10 AM)</option>
                  <option value="midday">Midday (10 AM-2 PM)</option>
                  <option value="afternoon">Afternoon (2-5 PM)</option>
                  <option value="evening">Evening (5-8 PM)</option>
                  <option value="night">Night (8 PM+)</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold mb-4">Security Settings</h3>
            
            {/* Two-Factor Authentication Component */}
            <TwoFactorSetup />
            
            {/* Password Change Section */}
            <div className="bg-gray-50 rounded-lg p-6 mt-6">
              <h4 className="text-lg font-semibold mb-3">Password</h4>
              <p className="text-gray-600 mb-4">
                Keep your account secure by using a strong password
              </p>
              <Link 
                to="/forgot-password" 
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition inline-block"
              >
                Change Password
              </Link>
            </div>
            
            {/* Login Activity (Optional) */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h4 className="text-lg font-semibold mb-3">Recent Activity</h4>
              <p className="text-gray-600">
                Last login: {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
              </p>
            </div>
          </div>
        );

      case 'privacy':
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold mb-4">Privacy & Data Settings</h3>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Data Collection Consent</h4>
              <label className="flex items-start">
                <input
                  type="checkbox"
                  checked={dataConsent.given}
                  onChange={(e) => setDataConsent({
                    given: e.target.checked,
                    timestamp: e.target.checked ? new Date().toISOString() : null
                  })}
                  className="mt-1 mr-3"
                />
                <span className="text-sm">
                  I consent to the collection and processing of my health data for personalized wellness insights and recommendations.
                  This data will be stored securely and used only to improve my wellness experience.
                </span>
              </label>
              {errors.consent && (
                <p className="text-red-500 text-sm mt-2">{errors.consent}</p>
              )}
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold">Data Sharing Preferences</h4>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={dataSharing.publicVisibility}
                  onChange={(e) => setDataSharing({
                    ...dataSharing,
                    publicVisibility: e.target.checked
                  })}
                  className="mr-3"
                />
                <span>Make my progress visible to other users (anonymous)</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={dataSharing.emailNotifications}
                  onChange={(e) => setDataSharing({
                    ...dataSharing,
                    emailNotifications: e.target.checked
                  })}
                  className="mr-3"
                />
                <span>Receive email notifications about my progress</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={dataSharing.aiInsights}
                  onChange={(e) => setDataSharing({
                    ...dataSharing,
                    aiInsights: e.target.checked
                  })}
                  className="mr-3"
                />
                <span>Use AI to generate personalized insights</span>
              </label>
            </div>

            <div className="mt-6 pt-6 border-t">
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
              >
                Export My Data
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Health Profile</h2>
              <div className="flex items-center gap-4">
                <div className="text-sm">
                  <span className="text-gray-500">Profile Completeness:</span>
                  <span className="ml-2 font-semibold">{profileCompleteness}%</span>
                </div>
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${profileCompleteness}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex">
            {/* Sidebar */}
            <div className="w-64 border-r border-gray-200">
              <nav className="p-4">
                {sections.map(section => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full text-left px-4 py-2 rounded-lg mb-2 flex items-center transition ${
                      activeSection === section.id
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <span className="mr-3">{section.icon}</span>
                    {section.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-6">
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

              <form onSubmit={handleSubmit}>
                {renderSection()}

                {/* Save button - only show for non-security sections */}
                {activeSection !== 'security' && (
                  <div className="mt-6 flex justify-end">
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
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;