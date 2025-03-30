/**
 * This file serves as a reference for all API routes in the application.
 * Actual route implementations will be in separate files.
 */

const express = require('express');
const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'API is healthy' });
});

/**
 * Authentication Routes - /api/auth/*
 * 
 * POST /register - Register a new user
 * POST /login - Login user
 * POST /logout - Logout user
 * POST /verify-email - Verify user email
 * POST /refresh-token - Refresh access token
 * POST /forgot-password - Request password reset
 * POST /reset-password - Reset password with token
 * POST /enable-2fa - Enable two-factor auth
 * POST /verify-2fa - Verify 2FA code
 * POST /disable-2fa - Disable two-factor auth
 * GET /oauth/:provider - Redirect to OAuth provider
 * GET /oauth/callback - OAuth callback handler
 */

/**
 * User Routes - /api/users/*
 * 
 * GET /me - Get current user profile
 * PUT /me - Update current user profile
 * DELETE /me - Delete current user
 * GET /me/privacy - Get user privacy settings
 * PUT /me/privacy - Update user privacy settings
 */

/**
 * Health Profile Routes - /api/health-profile/*
 * 
 * POST / - Create health profile
 * GET / - Get user health profile
 * PUT / - Update health profile
 * DELETE / - Delete health profile
 * 
 * Physical Metrics Routes:
 * POST /metrics - Add new physical metrics
 * GET /metrics - Get all physical metrics
 * GET /metrics/latest - Get latest physical metrics
 * GET /metrics/:id - Get specific metrics entry
 * PUT /metrics/:id - Update specific metrics entry
 * DELETE /metrics/:id - Delete specific metrics entry
 * 
 * Fitness Goals Routes:
 * POST /goals - Create new fitness goal
 * GET /goals - Get all fitness goals
 * GET /goals/:id - Get specific fitness goal
 * PUT /goals/:id - Update specific fitness goal
 * PUT /goals/:id/progress - Update goal progress
 * DELETE /goals/:id - Delete specific fitness goal
 */

/**
 * Analytics Routes - /api/analytics/*
 * 
 * GET /bmi - Get BMI calculation
 * GET /wellness-score - Get wellness score
 * GET /progress - Get progress analytics
 * GET /trends - Get health trends
 * GET /insights - Get AI-powered insights
 */

/**
 * Data Export & Import Routes - /api/export/* & /api/import/*
 * 
 * GET /export/health-data - Export health data
 * POST /import/health-data - Import health data
 */

module.exports = router;