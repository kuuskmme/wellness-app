import { BMI_CATEGORIES, WELLNESS_SCORE_RANGES } from '../config/constants';

/**
 * Format date to display in a user-friendly way
 * @param {string} dateString - ISO date string
 * @param {boolean} includeTime - Whether to include time
 * @returns {string} Formatted date string
 */
export const formatDate = (dateString, includeTime = false) => {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  const options = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...(includeTime && { hour: '2-digit', minute: '2-digit' })
  };
  
  return date.toLocaleDateString('en-US', options);
};

/**
 * Get color based on BMI category
 * @param {string} category - BMI category
 * @returns {string} Hex color code
 */
export const getBmiCategoryColor = (category) => {
  switch (category) {
    case BMI_CATEGORIES.UNDERWEIGHT:
      return '#FFC107'; // yellow
    case BMI_CATEGORIES.NORMAL:
      return '#4CAF50'; // green
    case BMI_CATEGORIES.OVERWEIGHT:
      return '#FF9800'; // orange
    case BMI_CATEGORIES.OBESE:
      return '#F44336'; // red
    default:
      return '#9E9E9E'; // grey
  }
};

/**
 * Get color based on wellness score
 * @param {number} score - Wellness score (0-100)
 * @returns {string} Hex color code
 */
export const getWellnessScoreColor = (score) => {
  if (score >= WELLNESS_SCORE_RANGES.EXCELLENT.min) return '#4CAF50'; // green
  if (score >= WELLNESS_SCORE_RANGES.GOOD.min) return '#8BC34A'; // light green
  if (score >= WELLNESS_SCORE_RANGES.AVERAGE.min) return '#FFC107'; // yellow
  if (score >= WELLNESS_SCORE_RANGES.FAIR.min) return '#FF9800'; // orange
  return '#F44336'; // red
};

/**
 * Get wellness score label
 * @param {number} score - Wellness score (0-100)
 * @returns {string} Label (Excellent, Good, etc.)
 */
export const getWellnessScoreLabel = (score) => {
  if (score >= WELLNESS_SCORE_RANGES.EXCELLENT.min) return WELLNESS_SCORE_RANGES.EXCELLENT.label;
  if (score >= WELLNESS_SCORE_RANGES.GOOD.min) return WELLNESS_SCORE_RANGES.GOOD.label;
  if (score >= WELLNESS_SCORE_RANGES.AVERAGE.min) return WELLNESS_SCORE_RANGES.AVERAGE.label;
  if (score >= WELLNESS_SCORE_RANGES.FAIR.min) return WELLNESS_SCORE_RANGES.FAIR.label;
  return WELLNESS_SCORE_RANGES.POOR.label;
};

/**
 * Format weight with unit
 * @param {Object} weight - Weight object { value, unit }
 * @returns {string} Formatted weight string
 */
export const formatWeight = (weight) => {
  if (!weight || !weight.value) return 'N/A';
  return `${weight.value} ${weight.unit}`;
};

/**
 * Format height with unit
 * @param {Object} height - Height object { value, unit }
 * @returns {string} Formatted height string
 */
export const formatHeight = (height) => {
  if (!height || !height.value) return 'N/A';
  return `${height.value} ${height.unit}`;
};

/**
 * Convert data for chart.js time series
 * @param {Array} data - Array of objects with date and value properties
 * @param {string} dateKey - Key for date in each object
 * @param {string} valueKey - Key for value in each object
 * @returns {Object} Formatted data for Chart.js
 */
export const formatTimeSeriesForChart = (data, dateKey, valueKey, label) => {
  // Sort by date ascending
  const sortedData = [...data].sort((a, b) => new Date(a[dateKey]) - new Date(b[dateKey]));
  
  return {
    labels: sortedData.map(item => formatDate(item[dateKey])),
    datasets: [
      {
        label: label || 'Value',
        data: sortedData.map(item => {
          // Handle nested properties like 'weight.value'
          if (valueKey.includes('.')) {
            const [parentKey, childKey] = valueKey.split('.');
            return item[parentKey] ? item[parentKey][childKey] : null;
          }
          return item[valueKey];
        }),
        fill: false,
        borderColor: '#3f51b5',
        tension: 0.1
      }
    ]
  };
};

/**
 * Convert wellness score factors to chart data
 * @param {Object} factors - Object with factor keys and values
 * @returns {Object} Formatted data for Chart.js
 */
export const formatWellnessFactorsForChart = (factors) => {
  const labels = Object.keys(factors).map(key => key.charAt(0).toUpperCase() + key.slice(1));
  const data = Object.values(factors);
  
  return {
    labels,
    datasets: [
      {
        label: 'Wellness Factors',
        data,
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)'
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)'
        ],
        borderWidth: 1
      }
    ]
  };
};

/**
 * Format goal progress data for charts
 * @param {Array} goals - Array of goal objects
 * @returns {Object} Formatted data for Chart.js
 */
export const formatGoalsForChart = (goals) => {
  return {
    labels: goals.map(goal => goal.type),
    datasets: [
      {
        label: 'Progress (%)',
        data: goals.map(goal => goal.progress || 0),
        backgroundColor: goals.map(goal => {
          const progress = goal.progress || 0;
          if (progress >= 75) return 'rgba(76, 175, 80, 0.6)'; // green
          if (progress >= 50) return 'rgba(255, 193, 7, 0.6)'; // yellow
          if (progress >= 25) return 'rgba(255, 152, 0, 0.6)'; // orange
          return 'rgba(244, 67, 54, 0.6)'; // red
        }),
        borderColor: 'rgba(0, 0, 0, 0.1)',
        borderWidth: 1
      }
    ]
  };
};