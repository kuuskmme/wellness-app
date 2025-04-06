
import React from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  Button
} from '@mui/material';
import { Link } from 'react-router-dom';
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

const GoalsProgressCard = ({ goalsData }) => {
  if (!goalsData || goalsData.length === 0) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Fitness Goals Progress</Typography>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            justifyContent: 'center', 
            height: 200,
            mt: 2 
          }}>
            <Typography variant="body1" align="center" gutterBottom>
              No fitness goals found.
            </Typography>
            <Button 
              variant="outlined" 
              component={Link} 
              to="/fitness-goals"
              sx={{ mt: 2 }}
            >
              Add Goals
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  // Format goals data for chart
  const chartData = formatGoalsForChart(goalsData);
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `Progress: ${context.parsed.y}%`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: 'Progress (%)'
        }
      }
    },
    maintainAspectRatio: false
  };
  
  // If we have too many goals, just show the most recent ones
  const displayGoals = goalsData.length > 3 ? goalsData.slice(0, 3) : goalsData;
  
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Fitness Goals Progress</Typography>
          <Button 
            variant="text" 
            component={Link} 
            to="/fitness-goals"
            size="small"
          >
            View All
          </Button>
        </Box>
        
        <Box sx={{ height: 200, mb: 2 }}>
          <Bar data={chartData} options={chartOptions} />
        </Box>
        
        <List>
          {displayGoals.map((goal, index) => (
            <React.Fragment key={goal.id}>
              {index > 0 && <Divider component="li" />}
              <ListItem>
                <ListItemText
                  primary={
                    <Typography 
                      variant="body1" 
                      sx={{ textTransform: 'capitalize' }}
                    >
                      {goal.type}
                    </Typography>
                  }
                  secondary={`Status: ${goal.status}`}
                />
                <Box sx={{ width: '50%', ml: 2 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={goal.progress || 0} 
                    sx={{
                      height: 8,
                      borderRadius: 5,
                      backgroundColor: '#e0e0e0',
                      '& .MuiLinearProgress-bar': {
                        borderRadius: 5,
                      }
                    }}
                  />
                  <Typography 
                    variant="caption" 
                    color="text.secondary"
                    sx={{ display: 'block', textAlign: 'right', mt: 0.5 }}
                  >
                    {goal.progress || 0}%
                  </Typography>
                </Box>
              </ListItem>
            </React.Fragment>
          ))}
        </List>
      </CardContent>
    </Card>
  );
};

export default GoalsProgressCard;