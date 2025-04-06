
import React from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Chip,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider
} from '@mui/material';
import { 
  ExpandMore,
  Lightbulb,
  LocalDining,
  DirectionsRun,
  Bedtime,
  SelfImprovement
} from '@mui/icons-material';
import { Link } from 'react-router-dom';

// Function to get icon based on category
const getCategoryIcon = (category) => {
  switch (category) {
    case 'nutrition':
      return <LocalDining fontSize="small" />;
    case 'activity':
      return <DirectionsRun fontSize="small" />;
    case 'sleep':
      return <Bedtime fontSize="small" />;
    case 'stress':
      return <SelfImprovement fontSize="small" />;
    default:
      return <Lightbulb fontSize="small" />;
  }
};

// Function to get color based on category
const getCategoryColor = (category) => {
  switch (category) {
    case 'nutrition':
      return '#4CAF50'; // green
    case 'activity':
      return '#2196F3'; // blue
    case 'sleep':
      return '#9C27B0'; // purple
    case 'stress':
      return '#FF9800'; // orange
    default:
      return '#607D8B'; // blue grey
  }
};

const HealthInsightsCard = ({ insights }) => {
  if (!insights || insights.length === 0) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Health Insights</Typography>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            justifyContent: 'center', 
            height: 250,
            mt: 2 
          }}>
            <Typography variant="body1" align="center" gutterBottom>
              No health insights available yet.
            </Typography>
            <Button 
              variant="outlined" 
              component={Link} 
              to="/analytics"
              sx={{ mt: 2 }}
            >
              View Analytics
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  // Limit to 3 insights for display
  const displayInsights = insights.length > 3 ? insights.slice(0, 3) : insights;
  
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Health Insights</Typography>
          <Button 
            variant="text" 
            component={Link}
            to="/analytics"
            size="small"
          >
            View All
          </Button>
        </Box>
        
        <Box>
          {displayInsights.map((insight, index) => (
            <React.Fragment key={index}>
              {index > 0 && <Divider sx={{ my: 1 }} />}
              <Accordion
                elevation={0}
                disableGutters
                sx={{ 
                  '&:before': { display: 'none' },
                  backgroundColor: 'transparent'
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMore />}
                  sx={{ px: 0 }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Chip
                      icon={getCategoryIcon(insight.category)}
                      label={insight.category}
                      size="small"
                      sx={{ 
                        textTransform: 'capitalize',
                        mr: 2,
                        backgroundColor: getCategoryColor(insight.category) + '20',
                        color: getCategoryColor(insight.category),
                        '& .MuiChip-icon': { color: getCategoryColor(insight.category) }
                      }}
                    />
                    <Typography variant="body1">{insight.insight}</Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                  <Typography variant="body2" color="text.secondary">
                    {insight.recommendation}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            </React.Fragment>
          ))}
        </Box>
        
        {insights.length > 3 && (
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {insights.length - 3} more insights available
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default HealthInsightsCard;