# Numbers Don't Lie - Wellness Platform

A data-driven wellness platform that uses AI-powered insights to help users achieve their health and fitness goals. The platform tracks health metrics, calculates wellness scores, and provides personalized recommendations based on user data.

## 🌟 Features

### Implemented (Steps 1-2)
- **User Authentication**: 
  - JWT-based authentication with access/refresh tokens
  - Email verification system (using Ethereal for testing)
  - Password reset via email
  - Two-factor authentication (2FA) with QR codes
  - OAuth support structure (Google & GitHub ready)
- **Health Profile Management**: Comprehensive health data collection including demographics, physical metrics, lifestyle indicators, and fitness goals
- **BMI Calculation**: Automatic BMI calculation with health classifications
- **Wellness Score**: Multi-factor wellness score based on BMI, activity level, progress, and habits
- **Data Normalization**: Automatic conversion of metrics to standard units
- **Data Security**: 
  - Bcrypt password hashing
  - JWT tokens with 15-minute expiry
  - Rate limiting on auth endpoints
  - MongoDB Atlas with encryption at rest
- **Data Export**: Export health data in JSON format

### Coming Soon (Steps 3-7)
- **AI Integration**: Personalized health insights and recommendations
- **Data Visualization**: Interactive charts and progress tracking
- **Advanced Analytics**: Weekly/monthly health summaries
- **Social Features**: Community support and challenges

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher, v18 recommended)
- MongoDB Atlas account (free tier) or local MongoDB
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd wellness-app
```

2. **Set up the Backend**
```bash
cd backend
npm install

# Create .env file from example
cp .env.example .env

# Edit .env with your configuration
# Required: MongoDB connection string and JWT secrets
```

3. **Set up the Frontend**
```bash
cd ../frontend
npm install
```

### Running the Application

1. **Start the Backend Server**
```bash
cd backend
npm run dev
# Server runs on http://localhost:5000
```

2. **Start the Frontend Application** (in a new terminal)
```bash
cd frontend
npm start
# App runs on http://localhost:3000
```

## 📁 Project Structure

```
wellness-app/
├── backend/
│   ├── config/
│   │   └── passport.js          # OAuth configuration (Google, GitHub)
│   ├── middleware/
│   │   └── auth.js              # JWT verification & rate limiting
│   ├── models/
│   │   ├── User.js              # User model with auth fields
│   │   └── HealthProfile.js    # Health profile data model
│   ├── routes/
│   │   ├── auth.js              # Authentication routes (login, register, 2FA)
│   │   └── healthProfile.js    # Health profile CRUD routes
│   ├── utils/
│   │   ├── email.js             # Email service (verification, reset)
│   │   └── jwt.js               # JWT token generation & 2FA utilities
│   ├── .env.example             # Environment variables template
│   ├── .env                     # Your environment variables (git ignored)
│   ├── server.js                # Express server setup
│   └── package.json
├── frontend/
│   ├── public/
│   │   └── index.html           # React app entry HTML
│   ├── src/
│   │   ├── components/
│   │   │   ├── ProtectedRoute.js    # Route protection component
│   │   │   └── TwoFactorSetup.js    # 2FA setup component
│   │   ├── context/
│   │   │   └── AuthContext.js       # Authentication context & JWT management
│   │   ├── pages/
│   │   │   ├── HomePage.js          # Landing page
│   │   │   ├── LoginPage.js         # User login with 2FA
│   │   │   ├── RegisterPage.js      # User registration
│   │   │   ├── ProfilePage.js       # Health profile form
│   │   │   ├── DashboardPage.js     # Health dashboard
│   │   │   ├── VerifyEmailPage.js   # Email verification handler
│   │   │   ├── VerifyPendingPage.js # Verification pending screen
│   │   │   ├── ForgotPasswordPage.js # Password reset request
│   │   │   └── ResetPasswordPage.js  # New password form
│   │   ├── App.js               # Main app with routing
│   │   ├── App.css              # Application styles
│   │   ├── index.js             # React entry point
│   │   └── index.css            # Global styles with Tailwind
│   ├── tailwind.config.js      # Tailwind CSS configuration
│   └── package.json
├── .gitignore
└── README.md
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the backend directory with the following variables:

```env
# Server
PORT=5000
NODE_ENV=development

# Database (MongoDB Atlas recommended)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/wellness-platform?retryWrites=true&w=majority

# JWT (Generate secure secrets: openssl rand -base64 32)
JWT_SECRET=your-secret-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Email (Optional - uses Ethereal fake SMTP if not configured)
EMAIL_HOST=smtp.ethereal.email
EMAIL_PORT=587
EMAIL_USER=your-ethereal-username
EMAIL_PASS=your-ethereal-password

# OAuth (Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

## 🔒 Security Features

### Authentication & Authorization
- **JWT Authentication**: Short-lived access tokens (15 min) with refresh tokens
- **Password Security**: Bcrypt hashing with 12 salt rounds
- **2FA Support**: TOTP-based two-factor authentication with QR codes
- **Rate Limiting**: 
  - Registration: 5 attempts/15 min
  - Login: 10 attempts/15 min  
  - Password reset: 3 attempts/15 min

### Data Protection
- **MongoDB Atlas**: Encryption at rest
- **HTTPS Ready**: Configured for SSL/TLS in production
- **Input Validation**: Server-side validation using express-validator
- **CORS Protection**: Configured for frontend origin
- **Security Headers**: Helmet.js for XSS, clickjacking protection

## 📊 Data Models

### User Model
- Email (unique, validated)
- Password (hashed)
- Verification status & tokens
- 2FA settings (secret, enabled flag)
- OAuth IDs (Google, GitHub)
- Data consent & sharing preferences
- Refresh tokens array
- Timestamps

### Health Profile Model
- Demographics (age, gender)
- Physical metrics (height, weight, BMI)
- Lifestyle indicators (activity, sleep, stress)
- Dietary preferences and restrictions
- Fitness goals (primary, secondary, target weight)
- Initial fitness assessment
- Wellness score components
- Automatic unit normalization (kg/lbs, cm/inches)

## 🛣️ API Endpoints

### Authentication (`/api/auth`)
- `POST /register` - User registration with email verification
- `POST /login` - User login (supports 2FA)
- `GET /verify/:token` - Email verification
- `POST /resend-verification` - Resend verification email
- `POST /refresh-token` - Refresh JWT access token
- `POST /logout` - Invalidate refresh tokens
- `POST /forgot-password` - Request password reset
- `POST /reset-password` - Reset password with token
- `POST /2fa/setup` - Generate 2FA QR code
- `POST /2fa/verify` - Enable 2FA with code
- `POST /2fa/disable` - Disable 2FA

### Health Profile (`/api/health-profile`)
- `POST /` - Create/update health profile
- `GET /` - Get user's health profile
- `PATCH /:section` - Update specific section
- `GET /wellness-score` - Calculate wellness score
- `GET /export` - Export health data as JSON
- `DELETE /` - Delete health profile (GDPR)
- `GET /anonymized` - Get anonymized data for AI

## 🧪 Testing

### Test Credentials
For development with auto-verification enabled:
- Email: Any email
- Password: Any password (min 8 chars, uppercase, lowercase, number)

### Manual Testing Checklist

#### Authentication (Step 2) ✅
- [x] User registration with validation
- [x] Email verification flow (Ethereal)
- [x] Login with JWT tokens
- [x] Token refresh mechanism
- [x] Password reset flow
- [x] 2FA setup and verification
- [x] Protected routes require authentication
- [x] Rate limiting prevents spam

#### Health Profile (Step 1) ✅
- [x] Profile creation and updates
- [x] Data normalization (units)
- [x] BMI auto-calculation
- [x] Wellness score calculation
- [x] Data export functionality

## 🚧 Development Roadmap

- [x] **Step 1**: Project Setup and Basic Structure
- [x] **Step 2**: User Authentication and Verification
- [ ] **Step 3**: Health Profile Data Collection (Enhanced)
- [ ] **Step 4**: Health Analytics and AI Integration
- [ ] **Step 5**: Data Visualization
- [ ] **Step 6**: Security and Error Handling
- [ ] **Step 7**: Testing and Documentation

## 💡 Development Tips

### MongoDB Atlas Setup
1. Create free account at mongodb.com/cloud/atlas
2. Create a free M0 cluster
3. Add database user (remember password)
4. Add IP whitelist (0.0.0.0/0 for development)
5. Get connection string and add to .env

### Email Testing
- Leave EMAIL_* variables empty in .env to use Ethereal
- Check backend console for preview URLs after registration
- For production, use SendGrid, AWS SES, or similar

### Auto-Verification (Development)
To skip email verification during development, in `backend/models/User.js`:
```javascript
isVerified: {
  type: Boolean,
  default: true  // Set to true for auto-verification
}
```

### Common Issues & Solutions
- **MongoDB connection fails**: Check IP whitelist in Atlas
- **Login fails**: Ensure `isVerified: true` for development
- **Rate limited**: Restart backend to reset limits
- **CORS errors**: Check FRONTEND_URL in .env matches your frontend

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the ISC License.

## 🆘 Support

For issues or questions, please create an issue in the repository.

## 🎯 Review Points Completed

### Step 1 ✅
- README with clear documentation
- Well-organized, commented code
- User data encryption setup
- Basic models and authentication
- Responsive UI with Tailwind CSS

### Step 2 ✅
- Email verification with 24-hour expiry
- JWT with 15-minute access tokens
- Refresh token mechanism
- Password reset via email
- 2FA implementation with QR codes
- OAuth structure (Google, GitHub)
- Protected routes with middleware
- Rate limiting on auth endpoints
- Comprehensive input validation

---

**Current Status**: Steps 1-2 complete and tested. Ready for Step 3 (Enhanced Health Profile Data Collection).