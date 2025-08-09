// utils/aiService.js - AI Service for generating health insights (Step 4)
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

  // Construct a detailed prompt for health insights
  constructHealthPrompt(profile, history) {
    const systemPrompt = `You are a professional health and wellness advisor. Provide personalized, actionable health recommendations based on the user's data. 
    Be specific, evidence-based, and considerate of the user's dietary restrictions and preferences. 
    Always prioritize safety and recommend consulting healthcare professionals for medical concerns.
    Format your response as JSON with the following structure:
    {
      "recommendations": [array of recommendation objects],
      "warnings": [array of warning objects],
      "achievements": [array of achievement objects],
      "motivation": { quote, tip, challenge },
      "summary": { overview, keyPoints, progressAssessment, nextSteps }
    }`;

    const userContext = `
    User Profile:
    - Age: ${profile.demographics?.age || 'Not specified'}
    - Gender: ${profile.demographics?.gender || 'Not specified'}
    - Current Weight: ${profile.physicalMetrics?.weight?.normalizedValue || 0} kg
    - Height: ${profile.physicalMetrics?.height?.normalizedValue || 0} cm
    - BMI: ${profile.physicalMetrics?.bmi?.value || 0} (${profile.physicalMetrics?.bmi?.category || 'Unknown'})
    - Activity Level: ${profile.lifestyleIndicators?.activityLevel || 'Not specified'}
    - Weekly Exercise: ${profile.initialFitnessAssessment?.weeklyActivityFrequency || 0} days
    - Exercise Types: ${profile.initialFitnessAssessment?.exerciseTypes?.join(', ') || 'None'}
    - Sleep: ${profile.lifestyleIndicators?.sleepHours || 'Not specified'} hours/night
    - Stress Level: ${profile.lifestyleIndicators?.stressLevel || 'Not specified'}/10
    - Primary Goal: ${profile.fitnessGoals?.primary || 'General wellness'}
    - Target Weight: ${profile.fitnessGoals?.targetWeight?.normalizedValue || 'Not set'} kg
    - Dietary Preferences: ${profile.dietaryPreferences?.join(', ') || 'None'}
    - Dietary Restrictions: ${this.formatRestrictions(profile.dietaryRestrictions)}
    - Wellness Score: ${profile.wellnessScore?.overall || 0}/100
    
    ${history ? this.formatHistoricalContext(history) : ''}
    
    Please provide personalized health insights and recommendations.`;

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
      if (retryCount < this.maxRetries) {
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
      actionItems: Array.isArray(rec.actionItems) ? rec.actionItems : [rec.description],
      expectedBenefits: rec.expectedBenefits || [],
      timeframe: rec.timeframe || '1-2 weeks',
      difficulty: rec.difficulty || 'moderate',
      relatedGoal: rec.relatedGoal || null
    }));
  }

  // Normalize warnings structure
  normalizeWarnings(warnings) {
    return warnings.map(warning => ({
      severity: warning.severity || 'warning',
      message: warning.message || warning.text || '',
      reason: warning.reason || '',
      suggestedAction: warning.suggestedAction || warning.action || ''
    }));
  }

  // Parse text response as fallback
  parseTextResponse(text) {
    // Basic text parsing logic
    const recommendations = [];
    const warnings = [];
    
    // Split by common delimiters
    const lines = text.split('\n').filter(line => line.trim());
    
    lines.forEach(line => {
      if (line.toLowerCase().includes('recommend') || line.startsWith('•') || line.startsWith('-')) {
        recommendations.push({
          id: `rec_${Date.now()}_${recommendations.length}`,
          category: 'general',
          priority: 'medium',
          title: 'Health Recommendation',
          description: line.replace(/^[•\-]\s*/, ''),
          actionItems: [line.replace(/^[•\-]\s*/, '')],
          timeframe: '1-2 weeks',
          difficulty: 'moderate'
        });
      } else if (line.toLowerCase().includes('warning') || line.toLowerCase().includes('caution')) {
        warnings.push({
          severity: 'warning',
          message: line,
          suggestedAction: 'Consult with a healthcare professional'
        });
      }
    });
    
    return {
      recommendations,
      warnings,
      achievements: [],
      motivation: this.getDefaultMotivation(),
      summary: this.getDefaultSummary()
    };
  }

  // Calculate API cost (OpenAI pricing)
  calculateCost(usage) {
    if (!usage) return 0;
    
    // Prices per 1K tokens (adjust based on current OpenAI pricing)
    const prices = {
      'gpt-3.5-turbo': { prompt: 0.0015, completion: 0.002 },
      'gpt-4': { prompt: 0.03, completion: 0.06 }
    };
    
    const modelPrices = prices[this.model] || prices['gpt-3.5-turbo'];
    
    const promptCost = (usage.prompt_tokens / 1000) * modelPrices.prompt;
    const completionCost = (usage.completion_tokens / 1000) * modelPrices.completion;
    
    return Math.round((promptCost + completionCost) * 100); // Return in cents
  }

  // Get fallback insights when API fails
  getFallbackInsights(profile) {
    const bmi = profile.physicalMetrics?.bmi?.value || 25;
    const activityLevel = profile.initialFitnessAssessment?.weeklyActivityFrequency || 0;
    const goal = profile.fitnessGoals?.primary || 'general_fitness';
    
    const recommendations = [];
    
    // BMI-based recommendations
    if (bmi < 18.5) {
      recommendations.push({
        id: 'fb_1',
        category: 'nutrition',
        priority: 'high',
        title: 'Increase Caloric Intake',
        description: 'Your BMI indicates you may be underweight. Consider increasing your daily caloric intake with nutrient-dense foods.',
        actionItems: [
          'Add healthy snacks between meals',
          'Include protein-rich foods in every meal',
          'Consider consulting a nutritionist'
        ],
        timeframe: '2-4 weeks',
        difficulty: 'moderate'
      });
    } else if (bmi > 25) {
      recommendations.push({
        id: 'fb_2',
        category: 'nutrition',
        priority: 'medium',
        title: 'Optimize Caloric Balance',
        description: 'Focus on creating a sustainable caloric deficit through balanced nutrition and regular exercise.',
        actionItems: [
          'Track your daily caloric intake',
          'Increase vegetable portions in meals',
          'Reduce processed food consumption'
        ],
        timeframe: '4-6 weeks',
        difficulty: 'moderate'
      });
    }
    
    // Activity-based recommendations
    if (activityLevel < 3) {
      recommendations.push({
        id: 'fb_3',
        category: 'exercise',
        priority: 'high',
        title: 'Increase Physical Activity',
        description: 'Your current activity level is below recommended guidelines. Aim for at least 150 minutes of moderate exercise weekly.',
        actionItems: [
          'Start with 20-minute daily walks',
          'Add 2-3 strength training sessions per week',
          'Find activities you enjoy to maintain consistency'
        ],
        timeframe: '2-3 weeks',
        difficulty: 'easy'
      });
    }
    
    // General recommendations
    recommendations.push({
      id: 'fb_4',
      category: 'lifestyle',
      priority: 'medium',
      title: 'Improve Sleep Quality',
      description: 'Quality sleep is essential for recovery and overall health.',
      actionItems: [
        'Maintain consistent sleep schedule',
        'Aim for 7-9 hours of sleep',
        'Create a relaxing bedtime routine'
      ],
      timeframe: '1-2 weeks',
      difficulty: 'easy'
    });
    
    return {
      insights: {
        recommendations,
        warnings: [],
        achievements: [],
        motivation: this.getDefaultMotivation(),
        summary: this.getDefaultSummary()
      },
      metadata: {
        model: 'fallback',
        processingTime: 0,
        tokens: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        cost: 0
      },
      raw: {
        prompt: 'Fallback insights used',
        response: 'Generated from cached templates'
      }
    };
  }

  // Default motivation content
  getDefaultMotivation() {
    const quotes = [
      "Every step forward is progress, no matter how small.",
      "Your health is an investment, not an expense.",
      "Consistency beats perfection every time.",
      "The best time to start was yesterday. The next best time is now."
    ];
    
    const tips = [
      "Track your progress daily to stay motivated",
      "Celebrate small victories along your journey",
      "Find an accountability partner for better results",
      "Focus on how you feel, not just the numbers"
    ];
    
    const challenges = [
      "Try a new healthy recipe this week",
      "Add 5 minutes to your workout routine",
      "Drink an extra glass of water each day",
      "Take the stairs instead of the elevator"
    ];
    
    return {
      quote: quotes[Math.floor(Math.random() * quotes.length)],
      tip: tips[Math.floor(Math.random() * tips.length)],
      challenge: challenges[Math.floor(Math.random() * challenges.length)]
    };
  }

  // Default summary content
  getDefaultSummary() {
    return {
      overview: "Your wellness journey is unique. Focus on consistent, sustainable changes.",
      keyPoints: [
        "Maintain regular physical activity",
        "Follow a balanced nutrition plan",
        "Prioritize quality sleep",
        "Manage stress effectively"
      ],
      progressAssessment: "Continue building healthy habits for long-term success.",
      nextSteps: [
        "Set specific, measurable goals",
        "Track your daily progress",
        "Adjust your plan based on results"
      ]
    };
  }
}

// Export singleton instance
module.exports = new AIService();