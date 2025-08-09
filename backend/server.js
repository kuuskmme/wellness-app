// server.js - Main server file with analytics routes (Step 4)
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const passport = require('passport');
require('dotenv').config();

// Import passport configuration
require('./config/passport');

// Import routes
const authRoutes = require('./routes/auth');
const healthProfileRoutes = require('./routes/healthProfile');
const analyticsRoutes = require('./routes/analytics'); // NEW for Step 4

// Initialize Express app
const app = express();

// Security middleware
app.use(helmet());

// CORS configuration for front-end communication
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Passport
app.use(passport.initialize());

// MongoDB connection with encryption at rest enabled
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/wellness-platform', {
})
.then(() => {
  console.log('✅ Connected to MongoDB successfully');
  console.log('🔒 MongoDB encryption at rest is configured at database level');
  console.log('🔐 JWT Authentication enabled');
  console.log('📧 Email verification system active');
  console.log('🔑 2FA support enabled');
  console.log('🤖 AI Integration ready'); // NEW for Step 4
  console.log('📊 Health Analytics enabled'); // NEW for Step 4
})
.catch((err) => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

// Basic health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    features: {
      authentication: true,
      emailVerification: true,
      twoFactorAuth: true,
      oauth: ['google', 'github'],
      rateLimit: true,
      aiInsights: true, // NEW for Step 4
      healthAnalytics: true, // NEW for Step 4
      historicalTracking: true // NEW for Step 4
    }
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/health-profile', healthProfileRoutes);
app.use('/api/analytics', analyticsRoutes); // NEW for Step 4

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Validation Error',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      message: 'Unauthorized: Invalid or expired token'
    });
  }
  
  if (err.name === 'MongoError' && err.code === 11000) {
    return res.status(409).json({
      message: 'Duplicate entry found'
    });
  }
  
  // Default error response
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    message: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`
🚀 Server is running on port ${PORT}
📍 API Base URL: http://localhost:${PORT}/api
📊 Environment: ${process.env.NODE_ENV || 'development'}

Available endpoints:
- Auth:           /api/auth/*
- Health Profile: /api/health-profile/*
- Analytics:      /api/analytics/* (NEW)
  - Health Metrics: GET /api/analytics/health-metrics
  - AI Insights:    POST /api/analytics/ai-insights
  - Weekly Summary: GET /api/analytics/health-summary/weekly
  - Monthly Summary: GET /api/analytics/health-summary/monthly
  - Health History: GET/POST /api/analytics/health-history
  - Progress Data:  GET /api/analytics/progress-data

Features enabled:
✓ Health Profile Management
✓ BMI & Wellness Score Calculation
✓ AI-Powered Health Insights
✓ Historical Data Tracking
✓ Weekly/Monthly Summaries
✓ Progress Analytics
✓ Smart Recommendations
✓ Achievement Tracking
  `);
  
  // Check for required environment variables
  if (!process.env.OPENAI_API_KEY) {
    console.warn('⚠️  Warning: OPENAI_API_KEY not set. AI insights will use fallback mode.');
  }
});

module.exports = app;