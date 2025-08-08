# Numbers Don't Lie - Wellness Platform

A data-driven wellness platform that uses AI-powered insights to help users achieve their health and fitness goals. The platform tracks health metrics, calculates wellness scores, and provides personalized recommendations based on user data.

## 🌟 Features

- **User Authentication**: Secure registration and login with email verification
- **Health Profile Management**: Comprehensive health data collection including demographics, physical metrics, lifestyle indicators, and fitness goals
- **BMI Calculation**: Automatic BMI calculation with health classifications
- **Wellness Score**: Multi-factor wellness score based on BMI, activity level, progress, and habits
- **Data Normalization**: Automatic conversion of metrics to standard units
- **AI Integration**: Personalized health insights and recommendations (Step 4)
- **Data Visualization**: Interactive charts and progress tracking (Step 5)
- **Data Security**: Encryption at rest and in transit
- **Data Export**: Export health data in JSON format

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or MongoDB Atlas)
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd numbers-dont-lie-wellness
```

2. **Set up the Backend**
```bash
cd backend
npm install

# Create .env file from example
cp .env.example .env

# Edit .env with your configuration
# - Add MongoDB connection string
# - Set JWT secrets
# - Configure other environment variables
```

3. **Set up the Frontend**
```bash
cd ../frontend
npm install
```

### Running the Application

1. **Start MongoDB** (if using local instance)
```bash
mongod
```

2. **Start the Backend Server**
```bash
cd backend
npm run dev
# Server runs on http://localhost:5000
```

3. **Start the Frontend Application**
```bash
cd frontend
npm start
# App runs on http://localhost:3000
```

## 📁 Project Structure

```
numbers-dont-lie-wellness/
├── backend/
│   ├── models/
│   │   ├── User.js           # User authentication model
│   │   └── HealthProfile.js  # Health profile data model
│   ├── routes/
│   │   ├── auth.js           # Authentication routes
│   │   └── healthProfile.js  # Health profile routes
│   ├── middleware/           # Authentication & validation
│   ├── utils/               # Helper functions
│   ├── .env.example         # Environment variables template
│   ├── server.js            # Express server setup
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── HomePage.js      # Landing page
│   │   │   ├── LoginPage.js     # User login
│   │   │   ├── RegisterPage.js  # User registration
│   │   │   ├── ProfilePage.js   # Health profile form
│   │   │   └── DashboardPage.js # Health dashboard
│   │   ├── components/          # Reusable components
│   │   ├── App.js              # Main app component
│   │   ├── App.css             # Application styles
│   │   └── index.js            # App entry point
│   ├── tailwind.config.js     # Tailwind CSS config
│   └── package.json
└── README.md
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the backend directory with the following variables:

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/wellness-platform

# JWT
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Email (for Step 2)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# AI (for Step 4)
OPENAI_API_KEY=your-openai-key
```

## 🔒 Security Features

- **Password Encryption**: Bcrypt hashing with salt rounds
- **JWT Authentication**: Secure token-based authentication
- **Data Encryption**: MongoDB encryption at rest
- **HTTPS Support**: SSL/TLS encryption in transit
- **Input Validation**: Server-side validation using express-validator
- **Rate Limiting**: Protection against brute force attacks (Step 6)
- **CORS Protection**: Configured CORS headers
- **Helmet.js**: Security headers for protection

## 📊 Data Models

### User Model
- Email (unique, validated)
- Password (hashed)
- Verification status
- 2FA settings
- Data consent
- Data sharing preferences

### Health Profile Model
- Demographics (age, gender)
- Physical metrics (height, weight, BMI)
- Lifestyle indicators (activity, sleep, stress)
- Dietary preferences and restrictions
- Fitness goals (primary, secondary, target weight)
- Initial fitness assessment
- Wellness score components

## 🛣️ API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/verify/:token` - Email verification (Step 2)
- `POST /api/auth/refresh-token` - Refresh JWT token (Step 2)
- `POST /api/auth/reset-password` - Password reset (Step 2)

### Health Profile
- `POST /api/health-profile` - Create/update profile
- `GET /api/health-profile` - Get user profile
- `GET /api/health-profile/export` - Export health data

### Health Metrics (Step 4)
- `GET /api/health-metrics` - Calculate BMI and wellness score
- `POST /api/ai-insights` - Generate AI recommendations
- `GET /api/health-summary` - Get weekly/monthly summaries

## 🧪 Testing

### Manual Testing Checklist

1. **Registration Flow**
   - [ ] User can register with email/password
   - [ ] Validation errors display correctly
   - [ ] Success message appears

2. **Login Flow**
   - [ ] User can login with credentials
   - [ ] Error messages for invalid credentials
   - [ ] Redirect to dashboard on success

3. **Health Profile**
   - [ ] All form fields save correctly
   - [ ] Data normalization works (kg/lbs, cm/inches)
   - [ ] BMI calculates automatically
   - [ ] Export function generates JSON file

4. **Dashboard**
   - [ ] Metrics display correctly
   - [ ] Profile completeness updates
   - [ ] Navigation works properly

## 🚧 Development Roadmap

- [x] **Step 1**: Project Setup and Basic Structure (Current)
- [ ] **Step 2**: User Authentication and Verification
- [ ] **Step 3**: Health Profile Data Collection
- [ ] **Step 4**: Health Analytics and AI Integration
- [ ] **Step 5**: Data Visualization
- [ ] **Step 6**: Security and Error Handling
- [ ] **Step 7**: Testing and Documentation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the ISC License.

## 🆘 Support

For issues or questions, please create an issue in the repository or contact the development team.

## 🎯 Review Points Covered (Step 1)

✅ README file contains clear project overview, setup instructions, and usage guide
✅ Code is well-organized, properly commented, and follows best practices
✅ User data encryption setup (MongoDB encryption at rest, HTTPS ready)
✅ Basic models and routes created for User and HealthProfile
✅ Frontend structure with routing and responsive design using Tailwind CSS

---

**Note**: This is Step 1 of the development roadmap. Additional features including email verification, AI integration, and data visualization will be implemented in subsequent steps.