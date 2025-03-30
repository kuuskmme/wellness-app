const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect, isVerified } = require('../middleware/authMiddleware');
const { updateUserValidator } = require('../middleware/validationMiddleware');

// All routes require authentication
router.use(protect);

// User profile routes
router.get('/me', userController.getCurrentUser);
router.put('/me', updateUserValidator, userController.updateCurrentUser);
router.delete('/me', userController.deleteCurrentUser);

// Privacy settings routes
router.get('/me/privacy', userController.getPrivacySettings);
router.put('/me/privacy', userController.updatePrivacySettings);

module.exports = router;