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
import ShoppingListPage from './pages/ShoppingListPage';
import NutritionAnalysisPage from './pages/NutritionAnalysisPage';
import ChatAssistantPage from './pages/ChatAssistantPage';

// Navigation component with ALL nutrition links
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
                
                {/* Dropdown for Nutrition */}
                <div className="relative group">
                  <button className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium inline-flex items-center">
                    Nutrition
                    <svg className="ml-1 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                  
                  {/* Dropdown menu */}
                  <div className="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="py-1" role="menu">
                      <Link
                        to="/nutrition/preferences"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                      >
                        🥗 Dietary Preferences
                      </Link>
                      <Link
                        to="/nutrition/meal-planner"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                      >
                        📅 Meal Planner
                      </Link>
                      <Link
                        to="/nutrition/recipes"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                      >
                        🔍 Recipe Search
                      </Link>
                      <Link
                        to="/nutrition/shopping-list"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                      >
                        🛒 Shopping List
                      </Link>
                      <Link
                        to="/nutrition/analysis"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        role="menuitem"
                      >
                        📊 Nutrition Analysis
                      </Link>
                    </div>
                  </div>
                </div>
                <Link to="/chat" className="text-gray-700 hover:text-gray-900 px-3 py-2 font-medium">
                  AI Assistant
                </Link>
              </div>
            )}
          </div>
          
          <div className="flex items-center">
            {user ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">
                  Welcome, {user.name || user.email}
                </span>
                <button
                  onClick={logout}
                  className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md font-medium"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  to="/login"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium"
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

// Layout component
const Layout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main>{children}</main>
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
              
              {/* Protected Routes - Core */}
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
              <Route path="/chat" element={<ChatAssistantPage />} /> {/* NEW: AI Assistant route */}
              {/* Protected Routes - Nutrition (USING CORRECT PATHS) */}
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