// src/pages/VerifyEmailPage.js - Fixed Email Verification Page with Token Storage
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const VerifyEmailPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { verifyEmail } = useAuth();
  
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    if (token) {
      handleVerification();
    } else {
      setStatus('error');
      setMessage('No verification token provided');
    }
  }, [token]);

  const handleVerification = async () => {
    const result = await verifyEmail(token);
    
    if (result.success) {
      setStatus('success');
      setMessage(result.message);
      
      // IMPORTANT: Store the tokens properly
      if (result.tokens) {
        localStorage.setItem('token', result.tokens.accessToken);
        localStorage.setItem('accessToken', result.tokens.accessToken);
        localStorage.setItem('refreshToken', result.tokens.refreshToken);
        
        // Also store user info if provided
        if (result.user) {
          localStorage.setItem('user', JSON.stringify(result.user));
        }
        
        console.log('✅ Tokens stored successfully!');
        console.log('Access Token:', result.tokens.accessToken);
      }
      
      // Redirect to dashboard after 3 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
    } else {
      setStatus('error');
      setMessage(result.message);
    }
  };

  return (
    <div className="max-w-md mx-auto text-center">
      <div className="bg-white rounded-lg shadow-md p-8">
        {status === 'verifying' && (
          <>
            <div className="spinner mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold mb-4">Verifying Your Email</h2>
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-4 text-green-600">Email Verified!</h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-4 text-red-600">Verification Failed</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <div className="space-y-3">
              <Link 
                to="/resend-verification" 
                className="block w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition"
              >
                Resend Verification Email
              </Link>
              <Link 
                to="/login" 
                className="block w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition"
              >
                Back to Login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmailPage;