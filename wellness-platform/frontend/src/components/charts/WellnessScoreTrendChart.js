
import React from 'react';
import { Box, Typography } from '@mui/material';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { formatTimeSeriesForChart, getWellnessScoreColor } from '../../utils/dataUtils';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const WellnessScoreTrendChart = ({ wellnessHistory }) => {
  if (!wellnessHistory || wellnessHistory.length < 2) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Typography variant="body1">
          {!wellnessHistory 
            ? 'No wellness score data available' 
            : 'Not enough data points for trend analysis'}
        </Typography>
      </Box>
    );
  }

  // Format data for chart
  const chartData = formatTimeSeriesForChart(wellnessHistory, 'date', 'score', 'Wellness Score');
  
  // Add background gradient to the line
  const ctx = document.createElement('canvas').getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 400);
  gradient.addColorStop(0, 'rgba(63, 81, 181, 0.4)');
  gradient.addColorStop(1, 'rgba(63, 81, 181, 0.0)');
  
  // Update the dataset to include fill
  chartData.datasets[0] = {
    ...chartData.datasets[0],
    backgroundColor: gradient,
    fill: true,
    tension: 0.4
  };
  
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `Score: ${context.parsed.y}`;
          }
        }
      }
    },
    scales: {
      x: {
        type: 'category',
        title: {
          display: true,
          text: 'Date'
        }
      },
      y: {
        min: 0,
        max: 100,
        title: {
          display: true,
          text: 'Wellness Score'
        }
      }
    }
  };
  
  // Calculate wellness score change statistics
  const firstScore = wellnessHistory[0].score;
  const lastScore = wellnessHistory[wellnessHistory.length - 1].score;
  const scoreChange = lastScore - firstScore;
  const scoreChangePercent = ((lastScore - firstScore) / firstScore) * 100;
  
  return (
    <Box sx={{ height: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-around', mb: 2 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">First Recorded</Typography>
          <Typography 
            variant="h6" 
            sx={{ color: getWellnessScoreColor(firstScore) }}
          >
            {firstScore}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">Current</Typography>
          <Typography 
            variant="h6" 
            sx={{ color: getWellnessScoreColor(lastScore) }}
          >
            {lastScore}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">Change</Typography>
          <Typography 
            variant="h6" 
            color={scoreChange > 0 ? 'success' : scoreChange < 0 ? 'error' : 'text.primary'}
          >
            {scoreChange > 0 ? '+' : ''}{scoreChange.toFixed(1)}
            <Typography component="span" variant="caption" sx={{ ml: 0.5 }}>
              ({scoreChangePercent > 0 ? '+' : ''}{scoreChangePercent.toFixed(1)}%)
            </Typography>
          </Typography>
        </Box>
      </Box>
      
      <Box sx={{ height: 'calc(100% - 60px)' }}>
        <Line data={chartData} options={chartOptions} />
      </Box>
    </Box>
  );
};

export default WellnessScoreTrendChart;