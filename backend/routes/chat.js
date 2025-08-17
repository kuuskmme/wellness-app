// backend/routes/chat.js
const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const HealthProfile = require('../models/HealthProfile');
const { verifyToken } = require('../middleware/auth');
const aiChatService = require('../utils/aiChatService');

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
  try {
    const { message, sessionId, mode = 'concise' } = req.body;
    
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
    let conversation;
    if (sessionId) {
      conversation = await Conversation.findOne({
        sessionId,
        userId: req.userId
      });
    }
    
    if (!conversation) {
      conversation = await Conversation.findOrCreateSession(req.userId);
    }
    
    // Update mode if changed
    if (mode !== conversation.metadata.mode) {
      conversation.metadata.mode = mode;
    }
    
    // Add user message
    await conversation.addMessage('user', message);
    
    // Get AI response
    const aiResponse = await aiChatService.generateResponse(
      conversation,
      message,
      req.userId
    );
    
    // Add assistant message
    await conversation.addMessage(
      'assistant', 
      aiResponse.content,
      aiResponse.functionCalls
    );
    
    res.json({
      response: aiResponse.content,
      sessionId: conversation.sessionId,
      functionCalls: aiResponse.functionCalls,
      timestamp: new Date()
    });
    
  } catch (error) {
    console.error('Message processing error:', error);
    
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

// Update conversation mode
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

module.exports = router;