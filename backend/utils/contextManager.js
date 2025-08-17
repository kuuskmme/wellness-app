// backend/utils/contextManager.js
/**
 * Context Manager for handling multi-turn conversations
 * Manages reference resolution, topic tracking, and conversation state
 */

class ContextManager {
  constructor() {
    // Track conversation topics and entities
    this.currentTopic = null;
    this.mentionedEntities = {
      meal: null,
      recipe: null,
      metric: null,
      exercise: null,
      goal: null,
      timeframe: null
    };
    this.lastQueryType = null;
    this.conversationMode = 'concise';
  }

  /**
   * Analyze message for references like "that", "it", "this"
   */
  resolveReferences(message, conversationHistory) {
    const lowerMessage = message.toLowerCase();
    let resolvedMessage = message;
    
    // Common reference patterns
    const referencePatterns = [
      { pattern: /^(what|how) (is|about) (that|it|this)/i, type: 'inquiry' },
      { pattern: /^(tell me|show me|give me) more about (that|it|this)/i, type: 'elaboration' },
      { pattern: /^(is|are) (that|it|this|they|those)/i, type: 'clarification' },
      { pattern: /^(can i|should i|do i) (eat|have|take) (that|it|this)/i, type: 'permission' },
      { pattern: /^(that|it|this) (is|sounds|looks)/i, type: 'reaction' },
      { pattern: /^why (is that|that)/i, type: 'explanation' },
      { pattern: /^(change|modify|adjust|update) (that|it|this)/i, type: 'modification' }
    ];
    
    // Check if message contains references
    const hasReference = referencePatterns.some(p => p.pattern.test(lowerMessage));
    
    if (hasReference && conversationHistory.length > 0) {
      // Get the last assistant message for context
      const lastAssistantMessage = this.getLastAssistantMessage(conversationHistory);
      const lastUserMessage = this.getLastUserMessage(conversationHistory);
      
      // Resolve based on context
      if (lowerMessage.includes('that') || lowerMessage.includes('it') || lowerMessage.includes('this')) {
        const context = this.extractContextFromMessage(lastAssistantMessage);
        
        // Replace pronouns with actual context
        if (context.primarySubject) {
          resolvedMessage = this.replaceReferences(message, context.primarySubject);
          
          // Add clarifying context
          resolvedMessage = this.addClarifyingContext(resolvedMessage, context);
        }
      }
    }
    
    return {
      originalMessage: message,
      resolvedMessage: resolvedMessage,
      hasReference: hasReference,
      referenceType: this.detectReferenceType(message)
    };
  }

  /**
   * Extract context from previous messages
   */
  extractContextFromMessage(message) {
    if (!message) return {};
    
    const context = {
      primarySubject: null,
      entities: [],
      metrics: [],
      timeframe: null
    };
    
    // Extract meal references
    if (message.includes('breakfast')) {
      context.primarySubject = 'breakfast';
      context.entities.push({ type: 'meal', value: 'breakfast' });
    } else if (message.includes('lunch')) {
      context.primarySubject = 'lunch';
      context.entities.push({ type: 'meal', value: 'lunch' });
    } else if (message.includes('dinner')) {
      context.primarySubject = 'dinner';
      context.entities.push({ type: 'meal', value: 'dinner' });
    }
    
    // Extract metric references
    if (message.includes('BMI')) {
      context.primarySubject = context.primarySubject || 'BMI';
      context.metrics.push('BMI');
    }
    if (message.includes('weight')) {
      context.primarySubject = context.primarySubject || 'weight';
      context.metrics.push('weight');
    }
    if (message.includes('wellness score')) {
      context.primarySubject = context.primarySubject || 'wellness score';
      context.metrics.push('wellness score');
    }
    if (message.includes('calories') || message.includes('kcal')) {
      context.primarySubject = context.primarySubject || 'calories';
      context.metrics.push('calories');
    }
    if (message.includes('protein')) {
      context.primarySubject = context.primarySubject || 'protein';
      context.metrics.push('protein');
    }
    
    // Extract recipe references
    const recipeMatch = message.match(/([A-Z][a-z]+ (?:&|and) [A-Z][a-z]+ (?:Bowl|Salad|Wrap|Sandwich))/);
    if (recipeMatch) {
      context.primarySubject = recipeMatch[1];
      context.entities.push({ type: 'recipe', value: recipeMatch[1] });
    }
    
    // Extract timeframe
    if (message.includes('today')) context.timeframe = 'today';
    else if (message.includes('this week')) context.timeframe = 'week';
    else if (message.includes('this month')) context.timeframe = 'month';
    
    return context;
  }

  /**
   * Replace reference words with actual context
   */
  replaceReferences(message, subject) {
    let resolved = message;
    
    // Map of replacements
    const replacements = {
      'that': subject,
      'it': subject,
      'this': subject,
      'that\'s': `${subject} is`,
      'it\'s': `${subject} is`,
      'this\'s': `${subject} is`
    };
    
    // Replace references while preserving case
    Object.keys(replacements).forEach(ref => {
      const regex = new RegExp(`\\b${ref}\\b`, 'gi');
      resolved = resolved.replace(regex, (match) => {
        // Preserve capitalization
        if (match[0] === match[0].toUpperCase()) {
          return replacements[ref.toLowerCase()].charAt(0).toUpperCase() + 
                 replacements[ref.toLowerCase()].slice(1);
        }
        return replacements[ref.toLowerCase()];
      });
    });
    
    return resolved;
  }

  /**
   * Add clarifying context to resolved message
   */
  addClarifyingContext(message, context) {
    let clarified = message;
    
    // Add context for ambiguous queries
    if (message.toLowerCase().includes('more')) {
      if (context.metrics && context.metrics.length > 0) {
        clarified += ` (regarding ${context.metrics.join(', ')})`;
      } else if (context.entities && context.entities.length > 0) {
        const entityDesc = context.entities.map(e => e.value).join(', ');
        clarified += ` (about ${entityDesc})`;
      }
    }
    
    return clarified;
  }

  /**
   * Detect the type of reference for appropriate handling
   */
  detectReferenceType(message) {
    const lower = message.toLowerCase();
    
    // More flexible pattern matching
    if (lower.includes('more') || lower.includes('detail') || lower.includes('explain')) {
      return 'elaboration';
    }
    if (lower.includes('why') || lower.includes('how come')) {
      return 'explanation';
    }
    if (lower.includes('change') || lower.includes('modify') || lower.includes('different')) {
      return 'modification';
    }
    if (lower.includes('good') || lower.includes('bad') || lower.includes('healthy') || lower.includes('ok')) {
      return 'evaluation';
    }
    if (lower.includes('can i') || lower.includes('should i')) {
      return 'permission';
    }
    if (lower.includes('improve') || lower.includes('better') || lower.includes('increase') || lower.includes('boost')) {
      return 'improvement';
    }
    
    return 'general';
  }

  /**
   * Track conversation flow and topics
   */
  updateConversationState(message, queryType) {
    // Update last query type
    this.lastQueryType = queryType;
    
    // Extract and update current topic
    if (queryType) {
      this.currentTopic = queryType;
    }
    
    // Update mentioned entities
    const context = this.extractContextFromMessage(message);
    if (context.primarySubject) {
      this.updateMentionedEntities(context);
    }
  }

  /**
   * Update tracked entities
   */
  updateMentionedEntities(context) {
    if (context.entities) {
      context.entities.forEach(entity => {
        if (entity.type === 'meal') {
          this.mentionedEntities.meal = entity.value;
        } else if (entity.type === 'recipe') {
          this.mentionedEntities.recipe = entity.value;
        }
      });
    }
    
    if (context.metrics && context.metrics.length > 0) {
      this.mentionedEntities.metric = context.metrics[0];
    }
    
    if (context.timeframe) {
      this.mentionedEntities.timeframe = context.timeframe;
    }
  }

  /**
   * Get the last assistant message from history
   */
  getLastAssistantMessage(history) {
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].role === 'assistant') {
        return history[i].content;
      }
    }
    return null;
  }

  /**
   * Get the last user message from history
   */
  getLastUserMessage(history) {
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].role === 'user') {
        return history[i].content;
      }
    }
    return null;
  }

  /**
   * Determine if follow-up is asking for more detail
   */
  isElaborationRequest(message) {
    const elaborationPhrases = [
      'tell me more',
      'more details',
      'more information',
      'explain',
      'elaborate',
      'what else',
      'anything else',
      'go deeper',
      'break it down',
      'more about'
    ];
    
    const lower = message.toLowerCase();
    return elaborationPhrases.some(phrase => lower.includes(phrase));
  }

  /**
   * Check if user is asking for alternatives
   */
  isAlternativeRequest(message) {
    const alternativePhrases = [
      'something else',
      'different',
      'another',
      'alternative',
      'instead',
      'other options',
      'what else',
      'change it',
      'switch it',
      'replace'
    ];
    
    const lower = message.toLowerCase();
    return alternativePhrases.some(phrase => lower.includes(phrase));
  }

  /**
   * Generate context-aware response based on conversation state
   */
  generateContextAwareResponse(baseResponse, referenceInfo, conversationState) {
    let enhancedResponse = baseResponse;
    
    // Add acknowledgment of reference if detected
    if (referenceInfo.hasReference) {
      const acknowledgments = {
        'elaboration': 'Let me provide more details about that:\n\n',
        'explanation': 'Let me explain why:\n\n',
        'modification': 'I\'ll help you adjust that:\n\n',
        'evaluation': 'Let me evaluate that for you:\n\n',
        'permission': 'Regarding your question:\n\n',
        'general': 'About that:\n\n'
      };
      
      const prefix = acknowledgments[referenceInfo.referenceType] || '';
      enhancedResponse = prefix + enhancedResponse;
    }
    
    // Add continuity phrases for follow-ups
    if (this.lastQueryType === conversationState) {
      const continuityPhrases = [
        'Additionally, ',
        'Furthermore, ',
        'Also worth noting: ',
        'Another thing to consider: '
      ];
      
      // Randomly select a continuity phrase for variety
      const phrase = continuityPhrases[Math.floor(Math.random() * continuityPhrases.length)];
      
      // Insert continuity phrase after first paragraph
      const paragraphs = enhancedResponse.split('\n\n');
      if (paragraphs.length > 1) {
        paragraphs[1] = phrase + paragraphs[1];
        enhancedResponse = paragraphs.join('\n\n');
      }
    }
    
    return enhancedResponse;
  }

  /**
   * Handle mode changes (concise vs detailed)
   */
  setConversationMode(mode) {
    this.conversationMode = mode;
  }

  /**
   * Adjust response based on mode
   */
  adjustResponseForMode(response) {
    if (this.conversationMode === 'concise') {
      // Shorten response by removing examples and extra details
      return this.makeResponseConcise(response);
    } else {
      // Add more details and examples
      return this.makeResponseDetailed(response);
    }
  }

  /**
   * Make response more concise
   */
  makeResponseConcise(response) {
    // Remove example sections
    let concise = response.replace(/For example[^.]*\./g, '');
    
    // Limit bullet points to first 3
    const lines = concise.split('\n');
    let bulletCount = 0;
    const maxBullets = 3;
    
    const filtered = lines.filter(line => {
      if (line.startsWith('•') || line.startsWith('-')) {
        bulletCount++;
        return bulletCount <= maxBullets;
      }
      return true;
    });
    
    // Add ellipsis if bullets were cut
    if (bulletCount > maxBullets) {
      filtered.push('...(and more)');
    }
    
    return filtered.join('\n');
  }

  /**
   * Make response more detailed
   */
  makeResponseDetailed(response) {
    // Add explanatory text
    let detailed = response;
    
    // Add examples where appropriate
    if (response.includes('BMI')) {
      detailed += '\n\n*Note: BMI is calculated as weight(kg) / height(m)². While useful, it doesn\'t account for muscle mass or body composition.*';
    }
    
    if (response.includes('protein')) {
      detailed += '\n\n*Tip: Aim for 0.8-1.2g of protein per kg of body weight for general health, or 1.6-2.2g/kg for muscle building.*';
    }
    
    if (response.includes('exercise')) {
      detailed += '\n\n*Remember: The best exercise is the one you\'ll actually do consistently. Start small and build gradually.*';
    }
    
    return detailed;
  }

  /**
   * Clear conversation state (for new sessions)
   */
  clearState() {
    this.currentTopic = null;
    this.mentionedEntities = {
      meal: null,
      recipe: null,
      metric: null,
      exercise: null,
      goal: null,
      timeframe: null
    };
    this.lastQueryType = null;
  }
}

module.exports = new ContextManager();