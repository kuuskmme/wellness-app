
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const compression = require('compression');
const dotenv = require('dotenv');
const passport = require('passport');
const moment = require('moment-timezone');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Trust proxy - required for accurate rate limiting behind reverse proxies
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// MongoDB sanitization (prevent NoSQL injection)
app.use(mongoSanitize());

// XSS protection
app.use(xss());

// Compression middleware
app.use(compression());

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit auth attempts
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: true,
});

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit AI generation requests
  message: 'Too many AI requests, please try again later.',
  skipSuccessfulRequests: false,
});

// Apply rate limiting
app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/nutrition/meal-plan', aiLimiter);
app.use('/api/nutrition/recipes/generate', aiLimiter);

// Initialize Passport
app.use(passport.initialize());
require('./config/passport');

// MongoDB connection with retry logic
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/wellness-platform', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Set default timezone for moment
    moment.tz.setDefault('UTC');
    
    // Initialize indexes for better performance
    await initializeIndexes();
    
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    // Retry connection after 5 seconds
    setTimeout(connectDB, 5000);
  }
};

// Initialize database indexes
const initializeIndexes = async () => {
  try {
    // Import models to ensure indexes are created
    require('./models/User');
    require('./models/HealthProfile');
    require('./models/HealthHistory');
    require('./models/AIInsight');
    require('./models/UserPreferences');
    require('./models/Recipe');
    require('./models/Ingredient');
    require('./models/MealPlan');
    require('./models/Conversation'); // NEW: Add Conversation model
    
    console.log('✅ Database indexes initialized');
  } catch (error) {
    console.error('❌ Error initializing indexes:', error);
  }
};

// Connect to database
connectDB();

// MongoDB connection event handlers
mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected. Attempting to reconnect...');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/health-profile', require('./routes/healthProfile'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/nutrition', require('./routes/nutrition'));
app.use('/api/chat', require('./routes/chat')); // NEW: AI Assistant chat routes

// Health check endpoint
app.get('/health', (req, res) => {
  const healthcheck = {
    uptime: process.uptime(),
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  };
  
  res.status(200).json(healthcheck);
});

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'Wellness & Nutrition Platform API',
    version: '2.0.0',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        refresh: 'POST /api/auth/refresh',
        logout: 'POST /api/auth/logout',
        forgotPassword: 'POST /api/auth/forgot-password',
        resetPassword: 'POST /api/auth/reset-password/:token',
        verifyEmail: 'GET /api/auth/verify-email/:token',
        resendVerification: 'POST /api/auth/resend-verification',
        setupTwoFactor: 'POST /api/auth/2fa/setup',
        verifyTwoFactor: 'POST /api/auth/2fa/verify',
        disableTwoFactor: 'POST /api/auth/2fa/disable'
      },
      healthProfile: {
        get: 'GET /api/health-profile',
        create: 'POST /api/health-profile',
        update: 'PUT /api/health-profile',
        delete: 'DELETE /api/health-profile',
        history: 'GET /api/health-profile/history',
        insights: 'GET /api/health-profile/insights',
        generateInsights: 'POST /api/health-profile/generate-insights'
      },
      analytics: {
        dashboard: 'GET /api/analytics/dashboard',
        trends: 'GET /api/analytics/trends',
        goals: 'GET /api/analytics/goals',
        export: 'GET /api/analytics/export'
      },
      nutrition: {
        preferences: {
          get: 'GET /api/nutrition/preferences',
          update: 'PUT /api/nutrition/preferences',
          sync: 'POST /api/nutrition/preferences/sync'
        },
        mealPlanning: {
          generate: 'POST /api/nutrition/meal-plan',
          list: 'GET /api/nutrition/meal-plan',
          get: 'GET /api/nutrition/meal-plan/:id',
          update: 'PUT /api/nutrition/meal-plan/:id',
          regenerate: 'POST /api/nutrition/meal-plan/:id/regenerate',
          restore: 'POST /api/nutrition/meal-plan/:id/restore'
        },
        recipes: {
          search: 'GET /api/nutrition/recipes/search',
          get: 'GET /api/nutrition/recipes/:id',
          generate: 'POST /api/nutrition/recipes/generate',
          adjust: 'POST /api/nutrition/recipes/:id/adjust',
          substitute: 'POST /api/nutrition/recipes/:id/substitute'
        },
        ingredients: {
          search: 'GET /api/nutrition/ingredients/search'
        },
        shopping: {
          generate: 'GET /api/nutrition/shopping-list',
          update: 'PUT /api/nutrition/shopping-list'
        },
        analysis: {
          daily: 'GET /api/nutrition/analysis/daily',
          weekly: 'GET /api/nutrition/analysis/weekly',
          ai: 'POST /api/nutrition/analysis/ai'
        },
        data: {
          init: 'POST /api/nutrition/init-data'
        }
      }
    },
    documentation: 'See README.md for detailed API documentation',
    health: '/health'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    message: 'Endpoint not found',
    requested: req.originalUrl,
    suggestion: 'Please check the API documentation at GET /api'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      message: 'Validation Error',
      errors
    });
  }
  
  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      message: `Duplicate value for field: ${field}`
    });
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Invalid token' });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Token expired' });
  }
  
  // Default error
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`📊 API Documentation: http://localhost:${PORT}/api`);
  console.log(`💚 Health Check: http://localhost:${PORT}/health`);
  console.log('\n--- Nutrition Platform Features ---');
  console.log('✅ User Preferences with 15+ dietary options');
  console.log('✅ 10+ allergy tracking');
  console.log('✅ Sequential AI prompting (3+ steps)');
  console.log('✅ Few-shot learning examples');
  console.log('✅ Meal plan versioning & restore');
  console.log('✅ Custom meal additions');
  console.log('✅ Meal swapping & reordering');
  console.log('✅ Individual & full plan regeneration');
  console.log('✅ Alternative meal suggestions');
  console.log('✅ ISO 8601 date/time compliance');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Closing server...');
  server.close(() => {
    console.log('Server closed');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received. Closing server...');
  server.close(() => {
    console.log('Server closed');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});

module.exports = app;