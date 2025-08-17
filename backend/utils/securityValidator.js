// backend/utils/securityValidator.js
/**
 * Security Validator for AI Assistant
 * Prevents jailbreaks, prompt injections, and unauthorized data access
 */

class SecurityValidator {
  constructor() {
    // Patterns that might indicate jailbreak attempts
    this.jailbreakPatterns = [
      /ignore (all |previous |above )?instructions/i,
      /disregard (all |previous |your )?instructions/i,
      /forget (everything|all|previous)/i,
      /new instructions:/i,
      /you are now/i,
      /pretend (you are|to be)/i,
      /act (as|like)/i,
      /roleplay as/i,
      /system:/i,
      /\[system\]/i,
      /<system>/i,
      /admin mode/i,
      /developer mode/i,
      /sudo/i,
      /override/i,
      /bypass/i,
      /##.*##/,  // Common injection pattern
      /\{\{.*\}\}/,  // Template injection
      /<%.*%>/,  // Code injection
    ];
    
    // Patterns for data fishing attempts
    this.dataFishingPatterns = [
      /show me (all|other) users/i,
      /access (all|other|another) (user|account|profile)/i,
      /database/i,
      /sql/i,
      /select.*from/i,
      /drop table/i,
      /delete from/i,
      /update.*set/i,
      /(list|show|get) all (users|accounts|profiles|data)/i,
      /admin (access|panel|dashboard)/i,
      /root access/i,
      /system files/i,
      /private (data|information)/i,
      /confidential/i,
      /other people's/i,
      /someone else's/i
    ];
    
    // Sensitive operations that should be blocked
    this.sensitiveOperations = [
      /delete (my |all )?(account|profile|data)/i,
      /remove everything/i,
      /wipe (my |all )?data/i,
      /destroy/i,
      /permanent(ly)? delete/i,
      /give me (admin|root|full) (access|permissions|rights)/i,
      /make me (admin|administrator)/i,
      /elevate (my )?(permissions|privileges)/i,
      /access token/i,
      /api key/i,
      /password/i,
      /secret/i,
      /credentials/i
    ];
    
    // Track conversation for pattern detection
    this.conversationHistory = [];
    this.suspiciousAttempts = 0;
    this.lastAttemptTime = null;
  }
  
  /**
   * Main validation method
   */
  validateMessage(message, userId, context = {}) {
    const validation = {
      isValid: true,
      reason: null,
      severity: 'none',
      suggestedResponse: null
    };
    
    // Check for jailbreak attempts
    const jailbreakCheck = this.checkForJailbreak(message);
    if (jailbreakCheck.detected) {
      validation.isValid = false;
      validation.reason = 'jailbreak_attempt';
      validation.severity = 'high';
      validation.suggestedResponse = this.getJailbreakResponse();
      this.logSecurityEvent('jailbreak', userId, message);
      return validation;
    }
    
    // Check for data fishing
    const dataFishingCheck = this.checkForDataFishing(message);
    if (dataFishingCheck.detected) {
      validation.isValid = false;
      validation.reason = 'data_fishing';
      validation.severity = 'high';
      validation.suggestedResponse = this.getDataFishingResponse();
      this.logSecurityEvent('data_fishing', userId, message);
      return validation;
    }
    
    // Check for sensitive operations
    const sensitiveCheck = this.checkForSensitiveOperations(message);
    if (sensitiveCheck.detected) {
      validation.isValid = false;
      validation.reason = 'sensitive_operation';
      validation.severity = 'medium';
      validation.suggestedResponse = this.getSensitiveOperationResponse();
      this.logSecurityEvent('sensitive_operation', userId, message);
      return validation;
    }
    
    // Check for repeated suspicious attempts (rate limiting)
    if (this.checkSuspiciousPattern(message, userId)) {
      validation.isValid = false;
      validation.reason = 'suspicious_pattern';
      validation.severity = 'medium';
      validation.suggestedResponse = this.getSuspiciousPatternResponse();
      return validation;
    }
    
    // Check message length and content
    const contentCheck = this.validateContent(message);
    if (!contentCheck.valid) {
      validation.isValid = false;
      validation.reason = contentCheck.reason;
      validation.severity = 'low';
      validation.suggestedResponse = contentCheck.response;
      return validation;
    }
    
    // Track conversation for pattern analysis
    this.addToHistory(message, userId);
    
    return validation;
  }
  
  /**
   * Check for jailbreak attempts
   */
  checkForJailbreak(message) {
    for (const pattern of this.jailbreakPatterns) {
      if (pattern.test(message)) {
        console.warn(`[Security] Jailbreak attempt detected: ${pattern}`);
        return {
          detected: true,
          pattern: pattern.toString()
        };
      }
    }
    
    // Check for unusual formatting that might hide instructions
    if (this.hasUnusualFormatting(message)) {
      return {
        detected: true,
        pattern: 'unusual_formatting'
      };
    }
    
    return { detected: false };
  }
  
  /**
   * Check for data fishing attempts
   */
  checkForDataFishing(message) {
    for (const pattern of this.dataFishingPatterns) {
      if (pattern.test(message)) {
        console.warn(`[Security] Data fishing attempt detected: ${pattern}`);
        return {
          detected: true,
          pattern: pattern.toString()
        };
      }
    }
    
    return { detected: false };
  }
  
  /**
   * Check for sensitive operations
   */
  checkForSensitiveOperations(message) {
    for (const pattern of this.sensitiveOperations) {
      if (pattern.test(message)) {
        console.warn(`[Security] Sensitive operation requested: ${pattern}`);
        return {
          detected: true,
          pattern: pattern.toString()
        };
      }
    }
    
    return { detected: false };
  }
  
  /**
   * Check for unusual formatting
   */
  hasUnusualFormatting(message) {
    // Check for excessive special characters
    const specialCharCount = (message.match(/[^a-zA-Z0-9\s.,!?'-]/g) || []).length;
    const totalLength = message.length;
    
    if (totalLength > 0 && specialCharCount / totalLength > 0.3) {
      return true;
    }
    
    // Check for hidden Unicode characters
    if (/[\u200B-\u200F\u202A-\u202E\u2060-\u2064\u206A-\u206F]/.test(message)) {
      return true;
    }
    
    // Check for excessive capitalization
    const upperCount = (message.match(/[A-Z]/g) || []).length;
    if (totalLength > 20 && upperCount / totalLength > 0.5) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Check for suspicious patterns in conversation
   */
  checkSuspiciousPattern(message, userId) {
    const now = Date.now();
    
    // Reset counter if it's been more than 5 minutes
    if (this.lastAttemptTime && (now - this.lastAttemptTime) > 300000) {
      this.suspiciousAttempts = 0;
    }
    
    // Check if message seems like probing
    const probingKeywords = ['test', 'testing', 'ignore', 'system', 'admin', 'hack'];
    const matchCount = probingKeywords.filter(keyword => 
      message.toLowerCase().includes(keyword)
    ).length;
    
    if (matchCount >= 2) {
      this.suspiciousAttempts++;
      this.lastAttemptTime = now;
    }
    
    // Block after 3 suspicious attempts
    if (this.suspiciousAttempts >= 3) {
      console.warn(`[Security] Multiple suspicious attempts from user ${userId}`);
      return true;
    }
    
    return false;
  }
  
  /**
   * Validate content length and structure
   */
  validateContent(message) {
    // Check message length
    if (message.length > 2000) {
      return {
        valid: false,
        reason: 'message_too_long',
        response: 'Your message is too long. Please keep it under 2000 characters and try again.'
      };
    }
    
    if (message.trim().length === 0) {
      return {
        valid: false,
        reason: 'empty_message',
        response: 'Please enter a message.'
      };
    }
    
    // Check for spam patterns
    if (this.isSpam(message)) {
      return {
        valid: false,
        reason: 'spam_detected',
        response: 'Your message appears to be spam. Please ask a genuine wellness-related question.'
      };
    }
    
    return { valid: true };
  }
  
  /**
   * Check for spam patterns
   */
  isSpam(message) {
    // Repeated characters
    if (/(.)\1{10,}/.test(message)) {
      return true;
    }
    
    // All caps with exclamation marks
    if (message === message.toUpperCase() && message.includes('!!!')) {
      return true;
    }
    
    // Repeated words
    const words = message.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    if (words.length > 10 && uniqueWords.size < words.length / 3) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Add message to history for pattern tracking
   */
  addToHistory(message, userId) {
    this.conversationHistory.push({
      message,
      userId,
      timestamp: Date.now()
    });
    
    // Keep only last 20 messages
    if (this.conversationHistory.length > 20) {
      this.conversationHistory.shift();
    }
  }
  
  /**
   * Log security events
   */
  logSecurityEvent(type, userId, message) {
    const event = {
      type,
      userId,
      message: message.substring(0, 100), // Log only first 100 chars
      timestamp: new Date(),
      ip: 'unknown' // Would get from request in production
    };
    
    console.warn('[Security Event]', JSON.stringify(event));
    
    // In production, this would:
    // - Save to security log database
    // - Alert administrators for high-severity events
    // - Potentially block user after multiple violations
  }
  
  /**
   * Get response for jailbreak attempts
   */
  getJailbreakResponse() {
    return `I'm designed to be a helpful wellness assistant within my intended purpose. I can only help with health metrics, nutrition, exercise, and general wellness topics.

If you have questions about your health journey, I'm here to help! What would you like to know about?`;
  }
  
  /**
   * Get response for data fishing attempts
   */
  getDataFishingResponse() {
    return `For privacy and security reasons, I can only access your personal wellness data. I cannot access other users' information or system data.

I'm here to help with YOUR wellness journey. Would you like to:
• Check your health metrics?
• Review your meal plan?
• Get exercise recommendations?`;
  }
  
  /**
   * Get response for sensitive operations
   */
  getSensitiveOperationResponse() {
    return `I cannot perform that operation. For account management or sensitive changes, please use the account settings in your profile.

I'm here to help with:
• Health and fitness tracking
• Nutrition planning
• Wellness guidance

What wellness topic can I assist you with today?`;
  }
  
  /**
   * Get response for suspicious patterns
   */
  getSuspiciousPatternResponse() {
    return `I've noticed unusual activity in our conversation. Let's focus on how I can help with your wellness goals.

Please ask me about:
• Your health metrics
• Meal planning
• Exercise routines
• Wellness tips

How can I assist with your health journey today?`;
  }
  
  /**
   * Validate function call parameters
   */
  validateFunctionCall(functionName, parameters, userId) {
    // Ensure user can only access their own data
    if (parameters.userId && parameters.userId !== userId) {
      console.warn(`[Security] User ${userId} attempted to access data for user ${parameters.userId}`);
      return {
        valid: false,
        reason: 'unauthorized_access'
      };
    }
    
    // Validate parameter values
    if (parameters.metric_type && !['bmi', 'weight', 'wellness_score', 'all'].includes(parameters.metric_type)) {
      return {
        valid: false,
        reason: 'invalid_parameter'
      };
    }
    
    if (parameters.time_period && !['current', 'weekly', 'monthly'].includes(parameters.time_period)) {
      return {
        valid: false,
        reason: 'invalid_parameter'
      };
    }
    
    return { valid: true };
  }
  
  /**
   * Clear history (for new sessions)
   */
  clearHistory() {
    this.conversationHistory = [];
    this.suspiciousAttempts = 0;
    this.lastAttemptTime = null;
  }
}

module.exports = new SecurityValidator();