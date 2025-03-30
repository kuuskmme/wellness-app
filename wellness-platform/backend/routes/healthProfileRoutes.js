const express = require('express');
const router = express.Router();
const healthProfileController = require('../controllers/healthProfileController');
const { protect, isVerified } = require('../middleware/authMiddleware');
const {
  createHealthProfileValidator,
  physicalMetricsValidator,
  fitnessGoalValidator,
  updateGoalProgressValidator,
  validateObjectId
} = require('../middleware/validationMiddleware');

// All routes require authentication
router.use(protect);
// All routes require verified email
router.use(isVerified);

// Health profile routes
router.post('/', createHealthProfileValidator, healthProfileController.createHealthProfile);
router.get('/', healthProfileController.getHealthProfile);
router.put('/', healthProfileController.updateHealthProfile);
router.delete('/', healthProfileController.deleteHealthProfile);

// Physical metrics routes
router.post('/metrics', physicalMetricsValidator, healthProfileController.addPhysicalMetrics);
router.get('/metrics', healthProfileController.getPhysicalMetrics);
router.get('/metrics/latest', healthProfileController.getLatestMetrics);
router.get('/metrics/:id', validateObjectId('id'), healthProfileController.getMetricsById);
router.put('/metrics/:id', validateObjectId('id'), physicalMetricsValidator, healthProfileController.updateMetrics);
router.delete('/metrics/:id', validateObjectId('id'), healthProfileController.deleteMetrics);

// Fitness goals routes
router.post('/goals', fitnessGoalValidator, healthProfileController.createFitnessGoal);
router.get('/goals', healthProfileController.getFitnessGoals);
router.get('/goals/:id', validateObjectId('id'), healthProfileController.getFitnessGoalById);
router.put('/goals/:id', validateObjectId('id'), fitnessGoalValidator, healthProfileController.updateFitnessGoal);
router.put('/goals/:id/progress', validateObjectId('id'), updateGoalProgressValidator, healthProfileController.updateGoalProgress);
router.delete('/goals/:id', validateObjectId('id'), healthProfileController.deleteFitnessGoal);

module.exports = router;