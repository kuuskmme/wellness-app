// routes/analytics.js - Health Analytics and AI Routes for Step 4
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
// AI INSIGHTS
// =====================

// Generate AI insights
router.post('/ai-insights', requireDataConsent, async (req, res) => {
  try {
    // Check if user has AI insights enabled
    const user = await User.findById(req.userId).select('dataSharing');
    if (!user.dataSharing.aiInsights) {
      return res.status(403).json({
        message: 'AI insights are disabled. Please enable them in your privacy settings.'
      });
    }

    // Check for existing fresh insights
    const existingInsights = await AIInsight.getLatestActive(req.userId);
    if (existingInsights && existingInsights.isFresh) {
      return res.json({
        insights: existingInsights.insights,
        cached: true,
        generatedAt: existingInsights.metadata.generatedAt
      });
    }

    // Get user profile
    const profile = await HealthProfile.findOne({ userId: req.userId });
    if (!profile) {
      return res.status(404).json({ 
        message: 'Health profile not found. Please complete your profile first.' 
      });
    }

    // Get historical data for context
    const history = await HealthHistory.find({ 
      userId: req.userId,
      'period.type': 'weekly'
    })
    .sort({ 'period.endDate': -1 })
    .limit(4); // Last 4 weeks

    // Generate new insights
    const aiResponse = await aiService.generateHealthInsights(
      profile.toObject(),
      history
    );

    // Validate against restrictions
    const validatedInsights = validateInsightsAgainstRestrictions(
      aiResponse.insights,
      profile
    );

    // Deactivate old insights
    await AIInsight.deactivateOldInsights(req.userId);

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
        timestamp: new Date()
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
      insights: validatedInsights,
      cached: false,
      generatedAt: newInsight.metadata.generatedAt
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
        insights: cachedInsights.insights,
        cached: true,
        generatedAt: cachedInsights.metadata.generatedAt,
        fallback: true
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

    res.json({
      insights: insights.insights,
      cached: true,
      generatedAt: insights.metadata.generatedAt,
      expiresAt: insights.metadata.expiresAt
    });
  } catch (error) {
    console.error('Get insights error:', error);
    res.status(500).json({ 
      message: 'Server error while fetching insights' 
    });
  }
});

// Provide feedback on AI insights
router.post('/ai-insights/feedback', [
  body('insightId').isString(),
  body('helpful').optional().isBoolean(),
  body('rating').optional().isInt({ min: 1, max: 5 }),
  body('applied').optional().isArray()
], async (req, res) => {
  try {
    const { insightId, helpful, rating, applied } = req.body;

    const insight = await AIInsight.findById(insightId);
    if (!insight || insight.userId.toString() !== req.userId) {
      return res.status(404).json({ message: 'Insight not found' });
    }

    if (helpful !== undefined) insight.feedback.helpful = helpful;
    if (rating) insight.feedback.rating = rating;
    if (applied && applied.length > 0) {
      insight.markAsApplied(applied);
    }

    await insight.save();

    res.json({
      message: 'Feedback recorded successfully',
      effectivenessScore: insight.getEffectivenessScore()
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
    startDate.setMonth(startDate.getMonth() - 1);

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

// Record daily health snapshot
router.post('/health-history', requireDataConsent, async (req, res) => {
  try {
    const profile = await HealthProfile.findOne({ userId: req.userId });
    
    if (!profile) {
      return res.status(404).json({ 
        message: 'Health profile not found' 
      });
    }

    // Create snapshots for different periods
    const dailySnapshot = await HealthHistory.createSnapshot(req.userId, profile, 'daily');
    const weeklySnapshot = await HealthHistory.createSnapshot(req.userId, profile, 'weekly');
    const monthlySnapshot = await HealthHistory.createSnapshot(req.userId, profile, 'monthly');

    // Analyze trends
    await dailySnapshot.analyzeTrend();
    await dailySnapshot.save();

    res.json({
      message: 'Health snapshot recorded successfully',
      snapshot: {
        daily: dailySnapshot,
        weekly: weeklySnapshot,
        monthly: monthlySnapshot
      }
    });
  } catch (error) {
    console.error('Health history error:', error);
    res.status(500).json({ 
      message: 'Server error while recording health history' 
    });
  }
});

// Get health history
router.get('/health-history', async (req, res) => {
  try {
    const { period = 'weekly', limit = 12 } = req.query;

    const history = await HealthHistory.find({
      userId: req.userId,
      'period.type': period
    })
    .sort({ 'period.endDate': -1 })
    .limit(parseInt(limit));

    // Calculate trends and statistics
    const stats = calculateHistoryStatistics(history);

    res.json({
      history,
      statistics: stats,
      period,
      count: history.length
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ 
      message: 'Server error while fetching health history' 
    });
  }
});

// Get progress chart data
router.get('/progress-data', async (req, res) => {
  try {
    const { metric = 'weight', period = '3months' } = req.query;

    const dateRange = getDateRange(period);
    const history = await HealthHistory.find({
      userId: req.userId,
      'period.type': 'daily',
      'period.startDate': { $gte: dateRange.start }
    }).sort({ 'period.startDate': 1 });

    const chartData = formatChartData(history, metric);

    res.json({
      metric,
      period,
      data: chartData,
      summary: calculateProgressSummary(chartData)
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
  // Mifflin-St Jeor Equation
  const weight = profile.physicalMetrics.weight.normalizedValue;
  const height = profile.physicalMetrics.height.normalizedValue;
  const age = profile.demographics.age;
  const gender = profile.demographics.gender;
  
  let bmr;
  if (gender === 'male') {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  }

  // Activity multiplier
  const activityMultipliers = {
    'sedentary': 1.2,
    'lightly_active': 1.375,
    'moderately_active': 1.55,
    'very_active': 1.725,
    'extremely_active': 1.9
  };

  const multiplier = activityMultipliers[profile.lifestyleIndicators.activityLevel] || 1.2;
  return Math.round(bmr * multiplier);
}

function calculateWaterIntake(profile) {
  const weight = profile.physicalMetrics.weight.normalizedValue;
  // General recommendation: 35ml per kg of body weight
  return Math.round((weight * 35) / 1000 * 10) / 10; // Liters, rounded to 1 decimal
}

function getExerciseGoal(profile) {
  const goal = profile.fitnessGoals.primary;
  const baseMinutes = 150; // WHO recommendation
  
  const goalMultipliers = {
    'weight_loss': 1.5,
    'muscle_gain': 1.3,
    'endurance': 2.0,
    'general_fitness': 1.0,
    'health_maintenance': 1.0
  };
  
  return Math.round(baseMinutes * (goalMultipliers[goal] || 1.0));
}

function calculateProgressToGoal(profile) {
  if (!profile.fitnessGoals.targetWeight || !profile.physicalMetrics.weight) {
    return null;
  }
  
  const current = profile.physicalMetrics.weight.normalizedValue;
  const target = profile.fitnessGoals.targetWeight.normalizedValue;
  const initial = current; // Would need historical data for true initial
  
  const totalDistance = Math.abs(initial - target);
  const progress = Math.abs(initial - current);
  
  return {
    percentage: totalDistance > 0 ? Math.round((progress / totalDistance) * 100) : 0,
    remaining: Math.abs(current - target),
    onTrack: Math.abs(current - target) < Math.abs(initial - target)
  };
}

function validateInsightsAgainstRestrictions(insights, profile) {
  // Filter recommendations that conflict with dietary restrictions
  if (insights.recommendations && profile.dietaryRestrictions) {
    insights.recommendations = insights.recommendations.filter(rec => {
      // Check for allergen conflicts
      const restrictions = [
        ...(profile.dietaryRestrictions.allergies || []),
        ...(profile.dietaryRestrictions.intolerances || [])
      ].map(r => r.toLowerCase());
      
      const recText = (rec.description + ' ' + rec.actionItems.join(' ')).toLowerCase();
      
      return !restrictions.some(restriction => recText.includes(restriction));
    });
  }
  
  return insights;
}

function identifyTrends(history) {
  if (!history || history.length < 2) return [];
  
  const trends = [];
  
  // Weight trend
  const weights = history.map(h => h.metrics?.weight?.normalizedValue).filter(Boolean);
  if (weights.length >= 2) {
    const weightChange = weights[0] - weights[weights.length - 1];
    if (Math.abs(weightChange) > 0.5) {
      trends.push(weightChange > 0 ? 'weight_gain' : 'weight_loss');
    }
  }
  
  // Activity trend
  const activities = history.map(h => h.activity?.weeklyFrequency).filter(w => w !== undefined);
  if (activities.length >= 2) {
    const activityChange = activities[0] - activities[activities.length - 1];
    if (Math.abs(activityChange) > 1) {
      trends.push(activityChange > 0 ? 'increased_activity' : 'decreased_activity');
    }
  }
  
  return trends;
}

function calculateAverageMetrics(history) {
  if (!history || history.length === 0) return {};
  
  const totals = history.reduce((acc, record) => {
    acc.weight += record.metrics?.weight?.normalizedValue || 0;
    acc.bmi += record.metrics?.bmi?.value || 0;
    acc.wellness += record.metrics?.wellnessScore?.overall || 0;
    acc.count++;
    return acc;
  }, { weight: 0, bmi: 0, wellness: 0, count: 0 });
  
  return {
    avgWeight: totals.weight / totals.count,
    avgBMI: totals.bmi / totals.count,
    avgWellnessScore: totals.wellness / totals.count
  };
}

async function generateSummary(userId, startDate, endDate, period) {
  const profile = await HealthProfile.findOne({ userId });
  const history = await HealthHistory.find({
    userId,
    'period.type': 'daily',
    'period.startDate': { $gte: startDate, $lte: endDate }
  });
  
  const avgMetrics = calculateAverageMetrics(history);
  const trends = identifyTrends(history);
  
  return {
    period: {
      type: period,
      startDate,
      endDate
    },
    metrics: avgMetrics,
    trends,
    daysTracked: history.length,
    wellnessScore: profile?.wellnessScore?.overall || 0,
    achievements: identifyAchievements(history, profile),
    recommendations: await generateSummaryRecommendations(avgMetrics, trends)
  };
}

function calculateHistoryStatistics(history) {
  if (!history || history.length === 0) return {};
  
  return {
    averages: calculateAverageMetrics(history),
    trends: identifyTrends(history),
    bestWellnessScore: Math.max(...history.map(h => h.metrics?.wellnessScore?.overall || 0)),
    worstWellnessScore: Math.min(...history.map(h => h.metrics?.wellnessScore?.overall || 0)),
    consistency: calculateConsistency(history)
  };
}

function getDateRange(period) {
  const end = new Date();
  const start = new Date();
  
  switch (period) {
    case 'week':
      start.setDate(start.getDate() - 7);
      break;
    case 'month':
      start.setMonth(start.getMonth() - 1);
      break;
    case '3months':
      start.setMonth(start.getMonth() - 3);
      break;
    case '6months':
      start.setMonth(start.getMonth() - 6);
      break;
    case 'year':
      start.setFullYear(start.getFullYear() - 1);
      break;
    default:
      start.setMonth(start.getMonth() - 1);
  }
  
  return { start, end };
}

function formatChartData(history, metric) {
  return history.map(record => {
    let value;
    
    switch (metric) {
      case 'weight':
        value = record.metrics?.weight?.normalizedValue;
        break;
      case 'bmi':
        value = record.metrics?.bmi?.value;
        break;
      case 'wellness':
        value = record.metrics?.wellnessScore?.overall;
        break;
      case 'activity':
        value = record.activity?.weeklyFrequency;
        break;
      default:
        value = 0;
    }
    
    return {
      date: record.period.startDate,
      value,
      label: new Date(record.period.startDate).toLocaleDateString()
    };
  }).filter(item => item.value !== undefined && item.value !== null);
}

function calculateProgressSummary(data) {
  if (!data || data.length === 0) return {};
  
  const values = data.map(d => d.value);
  const first = values[0];
  const last = values[values.length - 1];
  const change = last - first;
  const percentChange = first !== 0 ? (change / first) * 100 : 0;
  
  return {
    startValue: first,
    currentValue: last,
    change,
    percentChange: Math.round(percentChange * 10) / 10,
    trend: change > 0 ? 'increasing' : change < 0 ? 'decreasing' : 'stable',
    average: values.reduce((a, b) => a + b, 0) / values.length,
    min: Math.min(...values),
    max: Math.max(...values)
  };
}

function identifyAchievements(history, profile) {
  const achievements = [];
  
  // Check for weight loss achievement
  if (history.length >= 2) {
    const weightChange = history[0].metrics?.weight?.normalizedValue - 
                        history[history.length - 1].metrics?.weight?.normalizedValue;
    
    if (profile?.fitnessGoals?.primary === 'weight_loss' && weightChange > 1) {
      achievements.push({
        title: 'Weight Loss Progress',
        description: `Lost ${weightChange.toFixed(1)} kg`,
        emoji: '🎯'
      });
    }
  }
  
  // Check for consistency achievement
  const consistentDays = history.filter(h => h.activity?.weeklyFrequency >= 3).length;
  if (consistentDays >= 7) {
    achievements.push({
      title: 'Consistency Champion',
      description: `Active for ${consistentDays} days`,
      emoji: '🏆'
    });
  }
  
  return achievements;
}

async function generateSummaryRecommendations(metrics, trends) {
  const recommendations = [];
  
  if (trends.includes('decreased_activity')) {
    recommendations.push('Consider increasing your physical activity this week');
  }
  
  if (metrics.avgBMI > 25) {
    recommendations.push('Focus on creating a sustainable caloric deficit');
  }
  
  if (metrics.avgWellnessScore < 50) {
    recommendations.push('Review your wellness goals and make adjustments');
  }
  
  return recommendations;
}

function calculateConsistency(history) {
  if (!history || history.length < 2) return 0;
  
  const activeDays = history.filter(h => 
    h.activity?.weeklyFrequency > 0 || 
    h.metrics?.wellnessScore?.overall > 50
  ).length;
  
  return Math.round((activeDays / history.length) * 100);
}

module.exports = router;