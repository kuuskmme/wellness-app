// routes/auth.js - Complete Authentication Routes with User Preferences for Step 3
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { sendEmail, emailTemplates } = require('../utils/email');
const { generateTokens, verifyRefreshToken } = require('../utils/jwt');
const { verifyToken } = require('../middleware/auth');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

// Generate verification token
const generateVerificationToken = () => {
  return require('crypto').randomBytes(32).toString('hex');
};

// Hash token for storage
const hashToken = (token) => {
  return require('crypto').createHash('sha256').update(token).digest('hex');
};

// =====================
// REGISTRATION
// =====================
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ 
        message: 'An account with this email already exists.' 
      });
    }

    // Generate verification token
    const verificationToken = generateVerificationToken();
    const hashedToken = hashToken(verificationToken);

    // Create new user
    const user = new User({
      email,
      password,
      verificationToken: hashedToken,
      verificationTokenExpiry: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    });

    await user.save();

    // Send verification email
    try {
      const emailContent = emailTemplates.verification(verificationToken);
      await sendEmail(email, emailContent.subject, emailContent.html, emailContent.text);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
    }

    res.status(201).json({
      message: 'Registration successful! Please check your email to verify your account.',
      userId: user._id
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      message: 'Server error during registration. Please try again.' 
    });
  }
});

// =====================
// LOGIN
// =====================
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  body('twoFactorCode').optional().isLength({ min: 6, max: 6 })
], async (req, res) => {
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
        return res.json({
          requires2FA: true,
          message: 'Please enter your 2FA code.'
        });
      }

      const isValid = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: twoFactorCode,
        window: 2
      });

      if (!isValid) {
        return res.status(401).json({
          message: 'Invalid 2FA code.'
        });
      }
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Store refresh token
    user.refreshTokens.push({
      token: hashToken(refreshToken),
      createdAt: new Date()
    });
    user.lastLogin = new Date();
    await user.save();

    res.json({
      message: 'Login successful!',
      tokens: { accessToken, refreshToken },
      user: {
        id: user._id,
        email: user.email,
        isVerified: user.isVerified,
        twoFactorEnabled: user.twoFactorEnabled
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Server error during login.' 
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

    const user = await User.findOne({
      verificationToken: hashedToken,
      verificationTokenExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        message: 'Invalid or expired verification token.'
      });
    }

    user.isVerified = true;
    user.verificationToken = null;
    user.verificationTokenExpiry = null;
    await user.save();

    // Send welcome email
    try {
      const emailContent = emailTemplates.welcome(user.email.split('@')[0]);
      await sendEmail(user.email, emailContent.subject, emailContent.html, emailContent.text);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
    }

    res.json({
      message: 'Email verified successfully! You can now login.',
      verified: true
    });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({
      message: 'Server error during verification.'
    });
  }
});

// =====================
// TOKEN REFRESH
// =====================
router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        message: 'Refresh token required.'
      });
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return res.status(401).json({
        message: 'Invalid refresh token.'
      });
    }

    // Find user and check if refresh token exists
    const hashedToken = hashToken(refreshToken);
    const user = await User.findOne({
      _id: decoded.userId,
      'refreshTokens.token': hashedToken
    });

    if (!user) {
      return res.status(401).json({
        message: 'Invalid refresh token.'
      });
    }

    // Generate new access token
    const accessToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

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
    const userId = req.userId;

    if (refreshToken) {
      const hashedToken = hashToken(refreshToken);
      await User.findByIdAndUpdate(userId, {
        $pull: { refreshTokens: { token: hashedToken } }
      });
    }

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
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if user exists
      return res.json({
        message: 'If an account exists with this email, you will receive a password reset link.'
      });
    }

    // Generate reset token
    const resetToken = generateVerificationToken();
    const hashedToken = hashToken(resetToken);

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpiry = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    // Send reset email
    try {
      const emailContent = emailTemplates.passwordReset(resetToken);
      await sendEmail(email, emailContent.subject, emailContent.html, emailContent.text);
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError);
    }

    res.json({
      message: 'If an account exists with this email, you will receive a password reset link.'
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      message: 'Server error. Please try again.'
    });
  }
});

router.post('/reset-password', [
  body('token').notEmpty(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, password } = req.body;
    const hashedToken = hashToken(token);

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        message: 'Invalid or expired reset token.'
      });
    }

    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpiry = null;
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
    const user = await User.findById(req.userId);

    if (user.twoFactorEnabled) {
      return res.status(400).json({
        message: 'Two-factor authentication is already enabled.'
      });
    }

    const secret = speakeasy.generateSecret({
      name: `Wellness Platform (${user.email})`
    });

    const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    user.twoFactorSecret = secret.base32;
    await user.save();

    res.json({
      message: 'Scan the QR code with your authenticator app.',
      qrCode,
      secret: secret.base32
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
    const user = await User.findById(req.userId);

    if (!user.twoFactorSecret) {
      return res.status(400).json({
        message: 'Two-factor authentication setup not initiated.'
      });
    }

    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 2
    });
    
    if (!isValid) {
      return res.status(400).json({
        message: 'Invalid verification code.'
      });
    }

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

// =====================
// NEW: USER PREFERENCES FOR STEP 3
// =====================

// Get user preferences (data consent and sharing)
router.get('/user-preferences', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('dataConsent dataSharing');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      dataConsent: user.dataConsent || { given: false },
      dataSharing: user.dataSharing || {
        publicVisibility: false,
        emailNotifications: true,
        aiInsights: true
      }
    });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ message: 'Server error while fetching preferences' });
  }
});

// Update user preferences
router.put('/user-preferences', verifyToken, [
  body('dataConsent.given').optional().isBoolean(),
  body('dataSharing.publicVisibility').optional().isBoolean(),
  body('dataSharing.emailNotifications').optional().isBoolean(),
  body('dataSharing.aiInsights').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update data consent
    if (req.body.dataConsent) {
      user.dataConsent = {
        given: req.body.dataConsent.given,
        timestamp: req.body.dataConsent.given ? new Date() : null,
        ipAddress: req.ip
      };
    }

    // Update data sharing preferences
    if (req.body.dataSharing) {
      user.dataSharing = {
        ...user.dataSharing.toObject(),
        ...req.body.dataSharing
      };
    }

    await user.save();

    res.json({
      message: 'Preferences updated successfully',
      dataConsent: user.dataConsent,
      dataSharing: user.dataSharing
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ message: 'Server error while updating preferences' });
  }
});

// Withdraw data consent
router.post('/withdraw-consent', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.dataConsent = {
      given: false,
      timestamp: new Date(),
      ipAddress: req.ip
    };

    // Also disable AI insights if consent is withdrawn
    user.dataSharing.aiInsights = false;

    await user.save();

    res.json({
      message: 'Data consent withdrawn successfully',
      note: 'Your existing health profile data has been preserved but will not be processed for insights'
    });
  } catch (error) {
    console.error('Withdraw consent error:', error);
    res.status(500).json({ message: 'Server error while withdrawing consent' });
  }
});

// Get current user info
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password -refreshTokens -twoFactorSecret');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error while fetching user' });
  }
});

module.exports = router;