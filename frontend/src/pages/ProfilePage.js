// src/pages/ProfilePage.js - Enhanced Health Profile page with Step 3 requirements
import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const ProfilePage = () => {
  const { user } = useContext(AuthContext);
  
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
      motivationLevel: ''
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

  const sections = [
    { id: 'demographics', name: 'Demographics', icon: '👤' },
    { id: 'physical', name: 'Physical Metrics', icon: '📏' },
    { id: 'lifestyle', name: 'Lifestyle', icon: '🏃' },
    { id: 'dietary', name: 'Dietary', icon: '🥗' },
    { id: 'goals', name: 'Fitness Goals', icon: '🎯' },
    { id: 'assessment', name: 'Fitness Assessment', icon: '💪' },
    { id: 'privacy', name: 'Privacy & Consent', icon: '🔒' }
  ];

  const dietaryOptions = [
    'vegetarian', 'vegan', 'pescatarian', 'keto', 'paleo', 'mediterranean',
    'gluten_free', 'dairy_free', 'nut_free', 'halal', 'kosher',
    'low_sodium', 'low_sugar', 'none'
  ];

  const exerciseTypeOptions = [
    'cardio', 'strength_training', 'yoga', 'pilates', 'swimming',
    'cycling', 'running', 'walking', 'sports', 'dance', 'martial_arts', 'other'
  ];

  useEffect(() => {
    fetchProfile();
    fetchDataPreferences();
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

  const fetchDataPreferences = async () => {
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
    const height = profile.physicalMetrics.height.value;
    const weight = profile.physicalMetrics.weight.value;
    
    if (height && weight) {
      let heightInCm = height;
      let weightInKg = weight;

      // Convert to standard units
      if (profile.physicalMetrics.height.unit === 'inches') {
        heightInCm = height * 2.54;
      } else if (profile.physicalMetrics.height.unit === 'feet') {
        heightInCm = height * 30.48;
      }

      if (profile.physicalMetrics.weight.unit === 'lbs') {
        weightInKg = weight * 0.453592;
      }

      const heightInM = heightInCm / 100;
      const bmi = weightInKg / (heightInM * heightInM);
      
      let category;
      if (bmi < 18.5) category = 'Underweight';
      else if (bmi < 25) category = 'Normal';
      else if (bmi < 30) category = 'Overweight';
      else category = 'Obese';

      setCalculatedBMI({
        value: bmi.toFixed(1),
        category,
        color: category === 'Normal' ? 'text-green-600' : 
               category === 'Underweight' ? 'text-yellow-600' :
               category === 'Overweight' ? 'text-orange-600' : 'text-red-600'
      });
    }
  };

  const calculateCompleteness = () => {
    let completed = 0;
    let total = 0;

    // Check each field
    const checkField = (value) => {
      total++;
      if (value && value !== '' && (Array.isArray(value) ? value.length > 0 : true)) {
        completed++;
      }
    };

    // Demographics
    checkField(profile.demographics.age);
    checkField(profile.demographics.gender);

    // Physical
    checkField(profile.physicalMetrics.height.value);
    checkField(profile.physicalMetrics.weight.value);

    // Lifestyle
    checkField(profile.lifestyleIndicators.occupationType);
    checkField(profile.lifestyleIndicators.activityLevel);
    checkField(profile.lifestyleIndicators.sleepHours);
    checkField(profile.lifestyleIndicators.stressLevel);

    // Goals
    checkField(profile.fitnessGoals.primary);

    // Assessment
    checkField(profile.initialFitnessAssessment.weeklyActivityFrequency);
    checkField(profile.initialFitnessAssessment.fitnessLevel);

    const completeness = Math.round((completed / total) * 100);
    setProfileCompleteness(completeness);
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
    
    // Clear field-specific errors
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[`${section}.${field}`];
      delete newErrors.general;
      return newErrors;
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

    // Validate consent
    if (!dataConsent.given) {
      newErrors.consent = 'You must consent to data collection to save your profile';
    }

    // Validate age
    if (profile.demographics.age && (profile.demographics.age < 1 || profile.demographics.age > 150)) {
      newErrors['demographics.age'] = 'Age must be between 1 and 150';
    }

    // Validate height
    if (profile.physicalMetrics.height.value) {
      const height = parseFloat(profile.physicalMetrics.height.value);
      if (height < 30 || height > 300) {
        newErrors['physicalMetrics.height'] = 'Height seems unrealistic';
      }
    }

    // Validate weight
    if (profile.physicalMetrics.weight.value) {
      const weight = parseFloat(profile.physicalMetrics.weight.value);
      if (weight < 1 || weight > 500) {
        newErrors['physicalMetrics.weight'] = 'Weight seems unrealistic';
      }
    }

    // Validate BMI if calculated
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
      // Save profile
      const profileResponse = await axios.post('/api/health-profile', profile, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      // Save data preferences
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
      
      // Create download link
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
                  min="1"
                  max="150"
                />
                {errors['demographics.age'] && (
                  <p className="text-red-500 text-sm mt-1">{errors['demographics.age']}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Gender *</label>
                <select
                  value={profile.demographics.gender}
                  onChange={(e) => handleInputChange('demographics', 'gender', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
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
                <label className="block text-sm font-medium mb-2">Height *</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={profile.physicalMetrics.height.value}
                    onChange={(e) => handleInputChange('physicalMetrics', 'height', e.target.value, 'value')}
                    className={`flex-1 px-3 py-2 border rounded-lg ${errors['physicalMetrics.height'] ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="Height"
                    step="0.1"
                  />
                  <select
                    value={profile.physicalMetrics.height.unit}
                    onChange={(e) => handleInputChange('physicalMetrics', 'height', e.target.value, 'unit')}
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="cm">cm</option>
                    <option value="inches">inches</option>
                    <option value="feet">feet</option>
                  </select>
                </div>
                {errors['physicalMetrics.height'] && (
                  <p className="text-red-500 text-sm mt-1">{errors['physicalMetrics.height']}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Weight *</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={profile.physicalMetrics.weight.value}
                    onChange={(e) => handleInputChange('physicalMetrics', 'weight', e.target.value, 'value')}
                    className={`flex-1 px-3 py-2 border rounded-lg ${errors['physicalMetrics.weight'] ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="Weight"
                    step="0.1"
                  />
                  <select
                    value={profile.physicalMetrics.weight.unit}
                    onChange={(e) => handleInputChange('physicalMetrics', 'weight', e.target.value, 'unit')}
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="kg">kg</option>
                    <option value="lbs">lbs</option>
                  </select>
                </div>
                {errors['physicalMetrics.weight'] && (
                  <p className="text-red-500 text-sm mt-1">{errors['physicalMetrics.weight']}</p>
                )}
              </div>
            </div>

            {calculatedBMI && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Your BMI:</p>
                <p className={`text-2xl font-bold ${calculatedBMI.color}`}>
                  {calculatedBMI.value} - {calculatedBMI.category}
                </p>
                {errors.bmi && (
                  <p className="text-red-500 text-sm mt-1">{errors.bmi}</p>
                )}
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
                <label className="block text-sm font-medium mb-2">Occupation Type *</label>
                <select
                  value={profile.lifestyleIndicators.occupationType}
                  onChange={(e) => handleInputChange('lifestyleIndicators', 'occupationType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select type</option>
                  <option value="sedentary">Sedentary (Desk job)</option>
                  <option value="light_activity">Light Activity</option>
                  <option value="moderate_activity">Moderate Activity</option>
                  <option value="heavy_activity">Heavy Activity</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Activity Level *</label>
                <select
                  value={profile.lifestyleIndicators.activityLevel}
                  onChange={(e) => handleInputChange('lifestyleIndicators', 'activityLevel', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select level</option>
                  <option value="sedentary">Sedentary</option>
                  <option value="lightly_active">Lightly Active</option>
                  <option value="moderately_active">Moderately Active</option>
                  <option value="very_active">Very Active</option>
                  <option value="extremely_active">Extremely Active</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Sleep Hours</label>
                <input
                  type="number"
                  value={profile.lifestyleIndicators.sleepHours}
                  onChange={(e) => handleInputChange('lifestyleIndicators', 'sleepHours', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Hours per night"
                  min="0"
                  max="24"
                  step="0.5"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Stress Level</label>
                <input
                  type="range"
                  value={profile.lifestyleIndicators.stressLevel || 5}
                  onChange={(e) => handleInputChange('lifestyleIndicators', 'stressLevel', e.target.value)}
                  className="w-full"
                  min="1"
                  max="10"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Low (1)</span>
                  <span>{profile.lifestyleIndicators.stressLevel || 5}</span>
                  <span>High (10)</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Smoking Status</label>
                <select
                  value={profile.lifestyleIndicators.smokingStatus}
                  onChange={(e) => handleInputChange('lifestyleIndicators', 'smokingStatus', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select status</option>
                  <option value="never">Never</option>
                  <option value="former">Former</option>
                  <option value="current">Current</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Alcohol Consumption</label>
                <select
                  value={profile.lifestyleIndicators.alcoholConsumption}
                  onChange={(e) => handleInputChange('lifestyleIndicators', 'alcoholConsumption', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select level</option>
                  <option value="none">None</option>
                  <option value="occasional">Occasional</option>
                  <option value="moderate">Moderate</option>
                  <option value="heavy">Heavy</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
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
                {dietaryOptions.map(option => (
                  <label key={option} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={profile.dietaryPreferences.includes(option)}
                      onChange={() => handleArrayChange('dietaryPreferences', null, option)}
                      className="rounded text-blue-600"
                    />
                    <span className="text-sm capitalize">{option.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Allergies</label>
              <input
                type="text"
                value={profile.dietaryRestrictions.allergies?.join(', ') || ''}
                onChange={(e) => handleArrayInput('dietaryRestrictions', 'allergies', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Enter allergies separated by commas (e.g., peanuts, shellfish)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Intolerances</label>
              <input
                type="text"
                value={profile.dietaryRestrictions.intolerances?.join(', ') || ''}
                onChange={(e) => handleArrayInput('dietaryRestrictions', 'intolerances', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Enter intolerances separated by commas (e.g., lactose, gluten)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Medical Restrictions</label>
              <input
                type="text"
                value={profile.dietaryRestrictions.medicalRestrictions?.join(', ') || ''}
                onChange={(e) => handleArrayInput('dietaryRestrictions', 'medicalRestrictions', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Enter medical dietary restrictions"
              />
            </div>
          </div>
        );

      case 'goals':
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold mb-4">Fitness Goals</h3>
            
            <div>
              <label className="block text-sm font-medium mb-2">Primary Goal *</label>
              <select
                value={profile.fitnessGoals.primary}
                onChange={(e) => handleInputChange('fitnessGoals', 'primary', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Select primary goal</option>
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
              <label className="block text-sm font-medium mb-2">Secondary Goals</label>
              <div className="grid grid-cols-2 gap-2">
                {['weight_loss', 'muscle_gain', 'endurance', 'flexibility', 'general_fitness', 'stress_reduction', 'health_maintenance'].map(goal => (
                  <label key={goal} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={profile.fitnessGoals.secondary?.includes(goal) || false}
                      onChange={() => handleArrayChange('fitnessGoals', 'secondary', goal)}
                      disabled={profile.fitnessGoals.primary === goal}
                      className="rounded text-blue-600"
                    />
                    <span className="text-sm capitalize">{goal.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Target Weight</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={profile.fitnessGoals.targetWeight?.value || ''}
                    onChange={(e) => handleInputChange('fitnessGoals', 'targetWeight', e.target.value, 'value')}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Target weight"
                    step="0.1"
                  />
                  <select
                    value={profile.fitnessGoals.targetWeight?.unit || 'kg'}
                    onChange={(e) => handleInputChange('fitnessGoals', 'targetWeight', e.target.value, 'unit')}
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Motivation Level</label>
              <input
                type="range"
                value={profile.fitnessGoals.motivationLevel || 5}
                onChange={(e) => handleInputChange('fitnessGoals', 'motivationLevel', e.target.value)}
                className="w-full"
                min="1"
                max="10"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Low (1)</span>
                <span>{profile.fitnessGoals.motivationLevel || 5}</span>
                <span>High (10)</span>
              </div>
            </div>
          </div>
        );

      case 'assessment':
        return (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold mb-4">Initial Fitness Assessment</h3>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Weekly Activity Frequency *</label>
                <input
                  type="number"
                  value={profile.initialFitnessAssessment.weeklyActivityFrequency}
                  onChange={(e) => handleInputChange('initialFitnessAssessment', 'weeklyActivityFrequency', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Days per week"
                  min="0"
                  max="7"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Average Session Duration</label>
                <input
                  type="number"
                  value={profile.initialFitnessAssessment.averageSessionDuration}
                  onChange={(e) => handleInputChange('initialFitnessAssessment', 'averageSessionDuration', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Minutes"
                  min="0"
                  max="480"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Exercise Types</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {exerciseTypeOptions.map(type => (
                  <label key={type} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={profile.initialFitnessAssessment.exerciseTypes?.includes(type) || false}
                      onChange={() => handleArrayChange('initialFitnessAssessment', 'exerciseTypes', type)}
                      className="rounded text-blue-600"
                    />
                    <span className="text-sm capitalize">{type.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Fitness Level *</label>
                <select
                  value={profile.initialFitnessAssessment.fitnessLevel}
                  onChange={(e) => handleInputChange('initialFitnessAssessment', 'fitnessLevel', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select level</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="expert">Expert</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Preferred Workout Time</label>
                <select
                  value={profile.initialFitnessAssessment.preferredWorkoutTime}
                  onChange={(e) => handleInputChange('initialFitnessAssessment', 'preferredWorkoutTime', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select time</option>
                  <option value="early_morning">Early Morning (5-7 AM)</option>
                  <option value="morning">Morning (7-10 AM)</option>
                  <option value="afternoon">Afternoon (12-4 PM)</option>
                  <option value="evening">Evening (4-8 PM)</option>
                  <option value="night">Night (8 PM+)</option>
                  <option value="flexible">Flexible</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Physical Limitations or Injuries</label>
              <input
                type="text"
                value={profile.initialFitnessAssessment.limitations?.join(', ') || ''}
                onChange={(e) => handleArrayInput('initialFitnessAssessment', 'limitations', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Enter any limitations separated by commas (e.g., bad knee, back pain)"
              />
            </div>
          </div>
        );

      case 'privacy':
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold mb-4">Privacy & Data Consent</h3>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Data Collection & Usage</h4>
              <p className="text-sm text-blue-800 mb-4">
                We collect your health metrics to provide personalized wellness insights and track your progress. 
                Your data is encrypted and never shared without your explicit consent.
              </p>
              
              <label className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  checked={dataConsent.given}
                  onChange={(e) => setDataConsent({
                    given: e.target.checked,
                    timestamp: e.target.checked ? new Date().toISOString() : null
                  })}
                  className="mt-1 rounded text-blue-600"
                />
                <span className="text-sm">
                  I consent to the collection and processing of my health data as described above. 
                  I understand that I can withdraw this consent at any time. *
                </span>
              </label>
              {errors.consent && (
                <p className="text-red-500 text-sm mt-2">{errors.consent}</p>
              )}
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold">Data Sharing Preferences</h4>
              
              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="font-medium">Public Profile Visibility</span>
                  <p className="text-sm text-gray-600">Allow others to see your progress and achievements</p>
                </div>
                <input
                  type="checkbox"
                  checked={dataSharing.publicVisibility}
                  onChange={(e) => setDataSharing(prev => ({
                    ...prev,
                    publicVisibility: e.target.checked
                  }))}
                  className="rounded text-blue-600"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="font-medium">Email Notifications</span>
                  <p className="text-sm text-gray-600">Receive wellness tips and progress updates</p>
                </div>
                <input
                  type="checkbox"
                  checked={dataSharing.emailNotifications}
                  onChange={(e) => setDataSharing(prev => ({
                    ...prev,
                    emailNotifications: e.target.checked
                  }))}
                  className="rounded text-blue-600"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="font-medium">AI-Powered Insights</span>
                  <p className="text-sm text-gray-600">Use AI to generate personalized recommendations</p>
                </div>
                <input
                  type="checkbox"
                  checked={dataSharing.aiInsights}
                  onChange={(e) => setDataSharing(prev => ({
                    ...prev,
                    aiInsights: e.target.checked
                  }))}
                  className="rounded text-blue-600"
                />
              </label>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Your Rights</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• You can request a copy of all your data at any time</li>
                <li>• You can update or correct your information</li>
                <li>• You can request deletion of your account and all associated data</li>
                <li>• You can withdraw consent for data processing</li>
              </ul>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Health Profile</h1>
            <p className="text-gray-600 mt-1">Complete your profile to get personalized insights</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500 mb-2">Profile Completeness</div>
            <div className="flex items-center gap-3">
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${profileCompleteness}%` }}
                />
              </div>
              <span className="font-semibold">{profileCompleteness}%</span>
            </div>
          </div>
        </div>

        {/* Export Button */}
        <button
          onClick={handleExport}
          className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
        >
          <span>📥</span> Export Health Data
        </button>
      </div>

      {/* Messages */}
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

      {/* Main Content */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="flex border-b">
          {/* Section Navigation */}
          <div className="w-64 border-r bg-gray-50">
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-gray-100 transition ${
                  activeSection === section.id ? 'bg-white border-l-4 border-blue-600' : ''
                }`}
              >
                <span className="text-xl">{section.icon}</span>
                <span className={activeSection === section.id ? 'font-semibold' : ''}>
                  {section.name}
                </span>
              </button>
            ))}
          </div>

          {/* Section Content */}
          <div className="flex-1 p-6">
            <form onSubmit={handleSubmit}>
              {renderSection()}

              {/* Form Actions */}
              <div className="flex justify-between mt-8 pt-6 border-t">
                <button
                  type="button"
                  onClick={() => {
                    const currentIndex = sections.findIndex(s => s.id === activeSection);
                    if (currentIndex > 0) {
                      setActiveSection(sections[currentIndex - 1].id);
                    }
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  disabled={activeSection === sections[0].id}
                >
                  Previous
                </button>

                <div className="flex gap-3">
                  {activeSection === sections[sections.length - 1].id ? (
                    <button
                      type="submit"
                      disabled={isLoading || !dataConsent.given}
                      className="px-8 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? 'Saving...' : 'Save Profile'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        const currentIndex = sections.findIndex(s => s.id === activeSection);
                        if (currentIndex < sections.length - 1) {
                          setActiveSection(sections[currentIndex + 1].id);
                        }
                      }}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      Next
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;