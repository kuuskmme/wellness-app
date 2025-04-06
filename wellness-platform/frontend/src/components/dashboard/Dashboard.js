import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert
} from '@mui/material';
import { 
  MonitorWeight, 
  DirectionsRun, 
  BarChart, 
  Assignment,
  InsertChartOutlined
} from '@mui/icons-material';

// Components
import BMICard from '../charts/BMICard';
import WellnessScoreCard from '../charts/WellnessScoreCard';
import GoalsProgressCard from '../charts/GoalsProgressCard';
import LatestMetricsCard from '../charts/LatestMetricsCard';
import HealthInsightsCard from '../charts/HealthInsightsCard';

// Services
import { healthProfileService, analyticsService } from '../../services/apiService';

const Dashboard = () => {
  const [healthProfile, setHealthProfile] = useState(null);
  const [bmiData, setBmiData] = useState(null);
  const [wellnessScore, setWellnessScore] = useState(null);
  const [progressData, setProgressData] = useState(null);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [noProfileFound, setNoProfileFound] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Try to fetch health profile first
        try {
          const profileRes = await healthProfileService.getHealthProfile();
          setHealthProfile(profileRes.data.data);
          
          // Fetch analytics data
          const [bmiRes, wellnessRes, progressRes, insightsRes] = await Promise.all([
            analyticsService.getBMI(),
            analyticsService.getWellnessScore(),
            analyticsService.getProgressAnalytics(),
            analyticsService.getHealthInsights()
          ]);
          
          setBmiData(bmiRes.data.data);
          setWellnessScore(wellnessRes.data.data);
          setProgressData(progressRes.data.data);
          setInsights(insightsRes.data.data);
        } catch (profileErr) {
          // If 404, it means profile doesn't exist yet
          if (profileErr.response && profileErr.response.status === 404) {
            setNoProfileFound(true);
          } else {
            throw profileErr;
          }
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Error loading dashboard data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (noProfileFound) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography variant="h5" gutterBottom>
            Welcome to Your Wellness Dashboard
          </Typography>
          <Typography variant="body1" paragraph>
            It looks like you haven't set up your health profile yet.
          </Typography>
          <Typography variant="body1" paragraph>
            To get started with tracking your wellness journey, please create your health profile first.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            component={Link}
            to="/health-profile"
            sx={{ mt: 2 }}
          >
            Create Health Profile
          </Button>
        </Paper>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Your Wellness Dashboard
      </Typography>
      
      {/* First row - Key metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <BMICard bmiData={bmiData} />
        </Grid>
        <Grid item xs={12} md={4}>
          <WellnessScoreCard wellnessData={wellnessScore} />
        </Grid>
        <Grid item xs={12} md={4}>
          <LatestMetricsCard metrics={healthProfile?.physicalMetrics} />
        </Grid>
      </Grid>
      
      {/* Second row - Goals and insights */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <GoalsProgressCard goalsData={progressData?.goalsProgress} />
        </Grid>
        <Grid item xs={12} md={6}>
          <HealthInsightsCard insights={insights} />
        </Grid>
      </Grid>
      
      {/* Third row - Quick links */}
      <Grid container spacing={3} sx={{ mt: 4 }}>
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 2 }}>
              <Button 
                variant="outlined" 
                startIcon={<MonitorWeight />}
                component={Link}
                to="/health-profile"
              >
                Update Metrics
              </Button>
              <Button 
                variant="outlined" 
                startIcon={<DirectionsRun />}
                component={Link}
                to="/fitness-goals"
              >
                Manage Goals
              </Button>
              <Button 
                variant="outlined" 
                startIcon={<InsertChartOutlined />}
                component={Link}
                to="/analytics"
              >
                View Analytics
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;