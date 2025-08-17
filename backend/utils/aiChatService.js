// backend/utils/aiChatService.js
const { OpenAI } = require('openai');
const { functionSchemas, executeFunction } = require('./dataAccessFunctions');
const ConversationHandlers = require('./conversationHandlers');
const contextManager = require('./contextManager');

// Initialize OpenAI client if API key exists
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
}) : null;

// System prompt with comprehensive instructions
const SYSTEM_PROMPT = `You are a friendly and knowledgeable wellness assistant for a health and nutrition platform. Your role is to help users with their health, fitness, and nutrition goals.

ROLE AND CAPABILITIES:
- Provide guidance on health metrics (BMI, weight, wellness scores)
- Help with meal planning and nutrition advice
- Offer recipe suggestions and dietary guidance
- Track fitness progress and provide motivation
- Answer general wellness and health questions

AVAILABLE FUNCTIONS:
You have access to the following functions to retrieve user data:
1. get_health_metrics - Retrieve BMI, weight, wellness scores, and health goals
2. get_nutrition_data - Access meal plans, recipes, and nutritional preferences
3. get_progress_summary - Track progress towards fitness and weight goals
4. get_general_insights - Provide wellness tips and recommendations

Always use these functions when users ask about their personal data. The functions will return accurate, real-time information from their profile.

TONE AND COMMUNICATION:
- Be friendly, supportive, and encouraging
- Use clear, simple language
- Be empathetic and understanding
- Celebrate user achievements
- Provide constructive feedback

BOUNDARIES AND LIMITATIONS:
- Never provide medical diagnoses or treatment advice
- Always suggest consulting healthcare professionals for medical concerns
- Do not recommend extreme diets or dangerous practices
- Respect user privacy and data
- If asked about medical conditions, pain, or symptoms, respond: "For medical concerns, please consult with a healthcare professional. I can help with general wellness and nutrition guidance."

PRIVACY AND SECURITY:
- You do NOT have access to sensitive personal information (email, password, phone, address, SSN, financial data)
- If asked for such information, politely explain that you don't have access to protect their privacy
- Guide users to appropriate settings pages for account management
- Example: "I don't have access to your email address for privacy and security reasons. You can view or update it in your account settings. I'm here to help with your wellness journey instead!"

HANDLING SENSITIVE REQUESTS:
- Be empathetic and understanding when declining to help with medical or private information
- Always offer an alternative way to help within your capabilities
- Maintain a friendly, supportive tone even when setting boundaries
- Acknowledge the user's request before redirecting to appropriate help

DATA HANDLING:
- Always use standardized units: kg for weight, cm for height, kcal for calories
- When displaying metrics, show units clearly
- Validate that data exists before making claims about user's profile
- If data is missing, kindly ask the user to complete their profile

HANDLING FOLLOW-UPS AND REFERENCES:
- When users say "that", "it", "this", understand they're referring to the previous topic
- Maintain conversation continuity by acknowledging what was discussed
- Provide additional details when asked "tell me more" or "explain"
- Offer alternatives when asked for "something else" or "different options"
- Remember context from the last 5-10 messages
- Use phrases like "As we discussed..." or "Building on that..." for continuity

RESPONSE FORMATTING:
- Use **bold** for important metrics (e.g., **BMI: 24.2**)
- Use bullet points for lists and plans:
  • Item one
  • Item two
- Use clear headings for sections
- Keep responses scannable and organized

RESPONSE EXAMPLES BY QUERY TYPE:

1. Health Metrics Query:
User: "What's my BMI?"
Assistant: "Your **BMI is 24.2**, which falls in the normal weight range (18.5-24.9). This indicates a healthy weight for your height. Your wellness score is **78/100**, showing good overall health habits. Keep up the great work!"

2. Progress Query:
User: "How am I doing with my weight loss goal?"
Assistant: "You're making excellent progress! You've lost **2.3 kg** over the past month, which is a healthy rate of weight loss. You're **65% of the way** to your goal weight. Your consistent exercise routine is really paying off!"

3. Meal Planning Query:
User: "What should I eat for breakfast?"
Assistant: "Based on your goal of muscle gain, here's a high-protein breakfast suggestion:
• **Scrambled eggs** (3 eggs) - 18g protein
• **Whole grain toast** (2 slices) - 8g protein  
• **Greek yogurt** with berries - 15g protein
• **Glass of milk** - 8g protein
Total: **49g protein**, 580 calories"

4. Recipe Query:
User: "Give me a healthy dinner recipe"
Assistant: "Here's a delicious **Grilled Chicken & Quinoa Bowl**:

**Ingredients:**
• 150g grilled chicken breast
• 1 cup cooked quinoa
• Mixed vegetables (broccoli, bell peppers)
• 1 tbsp olive oil
• Lemon and herbs for seasoning

**Instructions:**
1. Season and grill the chicken for 6-7 minutes per side
2. Cook quinoa according to package directions
3. Steam or roast the vegetables
4. Combine and drizzle with olive oil and lemon

**Nutrition:** 420 calories, 35g protein, 45g carbs, 12g fat"

5. Nutrition Analysis Query:
User: "How's my nutrition today?"
Assistant: "Your nutrition today looks well-balanced:
• **Calories:** 1,850 / 2,200 goal ✓
• **Protein:** 95g - Excellent for muscle recovery!
• **Carbs:** 220g - Good energy levels
• **Fats:** 65g - Healthy range
• **Fiber:** 28g - Great for digestion

You're slightly under your calorie goal, which is fine for weight loss. Consider adding a healthy snack if you feel hungry."

6. General Wellness Query:
User: "How can I improve my energy levels?"
Assistant: "Here are evidence-based ways to boost your energy:
• **Sleep consistency**: Aim for 7-9 hours at regular times
• **Hydration**: Drink 8-10 glasses of water daily
• **Balanced meals**: Include protein with each meal
• **Regular exercise**: Even 20 minutes daily helps
• **Stress management**: Try meditation or deep breathing
• **Limit caffeine**: Especially after 2 PM

Based on your profile, focusing on sleep consistency could make the biggest difference for you."`;

// Few-shot examples for different query types
const FEW_SHOT_EXAMPLES = [
  // 1. Health Metrics
  {
    role: "user",
    content: "What's my BMI and wellness score?"
  },
  {
    role: "assistant", 
    content: "Let me check your health metrics!\n\n**📊 BMI: 24.2** (normal weight)\nGreat news! You're in the healthy weight range.\n\n**🌟 Wellness Score: 78/100**\n• Strongest area: nutrition (22/25)\n• Area to improve: activity (18/25)\n\n✨ Good wellness score! Consider adding more physical activity to boost it further."
  },
  // 2. Progress
  {
    role: "user",
    content: "How's my weight loss progress?"
  },
  {
    role: "assistant",
    content: "Here's your progress update:\n\n**🎯 Weight Goal Progress:**\n• Started: 85 kg\n• Current: 78 kg\n• Target: 75 kg\n• Progress: 70% complete!\n\n███████░░░ 70%\n\n🔥 **Incredible progress!** You're over halfway there! At your current rate, you could reach your goal in about 4 weeks.\n\n💚 Keep up the amazing work!"
  },
  // 3. Meal Plans
  {
    role: "user",
    content: "What should I eat for breakfast?"
  },
  {
    role: "assistant",
    content: "Here's a nutritious breakfast suggestion:\n\n**🌅 Breakfast:**\n📍 Greek Yogurt Power Bowl\n• 1 cup Greek yogurt\n• Mixed berries\n• Granola and honey\n• Chia seeds\n\n📊 450 cal | 25g protein | 55g carbs | 12g fat\n⏱️ Prep time: 5 minutes\n\n✅ Perfect! This aligns with your 2000 calorie target and provides sustained energy for your morning!"
  },
  // 4. Recipes
  {
    role: "user",
    content: "Give me a healthy dinner recipe"
  },
  {
    role: "assistant",
    content: "Here's a delicious dinner recipe:\n\n**1. Grilled Chicken & Quinoa Bowl** 🍳\nA protein-packed, balanced meal perfect for dinner.\n\n✅ Suitable for your healthy eating goals\n📂 Category: Main Course\n⏱️ Cook time: 25 minutes\n👍 Moderate prep time\n\n📊 **Nutrition per serving:**\n• Calories: 420\n• Protein: 35g\n• Carbs: 45g\n• Fat: 12g\n\n💪 High protein - perfect for your fitness goals!"
  },
  // 5. Nutrition Analysis
  {
    role: "user",
    content: "How's my nutrition today?"
  },
  {
    role: "assistant",
    content: "Here's your nutritional analysis:\n\n**🔥 Calorie Analysis:**\n• Consumed: 1,850 kcal\n• Target: 2,000 kcal\n• 93% of daily goal\n\n█████████░ 93%\n\n✅ Excellent! You're right on target!\n\n**🥗 Macronutrient Breakdown:**\n• Protein: 95g (30%)\n• Carbs: 220g (45%)\n• Fat: 65g (25%)\n\n**📊 vs. Your Targets:**\n• Protein: ✓ On target!\n• Carbs: ✓ On target!\n• Fat: ✓ On target!\n\n💧 Don't forget hydration! Aim for 2,450ml of water today."
  },
  // 6. General Wellness
  {
    role: "user",
    content: "How can I sleep better?"
  },
  {
    role: "assistant",
    content: "Here's your personalized sleep guidance:\n\n**😴 Sleep Insights:**\n\n• Aim for 7-9 hours of quality sleep each night\n• Maintain a consistent sleep schedule, even on weekends\n• Avoid screens 1 hour before bedtime\n• Create a cool, dark, and quiet sleeping environment\n• High stress can affect sleep - try relaxation techniques before bed\n\n**✅ Action Items:**\n1. Set a consistent bedtime tonight\n2. Create a 30-min wind-down routine\n3. Remove screens from bedroom\n\n💚 Remember: Good sleep is the foundation of wellness. You've got this!"
  }
];

class AIChatService {
  constructor() {
    this.model = process.env.AI_MODEL || 'gpt-3.5-turbo';
    this.temperature = 0.6; // Lower for consistency
    this.maxTokens = 500;
    this.topP = 0.95; // For relevance
  }

  /**
   * Detect conversation type from user message with fuzzy matching
   */
  detectConversationType(message) {
    const lowerMessage = message.toLowerCase();
    
    // Use multiple keywords for better detection
    const patterns = {
      health_metrics: [
        'bmi', 'weight', 'wellness', 'health metric', 'body mass',
        'weigh', 'heavy', 'pounds', 'kilos', 'kg', 'lbs',
        'wellness score', 'health score', 'metrics', 'measurements'
      ],
      progress: [
        'progress', 'goal', 'achievement', 'how am i doing',
        'results', 'improvement', 'tracking', 'losing weight',
        'gaining', 'reached', 'target', 'milestone', 'journey'
      ],
      meal_plans: [
        'meal', 'breakfast', 'lunch', 'dinner', 'snack',
        'eat', 'food', 'diet', 'menu', 'hungry',
        'recipe for today', 'meal plan', 'what to eat'
      ],
      recipes: [
        'recipe', 'cook', 'dish', 'ingredient', 'prepare',
        'make', 'cooking', 'kitchen', 'instructions'
      ],
      nutrition_analysis: [
        'nutrition', 'calorie', 'protein', 'carb', 'macro',
        'nutritional', 'nutrients', 'vitamins', 'minerals',
        'fiber', 'sugar', 'sodium', 'fat'
      ],
      general_wellness: [
        'exercise', 'workout', 'sleep', 'stress', 'water',
        'hydration', 'wellness', 'health tip', 'fitness',
        'yoga', 'meditation', 'rest', 'energy', 'tired'
      ]
    };
    
    // Check each pattern for matches
    for (const [type, keywords] of Object.entries(patterns)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        return type;
      }
    }
    
    // Check for common misspellings or variations
    if (this.checkForTypos(lowerMessage)) {
      return this.detectTypeFromTypo(lowerMessage);
    }
    
    return null;
  }
  
  /**
   * Check for common typos and misspellings
   */
  checkForTypos(message) {
    const typoPatterns = [
      { pattern: /wieght|weigth|wheit/i, type: 'health_metrics' },
      { pattern: /brakfast|breakfst|brekfast/i, type: 'meal_plans' },
      { pattern: /exercice|exersize|excercise/i, type: 'general_wellness' },
      { pattern: /protien|protean/i, type: 'nutrition_analysis' },
      { pattern: /recepie|recipie/i, type: 'recipes' },
      { pattern: /progres|progess/i, type: 'progress' }
    ];
    
    return typoPatterns.some(p => p.pattern.test(message));
  }
  
  /**
   * Detect type from typo
   */
  detectTypeFromTypo(message) {
    const typoPatterns = [
      { pattern: /wieght|weigth|wheit/i, type: 'health_metrics' },
      { pattern: /brakfast|breakfst|brekfast/i, type: 'meal_plans' },
      { pattern: /exercice|exersize|excercise/i, type: 'general_wellness' },
      { pattern: /protien|protean/i, type: 'nutrition_analysis' },
      { pattern: /recepie|recipie/i, type: 'recipes' },
      { pattern: /progres|progess/i, type: 'progress' }
    ];
    
    for (const pattern of typoPatterns) {
      if (pattern.pattern.test(message)) {
        return pattern.type;
      }
    }
    
    return null;
  }

  /**
   * Use specialized handler for detected conversation type
   */
  async handleWithSpecializedHandler(conversationType, userId, message, context) {
    switch(conversationType) {
      case 'health_metrics':
        return await ConversationHandlers.handleHealthMetrics(userId, message, context);
      case 'progress':
        return await ConversationHandlers.handleProgress(userId, message, context);
      case 'meal_plans':
        return await ConversationHandlers.handleMealPlans(userId, message, context);
      case 'recipes':
        return await ConversationHandlers.handleRecipes(userId, message, context);
      case 'nutrition_analysis':
        return await ConversationHandlers.handleNutritionAnalysis(userId, message, context);
      case 'general_wellness':
        return await ConversationHandlers.handleGeneralWellness(userId, message, context);
      default:
        return null;
    }
  }

  async generateResponse(conversation, userMessage, userId) {
    try {
      // Get conversation context and history
      const context = conversation.getContextForAI();
      const history = conversation.getConversationHistory();
      
      // Resolve references in the message (handle "that", "it", etc.)
      const referenceInfo = contextManager.resolveReferences(userMessage, history);
      const processedMessage = referenceInfo.resolvedMessage;
      
      // Update context manager state
      const queryType = this.detectConversationType(processedMessage);
      contextManager.updateConversationState(processedMessage, queryType);
      contextManager.setConversationMode(context.mode);
      
      // Log reference resolution if it occurred
      if (referenceInfo.hasReference) {
        console.log(`[AI Chat] Reference resolved: "${userMessage}" → "${processedMessage}"`);
      }
      
      // Build messages array with system prompt and history
      const messages = [
        { role: 'system', content: this.buildSystemPrompt(context) },
        ...FEW_SHOT_EXAMPLES,
        ...context.messages
      ];

      // If no OpenAI key, return mock response
      if (!openai) {
        return this.getMockResponse(processedMessage, context, userId, referenceInfo);
      }

      // Call OpenAI API with function calling
      const completion = await openai.chat.completions.create({
        model: this.model,
        messages: messages,
        temperature: this.temperature,
        max_tokens: this.maxTokens,
        top_p: this.topP,
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
        functions: functionSchemas,
        function_call: 'auto' // Let the model decide when to call functions
      });

      const responseMessage = completion.choices[0].message;
      let finalResponse = responseMessage.content;
      let functionCalls = [];

      // Handle function calls if any
      if (responseMessage.function_call) {
        const functionName = responseMessage.function_call.name;
        const functionArgs = JSON.parse(responseMessage.function_call.arguments);
        
        console.log(`[AI Chat] Function call: ${functionName}`, functionArgs);
        
        // Execute the function
        const functionResult = await executeFunction(functionName, userId, functionArgs);
        
        functionCalls.push({
          name: functionName,
          parameters: functionArgs,
          result: functionResult
        });
        
        // Add function result to messages and get final response
        messages.push(responseMessage);
        messages.push({
          role: 'function',
          name: functionName,
          content: JSON.stringify(functionResult)
        });
        
        // Get final response with function result
        const finalCompletion = await openai.chat.completions.create({
          model: this.model,
          messages: messages,
          temperature: this.temperature,
          max_tokens: this.maxTokens,
          top_p: this.topP
        });
        
        finalResponse = finalCompletion.choices[0].message.content;
      }

      // Adjust final response based on mode and context
      finalResponse = contextManager.adjustResponseForMode(finalResponse);
      
      // Add context awareness to response
      finalResponse = contextManager.generateContextAwareResponse(
        finalResponse,
        referenceInfo,
        queryType
      );

      // Log for debugging
      console.log(`[AI Chat] User: ${userMessage.substring(0, 50)}...`);
      if (referenceInfo.hasReference) {
        console.log(`[AI Chat] Resolved to: ${processedMessage.substring(0, 50)}...`);
      }
      console.log(`[AI Chat] Response: ${finalResponse.substring(0, 50)}...`);
      console.log(`[AI Chat] Tokens used: ${completion.usage?.total_tokens || 'unknown'}`);
      if (functionCalls.length > 0) {
        console.log(`[AI Chat] Functions called: ${functionCalls.map(f => f.name).join(', ')}`);
      }

      return {
        content: finalResponse,
        functionCalls: functionCalls.length > 0 ? functionCalls : null,
        metadata: {
          model: this.model,
          tokens: completion.usage?.total_tokens
        }
      };

    } catch (error) {
      console.error('AI generation error:', error);
      
      // Fallback to mock response with function calling
      return this.getMockResponse(userMessage, context, userId, null);
    }
  }

  buildSystemPrompt(context) {
    let prompt = SYSTEM_PROMPT;

    // Add user context if available
    if (context.userContext?.userProfile?.name) {
      prompt += `\n\nUSER CONTEXT:\n`;
      prompt += `- Name: ${context.userContext.userProfile.name}\n`;
      
      if (context.userContext.userProfile.goals?.length > 0) {
        prompt += `- Goals: ${context.userContext.userProfile.goals.join(', ')}\n`;
      }
      
      if (context.userContext.lastMetrics) {
        const metrics = context.userContext.lastMetrics;
        if (metrics.bmi) prompt += `- Current BMI: ${metrics.bmi}\n`;
        if (metrics.weight) prompt += `- Current Weight: ${metrics.weight} kg\n`;
        if (metrics.wellnessScore) prompt += `- Wellness Score: ${metrics.wellnessScore}/100\n`;
      }
    }

    // Add mode instruction
    if (context.mode === 'detailed') {
      prompt += `\nMODE: Provide detailed, comprehensive responses with explanations and examples.`;
    } else {
      prompt += `\nMODE: Provide concise, focused responses. Be brief but complete.`;
    }

    return prompt;
  }

  async getMockResponse(message, context, userId, referenceInfo = null) {
    const lowerMessage = message.toLowerCase();
    
    // If this is a follow-up, handle it specially
    if (referenceInfo && referenceInfo.hasReference) {
      return this.handleFollowUp(message, context, userId, referenceInfo);
    }
    
    // Check if asking for more details or alternatives
    if (contextManager.isElaborationRequest(message)) {
      return this.handleElaboration(context, userId);
    }
    
    if (contextManager.isAlternativeRequest(message)) {
      return this.handleAlternativeRequest(context, userId);
    }
    
    // Detect conversation type
    const conversationType = this.detectConversationType(message);
    
    // If we have a specialized handler, use it
    if (conversationType) {
      const handlerResult = await this.handleWithSpecializedHandler(
        conversationType, 
        userId, 
        message, 
        context.userContext
      );
      
      if (handlerResult) {
        return {
          content: handlerResult.response,
          functionCalls: handlerResult.functionCalls
        };
      }
    }
    
    // Mock function calling for testing without OpenAI
    let functionCalls = null;
    let responseContent = '';
    
    // Check for sensitive information requests first
    if (lowerMessage.includes('email') || lowerMessage.includes('password') || 
        lowerMessage.includes('phone') || lowerMessage.includes('address') || 
        lowerMessage.includes('social security') || lowerMessage.includes('ssn') ||
        lowerMessage.includes('credit card') || lowerMessage.includes('bank')) {
      
      responseContent = `I understand you're asking about personal information, but for your privacy and security, I don't have access to sensitive data like emails, passwords, phone numbers, or financial information.\n\n`;
      
      if (lowerMessage.includes('email')) {
        responseContent += `If you need to check or update your email address, you can do so in your account settings. I'm here to help with your health and wellness journey instead - things like tracking your fitness progress, meal planning, and wellness insights.\n\n`;
        responseContent += `Is there anything about your health or nutrition I can help you with today?`;
      } else if (lowerMessage.includes('password')) {
        responseContent += `For security reasons, I cannot access or display passwords. If you need to reset your password, please use the "Forgot Password" option on the login page.\n\n`;
        responseContent += `I'm here to assist with your wellness goals instead. Would you like to check your health metrics or meal plan?`;
      } else {
        responseContent += `This helps keep your personal information secure. I'm focused on helping you with health metrics, nutrition planning, and fitness guidance.\n\n`;
        responseContent += `What wellness-related question can I help you with?`;
      }
      
      return {
        content: responseContent,
        functionCalls: null
      };
    }
    
    // Check for medical/diagnostic requests
    if (lowerMessage.includes('diagnose') || lowerMessage.includes('medical condition') || 
        lowerMessage.includes('disease') || lowerMessage.includes('symptom') ||
        lowerMessage.includes('pain') || lowerMessage.includes('doctor') ||
        lowerMessage.includes('medication') || lowerMessage.includes('prescription')) {
      
      responseContent = `I appreciate you reaching out, but I'm not qualified to provide medical advice, diagnoses, or recommendations about medications or symptoms.\n\n`;
      responseContent += `**For medical concerns, please consult with a healthcare professional** who can properly evaluate your situation.\n\n`;
      responseContent += `What I *can* help with:\n`;
      responseContent += `• Tracking your general wellness metrics\n`;
      responseContent += `• Creating healthy meal plans\n`;
      responseContent += `• Suggesting general exercise routines\n`;
      responseContent += `• Providing motivation for your fitness goals\n\n`;
      responseContent += `Is there anything about your general wellness or nutrition I can assist with?`;
      
      return {
        content: responseContent,
        functionCalls: null
      };
    }
    
    // Handle greetings and casual conversation
    if (lowerMessage.match(/^(hi|hello|hey|good morning|good afternoon|good evening)$/i) || 
        lowerMessage.includes('how are you')) {
      
      const userName = context.userContext?.userProfile?.name || 'there';
      const greetings = [
        `Hello ${userName}! I'm here to help with your wellness journey. What would you like to know about today?`,
        `Hi ${userName}! Ready to check on your health progress or plan some nutritious meals?`,
        `Good to see you, ${userName}! How can I assist with your wellness goals today?`
      ];
      
      responseContent = greetings[Math.floor(Math.random() * greetings.length)];
      
      // Add personalized touch if we have their data
      if (context.userContext?.lastMetrics?.wellnessScore) {
        responseContent += `\n\nI see your wellness score is ${context.userContext.lastMetrics.wellnessScore}/100. Would you like to know how to improve it?`;
      }
      
      return {
        content: responseContent,
        functionCalls: null
      };
    }
    
    // Handle thank you
    if (lowerMessage.includes('thank') || lowerMessage.includes('thanks')) {
      responseContent = `You're welcome! I'm always here to support your wellness journey. Is there anything else you'd like to know about your health, nutrition, or fitness?`;
      
      return {
        content: responseContent,
        functionCalls: null
      };
    }
    
    // Fallback handlers for when specialized handlers aren't used or available
    // These provide basic responses without the advanced personalization
    
    // Existing health metrics handler (keeping the old logic as fallback)
    else if (lowerMessage.includes('bmi') || lowerMessage.includes('weight') || lowerMessage.includes('wellness')) {
      // Simulate function call
      const functionResult = await executeFunction('get_health_metrics', userId, {
        metric_type: 'all',
        time_period: 'current'
      });
      
      functionCalls = [{
        name: 'get_health_metrics',
        parameters: { metric_type: 'all', time_period: 'current' },
        result: functionResult
      }];
      
      if (functionResult.data) {
        const data = functionResult.data;
        responseContent = `Based on your health profile:\n\n`;
        
        if (data.bmi) {
          responseContent += `• **BMI:** ${data.bmi.value} (${data.bmi.category})\n`;
        }
        if (data.weight) {
          responseContent += `• **Current Weight:** ${data.weight.current} kg\n`;
          if (data.weight.progressPercentage !== undefined) {
            responseContent += `• **Progress to Goal:** ${data.weight.progressPercentage}%\n`;
          }
        }
        if (data.wellnessScore) {
          responseContent += `• **Wellness Score:** ${data.wellnessScore.overall}/100\n`;
        }
        
        responseContent += `\nKeep up the great work on your wellness journey!`;
      } else {
        responseContent = functionResult.error || 'Unable to retrieve health metrics at this time.';
      }
    }
    else if (lowerMessage.includes('meal') || lowerMessage.includes('breakfast') || lowerMessage.includes('lunch') || lowerMessage.includes('dinner')) {
      // Simulate nutrition function call
      const functionResult = await executeFunction('get_nutrition_data', userId, {
        type: 'meal_plan',
        timeframe: 'today'
      });
      
      functionCalls = [{
        name: 'get_nutrition_data',
        parameters: { type: 'meal_plan', timeframe: 'today' },
        result: functionResult
      }];
      
      if (functionResult.data && functionResult.data.data) {
        responseContent = `Here's your meal plan for today:\n\n`;
        const meals = functionResult.data.data.meals || [];
        
        meals.forEach(meal => {
          responseContent += `**${meal.type}:**\n`;
          responseContent += `• ${meal.name}\n`;
          if (meal.nutrition) {
            responseContent += `  Calories: ${meal.nutrition.calories}, Protein: ${meal.nutrition.protein}g\n`;
          }
          responseContent += '\n';
        });
        
        if (functionResult.data.nutritionSummary) {
          const summary = functionResult.data.nutritionSummary;
          responseContent += `**Daily Totals:** ${summary.calories} calories, ${summary.protein} protein, ${summary.carbs} carbs, ${summary.fat} fat`;
        }
      } else {
        responseContent = 'No meal plan found. Would you like me to help you create one?';
      }
    }
    else if (lowerMessage.includes('dietary') || lowerMessage.includes('preference') || lowerMessage.includes('allergi')) {
      // Get dietary preferences
      const functionResult = await executeFunction('get_nutrition_data', userId, {
        type: 'preferences',
        timeframe: 'today'
      });
      
      functionCalls = [{
        name: 'get_nutrition_data',
        parameters: { type: 'preferences' },
        result: functionResult
      }];
      
      if (functionResult.data && functionResult.data.data) {
        const prefs = functionResult.data.data;
        responseContent = `Here are your dietary preferences:\n\n`;
        
        if (prefs.dietary && prefs.dietary.length > 0) {
          responseContent += `**Dietary Preferences:**\n`;
          prefs.dietary.forEach(pref => {
            responseContent += `• ${pref}\n`;
          });
          responseContent += '\n';
        }
        
        if (prefs.allergies && prefs.allergies.length > 0) {
          responseContent += `**Allergies:**\n`;
          prefs.allergies.forEach(allergy => {
            responseContent += `• ${allergy}\n`;
          });
          responseContent += '\n';
        }
        
        responseContent += `**Daily Targets:**\n`;
        responseContent += `• Calorie Target: ${prefs.calorieTarget} kcal\n`;
        responseContent += `• Meals per Day: ${prefs.mealFrequency}\n`;
        
        if (prefs.cuisinePreferences && prefs.cuisinePreferences.length > 0) {
          responseContent += `\n**Preferred Cuisines:**\n`;
          prefs.cuisinePreferences.forEach(cuisine => {
            responseContent += `• ${cuisine}\n`;
          });
        }
      } else {
        responseContent = 'No dietary preferences found. Would you like to set up your nutrition preferences? This will help me provide better meal recommendations.';
      }
    }
    else if (lowerMessage.includes('progress')) {
      // Simulate progress function call
      const functionResult = await executeFunction('get_progress_summary', userId, {
        goal_type: 'all',
        include_recommendations: true
      });
      
      functionCalls = [{
        name: 'get_progress_summary',
        parameters: { goal_type: 'all', include_recommendations: true },
        result: functionResult
      }];
      
      if (functionResult.data) {
        const data = functionResult.data;
        responseContent = `Here's your progress summary:\n\n`;
        
        if (data.weightProgress) {
          responseContent += `**Weight Progress:**\n`;
          responseContent += `• Current: ${data.weightProgress.current}\n`;
          responseContent += `• Target: ${data.weightProgress.target}\n`;
          responseContent += `• Progress: ${data.weightProgress.progressPercentage}%\n\n`;
        }
        
        if (data.recommendations && data.recommendations.length > 0) {
          responseContent += `**Recommendations:**\n`;
          data.recommendations.forEach(rec => {
            responseContent += `• ${rec}\n`;
          });
        }
      } else {
        responseContent = 'Unable to retrieve progress data. Please ensure your health profile is complete.';
      }
    }
    else if (lowerMessage.includes('exercise') || lowerMessage.includes('workout') || lowerMessage.includes('fitness')) {
      // Get exercise recommendations
      const functionResult = await executeFunction('get_general_insights', userId, {
        topic: 'exercise'
      });
      
      functionCalls = [{
        name: 'get_general_insights',
        parameters: { topic: 'exercise' },
        result: functionResult
      }];
      
      // Also get user's fitness level for personalized advice
      const metricsResult = await executeFunction('get_health_metrics', userId, {
        metric_type: 'all',
        time_period: 'current'
      });
      
      if (functionResult.data) {
        responseContent = `Based on your profile, here are exercise recommendations:\n\n`;
        
        // Add personalized intro based on activity level
        if (metricsResult.data && metricsResult.data.goals) {
          const activityLevel = metricsResult.data.goals.activityLevel;
          const primaryGoal = metricsResult.data.goals.primary;
          
          responseContent += `**Your Profile:**\n`;
          responseContent += `• Current Activity Level: ${activityLevel}\n`;
          responseContent += `• Primary Goal: ${primaryGoal.replace(/_/g, ' ')}\n\n`;
          
          responseContent += `**Recommended Exercises:**\n`;
          
          // Personalized recommendations based on goals
          if (primaryGoal === 'weight_loss') {
            responseContent += `• Cardio: 30-45 min brisk walking or cycling (5x/week)\n`;
            responseContent += `• HIIT: 20 min high-intensity intervals (2x/week)\n`;
            responseContent += `• Strength: Full body workouts (2x/week)\n`;
          } else if (primaryGoal === 'muscle_gain') {
            responseContent += `• Strength Training: 45-60 min (4x/week)\n`;
            responseContent += `• Compound Exercises: Squats, deadlifts, bench press\n`;
            responseContent += `• Light Cardio: 20 min walking (2-3x/week)\n`;
          } else {
            responseContent += `• Cardio: 30 min moderate activity (3-4x/week)\n`;
            responseContent += `• Strength: 30 min resistance training (2x/week)\n`;
            responseContent += `• Flexibility: 10 min stretching daily\n`;
          }
          
          responseContent += `\n**General Tips:**\n`;
        }
        
        // Add general insights
        functionResult.data.insights.forEach(insight => {
          responseContent += `• ${insight}\n`;
        });
      } else {
        responseContent = 'Here are general exercise recommendations:\n\n• Start with 150 minutes of moderate exercise per week\n• Include both cardio and strength training\n• Begin with activities you enjoy\n• Gradually increase intensity over time';
      }
    }
    else if (lowerMessage.includes('water') || lowerMessage.includes('hydration') || lowerMessage.includes('drink')) {
      // Get hydration insights
      const functionResult = await executeFunction('get_general_insights', userId, {
        topic: 'hydration'
      });
      
      functionCalls = [{
        name: 'get_general_insights',
        parameters: { topic: 'hydration' },
        result: functionResult
      }];
      
      if (functionResult.data && functionResult.data.insights) {
        responseContent = `**Hydration Recommendations:**\n\n`;
        functionResult.data.insights.forEach(insight => {
          responseContent += `• ${insight}\n`;
        });
      } else {
        responseContent = 'Stay hydrated! Aim for 8-10 glasses of water per day, more if you exercise.';
      }
    }
    else if (lowerMessage.includes('sleep')) {
      // Get sleep insights
      const functionResult = await executeFunction('get_general_insights', userId, {
        topic: 'sleep'
      });
      
      functionCalls = [{
        name: 'get_general_insights',
        parameters: { topic: 'sleep' },
        result: functionResult
      }];
      
      if (functionResult.data && functionResult.data.insights) {
        responseContent = `**Sleep Recommendations:**\n\n`;
        functionResult.data.insights.forEach(insight => {
          responseContent += `• ${insight}\n`;
        });
      } else {
        responseContent = 'Good sleep is crucial! Aim for 7-9 hours per night with consistent sleep and wake times.';
      }
    }
    else {
      // Default helpful response
      responseContent = `I can help you with:\n\n`;
      responseContent += `**Health Metrics:**\n`;
      responseContent += `• Check your BMI, weight, and wellness score\n`;
      responseContent += `• Track your progress towards goals\n\n`;
      responseContent += `**Nutrition:**\n`;
      responseContent += `• View your meal plans and recipes\n`;
      responseContent += `• Check dietary preferences and allergies\n`;
      responseContent += `• Get nutritional analysis\n\n`;
      responseContent += `**Fitness & Wellness:**\n`;
      responseContent += `• Get exercise recommendations\n`;
      responseContent += `• Receive sleep and hydration tips\n`;
      responseContent += `• General wellness insights\n\n`;
      responseContent += `Try asking: "What's my BMI?", "Show me today's meal plan", or "What exercises should I do?"`;
    }
    
    return {
      content: responseContent,
      functionCalls: null
    };
  }

  /**
   * Handle follow-up questions with context
   */
  async handleFollowUp(message, context, userId, referenceInfo) {
    const resolved = referenceInfo.resolvedMessage;
    const lowerMessage = message.toLowerCase();
    console.log(`[Follow-up] Type: ${referenceInfo.referenceType}, Message: "${message}" → "${resolved}"`);
    
    // Handle specific follow-up types
    if (referenceInfo.referenceType === 'evaluation') {
      return this.handleEvaluation(context, userId);
    }
    
    if (referenceInfo.referenceType === 'explanation') {
      return this.handleExplanation(context, userId);
    }
    
    if (referenceInfo.referenceType === 'improvement') {
      return this.handleImprovementRequest(context, userId);
    }
    
    // Check for improvement questions even without perfect reference detection
    if (lowerMessage.includes('improve') || lowerMessage.includes('better') || 
        lowerMessage.includes('increase') || lowerMessage.includes('boost') ||
        lowerMessage.includes('enhance') || lowerMessage.includes('optimize')) {
      return this.handleImprovementRequest(context, userId);
    }
    
    // Get the appropriate response based on resolved message
    const response = await this.getMockResponse(resolved, context, userId, null);
    
    // Add acknowledgment of the reference
    const acknowledgments = {
      'elaboration': 'Let me provide more details:\n\n',
      'explanation': 'Let me explain:\n\n',
      'evaluation': 'Let me evaluate that:\n\n',
      'modification': 'I\'ll help you with that change:\n\n',
      'permission': 'Regarding your question:\n\n'
    };
    
    const prefix = acknowledgments[referenceInfo.referenceType] || 'About that:\n\n';
    
    if (response.content) {
      response.content = prefix + response.content;
    }
    
    return response;
  }

  /**
   * Handle evaluation questions like "is that good?"
   */
  async handleEvaluation(context, userId) {
    const lastMetric = contextManager.mentionedEntities.metric;
    const lastMeal = contextManager.mentionedEntities.meal;
    let responseContent = '';
    
    // Get user's latest metrics for context
    const metricsResult = await executeFunction('get_health_metrics', userId, {
      metric_type: 'all',
      time_period: 'current'
    });
    
    if (lastMetric === 'BMI' || (metricsResult.data && metricsResult.data.bmi)) {
      const bmi = metricsResult.data?.bmi?.value || 22.3;
      
      responseContent = `Yes, your BMI of **${bmi}** is good! Here's why:\n\n`;
      
      if (bmi >= 18.5 && bmi < 25) {
        responseContent += `✅ **You're in the healthy range** (18.5-24.9)\n`;
        responseContent += `• Lower risk of heart disease and diabetes\n`;
        responseContent += `• Good balance between muscle and fat\n`;
        responseContent += `• Optimal range for most physical activities\n\n`;
        responseContent += `**Keep doing what you're doing!** Your current weight management is working well.`;
      } else if (bmi < 18.5) {
        responseContent = `Your BMI of **${bmi}** is below the healthy range:\n\n`;
        responseContent += `⚠️ **Underweight** (below 18.5)\n`;
        responseContent += `• May indicate insufficient nutrition\n`;
        responseContent += `• Could affect energy levels and immune system\n\n`;
        responseContent += `**Recommendation:** Consider increasing caloric intake with nutrient-dense foods.`;
      } else if (bmi >= 25 && bmi < 30) {
        responseContent = `Your BMI of **${bmi}** is slightly elevated:\n\n`;
        responseContent += `⚠️ **Overweight range** (25-29.9)\n`;
        responseContent += `• Slightly increased health risks\n`;
        responseContent += `• May benefit from modest weight loss\n\n`;
        responseContent += `**Recommendation:** Small changes to diet and exercise can help you reach the healthy range.`;
      } else {
        responseContent = `Your BMI of **${bmi}** indicates obesity:\n\n`;
        responseContent += `⚠️ **Needs attention** (30+)\n`;
        responseContent += `• Increased risk of health complications\n`;
        responseContent += `• Would benefit from weight management\n\n`;
        responseContent += `**Recommendation:** Consider consulting with a healthcare provider for a personalized plan.`;
      }
    } else if (lastMetric === 'wellness score' || contextManager.currentTopic === 'health_metrics') {
      const score = metricsResult.data?.wellnessScore?.overall || 90;
      
      if (score >= 80) {
        responseContent = `**Excellent!** Your wellness score of ${score}/100 is fantastic! 🎉\n\n`;
        responseContent += `This means:\n`;
        responseContent += `• You're maintaining healthy habits consistently\n`;
        responseContent += `• Your lifestyle choices are supporting your health\n`;
        responseContent += `• You're on track with your wellness goals\n\n`;
        responseContent += `Keep up the amazing work!`;
      } else if (score >= 60) {
        responseContent = `**Good!** Your wellness score of ${score}/100 is solid.\n\n`;
        responseContent += `This indicates:\n`;
        responseContent += `• You're doing well in most areas\n`;
        responseContent += `• There's room for improvement\n`;
        responseContent += `• You have a good foundation to build on\n\n`;
        responseContent += `Focus on your weakest area to boost your score further.`;
      } else {
        responseContent = `Your wellness score of ${score}/100 has room for improvement.\n\n`;
        responseContent += `This suggests:\n`;
        responseContent += `• Several areas need attention\n`;
        responseContent += `• Small changes can make a big difference\n\n`;
        responseContent += `Let's work on improving one area at a time!`;
      }
    } else if (lastMeal) {
      responseContent = `Yes, that's a good choice for ${lastMeal}!\n\n`;
      responseContent += `It provides:\n`;
      responseContent += `• Balanced macronutrients\n`;
      responseContent += `• Good energy for your day\n`;
      responseContent += `• Aligns with your calorie goals\n\n`;
      responseContent += `Feel free to enjoy it!`;
    } else {
      responseContent = `Based on what we just discussed, yes, that looks good!\n\n`;
      responseContent += `You're on the right track with your wellness journey. `;
      responseContent += `Keep making those positive choices!`;
    }
    
    return {
      content: responseContent,
      functionCalls: metricsResult.data ? [{
        name: 'get_health_metrics',
        parameters: { metric_type: 'all', time_period: 'current' },
        result: metricsResult
      }] : null
    };
  }

  /**
   * Handle improvement requests like "how can I improve it?"
   */
  async handleImprovementRequest(context, userId) {
    const lastMetric = contextManager.mentionedEntities.metric;
    const lastTopic = contextManager.currentTopic;
    let responseContent = '';
    
    // Get current metrics for context
    const metricsResult = await executeFunction('get_health_metrics', userId, {
      metric_type: 'all',
      time_period: 'current'
    });
    
    if (lastMetric === 'BMI' || lastTopic === 'health_metrics') {
      const bmi = metricsResult.data?.bmi?.value || 22.3;
      
      responseContent = `Here's how to improve your BMI and overall health:\n\n`;
      
      if (bmi >= 18.5 && bmi < 25) {
        responseContent += `**You're already in the healthy range!** To maintain or optimize:\n\n`;
        responseContent += `**1. Stay Active:**\n`;
        responseContent += `• Aim for 150 minutes of moderate exercise weekly\n`;
        responseContent += `• Include strength training 2-3x per week\n\n`;
        responseContent += `**2. Balanced Nutrition:**\n`;
        responseContent += `• Focus on whole foods\n`;
        responseContent += `• Maintain consistent meal timing\n\n`;
        responseContent += `**3. Healthy Habits:**\n`;
        responseContent += `• Prioritize 7-9 hours of sleep\n`;
        responseContent += `• Stay hydrated (aim for 2-3L water daily)\n`;
        responseContent += `• Manage stress through meditation or yoga`;
      } else if (bmi < 18.5) {
        responseContent += `**To gain healthy weight:**\n\n`;
        responseContent += `**1. Increase Calories:**\n`;
        responseContent += `• Add 300-500 calories to daily intake\n`;
        responseContent += `• Focus on nutrient-dense foods\n`;
        responseContent += `• Include healthy fats (nuts, avocados)\n\n`;
        responseContent += `**2. Build Muscle:**\n`;
        responseContent += `• Strength training 3-4x per week\n`;
        responseContent += `• Increase protein intake (1.6g per kg body weight)\n\n`;
        responseContent += `**3. Meal Frequency:**\n`;
        responseContent += `• Eat 5-6 smaller meals throughout the day\n`;
        responseContent += `• Never skip breakfast`;
      } else {
        responseContent += `**To reach a healthier BMI:**\n\n`;
        responseContent += `**1. Create Calorie Deficit:**\n`;
        responseContent += `• Reduce daily intake by 300-500 calories\n`;
        responseContent += `• Track your meals for awareness\n\n`;
        responseContent += `**2. Increase Activity:**\n`;
        responseContent += `• Start with 30-minute daily walks\n`;
        responseContent += `• Gradually add strength training\n`;
        responseContent += `• Aim for 10,000 steps daily\n\n`;
        responseContent += `**3. Nutrition Changes:**\n`;
        responseContent += `• Increase protein and fiber\n`;
        responseContent += `• Reduce processed foods\n`;
        responseContent += `• Control portion sizes`;
      }
      
      responseContent += `\n\n💡 **Start with one small change this week!**`;
      
    } else if (lastMetric === 'wellness score') {
      const score = metricsResult.data?.wellnessScore?.overall || 90;
      const components = metricsResult.data?.wellnessScore?.components || {};
      
      // Find weakest component
      let weakestArea = 'habits';
      let lowestScore = 25;
      
      Object.entries(components).forEach(([key, value]) => {
        if (value < lowestScore) {
          weakestArea = key;
          lowestScore = value;
        }
      });
      
      responseContent = `To improve your wellness score from ${score}/100:\n\n`;
      responseContent += `**Focus on your weakest area: ${weakestArea}**\n\n`;
      
      const improvements = {
        'bmi': [
          '• Work towards optimal BMI range (18.5-24.9)',
          '• Track weight weekly, not daily',
          '• Focus on body composition, not just weight'
        ],
        'activity': [
          '• Increase daily movement (aim for 10,000 steps)',
          '• Add 30 minutes of exercise 5x per week',
          '• Try different activities to find what you enjoy'
        ],
        'progress': [
          '• Set specific, measurable goals',
          '• Track your metrics consistently',
          '• Celebrate small victories along the way'
        ],
        'habits': [
          '• Establish a consistent sleep schedule',
          '• Practice stress management daily',
          '• Build one healthy habit at a time'
        ]
      };
      
      const tips = improvements[weakestArea] || improvements['habits'];
      tips.forEach(tip => {
        responseContent += `${tip}\n`;
      });
      
      responseContent += `\n**Quick wins for this week:**\n`;
      responseContent += `1. Choose one item from above to start\n`;
      responseContent += `2. Track it daily for accountability\n`;
      responseContent += `3. Review progress next week\n\n`;
      responseContent += `Small consistent improvements lead to big results!`;
      
    } else {
      // General improvement advice
      responseContent = `Here are ways to improve your overall wellness:\n\n`;
      responseContent += `**1. Physical Activity:**\n`;
      responseContent += `• Start with 20-minute daily walks\n`;
      responseContent += `• Add strength training 2x per week\n\n`;
      responseContent += `**2. Nutrition:**\n`;
      responseContent += `• Eat more whole foods\n`;
      responseContent += `• Stay hydrated (8-10 glasses water)\n\n`;
      responseContent += `**3. Recovery:**\n`;
      responseContent += `• Prioritize 7-9 hours sleep\n`;
      responseContent += `• Practice stress management\n\n`;
      responseContent += `Which area would you like to focus on first?`;
    }
    
    return {
      content: responseContent,
      functionCalls: metricsResult.data ? [{
        name: 'get_health_metrics',
        parameters: { metric_type: 'all', time_period: 'current' },
        result: metricsResult
      }] : null
    };
  }

  /**
   * Handle explanation requests like "why is that?"
   */
  async handleExplanation(context, userId) {
    const lastMetric = contextManager.mentionedEntities.metric;
    let responseContent = 'Let me explain why:\n\n';
    
    if (lastMetric === 'BMI') {
      responseContent += `**BMI (Body Mass Index) matters because:**\n\n`;
      responseContent += `• It's a screening tool for health risks\n`;
      responseContent += `• Correlates with various health conditions\n`;
      responseContent += `• Helps track weight changes over time\n\n`;
      responseContent += `**However, remember:**\n`;
      responseContent += `• It doesn't measure body fat directly\n`;
      responseContent += `• Doesn't distinguish muscle from fat\n`;
      responseContent += `• Should be considered alongside other health markers\n\n`;
      responseContent += `Your BMI is just one piece of your overall health picture!`;
    } else if (lastMetric === 'wellness score') {
      responseContent += `**Your wellness score is calculated from:**\n\n`;
      responseContent += `• **BMI (25%)**: Your weight-to-height ratio\n`;
      responseContent += `• **Activity (25%)**: Exercise frequency and intensity\n`;
      responseContent += `• **Progress (25%)**: Movement towards your goals\n`;
      responseContent += `• **Habits (25%)**: Sleep, nutrition, stress management\n\n`;
      responseContent += `Each component contributes equally to give you a holistic view of your wellness.`;
    } else {
      responseContent += `This recommendation is based on:\n\n`;
      responseContent += `• Current health guidelines\n`;
      responseContent += `• Your personal profile and goals\n`;
      responseContent += `• Evidence-based wellness practices\n\n`;
      responseContent += `The goal is to help you achieve sustainable, long-term health improvements.`;
    }
    
    return {
      content: responseContent,
      functionCalls: null
    };
  }

  /**
   * Handle requests for more information
   */
  async handleElaboration(context, userId) {
    const lastTopic = contextManager.currentTopic;
    const lastEntities = contextManager.mentionedEntities;
    
    let responseContent = 'Let me provide additional details:\n\n';
    
    // Provide more details based on last topic
    if (lastTopic === 'health_metrics' && lastEntities.metric) {
      const functionResult = await executeFunction('get_health_metrics', userId, {
        metric_type: 'all',
        time_period: 'monthly'
      });
      
      if (functionResult.data) {
        responseContent += `**Extended Health Analysis:**\n\n`;
        
        // Add trend analysis
        if (functionResult.data.trend) {
          responseContent += `**30-Day Trend:**\n`;
          responseContent += `• Starting point: ${functionResult.data.trend.startValue} kg\n`;
          responseContent += `• Current: ${functionResult.data.trend.endValue} kg\n`;
          responseContent += `• Total change: ${functionResult.data.trend.change} kg\n`;
          responseContent += `• Data points tracked: ${functionResult.data.trend.dataPoints}\n\n`;
        }
        
        // Add component breakdown
        if (functionResult.data.wellnessScore?.components) {
          responseContent += `**Wellness Score Components:**\n`;
          const components = functionResult.data.wellnessScore.components;
          Object.entries(components).forEach(([key, value]) => {
            responseContent += `• ${key}: ${value}/25\n`;
          });
        }
      }
      
      return {
        content: responseContent,
        functionCalls: [{
          name: 'get_health_metrics',
          parameters: { metric_type: 'all', time_period: 'monthly' },
          result: functionResult
        }]
      };
    }
    
    // Default elaboration
    responseContent += `Based on our previous discussion about ${lastTopic || 'your wellness'}, `;
    responseContent += `here are some additional insights:\n\n`;
    responseContent += `• Consider tracking your progress daily for better insights\n`;
    responseContent += `• Small consistent changes lead to lasting results\n`;
    responseContent += `• Remember to celebrate small victories\n\n`;
    responseContent += `Would you like specific details about any particular aspect?`;
    
    return {
      content: responseContent,
      functionCalls: null
    };
  }

  /**
   * Handle requests for alternatives
   */
  async handleAlternativeRequest(context, userId) {
    const lastEntities = contextManager.mentionedEntities;
    let responseContent = '';
    
    // Provide alternatives based on what was discussed
    if (lastEntities.meal) {
      responseContent = `Here are alternative options for ${lastEntities.meal}:\n\n`;
      
      // Get meal alternatives
      const mealAlternatives = {
        breakfast: [
          '**Option 1:** Overnight oats with chia seeds and berries',
          '**Option 2:** Vegetable omelet with whole grain toast',
          '**Option 3:** Smoothie bowl with granola and nuts'
        ],
        lunch: [
          '**Option 1:** Grilled chicken salad with quinoa',
          '**Option 2:** Turkey and avocado wrap',
          '**Option 3:** Lentil soup with mixed vegetables'
        ],
        dinner: [
          '**Option 1:** Baked salmon with roasted vegetables',
          '**Option 2:** Stir-fried tofu with brown rice',
          '**Option 3:** Lean beef with sweet potato'
        ]
      };
      
      const alternatives = mealAlternatives[lastEntities.meal] || [
        '**Option 1:** Grilled protein with vegetables',
        '**Option 2:** Whole grain bowl with legumes',
        '**Option 3:** Soup or salad with lean protein'
      ];
      
      alternatives.forEach(alt => {
        responseContent += `${alt}\n`;
      });
      
      responseContent += `\nAll options are balanced and nutritious. Which one appeals to you?`;
      
    } else if (lastEntities.exercise) {
      responseContent = `Here are alternative exercises:\n\n`;
      responseContent += `• **Low Impact:** Swimming, yoga, walking\n`;
      responseContent += `• **Moderate:** Cycling, dancing, hiking\n`;
      responseContent += `• **High Intensity:** Running, HIIT, CrossFit\n\n`;
      responseContent += `Choose based on your fitness level and preferences.`;
      
    } else {
      responseContent = `I'd be happy to suggest alternatives! Could you specify what you'd like alternatives for?\n\n`;
      responseContent += `I can provide alternatives for:\n`;
      responseContent += `• Meals and recipes\n`;
      responseContent += `• Exercise routines\n`;
      responseContent += `• Wellness strategies\n`;
    }
    
    return {
      content: responseContent,
      functionCalls: null
    };
  }
}

module.exports = new AIChatService();