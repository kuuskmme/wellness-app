const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const {
  registerValidator,
  loginValidator,
  resetPasswordValidator
} = require('../middleware/validationMiddleware');

// Public routes
router.post('/register', registerValidator, authController.register);
router.post('/login', loginValidator, authController.login);
router.post('/verify-email', authController.verifyEmail);
router.post('/refresh-token', authController.refreshToken);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', resetPasswordValidator, authController.resetPassword);

// Protected routes
router.post('/logout', protect, authController.logout);

// TODO: Implement these routes later
// router.post('/enable-2fa', protect, authController.enable2FA);
// router.post('/verify-2fa', authController.verify2FA);
// router.post('/disable-2fa', protect, authController.disable2FA);
// router.get('/oauth/:provider', authController.oauthRedirect);
// router.get('/oauth/callback', authController.oauthCallback);

module.exports = router;