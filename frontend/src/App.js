// src/App.js - Main App component with authentication
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

// Import page components
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import DashboardPage from './pages/DashboardPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import VerifyPendingPage from './pages/VerifyPendingPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

// Navigation component
const Navigation = () => {
  const { isAuthenticated, user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <nav className="bg-blue-600 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold">
          Numbers Don't Lie 💪
        </Link>
        <div className="space-x-4 flex items-center">
          <Link to="/" className="hover:text-blue-200">Home</Link>
          
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="hover:text-blue-200">Dashboard</Link>
              <Link to="/profile" className="hover:text-blue-200">Profile</Link>
              <span className="text-blue-200">|</span>
              <span className="text-sm">
                {user?.email}
                {user?.twoFactorEnabled && (
                  <span className="ml-2 px-2 py-1 bg-green-500 text-white text-xs rounded">2FA</span>
                )}
              </span>
              <button 
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded transition"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:text-blue-200">Login</Link>
              <Link 
                to="/register" 
                className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded transition"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

// Footer component
const Footer = () => {
  return (
    <footer className="bg-gray-800 text-white p-4 mt-auto">
      <div className="container mx-auto text-center">
        <p>&copy; 2024 Numbers Don't Lie Wellness Platform. All rights reserved.</p>
        <p className="text-sm text-gray-400 mt-2">
          Your health data is encrypted and secure 🔒
        </p>
      </div>
    </footer>
  );
};

// OAuth callback handler component
const OAuthCallback = () => {
  React.useEffect(() => {
    // Handle OAuth callback
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const error = params.get('error');

    if (token) {
      // Store token and redirect
      localStorage.setItem('accessToken', token);
      window.location.href = '/dashboard';
    } else if (error) {
      // Handle error
      window.location.href = `/login?error=${error}`;
    } else {
      window.location.href = '/login';
    }
  }, []);

  return (
    <div className="flex justify-center items-center h-64">
      <div className="text-xl">Processing authentication...</div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App min-h-screen flex flex-col">
          <Navigation />
          
          <main className="flex-grow container mx-auto px-4 py-8">
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
              <Route path="/verify-pending" element={<VerifyPendingPage />} />
              
              {/* OAuth callbacks */}
              <Route path="/auth/google/callback" element={<OAuthCallback />} />
              <Route path="/auth/github/callback" element={<OAuthCallback />} />
              
              {/* Protected routes */}
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                } 
              />
              
              {/* Catch all - redirect to home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          
          <Footer />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;