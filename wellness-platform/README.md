# Wellness Platform

A comprehensive wellness platform for tracking health metrics and fitness goals.

## Project Structure

```
wellness-platform/
├── backend/                 # Backend API server
├── docs/                    # Documentation
├── frontend/                # Frontend (to be implemented)
├── .gitignore               # Git ignore file
└── README.md                # Project documentation
```

## Backend

The backend is a Node.js/Express API with MongoDB as the database.

### Features Implemented:

- Complete user authentication system:
  - Registration with email verification
  - Login with JWT (access & refresh tokens)
  - Password reset functionality
  - User profile management
  - Privacy settings

- Health profile management:
  - Basic demographics collection
  - Physical metrics tracking
  - Lifestyle indicators
  - Dietary preferences
  - Fitness goals tracking

### Tech Stack:

- Node.js & Express
- MongoDB with Mongoose
- JWT for authentication
- Express Validator for input validation

## Setup Instructions

1. Clone the repository
2. Navigate to the backend directory:
   ```
   cd wellness-platform/backend
   ```
3. Install dependencies:
   ```
   npm install
   ```
4. Create a `.env` file with the following variables:
   ```
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/wellness-platform
   JWT_ACCESS_SECRET=your_access_secret_key
   JWT_REFRESH_SECRET=your_refresh_secret_key
   JWT_ACCESS_EXPIRY=15m
   JWT_REFRESH_EXPIRY=7d
   ```
5. Start the development server:
   ```
   npm run dev
   ```

## API Documentation

Refer to the [API Documentation](./docs/api-endpoints.md) for detailed information about the available endpoints.

## Project Status

- ✅ Step 1: Project Setup and Planning - COMPLETED
- ✅ Step 2: User Health Profile Implementation - COMPLETED
- ⬜ Step 3: Health Analytics Engine
- ⬜ Step 4: Data Visualization
- ⬜ Step 5: Implementation of Security & Privacy
- ⬜ Step 6: Testing & Refinement
- ⬜ Step 7: Documentation & Deployment

## Next Steps

- Implement the Health Analytics Engine (BMI calculation, wellness score, etc.)
- Set up integration with AI for health insights
- Develop data visualization components
- Frontend implementation