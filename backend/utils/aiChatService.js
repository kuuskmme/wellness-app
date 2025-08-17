// backend/utils/aiChatService.js
const { OpenAI } = require('openai');

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
  {
    role: "user",
    content: "What's my wellness score?"
  },
  {
    role: "assistant", 
    content: "Your **wellness score is 82/100**, which is excellent! Here's the breakdown:\n• **BMI component:** 22/25 points\n• **Activity level:** 20/25 points\n• **Progress tracking:** 23/25 points\n• **Healthy habits:** 17/25 points\n\nYou're doing particularly well with progress tracking. To improve further, try adding more regular exercise sessions."
  }
];

class AIChatService {
  constructor() {
    this.model = process.env.AI_MODEL || 'gpt-3.5-turbo';
    this.temperature = 0.6; // Lower for consistency
    this.maxTokens = 500;
    this.topP = 0.95; // For relevance
  }

  async generateResponse(conversation, userMessage, userId) {
    try {
      // Get conversation context
      const context = conversation.getContextForAI();
      
      // Build messages array with system prompt and history
      const messages = [
        { role: 'system', content: this.buildSystemPrompt(context) },
        ...FEW_SHOT_EXAMPLES,
        ...context.messages
      ];

      // If no OpenAI key, return mock response
      if (!openai) {
        return this.getMockResponse(userMessage, context);
      }

      // Call OpenAI API
      const completion = await openai.chat.completions.create({
        model: this.model,
        messages: messages,
        temperature: this.temperature,
        max_tokens: this.maxTokens,
        top_p: this.topP,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      });

      const response = completion.choices[0].message.content;

      // Log for debugging
      console.log(`[AI Chat] User: ${userMessage.substring(0, 50)}...`);
      console.log(`[AI Chat] Response: ${response.substring(0, 50)}...`);
      console.log(`[AI Chat] Tokens used: ${completion.usage?.total_tokens || 'unknown'}`);

      return {
        content: response,
        functionCalls: null, // Will be implemented in Step 2
        metadata: {
          model: this.model,
          tokens: completion.usage?.total_tokens
        }
      };

    } catch (error) {
      console.error('AI generation error:', error);
      
      // Fallback to mock response
      return this.getMockResponse(userMessage, context);
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

  getMockResponse(message, context) {
    const lowerMessage = message.toLowerCase();
    
    // Mock responses for different query types
    if (lowerMessage.includes('bmi')) {
      return {
        content: `Based on your profile, your **BMI is 24.2**, which is in the normal range (18.5-24.9). This indicates you're at a healthy weight for your height. Keep maintaining your current healthy lifestyle!`,
        functionCalls: null
      };
    }
    
    if (lowerMessage.includes('meal') || lowerMessage.includes('breakfast')) {
      return {
        content: `Here's a healthy breakfast suggestion:\n\n• **Oatmeal bowl** with berries and nuts\n• **Greek yogurt** (150g) for protein\n• **Whole grain toast** with avocado\n• **Fresh orange juice** or green tea\n\nThis provides approximately **450 calories** with a good balance of protein, carbs, and healthy fats.`,
        functionCalls: null
      };
    }
    
    if (lowerMessage.includes('wellness') || lowerMessage.includes('score')) {
      return {
        content: `Your **wellness score is 78/100**, which is good! Here's your breakdown:\n\n• **Physical health:** 20/25\n• **Activity level:** 18/25\n• **Nutrition:** 22/25\n• **Progress:** 18/25\n\nYou're doing well with nutrition! Consider adding more physical activity to boost your score further.`,
        functionCalls: null
      };
    }
    
    // Default response
    return {
      content: `I understand you're asking about "${message.substring(0, 30)}...". As your wellness assistant, I'm here to help with health metrics, nutrition planning, and fitness guidance. Could you please be more specific about what you'd like to know?`,
      functionCalls: null
    };
  }
}

module.exports = new AIChatService();