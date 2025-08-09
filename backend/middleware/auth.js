// middleware/auth.js - JWT Authentication Middleware
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT token middleware
const verifyToken = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        message: 'Access denied. No valid token provided.' 
      });
    }

    // Extract token (remove 'Bearer ' prefix)
    const token = authHeader.substring(7);

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user still exists
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ 
        message: 'User no longer exists.' 
      });
    }

    // Check if user is verified
    if (!user.isVerified) {
      return res.status(403).json({ 
        message: 'Please verify your email to access this resource.' 
      });
    }

    // Attach user to request object
    req.user = user;
    req.userId = user._id;
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Token expired. Please refresh your token.',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        message: 'Invalid token.' 
      });
    }
    
    console.error('Auth middleware error:', error);
    res.status(500).json({ 
      message: 'Server error during authentication.' 
    });
  }
};

// Verify refresh token
const verifyRefreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({ 
        message: 'Refresh token required.' 
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    // Find user and check if refresh token exists in their tokens
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ 
        message: 'Invalid refresh token.' 
      });
    }

    // Clean expired tokens
    user.cleanExpiredTokens();
    
    // Check if this refresh token is in the user's valid tokens
    const tokenExists = user.refreshTokens.some(
      tokenObj => tokenObj.token === refreshToken
    );
    
    if (!tokenExists) {
      return res.status(401).json({ 
        message: 'Refresh token not found or expired.' 
      });
    }

    req.user = user;
    req.refreshToken = refreshToken;
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Refresh token expired. Please login again.' 
      });
    }
    
    console.error('Refresh token error:', error);
    res.status(401).json({ 
      message: 'Invalid refresh token.' 
    });
  }
};

// Optional auth - doesn't fail if no token, but attaches user if valid token
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continue without user
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findById(decoded.userId).select('-password');
    
    if (user && user.isVerified) {
      req.user = user;
      req.userId = user._id;
    }
    
    next();
  } catch (error) {
    // Continue without user even if token is invalid
    next();
  }
};

// Check if user has specific role (for future use)
const hasRole = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        message: 'Authentication required.' 
      });
    }

    if (req.user.role !== requiredRole) {
      return res.status(403).json({ 
        message: 'Insufficient permissions.' 
      });
    }

    next();
  };
};

// Rate limiting middleware for auth endpoints
const authRateLimit = require('express-rate-limit');

const createAccountLimiter = authRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // max 5 requests per windowMs
  message: 'Too many accounts created from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = authRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // max 10 login attempts per windowMs
  message: 'Too many login attempts from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

const passwordResetLimiter = authRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // max 3 password reset requests per windowMs
  message: 'Too many password reset requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  verifyToken,
  verifyRefreshToken,
  optionalAuth,
  hasRole,
  createAccountLimiter,
  loginLimiter,
  passwordResetLimiter
};