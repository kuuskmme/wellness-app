// This script demonstrates how to test the analytics API endpoints
// Note: This is a guide, not meant to be executed directly without a proper test setup

/*
Prerequisites:
1. Server is running
2. User is registered and authenticated
3. Health profile exists with some data

Steps to test manually:
1. Register a user via POST /api/auth/register
2. Verify email via POST /api/auth/verify-email
3. Login via POST /api/auth/login
4. Create health profile via POST /api/health-profile
5. Add metrics via POST /api/health-profile/metrics
6. Now test the analytics endpoints with the token from login

Example API calls:

1. GET BMI calculation
GET /api/analytics/bmi
Headers: Authorization: Bearer <token>

2. GET wellness score
GET /api/analytics/wellness-score
Headers: Authorization: Bearer <token>

3. GET health insights
GET /api/analytics/insights
Headers: Authorization: Bearer <token>

4. GET progress analytics
GET /api/analytics/progress
Headers: Authorization: Bearer <token>

5. GET health trends
GET /api/analytics/trends
Headers: Authorization: Bearer <token>
*/

// You can use tools like Postman or curl to test these endpoints
console.log('Please refer to the comments in this file for testing instructions.');