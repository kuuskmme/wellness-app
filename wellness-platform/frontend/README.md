# Wellness Platform - Frontend

This is the frontend for the Wellness Platform application, built using React and Material UI.

## Overview

The frontend provides a user interface for:

- User authentication and profile management
- Health profile creation and updates
- Fitness goal tracking
- Data visualization of health metrics
- Analytics and insights

## Features

### User Authentication
- Login/Registration with email and password
- Password reset functionality
- JWT authentication with refresh tokens

### Dashboard
- Overview of key health metrics
- BMI visualization
- Wellness score display
- Goal progress tracking
- Health insights

### Analytics
- Detailed charts for health data
- Trend analysis
- Goal comparison
- Wellness factor breakdown

## Tech Stack

- React 18
- React Router v6
- Material UI v5
- Chart.js / react-chartjs-2
- Axios for API calls

## Project Structure

```
frontend/
├── public/                # Static files
├── src/
│   ├── components/        # React components
│   │   ├── auth/          # Authentication components
│   │   ├── charts/        # Visualization components
│   │   ├── common/        # Common UI components
│   │   └── dashboard/     # Dashboard pages
│   ├── config/            # Configuration files
│   ├── context/           # React context providers
│   ├── hooks/             # Custom React hooks
│   ├── services/          # API services
│   ├── utils/             # Utility functions
│   ├── App.js             # Main App component
│   └── index.js           # Entry point
└── README.md              # Documentation
```

## Setup Instructions

1. Clone the repository
2. Install dependencies:
   ```
   cd wellness-platform/frontend
   npm install
   ```
3. Create a `.env` file with:
   ```
   REACT_APP_API_URL=http://localhost:5000
   ```
4. Start the development server:
   ```
   npm start
   ```

## Available Scripts

- `npm start` - Start the development server
- `npm test` - Run the test suite
- `npm run build` - Build for production
- `npm run eject` - Eject from Create React App

## Usage

The application is designed to be used alongside the Wellness Platform backend API. Make sure the backend server is running before using the frontend.