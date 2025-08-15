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
import ShoppingListPage from './pages/ShoppingListPage'; // Add this import

// Create a fallback component for NutritionAnalysisPage if it doesn't exist
const NutritionAnalysisPage = () => (
  <div className="min-h-screen bg-gray-50 py-8">
    <div className="max-w-7xl mx-auto px-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Nutritional Analysis</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600 mb-4">
          Nutritional analysis features will help you track and understand your dietary intake.
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Coming Soon:</h3>
          <ul className="list-disc list-inside text-blue-800 space-y-1">
            <li>Daily macro and micronutrient tracking</li>
            <li>Weekly nutritional trends</li>
            <li>AI-powered dietary insights</li>
            <li>Calorie deficit/surplus tracking</li>
            <li>Nutritional goal progress</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
);

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
                        🎯 Preferences
                      </Link>
                      <Link
                        to="/nutrition/meal-planner"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        📅 Meal Planner
                      </Link>
                      <Link
                        to="/nutrition/recipes"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        🔍 Recipe Search
                      </Link>
                      <Link
                        to="/nutrition/shopping-list"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        🛒 Shopping List
                      </Link>
                      <Link
                        to="/nutrition/analysis"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        📊 Analysis
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
              <button className="text-sm text-gray-500 hover:text-gray-700">Privacy Policy</button>
              <button className="text-sm text-gray-500 hover:text-gray-700">Terms of Service</button>
              <button className="text-sm text-gray-500 hover:text-gray-700">Contact</button>
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
              
              {/* Protected Routes */}
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
              <Route
                path="/nutrition/shopping-list"
                element={
                  <ProtectedRoute>
                    <ShoppingListPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/nutrition/analysis"
                element={
                  <ProtectedRoute>
                    <NutritionAnalysisPage />
                  </ProtectedRoute>
                }
              />
              
              {/* Legacy routes - redirect to new paths */}
              <Route path="/nutrition-preferences" element={<Navigate to="/nutrition/preferences" replace />} />
              <Route path="/meal-planner" element={<Navigate to="/nutrition/meal-planner" replace />} />
              <Route path="/recipe-search" element={<Navigate to="/nutrition/recipes" replace />} />
              <Route path="/shopping-list" element={<Navigate to="/nutrition/shopping-list" replace />} />
              <Route path="/nutrition-analysis" element={<Navigate to="/nutrition/analysis" replace />} />
              
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