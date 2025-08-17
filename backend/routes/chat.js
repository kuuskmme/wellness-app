// backend/routes/chat.js
const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const HealthProfile = require('../models/HealthProfile');
const { verifyToken } = require('../middleware/auth');
const aiChatService = require('../utils/aiChatService');
const securityValidator = require('../utils/securityValidator');
const requestTracer = require('../utils/requestTracer');

// Apply rate limiting (if apiLimiter is available)
// router.use(apiLimiter);

// All routes require authentication
router.use(verifyToken);

// Start or get chat session
router.post('/start', async (req, res) => {
  try {
    // Find or create conversation session
    const conversation = await Conversation.findOrCreateSession(req.userId);
    
    // Get user's health profile for context
    const healthProfile = await HealthProfile.findOne({ userId: req.userId });
    
    // Update conversation context if profile exists
    if (healthProfile) {
      conversation.context = {
        userProfile: {
          name: healthProfile.demographics?.name || 'User',
          goals: healthProfile.fitnessGoals ? [
            healthProfile.fitnessGoals.primary,
            ...(healthProfile.fitnessGoals.secondary || [])
          ] : [],
          preferences: {
            activityLevel: healthProfile.lifestyleIndicators?.activityLevel,
            dietaryRestrictions: healthProfile.dietaryRestrictions
          }
        },
        lastMetrics: {
          bmi: healthProfile.physicalMetrics?.bmi?.value,
          weight: healthProfile.physicalMetrics?.weight?.value,
          wellnessScore: healthProfile.wellnessScore?.overall
        }
      };
      await conversation.save();
    }
    
    res.json({
      sessionId: conversation.sessionId,
      status: conversation.status,
      messageCount: conversation.metadata.messageCount,
      context: conversation.context
    });
  } catch (error) {
    console.error('Chat session error:', error);
    res.status(500).json({ 
      message: 'Failed to start chat session',
      error: error.message 
    });
  }
});

// Get conversation history
router.get('/history/:sessionId?', async (req, res) => {
  try {
    const query = { userId: req.userId };
    
    if (req.params.sessionId) {
      query.sessionId = req.params.sessionId;
    } else {
      query.status = 'active';
    }
    
    const conversation = await Conversation.findOne(query)
      .sort({ 'metadata.lastInteraction': -1 });
    
    if (!conversation) {
      return res.json({
        messages: [],
        sessionId: null
      });
    }
    
    res.json({
      sessionId: conversation.sessionId,
      messages: conversation.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp
      })),
      status: conversation.status,
      mode: conversation.metadata.mode
    });
  } catch (error) {
    console.error('History fetch error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch conversation history',
      error: error.message 
    });
  }
});

// Send message to AI assistant
router.post('/message', async (req, res) => {
  let traceId = null;
  
  try {
    const { message, sessionId, mode = 'concise' } = req.body;
    
    // Start tracing
    traceId = requestTracer.startTrace(sessionId || 'new', req.userId, message);
    requestTracer.addStep(traceId, 'Request received', { mode });
    
    // Security validation
    requestTracer.addStep(traceId, 'Security validation');
    const validation = securityValidator.validateMessage(message, req.userId);
    
    if (!validation.isValid) {
      requestTracer.addStep(traceId, 'Security blocked', { 
        reason: validation.reason,
        severity: validation.severity 
      });
      
      // Log security event
      console.warn(`[Security] Blocked message from user ${req.userId}: ${validation.reason}`);
      
      // Return suggested response or generic security message
      const response = validation.suggestedResponse || 
        'I can only help with wellness-related topics. Please ask about health, nutrition, or fitness.';
      
      requestTracer.endTrace(traceId, response);
      
      return res.json({
        response: response,
        sessionId: sessionId,
        blocked: true,
        reason: validation.reason
      });
    }
    
    // Input validation
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ 
        message: 'Please provide a message' 
      });
    }
    
    // Validate message length
    if (message.length > 1000) {
      return res.status(400).json({ 
        message: 'Message too long. Please keep it under 1000 characters.' 
      });
    }
    
    // Get or create conversation
    requestTracer.addStep(traceId, 'Get conversation');
    let conversation;
    if (sessionId) {
      conversation = await Conversation.findOne({
        sessionId,
        userId: req.userId
      });
    }
    
    if (!conversation) {
      conversation = await Conversation.findOrCreateSession(req.userId);
      requestTracer.addStep(traceId, 'Created new conversation', { 
        sessionId: conversation.sessionId 
      });
    }
    
    // Update mode if changed
    if (mode !== conversation.metadata.mode) {
      conversation.metadata.mode = mode;
    }
    
    // Add user message
    requestTracer.addStep(traceId, 'Add user message');
    await conversation.addMessage('user', message);
    
    // Get AI response
    requestTracer.addStep(traceId, 'Generate AI response');
    const aiResponse = await aiChatService.generateResponse(
      conversation,
      message,
      req.userId
    );
    
    // Record function calls and tokens
    if (aiResponse.functionCalls) {
      aiResponse.functionCalls.forEach(fc => {
        requestTracer.recordFunctionCall(traceId, fc.name, fc.parameters, fc.result);
      });
    }
    if (aiResponse.metadata?.tokens) {
      requestTracer.recordTokens(traceId, aiResponse.metadata.tokens);
    }
    
    // Add assistant message
    requestTracer.addStep(traceId, 'Save assistant message');
    await conversation.addMessage(
      'assistant', 
      aiResponse.content,
      aiResponse.functionCalls
    );
    
    // End trace
    requestTracer.endTrace(traceId, aiResponse.content);
    
    res.json({
      response: aiResponse.content,
      sessionId: conversation.sessionId,
      functionCalls: aiResponse.functionCalls,
      timestamp: new Date()
    });
    
  } catch (error) {
    console.error('Message processing error:', error);
    
    // Record error in trace
    if (traceId) {
      requestTracer.recordError(traceId, error, { 
        endpoint: '/message',
        userId: req.userId 
      });
      requestTracer.endTrace(traceId, null);
    }
    
    // Provide user-friendly error messages
    let errorMessage = 'Failed to process your message. Please try again.';
    
    if (error.message?.includes('API')) {
      errorMessage = 'AI service is temporarily unavailable. Please try again later.';
    } else if (error.message?.includes('timeout')) {
      errorMessage = 'Request timed out. Please try again with a shorter message.';
    }
    
    res.status(500).json({ 
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update conversation modee
router.put('/mode', async (req, res) => {
  try {
    const { sessionId, mode } = req.body;
    
    if (!['concise', 'detailed'].includes(mode)) {
      return res.status(400).json({ 
        message: 'Invalid mode. Choose "concise" or "detailed"' 
      });
    }
    
    const conversation = await Conversation.findOne({
      sessionId,
      userId: req.userId
    });
    
    if (!conversation) {
      return res.status(404).json({ 
        message: 'Conversation not found' 
      });
    }
    
    conversation.metadata.mode = mode;
    await conversation.save();
    
    res.json({
      message: `Mode updated to ${mode}`,
      mode
    });
  } catch (error) {
    console.error('Mode update error:', error);
    res.status(500).json({ 
      message: 'Failed to update conversation mode',
      error: error.message 
    });
  }
});

// End conversation
router.post('/end', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    const conversation = await Conversation.findOne({
      sessionId,
      userId: req.userId
    });
    
    if (!conversation) {
      return res.status(404).json({ 
        message: 'Conversation not found' 
      });
    }
    
    conversation.status = 'ended';
    await conversation.save();
    
    // Clear security validator history for this session
    securityValidator.clearHistory();
    
    res.json({
      message: 'Conversation ended',
      sessionId
    });
  } catch (error) {
    console.error('End conversation error:', error);
    res.status(500).json({ 
      message: 'Failed to end conversation',
      error: error.message 
    });
  }
});

// Debug endpoint (development only)
if (process.env.NODE_ENV === 'development') {
  router.get('/debug/traces', verifyToken, async (req, res) => {
    const traces = requestTracer.exportTraces();
    res.json(traces);
  });
  
  router.get('/debug/stats', verifyToken, async (req, res) => {
    const stats = requestTracer.getStatistics();
    res.json(stats || { message: 'No statistics available yet' });
  });
  
  router.post('/debug/clear-traces', verifyToken, async (req, res) => {
    requestTracer.clearTraces();
    res.json({ message: 'Traces cleared' });
  });
}

module.exports = router;