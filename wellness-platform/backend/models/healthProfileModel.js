const mongoose = require('mongoose');

const healthProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Basic demographics
  dateOfBirth: {
    type: Date,
    required: true
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'non-binary', 'prefer-not-to-say'],
    required: true
  },
  
  // Physical metrics with history
  physicalMetrics: [{
    date: {
      type: Date,
      default: Date.now
    },
    height: {
      value: Number,
      unit: {
        type: String,
        enum: ['cm', 'in'],
        default: 'cm'
      }
    },
    weight: {
      value: Number,
      unit: {
        type: String,
        enum: ['kg', 'lb'],
        default: 'kg'
      }
    },
    bodyFatPercentage: Number,
    waistCircumference: {
      value: Number,
      unit: {
        type: String,
        enum: ['cm', 'in'],
        default: 'cm'
      }
    }
  }],
  
  // Lifestyle indicators
  lifestyle: {
    sleepHours: Number,
    activityLevel: {
      type: String,
      enum: ['sedentary', 'light', 'moderate', 'active', 'very-active'],
      default: 'moderate'
    },
    stressLevel: {
      type: String,
      enum: ['low', 'moderate', 'high'],
      default: 'moderate'
    },
    smoker: {
      type: Boolean,
      default: false
    },
    alcoholConsumption: {
      type: String,
      enum: ['none', 'occasional', 'moderate', 'heavy'],
      default: 'occasional'
    }
  },
  
  // Dietary preferences
  dietaryPreferences: {
    diet: {
      type: String,
      enum: ['omnivore', 'vegetarian', 'vegan', 'pescatarian', 'keto', 'paleo', 'other'],
      default: 'omnivore'
    },
    allergies: [String],
    intolerances: [String],
    preferences: [String],
    restrictions: [String]
  },
  
  // Fitness goals
  fitnessGoals: [{
    type: {
      type: String,
      enum: ['weight', 'strength', 'endurance', 'flexibility', 'overall-health'],
      required: true
    },
    target: {
      value: Number,
      unit: String
    },
    deadline: Date,
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    status: {
      type: String,
      enum: ['not-started', 'in-progress', 'achieved', 'abandoned'],
      default: 'not-started'
    },
    progress: Number, // 0-100 percentage
    notes: String
  }],
  
  // Initial fitness assessment
  fitnessAssessment: {
    date: {
      type: Date,
      default: Date.now
    },
    cardioEndurance: {
      type: String,
      enum: ['poor', 'below-average', 'average', 'above-average', 'excellent']
    },
    muscularStrength: {
      type: String,
      enum: ['poor', 'below-average', 'average', 'above-average', 'excellent']
    },
    flexibility: {
      type: String,
      enum: ['poor', 'below-average', 'average', 'above-average', 'excellent']
    },
    balance: {
      type: String,
      enum: ['poor', 'below-average', 'average', 'above-average', 'excellent']
    }
  },
  
  // Privacy settings
  privacySettings: {
    shareData: {
      type: Boolean,
      default: false
    },
    dataVisibility: {
      type: String,
      enum: ['private', 'friends', 'public'],
      default: 'private'
    },
    allowAIAnalysis: {
      type: Boolean,
      default: true
    }
  },

  // AI insights
  aiInsights: [{
    date: {
      type: Date,
      default: Date.now
    },
    category: {
      type: String,
      enum: ['nutrition', 'activity', 'sleep', 'stress', 'overall-health']
    },
    insight: String,
    recommendation: String
  }],

  // Wellness score and history
  wellnessScores: [{
    date: {
      type: Date,
      default: Date.now
    },
    score: {
      type: Number,
      min: 0,
      max: 100
    },
    factors: {
      nutrition: Number,
      activity: Number,
      sleep: Number,
      stress: Number,
      bodyComposition: Number
    }
  }],

  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const HealthProfile = mongoose.model('HealthProfile', healthProfileSchema);

module.exports = HealthProfile;