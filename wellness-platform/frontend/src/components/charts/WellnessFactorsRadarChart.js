
import React from 'react';
import { Box, Typography, Grid } from '@mui/material';
import { Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

const WellnessFactorsRadarChart = ({ factorsData }) => {
  if (!factorsData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Typography variant="body1">No wellness factors data available</Typography>
      </Box>
    );
  }

  // Format data for radar chart
  const labels = Object.keys(factorsData).map(
    key => key.charAt(0).toUpperCase() + key.slice(1)
  );
  
  const data = Object.values(factorsData);
  
  const chartData = {
    labels,
    datasets: [
      {
        label: 'Current',
        data,
        backgroundColor: 'rgba(63, 81, 181, 0.2)',
        borderColor: 'rgba(63, 81, 181, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(63, 81, 181, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(63, 81, 181, 1)'
      },
      {
        label: 'Ideal',
        data: labels.map(() => 20), // Max value for each factor is 20
        backgroundColor: 'rgba(144, 202, 249, 0.1)',
        borderColor: 'rgba(144, 202, 249, 0.6)',
        borderWidth: 1,
        pointRadius: 0,
        pointBackgroundColor: 'rgba(144, 202, 249, 0.6)',
        borderDash: [5, 5]
      }
    ]
  };
  
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        min: 0,
        max: 20,
        ticks: {
          stepSize: 5,
          display: false
        },
        pointLabels: {
          font: {
            size: 12
          }
        }
      }
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          padding: 15
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.raw}/20`;
          }
        }
      }
    }
  };
  
  // Calculate total score and percentage
  const totalScore = data.reduce((sum, value) => sum + value, 0);
  const maxPossibleScore = Object.keys(factorsData).length * 20; // Each factor can have max 20 points
  const scorePercentage = (totalScore / maxPossibleScore) * 100;
  
  // Create a summary of factors
  const factorsSummary = Object.entries(factorsData).map(([key, value]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    value,
    percentage: (value / 20) * 100
  }));
  
  return (
    <Box sx={{ height: '100%' }}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={7}>
          <Box sx={{ height: 280 }}>
            <Radar data={chartData} options={chartOptions} />
          </Box>
        </Grid>
        <Grid item xs={12} md={5}>
          <Typography variant="h6" gutterBottom>
            Wellness Factors
          </Typography>
          <Typography variant="body2" paragraph>
            Overall Score: {Math.round(scorePercentage)}%
          </Typography>
          
          <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
            {factorsSummary.sort((a, b) => b.value - a.value).map((factor, index) => (
              <Box key={index} sx={{ mb: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="body2">{factor.name}</Typography>
                  <Typography variant="body2">{factor.value}/20</Typography>
                </Box>
                <Box
                  sx={{
                    height: 6,
                    bgcolor: '#f0f0f0',
                    borderRadius: 3,
                    position: 'relative'
                  }}
                >
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      height: '100%',
                      width: `${factor.percentage}%`,
                      bgcolor: 'primary.main',
                      borderRadius: 3
                    }}
                  />
                </Box>
              </Box>
            ))}
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default WellnessFactorsRadarChart;