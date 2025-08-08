// src/App.js - Main App component with routing
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import './App.css';

// Import page components
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import DashboardPage from './pages/DashboardPage';

// Navigation component
const Navigation = () => {
  return (
    <nav className="bg-blue-600 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold">
          Numbers Don't Lie 💪
        </Link>
        <div className="space-x-4">
          <Link to="/" className="hover:text-blue-200">Home</Link>
          <Link to="/dashboard" className="hover:text-blue-200">Dashboard</Link>
          <Link to="/profile" className="hover:text-blue-200">Profile</Link>
          <Link to="/login" className="hover:text-blue-200">Login</Link>
          <Link to="/register" className="hover:text-blue-200">Register</Link>
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

function App() {
  return (
    <Router>
      <div className="App min-h-screen flex flex-col">
        <Navigation />
        
        <main className="flex-grow container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        
        <Footer />
      </div>
    </Router>
  );
}

export default App;