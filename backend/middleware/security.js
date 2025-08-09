// middleware/security.js - Enhanced Security Middleware for Step 6
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

// Advanced rate limiting configurations
const createAdvancedRateLimiter = (options) => {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: options.max || 100,
    message: options.message || 'Too many requests from this IP',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/api/health';
    },
    handler: (req, res) => {
      res.status(429).json({
        error: {
          message: options.message || 'Too many requests',
          retryAfter: Math.ceil(options.windowMs / 1000),
          limit: options.max,
          remaining: 0,
          resetTime: new Date(Date.now() + options.windowMs).toISOString()
        }
      });
    },
    keyGenerator: (req) => {
      // Use IP + User ID for more accurate rate limiting
      return req.ip + ':' + (req.userId || 'anonymous');
    },
    skipSuccessfulRequests: options.skipSuccessful || false,
    skipFailedRequests: false
  });
};

// Specific rate limiters for different operations
const rateLimiters = {
  // Authentication endpoints - very strict
  auth: createAdvancedRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: 'Too many authentication attempts. Please try again later.',
    skipSuccessful: true
  }),

  // Password reset - strict
  passwordReset: createAdvancedRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3,
    message: 'Too many password reset requests. Please try again in an hour.'
  }),

  // API calls - moderate
  api: createAdvancedRateLimiter({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100,
    message: 'Too many API requests. Please slow down.'
  }),

  // AI insights - expensive operation
  aiInsights: createAdvancedRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    message: 'AI insights limit reached. Please try again later.'
  }),

  // Data export - prevent abuse
  export: createAdvancedRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: 'Export limit reached. Please try again later.'
  }),

  // Health profile updates
  profileUpdate: createAdvancedRateLimiter({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 20,
    message: 'Too many profile updates. Please try again in a few minutes.'
  })
};

// Security headers configuration
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.tailwindcss.com'],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.openai.com'],
      fontSrc: ["'self'", 'https:', 'data:'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // For development
});

// Input validation and sanitization middleware
const sanitizeInput = (req, res, next) => {
  // Sanitize request body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  // Sanitize URL parameters
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  
  next();
};

// Recursive sanitization function
const sanitizeObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) {
    return typeof obj === 'string' ? sanitizeString(obj) : obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  const sanitized = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      // Prevent prototype pollution
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      sanitized[key] = sanitizeObject(obj[key]);
    }
  }
  return sanitized;
};

// String sanitization
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  
  // Remove any script tags
  str = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove SQL injection attempts
  str = str.replace(/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE)\b)/gi, '');
  
  // Trim whitespace
  str = str.trim();
  
  // Limit string length to prevent DOS
  if (str.length > 10000) {
    str = str.substring(0, 10000);
  }
  
  return str;
};

// Request size limiting
const requestSizeLimit = (req, res, next) => {
  const contentLength = req.headers['content-length'];
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (contentLength && parseInt(contentLength) > maxSize) {
    return res.status(413).json({
      error: {
        message: 'Request entity too large',
        maxSize: '10MB'
      }
    });
  }
  
  next();
};

// API key validation for external services
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  // Skip for internal routes
  if (!req.path.startsWith('/api/external')) {
    return next();
  }
  
  if (!apiKey || apiKey !== process.env.EXTERNAL_API_KEY) {
    return res.status(401).json({
      error: {
        message: 'Invalid or missing API key'
      }
    });
  }
  
  next();
};

// Security audit logging
const securityAuditLog = (req, res, next) => {
  // Log security-relevant events
  const securityEvents = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/reset-password',
    '/api/health-profile/export',
    '/api/auth/2fa/verify'
  ];
  
  if (securityEvents.includes(req.path)) {
    console.log('SECURITY_AUDIT:', {
      timestamp: new Date().toISOString(),
      ip: req.ip,
      path: req.path,
      method: req.method,
      userId: req.userId || 'anonymous',
      userAgent: req.headers['user-agent']
    });
  }
  
  next();
};

// HTTPS enforcement for production
const enforceHTTPS = (req, res, next) => {
  if (process.env.NODE_ENV === 'production' && !req.secure && req.get('X-Forwarded-Proto') !== 'https') {
    return res.redirect('https://' + req.get('Host') + req.url);
  }
  next();
};

// Session security
const sessionSecurity = (req, res, next) => {
  // Add security headers for session
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Cache-Control': 'no-store, no-cache, must-revalidate, private'
  });
  
  next();
};

// Data leak prevention
const preventDataLeak = (err, req, res, next) => {
  // Don't leak error details in production
  if (process.env.NODE_ENV === 'production') {
    console.error('Error:', err);
    
    // Generic error messages for production
    const statusCode = err.statusCode || 500;
    const message = statusCode === 500 ? 'Internal server error' : err.message;
    
    return res.status(statusCode).json({
      error: {
        message,
        statusCode
      }
    });
  }
  
  // Detailed errors for development
  res.status(err.statusCode || 500).json({
    error: {
      message: err.message,
      statusCode: err.statusCode || 500,
      stack: err.stack
    }
  });
};

// Export all security middleware
module.exports = {
  rateLimiters,
  securityHeaders,
  sanitizeInput,
  requestSizeLimit,
  validateApiKey,
  securityAuditLog,
  enforceHTTPS,
  sessionSecurity,
  preventDataLeak,
  mongoSanitize: mongoSanitize(),
  xssClean: xss(),
  hpp: hpp()
};