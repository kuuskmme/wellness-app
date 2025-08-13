// utils/aiService.js - AI Service with Explicit Fitness Goal References
const OpenAI = require('openai');

class AIService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.model = process.env.AI_MODEL || 'gpt-3.5-turbo';
    
    // Check if API key is valid (not a placeholder)
    this.enabled = !!this.apiKey && 
                   !this.apiKey.includes('your-') && 
                   !this.apiKey.includes('sk-your') &&
                   this.apiKey.startsWith('sk-');
    
    if (this.enabled) {
      try {
        this.openai = new OpenAI({
          apiKey: this.apiKey
        });
        console.log('✅ OpenAI initialized successfully');
      } catch (error) {
        console.error('❌ OpenAI initialization failed:', error.message);
        this.enabled = false;
      }
    } else {
      console.log('⚠️ OpenAI API key not configured or invalid - using fallback mode');
    }
  }

  // Generate health insights with explicit fitness goal references
  async generateHealthInsights(profile, history = [], forceGoalReference = true) {
    if (!this.enabled) {
      console.log('📝 Generating fallback insights with goal references...');
      return this.getFallbackInsights(profile);
    }

    try {
      const startTime = Date.now();
      const messages = this.buildInsightPrompt(profile, history, forceGoalReference);
      
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages,
        temperature: 0.7,
        max_tokens: 2000,
        response_format: { type: "json_object" }
      });

      const processingTime = Date.now() - startTime;
      const insights = JSON.parse(completion.choices[0].message.content);
      
      // Ensure fitness goals are explicitly referenced
      const enhancedInsights = this.ensureGoalReferences(insights, profile);

      return {
        insights: enhancedInsights,
        metadata: {
          model: this.model,
          tokens: completion.usage,
          processingTime,
          cost: this.calculateCost(completion.usage)
        },
        raw: {
          prompt: messages.map(m => m.content).join('\n'),
          response: completion.choices[0].message.content
        }
      };
    } catch (error) {
      console.error('AI Service Error:', error);
      console.log('📝 Falling back to offline insights generation...');
      return this.getFallbackInsights(profile);
    }
  }

  // Build prompt with emphasis on fitness goals
  buildInsightPrompt(profile, history, forceGoalReference) {
    const primaryGoal = profile.fitnessGoals?.primary || 'general wellness';
    const targetWeight = profile.fitnessGoals?.targetWeight?.normalizedValue;
    const timeline = profile.fitnessGoals?.timeline || 'Not specified';
    
    const systemPrompt = `You are an expert health and wellness advisor. 
    CRITICAL REQUIREMENT: Every single recommendation MUST explicitly reference how it helps achieve the user's specific fitness goal.
    
    The user's fitness profile:
    - PRIMARY GOAL: ${primaryGoal}
    ${targetWeight ? `- TARGET WEIGHT: ${targetWeight} kg` : ''}
    - TIMELINE: ${timeline}
    - SECONDARY GOALS: ${profile.fitnessGoals?.secondary?.join(', ') || 'None'}
    
    MANDATORY: Start EVERY recommendation with how it relates to their ${primaryGoal} goal.
    Include specific metrics and timeframes that align with their goals.
    
    Format your response as JSON with the following structure:
    {
      "recommendations": [
        {
          "id": "unique_id",
          "title": "Title that mentions ${primaryGoal}",
          "description": "Must start with: 'To achieve your ${primaryGoal} goal...' and explain how this specific action helps",
          "category": "nutrition|exercise|lifestyle|sleep|stress|medical|mental_health|general|health",
          "priority": "high|medium|low",
          "actionItems": ["specific actions that support ${primaryGoal}"],
          "timeframe": "specific timeframe",
          "difficulty": "easy|moderate|challenging",
          "goalAlignment": "Explicit explanation of how this supports ${primaryGoal} and moves toward ${targetWeight ? `${targetWeight}kg` : 'target'}"
        }
      ],
      "warnings": [],
      "achievements": [],
      "motivation": {
        "quote": "Quote about ${primaryGoal}",
        "tip": "Daily tip for ${primaryGoal}",
        "challenge": "Weekly challenge for ${primaryGoal}"
      },
      "summary": {
        "overview": "Assessment of ${primaryGoal} progress",
        "keyPoints": ["Points about ${primaryGoal}"],
        "progressAssessment": "Current progress toward ${primaryGoal}",
        "nextSteps": ["Next steps for ${primaryGoal}"]
      }
    }`;

    const userContext = `
    Current Health Profile:
    - Age: ${profile.demographics?.age || 'Not specified'}
    - Gender: ${profile.demographics?.gender || 'Not specified'}
    - Current Weight: ${profile.physicalMetrics?.weight?.normalizedValue || 0} kg
    - Height: ${profile.physicalMetrics?.height?.normalizedValue || 0} cm
    - BMI: ${profile.physicalMetrics?.bmi?.value || 0} (${profile.physicalMetrics?.bmi?.category || 'Unknown'})
    - Activity Level: ${profile.lifestyleIndicators?.activityLevel || 'Not specified'}
    - Weekly Exercise: ${profile.initialFitnessAssessment?.weeklyActivityFrequency || 0} days
    - Sleep: ${profile.lifestyleIndicators?.sleepHours || 'Not specified'} hours/night
    - Stress Level: ${profile.lifestyleIndicators?.stressLevel || 'Not specified'}/10
    - Wellness Score: ${profile.wellnessScore?.overall || 0}/100
    
    IMPORTANT: This person's primary goal is ${primaryGoal}${targetWeight ? ` with a target weight of ${targetWeight}kg` : ''}.
    Every recommendation must explicitly explain how it helps achieve this specific goal.
    Make the connection between each recommendation and their ${primaryGoal} goal crystal clear.
    `;

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContext }
    ];
  }

  // Ensure all recommendations reference fitness goals
  ensureGoalReferences(insights, profile) {
    const primaryGoal = profile.fitnessGoals?.primary || 'general wellness';
    const targetWeight = profile.fitnessGoals?.targetWeight?.normalizedValue;
    
    // Enhance recommendations with explicit goal references
    if (insights.recommendations) {
      insights.recommendations = insights.recommendations.map(rec => {
        // Ensure description starts with goal reference
        if (!rec.description.toLowerCase().includes(primaryGoal.replace('_', ' '))) {
          rec.description = `To achieve your ${primaryGoal.replace('_', ' ')} goal, ${rec.description}`;
        }
        
        // Ensure goalAlignment is present and specific
        if (!rec.goalAlignment) {
          rec.goalAlignment = `This directly supports your ${primaryGoal.replace('_', ' ')} goal${
            targetWeight ? ` and progress toward ${targetWeight}kg` : ''
          } by ${rec.category === 'nutrition' ? 'optimizing your dietary intake' : 
                 rec.category === 'exercise' ? 'improving your fitness level' :
                 rec.category === 'sleep' ? 'enhancing recovery and metabolism' :
                 'addressing key wellness factors'}`;
        }
        
        // Update title to include goal reference if missing
        if (!rec.title.toLowerCase().includes('goal') && !rec.title.toLowerCase().includes(primaryGoal.replace('_', ' '))) {
          rec.title = `${rec.title} for ${primaryGoal.replace('_', ' ').charAt(0).toUpperCase() + primaryGoal.replace('_', ' ').slice(1)}`;
        }
        
        return rec;
      });
    }
    
    return insights;
  }

  // Calculate cost for OpenAI usage
  calculateCost(usage) {
    if (!usage) return 0;
    
    // GPT-3.5-turbo pricing (as of 2024)
    const inputCost = 0.0005 / 1000; // $0.0005 per 1K tokens
    const outputCost = 0.0015 / 1000; // $0.0015 per 1K tokens
    
    return {
      input: (usage.prompt_tokens || 0) * inputCost,
      output: (usage.completion_tokens || 0) * outputCost,
      total: ((usage.prompt_tokens || 0) * inputCost) + ((usage.completion_tokens || 0) * outputCost)
    };
  }

  // Get fallback insights when API is unavailable
  getFallbackInsights(profile) {
    const goal = profile.fitnessGoals?.primary || 'general_wellness';
    const targetWeight = profile.fitnessGoals?.targetWeight?.normalizedValue;
    const currentWeight = profile.physicalMetrics?.weight?.normalizedValue || 70;
    const height = profile.physicalMetrics?.height?.normalizedValue || 170;
    const bmi = profile.physicalMetrics?.bmi?.value || (currentWeight / Math.pow(height / 100, 2));
    const activityLevel = profile.initialFitnessAssessment?.weeklyActivityFrequency || 0;
    
    // Create dynamic recommendations based on actual user data
    const recommendations = [];
    
    // Goal-specific primary recommendation
    const goalRecommendations = {
      weight_loss: {
        title: 'Caloric Deficit Strategy for Weight Loss',
        description: `To achieve your weight loss goal and reach ${targetWeight || 'your target'}kg, implement a moderate caloric deficit of 300-500 calories daily. This sustainable approach will help you lose 0.5-1kg per week while preserving muscle mass.`,
        actionItems: [
          `Track daily calorie intake to maintain deficit for weight loss`,
          `Focus on protein intake (1.6-2g per kg body weight) to preserve muscle`,
          `Include 30 minutes of cardio 4-5 times weekly`,
          `Monitor weekly weight changes toward ${targetWeight || 'target'}kg`
        ]
      },
      muscle_gain: {
        title: 'Progressive Overload for Muscle Gain',
        description: `To achieve your muscle gain goal, implement progressive resistance training with a slight caloric surplus. This will support muscle growth while minimizing fat gain.`,
        actionItems: [
          'Increase training weights by 2.5-5% weekly',
          'Consume 300-500 calories above maintenance',
          'Ensure 1.8-2.2g protein per kg body weight',
          'Track strength gains and body composition changes'
        ]
      },
      endurance_improvement: {
        title: 'Cardiovascular Base Building for Endurance',
        description: `To achieve your endurance improvement goal, gradually increase your aerobic capacity through structured training. This systematic approach will enhance your cardiovascular fitness.`,
        actionItems: [
          'Start with 3x 30-minute moderate cardio sessions weekly',
          'Increase duration by 10% each week',
          'Include one interval training session weekly',
          'Monitor resting heart rate improvements'
        ]
      },
      general_wellness: {
        title: 'Balanced Approach for General Wellness',
        description: `To achieve your general wellness goal, focus on creating sustainable healthy habits across nutrition, exercise, and lifestyle factors.`,
        actionItems: [
          'Maintain consistent exercise routine 3-4 times weekly',
          'Follow balanced nutrition with whole foods focus',
          'Prioritize 7-9 hours quality sleep nightly',
          'Practice stress management techniques daily'
        ]
      }
    };
    
    // Add primary goal recommendation
    const primaryRec = goalRecommendations[goal] || goalRecommendations.general_wellness;
    recommendations.push({
      id: 'goal_primary',
      ...primaryRec,
      category: 'exercise',
      priority: 'high',
      timeframe: '4-6 weeks',
      difficulty: 'moderate',
      goalAlignment: `This is your primary strategy for achieving ${goal.replace('_', ' ')} ${targetWeight ? `and reaching ${targetWeight}kg` : ''}`
    });
    
    // BMI-based recommendation with goal alignment
    if (bmi > 25 && goal === 'weight_loss') {
      recommendations.push({
        id: 'bmi_weight',
        title: 'BMI Optimization for Weight Loss Success',
        description: `To achieve your weight loss goal of reaching ${targetWeight || 'a healthy weight'}kg, focus on reducing your BMI from ${bmi.toFixed(1)} to a healthier range. A 5-10% weight reduction significantly improves health markers.`,
        category: 'nutrition',
        priority: 'high',
        actionItems: [
          `Create a ${Math.round((currentWeight - (targetWeight || currentWeight * 0.95)) * 7700 / 90)} calorie daily deficit`,
          'Replace processed foods with whole foods',
          'Track progress weekly toward target weight',
          'Adjust calorie intake based on weekly results'
        ],
        timeframe: '8-12 weeks',
        difficulty: 'moderate',
        goalAlignment: `Reducing BMI is essential for your weight loss goal and reaching ${targetWeight || 'target'}kg safely`
      });
    }
    
    // Activity-based recommendation with goal context
    if (activityLevel < 3) {
      recommendations.push({
        id: 'activity_increase',
        title: `Increase Activity for ${goal.replace('_', ' ').charAt(0).toUpperCase() + goal.replace('_', ' ').slice(1)}`,
        description: `To achieve your ${goal.replace('_', ' ')} goal${targetWeight ? ` and reach ${targetWeight}kg` : ''}, increase your weekly exercise frequency from ${activityLevel} to at least 4-5 days. Regular activity is crucial for sustainable results.`,
        category: 'exercise',
        priority: activityLevel === 0 ? 'high' : 'medium',
        actionItems: [
          `Add ${3 - activityLevel} more exercise sessions weekly`,
          `Start with 20-minute sessions and gradually increase`,
          `Mix cardio and strength training for ${goal.replace('_', ' ')}`,
          'Track workout consistency in relation to goal progress'
        ],
        timeframe: '2-3 weeks',
        difficulty: 'easy',
        goalAlignment: `Increasing activity frequency accelerates ${goal.replace('_', ' ')} and supports reaching ${targetWeight || 'your target'}kg`
      });
    }
    
    // Sleep optimization for goal achievement
    if (profile.lifestyleIndicators?.sleepHours < 7) {
      recommendations.push({
        id: 'sleep_optimization',
        title: `Sleep Optimization for ${goal.replace('_', ' ').charAt(0).toUpperCase() + goal.replace('_', ' ').slice(1)}`,
        description: `To achieve your ${goal.replace('_', ' ')} goal, improve sleep from ${profile.lifestyleIndicators?.sleepHours || 'insufficient'} to 7-9 hours nightly. Quality sleep is essential for recovery, metabolism, and reaching ${targetWeight || 'your target'}kg.`,
        category: 'sleep',
        priority: 'high',
        actionItems: [
          'Set consistent bedtime 8 hours before wake time',
          'Create pre-sleep routine starting 1 hour before bed',
          'Avoid screens and caffeine 2 hours before sleep',
          `Track how sleep quality affects ${goal.replace('_', ' ')} progress`
        ],
        timeframe: '1-2 weeks',
        difficulty: 'easy',
        goalAlignment: `Adequate sleep optimizes hormones crucial for ${goal.replace('_', ' ')} and achieving ${targetWeight || 'target weight'}kg`
      });
    }
    
    // Stress management for goal success
    if (profile.lifestyleIndicators?.stressLevel > 6) {
      recommendations.push({
        id: 'stress_management',
        title: `Stress Reduction for ${goal.replace('_', ' ').charAt(0).toUpperCase() + goal.replace('_', ' ').slice(1)} Success`,
        description: `To achieve your ${goal.replace('_', ' ')} goal, reduce stress levels from ${profile.lifestyleIndicators?.stressLevel}/10 to below 5/10. High stress hormones can sabotage ${goal === 'weight_loss' ? 'weight loss' : goal === 'muscle_gain' ? 'muscle growth' : 'fitness progress'}.`,
        category: 'stress',
        priority: 'medium',
        actionItems: [
          'Practice 10-minute daily meditation or breathing exercises',
          'Schedule regular breaks during work for stress relief',
          `Monitor how stress impacts ${goal.replace('_', ' ')} progress`,
          'Consider yoga or tai chi 2-3 times weekly'
        ],
        timeframe: '2-3 weeks',
        difficulty: 'easy',
        goalAlignment: `Managing stress improves cortisol levels, essential for ${goal.replace('_', ' ')} and reaching ${targetWeight || 'optimal weight'}kg`
      });
    }
    
    // Create achievements based on current metrics
    const achievements = [];
    if (profile.wellnessScore?.overall > 70) {
      achievements.push({
        title: `Wellness Leader for ${goal.replace('_', ' ').charAt(0).toUpperCase() + goal.replace('_', ' ').slice(1)}`,
        description: `Maintaining excellent wellness score while pursuing ${goal.replace('_', ' ')}`,
        metric: 'Wellness Score',
        improvement: `${profile.wellnessScore.overall}/100`,
        emoji: '🏆'
      });
    }
    
    if (activityLevel >= 4) {
      achievements.push({
        title: 'Consistency Champion',
        description: `Exercising ${activityLevel} days/week supports your ${goal.replace('_', ' ')} goal`,
        metric: 'Weekly Activity',
        improvement: `${activityLevel} days/week`,
        emoji: '💪'
      });
    }
    
    // Warnings based on health risks
    const warnings = [];
    if (bmi > 30) {
      warnings.push({
        type: 'alert',
        message: `BMI of ${bmi.toFixed(1)} may complicate ${goal.replace('_', ' ')} progress`,
        reason: `High BMI increases health risks and may require modified approach to ${goal.replace('_', ' ')}`,
        suggestedAction: `Consult healthcare provider for personalized ${goal.replace('_', ' ')} plan considering current BMI`
      });
    }
    
    return {
      insights: {
        recommendations: recommendations.slice(0, 5),
        warnings,
        achievements,
        motivation: {
          quote: `"Every step toward ${goal.replace('_', ' ')} ${targetWeight ? `and ${targetWeight}kg` : ''} is progress worth celebrating."`,
          tip: `Today, focus on one action that directly supports your ${goal.replace('_', ' ')} goal`,
          challenge: `This week: Complete all planned workouts to accelerate ${goal.replace('_', ' ')} progress`
        },
        summary: {
          overview: `Your personalized plan for ${goal.replace('_', ' ')}${targetWeight ? ` targets ${targetWeight}kg` : ''}. Current weight: ${currentWeight}kg, BMI: ${bmi.toFixed(1)}.`,
          keyPoints: [
            `Primary goal: ${goal.replace('_', ' ')}${targetWeight ? ` to ${targetWeight}kg` : ''}`,
            `Current metrics: ${currentWeight}kg, BMI ${bmi.toFixed(1)}`,
            `Weekly activity: ${activityLevel} days`,
            `Focus areas: ${recommendations.map(r => r.category).slice(0, 3).join(', ')}`
          ],
          progressAssessment: this.getProgressAssessment(profile, goal, targetWeight, currentWeight),
          nextSteps: [
            `Implement highest priority ${goal.replace('_', ' ')} recommendations`,
            `Track daily progress toward ${targetWeight || 'target'}kg`,
            `Adjust plan based on weekly results`,
            `Generate new insights after implementing changes`
          ]
        }
      },
      metadata: {
        model: 'fallback',
        tokens: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        processingTime: 0,
        cost: 0
      },
      raw: {
        prompt: 'Fallback mode - API unavailable or invalid key',
        response: 'Generated goal-specific fallback insights'
      }
    };
  }

  // Get detailed progress assessment
  getProgressAssessment(profile, goal, targetWeight, currentWeight) {
    if (!targetWeight || !currentWeight) {
      return `Starting your ${goal.replace('_', ' ')} journey. Set specific targets for better tracking.`;
    }
    
    const difference = targetWeight - currentWeight;
    const absDifference = Math.abs(difference);
    
    if (goal === 'weight_loss') {
      if (difference < 0) {
        const progress = ((currentWeight - targetWeight) / absDifference) * 100;
        if (absDifference < 2) {
          return `Excellent! You're within 2kg of your ${targetWeight}kg weight loss goal. Focus on maintenance strategies.`;
        } else if (absDifference < 5) {
          return `Great progress! ${absDifference.toFixed(1)}kg to go to reach ${targetWeight}kg. You're on track for weight loss success.`;
        } else {
          return `${absDifference.toFixed(1)}kg to lose to reach ${targetWeight}kg. With consistent effort, you'll achieve your weight loss goal.`;
        }
      } else {
        return `Current weight (${currentWeight}kg) is below target (${targetWeight}kg). Consider adjusting your weight loss target.`;
      }
    } else if (goal === 'muscle_gain') {
      if (difference > 0) {
        if (absDifference < 2) {
          return `Close to your ${targetWeight}kg muscle gain target! Focus on progressive overload and nutrition.`;
        } else {
          return `${absDifference.toFixed(1)}kg to gain to reach ${targetWeight}kg. Ensure adequate protein and training intensity.`;
        }
      } else {
        return `Current weight exceeds muscle gain target. Focus on body composition rather than just weight.`;
      }
    } else {
      return `Working toward ${goal.replace('_', ' ')} with ${targetWeight}kg as your target weight. Current: ${currentWeight}kg.`;
    }
  }

  // Format dietary restrictions for prompts
  formatRestrictions(restrictions) {
    if (!restrictions || Object.keys(restrictions).length === 0) {
      return 'None';
    }
    
    const activeRestrictions = [];
    for (const [key, value] of Object.entries(restrictions)) {
      if (value === true) {
        activeRestrictions.push(key.replace('_', ' '));
      }
    }
    
    return activeRestrictions.length > 0 ? activeRestrictions.join(', ') : 'None';
  }

  // Format historical context for prompts
  formatHistoricalContext(history) {
    if (!history || history.length === 0) {
      return 'No historical data available.';
    }
    
    return `
    Historical Trends (Last ${history.length} weeks):
    ${history.map(h => `- Week ending ${h.period.endDate}: Wellness Score ${h.aggregatedMetrics?.wellnessScore || 'N/A'}`).join('\n')}
    `;
  }
}

module.exports = new AIService();