
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const rateLimit = require('express-rate-limit');
const { authenticateToken } = require('../middleware/auth');

// Verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Verify refresh token
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    return null;
  }
};

// Check if user has given data consent (NEW for Step 3)
const requireDataConsent = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select('dataConsent');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.dataConsent || !user.dataConsent.given) {
      return res.status(403).json({ 
        message: 'Data consent required',
        code: 'CONSENT_REQUIRED',
        redirectTo: '/profile#privacy'
      });
    }

    next();
  } catch (error) {
    console.error('Consent check error:', error);
    res.status(500).json({ message: 'Server error while checking consent' });
  }
};

// Check if email is verified
const requireVerification = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).select('isVerified');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ 
        message: 'Email verification required',
        code: 'VERIFICATION_REQUIRED',
        redirectTo: '/verify-pending'
      });
    }

    next();
  } catch (error) {
    console.error('Verification check error:', error);
    res.status(500).json({ message: 'Server error while checking verification' });
  }
};

// Rate limiting middleware
const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        message,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  });
};

// Different rate limiters for different endpoints
const authLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // 5 requests per window
  'Too many authentication attempts, please try again later'
);

const apiLimiter = createRateLimiter(
  1 * 60 * 1000, // 1 minute
  100, // 100 requests per minute
  'Too many requests, please slow down'
);

const exportLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  10, // 10 exports per hour
  'Export limit reached, please try again later'
);

const createAccountLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  3, // 3 accounts per hour per IP
  'Too many accounts created from this IP, please try again later'
);

const loginLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // 5 login attempts per window
  'Too many login attempts, please try again later'
);

const passwordResetLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  3, // 3 reset requests per hour
  'Too many password reset requests, please try again later'
);

module.exports = {
  verifyToken,
  verifyRefreshToken,
  requireDataConsent,
  requireVerification,
  authLimiter,
  apiLimiter,
  exportLimiter,
  createAccountLimiter,
  loginLimiter,
  passwordResetLimiter
};