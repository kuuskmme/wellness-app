
import React from 'react';
import { Box, Typography, LinearProgress, Grid, Divider, Paper } from '@mui/material';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { formatGoalsForChart } from '../../utils/dataUtils';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const GoalsComparisonChart = ({ goalsData }) => {
  if (!goalsData || goalsData.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Typography variant="body1">No fitness goals available</Typography>
      </Box>
    );
  }

  // Format goals data for chart
  const chartData = formatGoalsForChart(goalsData);
  
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y', // Horizontal bar chart
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `Progress: ${context.raw}%`;
          }
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: 'Progress (%)'
        }
      },
      y: {
        ticks: {
          callback: function(value) {
            // Capitalize first letter and limit length
            const label = this.getLabelForValue(value);
            return label.charAt(0).toUpperCase() + label.slice(1);
          }
        }
      }
    }
  };
  
  // Group goals by status
  const goalsByStatus = goalsData.reduce((acc, goal) => {
    const status = goal.status || 'not-started';
    if (!acc[status]) acc[status] = [];
    acc[status].push(goal);
    return acc;
  }, {});
  
  // Calculate completion stats
  const completedGoals = goalsByStatus['achieved'] ? goalsByStatus['achieved'].length : 0;
  const inProgressGoals = goalsByStatus['in-progress'] ? goalsByStatus['in-progress'].length : 0;
  const notStartedGoals = goalsByStatus['not-started'] ? goalsByStatus['not-started'].length : 0;
  const abandonedGoals = goalsByStatus['abandoned'] ? goalsByStatus['abandoned'].length : 0;
  
  const totalGoals = goalsData.length;
  const completionRate = (completedGoals / totalGoals) * 100;
  
  return (
    <Box sx={{ height: '100%' }}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Box sx={{ height: 300 }}>
            <Bar data={chartData} options={chartOptions} />
          </Box>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ p: 2, bgcolor: '#f5f5f5', height: '100%' }}>
            <Typography variant="h6" gutterBottom>Goals Summary</Typography>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" gutterBottom>Overall Completion Rate</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Box sx={{ width: '100%', mr: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={completionRate}
                    sx={{ height: 10, borderRadius: 5 }}
                  />
                </Box>
                <Box sx={{ minWidth: 35 }}>
                  <Typography variant="body2" color="text.secondary">{Math.round(completionRate)}%</Typography>
                </Box>
              </Box>
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="body2" gutterBottom>Status Breakdown</Typography>
            
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center', py: 1 }}>
                  <Typography variant="h5" color="success.main">{completedGoals}</Typography>
                  <Typography variant="caption">Achieved</Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center', py: 1 }}>
                  <Typography variant="h5" color="primary.main">{inProgressGoals}</Typography>
                  <Typography variant="caption">In Progress</Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center', py: 1 }}>
                  <Typography variant="h5" color="text.secondary">{notStartedGoals}</Typography>
                  <Typography variant="caption">Not Started</Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center', py: 1 }}>
                  <Typography variant="h5" color="error.main">{abandonedGoals}</Typography>
                  <Typography variant="caption">Abandoned</Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default GoalsComparisonChart;