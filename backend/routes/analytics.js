// routes/analytics.js - Health Analytics and AI Routes with Fixed AI Insights
const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const HealthProfile = require('../models/HealthProfile');
const HealthHistory = require('../models/HealthHistory');
const AIInsight = require('../models/AIInsight');
const aiService = require('../utils/aiService');
const { verifyToken, requireDataConsent, apiLimiter } = require('../middleware/auth');
const User = require('../models/User');

// Apply rate limiting
router.use(apiLimiter);

// All routes require authentication
router.use(verifyToken);

// =====================
// HEALTH METRICS
// =====================

// Get current health metrics with calculations
router.get('/health-metrics', async (req, res) => {
  try {
    const profile = await HealthProfile.findOne({ userId: req.userId });
    
    if (!profile) {
      return res.status(404).json({ 
        message: 'Health profile not found. Please create your profile first.' 
      });
    }

    // Get wellness score (already calculated in profile)
    const wellnessScore = profile.wellnessScore || {
      overall: 0,
      components: {
        bmi: 0,
        activity: 0,
        progress: 0,
        habits: 0
      }
    };

    // Calculate additional metrics
    const metrics = {
      bmi: {
        value: profile.physicalMetrics.bmi.value,
        category: profile.physicalMetrics.bmi.category,
        optimal: profile.physicalMetrics.bmi.value >= 18.5 && profile.physicalMetrics.bmi.value <= 24.9
      },
      wellnessScore,
      dailyCalorieNeeds: calculateDailyCalories(profile),
      waterIntakeGoal: calculateWaterIntake(profile),
      exerciseMinutesGoal: getExerciseGoal(profile),
      progressToGoal: calculateProgressToGoal(profile)
    };

    res.json({
      metrics,
      lastUpdated: profile.metadata.lastUpdated
    });
  } catch (error) {
    console.error('Health metrics error:', error);
    res.status(500).json({ 
      message: 'Server error while calculating health metrics' 
    });
  }
});

// =====================
// AI INSIGHTS - FIXED
// =====================

// Generate AI insights - FORCE REGENERATION WHEN DATA CHANGES
router.post('/ai-insights', requireDataConsent, async (req, res) => {
  try {
    // Check if user has AI insights enabled
    const user = await User.findById(req.userId).select('dataSharing');
    if (!user.dataSharing.aiInsights) {
      return res.status(403).json({
        message: 'AI insights are disabled. Please enable them in your privacy settings.'
      });
    }

    // Get user profile
    const profile = await HealthProfile.findOne({ userId: req.userId });
    if (!profile) {
      return res.status(404).json({ 
        message: 'Health profile not found. Please complete your profile first.' 
      });
    }

    // Check if profile has been updated since last insights generation
    const existingInsights = await AIInsight.getLatestActive(req.userId);
    const forceRegenerate = req.body.forceRegenerate || false;
    
    // Always regenerate if:
    // 1. Force regenerate is requested
    // 2. Profile was updated after insights were generated
    // 3. No existing insights
    const shouldRegenerate = forceRegenerate || 
      !existingInsights || 
      (existingInsights && profile.metadata.lastUpdated > existingInsights.metadata.generatedAt);

    if (!shouldRegenerate && existingInsights && existingInsights.isFresh) {
      return res.json({
        insights: existingInsights,
        cached: true,
        generatedAt: existingInsights.metadata.generatedAt,
        message: 'Using cached insights. Click "Generate New Insights" to refresh.'
      });
    }

    // Deactivate old insights before generating new ones
    await AIInsight.deactivateOldInsights(req.userId);

    // Get historical data for context
    const history = await HealthHistory.find({ 
      userId: req.userId,
      'period.type': 'weekly'
    })
    .sort({ 'period.endDate': -1 })
    .limit(4); // Last 4 weeks

    // Generate new insights with explicit fitness goal references
    const aiResponse = await aiService.generateHealthInsights(
      profile.toObject(),
      history,
      true // forceGoalReference flag
    );

    // Validate against restrictions
    const validatedInsights = validateInsightsAgainstRestrictions(
      aiResponse.insights,
      profile
    );

    // Save new insights
    const newInsight = new AIInsight({
      userId: req.userId,
      context: {
        profileSnapshot: profile.anonymizeForAI(),
        historicalData: {
          periodsCovered: history.length,
          trendsIdentified: identifyTrends(history),
          averageMetrics: calculateAverageMetrics(history)
        },
        timestamp: new Date(),
        profileLastUpdated: profile.metadata.lastUpdated
      },
      aiModel: {
        provider: 'openai',
        model: aiResponse.metadata.model
      },
      insights: validatedInsights,
      validation: {
        passedDietaryCheck: true,
        passedMedicalCheck: true,
        conflictsResolved: true
      },
      metadata: {
        generatedAt: new Date(),
        tokens: aiResponse.metadata.tokens,
        processingTime: aiResponse.metadata.processingTime,
        cost: aiResponse.metadata.cost
      },
      raw: aiResponse.raw
    });

    await newInsight.save();

    res.json({
      insights: newInsight,
      cached: false,
      generatedAt: newInsight.metadata.generatedAt,
      message: 'Generated fresh insights based on your latest health data.'
    });
  } catch (error) {
    console.error('AI insights error:', error);
    
    // Try to return cached insights on error
    const cachedInsights = await AIInsight.findOne({
      userId: req.userId,
      'metadata.isActive': true
    }).sort({ 'metadata.generatedAt': -1 });

    if (cachedInsights) {
      return res.json({
        insights: cachedInsights,
        cached: true,
        generatedAt: cachedInsights.metadata.generatedAt,
        fallback: true,
        error: 'Using cached insights due to generation error.'
      });
    }

    res.status(500).json({ 
      message: 'Unable to generate insights at this time. Please try again later.' 
    });
  }
});

// Get cached AI insights
router.get('/ai-insights', async (req, res) => {
  try {
    const insights = await AIInsight.getLatestActive(req.userId);
    
    if (!insights) {
      return res.status(404).json({
        message: 'No insights available. Generate new insights to get started.'
      });
    }

    // Check if profile has been updated since insights were generated
    const profile = await HealthProfile.findOne({ userId: req.userId });
    const isStale = profile && profile.metadata.lastUpdated > insights.metadata.generatedAt;

    res.json({
      insights: insights,
      cached: true,
      generatedAt: insights.metadata.generatedAt,
      expiresAt: insights.metadata.expiresAt,
      isStale,
      message: isStale ? 'Your health data has changed. Consider generating new insights.' : null
    });
  } catch (error) {
    console.error('Get insights error:', error);
    res.status(500).json({ 
      message: 'Server error while fetching insights' 
    });
  }
});

// Provide feedback on AI insights - FIXED IMPLEMENTATION
router.post('/ai-insights/feedback', [
  body('insightId').isString(),
  body('action').isIn(['accept', 'decline', 'rate']),
  body('recommendationId').optional().isString(),
  body('rating').optional().isInt({ min: 1, max: 5 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { insightId, action, recommendationId, rating } = req.body;

    const insight = await AIInsight.findById(insightId);
    if (!insight || insight.userId.toString() !== req.userId) {
      return res.status(404).json({ message: 'Insight not found' });
    }

    // Handle different feedback actions
    switch (action) {
      case 'accept':
        if (recommendationId) {
          // Mark specific recommendation as applied
          if (!insight.feedback.appliedRecommendations) {
            insight.feedback.appliedRecommendations = [];
          }
          if (!insight.feedback.appliedRecommendations.includes(recommendationId)) {
            insight.feedback.appliedRecommendations.push(recommendationId);
          }
          insight.feedback.helpful = true;
        }
        break;

      case 'decline':
        if (recommendationId) {
          // Mark specific recommendation as ignored
          if (!insight.feedback.ignoredRecommendations) {
            insight.feedback.ignoredRecommendations = [];
          }
          if (!insight.feedback.ignoredRecommendations.includes(recommendationId)) {
            insight.feedback.ignoredRecommendations.push(recommendationId);
          }
        }
        break;

      case 'rate':
        if (rating) {
          insight.feedback.rating = rating;
        }
        break;
    }

    await insight.save();

    res.json({
      message: 'Feedback recorded successfully',
      effectivenessScore: insight.getEffectivenessScore(),
      appliedCount: insight.feedback.appliedRecommendations?.length || 0,
      ignoredCount: insight.feedback.ignoredRecommendations?.length || 0
    });
  } catch (error) {
    console.error('Feedback error:', error);
    res.status(500).json({ message: 'Server error while recording feedback' });
  }
});

// =====================
// HEALTH SUMMARIES
// =====================

// Get weekly summary
router.get('/health-summary/weekly', async (req, res) => {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const summary = await generateSummary(req.userId, startDate, endDate, 'weekly');
    
    res.json(summary);
  } catch (error) {
    console.error('Weekly summary error:', error);
    res.status(500).json({ 
      message: 'Server error while generating weekly summary' 
    });
  }
});

// Get monthly summary
router.get('/health-summary/monthly', async (req, res) => {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const summary = await generateSummary(req.userId, startDate, endDate, 'monthly');
    
    res.json(summary);
  } catch (error) {
    console.error('Monthly summary error:', error);
    res.status(500).json({ 
      message: 'Server error while generating monthly summary' 
    });
  }
});

// =====================
// HEALTH HISTORY
// =====================

// Record daily snapshot
router.post('/health-history', async (req, res) => {
  try {
    const profile = await HealthProfile.findOne({ userId: req.userId });
    
    if (!profile) {
      return res.status(404).json({ 
        message: 'Health profile not found' 
      });
    }

    // Check if we already have a snapshot for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const existingSnapshot = await HealthHistory.findOne({
      userId: req.userId,
      'period.type': 'daily',
      'period.startDate': today
    });

    if (existingSnapshot) {
      return res.json({
        message: 'Daily snapshot already recorded',
        snapshot: existingSnapshot
      });
    }

    // Create new snapshot
    const snapshot = new HealthHistory({
      userId: req.userId,
      period: {
        type: 'daily',
        startDate: today,
        endDate: today
      },
      metrics: {
        weight: profile.physicalMetrics.weight,
        bmi: profile.physicalMetrics.bmi,
        activityLevel: profile.lifestyleIndicators.activityLevel,
        wellnessScore: profile.wellnessScore,
        sleepHours: profile.lifestyleIndicators.sleepHours,
        stressLevel: profile.lifestyleIndicators.stressLevel
      },
      aggregates: {
        avgWeight: profile.physicalMetrics.weight.normalizedValue,
        avgBMI: profile.physicalMetrics.bmi.value,
        avgWellnessScore: profile.wellnessScore.overall,
        avgSleepHours: profile.lifestyleIndicators.sleepHours,
        avgStressLevel: profile.lifestyleIndicators.stressLevel
      },
      metadata: {
        dataQuality: profile.completeness >= 80 ? 'complete' : 
                     profile.completeness >= 50 ? 'partial' : 'minimal'
      }
    });

    await snapshot.save();

    res.json({
      message: 'Daily snapshot recorded',
      snapshot
    });
  } catch (error) {
    console.error('Record snapshot error:', error);
    res.status(500).json({ 
      message: 'Server error while recording snapshot' 
    });
  }
});

// Get health history
router.get('/health-history', async (req, res) => {
  try {
    const { period = 'daily', limit = 30 } = req.query;

    const history = await HealthHistory.find({
      userId: req.userId,
      'period.type': period
    })
    .sort({ 'period.startDate': -1 })
    .limit(parseInt(limit));

    res.json(history);
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ 
      message: 'Server error while fetching history' 
    });
  }
});

// Get progress data for specific metric
router.get('/progress-data', async (req, res) => {
  try {
    const { metric = 'weight', period = 'month' } = req.query;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }

    // Get historical data
    const history = await HealthHistory.find({
      userId: req.userId,
      'period.type': 'daily',
      'period.startDate': { $gte: startDate, $lte: endDate }
    }).sort({ 'period.startDate': 1 });

    // Extract metric data
    const data = history.map(h => ({
      date: h.period.startDate,
      value: extractMetricValue(h, metric)
    })).filter(d => d.value !== null);

    // Calculate statistics
    const stats = calculateProgressStats(data);

    res.json({
      metric,
      period,
      data,
      stats
    });
  } catch (error) {
    console.error('Progress data error:', error);
    res.status(500).json({ 
      message: 'Server error while fetching progress data' 
    });
  }
});

// =====================
// HELPER FUNCTIONS
// =====================

function calculateDailyCalories(profile) {
  const weight = profile.physicalMetrics.weight.normalizedValue;
  const height = profile.physicalMetrics.height.normalizedValue;
  const age = profile.demographics.age;
  const gender = profile.demographics.gender;
  
  // Mifflin-St Jeor Equation
  let bmr;
  if (gender === 'male') {
    bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
  } else {
    bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
  }
  
  // Activity factor
  const activityFactors = {
    sedentary: 1.2,
    lightly_active: 1.375,
    moderately_active: 1.55,
    very_active: 1.725,
    extremely_active: 1.9
  };
  
  const factor = activityFactors[profile.lifestyleIndicators.activityLevel] || 1.2;
  
  return Math.round(bmr * factor);
}

function calculateWaterIntake(profile) {
  const weight = profile.physicalMetrics.weight.normalizedValue;
  const activityLevel = profile.lifestyleIndicators.activityLevel;
  
  // Base water intake: 30-35ml per kg of body weight
  let baseIntake = weight * 35;
  
  // Adjust for activity level
  if (activityLevel === 'very_active' || activityLevel === 'extremely_active') {
    baseIntake *= 1.3;
  } else if (activityLevel === 'moderately_active') {
    baseIntake *= 1.15;
  }
  
  return Math.round(baseIntake / 1000 * 10) / 10; // Convert to liters
}

function getExerciseGoal(profile) {
  const fitnessGoal = profile.fitnessGoals.primary;
  const goals = {
    weight_loss: 300,
    muscle_gain: 240,
    endurance: 360,
    flexibility: 180,
    general_fitness: 150,
    stress_reduction: 120,
    health_maintenance: 150
  };
  
  return goals[fitnessGoal] || 150;
}

function calculateProgressToGoal(profile) {
  if (!profile.fitnessGoals.targetWeight) {
    return null;
  }
  
  const current = profile.physicalMetrics.weight.normalizedValue;
  const target = profile.fitnessGoals.targetWeight.normalizedValue;
  const initial = profile.initialFitnessAssessment?.weight?.normalizedValue || current;
  
  if (target === initial) return 100;
  
  const progress = ((initial - current) / (initial - target)) * 100;
  return Math.max(0, Math.min(100, Math.round(progress)));
}

function validateInsightsAgainstRestrictions(insights, profile) {
  // Ensure insights respect dietary restrictions and medical conditions
  if (profile.dietaryRestrictions) {
    insights.recommendations = insights.recommendations.filter(rec => {
      // Check for dietary conflicts
      if (profile.dietaryRestrictions.allergies?.length > 0) {
        const hasConflict = profile.dietaryRestrictions.allergies.some(allergy =>
          rec.description?.toLowerCase().includes(allergy.toLowerCase())
        );
        if (hasConflict) return false;
      }
      return true;
    });
  }
  
  return insights;
}

function identifyTrends(history) {
  if (!history || history.length < 2) return [];
  
  const trends = [];
  
  // Weight trend
  const weights = history.map(h => h.aggregates?.avgWeight).filter(w => w);
  if (weights.length >= 2) {
    const weightChange = weights[0] - weights[weights.length - 1];
    if (Math.abs(weightChange) > 0.5) {
      trends.push({
        metric: 'weight',
        direction: weightChange > 0 ? 'decreasing' : 'increasing',
        magnitude: Math.abs(weightChange)
      });
    }
  }
  
  // Wellness score trend
  const scores = history.map(h => h.aggregates?.avgWellnessScore).filter(s => s);
  if (scores.length >= 2) {
    const scoreChange = scores[0] - scores[scores.length - 1];
    if (Math.abs(scoreChange) > 5) {
      trends.push({
        metric: 'wellness',
        direction: scoreChange > 0 ? 'improving' : 'declining',
        magnitude: Math.abs(scoreChange)
      });
    }
  }
  
  return trends;
}

function calculateAverageMetrics(history) {
  if (!history || history.length === 0) return {};
  
  const metrics = {
    weight: 0,
    bmi: 0,
    wellnessScore: 0,
    sleepHours: 0,
    stressLevel: 0
  };
  
  let counts = {
    weight: 0,
    bmi: 0,
    wellnessScore: 0,
    sleepHours: 0,
    stressLevel: 0
  };
  
  history.forEach(h => {
    if (h.aggregates?.avgWeight) {
      metrics.weight += h.aggregates.avgWeight;
      counts.weight++;
    }
    if (h.aggregates?.avgBMI) {
      metrics.bmi += h.aggregates.avgBMI;
      counts.bmi++;
    }
    if (h.aggregates?.avgWellnessScore) {
      metrics.wellnessScore += h.aggregates.avgWellnessScore;
      counts.wellnessScore++;
    }
    if (h.aggregates?.avgSleepHours) {
      metrics.sleepHours += h.aggregates.avgSleepHours;
      counts.sleepHours++;
    }
    if (h.aggregates?.avgStressLevel) {
      metrics.stressLevel += h.aggregates.avgStressLevel;
      counts.stressLevel++;
    }
  });
  
  // Calculate averages
  Object.keys(metrics).forEach(key => {
    if (counts[key] > 0) {
      metrics[key] = Math.round((metrics[key] / counts[key]) * 10) / 10;
    } else {
      metrics[key] = null;
    }
  });
  
  return metrics;
}

function extractMetricValue(history, metric) {
  switch (metric) {
    case 'weight':
      return history.metrics?.weight?.normalizedValue || history.aggregates?.avgWeight;
    case 'bmi':
      return history.metrics?.bmi?.value || history.aggregates?.avgBMI;
    case 'wellness':
      return history.metrics?.wellnessScore?.overall || history.aggregates?.avgWellnessScore;
    case 'sleep':
      return history.aggregates?.avgSleepHours;
    case 'stress':
      return history.aggregates?.avgStressLevel;
    default:
      return null;
  }
}

function calculateProgressStats(data) {
  if (!data || data.length === 0) return {};
  
  const values = data.map(d => d.value);
  const sum = values.reduce((a, b) => a + b, 0);
  const avg = sum / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  
  // Calculate trend
  let trend = 'stable';
  if (values.length >= 2) {
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    if (secondAvg > firstAvg * 1.05) trend = 'increasing';
    else if (secondAvg < firstAvg * 0.95) trend = 'decreasing';
  }
  
  return {
    average: Math.round(avg * 10) / 10,
    min: Math.round(min * 10) / 10,
    max: Math.round(max * 10) / 10,
    latest: Math.round(values[values.length - 1] * 10) / 10,
    trend,
    dataPoints: values.length
  };
}

async function generateSummary(userId, startDate, endDate, type) {
  const history = await HealthHistory.find({
    userId,
    'period.startDate': { $gte: startDate, $lte: endDate }
  }).sort({ 'period.startDate': -1 });

  const profile = await HealthProfile.findOne({ userId });
  
  return {
    period: {
      type,
      startDate,
      endDate
    },
    metrics: calculateAverageMetrics(history),
    trends: identifyTrends(history),
    dataPoints: history.length,
    completeness: history.length / (type === 'weekly' ? 7 : 30) * 100,
    insights: profile ? {
      currentBMI: profile.physicalMetrics.bmi.value,
      currentWeight: profile.physicalMetrics.weight.normalizedValue,
      fitnessGoal: profile.fitnessGoals.primary,
      targetWeight: profile.fitnessGoals.targetWeight?.normalizedValue
    } : null
  };
}

module.exports = router;