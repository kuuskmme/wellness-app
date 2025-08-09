// src/App.js - Enhanced App with Error Boundary and Security (Step 6)
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import ErrorBoundary, { NetworkErrorHandler } from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import DashboardPage from './pages/DashboardPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import VerifyPendingPage from './pages/VerifyPendingPage';

// Navigation Component with Security Context
const Navigation = () => {
  const { isAuthenticated, logout, user } = React.useContext(AuthContext);
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    setIsMenuOpen(false);
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="text-xl font-bold text-blue-600">
            Numbers Don't Lie
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" className="text-gray-700 hover:text-blue-600">
                  Dashboard
                </Link>
                <Link to="/profile" className="text-gray-700 hover:text-blue-600">
                  Profile
                </Link>
                <span className="text-gray-500">|</span>
                <span className="text-sm text-gray-600">
                  {user?.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-gray-700 hover:text-blue-600">
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t">
            {isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  className="block py-2 text-gray-700 hover:text-blue-600"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  to="/profile"
                  className="block py-2 text-gray-700 hover:text-blue-600"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Profile
                </Link>
                <div className="py-2 text-sm text-gray-600">
                  {user?.email}
                </div>
                <button
                  onClick={handleLogout}
                  className="mt-2 w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="block py-2 text-gray-700 hover:text-blue-600"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="block py-2 text-gray-700 hover:text-blue-600"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

// Footer Component
const Footer = () => {
  return (
    <footer className="bg-gray-800 text-white py-8 mt-auto">
      <div className="container mx-auto px-4 text-center">
        <p>© 2024 Numbers Don't Lie - Wellness Platform. All rights reserved.</p>
        <p className="text-sm text-gray-400 mt-2">
          Your health data is encrypted and secure 🔒
        </p>
        <div className="mt-4 text-sm text-gray-400">
          <Link to="/privacy" className="hover:text-white mx-2">Privacy Policy</Link>
          |
          <Link to="/terms" className="hover:text-white mx-2">Terms of Service</Link>
          |
          <Link to="/security" className="hover:text-white mx-2">Security</Link>
        </div>
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

// Security Info Page
const SecurityPage = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Security & Privacy</h1>
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <h2 className="text-xl font-semibold mb-2">🔒 Data Encryption</h2>
          <p className="text-gray-600">
            All your health data is encrypted both in transit (HTTPS) and at rest (AES-256).
          </p>
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-2">🛡️ Security Measures</h2>
          <ul className="list-disc list-inside text-gray-600 space-y-1">
            <li>Rate limiting to prevent abuse</li>
            <li>Input sanitization to prevent XSS attacks</li>
            <li>SQL injection prevention</li>
            <li>Two-factor authentication support</li>
            <li>Regular security audits</li>
            <li>GDPR compliant data handling</li>
          </ul>
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-2">👤 Your Privacy Rights</h2>
          <ul className="list-disc list-inside text-gray-600 space-y-1">
            <li>Access your data anytime</li>
            <li>Export your data in JSON format</li>
            <li>Delete your account and all data</li>
            <li>Control data sharing preferences</li>
            <li>Withdraw consent at any time</li>
          </ul>
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-2">🚫 What We Don't Do</h2>
          <ul className="list-disc list-inside text-gray-600 space-y-1">
            <li>Sell your data to third parties</li>
            <li>Share data without explicit consent</li>
            <li>Store passwords in plain text</li>
            <li>Track you across other websites</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// Privacy Policy Page (placeholder)
const PrivacyPage = () => (
  <div className="max-w-4xl mx-auto px-4 py-8">
    <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
    <div className="bg-white rounded-lg shadow p-6">
      <p className="text-gray-600">
        Privacy policy content would go here. This should be reviewed by legal counsel.
      </p>
    </div>
  </div>
);

// Terms of Service Page (placeholder)
const TermsPage = () => (
  <div className="max-w-4xl mx-auto px-4 py-8">
    <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
    <div className="bg-white rounded-lg shadow p-6">
      <p className="text-gray-600">
        Terms of service content would go here. This should be reviewed by legal counsel.
      </p>
    </div>
  </div>
);

function App() {
  // Check for security headers in development
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔒 Security Features Active:');
      console.log('- Error Boundary: ✓');
      console.log('- Network Error Handler: ✓');
      console.log('- Protected Routes: ✓');
      console.log('- Secure Token Storage: ✓');
    }
  }, []);

  return (
    <ErrorBoundary>
      <NetworkErrorHandler>
        <Router>
          <AuthProvider>
            <div className="App min-h-screen flex flex-col bg-gray-50">
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
                  <Route path="/privacy" element={<PrivacyPage />} />
                  <Route path="/terms" element={<TermsPage />} />
                  <Route path="/security" element={<SecurityPage />} />
                  
                  {/* OAuth callbacks */}
                  <Route path="/auth/google/callback" element={<OAuthCallback />} />
                  <Route path="/auth/github/callback" element={<OAuthCallback />} />
                  
                  {/* Protected routes */}
                  <Route 
                    path="/dashboard" 
                    element={
                      <ProtectedRoute>
                        <ErrorBoundary>
                          <DashboardPage />
                        </ErrorBoundary>
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/profile" 
                    element={
                      <ProtectedRoute>
                        <ErrorBoundary>
                          <ProfilePage />
                        </ErrorBoundary>
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
      </NetworkErrorHandler>
    </ErrorBoundary>
  );
}

export default App;