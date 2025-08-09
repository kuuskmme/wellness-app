// utils/jwt.js - JWT Token Generation and Management
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Generate access token (short-lived)
const generateAccessToken = (userId) => {
  return jwt.sign(
    { 
      userId,
      type: 'access',
      timestamp: Date.now()
    },
    process.env.JWT_SECRET,
    { 
      expiresIn: process.env.JWT_EXPIRE || '15m',
      issuer: 'wellness-platform',
      audience: 'wellness-app'
    }
  );
};

// Generate refresh token (long-lived)
const generateRefreshToken = (userId) => {
  const refreshToken = jwt.sign(
    { 
      userId,
      type: 'refresh',
      nonce: crypto.randomBytes(16).toString('hex')
    },
    process.env.JWT_REFRESH_SECRET,
    { 
      expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
      issuer: 'wellness-platform',
      audience: 'wellness-app'
    }
  );
  
  return refreshToken;
};

// Generate both tokens
const generateTokens = (userId) => {
  return {
    accessToken: generateAccessToken(userId),
    refreshToken: generateRefreshToken(userId)
  };
};

// Generate email verification token (not JWT, just random)
const generateEmailToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Hash token for storage (for email/reset tokens)
const hashToken = (token) => {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
};

// Verify token hasn't expired (for custom expiry checking)
const isTokenExpired = (expiryDate) => {
  return new Date() > new Date(expiryDate);
};

// Generate 2FA secret
const generate2FASecret = () => {
  const speakeasy = require('speakeasy');
  return speakeasy.generateSecret({
    name: 'Wellness Platform',
    length: 32
  });
};

// Verify 2FA token
const verify2FAToken = (secret, token) => {
  const speakeasy = require('speakeasy');
  return speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: token,
    window: 2 // Allow 2 time steps for clock skew
  });
};

// Generate QR code for 2FA
const generate2FAQRCode = async (secret, userEmail) => {
  const qrcode = require('qrcode');
  const otpauthUrl = `otpauth://totp/WellnessPlatform:${userEmail}?secret=${secret.base32}&issuer=WellnessPlatform`;
  
  try {
    const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);
    return qrCodeDataUrl;
  } catch (error) {
    console.error('QR Code generation error:', error);
    throw new Error('Failed to generate QR code');
  }
};

// Decode token without verification (for debugging)
const decodeToken = (token) => {
  return jwt.decode(token);
};

// Calculate token expiry time in seconds
const getTokenExpiryTime = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (decoded && decoded.exp) {
      const now = Math.floor(Date.now() / 1000);
      return decoded.exp - now; // Time remaining in seconds
    }
    return null;
  } catch (error) {
    return null;
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateTokens,
  generateEmailToken,
  hashToken,
  isTokenExpired,
  generate2FASecret,
  verify2FAToken,
  generate2FAQRCode,
  decodeToken,
  getTokenExpiryTime
};