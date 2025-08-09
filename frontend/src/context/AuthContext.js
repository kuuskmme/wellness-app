// frontend/src/context/AuthContext.js - Complete Updated File with Fixed Axios
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext({});

// Configure axios defaults - FIXED FOR CORS
axios.defaults.baseURL = 'http://localhost:5000';
axios.defaults.headers.common['Content-Type'] = 'application/json';
axios.defaults.withCredentials = true; // Important for CORS with credentials

// Token refresh interval (14 minutes - just before 15 min expiry)
const TOKEN_REFRESH_INTERVAL = 14 * 60 * 1000;

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load tokens from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedAccessToken = localStorage.getItem('accessToken');
    const storedRefreshToken = localStorage.getItem('refreshToken');

    if (storedUser && storedAccessToken) {
      setUser(JSON.parse(storedUser));
      setAccessToken(storedAccessToken);
      setRefreshToken(storedRefreshToken);
      
      // Set axios default header
      axios.defaults.headers.common['Authorization'] = `Bearer ${storedAccessToken}`;
      
      // Verify token is still valid
      verifyToken(storedAccessToken);
    }
    setLoading(false);
  }, []);

  // Verify token validity
  const verifyToken = async (token) => {
    try {
      const response = await axios.get('/api/auth/verify-token', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.data.valid) {
        // Token invalid, try refresh
        if (refreshToken) {
          await refreshAccessToken();
        } else {
          logout();
        }
      }
    } catch (error) {
      console.error('Token verification failed:', error);
      if (refreshToken) {
        await refreshAccessToken();
      } else {
        logout();
      }
    }
  };

  // Refresh access token
  const refreshAccessToken = useCallback(async () => {
    if (!refreshToken) {
      logout();
      return null;
    }

    try {
      const response = await axios.post('/api/auth/refresh-token', {
        refreshToken: refreshToken
      });

      const newAccessToken = response.data.accessToken;
      
      setAccessToken(newAccessToken);
      localStorage.setItem('accessToken', newAccessToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
      
      return newAccessToken;
    } catch (error) {
      console.error('Token refresh failed:', error);
      logout();
      return null;
    }
  }, [refreshToken]);

  // Setup automatic token refresh
  useEffect(() => {
    if (!accessToken || !refreshToken) return;

    const interval = setInterval(() => {
      refreshAccessToken();
    }, TOKEN_REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [accessToken, refreshToken, refreshAccessToken]);

  // Register function - UPDATED
  const register = async (email, password, dataConsent = true) => {
    try {
      setError(null);
      console.log('Registering user:', email);
      
      const response = await axios.post('/api/auth/register', {
        email,
        password,
        dataConsent
      });
      
      console.log('Registration response:', response.data);
      
      // Log verification info if available
      if (response.data.verificationToken) {
        console.log('\n📧 VERIFICATION INFO:');
        console.log('Token:', response.data.verificationToken);
        console.log('URL:', response.data.verificationUrl);
      }
      
      return {
        success: true,
        message: response.data.message,
        userId: response.data.userId,
        emailSent: response.data.emailSent,
        verificationToken: response.data.verificationToken,
        verificationUrl: response.data.verificationUrl
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

  // Login function - UPDATED
  const login = async (email, password, twoFactorCode = null) => {
    try {
      setError(null);
      console.log('Logging in user:', email);

      const requestBody = {
        email,
        password
      };
      
      // Only add twoFactorCode if provided
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
      
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${tokens.accessToken}`;
      
      console.log('Login successful!');
      
      return {
        success: true,
        message: response.data.message,
        user
      };
    } catch (error) {
      console.error('Login error:', error);
      const message = error.response?.data?.message || 'Login failed';
      setError(message);
      return {
        success: false,
        message,
        needsVerification: error.response?.data?.needsVerification
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
      
      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      
      delete axios.defaults.headers.common['Authorization'];
      
      console.log('Logged out successfully');
    }
  };

  // Verify email - UPDATED
  const verifyEmail = async (token) => {
    try {
      setError(null);
      console.log('Verifying email with token:', token);
      
      const response = await axios.get(`/api/auth/verify/${token}`);
      
      console.log('Verification response:', response.data);
      
      // Auto-login after verification
      const { tokens, user } = response.data;
      
      if (tokens && user) {
        setUser(user);
        setAccessToken(tokens.accessToken);
        setRefreshToken(tokens.refreshToken);
        
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('accessToken', tokens.accessToken);
        localStorage.setItem('refreshToken', tokens.refreshToken);
        
        axios.defaults.headers.common['Authorization'] = `Bearer ${tokens.accessToken}`;
      }
      
      return {
        success: true,
        message: response.data.message
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
      const response = await axios.post('/api/auth/reset-password', {
        token,
        password
      });
      return {
        success: true,
        message: response.data.message
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to reset password',
        errors: error.response?.data?.errors
      };
    }
  };

  // Setup 2FA
  const setup2FA = async () => {
    try {
      const response = await axios.post('/api/auth/2fa/setup', {}, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      return {
        success: true,
        qrCode: response.data.qrCode,
        secret: response.data.secret,
        backupCodes: response.data.backupCodes
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to setup 2FA'
      };
    }
  };

  // Verify 2FA setup
  const verify2FA = async (code) => {
    try {
      const response = await axios.post('/api/auth/2fa/verify', { code }, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      // Update user state
      setUser(prev => ({ ...prev, twoFactorEnabled: true }));
      localStorage.setItem('user', JSON.stringify({ ...user, twoFactorEnabled: true }));
      
      return {
        success: true,
        message: response.data.message
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Invalid verification code'
      };
    }
  };

  // Disable 2FA
  const disable2FA = async (password) => {
    try {
      const response = await axios.post('/api/auth/2fa/disable', { password }, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      // Update user state
      setUser(prev => ({ ...prev, twoFactorEnabled: false }));
      localStorage.setItem('user', JSON.stringify({ ...user, twoFactorEnabled: false }));
      
      return {
        success: true,
        message: response.data.message
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to disable 2FA'
      };
    }
  };

  // Make authenticated API request
  const apiRequest = async (method, url, data = null) => {
    try {
      const config = {
        method,
        url,
        headers: { Authorization: `Bearer ${accessToken}` }
      };
      
      if (data) {
        config.data = data;
      }
      
      const response = await axios(config);
      return response.data;
    } catch (error) {
      if (error.response?.status === 401 && error.response?.data?.code === 'TOKEN_EXPIRED') {
        // Try to refresh token
        const newToken = await refreshAccessToken();
        if (newToken) {
          // Retry the request with new token
          const config = {
            method,
            url,
            headers: { Authorization: `Bearer ${newToken}` }
          };
          if (data) config.data = data;
          
          const response = await axios(config);
          return response.data;
        }
      }
      throw error;
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
    has2FA: user?.twoFactorEnabled,
    register,
    login,
    logout,
    verifyEmail,
    resendVerification,
    requestPasswordReset,
    resetPassword,
    setup2FA,
    verify2FA,
    disable2FA,
    refreshAccessToken,
    apiRequest
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;