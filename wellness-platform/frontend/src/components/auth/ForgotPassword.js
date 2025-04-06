
import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Link,
  Alert,
  CircularProgress
} from '@mui/material';
import { authService } from '../../services/apiService';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resetToken, setResetToken] = useState('');
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      setError('Email is required');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await authService.forgotPassword(email);
      
      setSuccess(true);
      
      // If in development mode, store reset token
      if (response.data.resetToken) {
        setResetToken(response.data.resetToken);
      }
    } catch (err) {
      console.error('Forgot password error:', err);
      setError('An error occurred while processing your request. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          mt: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper 
          elevation={3} 
          sx={{ 
            p: 4, 
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Typography component="h1" variant="h5" gutterBottom>
            Forgot Password
          </Typography>
          
          {success ? (
            <>
              <Alert severity="success" sx={{ width: '100%', mb: 2 }}>
                Password reset instructions have been sent to your email.
              </Alert>
              
              {resetToken && (
                <Alert severity="info" sx={{ width: '100%', mb: 2 }}>
                  <Typography variant="body2">
                    Development Environment: Your reset token is:
                  </Typography>
                  <Box 
                    component="pre" 
                    sx={{ 
                      bgcolor: '#f5f5f5', 
                      p: 1, 
                      borderRadius: 1,
                      overflowX: 'auto',
                      width: '100%'
                    }}
                  >
                    {resetToken}
                  </Box>
                </Alert>
              )}
              
              <Button 
                variant="contained" 
                component={RouterLink} 
                to="/login"
                sx={{ mt: 2 }}
              >
                Return to Login
              </Button>
            </>
          ) : (
            <>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Enter your email address and we'll send you a link to reset your password.
              </Typography>
              
              {error && (
                <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
                  {error}
                </Alert>
              )}
              
              <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="email"
                  label="Email Address"
                  name="email"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{ mt: 3, mb: 2 }}
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} /> : 'Reset Password'}
                </Button>
                
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <Link component={RouterLink} to="/login" variant="body2">
                    Back to Sign In
                  </Link>
                </Box>
              </Box>
            </>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default ForgotPassword;