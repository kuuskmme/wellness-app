// src/context/AuthContext.js - Complete Authentication Context with 2FA Support
import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

// Configure axios defaults
axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
axios.defaults.headers.common['Content-Type'] = 'application/json';

// Add axios interceptor for token refresh
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await axios.post('/api/auth/refresh-token', { refreshToken });
          const { accessToken } = response.data;
          
          localStorage.setItem('token', accessToken);
          localStorage.setItem('accessToken', accessToken);
          axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
          originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
          
          return axios(originalRequest);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        // Clear auth and redirect to login
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (!token) {
        setLoading(false);
        return;
      }

      // Set the authorization header
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Verify token with backend
      const response = await axios.get('/api/auth/verify-token');
      
      if (response.data.valid) {
        setIsAuthenticated(true);
        setAccessToken(token);
        setRefreshToken(refreshToken);
        
        // Fetch user details
        const userResponse = await axios.get('/api/auth/me');
        if (userResponse.data.user) {
          setUser(userResponse.data.user);
          setIsVerified(userResponse.data.user.isVerified);
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // Clear invalid tokens
      localStorage.removeItem('token');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      delete axios.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  const register = async (email, password) => {
    try {
      setError(null);
      console.log('Registering user:', email);

      const response = await axios.post('/api/auth/register', {
        email,
        password
      });

      console.log('Registration response:', response.data);

      // Registration successful, but email verification needed
      return {
        success: true,
        message: response.data.message,
        requiresVerification: true
      };
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error.response?.data?.message || 'Registration failed';
      setError(errorMessage);
      return {
        success: false,
        message: errorMessage
      };
    }
  };

  const login = async (email, password, twoFactorCode = null) => {
    try {
      setError(null);
      console.log('Logging in user:', email);

      const requestBody = {
        email,
        password
      };
      
      if (twoFactorCode && twoFactorCode.length === 6) {
        requestBody.twoFactorCode = twoFactorCode;
      }

      const response = await axios.post('/api/auth/login', requestBody);

      // Check if 2FA is required
      if (response.data.requires2FA) {
        return {
          success: false,
          requires2FA: true,
          message: response.data.message
        };
      }

      // Store tokens and user data
      const { tokens, user } = response.data;
      
      setUser(user);
      setAccessToken(tokens.accessToken);
      setRefreshToken(tokens.refreshToken);
      
      // IMPORTANT: Store with both 'token' and 'accessToken' for compatibility
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', tokens.accessToken); // For backward compatibility
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      
      // Set axios default header
      axios.defaults.headers.common['Authorization'] = `Bearer ${tokens.accessToken}`;
      
      console.log('✅ Login successful!');
      setIsAuthenticated(true);
      setIsVerified(user.isVerified);

      return {
        success: true,
        message: 'Login successful'
      };
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.message || 'Login failed';
      setError(errorMessage);
      return {
        success: false,
        message: errorMessage
      };
    }
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      
      // Call logout endpoint if we have a refresh token
      if (refreshToken) {
        await axios.post('/api/auth/logout', { refreshToken }, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }).catch(err => console.error('Logout API error:', err));
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear all auth data
      setUser(null);
      setIsAuthenticated(false);
      setIsVerified(false);
      setAccessToken(null);
      setRefreshToken(null);
      
      // Clear localStorage
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      
      // Clear axios header
      delete axios.defaults.headers.common['Authorization'];
      
      console.log('✅ Logged out successfully');
    }
  };

  const setup2FA = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/auth/2fa/setup', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      return {
        success: true,
        qrCode: response.data.qrCode,
        secret: response.data.secret,
        message: response.data.message
      };
    } catch (error) {
      console.error('2FA setup error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to setup 2FA'
      };
    }
  };

  const verify2FA = async (code) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/auth/2fa/verify', 
        { code },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      // Update user state to reflect 2FA is enabled
      setUser(prev => ({ ...prev, twoFactorEnabled: true }));
      
      return {
        success: true,
        message: response.data.message
      };
    } catch (error) {
      console.error('2FA verification error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Invalid verification code'
      };
    }
  };

  const disable2FA = async (password) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/auth/2fa/disable', 
        { password },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      // Update user state to reflect 2FA is disabled
      setUser(prev => ({ ...prev, twoFactorEnabled: false }));
      
      return {
        success: true,
        message: response.data.message
      };
    } catch (error) {
      console.error('2FA disable error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to disable 2FA'
      };
    }
  };

  const forgotPassword = async (email) => {
    try {
      setError(null);
      const response = await axios.post('/api/auth/forgot-password', { email });
      
      return {
        success: true,
        message: response.data.message
      };
    } catch (error) {
      console.error('Forgot password error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to send reset email';
      setError(errorMessage);
      return {
        success: false,
        message: errorMessage
      };
    }
  };

  const resetPassword = async (token, password) => {
    try {
      setError(null);
      const response = await axios.post('/api/auth/reset-password', {
        token,
        password
      });
      
      return {
        success: true,
        message: response.data.message
      };
    } catch (error) {
      console.error('Reset password error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to reset password';
      setError(errorMessage);
      return {
        success: false,
        message: errorMessage
      };
    }
  };

  const verifyEmail = async (token) => {
    try {
      setError(null);
      const response = await axios.get(`/api/auth/verify/${token}`);
      
      if (response.data.tokens) {
        // Auto-login after verification
        const { tokens, user } = response.data;
        
        setUser(user);
        setAccessToken(tokens.accessToken);
        setRefreshToken(tokens.refreshToken);
        setIsAuthenticated(true);
        setIsVerified(true);
        
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('token', tokens.accessToken);
        localStorage.setItem('accessToken', tokens.accessToken);
        localStorage.setItem('refreshToken', tokens.refreshToken);
        
        axios.defaults.headers.common['Authorization'] = `Bearer ${tokens.accessToken}`;
      }
      
      return {
        success: true,
        message: response.data.message
      };
    } catch (error) {
      console.error('Email verification error:', error);
      const errorMessage = error.response?.data?.message || 'Verification failed';
      setError(errorMessage);
      return {
        success: false,
        message: errorMessage
      };
    }
  };

  const refreshAccessToken = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await axios.post('/api/auth/refresh-token', { refreshToken });
      const { accessToken } = response.data;
      
      setAccessToken(accessToken);
      localStorage.setItem('token', accessToken);
      localStorage.setItem('accessToken', accessToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      
      return accessToken;
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Force logout if refresh fails
      await logout();
      throw error;
    }
  };

  const value = {
    user,
    isAuthenticated,
    isVerified,
    loading,
    error,
    setError,
    accessToken,
    refreshToken,
    register,
    login,
    logout,
    setup2FA,
    verify2FA,
    disable2FA,
    forgotPassword,
    resetPassword,
    verifyEmail,
    refreshAccessToken,
    checkAuthStatus
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;