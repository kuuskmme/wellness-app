erDiagram
    USER {
        ObjectId _id
        String email
        String password
        String firstName
        String lastName
        Boolean isVerified
        String verificationToken
        String resetPasswordToken
        Date resetPasswordExpires
        Boolean twoFactorEnabled
        String twoFactorSecret
        Array oauthProviders
        Array refreshTokens
        String role
        Date createdAt
        Date updatedAt
    }
    
    HEALTH_PROFILE {
        ObjectId _id
        ObjectId user
        Date dateOfBirth
        String gender
        Array physicalMetrics
        Object lifestyle
        Object dietaryPreferences
        Array fitnessGoals
        Object fitnessAssessment
        Object privacySettings
        Array aiInsights
        Array wellnessScores
        Date createdAt
        Date updatedAt
    }
    
    PHYSICAL_METRICS {
        Date date
        Object height
        Object weight
        Number bodyFatPercentage
        Object waistCircumference
    }
    
    LIFESTYLE {
        Number sleepHours
        String activityLevel
        String stressLevel
        Boolean smoker
        String alcoholConsumption
    }
    
    DIETARY_PREFERENCES {
        String diet
        Array allergies
        Array intolerances
        Array preferences
        Array restrictions
    }
    
    FITNESS_GOALS {
        String type
        Object target
        Date deadline
        String priority
        String status
        Number progress
        String notes
    }
    
    FITNESS_ASSESSMENT {
        Date date
        String cardioEndurance
        String muscularStrength
        String flexibility
        String balance
    }
    
    PRIVACY_SETTINGS {
        Boolean shareData
        String dataVisibility
        Boolean allowAIAnalysis
    }
    
    AI_INSIGHTS {
        Date date
        String category
        String insight
        String recommendation
    }
    
    WELLNESS_SCORES {
        Date date
        Number score
        Object factors
    }
    
    USER ||--o{ HEALTH_PROFILE : has
    HEALTH_PROFILE ||--o{ PHYSICAL_METRICS : contains
    HEALTH_PROFILE ||--o{ FITNESS_GOALS : has
    HEALTH_PROFILE ||--|| LIFESTYLE : includes
    HEALTH_PROFILE ||--|| DIETARY_PREFERENCES : includes
    HEALTH_PROFILE ||--|| FITNESS_ASSESSMENT : includes
    HEALTH_PROFILE ||--|| PRIVACY_SETTINGS : includes
    HEALTH_PROFILE ||--o{ AI_INSIGHTS : contains
    HEALTH_PROFILE ||--o{ WELLNESS_SCORES : tracks