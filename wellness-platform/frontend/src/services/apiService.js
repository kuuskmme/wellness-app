import axios from 'axios';
import { API_URL } from '../config/constants';

// Create an axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Authentication services
export const authService = {
  login: (email, password) => api.post('/api/auth/login', { email, password }),
  register: (userData) => api.post('/api/auth/register', userData),
  logout: () => api.post('/api/auth/logout'),
  verifyEmail: (token) => api.post('/api/auth/verify-email', { token }),
  forgotPassword: (email) => api.post('/api/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/api/auth/reset-password', { token, password })
};

// User services
export const userService = {
  getCurrentUser: () => api.get('/api/users/me'),
  updateUser: (userData) => api.put('/api/users/me', userData),
  deleteUser: () => api.delete('/api/users/me'),
  getPrivacySettings: () => api.get('/api/users/me/privacy'),
  updatePrivacySettings: (settings) => api.put('/api/users/me/privacy', settings)
};

// Health profile services
export const healthProfileService = {
  getHealthProfile: () => api.get('/api/health-profile'),
  createHealthProfile: (profileData) => api.post('/api/health-profile', profileData),
  updateHealthProfile: (profileData) => api.put('/api/health-profile', profileData),
  deleteHealthProfile: () => api.delete('/api/health-profile'),
  
  // Physical metrics
  getMetrics: () => api.get('/api/health-profile/metrics'),
  getLatestMetrics: () => api.get('/api/health-profile/metrics/latest'),
  getMetricsById: (id) => api.get(`/api/health-profile/metrics/${id}`),
  addMetrics: (metricsData) => api.post('/api/health-profile/metrics', metricsData),
  updateMetrics: (id, metricsData) => api.put(`/api/health-profile/metrics/${id}`, metricsData),
  deleteMetrics: (id) => api.delete(`/api/health-profile/metrics/${id}`),
  
  // Fitness goals
  getGoals: () => api.get('/api/health-profile/goals'),
  getGoalById: (id) => api.get(`/api/health-profile/goals/${id}`),
  createGoal: (goalData) => api.post('/api/health-profile/goals', goalData),
  updateGoal: (id, goalData) => api.put(`/api/health-profile/goals/${id}`, goalData),
  updateGoalProgress: (id, progress) => api.put(`/api/health-profile/goals/${id}/progress`, { progress }),
  deleteGoal: (id) => api.delete(`/api/health-profile/goals/${id}`)
};

// Analytics services
export const analyticsService = {
  getBMI: () => api.get('/api/analytics/bmi'),
  getWellnessScore: () => api.get('/api/analytics/wellness-score'),
  getHealthInsights: () => api.get('/api/analytics/insights'),
  getProgressAnalytics: () => api.get('/api/analytics/progress'),
  getHealthTrends: () => api.get('/api/analytics/trends')
};

export default {
  auth: authService,
  user: userService,
  healthProfile: healthProfileService,
  analytics: analyticsService
};