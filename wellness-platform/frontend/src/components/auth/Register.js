
import React, { useState, useContext } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Link,
  Alert,
  CircularProgress,
  Grid,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';
import { AuthContext } from '../../context/AuthContext';

const steps = ['Account Information', 'Personal Details', 'Confirmation'];

const Register = () => {
  const navigate = useNavigate();
  const { register, error } = useContext(AuthContext);
  
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  
  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: ''
  });
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  const validateStep = () => {
    switch (activeStep) {
      case 0:
        if (!formData.email) {
          setLocalError('Email is required');
          return false;
        }
        if (!formData.password) {
          setLocalError('Password is required');
          return false;
        }
        if (formData.password.length < 8) {
          setLocalError('Password must be at least 8 characters long');
          return false;
        }
        if (formData.password !== formData.confirmPassword) {
          setLocalError('Passwords do not match');
          return false;
        }
        return true;
      
      case 1:
        if (!formData.firstName) {
          setLocalError('First name is required');
          return false;
        }
        if (!formData.lastName) {
          setLocalError('Last name is required');
          return false;
        }
        return true;
      
      default:
        return true;
    }
  };
  
  const handleNext = () => {
    setLocalError('');
    
    if (validateStep()) {
      if (activeStep === steps.length - 2) {
        handleSubmit();
      } else {
        setActiveStep((prevStep) => prevStep + 1);
      }
    }
  };
  
  const handleBack = () => {
    setLocalError('');
    setActiveStep((prevStep) => prevStep - 1);
  };
  
  const handleSubmit = async () => {
    setLoading(true);
    setLocalError('');
    
    try {
      const { confirmPassword, ...userData } = formData;
      
      const result = await register(userData);
      
      if (result.success) {
        // Store verification token if provided (for development environment)
        if (result.data.verificationToken) {
          setVerificationToken(result.data.verificationToken);
        }
        
        setActiveStep((prevStep) => prevStep + 1);
      } else {
        setLocalError(result.error?.message || 'Registration failed. Please try again.');
      }
    } catch (err) {
      setLocalError('An unexpected error occurred. Please try again.');
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          mt: 4,
          mb: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Typography component="h1" variant="h5" align="center" gutterBottom>
            Create an Account
          </Typography>
          
          <Stepper activeStep={activeStep} sx={{ my: 3 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          
          {(error || localError) && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error || localError}
            </Alert>
          )}
          
          {activeStep === steps.length - 1 ? (
            // Registration Complete Step
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" gutterBottom>
                Registration Successful!
              </Typography>
              
              <Typography variant="body1" paragraph>
                Thank you for registering. Please check your email for a verification link to activate your account.
              </Typography>
              
              {verificationToken && (
                <Alert severity="info" sx={{ mb: 2, textAlign: 'left' }}>
                  <Typography variant="body2">
                    Development Environment: Your verification token is:
                  </Typography>
                  <Box 
                    component="pre" 
                    sx={{ 
                      bgcolor: '#f5f5f5', 
                      p: 1, 
                      borderRadius: 1,
                      overflowX: 'auto'
                    }}
                  >
                    {verificationToken}
                  </Box>
                </Alert>
              )}
              
              <Button
                variant="contained"
                onClick={() => navigate('/login')}
                sx={{ mt: 2 }}
              >
                Go to Login
              </Button>
            </Box>
          ) : (
            // Registration Form Steps
            <Box component="form">
              {activeStep === 0 && (
                // Account Information Step
                <>
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    id="email"
                    label="Email Address"
                    name="email"
                    autoComplete="email"
                    value={formData.email}
                    onChange={handleChange}
                  />
                  
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    name="password"
                    label="Password"
                    type="password"
                    id="password"
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={handleChange}
                    helperText="Password must be at least 8 characters long"
                  />
                  
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    name="confirmPassword"
                    label="Confirm Password"
                    type="password"
                    id="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                  />
                </>
              )}
              
              {activeStep === 1 && (
                // Personal Details Step
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      required
                      fullWidth
                      id="firstName"
                      label="First Name"
                      name="firstName"
                      autoComplete="given-name"
                      value={formData.firstName}
                      onChange={handleChange}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      required
                      fullWidth
                      id="lastName"
                      label="Last Name"
                      name="lastName"
                      autoComplete="family-name"
                      value={formData.lastName}
                      onChange={handleChange}
                    />
                  </Grid>
                </Grid>
              )}
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                <Button
                  disabled={activeStep === 0}
                  onClick={handleBack}
                >
                  Back
                </Button>
                
                <Button
                  variant="contained"
                  onClick={handleNext}
                  disabled={loading}
                >
                  {loading ? (
                    <CircularProgress size={24} />
                  ) : activeStep === steps.length - 2 ? (
                    'Register'
                  ) : (
                    'Next'
                  )}
                </Button>
              </Box>
              
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Link component={RouterLink} to="/login" variant="body2">
                  Already have an account? Sign in
                </Link>
              </Box>
            </Box>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default Register;