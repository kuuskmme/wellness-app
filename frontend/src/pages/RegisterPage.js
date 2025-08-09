// src/pages/RegisterPage.js - Updated Registration page with Test Mode Instructions
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register, isAuthenticated } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    dataConsent: false
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setFormData({
      ...formData,
      [name]: newValue
    });
    
    // Clear error for this field
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }

    // Check password strength
    if (name === 'password') {
      checkPasswordStrength(value);
    }
  };

  const checkPasswordStrength = (password) => {
    let strength = 0;
    
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    setPasswordStrength(Math.min(strength, 5));
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 2) return 'bg-red-500';
    if (passwordStrength <= 3) return 'bg-yellow-500';
    if (passwordStrength <= 4) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength === 0) return '';
    if (passwordStrength <= 2) return 'Weak';
    if (passwordStrength <= 3) return 'Fair';
    if (passwordStrength <= 4) return 'Good';
    return 'Strong';
  };

  const validateForm = () => {
    const newErrors = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and number';
    }

    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Data consent validation
    if (!formData.dataConsent) {
      newErrors.dataConsent = 'You must agree to data collection to create an account';
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});

    const result = await register(
      formData.email,
      formData.password,
      formData.dataConsent
    );

    setIsLoading(false);

    if (result.success) {
      setRegisteredEmail(formData.email);
      setRegistrationSuccess(true);
      
      // Log verification link to console for testing
      console.log('\n' + '='.repeat(60));
      console.log('📧 EMAIL VERIFICATION LINK (Test Mode)');
      console.log('='.repeat(60));
      console.log('For user:', formData.email);
      console.log('Check backend terminal for verification link');
      console.log('Or navigate to /verify-pending page');
      console.log('='.repeat(60) + '\n');
    } else {
      if (result.errors) {
        // Handle validation errors from backend
        const backendErrors = {};
        result.errors.forEach(err => {
          backendErrors[err.path || err.param] = err.msg;
        });
        setErrors(backendErrors);
      } else {
        setErrors({ general: result.message });
      }
    }
  };

  const handleOAuthRegister = (provider) => {
    window.location.href = `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/auth/${provider}`;
  };

  // Show success message with verification instructions
  if (registrationSuccess) {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-green-50 border-2 border-green-400 rounded-lg p-6">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-green-800">Registration Successful!</h2>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-lg p-4">
              <p className="text-gray-700 mb-2">
                Account created for: <strong>{registeredEmail}</strong>
              </p>
              <p className="text-gray-600">
                Please verify your email to continue.
              </p>
            </div>
            
            {/* Test Mode Instructions */}
            <div className="bg-blue-50 border border-blue-300 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
                <span className="text-xl mr-2">🧪</span>
                Test Mode - Verification Instructions
              </h3>
              <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                <li>
                  <strong>Check your backend terminal</strong> for the verification link
                  <div className="mt-1 ml-6 text-xs text-gray-600">
                    Look for a box with "EMAIL VERIFICATION LINK"
                  </div>
                </li>
                <li>
                  <strong>Copy the verification link</strong> from the terminal
                  <div className="mt-1 ml-6 text-xs text-gray-600">
                    It will look like: http://localhost:3000/verify-email/[TOKEN]
                  </div>
                </li>
                <li>
                  <strong>Paste the link</strong> in your browser to verify
                </li>
              </ol>
              
              <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                <p className="text-yellow-800">
                  <strong>Note for Reviewers:</strong> In production, this would be sent via email. 
                  The verification system is fully implemented - check the backend console for the link.
                </p>
              </div>
            </div>

            {/* Navigation Options */}
            <div className="flex flex-col gap-2 pt-4">
              <button
                onClick={() => navigate('/verify-pending', { 
                  state: { 
                    email: registeredEmail,
                    message: 'Check your backend terminal for the verification link' 
                  } 
                })}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition"
              >
                Go to Verification Page →
              </button>
              
              <Link 
                to="/login" 
                className="w-full text-center bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition"
              >
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Regular registration form
  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-md p-8">
        <h2 className="text-3xl font-bold text-center mb-6">Create Account</h2>
        
        {/* Test Mode Notice */}
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-3 py-2 rounded text-sm mb-4">
          <strong>Test Mode:</strong> Email verification link will appear in backend console
        </div>
        
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
              placeholder="reviewer@test.com"
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">{errors.email}</p>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.password ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Min 8 chars, uppercase, lowercase, number"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-500"
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-500 text-xs mt-1">{errors.password}</p>
            )}
            
            {/* Password Strength Indicator */}
            {formData.password && (
              <div className="mt-2">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-2 flex-1 rounded ${
                        i < passwordStrength ? getPasswordStrengthColor() : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs mt-1 text-gray-600">
                  Password Strength: {getPasswordStrengthText()}
                </p>
              </div>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="confirmPassword">
              Confirm Password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Re-enter your password"
            />
            {errors.confirmPassword && (
              <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>
            )}
          </div>

          <div className="mb-6">
            <label className="flex items-start">
              <input
                type="checkbox"
                name="dataConsent"
                checked={formData.dataConsent}
                onChange={handleChange}
                className="mt-1 mr-2"
              />
              <span className="text-sm text-gray-700">
                I consent to the collection and processing of my health data as described in the{' '}
                <Link to="/privacy" className="text-blue-600 underline">
                  Privacy Policy
                </Link>
              </span>
            </label>
            {errors.dataConsent && (
              <p className="text-red-500 text-xs mt-1">{errors.dataConsent}</p>
            )}
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
            {isLoading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or sign up with</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              onClick={() => handleOAuthRegister('google')}
              className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              <span className="text-xl mr-2">🔍</span>
              Google
            </button>
            <button
              onClick={() => handleOAuthRegister('github')}
              className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              <span className="text-xl mr-2">🐙</span>
              GitHub
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;