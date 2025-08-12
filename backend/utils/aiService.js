// backend/utils/aiService.js - Complete AI Service with Fitness Goals Integration
const axios = require('axios');

class AIService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.apiUrl = 'https://api.openai.com/v1/chat/completions';
    this.model = process.env.AI_MODEL || 'gpt-3.5-turbo';
    this.maxRetries = 3;
    this.retryDelay = 1000; // ms
  }

  // Generate health insights based on profile data
  async generateHealthInsights(profileData, historicalData = null) {
    try {
      const prompt = this.constructHealthPrompt(profileData, historicalData);
      
      const startTime = Date.now();
      const response = await this.makeAPICall(prompt);
      const processingTime = Date.now() - startTime;

      if (!response || !response.choices || response.choices.length === 0) {
        throw new Error('Invalid API response structure');
      }

      const content = response.choices[0].message.content;
      const insights = this.parseAIResponse(content);

      return {
        insights,
        metadata: {
          model: this.model,
          processingTime,
          tokens: response.usage,
          cost: this.calculateCost(response.usage)
        },
        raw: {
          prompt,
          response: content
        }
      };
    } catch (error) {
      console.error('AI Service Error:', error);
      
      // Return cached or default insights if API fails
      return this.getFallbackInsights(profileData);
    }
  }

  // Construct a detailed prompt for health insights WITH FITNESS GOALS
  constructHealthPrompt(profile, history) {
    const primaryGoal = profile.fitnessGoals?.primary || 'general wellness';
    
    const systemPrompt = `You are a professional health and wellness advisor. 
    CRITICAL REQUIREMENT: You MUST explicitly reference and align ALL recommendations with the user's stated PRIMARY FITNESS GOAL.
    The user's PRIMARY GOAL is: "${primaryGoal}"
    
    EVERY recommendation must:
    1. Explicitly mention how it helps achieve "${primaryGoal}"
    2. Be tailored specifically for "${primaryGoal}"
    3. Include the goal name "${primaryGoal}" in the recommendation text
    
    Be specific, evidence-based, and considerate of the user's dietary restrictions and preferences. 
    Always prioritize safety and recommend consulting healthcare professionals for medical concerns.
    
    Format your response as JSON with the following structure:
    {
      "recommendations": [array of recommendation objects that MUST reference "${primaryGoal}"],
      "warnings": [array of warning objects],
      "achievements": [array of achievement objects related to "${primaryGoal}"],
      "motivation": { quote, tip, challenge - all related to "${primaryGoal}" },
      "summary": { overview, keyPoints, progressAssessment, nextSteps - all focused on "${primaryGoal}" }
    }`;

    const userContext = `
    User Profile:
    - Age: ${profile.demographics?.age || 'Not specified'}
    - Gender: ${profile.demographics?.gender || 'Not specified'}
    - Current Weight: ${profile.physicalMetrics?.weight?.value || 0} ${profile.physicalMetrics?.weight?.unit || 'kg'}
    - Height: ${profile.physicalMetrics?.height?.value || 0} ${profile.physicalMetrics?.height?.unit || 'cm'}
    - BMI: ${profile.physicalMetrics?.bmi?.value || 0} (${profile.physicalMetrics?.bmi?.category || 'Unknown'})
    - Activity Level: ${profile.lifestyleIndicators?.activityLevel || 'Not specified'}
    - Weekly Exercise: ${profile.initialFitnessAssessment?.weeklyActivityFrequency || 0} days
    - Exercise Types: ${profile.initialFitnessAssessment?.exerciseTypes?.join(', ') || 'None'}
    - Sleep: ${profile.lifestyleIndicators?.sleepHours || 'Not specified'} hours/night
    - Stress Level: ${profile.lifestyleIndicators?.stressLevel || 'Not specified'}
    
    FITNESS GOALS (MUST BE REFERENCED IN ALL RECOMMENDATIONS):
    =====================================
    PRIMARY GOAL: "${primaryGoal}"
    Target Weight: ${profile.fitnessGoals?.targetWeight?.value || 'Not set'} ${profile.fitnessGoals?.targetWeight?.unit || 'kg'}
    Target Date: ${profile.fitnessGoals?.targetDate ? new Date(profile.fitnessGoals.targetDate).toLocaleDateString() : 'Not set'}
    Motivation Level: ${profile.fitnessGoals?.motivationLevel || 5}/10
    Secondary Goals: ${profile.fitnessGoals?.secondary?.join(', ') || 'None'}
    =====================================
    
    Dietary Preferences: ${profile.dietaryPreferences?.join(', ') || 'None'}
    Dietary Restrictions: ${this.formatRestrictions(profile.dietaryRestrictions)}
    Wellness Score: ${profile.wellnessScore?.overall || 0}/100
    
    ${history ? this.formatHistoricalContext(history) : ''}
    
    REMINDER: Every single recommendation MUST explicitly explain how it helps achieve the PRIMARY GOAL of "${primaryGoal}".
    Example: "To support your ${primaryGoal} goal, this recommendation will help you..."`;

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContext }
    ];
  }

  // Format dietary restrictions for the prompt
  formatRestrictions(restrictions) {
    if (!restrictions) return 'None';
    
    const parts = [];
    if (restrictions.allergies?.length) {
      parts.push(`Allergies: ${restrictions.allergies.join(', ')}`);
    }
    if (restrictions.intolerances?.length) {
      parts.push(`Intolerances: ${restrictions.intolerances.join(', ')}`);
    }
    if (restrictions.medicalRestrictions?.length) {
      parts.push(`Medical: ${restrictions.medicalRestrictions.join(', ')}`);
    }
    
    return parts.length ? parts.join('; ') : 'None';
  }

  // Format historical data context
  formatHistoricalContext(history) {
    if (!history || history.length === 0) return '';
    
    const latest = history[0];
    const trend = latest.comparison?.trend || 'stable';
    const weightChange = latest.comparison?.weightChange || 0;
    const scoreChange = latest.comparison?.wellnessScoreChange || 0;
    
    return `
    Recent Trends:
    - Weight Change: ${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)} kg
    - Wellness Score Change: ${scoreChange > 0 ? '+' : ''}${scoreChange}
    - Overall Trend: ${trend}
    - Activity Pattern: ${latest.activity?.weeklyFrequency || 0} workouts/week
    `;
  }

  // Make API call with retry logic
  async makeAPICall(messages, retryCount = 0) {
    try {
      // Check if API key exists
      if (!this.apiKey || this.apiKey === 'your-openai-key') {
        console.log('No valid OpenAI API key, using fallback insights');
        throw new Error('No API key configured');
      }

      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
          messages: messages,
          temperature: 0.7,
          max_tokens: 1000,
          response_format: { type: "json_object" }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 second timeout
        }
      );

      return response.data;
    } catch (error) {
      if (retryCount < this.maxRetries && error.response?.status !== 401) {
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * Math.pow(2, retryCount)));
        return this.makeAPICall(messages, retryCount + 1);
      }
      
      throw error;
    }
  }

  // Parse AI response into structured format
  parseAIResponse(content) {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(content);
      
      // Validate and normalize the structure
      return {
        recommendations: this.normalizeRecommendations(parsed.recommendations || []),
        warnings: this.normalizeWarnings(parsed.warnings || []),
        achievements: parsed.achievements || [],
        motivation: parsed.motivation || this.getDefaultMotivation(),
        summary: parsed.summary || this.getDefaultSummary()
      };
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      
      // Fallback to text parsing if JSON fails
      return this.parseTextResponse(content);
    }
  }

  // Normalize recommendations structure
  normalizeRecommendations(recommendations) {
    return recommendations.map((rec, index) => ({
      id: `rec_${Date.now()}_${index}`,
      category: rec.category || 'general',
      priority: rec.priority || 'medium',
      title: rec.title || 'Health Recommendation',
      description: rec.description || rec.message || rec.text || '',
      rationale: rec.rationale || '',
      actionItems: Array.isArray(rec.actionItems) ? rec.actionItems : [],
      timeframe: rec.timeframe || '2-4 weeks',
      difficulty: rec.difficulty || 'moderate',
      expectedOutcome: rec.expectedOutcome || '',
      metrics: rec.metrics || []
    }));
  }

  // Normalize warnings structure
  normalizeWarnings(warnings) {
    return warnings.map((warning, index) => ({
      id: `warn_${Date.now()}_${index}`,
      severity: warning.severity || 'medium',
      category: warning.category || 'health',
      message: warning.message || warning.text || '',
      recommendation: warning.recommendation || 'Consult with a healthcare professional'
    }));
  }

  // Get fallback insights when API fails - WITH FITNESS GOALS
  getFallbackInsights(profile) {
    const bmi = profile.physicalMetrics?.bmi?.value || 25;
    const activityLevel = profile.initialFitnessAssessment?.weeklyActivityFrequency || 0;
    const goal = profile.fitnessGoals?.primary || 'general-health';
    const targetWeight = profile.fitnessGoals?.targetWeight?.value;
    const currentWeight = profile.physicalMetrics?.weight?.value;
    
    const recommendations = [];
    
    // PRIMARY GOAL-SPECIFIC RECOMMENDATIONS
    if (goal === 'weight-loss' || goal === 'weight_loss') {
      recommendations.push({
        id: 'goal_primary_1',
        category: 'fitness_goal',
        priority: 'high',
        title: `Personalized Weight Loss Strategy`,
        description: `To achieve your weight loss goal and reach your target weight of ${targetWeight || 'your ideal'} kg, you need a structured approach combining nutrition and exercise.`,
        rationale: `This directly supports your primary goal of weight loss.`,
        actionItems: [
          `Create a 500-750 calorie daily deficit to support your weight loss goal`,
          `Combine cardio (30 min/day) with strength training for optimal weight loss`,
          `Track progress weekly to ensure you're on track for weight loss`,
          `Adjust portions to align with your weight loss targets`
        ],
        timeframe: '4-6 weeks',
        difficulty: 'moderate',
        expectedOutcome: `1-2 lbs weekly weight loss toward your goal`
      });

      recommendations.push({
        id: 'goal_nutrition_1',
        category: 'nutrition',
        priority: 'high',
        title: `Nutrition Plan for Weight Loss Success`,
        description: `Your weight loss goal requires specific nutritional adjustments. Focus on high-protein, moderate-carb meals to support your weight loss while preserving muscle mass.`,
        actionItems: [
          `Eat 1.6g protein per kg body weight to support weight loss`,
          `Include fiber-rich foods to stay full during weight loss`,
          `Time carbs around workouts for energy while losing weight`
        ],
        timeframe: '2-4 weeks',
        difficulty: 'easy'
      });
    } else if (goal === 'muscle-gain' || goal === 'muscle_gain') {
      recommendations.push({
        id: 'goal_primary_2',
        category: 'fitness_goal',
        priority: 'high',
        title: `Muscle Building Program for Your Goal`,
        description: `Your muscle gain goal requires progressive overload training and optimal nutrition. Target weight: ${targetWeight || 'increase from current'} kg through lean muscle mass.`,
        rationale: `Specifically designed for your muscle gain objective.`,
        actionItems: [
          `Consume 1.8-2.2g protein per kg for muscle gain`,
          `Progressive overload training 3-4x/week for muscle growth`,
          `500 calorie surplus to support your muscle gain goal`,
          `8+ hours sleep for muscle recovery and growth`
        ],
        timeframe: '8-12 weeks',
        difficulty: 'moderate',
        expectedOutcome: `0.5-1 kg monthly muscle gain`
      });

      recommendations.push({
        id: 'goal_training_1',
        category: 'exercise',
        priority: 'high',
        title: `Strength Training for Maximum Muscle Gain`,
        description: `To achieve your muscle gain goal, focus on compound movements with progressive overload.`,
        actionItems: [
          `Squat, deadlift, bench press for muscle gain foundation`,
          `Increase weights by 2.5-5% weekly for muscle growth`,
          `4-5 sets of 6-12 reps optimal for muscle gain`
        ],
        timeframe: '4-6 weeks',
        difficulty: 'moderate'
      });
    } else if (goal === 'endurance' || goal === 'improve-endurance') {
      recommendations.push({
        id: 'goal_primary_3',
        category: 'fitness_goal',
        priority: 'high',
        title: `Endurance Building Program`,
        description: `Your endurance goal requires systematic cardiovascular training with progressive volume increases.`,
        rationale: `Tailored for your endurance improvement goal.`,
        actionItems: [
          `Increase weekly cardio volume by 10% for endurance`,
          `Include 2 interval sessions weekly for endurance gains`,
          `Long slow distance training for endurance base`,
          `Cross-train to support endurance without injury`
        ],
        timeframe: '6-8 weeks',
        difficulty: 'moderate',
        expectedOutcome: `20-30% endurance improvement`
      });
    } else if (goal === 'strength' || goal === 'build-strength') {
      recommendations.push({
        id: 'goal_primary_4',
        category: 'fitness_goal',
        priority: 'high',
        title: `Strength Building Protocol`,
        description: `Your strength building goal requires heavy resistance training with adequate recovery.`,
        rationale: `Optimized for your strength building objective.`,
        actionItems: [
          `Train at 85-95% 1RM for strength gains`,
          `3-5 reps per set for maximum strength`,
          `5+ minutes rest between sets for strength recovery`,
          `Focus on compound lifts for overall strength`
        ],
        timeframe: '8-10 weeks',
        difficulty: 'hard',
        expectedOutcome: `10-20% strength increase`
      });
    } else {
      // General health/wellness
      recommendations.push({
        id: 'goal_primary_5',
        category: 'fitness_goal',
        priority: 'high',
        title: `Balanced Wellness Plan for ${goal.replace(/-|_/g, ' ')}`,
        description: `Your goal of ${goal.replace(/-|_/g, ' ')} requires a balanced approach to nutrition, exercise, and recovery.`,
        actionItems: [
          `150 minutes moderate exercise weekly for ${goal.replace(/-|_/g, ' ')}`,
          `Balanced nutrition supporting ${goal.replace(/-|_/g, ' ')}`,
          `7-9 hours quality sleep for ${goal.replace(/-|_/g, ' ')}`,
          `Stress management for optimal ${goal.replace(/-|_/g, ' ')}`
        ],
        timeframe: '4-6 weeks',
        difficulty: 'moderate'
      });
    }
    
    // Additional recommendations that reference the primary goal
    if (activityLevel < 3) {
      recommendations.push({
        id: 'activity_1',
        category: 'exercise',
        priority: 'medium',
        title: `Increase Activity for ${goal.replace(/-|_/g, ' ')} Success`,
        description: `Your current activity level may be limiting your ${goal.replace(/-|_/g, ' ')} progress. Increasing exercise frequency will accelerate your ${goal.replace(/-|_/g, ' ')} results.`,
        actionItems: [
          `Add 2 more weekly workouts to support ${goal.replace(/-|_/g, ' ')}`,
          `Morning walks to boost metabolism for ${goal.replace(/-|_/g, ' ')}`,
          `Active recovery days to maintain progress toward ${goal.replace(/-|_/g, ' ')}`
        ],
        timeframe: '2-3 weeks',
        difficulty: 'easy'
      });
    }

    // Sleep recommendation tied to goal
    recommendations.push({
      id: 'recovery_1',
      category: 'lifestyle',
      priority: 'medium',
      title: `Optimize Sleep for ${goal.replace(/-|_/g, ' ')}`,
      description: `Quality sleep is essential for achieving your ${goal.replace(/-|_/g, ' ')} goal. Poor sleep can sabotage your ${goal.replace(/-|_/g, ' ')} efforts.`,
      actionItems: [
        `7-9 hours nightly for optimal ${goal.replace(/-|_/g, ' ')} results`,
        `Consistent sleep schedule supports ${goal.replace(/-|_/g, ' ')}`,
        `No screens 1 hour before bed for better ${goal.replace(/-|_/g, ' ')} recovery`
      ],
      timeframe: '1-2 weeks',
      difficulty: 'easy'
    });
    
    return {
      insights: {
        recommendations,
        warnings: this.generateGoalWarnings(profile),
        achievements: this.generateGoalAchievements(profile),
        motivation: {
          quote: `"Success in ${goal.replace(/-|_/g, ' ')} comes from consistency, not perfection."`,
          tip: `Track your ${goal.replace(/-|_/g, ' ')} progress daily for best results.`,
          challenge: `This week, take three specific actions toward your ${goal.replace(/-|_/g, ' ')} goal.`
        },
        summary: {
          overview: `Your personalized plan focuses on achieving your primary goal of ${goal.replace(/-|_/g, ' ')}. Every recommendation is specifically tailored to help you reach this objective.`,
          keyPoints: [
            `Primary focus: ${goal.replace(/-|_/g, ' ')}`,
            `Target weight: ${targetWeight || 'To be determined'} kg`,
            `Current weight: ${currentWeight || 'Not specified'} kg`,
            `Weekly exercise: ${activityLevel} days`
          ],
          progressAssessment: this.assessGoalProgress(profile),
          nextSteps: [
            `Continue focusing on ${goal.replace(/-|_/g, ' ')} with daily actions`,
            `Track progress metrics specific to ${goal.replace(/-|_/g, ' ')}`,
            `Adjust intensity based on ${goal.replace(/-|_/g, ' ')} progress`,
            `Review and update ${goal.replace(/-|_/g, ' ')} targets monthly`
          ]
        }
      },
      metadata: {
        model: 'fallback',
        processingTime: 0,
        tokens: null,
        cost: 0
      },
      raw: {
        prompt: 'Fallback insights generated',
        response: 'Using cached template'
      }
    };
  }

  // Generate warnings based on goals
  generateGoalWarnings(profile) {
    const warnings = [];
    const goal = profile.fitnessGoals?.primary || 'general-health';
    const bmi = profile.physicalMetrics?.bmi?.value;

    if (goal === 'weight-loss' && bmi < 18.5) {
      warnings.push({
        id: 'warn_1',
        severity: 'high',
        category: 'health',
        message: `Your BMI is already low. Weight loss may not be appropriate. Consider consulting a healthcare provider about your weight loss goal.`,
        recommendation: 'Reassess your fitness goals with professional guidance'
      });
    }

    if (goal === 'muscle-gain' && profile.lifestyleIndicators?.sleepHours < 6) {
      warnings.push({
        id: 'warn_2',
        severity: 'medium',
        category: 'recovery',
        message: `Insufficient sleep will severely limit your muscle gain progress. You need 7-9 hours for optimal muscle growth.`,
        recommendation: 'Prioritize sleep to achieve your muscle gain goal'
      });
    }

    return warnings;
  }

  // Generate achievements based on goals
  generateGoalAchievements(profile) {
    const achievements = [];
    const goal = profile.fitnessGoals?.primary || 'general-health';

    if (profile.metadata?.profileCompleteness >= 80) {
      achievements.push({
        id: 'ach_1',
        title: 'Profile Complete',
        description: `Great job! Your detailed profile helps us optimize recommendations for your ${goal.replace(/-|_/g, ' ')} goal.`,
        icon: '✅'
      });
    }

    if (profile.initialFitnessAssessment?.weeklyActivityFrequency >= 3) {
      achievements.push({
        id: 'ach_2',
        title: 'Consistent Exercise',
        description: `Exercising ${profile.initialFitnessAssessment.weeklyActivityFrequency} times per week strongly supports your ${goal.replace(/-|_/g, ' ')} goal!`,
        icon: '💪'
      });
    }

    return achievements;
  }

  // Assess progress toward goal
  assessGoalProgress(profile) {
    const goal = profile.fitnessGoals?.primary || 'general-health';
    const targetWeight = profile.fitnessGoals?.targetWeight?.value;
    const currentWeight = profile.physicalMetrics?.weight?.value;
    
    if (!targetWeight || !currentWeight) {
      return `Set specific targets to track ${goal.replace(/-|_/g, ' ')} progress effectively.`;
    }

    const difference = targetWeight - currentWeight;
    
    if (goal === 'weight-loss') {
      if (difference < 0) {
        const progress = Math.abs(difference);
        return `You need to lose ${progress.toFixed(1)} kg to reach your weight loss target. Stay consistent!`;
      } else {
        return `You've exceeded your weight loss goal! Consider setting a new target.`;
      }
    } else if (goal === 'muscle-gain') {
      if (difference > 0) {
        return `You need to gain ${difference.toFixed(1)} kg to reach your muscle gain target. Keep pushing!`;
      } else {
        return `You've reached your muscle gain target! Time to set new strength goals.`;
      }
    }

    return `Continue working toward your ${goal.replace(/-|_/g, ' ')} goal with consistent effort.`;
  }

  // Parse text response if JSON fails
  parseTextResponse(content) {
    // Basic text parsing logic
    return {
      recommendations: [{
        id: 'text_1',
        category: 'general',
        priority: 'medium',
        title: 'Health Recommendation',
        description: content.substring(0, 500),
        actionItems: [],
        timeframe: '2-4 weeks',
        difficulty: 'moderate'
      }],
      warnings: [],
      achievements: [],
      motivation: this.getDefaultMotivation(),
      summary: this.getDefaultSummary()
    };
  }

  // Default motivation object
  getDefaultMotivation() {
    return {
      quote: "Every step forward is progress, no matter how small.",
      tip: "Focus on consistency over perfection.",
      challenge: "Try one new healthy habit this week."
    };
  }

  // Default summary object
  getDefaultSummary() {
    return {
      overview: "Continue focusing on your health and wellness goals.",
      keyPoints: ["Stay consistent", "Track progress", "Adjust as needed"],
      progressAssessment: "On track",
      nextSteps: ["Review goals", "Maintain routine", "Monitor results"]
    };
  }

  // Calculate API cost
  calculateCost(usage) {
    if (!usage) return 0;
    
    const prices = {
      'gpt-3.5-turbo': { prompt: 0.0015, completion: 0.002 },
      'gpt-4': { prompt: 0.03, completion: 0.06 }
    };
    
    const modelPrices = prices[this.model] || prices['gpt-3.5-turbo'];
    
    const promptCost = (usage.prompt_tokens / 1000) * modelPrices.prompt;
    const completionCost = (usage.completion_tokens / 1000) * modelPrices.completion;
    
    return Math.round((promptCost + completionCost) * 10000) / 100; // Return in cents
  }
}

// Export singleton instance
module.exports = new AIService();