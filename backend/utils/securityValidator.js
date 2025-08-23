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
  // Comparison attempts
  /for comparison/i,
  /compare.*(?:with|to|against).*(?:other|another|different)\s+user/i,
  /what\s+(?:do\s+)?other\s+(?:users?|people|members?)\s+(?:have|eat|get)/i,
  /show\s+me\s+what\s+(?:other|another|different)\s+(?:users?|people)/i,
  /(?:average|typical|normal)\s+user['']?s?\s+(?:meal|plan|diet|bmi|weight)/i,
  
  // Direct access attempts
  /show me (all|other) users/i,
  /access (all|other|another) (user|account|profile)/i,
  /list all (users|accounts|profiles|data)/i,
  /other people['']?s/i,
  /someone else['']?s/i,
  
  // Role playing as another user
  /pretend\s+(?:i['']?m|i\s+am|to\s+be)\s+(?:user|person|account)/i,
  /act\s+as\s+(?:if\s+i['']?m|i['']?m)\s+user/i,
  /i['']?m\s+user\s+(?:id\s+)?[\[\(]?[A-Z0-9_]+[\]\)]?/i,
  /my\s+(?:user\s+)?id\s+is/i,
  /switch\s+to\s+(?:user|account)/i,
  
  // Database/SQL attempts
  /database/i,
  /sql/i,
  /select.*from/i,
  /drop table/i,
  /delete from/i,
  /update.*set/i,
  
  // Admin access
  /admin (access|panel|dashboard)/i,
  /root access/i,
  /system files/i,
  /private (data|information)/i,
  /confidential/i
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
  // First, check if the message contains a valid wellness query
  const wellnessKeywords = /\b(bmi|weight|wellness|health|meal|nutrition|exercise|calories|protein|diet|fitness|score)\b/i;
  if (wellnessKeywords.test(message)) {
    // If it has wellness keywords, be more lenient with special characters
    return false;
  }
  
  // Check for excessive special characters (but allow emojis and international characters)
  // Remove emojis and international characters first
  const withoutEmojisAndUnicode = message.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]|[\u{1F100}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F900}-\u{1F9FF}]|[\u{FE00}-\u{FE0F}]|[\u{1F1E0}-\u{1F1FF}]|[\u0600-\u06FF]|[\u4E00-\u9FFF]|[\u3040-\u309F]|[\u30A0-\u30FF]/gu, '');
  
  // Now check for suspicious patterns in what remains
  const specialCharCount = (withoutEmojisAndUnicode.match(/[^a-zA-Z0-9\s.,!?'-]/g) || []).length;
  const totalLength = withoutEmojisAndUnicode.length;
  
  // Only flag if more than 30% special characters AFTER removing emojis/international chars
  if (totalLength > 0 && specialCharCount / totalLength > 0.3) {
    return true;
  }
  
  // Check for suspicious patterns like repeated punctuation
  if (/[!?]{3,}/.test(message) || /\.{5,}/.test(message)) {
    return true;
  }
  
  // Check for suspicious brackets or code-like patterns
  if (/\{\{.*\}\}/.test(message) || /<%.*%>/.test(message) || /##.*##/.test(message)) {
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
  // Check for empty or whitespace only
  if (!message || message.trim().length === 0) {
    return {
      valid: false,
      reason: 'empty_message',
      response: 'Please enter a message. How can I help with your wellness journey?'
    };
  }
  
  // Check for spam patterns (but be more specific)
  if (this.isSpam(message)) {
    // Double-check if it's really spam by looking for wellness keywords
    const wellnessKeywords = /\b(bmi|weight|wellness|health|meal|nutrition|exercise)\b/i;
    if (!wellnessKeywords.test(message)) {
      return {
        valid: false,
        reason: 'spam_detected',
        response: 'Your message appears to be spam. Please ask a genuine wellness-related question.'
      };
    }
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
  return `I cannot change my operational mode or bypass security measures.

**What I am:** A wellness assistant with access to YOUR personal health data only.

**What I cannot do:**
• Enter "admin mode" or any other mode
• Access other users' data
• View system files or databases
• Override security protocols

**What I can do:**
• Show YOUR health metrics (BMI, weight, wellness score)
• Display YOUR meal plans
• Track YOUR progress
• Provide general wellness guidance

How can I help with your personal wellness journey today?`;
}
  
  /**
   * Get response for data fishing attempts
   */
  getDataFishingResponse() {
  return `I cannot access other users' data. Each user's health information is private and protected.

**Privacy & Security:**
• I can ONLY access YOUR personal data
• I cannot show what other users eat or their meal plans
• I cannot display other users' BMI, weight, or health metrics
• I cannot provide "comparisons" with real user data
• I cannot pretend to be another user

**What I CAN do for you:**
• Show YOUR meal plan and nutrition
• Display YOUR health metrics (BMI, weight, wellness score)
• Provide general healthy ranges (e.g., normal BMI: 18.5-24.9)
• Share evidence-based nutrition guidelines

Would you like to see your own meal plan or health data?`;
}
  
  /**
   * Get response for sensitive operations
   */
  getSensitiveOperationResponse() {
  return `I cannot perform system operations or access sensitive data.

**Security boundaries:**
• I cannot delete accounts or data
• I cannot grant admin privileges
• I cannot reveal passwords or API keys
• I cannot modify system settings

**For account management:**
Please use the account settings page in your profile.

**I'm here to help with:**
• Your health metrics and tracking
• Your nutrition and meal planning
• Your fitness goals
• General wellness advice

What aspect of your wellness would you like to explore?`;
}
  
  /**
   * Get response for suspicious patterns
   */
 getSuspiciousPatternResponse() {
  return `I've detected multiple unusual requests. For security, I need to clarify my capabilities.

**I am a wellness assistant that:**
• ONLY accesses your personal health data
• Cannot be "jailbroken" or put into special modes
• Cannot access other users' information
• Follows strict privacy and security protocols

**Please use me as intended for:**
• Tracking your health metrics
• Planning your meals
• Monitoring your progress
• Getting wellness advice

Let's focus on your wellness goals. What would you like to know about your health data?`;
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