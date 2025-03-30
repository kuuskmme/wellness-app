# Wellness Platform - Database Schema Documentation

## Overview

The Wellness Platform database is built using MongoDB, a NoSQL document database. The schema is designed to efficiently store user information, health profiles, and related data while allowing for easy retrieval and analysis.

## Main Collections

### 1. Users Collection

The Users collection stores authentication and basic user information.

**Key Fields:**
- `_id`: Unique identifier for the user
- `email`: User's email address (unique)
- `password`: Hashed password
- `firstName`, `lastName`: Basic profile information
- `isVerified`: Boolean indicating if email is verified
- `twoFactorEnabled`: Boolean indicating if 2FA is enabled
- `oauthProviders`: Array of connected OAuth providers
- `refreshTokens`: Array of valid refresh tokens
- `role`: User role (user, admin)

### 2. Health Profiles Collection

The Health Profiles collection stores comprehensive health data for each user.

**Key Fields:**
- `_id`: Unique identifier for the health profile
- `user`: Reference to the User document (foreign key)
- `dateOfBirth`: User's date of birth
- `gender`: User's gender
- `physicalMetrics`: Array of physical measurements over time
- `lifestyle`: Object containing lifestyle indicators
- `dietaryPreferences`: Object containing diet information
- `fitnessGoals`: Array of user's fitness goals
- `fitnessAssessment`: Object containing fitness assessment data
- `privacySettings`: Object containing user's privacy preferences
- `aiInsights`: Array of AI-generated insights
- `wellnessScores`: Array of calculated wellness scores over time

## Relationships

1. **One-to-One Relationship:**
   - Each User has exactly one Health Profile
   - Each Health Profile belongs to exactly one User

2. **One-to-Many Relationships:**
   - Health Profile to Physical Metrics (time series data)
   - Health Profile to Fitness Goals (multiple goals)
   - Health Profile to AI Insights (multiple insights)
   - Health Profile to Wellness Scores (time series data)

3. **Embedded Documents:**
   The following are embedded within the Health Profile document:
   - Lifestyle information
   - Dietary preferences
   - Fitness assessment
   - Privacy settings

## Data Flow

1. **User Registration and Authentication:**
   - User registers via email/password or OAuth
   - Authentication data stored in Users collection
   - JWT tokens generated for session management

2. **Health Profile Creation:**
   - Upon registration, a basic Health Profile is created
   - User completes initial health assessment forms
   - Data is stored in the Health Profile document

3. **Data Updates:**
   - Physical metrics are regularly updated (weight, body fat, etc.)
   - New metrics are added to the arrays, preserving historical data
   - Wellness scores are calculated and stored periodically

4. **Data Retrieval:**
   - Data is retrieved from the Health Profile for dashboard display
   - Historical data is used for progress charts and trend analysis
   - AI processes data to generate insights

## Schema Evolution

The schema is designed to be flexible and extensible:
- Array fields allow for time-series data without schema changes
- New fields can be added to embedded documents as features evolve
- MongoDB's schema-less nature allows for gradual migration of data structure

## Indexes

To optimize query performance, the following indexes will be implemented:
- `User.email`: For fast user lookup during authentication
- `HealthProfile.user`: For fast retrieval of health profile by user ID
- `HealthProfile.physicalMetrics.date`: For efficient date-based queries