const HealthProfile = require('../models/healthProfileModel');
const { validationResult } = require('express-validator');

/**
 * Create health profile
 * @route POST /api/health-profile
 * @access Private
 */
exports.createHealthProfile = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const userId = req.user._id;

    // Check if user already has a health profile
    const existingProfile = await HealthProfile.findOne({ user: userId });
    if (existingProfile) {
      return res.status(400).json({
        success: false,
        message: 'User already has a health profile'
      });
    }

    // Create health profile
    const healthProfile = new HealthProfile({
      user: userId,
      ...req.body
    });

    await healthProfile.save();

    res.status(201).json({
      success: true,
      data: healthProfile
    });
  } catch (error) {
    console.error('Create health profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating health profile'
    });
  }
};

/**
 * Get specific metrics entry
 * @route GET /api/health-profile/metrics/:id
 * @access Private
 */
exports.getMetricsById = async (req, res) => {
  try {
    const userId = req.user._id;
    const metricsId = req.params.id;

    // Find health profile
    const healthProfile = await HealthProfile.findOne({ user: userId });
    if (!healthProfile) {
      return res.status(404).json({
        success: false,
        message: 'Health profile not found'
      });
    }

    // Find specific metrics
    const metrics = healthProfile.physicalMetrics.id(metricsId);
    if (!metrics) {
      return res.status(404).json({
        success: false,
        message: 'Metrics not found'
      });
    }

    res.status(200).json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Get metrics by id error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching metrics'
    });
  }
};

/**
 * Update specific metrics entry
 * @route PUT /api/health-profile/metrics/:id
 * @access Private
 */
exports.updateMetrics = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const userId = req.user._id;
    const metricsId = req.params.id;
    const updatedData = req.body;

    // Find health profile
    const healthProfile = await HealthProfile.findOne({ user: userId });
    if (!healthProfile) {
      return res.status(404).json({
        success: false,
        message: 'Health profile not found'
      });
    }

    // Find and update specific metrics
    const metrics = healthProfile.physicalMetrics.id(metricsId);
    if (!metrics) {
      return res.status(404).json({
        success: false,
        message: 'Metrics not found'
      });
    }

    // Update metrics fields
    Object.keys(updatedData).forEach(key => {
      metrics[key] = updatedData[key];
    });

    await healthProfile.save();

    res.status(200).json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Update metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating metrics'
    });
  }
};

/**
 * Delete specific metrics entry
 * @route DELETE /api/health-profile/metrics/:id
 * @access Private
 */
exports.deleteMetrics = async (req, res) => {
  try {
    const userId = req.user._id;
    const metricsId = req.params.id;

    // Find health profile
    const healthProfile = await HealthProfile.findOne({ user: userId });
    if (!healthProfile) {
      return res.status(404).json({
        success: false,
        message: 'Health profile not found'
      });
    }

    // Find and remove specific metrics
    const metrics = healthProfile.physicalMetrics.id(metricsId);
    if (!metrics) {
      return res.status(404).json({
        success: false,
        message: 'Metrics not found'
      });
    }

    metrics.remove();
    await healthProfile.save();

    res.status(200).json({
      success: true,
      message: 'Metrics deleted successfully'
    });
  } catch (error) {
    console.error('Delete metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting metrics'
    });
  }
};

/**
 * Create new fitness goal
 * @route POST /api/health-profile/goals
 * @access Private
 */
exports.createFitnessGoal = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const userId = req.user._id;
    const newGoal = req.body;

    // Find health profile
    const healthProfile = await HealthProfile.findOne({ user: userId });
    if (!healthProfile) {
      return res.status(404).json({
        success: false,
        message: 'Health profile not found'
      });
    }

    // Add new goal
    healthProfile.fitnessGoals.push(newGoal);
    await healthProfile.save();

    res.status(201).json({
      success: true,
      data: healthProfile.fitnessGoals[healthProfile.fitnessGoals.length - 1]
    });
  } catch (error) {
    console.error('Create fitness goal error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating fitness goal'
    });
  }
};

/**
 * Get all fitness goals
 * @route GET /api/health-profile/goals
 * @access Private
 */
exports.getFitnessGoals = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find health profile
    const healthProfile = await HealthProfile.findOne({ user: userId });
    if (!healthProfile) {
      return res.status(404).json({
        success: false,
        message: 'Health profile not found'
      });
    }

    res.status(200).json({
      success: true,
      data: healthProfile.fitnessGoals
    });
  } catch (error) {
    console.error('Get fitness goals error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching fitness goals'
    });
  }
};

/**
 * Get specific fitness goal
 * @route GET /api/health-profile/goals/:id
 * @access Private
 */
exports.getFitnessGoalById = async (req, res) => {
  try {
    const userId = req.user._id;
    const goalId = req.params.id;

    // Find health profile
    const healthProfile = await HealthProfile.findOne({ user: userId });
    if (!healthProfile) {
      return res.status(404).json({
        success: false,
        message: 'Health profile not found'
      });
    }

    // Find specific goal
    const goal = healthProfile.fitnessGoals.id(goalId);
    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Fitness goal not found'
      });
    }

    res.status(200).json({
      success: true,
      data: goal
    });
  } catch (error) {
    console.error('Get fitness goal by id error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching fitness goal'
    });
  }
};

/**
 * Update specific fitness goal
 * @route PUT /api/health-profile/goals/:id
 * @access Private
 */
exports.updateFitnessGoal = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const userId = req.user._id;
    const goalId = req.params.id;
    const updatedData = req.body;

    // Find health profile
    const healthProfile = await HealthProfile.findOne({ user: userId });
    if (!healthProfile) {
      return res.status(404).json({
        success: false,
        message: 'Health profile not found'
      });
    }

    // Find and update specific goal
    const goal = healthProfile.fitnessGoals.id(goalId);
    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Fitness goal not found'
      });
    }

    // Update goal fields
    Object.keys(updatedData).forEach(key => {
      goal[key] = updatedData[key];
    });

    await healthProfile.save();

    res.status(200).json({
      success: true,
      data: goal
    });
  } catch (error) {
    console.error('Update fitness goal error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating fitness goal'
    });
  }
};

/**
 * Update goal progress
 * @route PUT /api/health-profile/goals/:id/progress
 * @access Private
 */
exports.updateGoalProgress = async (req, res) => {
  try {
    const userId = req.user._id;
    const goalId = req.params.id;
    const { progress } = req.body;

    // Validate progress value
    if (progress === undefined || progress < 0 || progress > 100) {
      return res.status(400).json({
        success: false,
        message: 'Progress must be a number between 0 and 100'
      });
    }

    // Find health profile
    const healthProfile = await HealthProfile.findOne({ user: userId });
    if (!healthProfile) {
      return res.status(404).json({
        success: false,
        message: 'Health profile not found'
      });
    }

    // Find and update specific goal
    const goal = healthProfile.fitnessGoals.id(goalId);
    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Fitness goal not found'
      });
    }

    // Update progress
    goal.progress = progress;
    
    // Update status based on progress
    if (progress === 0) {
      goal.status = 'not-started';
    } else if (progress === 100) {
      goal.status = 'achieved';
    } else {
      goal.status = 'in-progress';
    }

    await healthProfile.save();

    res.status(200).json({
      success: true,
      data: goal
    });
  } catch (error) {
    console.error('Update goal progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating goal progress'
    });
  }
};

/**
 * Delete specific fitness goal
 * @route DELETE /api/health-profile/goals/:id
 * @access Private
 */
exports.deleteFitnessGoal = async (req, res) => {
  try {
    const userId = req.user._id;
    const goalId = req.params.id;

    // Find health profile
    const healthProfile = await HealthProfile.findOne({ user: userId });
    if (!healthProfile) {
      return res.status(404).json({
        success: false,
        message: 'Health profile not found'
      });
    }

    // Find and remove specific goal
    const goal = healthProfile.fitnessGoals.id(goalId);
    if (!goal) {
      return res.status(404).json({
        success: false,
        message: 'Fitness goal not found'
      });
    }

    goal.remove();
    await healthProfile.save();

    res.status(200).json({
      success: true,
      message: 'Fitness goal deleted successfully'
    });
  } catch (error) {
    console.error('Delete fitness goal error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting fitness goal'
    });
  }
};

/**
 * Get user health profile
 * @route GET /api/health-profile
 * @access Private
 */
exports.getHealthProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find health profile
    const healthProfile = await HealthProfile.findOne({ user: userId });
    if (!healthProfile) {
      return res.status(404).json({
        success: false,
        message: 'Health profile not found'
      });
    }

    res.status(200).json({
      success: true,
      data: healthProfile
    });
  } catch (error) {
    console.error('Get health profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching health profile'
    });
  }
};

/**
 * Update health profile
 * @route PUT /api/health-profile
 * @access Private
 */
exports.updateHealthProfile = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const userId = req.user._id;

    // Find health profile and update
    const healthProfile = await HealthProfile.findOneAndUpdate(
      { user: userId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!healthProfile) {
      return res.status(404).json({
        success: false,
        message: 'Health profile not found'
      });
    }

    res.status(200).json({
      success: true,
      data: healthProfile
    });
  } catch (error) {
    console.error('Update health profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating health profile'
    });
  }
};

/**
 * Delete health profile
 * @route DELETE /api/health-profile
 * @access Private
 */
exports.deleteHealthProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    // Delete health profile
    const healthProfile = await HealthProfile.findOneAndDelete({ user: userId });

    if (!healthProfile) {
      return res.status(404).json({
        success: false,
        message: 'Health profile not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Health profile deleted successfully'
    });
  } catch (error) {
    console.error('Delete health profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting health profile'
    });
  }
};

/**
 * Add new physical metrics
 * @route POST /api/health-profile/metrics
 * @access Private
 */
exports.addPhysicalMetrics = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const userId = req.user._id;
    const newMetrics = req.body;

    // Find health profile
    const healthProfile = await HealthProfile.findOne({ user: userId });
    if (!healthProfile) {
      return res.status(404).json({
        success: false,
        message: 'Health profile not found'
      });
    }

    // Add new metrics
    healthProfile.physicalMetrics.push(newMetrics);
    await healthProfile.save();

    res.status(201).json({
      success: true,
      data: healthProfile.physicalMetrics[healthProfile.physicalMetrics.length - 1]
    });
  } catch (error) {
    console.error('Add physical metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding physical metrics'
    });
  }
};

/**
 * Get all physical metrics
 * @route GET /api/health-profile/metrics
 * @access Private
 */
exports.getPhysicalMetrics = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find health profile
    const healthProfile = await HealthProfile.findOne({ user: userId });
    if (!healthProfile) {
      return res.status(404).json({
        success: false,
        message: 'Health profile not found'
      });
    }

    res.status(200).json({
      success: true,
      data: healthProfile.physicalMetrics
    });
  } catch (error) {
    console.error('Get physical metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching physical metrics'
    });
  }
};

/**
 * Get latest physical metrics
 * @route GET /api/health-profile/metrics/latest
 * @access Private
 */
exports.getLatestMetrics = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find health profile
    const healthProfile = await HealthProfile.findOne({ user: userId });
    if (!healthProfile) {
      return res.status(404).json({
        success: false,
        message: 'Health profile not found'
      });
    }

    // Get latest metrics
    const latestMetrics = healthProfile.physicalMetrics.length > 0
      ? healthProfile.physicalMetrics[healthProfile.physicalMetrics.length - 1]
      : null;

    if (!latestMetrics) {
      return res.status(404).json({
        success: false,
        message: 'No physical metrics found'
      });
    }

    res.status(200).json({
      success: true,
      data: latestMetrics
    });
  } catch (error) {
    console.error('Get latest metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching latest metrics'
    });
  }
};