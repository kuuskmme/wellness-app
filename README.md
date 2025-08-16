# Wellness & Nutrition Platform

AI-powered wellness platform with personalized meal planning, recipe management, and nutritional analysis.

## Quick Setup (15 minutes)

### Prerequisites
- Node.js 14+ & npm 6+
- MongoDB 4.4+ running locally
- OpenAI API key (optional - system works without it)

### Installation
```bash
# Clone and install
git clone [repository-url]
cd wellness-platform

# Install all dependencies
cd backend && npm install
cd ../frontend && npm install
```

### Configuration
Create `backend/.env`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/wellness-platform
JWT_SECRET=change-this-secret-key-12345
JWT_REFRESH_SECRET=change-this-refresh-key-67890
FRONTEND_URL=http://localhost:3000

# Optional for AI features
OPENAI_API_KEY=sk-your-key-here
AI_MODEL=gpt-3.5-turbo
```

### Run Application
```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend  
cd frontend && npm start
```

Access at `http://localhost:3000`

## Key Features & Review Points

### ✅ Core Functionality
- **Authentication**: JWT with refresh tokens, email verification
- **Health Profile**: BMI calculation, wellness scoring, activity tracking
- **Nutrition Preferences**: 15+ dietary options, 10+ allergy types
- **Meal Planning**: Sequential AI prompting (3+ steps), daily/weekly plans
- **Recipe Management**: RAG-powered search, 500+ recipes/ingredients
- **Shopping Lists**: 5+ auto-categories, quantity adjustment
- **Nutritional Analysis**: Real-time calculations, macro tracking, visualizations

### ✅ Technical Implementation
- **AI Strategy**: 
  - Sequential prompting with few-shot examples
  - Function calling for nutrition calculations
  - RAG for recipe search (vector embeddings)
  - Fallback to mock data when AI unavailable
- **Data Handling**:
  - ISO 8601 dates throughout (moment.js)
  - Standardized units (g/ml/kcal/min)
  - Content versioning for meal plans
  - Reuses Project 1 data (no duplication)
- **Error Recovery**:
  - API rate limiting with retry logic
  - Caching for failed requests
  - Graceful degradation without AI

## Testing Checklist

1. **Register** → Login → Complete **Health Profile**
2. Set **Nutrition Preferences** (verify 15+ dietary, 10+ allergies)
3. Generate **Meal Plan** (check sequential prompting in logs)
4. **Search Recipes** → Apply filters → Generate custom
5. View **Shopping List** (confirm 5+ categories)
6. Check **Nutritional Analysis** charts
7. Verify **Dashboard Integration** with Project 1 data

## API Endpoints

Base: `http://localhost:5000/api`

### Nutrition Routes
- `POST /nutrition/preferences/sync` - Sync with health profile
- `GET/POST /nutrition/meal-plan` - Generate plans
- `GET /nutrition/recipes/search` - RAG search
- `POST /nutrition/recipes/generate` - Custom recipes
- `GET /nutrition/shopping-list` - Categorized list
- `GET /nutrition/analysis/daily` - Nutrition tracking

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
│   │   └── MealPlan.js                  # Meal plan with versioning support
│   │
│   ├── routes/
│   │   ├── auth.js                      # Authentication routes
│   │   ├── healthProfile.js             # Health profile CRUD routes
│   │   ├── analytics.js                 # Analytics and dashboard routes
│   │   └── nutrition.js                 # Nutrition routes (preferences, meal plans, recipes)
│   │                                     # - POST /preferences/sync (NEW)
│   │                                     # - GET/POST /meal-plan
│   │                                     # - GET /meal-plan/:id (NEW)
│   │                                     # - Versioning routes (NEW)
│   │
│   └── utils/
│       ├── email.js                     # Email service for verification
│       ├── jwt.js                       # JWT token utilities
│       ├── aiService.js                 # OpenAI integration for insights
│       ├── mealPlanningService.js       # Meal plan generation with sequential prompting
│       ├── ragService.js                # RAG for recipe search
│       ├── nutritionCalculator.js       # Nutrition calculations & function calling
│       ├── shoppingListService.js       # Shopping list generation (5+ categories)
│       └── nutritionAnalysisService.js  # Daily/weekly nutrition analysis
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
            └── NutritionAnalysisPage.js    # Complete nutritional analysis with charts

## Common Issues

**MongoDB Connection Failed**
```bash
# Ensure MongoDB is running
mongod --dbpath=/data/db
```

**AI Features Not Working**
- System uses mock data without OpenAI key
- Check console for "Using mock data" messages

**Module Errors**
```bash
rm -rf node_modules package-lock.json
npm install
```

## For Reviewers

The platform demonstrates:
- **Sequential AI prompting** (check backend logs for 3+ step process)
- **RAG implementation** with vector search
- **Function calling** for nutrition calculations
- **Error handling** with fallbacks and retry logic
- **Data integration** from Project 1 without duplication
- **15+ dietary preferences** and **10+ allergies** support
- **500+ recipes/ingredients** in database
- **5+ shopping list categories** auto-generated
- **ISO 8601 compliance** for all dates/times
- **Content versioning** for meal plan restore

---

**Built with Node.js, Express, MongoDB, React, and OpenAI**