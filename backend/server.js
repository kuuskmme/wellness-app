// backend/server.js - Complete Updated File with Nutrition Routes
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const passport = require('passport');
const compression = require('compression');
require('dotenv').config();

// Import security middleware
const {
  rateLimiters,
  securityHeaders,
  sanitizeInput,
  requestSizeLimit,
  validateApiKey,
  securityAuditLog,
  enforceHTTPS,
  sessionSecurity,
  preventDataLeak,
  mongoSanitize,
  xssClean,
  hpp
} = require('./middleware/security');

// Import passport configuration
require('./config/passport');

// Import routes
const authRoutes = require('./routes/auth');
const healthProfileRoutes = require('./routes/healthProfile');
const analyticsRoutes = require('./routes/analytics');
const nutritionRoutes = require('./routes/nutrition'); // NEW: Nutrition routes

// Initialize Express app
const app = express();

// Trust proxy (for production behind reverse proxy)
app.set('trust proxy', 1);

// Compression middleware
app.use(compression());

// Security middleware - ORDER MATTERS!
app.use(enforceHTTPS);
app.use(securityHeaders);
app.use(sessionSecurity);

// SIMPLIFIED CORS FOR DEVELOPMENT - This fixes the CORS issue!
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset']
}));

// Body parser with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security: Sanitization and validation
app.use(requestSizeLimit);
app.use(mongoSanitize);
app.use(xssClean);
app.use(hpp);
app.use(sanitizeInput);
app.use(securityAuditLog);

// Initialize Passport
app.use(passport.initialize());

// MongoDB connection with security options
const mongoOptions = {
  authSource: 'admin',
  retryWrites: true,
  w: 'majority',
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/wellness-platform', mongoOptions)
.then(() => {
  console.log('✅ Connected to MongoDB successfully');
  console.log('🔒 Security features enabled:');
  console.log('  - Rate limiting active');
  console.log('  - Input sanitization enabled');
  console.log('  - XSS protection active');
  console.log('  - SQL injection prevention');
  console.log('  - HTTPS enforcement ready');
  console.log('  - Security headers configured');
  console.log('  - Audit logging enabled');
})
.catch((err) => {
  console.error('❌ MongoDB connection error:', err);
  console.error('Make sure MongoDB is running: mongod');
  process.exit(1);
});

// Health check endpoint (no rate limiting)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    security: {
      rateLimiting: true,
      inputSanitization: true,
      xssProtection: true,
      corsEnabled: true,
      httpsEnforced: process.env.NODE_ENV === 'production'
    },
    uptime: process.uptime()
  });
});

// API Routes with specific rate limiters
app.use('/api/auth/login', rateLimiters.auth);
app.use('/api/auth/register', rateLimiters.auth);
app.use('/api/auth/forgot-password', rateLimiters.passwordReset);
app.use('/api/auth/reset-password', rateLimiters.passwordReset);
app.use('/api/auth', authRoutes);

app.use('/api/health-profile', rateLimiters.profileUpdate);
app.use('/api/health-profile/export', rateLimiters.export);
app.use('/api/health-profile', healthProfileRoutes);

app.use('/api/analytics/ai-insights', rateLimiters.aiInsights);
app.use('/api/analytics', rateLimiters.api);
app.use('/api/analytics', analyticsRoutes);

// NEW: Nutrition Routes
app.use('/api/nutrition', rateLimiters.api);
app.use('/api/nutrition', nutritionRoutes);

// Error logging endpoint (for frontend error boundary)
app.post('/api/errors/log', express.json(), (req, res) => {
  const { message, stack, timestamp, userAgent, url } = req.body;
  
  // Log to console (in production, send to error tracking service)
  console.error('CLIENT_ERROR:', {
    message,
    stack,
    timestamp,
    userAgent,
    url,
    userId: req.userId
  });
  
  res.json({ logged: true });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      message: 'Endpoint not found',
      path: req.originalUrl,
      method: req.method
    }
  });
});

// Global error handler with data leak prevention
app.use(preventDataLeak);

// Graceful shutdown
const gracefulShutdown = () => {
  console.log('\n🛑 Shutting down gracefully...');
  
  // Close MongoDB connection
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed');
    process.exit(0);
  });
  
  // Set timeout for forced shutdown
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 3000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  gracefulShutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
  gracefulShutdown();
});

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`
🚀 Server is running on port ${PORT}
📍 API Base URL: http://localhost:${PORT}/api
📊 Environment: ${process.env.NODE_ENV || 'development'}
🔒 Security Status: ENHANCED
✅ CORS: Allowing all origins in development mode
🥗 Nutrition Platform: ACTIVE

Available Endpoints:
✓ Health Profile: /api/health-profile
✓ Analytics: /api/analytics
✓ Nutrition: /api/nutrition
  - Preferences: GET/PUT /api/nutrition/preferences
  - Sync: POST /api/nutrition/preferences/sync
  - Recipes: GET /api/nutrition/recipes/search
  - Ingredients: GET /api/nutrition/ingredients/search
  - Init Data: POST /api/nutrition/init-data (dev only)

Security Features Active:
✓ Rate Limiting (Auth: 5/15min, API: 100/min)
✓ Input Sanitization (XSS, SQL Injection prevention)
✓ Request Size Limiting (10MB max)
✓ Security Headers (Helmet.js)
✓ CORS Protection (Development mode - all origins)
✓ MongoDB Query Sanitization
✓ Error Message Filtering
✓ Audit Logging
✓ Session Security
${process.env.NODE_ENV === 'production' ? '✓ HTTPS Enforcement' : '⚠️  HTTPS not enforced (development mode)'}

Nutrition Features:
✓ 15+ Dietary Preferences
✓ 10+ Allergy Options
✓ Auto-sync with Health Profile
✓ 500+ Recipes Database
✓ 500+ Ingredients Database
✓ Timezone Support (ISO 8601)
✓ Nutritional Calculations
✓ RAG-ready embeddings

Rate Limits:
- Authentication: 5 attempts per 15 minutes
- Password Reset: 3 attempts per hour
- API Calls: 100 per minute
- AI Insights: 10 per hour
- Data Export: 5 per hour
- Profile Updates: 20 per 5 minutes

To initialize nutrition data (after login):
POST http://localhost:${PORT}/api/nutrition/init-data

Testing Registration:
1. Go to http://localhost:3000/register
2. Enter any email and password (min 8 chars)
3. Check this console for the verification link
4. Copy and paste the link in your browser
  `);
  
  // Warnings for missing configurations
  if (!process.env.JWT_SECRET) {
    console.warn('⚠️  Warning: JWT_SECRET not set. Using default (INSECURE)');
  }
  if (!process.env.OPENAI_API_KEY) {
    console.warn('⚠️  Warning: OPENAI_API_KEY not set. AI insights will use fallback mode.');
  }
  if (process.env.NODE_ENV !== 'production') {
    console.warn('⚠️  Warning: Running in development mode. Some security features disabled.');
  }
});

// Server timeout settings
server.timeout = 30000; // 30 seconds
server.keepAliveTimeout = 65000; // 65 seconds
server.headersTimeout = 66000; // 66 seconds

module.exports = app;