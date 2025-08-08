// routes/healthProfile.js - Health profile routes (basic structure for Step 1)
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const HealthProfile = require('../models/HealthProfile');
const User = require('../models/User');

// Temporary middleware to simulate authentication (will be replaced in Step 2)
const tempAuth = async (req, res, next) => {
  // For testing, use a user ID from headers or create a test user
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  req.userId = userId;
  next();
};

// Create or update health profile
router.post('/', tempAuth, [
  body('demographics.age').isInt({ min: 1, max: 150 }),
  body('demographics.gender').isIn(['male', 'female', 'other', 'prefer_not_to_say']),
  body('physicalMetrics.height.value').isFloat({ min: 30, max: 300 }),
  body('physicalMetrics.weight.value').isFloat({ min: 1, max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if profile exists
    let profile = await HealthProfile.findOne({ userId: req.userId });
    
    if (profile) {
      // Update existing profile
      Object.assign(profile, req.body);
      profile.metadata.lastUpdated = new Date();
    } else {
      // Create new profile
      profile = new HealthProfile({
        userId: req.userId,
        ...req.body
      });
    }

    await profile.save();

    res.json({
      message: profile.isNew ? 'Health profile created successfully' : 'Health profile updated successfully',
      profile
    });
  } catch (error) {
    console.error('Health profile error:', error);
    res.status(500).json({ message: 'Server error while saving health profile' });
  }
});

// Get health profile
router.get('/', tempAuth, async (req, res) => {
  try {
    const profile = await HealthProfile.findOne({ userId: req.userId });
    
    if (!profile) {
      return res.status(404).json({ message: 'Health profile not found' });
    }

    res.json({ profile });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error while fetching health profile' });
  }
});

// Export health data (basic implementation for Step 1)
router.get('/export', tempAuth, async (req, res) => {
  try {
    const profile = await HealthProfile.findOne({ userId: req.userId });
    
    if (!profile) {
      return res.status(404).json({ message: 'Health profile not found' });
    }

    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="health-profile-${Date.now()}.json"`);
    
    res.json({
      exportDate: new Date().toISOString(),
      profile: profile.toObject(),
      metadata: {
        version: '1.0.0',
        platform: 'Numbers-Don\'t-Lie Wellness Platform'
      }
    });
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ message: 'Server error while exporting health profile' });
  }
});

module.exports = router;