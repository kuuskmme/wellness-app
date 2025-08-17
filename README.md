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

# Install additional dependencies for AI Assistant
cd backend
npm install openai react-markdown
```

### Configuration
Create `backend/.env`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/wellness-platform
JWT_SECRET=change-this-secret-key-12345
JWT_REFRESH_SECRET=change-this-refresh-key-67890
FRONTEND_URL=http://localhost:3000

# AI Assistant Configuration (Required for Step 1+)
OPENAI_API_KEY=sk-your-key-here
AI_MODEL=gpt-3.5-turbo
AI_TEMPERATURE=0.6
AI_MAX_TOKENS=500
AI_TOP_P=0.95
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

### System Prompt Strategy
The AI assistant uses a comprehensive system prompt that defines:
- **Role**: Wellness assistant specializing in health, fitness, and nutrition
- **Capabilities**: Health metrics analysis, meal planning, recipe suggestions, progress tracking
- **Tone**: Friendly, supportive, encouraging, and empathetic
- **Boundaries**: No medical diagnoses, always suggests professional consultation for medical concerns
- **Domain Knowledge**: Understanding of BMI, wellness scores, nutrition principles, fitness goals

### AI Model Rationale
- **Model**: GPT-3.5-turbo selected for optimal balance of:
  - Context window (4,096 tokens) sufficient for 5-10 turn conversations
  - Low latency (~1-2 seconds response time)
  - Cost-effectiveness for high-volume usage
  - Reliable function calling support
- **Parameters**:
  - Temperature: 0.6 (balanced consistency vs creativity)
  - Top-p: 0.95 (focused relevance)
  - Max tokens: 500 (concise responses)

### Conversation Approach
- **History Management**: Maintains rolling window of 10 messages
- **Context Preservation**: Stores user profile data (name, goals, metrics)
- **Session Handling**: Auto-creates new sessions after 1 hour of inactivity
- **Memory Efficiency**: Automatic pruning of old messages to manage tokens

### Error Handling
- **API Failures**: Falls back to mock responses when OpenAI unavailable
- **Rate Limiting**: Implements retry logic with exponential backoff
- **Invalid Input**: Validates message length (max 1000 chars) and content
- **Timeout Handling**: 30-second timeout with user-friendly error messages
- **Recovery Strategy**: Maintains conversation state even after errors

### Function Calling (Step 2 Ready)
The system is architected to support 4+ function calls:
1. `get_health_metrics` - Retrieve BMI, weight, wellness scores
2. `get_nutrition_data` - Access meal plans, recipes, nutritional analysis
3. `get_progress_summary` - Track goal progress and achievements
4. `get_general_insights` - Provide wellness tips and recommendations

Each function will include:
- Parameter validation (enums, ranges, required fields)
- Error handling for missing/incomplete data
- Standardized unit conversion (kg, cm, kcal)
- User data isolation (no PII exposure)

### Response Format Examples

#### Health Metrics Response
```
Your **BMI is 24.2**, which falls in the normal weight range (18.5-24.9). 
Your wellness score is **78/100**, showing good overall health habits.
```

#### Meal Planning Response
```
Here's your breakfast suggestion:
• **Scrambled eggs** (3 eggs) - 18g protein
• **Whole grain toast** (2 slices) - 8g protein  
• **Greek yogurt** with berries - 15g protein
Total: **41g protein**, 520 calories
```

#### Progress Tracking Response
```
Great progress this month!
• Weight loss: **2.3 kg** ✓
• Progress to goal: **65%**
• Activity level: Increased by **20%**
```

## Core Features & Review Points

### ✅ Step 1 Completed
- **Conversation Model**: Stores chat history with timestamps and user context
- **Chat Endpoints**: Session management, history retrieval, message processing
- **AI Integration**: OpenAI GPT-3.5 with comprehensive system prompt
- **Error Handling**: Graceful fallbacks, timeout handling, validation
- **Response Formatting**: Markdown support with bullets, bold text, clear structure
- **Context Management**: Maintains 5-10 message history without loss
- **Mode Support**: Concise/detailed response modes

### ✅ Core Functionality (From Projects 1-2)
- **Authentication**: JWT with refresh tokens, email verification
- **Health Profile**: BMI calculation, wellness scoring, activity tracking
- **Nutrition Preferences**: 15+ dietary options, 10+ allergy types
- **Meal Planning**: Sequential AI prompting (3+ steps), daily/weekly plans
- **Recipe Management**: RAG-powered search, 500+ recipes/ingredients
- **Shopping Lists**: 5+ auto-categories, quantity adjustment
- **Nutritional Analysis**: Real-time calculations, macro tracking, visualizations

## Testing Checklist

### AI Assistant Testing (Step 1)
1. **Chat Initialization**: 
   - Navigate to `/chat` or click "AI Assistant" from dashboard
   - Verify welcome message appears
   - Check session creation in MongoDB

2. **Conversation Flow**:
   - Send "What's my BMI?" - verify formatted response
   - Send "Help me with breakfast" - verify meal suggestions
   - Send "How's my progress?" - verify progress tracking
   - Test 5+ message exchanges to verify context retention

3. **Error Handling**:
   - Send empty message - verify validation
   - Send 1000+ character message - verify length limit
   - Disconnect internet briefly - verify error recovery

4. **Mode Testing**:
   - Toggle between concise/detailed modes
   - Verify response length changes appropriately

### Existing Features Testing
1. **Register** → Login → Complete **Health Profile**
2. Set **Nutrition Preferences** (verify 15+ dietary, 10+ allergies)
3. Generate **Meal Plan** (check sequential prompting in logs)
4. **Search Recipes** → Apply filters → Generate custom
5. View **Shopping List** (confirm 5+ categories)
6. Check **Nutritional Analysis** charts
7. Verify **Dashboard Integration** with Project 1 data

## API Endpoints

Base: `http://localhost:5000/api`

### AI Assistant Routes (New)
- `POST /chat/start` - Initialize chat session
- `GET /chat/history/:sessionId?` - Get conversation history
- `POST /chat/message` - Send message to AI
- `PUT /chat/mode` - Update response mode
- `POST /chat/end` - End conversation session

### Nutrition Routes
- `POST /nutrition/preferences/sync` - Sync with health profile
- `GET/POST /nutrition/meal-plan` - Generate plans
- `GET /nutrition/recipes/search` - RAG search
- `POST /nutrition/recipes/generate` - Custom recipes
- `GET /nutrition/shopping-list` - Categorized list
- `GET /nutrition/analysis/daily` - Nutrition tracking

## Project Structure Updates

```
backend/
├── models/
│   └── Conversation.js          # NEW: Chat history & session management
├── routes/
│   └── chat.js                  # NEW: Chat endpoints
└── utils/
    └── aiChatService.js         # NEW: AI response generation

frontend/
└── src/
    └── pages/
        └── ChatAssistantPage.js # NEW: Chat interface
```

## Common Issues

**OpenAI API Errors**
- Verify API key is correct in `.env`
- Check OpenAI account has credits
- System falls back to mock responses if API unavailable

**Chat History Not Loading**
- Check MongoDB connection
- Verify Conversation model indexes created
- Clear browser cache and reload

**Message Send Failures**
- Check network connection
- Verify backend is running on port 5000
- Check browser console for CORS errors

## Next Steps (Step 2-5)

### Step 2: Data Access Layer
- Implement 4+ function calling endpoints
- Add parameter validation
- Integrate with existing health/nutrition data

### Step 3: Personalization
- Enhance system prompt with user context
- Add 6 conversation type handlers
- Implement insights generation

### Step 4: Multi-turn Context
- Add reference resolution ("that", "it")
- Implement follow-up handling
- Add conversation memory management

### Step 5: Integration & Security
- Add jailbreak protection
- Implement request tracing
- Complete integration tests

---

**Built with Node.js, Express, MongoDB, React, and OpenAI GPT-3.5**