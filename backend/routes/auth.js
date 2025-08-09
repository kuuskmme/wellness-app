// routes/auth.js - Complete Authentication Routes with JWT, Email Verification, 2FA
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { 
  generateTokens, 
  generateEmailToken, 
  hashToken,
  generate2FASecret,
  verify2FAToken,
  generate2FAQRCode
} = require('../utils/jwt');
const {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  send2FACodeEmail
} = require('../utils/email');
const {
  verifyToken,
  verifyRefreshToken,
  createAccountLimiter,
  loginLimiter,
  passwordResetLimiter
} = require('../middleware/auth');

// =====================
// REGISTRATION
// =====================

router.post('/register', 
  createAccountLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    body('dataConsent')
      .isBoolean()
      .equals('true')
      .withMessage('You must consent to data collection to create an account')
  ], 
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, dataConsent } = req.body;

      // Check if user exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ 
          message: 'An account with this email already exists.' 
        });
      }

      // Generate verification token
      const verificationToken = generateEmailToken();
      const hashedToken = hashToken(verificationToken);

      // Create new user
      const user = new User({
        email,
        password,
        verificationToken: hashedToken,
        verificationTokenExpiry: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
        dataConsent: {
          given: dataConsent,
          timestamp: new Date(),
          ipAddress: req.ip
        }
      });

      await user.save();

      // Send verification email
      const emailResult = await sendVerificationEmail(email, email.split('@')[0], verificationToken);
      
      if (!emailResult.success) {
        console.error('Failed to send verification email:', emailResult.error);
      }

      res.status(201).json({
        message: 'Registration successful! Please check your email to verify your account.',
        userId: user._id,
        emailSent: emailResult.success
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ 
        message: 'Server error during registration. Please try again.' 
      });
    }
});

// =====================
// EMAIL VERIFICATION
// =====================

router.get('/verify/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const hashedToken = hashToken(token);

    // Find user with this token
    const user = await User.findOne({
      verificationToken: hashedToken,
      verificationTokenExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        message: 'Invalid or expired verification token.'
      });
    }

    // Verify the user
    user.isVerified = true;
    user.verificationToken = null;
    user.verificationTokenExpiry = null;
    await user.save();

    // Send welcome email
    await sendWelcomeEmail(user.email, user.email.split('@')[0]);

    // Generate tokens for auto-login
    const tokens = generateTokens(user._id);
    
    // Store refresh token
    user.refreshTokens.push({
      token: tokens.refreshToken,
      createdAt: new Date()
    });
    await user.save();

    res.json({
      message: 'Email verified successfully! Welcome to Wellness Platform!',
      tokens,
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({
      message: 'Server error during verification.'
    });
  }
});

// Resend verification email
router.post('/resend-verification', 
  loginLimiter,
  [
    body('email').isEmail().normalizeEmail()
  ],
  async (req, res) => {
    try {
      const { email } = req.body;
      
      const user = await User.findOne({ email });
      
      if (!user) {
        // Don't reveal if user exists
        return res.json({
          message: 'If an account exists with this email, a verification email has been sent.'
        });
      }

      if (user.isVerified) {
        return res.status(400).json({
          message: 'This account is already verified.'
        });
      }

      // Generate new verification token
      const verificationToken = generateEmailToken();
      user.verificationToken = hashToken(verificationToken);
      user.verificationTokenExpiry = Date.now() + 24 * 60 * 60 * 1000;
      await user.save();

      // Send email
      await sendVerificationEmail(email, email.split('@')[0], verificationToken);

      res.json({
        message: 'Verification email has been resent. Please check your inbox.'
      });
    } catch (error) {
      console.error('Resend verification error:', error);
      res.status(500).json({
        message: 'Server error. Please try again.'
      });
    }
});

// =====================
// LOGIN
// =====================

router.post('/login',
  loginLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
    body('twoFactorCode').optional().isLength({ min: 6, max: 6 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, twoFactorCode } = req.body;

      // Find user
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({ 
          message: 'Invalid email or password.' 
        });
      }

      // Check password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({ 
          message: 'Invalid email or password.' 
        });
      }

      // Check if email is verified
      if (!user.isVerified) {
        return res.status(403).json({ 
          message: 'Please verify your email before logging in.',
          needsVerification: true
        });
      }

      // Check 2FA if enabled
      if (user.twoFactorEnabled) {
        if (!twoFactorCode) {
          return res.status(200).json({
            message: 'Two-factor authentication required.',
            requires2FA: true
          });
        }

        const isValidToken = verify2FAToken(user.twoFactorSecret, twoFactorCode);
        if (!isValidToken) {
          return res.status(401).json({
            message: 'Invalid two-factor authentication code.'
          });
        }
      }

      // Generate tokens
      const tokens = generateTokens(user._id);

      // Store refresh token
      user.refreshTokens.push({
        token: tokens.refreshToken,
        createdAt: new Date()
      });
      
      // Clean old tokens
      user.cleanExpiredTokens();
      
      // Update last login
      user.lastLogin = new Date();
      await user.save();

      res.json({
        message: 'Login successful!',
        tokens,
        user: user.toJSON()
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ 
        message: 'Server error during login.' 
      });
    }
});

// =====================
// TOKEN REFRESH
// =====================

router.post('/refresh-token', verifyRefreshToken, async (req, res) => {
  try {
    const { user, refreshToken } = req;

    // Generate new access token
    const accessToken = generateTokens(user._id).accessToken;

    res.json({
      accessToken,
      message: 'Token refreshed successfully.'
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      message: 'Server error during token refresh.'
    });
  }
});

// =====================
// LOGOUT
// =====================

router.post('/logout', verifyToken, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const user = req.user;

    if (refreshToken) {
      // Remove specific refresh token
      user.refreshTokens = user.refreshTokens.filter(
        tokenObj => tokenObj.token !== refreshToken
      );
    } else {
      // Remove all refresh tokens (logout from all devices)
      user.refreshTokens = [];
    }

    await user.save();

    res.json({
      message: 'Logged out successfully.'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      message: 'Server error during logout.'
    });
  }
});

// =====================
// PASSWORD RESET
// =====================

router.post('/forgot-password',
  passwordResetLimiter,
  [
    body('email').isEmail().normalizeEmail()
  ],
  async (req, res) => {
    try {
      const { email } = req.body;
      
      const user = await User.findOne({ email });
      
      // Don't reveal if user exists
      if (!user) {
        return res.json({
          message: 'If an account exists with this email, a password reset link has been sent.'
        });
      }

      // Generate reset token
      const resetToken = generateEmailToken();
      user.resetPasswordToken = hashToken(resetToken);
      user.resetPasswordExpiry = Date.now() + 60 * 60 * 1000; // 1 hour
      await user.save();

      // Send reset email
      await sendPasswordResetEmail(email, email.split('@')[0], resetToken);

      res.json({
        message: 'If an account exists with this email, a password reset link has been sent.'
      });
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({
        message: 'Server error. Please try again.'
      });
    }
});

router.post('/reset-password',
  [
    body('token').notEmpty(),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain uppercase, lowercase, and number')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { token, password } = req.body;
      const hashedToken = hashToken(token);

      // Find user with valid reset token
      const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpiry: { $gt: Date.now() }
      });

      if (!user) {
        return res.status(400).json({
          message: 'Invalid or expired reset token.'
        });
      }

      // Update password
      user.password = password;
      user.resetPasswordToken = null;
      user.resetPasswordExpiry = null;
      
      // Invalidate all refresh tokens for security
      user.refreshTokens = [];
      
      await user.save();

      res.json({
        message: 'Password reset successful! Please login with your new password.'
      });
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({
        message: 'Server error during password reset.'
      });
    }
});

// =====================
// 2FA SETUP
// =====================

router.post('/2fa/setup', verifyToken, async (req, res) => {
  try {
    const user = req.user;

    if (user.twoFactorEnabled) {
      return res.status(400).json({
        message: 'Two-factor authentication is already enabled.'
      });
    }

    // Generate secret
    const secret = generate2FASecret();
    
    // Generate QR code
    const qrCode = await generate2FAQRCode(secret, user.email);

    // Store secret temporarily (not enabled yet)
    user.twoFactorSecret = secret.base32;
    await user.save();

    res.json({
      message: 'Scan the QR code with your authenticator app.',
      qrCode,
      secret: secret.base32, // Backup code
      backupCodes: [] // TODO: Generate backup codes
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    res.status(500).json({
      message: 'Server error during 2FA setup.'
    });
  }
});

router.post('/2fa/verify', verifyToken, [
  body('code').isLength({ min: 6, max: 6 })
], async (req, res) => {
  try {
    const { code } = req.body;
    const user = req.user;

    if (!user.twoFactorSecret) {
      return res.status(400).json({
        message: 'Two-factor authentication setup not initiated.'
      });
    }

    // Verify the code
    const isValid = verify2FAToken(user.twoFactorSecret, code);
    
    if (!isValid) {
      return res.status(400).json({
        message: 'Invalid verification code.'
      });
    }

    // Enable 2FA
    user.twoFactorEnabled = true;
    await user.save();

    res.json({
      message: 'Two-factor authentication enabled successfully!'
    });
  } catch (error) {
    console.error('2FA verification error:', error);
    res.status(500).json({
      message: 'Server error during 2FA verification.'
    });
  }
});

router.post('/2fa/disable', verifyToken, [
  body('password').notEmpty()
], async (req, res) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.user._id);

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        message: 'Invalid password.'
      });
    }

    // Disable 2FA
    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    await user.save();

    res.json({
      message: 'Two-factor authentication disabled.'
    });
  } catch (error) {
    console.error('2FA disable error:', error);
    res.status(500).json({
      message: 'Server error.'
    });
  }
});

// =====================
// OAUTH ROUTES (Placeholders)
// =====================

// Google OAuth
router.get('/google', (req, res) => {
  // TODO: Implement Google OAuth with passport.js
  res.json({ message: 'Google OAuth endpoint - to be implemented' });
});

router.get('/google/callback', (req, res) => {
  // TODO: Handle Google OAuth callback
  res.json({ message: 'Google OAuth callback - to be implemented' });
});

// GitHub OAuth
router.get('/github', (req, res) => {
  // TODO: Implement GitHub OAuth with passport.js
  res.json({ message: 'GitHub OAuth endpoint - to be implemented' });
});

router.get('/github/callback', (req, res) => {
  // TODO: Handle GitHub OAuth callback
  res.json({ message: 'GitHub OAuth callback - to be implemented' });
});

module.exports = router;