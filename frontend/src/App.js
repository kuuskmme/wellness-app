// App.js - Main application with all routes including nutrition
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import VerifyPendingPage from './pages/VerifyPendingPage';
import NutritionPreferencesPage from './pages/NutritionPreferencesPage';
import MealPlannerPage from './pages/MealPlannerPage';
import RecipeSearchPage from './pages/RecipeSearchPage';

// Navigation component
const Navigation = () => {
  const { user, logout } = useAuth();

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <span className="text-xl font-bold text-gray-900">
                Wellness Platform
              </span>
            </Link>
            
            {user && (
              <div className="ml-10 flex items-baseline space-x-4">
                <Link
                  to="/dashboard"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Dashboard
                </Link>
                <Link
                  to="/profile"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Profile
                </Link>
                
                {/* Nutrition Dropdown */}
                <div className="relative group">
                  <button className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium inline-flex items-center">
                    Nutrition
                    <svg className="ml-1 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                  
                  <div className="absolute left-0 mt-1 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="py-1">
                      <Link
                        to="/nutrition/preferences"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Preferences
                      </Link>
                      <Link
                        to="/nutrition/meal-planner"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Meal Planner
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center">
            {user ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  {user.email}
                </span>
                <button
                  onClick={logout}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex space-x-4">
                <Link
                  to="/login"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

// Layout wrapper component
const Layout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navigation />
      <main className="flex-1 flex flex-col">
        {children}
      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">
              © 2024 Wellness Platform. All rights reserved.
            </p>
            <div className="flex space-x-6">
              <a href="#" className="text-sm text-gray-500 hover:text-gray-900">
                Privacy Policy
              </a>
              <a href="#" className="text-sm text-gray-500 hover:text-gray-900">
                Terms of Service
              </a>
              <a href="#" className="text-sm text-gray-500 hover:text-gray-900">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Layout>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
              <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
              <Route path="/verify-pending" element={<VerifyPendingPage />} />
              
              {/* Protected Routes - Health & Wellness */}
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
              
              {/* Protected Routes - Nutrition */}
              <Route
                path="/nutrition/preferences"
                element={
                  <ProtectedRoute>
                    <NutritionPreferencesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/nutrition/meal-planner"
                element={
                  <ProtectedRoute>
                    <MealPlannerPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/nutrition/recipes"
                element={
                  <ProtectedRoute>
                    <RecipeSearchPage />
                  </ProtectedRoute>
                }
              />
              
              {/* Future Nutrition Routes (Step 3-6) */}
              <Route
                path="/nutrition/recipes"
                element={
                  <ProtectedRoute>
                    <div className="min-h-screen bg-gray-50 py-8">
                      <div className="max-w-7xl mx-auto px-4">
                        <h1 className="text-3xl font-bold text-gray-900 mb-4">Recipe Search</h1>
                        <p className="text-gray-600">Coming in Step 3: RAG-based recipe search and generation</p>
                      </div>
                    </div>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/nutrition/shopping-list"
                element={
                  <ProtectedRoute>
                    <div className="min-h-screen bg-gray-50 py-8">
                      <div className="max-w-7xl mx-auto px-4">
                        <h1 className="text-3xl font-bold text-gray-900 mb-4">Shopping List</h1>
                        <p className="text-gray-600">Coming in Step 5: Smart shopping list generation</p>
                      </div>
                    </div>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/nutrition/analysis"
                element={
                  <ProtectedRoute>
                    <div className="min-h-screen bg-gray-50 py-8">
                      <div className="max-w-7xl mx-auto px-4">
                        <h1 className="text-3xl font-bold text-gray-900 mb-4">Nutritional Analysis</h1>
                        <p className="text-gray-600">Coming in Step 5: Detailed nutritional analysis and tracking</p>
                      </div>
                    </div>
                  </ProtectedRoute>
                }
              />
              
              {/* Catch all - redirect to home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;