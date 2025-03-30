const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { protect, isVerified } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);
// All routes require verified email
router.use(isVerified);

// Analytics routes
router.get('/bmi', analyticsController.getBMI);
router.get('/wellness-score', analyticsController.getWellnessScore);
router.get('/insights', analyticsController.getHealthInsights);
router.get('/progress', analyticsController.getProgressAnalytics);
router.get('/trends', analyticsController.getHealthTrends);

module.exports = router;