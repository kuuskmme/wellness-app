
import React from 'react';
import { Box, Typography } from '@mui/material';
import { Doughnut } from 'react-chartjs-2';
import { getBmiCategoryColor } from '../../utils/dataUtils';

const BMITrendChart = ({ bmiData }) => {
  if (!bmiData) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Typography variant="body1">No BMI data available</Typography>
      </Box>
    );
  }

  const { bmi, category } = bmiData;
  const categoryColor = getBmiCategoryColor(category);
  
  // Create a doughnut chart to display BMI visually
  const chartData = {
    labels: ['BMI', 'Remaining'],
    datasets: [
      {
        data: [bmi, Math.max(40 - bmi, 0)], // Cap at 40 for visual purposes
        backgroundColor: [categoryColor, '#f5f5f5'],
        borderWidth: 0,
        cutout: '75%'
      }
    ]
  };
  
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        enabled: false
      }
    }
  };
  
  // Get BMI category description
  const getCategoryDescription = () => {
    switch (category) {
      case 'underweight':
        return 'BMI less than 18.5 indicates you may be underweight. Consider consulting with a healthcare provider.';
      case 'normal':
        return 'BMI between 18.5 and 24.9 indicates a healthy weight for most adults.';
      case 'overweight':
        return 'BMI between 25 and 29.9 indicates you may be overweight. Consider a balanced diet and regular exercise.';
      case 'obese':
        return 'BMI of 30 or higher indicates obesity. It\'s recommended to consult with a healthcare provider.';
      default:
        return '';
    }
  };
  
  return (
    <Box sx={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ position: 'relative', flex: 1 }}>
        <Doughnut data={chartData} options={chartOptions} />
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center'
          }}
        >
          <Typography variant="h3" color={categoryColor}>
            {bmi}
          </Typography>
          <Typography 
            variant="subtitle1" 
            sx={{ 
              textTransform: 'capitalize',
              fontWeight: 'bold',
              color: categoryColor
            }}
          >
            {category}
          </Typography>
        </Box>
      </Box>
      
      <Box sx={{ mt: 2 }}>
        <Typography variant="body2" align="center">
          {getCategoryDescription()}
        </Typography>
        
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            mt: 2,
            px: 2
          }}
        >
          <Typography variant="caption" color="text.secondary">Underweight</Typography>
          <Typography variant="caption" color="text.secondary">Normal</Typography>
          <Typography variant="caption" color="text.secondary">Overweight</Typography>
          <Typography variant="caption" color="text.secondary">Obese</Typography>
        </Box>
        <Box
          sx={{
            display: 'flex',
            mt: 1,
            height: 8,
            borderRadius: 4,
            overflow: 'hidden'
          }}
        >
          <Box sx={{ flex: 18.5, bgcolor: getBmiCategoryColor('underweight') }} />
          <Box sx={{ flex: 6.4, bgcolor: getBmiCategoryColor('normal') }} />
          <Box sx={{ flex: 5, bgcolor: getBmiCategoryColor('overweight') }} />
          <Box sx={{ flex: 10.1, bgcolor: getBmiCategoryColor('obese') }} />
        </Box>
      </Box>
    </Box>
  );
};

export default BMITrendChart;