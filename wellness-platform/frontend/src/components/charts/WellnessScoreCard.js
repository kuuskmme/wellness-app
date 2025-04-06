
import React from 'react';
import { Box, Card, CardContent, Typography, CircularProgress } from '@mui/material';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { 
  getWellnessScoreColor, 
  getWellnessScoreLabel, 
  formatWellnessFactorsForChart 
} from '../../utils/dataUtils';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

const WellnessScoreCard = ({ wellnessData }) => {
  if (!wellnessData) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Wellness Score</Typography>
          <Typography variant="body2" color="text.secondary">
            No wellness score data available
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const { score, factors } = wellnessData;
  const scoreColor = getWellnessScoreColor(score);
  const scoreLabel = getWellnessScoreLabel(score);
  
  // Create chart data for factors
  const factorsChartData = formatWellnessFactorsForChart(factors);
  const chartOptions = {
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          boxWidth: 15,
          padding: 15
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.formattedValue || '';
            return `${label}: ${value}/20`;
          }
        }
      }
    },
    maintainAspectRatio: false
  };
  
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>Wellness Score</Typography>
        
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          position: 'relative',
          mt: 2,
          mb: 3
        }}>
          <Box sx={{ position: 'relative', width: 120, height: 120 }}>
            <CircularProgress
              variant="determinate"
              value={100}
              size={120}
              thickness={6}
              sx={{ color: '#e0e0e0', position: 'absolute' }}
            />
            <CircularProgress
              variant="determinate"
              value={score}
              size={120}
              thickness={6}
              sx={{ color: scoreColor, position: 'absolute' }}
            />
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Typography variant="h4">{score}</Typography>
              <Typography 
                variant="caption" 
                color={scoreColor}
                sx={{ fontWeight: 'bold' }}
              >
                {scoreLabel}
              </Typography>
            </Box>
          </Box>
        </Box>
        
        <Box sx={{ height: 150, mt: 2 }}>
          <Doughnut data={factorsChartData} options={chartOptions} />
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Your wellness score is based on physical, nutrition, activity, sleep, and stress factors.
        </Typography>
      </CardContent>
    </Card>
  );
};

export default WellnessScoreCard;