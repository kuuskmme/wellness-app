
import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const VerifyPendingPage = () => {
  const location = useLocation();
  const { resendVerification } = useAuth();
  
  const email = location.state?.email || '';
  const initialMessage = location.state?.message || 'Please check your email to verify your account.';
  
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState(initialMessage);
  const [messageType, setMessageType] = useState('info'); // info, success, error

  const handleResend = async () => {
    if (!email) {
      setMessage('Please provide an email address');
      setMessageType('error');
      return;
    }

    setIsResending(true);
    setMessage('Sending verification email...');
    setMessageType('info');

    const result = await resendVerification(email);
    
    setIsResending(false);
    
    if (result.success) {
      setMessage(result.message);
      setMessageType('success');
    } else {
      setMessage(result.message);
      setMessageType('error');
    }
  };

  const getMessageStyle = () => {
    switch(messageType) {
      case 'success':
        return 'bg-green-100 border-green-400 text-green-700';
      case 'error':
        return 'bg-red-100 border-red-400 text-red-700';
      default:
        return 'bg-blue-100 border-blue-400 text-blue-700';
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold">Verify Your Email</h2>
        </div>

        <div className={`border px-4 py-3 rounded mb-6 ${getMessageStyle()}`}>
          {message}
        </div>

        {email && (
          <div className="mb-6">
            <p className="text-sm text-gray-600 text-center">
              Verification email sent to:
            </p>
            <p className="text-center font-semibold">{email}</p>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleResend}
            disabled={isResending}
            className={`w-full py-2 px-4 rounded-lg font-semibold text-white transition ${
              isResending 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isResending ? 'Sending...' : 'Resend Verification Email'}
          </button>
          
          <Link 
            to="/login" 
            className="block w-full text-center bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition"
          >
            Back to Login
          </Link>
        </div>

        <div className="mt-6 text-sm text-gray-600">
          <p className="font-semibold mb-2">Didn't receive the email?</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Check your spam or junk folder</li>
            <li>Make sure you entered the correct email</li>
            <li>Wait a few minutes and try resending</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default VerifyPendingPage;