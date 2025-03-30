const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * Generate access token for authenticated user
 * @param {Object} user - User object from database
 * @returns {String} JWT token
 */
exports.generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m' }
  );
};

/**
 * Generate refresh token for authenticated user
 * @param {Object} user - User object from database
 * @returns {String} JWT token
 */
exports.generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
  );
};

/**
 * Generate random token for email verification or password reset
 * @returns {String} Random token
 */
exports.generateRandomToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Verify JWT token
 * @param {String} token - JWT token to verify
 * @param {String} secret - Secret key to use for verification
 * @returns {Object} Decoded token payload or null if invalid
 */
exports.verifyToken = (token, secret) => {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    return null;
  }
};