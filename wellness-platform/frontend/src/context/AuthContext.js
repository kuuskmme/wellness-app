import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config/constants';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          // Set default headers for all axios requests
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Get user data
          const res = await axios.get(`${API_URL}/api/users/me`);
          setUser(res.data.data);
        } catch (err) {
          console.error('Failed to load user', err);
          // Clear everything if token is invalid
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
          setError('Session expired. Please login again.');
        }
      }
      setLoading(false);
    };

    loadUser();
  }, [token]);

  // Login user
  const login = async (email, password) => {
    try {
      const res = await axios.post(`${API_URL}/api/auth/login`, {
        email,
        password
      });
      
      // Set token in local storage
      localStorage.setItem('token', res.data.accessToken);
      setToken(res.data.accessToken);
      setUser(res.data.user);
      return true;
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
      return false;
    }
  };

  // Register user
  const register = async (userData) => {
    try {
      const res = await axios.post(`${API_URL}/api/auth/register`, userData);
      return { success: true, data: res.data };
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
      return { success: false, error: err.response?.data };
    }
  };

  // Logout user
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    // Clear authorization header
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!user,
        user,
        loading,
        error,
        setError,
        login,
        register,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};