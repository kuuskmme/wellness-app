# Numbers Don't Lie - Wellness Platform

A comprehensive data-driven wellness platform with AI-powered health insights, secure authentication, and interactive data visualization.

## 🚀 Quick Start

### Prerequisites
- Node.js v14+
- MongoDB (local or Atlas)
- npm or yarn

### Installation & Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd wellness-platform
```

2. **Install dependencies**
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

3. **Configure environment variables**

Create `backend/.env` file:
```env
# Required
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/wellness-platform
JWT_SECRET=your-secret-key-change-this
JWT_REFRESH_SECRET=your-refresh-secret-change-this
FRONTEND_URL=http://localhost:3000

# Optional (uses fallbacks if not set)
# OPENAI_API_KEY=sk-your-openai-key
# EMAIL_HOST=smtp.gmail.com
# EMAIL_PORT=587
# EMAIL_USER=your-email@gmail.com
# EMAIL_PASS=your-app-password
```

4. **Start MongoDB**
```bash
# Local MongoDB
mongod

# Or use MongoDB Atlas with connection string in .env
```

5. **Run the application**
```bash
# Terminal 1 - Backend (port 5000)
cd backend
npm run dev

# Terminal 2 - Frontend (port 3000)
cd frontend
npm start
```

6. **Access the application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api
- Health Check: http://localhost:5000/api/health

## 📝 Testing the Application

### 1. User Registration & Verification
- Register at http://localhost:3000/register
- **Verification link appears in backend console** (email service optional)
- Copy the link from console and visit it to verify email
- Login after verification

### 2. Complete Health Profile
- Navigate to Profile page
- Fill all sections (demographics, physical metrics, lifestyle, goals)
- Must accept data consent to save
- BMI auto-calculates from height/weight

### 3. View Dashboard
- See wellness score (0-100)
- View BMI with classification
- Generate AI insights (uses fallback if no OpenAI key)
- Track progress with interactive charts

## 🔑 Key Features

- **Secure Authentication**: JWT with 15-min access tokens, email verification, 2FA support
- **Health Metrics**: BMI calculation, wellness scoring, goal tracking
- **AI Insights**: Personalized recommendations (OpenAI or fallback)
- **Data Visualization**: Interactive charts with Chart.js
- **Privacy**: GDPR-compliant with data export, consent management
- **Security**: Rate limiting, input sanitization, bcrypt password hashing

## 📁 Project Structure

```
wellness-platform/
├── backend/
│   ├── models/          # Data models (User, HealthProfile)
│   ├── routes/          # API endpoints
│   ├── middleware/      # Auth & security
│   ├── utils/           # Helpers (email, JWT, AI)
│   ├── config/          # Passport OAuth config
│   └── server.js        # Express server
├── frontend/
│   ├── src/
│   │   ├── pages/       # Page components
│   │   ├── components/  # Reusable components
│   │   ├── context/     # Auth context
│   │   └── App.js       # Main app with routing
│   └── package.json
└── README.md
```

## 🔐 Default Test Credentials

No default users. Register your own account:
1. Any email (verification link in console)
2. Password: minimum 8 characters
3. Email verification required before login

## 🛠️ Troubleshooting

| Issue | Solution |
|-------|----------|
| MongoDB connection failed | Start MongoDB: `mongod` or check Atlas connection string |
| Port already in use | Kill process: `lsof -i :5000` then `kill -9 <PID>` |
| Module not found | Run `npm install` in both backend and frontend |
| CORS errors | Ensure backend is running on port 5000 |
| No verification email | Check backend console for verification link |
| AI insights not working | Normal - uses fallback if no OpenAI API key |

## 📚 API Endpoints

### Authentication
- POST `/api/auth/register` - User registration
- GET `/api/auth/verify/:token` - Email verification
- POST `/api/auth/login` - User login
- POST `/api/auth/refresh-token` - Refresh JWT
- POST `/api/auth/forgot-password` - Password reset

### Health Profile
- GET/POST `/api/health-profile` - Manage health profile
- GET `/api/health-profile/wellness-score` - Calculate wellness score
- GET `/api/health-profile/export` - Export health data

### Analytics
- GET `/api/analytics/health-metrics` - Get health metrics
- POST `/api/analytics/ai-insights` - Generate AI insights
- GET `/api/analytics/health-summary/weekly` - Weekly summary

## 🧪 Review Points Verification

The application implements all mandatory requirements:
- ✅ Email verification required for login
- ✅ JWT tokens expire after 15 minutes
- ✅ Refresh token mechanism
- ✅ Health data collection with normalization
- ✅ BMI calculation with classifications
- ✅ Wellness score (0-100) with multi-factor calculation
- ✅ AI-powered insights with fallback
- ✅ Data visualization with responsive charts
- ✅ Rate limiting and security measures
- ✅ GDPR compliance with data export

## 📞 Support

For issues, check the backend console for debugging information. Verification links and error messages appear there during development.

---

**Built with Node.js, Express, MongoDB, React, and Chart.js**