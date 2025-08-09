// routes/healthProfile.js - Health profile routes with JWT authentication
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const HealthProfile = require('../models/HealthProfile');
const { verifyToken } = require('../middleware/auth');

// All health profile routes require authentication
router.use(verifyToken);

// Create or update health profile
router.post('/', [
  body('demographics.age').isInt({ min: 1, max: 150 }),
  body('demographics.gender').isIn(['male', 'female', 'other', 'prefer_not_to_say']),
  body('physicalMetrics.height.value').isFloat({ min: 30, max: 300 }),
  body('physicalMetrics.weight.value').isFloat({ min: 1, max: 500 }),
  body('lifestyleIndicators.occupationType').isIn(['sedentary', 'light_activity', 'moderate_activity', 'heavy_activity']),
  body('lifestyleIndicators.activityLevel').isIn(['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extremely_active']),
  body('fitnessGoals.primary').isIn(['weight_loss', 'muscle_gain', 'endurance', 'flexibility', 'general_fitness', 'stress_reduction', 'health_maintenance']),
  body('initialFitnessAssessment.weeklyActivityFrequency').isInt({ min: 0, max: 7 })
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
    res.status(500).json({ 
      message: 'Server error while saving health profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get health profile
router.get('/', async (req, res) => {
  try {
    const profile = await HealthProfile.findOne({ userId: req.userId });
    
    if (!profile) {
      return res.status(404).json({ 
        message: 'Health profile not found. Please create your profile first.' 
      });
    }

    res.json({ profile });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      message: 'Server error while fetching health profile' 
    });
  }
});

// Update specific section of health profile
router.patch('/:section', async (req, res) => {
  try {
    const { section } = req.params;
    const validSections = [
      'demographics', 
      'physicalMetrics', 
      'lifestyleIndicators', 
      'dietaryPreferences',
      'dietaryRestrictions',
      'fitnessGoals',
      'initialFitnessAssessment'
    ];

    if (!validSections.includes(section)) {
      return res.status(400).json({ 
        message: 'Invalid profile section' 
      });
    }

    const profile = await HealthProfile.findOne({ userId: req.userId });
    
    if (!profile) {
      return res.status(404).json({ 
        message: 'Health profile not found' 
      });
    }

    // Update the specific section
    profile[section] = { ...profile[section], ...req.body };
    profile.metadata.lastUpdated = new Date();
    
    await profile.save();

    res.json({
      message: `${section} updated successfully`,
      profile
    });
  } catch (error) {
    console.error('Update section error:', error);
    res.status(500).json({ 
      message: 'Server error while updating profile section' 
    });
  }
});

// Calculate wellness score
router.get('/wellness-score', async (req, res) => {
  try {
    const profile = await HealthProfile.findOne({ userId: req.userId });
    
    if (!profile) {
      return res.status(404).json({ 
        message: 'Health profile not found' 
      });
    }

    // Calculate wellness score components
    const calculateBMIScore = (bmi) => {
      if (!bmi) return 0;
      if (bmi >= 18.5 && bmi <= 24.9) return 100;
      if ((bmi >= 17 && bmi < 18.5) || (bmi >= 25 && bmi <= 26.5)) return 80;
      if ((bmi >= 16 && bmi < 17) || (bmi > 26.5 && bmi <= 28)) return 60;
      if ((bmi >= 15 && bmi < 16) || (bmi > 28 && bmi <= 30)) return 40;
      return 20;
    };

    const calculateActivityScore = (frequency, level) => {
      const levelScores = {
        'sedentary': 0,
        'lightly_active': 25,
        'moderately_active': 50,
        'very_active': 75,
        'extremely_active': 100
      };
      
      const frequencyScore = (frequency / 7) * 100;
      const levelScore = levelScores[level] || 0;
      
      return (frequencyScore * 0.5 + levelScore * 0.5);
    };

    const calculateHabitsScore = (sleep, stress, smoking, alcohol) => {
      let score = 0;
      
      // Sleep score (7-9 hours is optimal)
      if (sleep >= 7 && sleep <= 9) score += 25;
      else if (sleep >= 6 && sleep < 7) score += 15;
      else if (sleep > 9 && sleep <= 10) score += 15;
      else score += 5;
      
      // Stress score (lower is better)
      if (stress) {
        score += Math.max(0, 25 - (stress * 2.5));
      } else {
        score += 12.5; // Default if not provided
      }
      
      // Smoking score
      if (smoking === 'never') score += 25;
      else if (smoking === 'former') score += 15;
      else if (smoking === 'current') score += 0;
      else score += 12.5; // Default
      
      // Alcohol score
      if (alcohol === 'none') score += 25;
      else if (alcohol === 'occasional') score += 20;
      else if (alcohol === 'moderate') score += 10;
      else if (alcohol === 'heavy') score += 0;
      else score += 12.5; // Default
      
      return score;
    };

    const calculateProgressScore = (currentWeight, targetWeight, startWeight) => {
      if (!targetWeight || !currentWeight) return 50; // Default if no target
      
      const totalToLose = Math.abs(startWeight - targetWeight);
      const progressMade = Math.abs(startWeight - currentWeight);
      
      if (totalToLose === 0) return 100;
      
      const percentProgress = (progressMade / totalToLose) * 100;
      return Math.min(100, Math.max(0, percentProgress));
    };

    // Calculate component scores
    const bmiScore = calculateBMIScore(profile.physicalMetrics.bmi?.value);
    const activityScore = calculateActivityScore(
      profile.initialFitnessAssessment?.weeklyActivityFrequency || 0,
      profile.lifestyleIndicators?.activityLevel
    );
    const habitsScore = calculateHabitsScore(
      profile.lifestyleIndicators?.sleepHours,
      profile.lifestyleIndicators?.stressLevel,
      profile.lifestyleIndicators?.smokingStatus,
      profile.lifestyleIndicators?.alcoholConsumption
    );
    const progressScore = calculateProgressScore(
      profile.physicalMetrics?.weight?.normalizedValue,
      profile.fitnessGoals?.targetWeight?.normalizedValue,
      profile.physicalMetrics?.weight?.normalizedValue // Using current as start for now
    );

    // Calculate overall wellness score
    const overallScore = Math.round(
      (bmiScore * 0.3) + 
      (activityScore * 0.3) + 
      (progressScore * 0.2) + 
      (habitsScore * 0.2)
    );

    // Update profile with new scores
    profile.wellnessScore = {
      overall: overallScore,
      components: {
        bmi: Math.round(bmiScore),
        activity: Math.round(activityScore),
        progress: Math.round(progressScore),
        habits: Math.round(habitsScore)
      },
      lastCalculated: new Date()
    };

    await profile.save();

    res.json({
      wellnessScore: profile.wellnessScore,
      recommendations: {
        bmi: bmiScore < 60 ? 'Focus on achieving a healthy BMI through balanced diet and exercise' : 'Great BMI! Maintain your current weight',
        activity: activityScore < 60 ? 'Try to increase your weekly activity frequency' : 'Excellent activity level!',
        habits: habitsScore < 60 ? 'Consider improving sleep quality and reducing stress' : 'Good lifestyle habits!',
        progress: progressScore < 50 ? 'Stay consistent with your goals' : 'Great progress towards your goals!'
      }
    });
  } catch (error) {
    console.error('Wellness score error:', error);
    res.status(500).json({ 
      message: 'Server error while calculating wellness score' 
    });
  }
});

// Export health data
router.get('/export', async (req, res) => {
  try {
    const profile = await HealthProfile.findOne({ userId: req.userId })
      .populate('userId', 'email createdAt');
    
    if (!profile) {
      return res.status(404).json({ 
        message: 'Health profile not found' 
      });
    }

    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="health-profile-${Date.now()}.json"`);
    
    res.json({
      exportDate: new Date().toISOString(),
      user: {
        email: profile.userId.email,
        accountCreated: profile.userId.createdAt
      },
      profile: profile.toObject(),
      metadata: {
        version: '2.0.0',
        platform: 'Numbers-Don\'t-Lie Wellness Platform',
        dataRetentionNotice: 'This data is for personal use only. Handle with care.'
      }
    });
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ 
      message: 'Server error while exporting health profile' 
    });
  }
});

// Delete health profile (GDPR compliance)
router.delete('/', async (req, res) => {
  try {
    const profile = await HealthProfile.findOneAndDelete({ userId: req.userId });
    
    if (!profile) {
      return res.status(404).json({ 
        message: 'Health profile not found' 
      });
    }

    res.json({
      message: 'Health profile deleted successfully',
      deletedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Delete profile error:', error);
    res.status(500).json({ 
      message: 'Server error while deleting health profile' 
    });
  }
});

// Get anonymized profile for AI processing
router.get('/anonymized', async (req, res) => {
  try {
    const profile = await HealthProfile.findOne({ userId: req.userId });
    
    if (!profile) {
      return res.status(404).json({ 
        message: 'Health profile not found' 
      });
    }

    // Remove PII for AI processing
    const anonymized = profile.anonymizeForAI();

    res.json({
      anonymizedProfile: anonymized,
      purpose: 'AI processing',
      notice: 'This data has been anonymized for privacy protection'
    });
  } catch (error) {
    console.error('Anonymization error:', error);
    res.status(500).json({ 
      message: 'Server error while anonymizing profile' 
    });
  }
});

module.exports = router;