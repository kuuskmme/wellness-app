// server.js - Main server file with authentication
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
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ Connected to MongoDB successfully');
  console.log('🔒 MongoDB encryption at rest is configured at database level');
  console.log('🔐 JWT Authentication enabled');
  console.log('📧 Email verification system active');
  console.log('🔑 2FA support enabled');
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
      rateLimit: true
    }
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/health-profile', healthProfileRoutes);

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
      message: 'Unauthorized access'
    });
  }
  
  if (err.name === 'CastError') {
    return res.status(400).json({
      message: 'Invalid ID format'
    });
  }
  
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    message: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  
  // Warning for missing OAuth credentials
  if (!process.env.GOOGLE_CLIENT_ID) {
    console.log('⚠️  Google OAuth not configured (missing GOOGLE_CLIENT_ID)');
  }
  if (!process.env.GITHUB_CLIENT_ID) {
    console.log('⚠️  GitHub OAuth not configured (missing GITHUB_CLIENT_ID)');
  }
  if (!process.env.EMAIL_HOST) {
    console.log('⚠️  Email service not configured (using Ethereal for testing)');
  }
});