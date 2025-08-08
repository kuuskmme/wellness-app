// src/pages/HomePage.js - Landing page
import React from 'react';
import { Link } from 'react-router-dom';

const HomePage = () => {
  return (
    <div className="max-w-6xl mx-auto">
      {/* Hero Section */}
      <section className="text-center py-16">
        <h1 className="text-5xl font-bold text-gray-800 mb-6">
          Welcome to Numbers Don't Lie
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          Your personal wellness platform that uses data-driven insights and AI 
          to help you achieve your health and fitness goals.
        </p>
        <div className="space-x-4">
          <Link 
            to="/register" 
            className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Get Started Free
          </Link>
          <Link 
            to="/login" 
            className="inline-block bg-gray-200 text-gray-800 px-8 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
          >
            Sign In
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 grid md:grid-cols-3 gap-8">
        <div className="text-center p-6 bg-white rounded-lg shadow-md">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-xl font-semibold mb-2">Data-Driven Insights</h3>
          <p className="text-gray-600">
            Track your BMI, wellness score, and progress with interactive visualizations
          </p>
        </div>
        
        <div className="text-center p-6 bg-white rounded-lg shadow-md">
          <div className="text-4xl mb-4">🤖</div>
          <h3 className="text-xl font-semibold mb-2">AI-Powered Recommendations</h3>
          <p className="text-gray-600">
            Get personalized health insights tailored to your goals and preferences
          </p>
        </div>
        
        <div className="text-center p-6 bg-white rounded-lg shadow-md">
          <div className="text-4xl mb-4">🔒</div>
          <h3 className="text-xl font-semibold mb-2">Secure & Private</h3>
          <p className="text-gray-600">
            Your data is encrypted and protected with industry-standard security
          </p>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 bg-gray-50 rounded-lg p-8">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
              1
            </div>
            <h4 className="font-semibold mb-2">Create Account</h4>
            <p className="text-sm text-gray-600">Sign up and verify your email</p>
          </div>
          
          <div className="text-center">
            <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
              2
            </div>
            <h4 className="font-semibold mb-2">Complete Profile</h4>
            <p className="text-sm text-gray-600">Enter your health metrics and goals</p>
          </div>
          
          <div className="text-center">
            <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
              3
            </div>
            <h4 className="font-semibold mb-2">Get Insights</h4>
            <p className="text-sm text-gray-600">Receive AI-powered recommendations</p>
          </div>
          
          <div className="text-center">
            <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
              4
            </div>
            <h4 className="font-semibold mb-2">Track Progress</h4>
            <p className="text-sm text-gray-600">Monitor your wellness journey</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="text-center py-16">
        <h2 className="text-3xl font-bold mb-4">Ready to Start Your Wellness Journey?</h2>
        <p className="text-gray-600 mb-8">Join thousands who are achieving their health goals with data</p>
        <Link 
          to="/register" 
          className="inline-block bg-green-600 text-white px-10 py-4 rounded-lg font-semibold hover:bg-green-700 transition text-lg"
        >
          Start Free Today
        </Link>
      </section>
    </div>
  );
};

export default HomePage;