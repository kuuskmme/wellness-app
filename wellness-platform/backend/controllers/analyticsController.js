const HealthProfile = require('../models/healthProfileModel');
const analyticsUtils = require('../utils/analyticsUtils');

/**
 * Get BMI calculation
 * @route GET /api/analytics/bmi
 * @access Private
 */
exports.getBMI = async (req, res) => {
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

    // Get latest physical metrics
    if (!healthProfile.physicalMetrics || healthProfile.physicalMetrics.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No physical metrics found to calculate BMI'
      });
    }

    const latestMetrics = healthProfile.physicalMetrics[healthProfile.physicalMetrics.length - 1];
    
    // Check if height and weight are provided
    if (!latestMetrics.height || !latestMetrics.weight) {
      return res.status(400).json({
        success: false,
        message: 'Height and weight are required to calculate BMI'
      });
    }

    // Convert to standard units if needed
    const weightKg = latestMetrics.weight.unit === 'lb' 
      ? latestMetrics.weight.value * 0.453592 
      : latestMetrics.weight.value;
    
    const heightCm = latestMetrics.height.unit === 'in' 
      ? latestMetrics.height.value * 2.54 
      : latestMetrics.height.value;

    // Calculate BMI
    const bmi = analyticsUtils.calculateBMI(weightKg, heightCm);

    res.status(200).json({
      success: true,
      data: {
        bmi: bmi.value,
        category: bmi.category,
        height: {
          value: heightCm,
          unit: 'cm'
        },
        weight: {
          value: weightKg,
          unit: 'kg'
        }
      }
    });
  } catch (error) {
    console.error('BMI calculation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating BMI'
    });
  }
};

/**
 * Get wellness score
 * @route GET /api/analytics/wellness-score
 * @access Private
 */
exports.getWellnessScore = async (req, res) => {
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

    // Calculate wellness score
    const wellnessScore = analyticsUtils.calculateWellnessScore(healthProfile);

    // Save wellness score to health profile
    const now = new Date();
    healthProfile.wellnessScores.push({
      date: now,
      score: wellnessScore.score,
      factors: wellnessScore.factors
    });
    await healthProfile.save();

    res.status(200).json({
      success: true,
      data: {
        score: wellnessScore.score,
        factors: wellnessScore.factors,
        date: now
      }
    });
  } catch (error) {
    console.error('Wellness score calculation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating wellness score'
    });
  }
};

/**
 * Get AI-powered health insights
 * @route GET /api/analytics/insights
 * @access Private
 */
exports.getHealthInsights = async (req, res) => {
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

    // Generate health insights
    const insights = analyticsUtils.generateHealthInsights(healthProfile);

    // Save insights to health profile
    const now = new Date();
    insights.forEach(insight => {
      healthProfile.aiInsights.push({
        date: now,
        category: insight.category,
        insight: insight.insight,
        recommendation: insight.recommendation
      });
    });
    await healthProfile.save();

    res.status(200).json({
      success: true,
      data: insights
    });
  } catch (error) {
    console.error('Health insights error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating health insights'
    });
  }
};

/**
 * Get progress analytics
 * @route GET /api/analytics/progress
 * @access Private
 */
exports.getProgressAnalytics = async (req, res) => {
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
      return res.status(400).json({
        success: false,
        message: 'No physical metrics found for progress analytics'
      });
    }

    // Process fitness goals progress
    const goalsProgress = [];
    for (const goal of healthProfile.fitnessGoals) {
      // If goal has manual progress, use it
      if (goal.progress !== undefined && goal.progress !== null) {
        goalsProgress.push({
          id: goal._id,
          type: goal.type,
          progress: goal.progress,
          status: goal.status
        });
      } else {
        // Calculate progress based on latest metrics
        const calculatedProgress = analyticsUtils.calculateGoalProgress(goal, latestMetrics);
        
        // Update goal progress in database
        goal.progress = calculatedProgress;
        
        // Update status based on progress
        if (calculatedProgress === 0) {
          goal.status = 'not-started';
        } else if (calculatedProgress === 100) {
          goal.status = 'achieved';
        } else {
          goal.status = 'in-progress';
        }
        
        goalsProgress.push({
          id: goal._id,
          type: goal.type,
          progress: calculatedProgress,
          status: goal.status
        });
      }
    }

    // Save updated goals
    await healthProfile.save();

    // Get wellness score history
    const wellnessHistory = healthProfile.wellnessScores.map(score => ({
      date: score.date,
      score: score.score
    }));

    // Get metrics history for weight tracking
    const weightHistory = healthProfile.physicalMetrics
      .filter(metric => metric.weight && metric.weight.value)
      .map(metric => ({
        date: metric.date,
        weight: {
          value: metric.weight.value,
          unit: metric.weight.unit
        }
      }));

    res.status(200).json({
      success: true,
      data: {
        goalsProgress,
        wellnessHistory,
        weightHistory
      }
    });
  } catch (error) {
    console.error('Progress analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating progress analytics'
    });
  }
};

/**
 * Get health trends
 * @route GET /api/analytics/trends
 * @access Private
 */
exports.getHealthTrends = async (req, res) => {
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

    // Get physical metrics history
    if (healthProfile.physicalMetrics.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Not enough data to calculate trends. Please add more physical metrics.'
      });
    }

    // Sort metrics by date
    const sortedMetrics = [...healthProfile.physicalMetrics].sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );

    // Get first and most recent metrics
    const firstMetrics = sortedMetrics[0];
    const latestMetrics = sortedMetrics[sortedMetrics.length - 1];

    // Calculate weight change
    let weightChange = null;
    if (firstMetrics.weight && latestMetrics.weight) {
      // Convert to kg if needed
      const firstWeightKg = firstMetrics.weight.unit === 'lb' 
        ? firstMetrics.weight.value * 0.453592 
        : firstMetrics.weight.value;
      
      const latestWeightKg = latestMetrics.weight.unit === 'lb' 
        ? latestMetrics.weight.value * 0.453592 
        : latestMetrics.weight.value;
      
      weightChange = {
        value: latestWeightKg - firstWeightKg,
        unit: 'kg',
        percentage: ((latestWeightKg - firstWeightKg) / firstWeightKg) * 100
      };
    }

    // Calculate body fat change if available
    let bodyFatChange = null;
    if (firstMetrics.bodyFatPercentage !== undefined && 
        latestMetrics.bodyFatPercentage !== undefined) {
      bodyFatChange = {
        value: latestMetrics.bodyFatPercentage - firstMetrics.bodyFatPercentage,
        unit: 'percentage points'
      };
    }

    // Wellness score trend if available
    let wellnessScoreTrend = null;
    if (healthProfile.wellnessScores.length >= 2) {
      const firstScore = healthProfile.wellnessScores[0].score;
      const latestScore = healthProfile.wellnessScores[healthProfile.wellnessScores.length - 1].score;
      
      wellnessScoreTrend = {
        value: latestScore - firstScore,
        percentage: ((latestScore - firstScore) / firstScore) * 100
      };
    }

    res.status(200).json({
      success: true,
      data: {
        startDate: firstMetrics.date,
        endDate: latestMetrics.date,
        weightChange,
        bodyFatChange,
        wellnessScoreTrend,
        metricsCount: sortedMetrics.length
      }
    });
  } catch (error) {
    console.error('Health trends error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating health trends'
    });
  }
};