// context/AuthContext.js - Fixed Authentication Context with Proper Token Storage
import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// Set axios defaults
axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
axios.defaults.headers.common['Content-Type'] = 'application/json';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load stored auth data on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedAccessToken = localStorage.getItem('token') || localStorage.getItem('accessToken');
    const storedRefreshToken = localStorage.getItem('refreshToken');

    if (storedUser && storedAccessToken) {
      try {
        setUser(JSON.parse(storedUser));
        setAccessToken(storedAccessToken);
        setRefreshToken(storedRefreshToken);
        
        // Set default auth header
        axios.defaults.headers.common['Authorization'] = `Bearer ${storedAccessToken}`;
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        // Clear corrupted data
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      }
    }
    
    setLoading(false);
  }, []);

  // Register function
  const register = async (email, password, name) => {
    try {
      setError(null);
      console.log('Registering user:', email);
      
      const response = await axios.post('/api/auth/register', {
        email,
        password,
        name
      });

      console.log('Registration response:', response.data);
      
      return {
        success: true,
        message: response.data.message,
        userId: response.data.userId,
        emailSent: response.data.emailSent
      };
    } catch (error) {
      console.error('Registration error:', error);
      const message = error.response?.data?.message || 'Registration failed';
      setError(message);
      return {
        success: false,
        message,
        errors: error.response?.data?.errors
      };
    }
  };

  // Login function - FIXED WITH PROPER TOKEN STORAGE
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
      
      console.log('✅ Login successful! Token stored as:', tokens.accessToken);
      
      return {
        success: true,
        message: response.data.message,
        user
      };
    } catch (error) {
      console.error('Login error:', error);
      const message = error.response?.data?.message || 'Login failed';
      setError(message);
      
      // Check if email needs verification
      if (error.response?.status === 403 && error.response?.data?.needsVerification) {
        return {
          success: false,
          message,
          needsVerification: true
        };
      }
      
      return {
        success: false,
        message
      };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      // Call logout endpoint to invalidate refresh token
      if (refreshToken) {
        await axios.post('/api/auth/logout', { refreshToken }, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local state and storage
      setUser(null);
      setAccessToken(null);
      setRefreshToken(null);
      
      // Clear all possible token keys
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      
      delete axios.defaults.headers.common['Authorization'];
      
      console.log('Logged out successfully');
    }
  };

  // Verify email
  const verifyEmail = async (verificationToken) => {
    try {
      setError(null);
      console.log('Verifying email with token:', verificationToken);
      
      const response = await axios.get(`/api/auth/verify/${verificationToken}`);
      
      console.log('Verification response:', response.data);
      
      // Auto-login after verification if tokens are provided
      const { tokens, user } = response.data;
      
      if (tokens && user) {
        setUser(user);
        setAccessToken(tokens.accessToken);
        setRefreshToken(tokens.refreshToken);
        
        // Store with both keys for compatibility
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('token', tokens.accessToken);
        localStorage.setItem('accessToken', tokens.accessToken);
        localStorage.setItem('refreshToken', tokens.refreshToken);
        
        axios.defaults.headers.common['Authorization'] = `Bearer ${tokens.accessToken}`;
        
        console.log('✅ Email verified and logged in!');
      }
      
      return {
        success: true,
        message: response.data.message,
        tokens,
        user
      };
    } catch (error) {
      console.error('Verification error:', error);
      const message = error.response?.data?.message || 'Verification failed';
      setError(message);
      return {
        success: false,
        message
      };
    }
  };

  // Refresh access token
  const refreshAccessToken = async () => {
    try {
      const storedRefreshToken = refreshToken || localStorage.getItem('refreshToken');
      
      if (!storedRefreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await axios.post('/api/auth/refresh-token', {
        refreshToken: storedRefreshToken
      });

      const newAccessToken = response.data.accessToken;
      
      setAccessToken(newAccessToken);
      
      // Store with both keys
      localStorage.setItem('token', newAccessToken);
      localStorage.setItem('accessToken', newAccessToken);
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
      
      console.log('✅ Token refreshed successfully');
      
      return newAccessToken;
    } catch (error) {
      console.error('Token refresh error:', error);
      // If refresh fails, logout
      await logout();
      return null;
    }
  };

  // Setup axios interceptor for token refresh with loop prevention
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        // Prevent infinite loops - don't retry auth endpoints
        const isAuthEndpoint = originalRequest.url?.includes('/auth/');
        
        if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
          originalRequest._retry = true;
          
          try {
            const newToken = await refreshAccessToken();
            
            if (newToken) {
              originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
              return axios(originalRequest);
            }
          } catch (refreshError) {
            // Don't retry if refresh fails
            return Promise.reject(error);
          }
        }
        
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  // Request password reset
  const requestPasswordReset = async (email) => {
    try {
      const response = await axios.post('/api/auth/forgot-password', { email });
      return {
        success: true,
        message: response.data.message
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to request password reset'
      };
    }
  };

  // Reset password
  const resetPassword = async (token, password) => {
    try {
      const response = await axios.post(`/api/auth/reset-password/${token}`, { password });
      return {
        success: true,
        message: response.data.message
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to reset password'
      };
    }
  };

  // Resend verification email
  const resendVerification = async (email) => {
    try {
      const response = await axios.post('/api/auth/resend-verification', { email });
      return {
        success: true,
        message: response.data.message
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to resend verification'
      };
    }
  };

  const value = {
    user,
    accessToken,
    refreshToken,
    loading,
    error,
    isAuthenticated: !!user && !!accessToken,
    isVerified: user?.isVerified,
    register,
    login,
    logout,
    verifyEmail,
    resendVerification,
    requestPasswordReset,
    resetPassword,
    refreshAccessToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;