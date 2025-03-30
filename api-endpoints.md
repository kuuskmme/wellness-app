# API Endpoints for Wellness Platform

## Authentication Endpoints

| Method | Endpoint                      | Description                         | Auth Required |
|--------|-------------------------------|-------------------------------------|--------------|
| POST   | /api/auth/register            | Register a new user                 | No           |
| POST   | /api/auth/login               | Login user                          | No           |
| POST   | /api/auth/logout              | Logout user                         | Yes          |
| POST   | /api/auth/verify-email        | Verify user email                   | No           |
| POST   | /api/auth/refresh-token       | Refresh access token                | No           |
| POST   | /api/auth/forgot-password     | Request password reset              | No           |
| POST   | /api/auth/reset-password      | Reset password with token           | No           |
| POST   | /api/auth/enable-2fa          | Enable two-factor auth              | Yes          |
| POST   | /api/auth/verify-2fa          | Verify 2FA code                     | Yes          |
| POST   | /api/auth/disable-2fa         | Disable two-factor auth             | Yes          |
| GET    | /api/auth/oauth/:provider     | Redirect to OAuth provider          | No           |
| GET    | /api/auth/oauth/callback      | OAuth callback handler              | No           |

## User Endpoints

| Method | Endpoint                      | Description                         | Auth Required |
|--------|-------------------------------|-------------------------------------|--------------|
| GET    | /api/users/me                 | Get current user profile            | Yes          |
| PUT    | /api/users/me                 | Update current user profile         | Yes          |
| DELETE | /api/users/me                 | Delete current user                 | Yes          |
| GET    | /api/users/me/privacy         | Get user privacy settings           | Yes          |
| PUT    | /api/users/me/privacy         | Update user privacy settings        | Yes          |

## Health Profile Endpoints

| Method | Endpoint                      | Description                         | Auth Required |
|--------|-------------------------------|-------------------------------------|--------------|
| POST   | /api/health-profile           | Create health profile               | Yes          |
| GET    | /api/health-profile           | Get user health profile             | Yes          |
| PUT    | /api/health-profile           | Update health profile               | Yes          |
| DELETE | /api/health-profile           | Delete health profile               | Yes          |

## Physical Metrics Endpoints

| Method | Endpoint                      | Description                         | Auth Required |
|--------|-------------------------------|-------------------------------------|--------------|
| POST   | /api/health-profile/metrics   | Add new physical metrics            | Yes          |
| GET    | /api/health-profile/metrics   | Get all physical metrics            | Yes          |
| GET    | /api/health-profile/metrics/latest | Get latest physical metrics    | Yes          |
| GET    | /api/health-profile/metrics/:id | Get specific metrics entry        | Yes          |
| PUT    | /api/health-profile/metrics/:id | Update specific metrics entry     | Yes          |
| DELETE | /api/health-profile/metrics/:id | Delete specific metrics entry     | Yes          |

## Fitness Goals Endpoints

| Method | Endpoint                      | Description                         | Auth Required |
|--------|-------------------------------|-------------------------------------|--------------|
| POST   | /api/health-profile/goals     | Create new fitness goal             | Yes          |
| GET    | /api/health-profile/goals     | Get all fitness goals               | Yes          |
| GET    | /api/health-profile/goals/:id | Get specific fitness goal           | Yes          |
| PUT    | /api/health-profile/goals/:id | Update specific fitness goal        | Yes          |
| PUT    | /api/health-profile/goals/:id/progress | Update goal progress       | Yes          |
| DELETE | /api/health-profile/goals/:id | Delete specific fitness goal        | Yes          |

## Analytics Endpoints

| Method | Endpoint                      | Description                         | Auth Required |
|--------|-------------------------------|-------------------------------------|--------------|
| GET    | /api/analytics/bmi            | Get BMI calculation                 | Yes          |
| GET    | /api/analytics/wellness-score | Get wellness score                  | Yes          |
| GET    | /api/analytics/progress       | Get progress analytics              | Yes          |
| GET    | /api/analytics/trends         | Get health trends                   | Yes          |
| GET    | /api/analytics/insights       | Get AI-powered insights             | Yes          |

## Data Export & Import Endpoints

| Method | Endpoint                      | Description                         | Auth Required |
|--------|-------------------------------|-------------------------------------|--------------|
| GET    | /api/export/health-data       | Export health data                  | Yes          |
| POST   | /api/import/health-data       | Import health data                  | Yes          |