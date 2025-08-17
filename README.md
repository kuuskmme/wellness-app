# Wellness & Nutrition Platform with AI Assistant

AI-powered wellness platform with personalized meal planning, recipe management, nutritional analysis, and intelligent health assistant.

## Quick Setup (15 minutes)

### Prerequisites
- Node.js 14+ & npm 6+
- MongoDB 4.4+ running locally
- OpenAI API key (required for AI Assistant features)

### Installation
```bash
# Clone and install
git clone [repository-url]
cd wellness-platform

# Install all dependencies
cd backend && npm install
cd ../frontend && npm install

# Frontend needs react-markdown for chat UI
cd frontend
npm install react-markdown
```

### Configuration
Create `backend/.env`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/wellness-platform
JWT_SECRET=change-this-secret-key-12345
JWT_REFRESH_SECRET=change-this-refresh-key-67890
FRONTEND_URL=http://localhost:3000

# AI Assistant Configuration (Required for Project 3)
OPENAI_API_KEY=sk-your-key-here
AI_MODEL=gpt-3.5-turbo
AI_TEMPERATURE=0.6
AI_MAX_TOKENS=500
AI_TOP_P=0.95

# Optional: Tracing and debugging
NODE_ENV=development
ENABLE_TRACING=true
TRACE_VERBOSE=false
```

### Run Application
```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend  
cd frontend && npm start
```

Access at `http://localhost:3000`

## AI Assistant Features (Project 3)

### System Architecture

#### 1. Conversation Management
- **Session-based conversations** with automatic session creation
- **Message history tracking** (10-message rolling window for token efficiency)
- **Multi-turn context preservation** across 5+ exchanges
- **Reference resolution** for pronouns ("that", "it", "this")
- **Mode support** (concise/detailed responses)

#### 2. Data Access Layer
**4 Function Calling Implementations:**
- `get_health_metrics` - BMI, weight, wellness scores with trend analysis
- `get_nutrition_data` - Meal plans, recipes, dietary preferences
- `get_progress_summary` - Goal tracking with recommendations
- `get_general_insights` - Wellness tips for sleep, exercise, hydration

**Security Features:**
- User data isolation (no cross-user access)
- Parameter validation with enums
- No PII exposure (email, phone, etc.)
- Standardized units (kg, cm, kcal)

#### 3. Conversation Types & Personalization
**6 Specialized Handlers:**
1. **Health Metrics** - BMI interpretation, wellness score breakdown
2. **Progress Tracking** - Motivational messages, time-to-goal estimates
3. **Meal Plans** - Daily/weekly views with nutritional analysis
4. **Recipes** - Suitability checking, goal alignment
5. **Nutrition Analysis** - Macro tracking, deficit/surplus detection
6. **General Wellness** - Personalized exercise plans, wellness tips

**Personalization Features:**
- Uses user's name throughout responses
- Interprets data trends and comparisons
- Goal-specific recommendations
- Progress-based motivation
- Visual elements (progress bars, emojis)

#### 4. Context Management
**Reference Resolution:**
- Detects and resolves pronouns to previous topics
- Handles follow-up types (elaboration, explanation, improvement)
- Maintains conversation flow across multiple turns
- Tracks mentioned entities (meals, metrics, exercises)

**Smart Follow-ups:**
- "Is that good?" → Evaluates based on context
- "Tell me more" → Provides detailed breakdown
- "How can I improve it?" → Gives specific advice
- "Something else" → Offers alternatives

#### 5. Security & Integration
**Security Validator:**
- Jailbreak prevention (ignore instructions, roleplay attempts)
- Data fishing protection (SQL injection, cross-user access)
- Sensitive operations blocking (delete account, admin access)
- Spam/abuse detection with rate limiting
- Function call parameter validation

**Request Tracing:**
- Complete request flow tracking
- Performance metrics (response time, tokens, function calls)
- Error logging with context
- Debug endpoints for development
- Statistics and percentiles

### System Prompt Strategy
The AI assistant uses a comprehensive system prompt that defines:
- **Role**: Wellness assistant specializing in health, fitness, and nutrition
- **Capabilities**: Health metrics analysis, meal planning, recipe suggestions, progress tracking
- **Tone**: Friendly, supportive, encouraging, and empathetic
- **Boundaries**: No medical diagnoses, always suggests professional consultation for medical concerns
- **Privacy**: No access to sensitive PII, guides to account settings for such requests
- **Domain Knowledge**: Understanding of BMI, wellness scores, nutrition principles, fitness goals

### AI Model Configuration
- **Model**: GPT-3.5-turbo
- **Temperature**: 0.6 (balanced consistency vs creativity)
- **Max Tokens**: 500 (concise responses)
- **Top-p**: 0.95 (focused relevance)
- **Rationale**: Optimal balance of context window (4,096 tokens), latency (~1-2s), and cost-effectiveness

### Error Handling Strategy
- **API Failures**: Falls back to mock responses with real data access
- **Rate Limiting**: Implements retry logic with exponential backoff
- **Invalid Input**: Validates message length, content, and structure
- **Timeout Handling**: 30-second timeout with user-friendly messages
- **Recovery**: Maintains conversation state even after errors
- **Typo Tolerance**: Recognizes common misspellings and variations

## Project Structure
```
wellness-platform/
│
├── README.md
├── .gitignore
├── package.json
├── package-lock.json
│
├── backend/
│   ├── package.json
│   ├── package-lock.json
│   ├── server.js                        # Express server setup
│   ├── .env                              # Environment variables
│   │
│   ├── config/
│   │   └── passport.js                  # Passport JWT strategy
│   │
│   ├── middleware/
│   │   ├── auth.js                      # Authentication middleware
│   │   └── security.js                  # Security middleware
│   │
│   ├── models/
│   │   ├── User.js                      # User authentication model
│   │   ├── HealthProfile.js             # Health profile with BMI, wellness score
│   │   ├── HealthHistory.js             # Historical health data tracking
│   │   ├── AIInsight.js                 # AI-generated insights storage
│   │   ├── UserPreferences.js           # Nutrition preferences (dietary, allergies)
│   │   ├── Recipe.js                    # Recipe model with nutrition data
│   │   ├── Ingredient.js                # Ingredient model with units
│   │   ├── MealPlan.js                  # Meal plan with versioning support
│   │   └── Conversation.js              # Chat history & session management (NEW)
│   │
│   ├── routes/
│   │   ├── auth.js                      # Authentication routes
│   │   ├── healthProfile.js             # Health profile CRUD routes
│   │   ├── analytics.js                 # Analytics and dashboard routes
│   │   ├── nutrition.js                 # Nutrition routes (preferences, meal plans, recipes)
│   │   └── chat.js                      # AI Assistant chat endpoints (NEW)
│   │                                     # - POST /start - Initialize session
│   │                                     # - GET /history/:sessionId - Get history
│   │                                     # - POST /message - Send to AI
│   │                                     # - PUT /mode - Update response mode
│   │                                     # - POST /end - End conversation
│   │
│   └── utils/
│       ├── email.js                     # Email service for verification
│       ├── jwt.js                       # JWT token utilities
│       ├── aiService.js                 # OpenAI integration for insights
│       ├── mealPlanningService.js       # Meal plan generation with sequential prompting
│       ├── ragService.js                # RAG for recipe search
│       ├── nutritionCalculator.js       # Nutrition calculations & function calling
│       ├── shoppingListService.js       # Shopping list generation (5+ categories)
│       ├── nutritionAnalysisService.js  # Daily/weekly nutrition analysis
│       ├── aiChatService.js             # AI chat response generation (NEW)
│       ├── dataAccessFunctions.js       # Function calling implementations (NEW)
│       ├── conversationHandlers.js      # 6 conversation type handlers (NEW)
│       ├── contextManager.js            # Multi-turn context management (NEW)
│       ├── securityValidator.js         # Jailbreak & security checks (NEW)
│       └── requestTracer.js             # Request flow tracing (NEW)
│
└── frontend/
    ├── package.json
    ├── package-lock.json
    ├── tailwind.config.js               # Tailwind CSS configuration
    │
    ├── public/
    │   ├── index.html
    │   ├── favicon.ico
    │   └── manifest.json
    │
    └── src/
        ├── index.js                     # React app entry point
        ├── index.css                    # Global styles with Tailwind
        ├── App.js                       # Main app component with routing
        ├── App.css                      # App-specific styles
        │
        ├── components/
        │   ├── Charts.js                # Chart components (Line, Bar, Doughnut, etc.)
        │   ├── ErrorBoundary.js         # Error boundary wrapper
        │   ├── ProtectedRoute.js       # Route protection HOC
        │   └── TwoFactorSetup.js       # 2FA setup component
        │
        ├── context/
        │   └── AuthContext.js           # Authentication context provider
        │
        └── pages/
            ├── HomePage.js              # Landing page
            ├── LoginPage.js             # User login
            ├── RegisterPage.js          # User registration
            ├── ProfilePage.js           # Health profile management
            ├── DashboardPage.js         # Main dashboard with wellness score
            ├── ForgotPasswordPage.js    # Password recovery
            ├── ResetPasswordPage.js     # Password reset
            ├── VerifyEmailPage.js       # Email verification
            ├── VerifyPendingPage.js     # Verification pending notice
            │
            # Nutrition Features (Project 2)
            ├── NutritionPreferencesPage.js  # Dietary preferences, allergies (15+ options)
            ├── MealPlannerPage.js           # Meal plan generation & management
            ├── RecipeSearchPage.js          # Recipe search with RAG & visualizations
            ├── ShoppingListPage.js          # Categorized shopping lists
            ├── NutritionAnalysisPage.js    # Complete nutritional analysis with charts
            │
            # AI Assistant Feature (Project 3)
            └── ChatAssistantPage.js     # AI chat interface with markdown support (NEW)

