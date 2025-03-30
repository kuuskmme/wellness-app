# Wellness Platform API Documentation

## Authentication Endpoints

### Register User
- **Endpoint:** `POST /api/auth/register`
- **Access:** Public
- **Description:** Register a new user account
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "Password123",
    "firstName": "John",
    "lastName": "Doe"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "User registered successfully. Please verify your email.",
    "verificationToken": "token" // Only in development mode
  }
  ```

### Verify Email
- **Endpoint:** `POST /api/auth/verify-email`
- **Access:** Public
- **Description:** Verify user email with token
- **Request Body:**
  ```json
  {
    "token": "verification_token"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "Email verified successfully. You can now log in."
  }
  ```

### Login
- **Endpoint:** `POST /api/auth/login`
- **Access:** Public
- **Description:** Login with email and password
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "Password123"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "accessToken": "jwt_access_token",
    "refreshToken": "jwt_refresh_token",
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user"
    }
  }
  ```

### Refresh Token
- **Endpoint:** `POST /api/auth/refresh-token`
- **Access:** Public
- **Description:** Refresh the access token using refresh token
- **Request Body:**
  ```json
  {
    "refreshToken": "jwt_refresh_token"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "accessToken": "new_jwt_access_token"
  }
  ```

### Logout
- **Endpoint:** `POST /api/auth/logout`
- **Access:** Private
- **Description:** Logout user and invalidate refresh token
- **Headers:**
  - `Authorization: Bearer access_token`
- **Request Body:**
  ```json
  {
    "refreshToken": "jwt_refresh_token"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "Logged out successfully"
  }
  ```

### Forgot Password
- **Endpoint:** `POST /api/auth/forgot-password`
- **Access:** Public
- **Description:** Request a password reset link
- **Request Body:**
  ```json
  {
    "email": "user@example.com"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "If your email is registered, you will receive a password reset link",
    "resetToken": "token" // Only in development mode
  }
  ```

### Reset Password
- **Endpoint:** `POST /api/auth/reset-password`
- **Access:** Public
- **Description:** Reset password with token
- **Request Body:**
  ```json
  {
    "token": "reset_token",
    "password": "NewPassword123"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "Password has been reset successfully. You can now log in with your new password."
  }
  ```

## User Endpoints

### Get Current User
- **Endpoint:** `GET /api/users/me`
- **Access:** Private
- **Description:** Get current user's profile
- **Headers:**
  - `Authorization: Bearer access_token`
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "id": "user_id",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user",
      "isVerified": true,
      "twoFactorEnabled": false,
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z"
    }
  }
  ```

### Update Current User
- **Endpoint:** `PUT /api/users/me`
- **Access:** Private
- **Description:** Update current user's profile
- **Headers:**
  - `Authorization: Bearer access_token`
- **Request Body:**
  ```json
  {
    "firstName": "John",
    "lastName": "Smith"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "id": "user_id",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Smith",
      "role": "user",
      "isVerified": true,
      "twoFactorEnabled": false,
      "createdAt": "2023-01-01T00:00:00.000Z",
      "updatedAt": "2023-01-01T00:00:00.000Z"
    }
  }
  ```

### Delete Current User
- **Endpoint:** `DELETE /api/users/me`
- **Access:** Private
- **Description:** Delete current user's account
- **Headers:**
  - `Authorization: Bearer access_token`
- **Response:**
  ```json
  {
    "success": true,
    "message": "User account deleted successfully"
  }
  ```

### Get Privacy Settings
- **Endpoint:** `GET /api/users/me/privacy`
- **Access:** Private
- **Description:** Get user's privacy settings
- **Headers:**
  - `Authorization: Bearer access_token`
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "email": "user@example.com",
      "twoFactorEnabled": false
    }
  }
  ```

### Update Privacy Settings
- **Endpoint:** `PUT /api/users/me/privacy`
- **Access:** Private
- **Description:** Update user's privacy settings
- **Headers:**
  - `Authorization: Bearer access_token`
- **Request Body:**
  ```json
  {
    "twoFactorEnabled": true
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "email": "user@example.com",
      "twoFactorEnabled": true
    }
  }
  ```

## Health Profile Endpoints

### Create Health Profile
- **Endpoint:** `POST /api/health-profile`
- **Access:** Private
- **Description:** Create user's health profile
- **Headers:**
  - `Authorization: Bearer access_token`
- **Request Body:**
  ```json
  {
    "dateOfBirth": "1990-01-01",
    "gender": "male",
    "physicalMetrics": [
      {
        "height": {
          "value": 180,
          "unit": "cm"
        },
        "weight": {
          "value": 75,
          "unit": "kg"
        },
        "bodyFatPercentage": 15,
        "waistCircumference": {
          "value": 80,
          "unit": "cm"
        }
      }
    ],
    "lifestyle": {
      "sleepHours": 7,
      "activityLevel": "moderate",
      "stressLevel": "moderate",
      "smoker": false,
      "alcoholConsumption": "occasional"
    },
    "dietaryPreferences": {
      "diet": "omnivore",
      "allergies": ["peanuts"],
      "intolerances": ["lactose"],
      "preferences": ["high-protein"],
      "restrictions": []
    }
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      // Full health profile object
    }
  }
  ```

### Get Health Profile
- **Endpoint:** `GET /api/health-profile`
- **Access:** Private
- **Description:** Get user's health profile
- **Headers:**
  - `Authorization: Bearer access_token`
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      // Full health profile object
    }
  }
  ```

### Update Health Profile
- **Endpoint:** `PUT /api/health-profile`
- **Access:** Private
- **Description:** Update user's health profile
- **Headers:**
  - `Authorization: Bearer access_token`
- **Request Body:**
  ```json
  {
    "lifestyle": {
      "sleepHours": 8,
      "activityLevel": "active"
    },
    "dietaryPreferences": {
      "diet": "vegetarian"
    }
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      // Updated health profile object
    }
  }
  ```

### Delete Health Profile
- **Endpoint:** `DELETE /api/health-profile`
- **Access:** Private
- **Description:** Delete user's health profile
- **Headers:**
  - `Authorization: Bearer access_token`
- **Response:**
  ```json
  {
    "success": true,
    "message": "Health profile deleted successfully"
  }
  ```

### Add Physical Metrics
- **Endpoint:** `POST /api/health-profile/metrics`
- **Access:** Private
- **Description:** Add new physical metrics entry
- **Headers:**
  - `Authorization: Bearer access_token`
- **Request Body:**
  ```json
  {
    "height": {
      "value": 180,
      "unit": "cm"
    },
    "weight": {
      "value": 74,
      "unit": "kg"
    },
    "bodyFatPercentage": 14,
    "waistCircumference": {
      "value": 79,
      "unit": "cm"
    }
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      // New metrics object
    }
  }
  ```

### Get All Physical Metrics
- **Endpoint:** `GET /api/health-profile/metrics`
- **Access:** Private
- **Description:** Get all physical metrics entries
- **Headers:**
  - `Authorization: Bearer access_token`
- **Response:**
  ```json
  {
    "success": true,
    "data": [
      // Array of metrics objects
    ]
  }
  ```

### Get Latest Metrics
- **Endpoint:** `GET /api/health-profile/metrics/latest`
- **Access:** Private
- **Description:** Get latest physical metrics entry
- **Headers:**
  - `Authorization: Bearer access_token`
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      // Latest metrics object
    }
  }
  ```

### Get Specific Metrics
- **Endpoint:** `GET /api/health-profile/metrics/:id`
- **Access:** Private
- **Description:** Get specific metrics entry by ID
- **Headers:**
  - `Authorization: Bearer access_token`
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      // Specific metrics object
    }
  }
  ```

### Update Metrics
- **Endpoint:** `PUT /api/health-profile/metrics/:id`
- **Access:** Private
- **Description:** Update specific metrics entry
- **Headers:**
  - `Authorization: Bearer access_token`
- **Request Body:**
  ```json
  {
    "weight": {
      "value": 73,
      "unit": "kg"
    },
    "bodyFatPercentage": 13.5
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      // Updated metrics object
    }
  }
  ```

### Delete Metrics
- **Endpoint:** `DELETE /api/health-profile/metrics/:id`
- **Access:** Private
- **Description:** Delete specific metrics entry
- **Headers:**
  - `Authorization: Bearer access_token`
- **Response:**
  ```json
  {
    "success": true,
    "message": "Metrics deleted successfully"
  }
  ```

### Create Fitness Goal
- **Endpoint:** `POST /api/health-profile/goals`
- **Access:** Private
- **Description:** Create a new fitness goal
- **Headers:**
  - `Authorization: Bearer access_token`
- **Request Body:**
  ```json
  {
    "type": "weight",
    "target": {
      "value": 70,
      "unit": "kg"
    },
    "deadline": "2023-12-31",
    "priority": "high",
    "notes": "Summer fitness goal"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      // New goal object
    }
  }
  ```

### Get All Fitness Goals
- **Endpoint:** `GET /api/health-profile/goals`
- **Access:** Private
- **Description:** Get all fitness goals
- **Headers:**
  - `Authorization: Bearer access_token`
- **Response:**
  ```json
  {
    "success": true,
    "data": [
      // Array of goal objects
    ]
  }
  ```

### Get Specific Goal
- **Endpoint:** `GET /api/health-profile/goals/:id`
- **Access:** Private
- **Description:** Get specific fitness goal by ID
- **Headers:**
  - `Authorization: Bearer access_token`
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      // Specific goal object
    }
  }
  ```

### Update Fitness Goal
- **Endpoint:** `PUT /api/health-profile/goals/:id`
- **Access:** Private
- **Description:** Update specific fitness goal
- **Headers:**
  - `Authorization: Bearer access_token`
- **Request Body:**
  ```json
  {
    "target": {
      "value": 68,
      "unit": "kg"
    },
    "priority": "medium"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      // Updated goal object
    }
  }
  ```

### Update Goal Progress
- **Endpoint:** `PUT /api/health-profile/goals/:id/progress`
- **Access:** Private
- **Description:** Update progress of a specific fitness goal
- **Headers:**
  - `Authorization: Bearer access_token`
- **Request Body:**
  ```json
  {
    "progress": 75
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      // Updated goal object with new progress
    }
  }
  ```

### Delete Fitness Goal
- **Endpoint:** `DELETE /api/health-profile/goals/:id`
- **Access:** Private
- **Description:** Delete specific fitness goal
- **Headers:**
  - `Authorization: Bearer access_token`
- **Response:**
  ```json
  {
    "success": true,
    "message": "Fitness goal deleted successfully"
  }
  ```