# Wellness & Nutrition Platform - Complete Setup Guide

A comprehensive data-driven wellness and nutrition platform with AI-powered health insights, personalized meal planning, and secure authentication.

## 📋 Table of Contents
- [System Requirements](#system-requirements)
- [Quick Start Guide](#quick-start-guide)
- [Detailed Installation](#detailed-installation)
- [Configuration Guide](#configuration-guide)
- [Running the Application](#running-the-application)
- [Testing the Features](#testing-the-features)
- [Troubleshooting](#troubleshooting)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)

## 🖥️ System Requirements

### Required Software
- **Node.js**: Version 14.0 or higher ([Download](https://nodejs.org/))
- **MongoDB**: Version 4.4 or higher ([Download](https://www.mongodb.com/try/download/community))
- **npm**: Version 6.0 or higher (comes with Node.js)
- **Git**: For cloning the repository ([Download](https://git-scm.com/))

### Recommended Specifications
- **RAM**: 4GB minimum (8GB recommended)
- **Storage**: 2GB free space
- **OS**: Windows 10/11, macOS 10.14+, or Ubuntu 18.04+

## 🚀 Quick Start Guide

### Step 1: Clone the Repository
```bash
git clone https://github.com/your-username/wellness-platform.git
cd wellness-platform
```

### Step 2: Install MongoDB
1. Download MongoDB Community Server from [MongoDB Official Site](https://www.mongodb.com/try/download/community)
2. Install following the installer instructions
3. Start MongoDB:
   ```bash
   # Windows
   mongod --dbpath="C:\data\db"
   
   # macOS/Linux
   sudo mongod --dbpath=/data/db
   ```

### Step 3: Install Dependencies
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Step 4: Configure Environment Variables
Create a file named `.env` in the `backend` folder:
```bash
cd ../backend
touch .env  # macOS/Linux
# or
echo. > .env  # Windows
```

Add the following content to `backend/.env`:
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/wellness-platform

# JWT Secrets (IMPORTANT: Change these in production!)
JWT_SECRET=your-super-secret-jwt-key-change-this-12345
JWT_REFRESH_SECRET=your-refresh-token-secret-change-this-67890

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Email Configuration (Optional - for email features)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-specific-password

# OpenAI Configuration (Optional - for AI features)
# Get your API key from: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your-openai-api-key-here
AI_MODEL=gpt-3.5-turbo

# Vector Database (Optional - for advanced RAG features)
PINECONE_API_KEY=your-pinecone-key
PINECONE_ENVIRONMENT=your-environment
```

### Step 5: Start the Application
```bash
# Terminal 1: Start Backend
cd backend
npm run dev

# Terminal 2: Start Frontend
cd frontend
npm start
```

The application will open automatically at `http://localhost:3000`

## 📝 Detailed Installation

### 1. MongoDB Setup

#### Windows Installation:
1. Download MongoDB Community Server (.msi installer)
2. Run the installer with default settings
3. MongoDB will install as a Windows Service
4. Verify installation:
   ```bash
   mongo --version
   ```

#### macOS Installation:
```bash
# Using Homebrew
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB
brew services start mongodb-community
```

#### Linux (Ubuntu/Debian) Installation:
```bash
# Import MongoDB public GPG key
wget -qO - https://www.mongodb.org/static/pgp/server-4.4.asc | sudo apt-key add -

# Create list file
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/4.4 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-4.4.list

# Update and install
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
```

### 2. Backend Dependencies Installation

Navigate to the backend directory and install all required packages:
```bash
cd backend
npm install

# If you encounter issues, try:
npm install --force
# or
npm cache clean --force
npm install
```

Key packages that will be installed:
- `express`: Web framework
- `mongoose`: MongoDB ODM
- `jsonwebtoken`: JWT authentication
- `bcryptjs`: Password hashing
- `moment-timezone`: Date/time handling
- `openai`: AI integration
- `express-rate-limit`: API rate limiting

### 3. Frontend Dependencies Installation

Navigate to the frontend directory:
```bash
cd ../frontend
npm install

# If you encounter issues with React dependencies:
npm install --legacy-peer-deps
```

Key packages that will be installed:
- `react`: UI library
- `react-router-dom`: Routing
- `axios`: HTTP client
- `tailwindcss`: CSS framework
- `recharts`: Data visualization
- `moment`: Date formatting
- `lucide-react`: Icon library

## ⚙️ Configuration Guide

### Environment Variables Explained

#### Required Variables:
- `PORT`: Backend server port (default: 5000)
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT tokens (MUST change in production)
- `JWT_REFRESH_SECRET`: Secret for refresh tokens (MUST change in production)
- `FRONTEND_URL`: Frontend application URL

#### Optional Variables:
- `OPENAI_API_KEY`: Required for AI features (meal planning, insights)
  - Get from: https://platform.openai.com/api-keys
  - Free tier provides $5 credit
  - Without this, AI features will use mock data

- `EMAIL_*`: Required for email verification
  - For Gmail: Enable 2FA and create an app-specific password
  - Guide: https://support.google.com/accounts/answer/185833

### Getting an OpenAI API Key (For AI Features):
1. Visit https://platform.openai.com/signup
2. Create an account or sign in
3. Navigate to API Keys section
4. Click "Create new secret key"
5. Copy the key (starts with `sk-`)
6. Add to your `.env` file

### Database Initialization

After starting the backend, initialize sample data:
```bash
# First, create a test user account through the UI
# Then run this command to populate sample data

curl -X POST http://localhost:5000/api/nutrition/init-data \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

To get your JWT token:
1. Register a new account at http://localhost:3000/register
2. Open Browser Developer Tools (F12)
3. Go to Application/Storage → Local Storage
4. Copy the `token` value

## 🏃 Running the Application

### Development Mode

Start both servers in development mode with hot-reload:

```bash
# Terminal 1: Backend (Port 5000)
cd backend
npm run dev

# Terminal 2: Frontend (Port 3000)
cd frontend
npm start
```

### Production Mode

Build and run for production:

```bash
# Build frontend
cd frontend
npm run build

# Start backend in production
cd ../backend
NODE_ENV=production npm start
```

### Using PM2 (Process Manager)

For production deployment:
```bash
# Install PM2 globally
npm install -g pm2

# Start backend with PM2
cd backend
pm2 start server.js --name wellness-backend

# Monitor logs
pm2 logs wellness-backend
```

## 🧪 Testing the Features

### 1. User Registration & Authentication
1. Navigate to http://localhost:3000
2. Click "Get Started" or "Register"
3. Fill in registration form:
   - Email: test@example.com
   - Password: Test123!@#
   - Confirm password
4. Check email verification (if email configured)
5. Login with credentials

### 2. Health Profile Setup
1. After login, go to Profile
2. Complete health profile:
   - Age, Gender, Height, Weight
   - Activity level
   - Fitness goals
   - Dietary preferences
3. Save profile

### 3. Nutrition Features
1. Navigate to Nutrition → Preferences
2. Set dietary preferences and allergies
3. Go to Meal Planner:
   - Generate daily/weekly meal plans
   - View alternatives
   - Regenerate individual meals
4. Search Recipes:
   - Use filters for dietary restrictions
   - Generate custom recipes
   - View nutrition information

### 4. Shopping Lists
1. Generate meal plan first
2. Go to Shopping List
3. View categorized ingredients
4. Adjust quantities
5. Export list

### 5. Nutritional Analysis
1. Navigate to Analysis
2. View daily macro breakdown
3. Check weekly trends
4. Get AI insights (requires OpenAI API key)

## 🔧 Troubleshooting

### Common Issues and Solutions

#### MongoDB Connection Error
```
Error: MongoNetworkError: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution**: Ensure MongoDB is running
```bash
# Check if MongoDB is running
ps aux | grep mongod  # Linux/macOS
tasklist | findstr mongod  # Windows

# Start MongoDB if not running
mongod --dbpath=/data/db
```

#### Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::5000
```
**Solution**: Kill the process or use different port
```bash
# Find process using port 5000
lsof -i :5000  # macOS/Linux
netstat -ano | findstr :5000  # Windows

# Kill process or change PORT in .env
```

#### OpenAI API Error
```
Error: Invalid API key provided
```
**Solution**: 
1. Verify API key in .env file
2. Check OpenAI account for valid key
3. Ensure no extra spaces in the key
4. Application works without API key (uses mock data)

#### Frontend Not Loading
```
Error: Cannot GET /
```
**Solution**:
1. Ensure frontend is running on port 3000
2. Check FRONTEND_URL in backend .env
3. Clear browser cache
4. Try incognito/private mode

#### Module Not Found Errors
```
Error: Cannot find module 'express'
```
**Solution**:
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Development Tips

1. **Check Logs**: Backend logs are in terminal running `npm run dev`
2. **Browser Console**: Check for frontend errors (F12 → Console)
3. **Network Tab**: Monitor API calls (F12 → Network)
4. **MongoDB Compass**: Use for database visualization
5. **Postman**: Test API endpoints directly

## 📁 Project Structure

```
wellness-platform/
├── backend/
│   ├── config/          # Configuration files
│   ├── middleware/      # Express middleware
│   ├── models/          # MongoDB schemas
│   ├── routes/          # API routes
│   ├── utils/           # Utility functions
│   └── server.js        # Entry point
├── frontend/
│   ├── public/          # Static files
│   └── src/
│       ├── components/  # Reusable components
│       ├── context/     # React context
│       ├── pages/       # Page components
│       └── App.js       # Main component
└── README.md
```

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Main Endpoints

#### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh token
- `POST /auth/logout` - Logout

#### Health Profile
- `GET /health-profile` - Get profile
- `POST /health-profile` - Create/update profile
- `GET /health-profile/wellness-score` - Get wellness score

#### Nutrition
- `GET /nutrition/preferences` - Get preferences
- `PUT /nutrition/preferences` - Update preferences
- `POST /nutrition/meal-plan` - Generate meal plan
- `GET /nutrition/recipes/search` - Search recipes
- `POST /nutrition/recipes/generate` - Generate custom recipe
- `GET /nutrition/shopping-list` - Get shopping list
- `GET /nutrition/analysis/daily` - Daily analysis

### Authentication Headers
Include JWT token in requests:
```javascript
headers: {
  'Authorization': 'Bearer YOUR_JWT_TOKEN',
  'Content-Type': 'application/json'
}
```

## 🎓 For Reviewers

### Key Features to Test
1. **User Registration** with email verification
2. **Health Profile** creation and BMI calculation
3. **Nutrition Preferences** with 15+ dietary options
4. **Meal Planning** with sequential AI prompting
5. **Recipe Search** with RAG implementation
6. **Shopping Lists** with 5+ categories
7. **Nutritional Analysis** with visualizations
8. **Dashboard Integration** combining all features

### Technical Highlights
- JWT authentication with refresh tokens
- MongoDB with proper indexing
- AI integration with fallback mechanisms
- Rate limiting and security middleware
- ISO 8601 date/time compliance
- Responsive design with Tailwind CSS
- Data visualization with Recharts
- Error handling and recovery strategies

### Review Checklist
- ✅ All dependencies install correctly
- ✅ MongoDB connects successfully
- ✅ Application runs without errors
- ✅ User can register and login
- ✅ Health profile saves correctly
- ✅ Meal plans generate (with or without AI)
- ✅ Recipes searchable and filterable
- ✅ Shopping lists categorized properly
- ✅ Nutritional analysis displays charts
- ✅ Dashboard shows integrated data

## 📞 Support

For issues or questions:
1. Check console logs for detailed error messages
2. Verify all environment variables are set
3. Ensure MongoDB is running
4. Confirm all dependencies installed
5. Try clearing browser cache and cookies

## 📄 License

MIT License - See LICENSE file for details

---

**Built with ❤️ using Node.js, Express, MongoDB, React, and OpenAI**