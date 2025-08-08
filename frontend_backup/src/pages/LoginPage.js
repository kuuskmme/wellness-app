// src/pages/LoginPage.js - Login page
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const LoginPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Clear error for this field
    if (errors[e.target.name]) {
      setErrors({
        ...errors,
        [e.target.name]: ''
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    const newErrors = {};
    if (!formData.email) {
      newErrors.email = 'Email is required';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const response = await axios.post('/api/auth/login', formData);
      
      // Store user data in localStorage (will be improved with proper auth in Step 2)
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      // Redirect to dashboard
      navigate('/dashboard');
    } catch (error) {
      if (error.response?.data?.message) {
        setErrors({ general: error.response.data.message });
      } else {
        setErrors({ general: 'An error occurred during login' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h2 className="text-3xl font-bold text-center mb-6">Sign In</h2>
        
        {errors.general && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter your email"
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">{errors.email}</p>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.password ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter your password"
            />
            {errors.password && (
              <p className="text-red-500 text-xs mt-1">{errors.password}</p>
            )}
          </div>

          <div className="mb-4">
            <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline">
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-2 px-4 rounded-lg font-semibold text-white transition ${
              isLoading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Don't have an account?{' '}
            <Link to="/register" className="text-blue-600 hover:underline">
              Register
            </Link>
          </p>
        </div>

        {/* OAuth placeholder for Step 2 */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-center text-gray-500 text-sm mb-4">Or sign in with</p>
          <div className="grid grid-cols-2 gap-4">
            <button className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
              <span>Google</span>
            </button>
            <button className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
              <span>GitHub</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;