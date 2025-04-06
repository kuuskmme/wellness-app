
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
  TimeScale
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { formatTimeSeriesForChart } from '../../utils/dataUtils';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

const WeightTrendChart = ({ weightData }) => {
  if (!weightData || weightData.length < 2) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Typography variant="body1">
          {!weightData ? 'No weight data available' : 'Not enough data points for trend analysis'}
        </Typography>
      </Box>
    );
  }

  // Format data for chart
  const chartData = formatTimeSeriesForChart(weightData, 'date', 'weight.value', 'Weight');
  
  // Determine the unit (kg or lb) for the y-axis label
  const unit = weightData[0].weight.unit || 'kg';
  
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
            return `Weight: ${context.parsed.y} ${unit}`;
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
        title: {
          display: true,
          text: `Weight (${unit})`
        },
        // Make sure y-axis starts slightly below the minimum value for better visualization
        min: function(context) {
          const values = context.chart.data.datasets[0].data;
          const min = Math.min(...values);
          return Math.max(0, min - (min * 0.05)); // 5% below min, but never below zero
        }
      }
    }
  };
  
  // Calculate weight change statistics
  const firstWeight = weightData[0].weight.value;
  const lastWeight = weightData[weightData.length - 1].weight.value;
  const weightChange = lastWeight - firstWeight;
  const weightChangePercent = ((lastWeight - firstWeight) / firstWeight) * 100;
  
  return (
    <Box sx={{ height: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-around', mb: 2 }}>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">First Recorded</Typography>
          <Typography variant="h6">{firstWeight} {unit}</Typography>
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">Current</Typography>
          <Typography variant="h6">{lastWeight} {unit}</Typography>
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">Change</Typography>
          <Typography 
            variant="h6" 
            color={weightChange > 0 ? 'error' : weightChange < 0 ? 'success' : 'text.primary'}
          >
            {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)} {unit}
            <Typography component="span" variant="caption" sx={{ ml: 0.5 }}>
              ({weightChangePercent > 0 ? '+' : ''}{weightChangePercent.toFixed(1)}%)
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

export default WeightTrendChart;