export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Health status categories
export const BMI_CATEGORIES = {
  UNDERWEIGHT: 'underweight',
  NORMAL: 'normal',
  OVERWEIGHT: 'overweight',
  OBESE: 'obese'
};

// Activity levels
export const ACTIVITY_LEVELS = {
  SEDENTARY: 'sedentary',
  LIGHT: 'light',
  MODERATE: 'moderate',
  ACTIVE: 'active',
  VERY_ACTIVE: 'very-active'
};

// Wellness score ranges
export const WELLNESS_SCORE_RANGES = {
  EXCELLENT: { min: 90, max: 100, label: 'Excellent' },
  GOOD: { min: 75, max: 89, label: 'Good' },
  AVERAGE: { min: 60, max: 74, label: 'Average' },
  FAIR: { min: 40, max: 59, label: 'Fair' },
  POOR: { min: 0, max: 39, label: 'Poor' }
};