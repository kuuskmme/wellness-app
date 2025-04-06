
import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Tabs,
  Tab
} from '@mui/material';

// Chart Components
import BMITrendChart from '../charts/BMITrendChart';
import WeightTrendChart from '../charts/WeightTrendChart';
import WellnessScoreTrendChart from '../charts/WellnessScoreTrendChart';
import GoalsComparisonChart from '../charts/GoalsComparisonChart';
import WellnessFactorsRadarChart from '../charts/WellnessFactorsRadarChart';
import HealthInsightsList from '../charts/HealthInsightsList';

// Services
import { analyticsService } from '../../services/apiService';

const Analytics = () => {
  const [bmiData, setBmiData] = useState(null);
  const [wellnessScoreData, setWellnessScoreData] = useState(null);
  const [progressData, setProgressData] = useState(null);
  const [trendsData, setTrendsData] = useState(null);
  const [insightsData, setInsightsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch all analytics data in parallel
        const [
          bmiRes,
          wellnessRes,
          progressRes,
          trendsRes,
          insightsRes
        ] = await Promise.all([
          analyticsService.getBMI(),
          analyticsService.getWellnessScore(),
          analyticsService.getProgressAnalytics(),
          analyticsService.getHealthTrends(),
          analyticsService.getHealthInsights()
        ]);
        
        setBmiData(bmiRes.data.data);
        setWellnessScoreData(wellnessRes.data.data);
        setProgressData(progressRes.data.data);
        setTrendsData(trendsRes.data.data);
        setInsightsData(insightsRes.data.data);
      } catch (err) {
        console.error('Error fetching analytics data:', err);
        setError('Error loading analytics data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, []);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
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
        Health Analytics
      </Typography>
      
      <Paper sx={{ mb: 4 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          centered
        >
          <Tab label="Overview" />
          <Tab label="Trends" />
          <Tab label="Goals" />
          <Tab label="Insights" />
        </Tabs>
      </Paper>
      
      {/* Overview Tab */}
      {tabValue === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Current BMI</Typography>
              <Box sx={{ height: 300 }}>
                <BMITrendChart bmiData={bmiData} />
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Wellness Score Breakdown</Typography>
              <Box sx={{ height: 300 }}>
                <WellnessFactorsRadarChart factorsData={wellnessScoreData?.factors} />
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Weight History</Typography>
              <Box sx={{ height: 300 }}>
                <WeightTrendChart weightData={progressData?.weightHistory} />
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}
      
      {/* Trends Tab */}
      {tabValue === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Wellness Score Trend</Typography>
              <Box sx={{ height: 300 }}>
                <WellnessScoreTrendChart wellnessHistory={progressData?.wellnessHistory} />
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Health Trends Summary</Typography>
              {trendsData && (
                <Box sx={{ p: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={3}>
                      <Paper elevation={0} sx={{ p: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
                        <Typography variant="h6">
                          {trendsData.weightChange?.value.toFixed(1) || 'N/A'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Weight Change ({trendsData.weightChange?.unit})
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Paper elevation={0} sx={{ p: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
                        <Typography variant="h6">
                          {trendsData.bodyFatChange?.value.toFixed(1) || 'N/A'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Body Fat Change (%)
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Paper elevation={0} sx={{ p: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
                        <Typography variant="h6">
                          {trendsData.wellnessScoreTrend?.value.toFixed(1) || 'N/A'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Wellness Score Change
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                      <Paper elevation={0} sx={{ p: 2, textAlign: 'center', bgcolor: '#f5f5f5' }}>
                        <Typography variant="h6">
                          {trendsData.metricsCount || 'N/A'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Metrics Recorded
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}
      
      {/* Goals Tab */}
      {tabValue === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Goals Progress</Typography>
              <Box sx={{ height: 400 }}>
                <GoalsComparisonChart goalsData={progressData?.goalsProgress} />
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}
      
      {/* Insights Tab */}
      {tabValue === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>Health Insights</Typography>
              <HealthInsightsList insights={insightsData} />
            </Paper>
          </Grid>
        </Grid>
      )}
    </Container>
  );
};

export default Analytics;