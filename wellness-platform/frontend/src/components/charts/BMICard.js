import React from 'react';
import { Box, Card, CardContent, Typography, LinearProgress } from '@mui/material';
import { getBmiCategoryColor } from '../../utils/dataUtils';

const BMICard = ({ bmiData }) => {
  if (!bmiData) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Body Mass Index (BMI)</Typography>
          <Typography variant="body2" color="text.secondary">
            No BMI data available
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const { bmi, category } = bmiData;
  const categoryColor = getBmiCategoryColor(category);
  
  // Calculate progress value (0-100) based on BMI
  // BMI range is typically 15-40, so normalize to 0-100%
  const normalizedBmi = Math.min(100, Math.max(0, ((bmi - 15) / 25) * 100));
  
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>Body Mass Index (BMI)</Typography>
        
        <Box sx={{ mt: 2, mb: 1 }}>
          <Typography variant="h4" align="center">
            {bmi}
          </Typography>
          <Typography 
            variant="subtitle1" 
            align="center"
            sx={{ 
              textTransform: 'capitalize',
              color: categoryColor,
              fontWeight: 'bold'
            }}
          >
            {category}
          </Typography>
        </Box>
        
        <Box sx={{ width: '100%', mt: 3 }}>
          <LinearProgress 
            variant="determinate" 
            value={normalizedBmi} 
            sx={{
              height: 10,
              borderRadius: 5,
              backgroundColor: '#e0e0e0',
              '& .MuiLinearProgress-bar': {
                backgroundColor: categoryColor,
                borderRadius: 5,
              }
            }}
          />
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              mt: 1
            }}
          >
            <Typography variant="caption" color="text.secondary">Underweight</Typography>
            <Typography variant="caption" color="text.secondary">Normal</Typography>
            <Typography variant="caption" color="text.secondary">Overweight</Typography>
            <Typography variant="caption" color="text.secondary">Obese</Typography>
          </Box>
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          BMI is a measure of body fat based on height and weight.
        </Typography>
      </CardContent>
    </Card>
  );
};

export default BMICard;