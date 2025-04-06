
import React from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Button
} from '@mui/material';
import { 
  Scale, 
  Height, 
  FitnessCenter, 
  StackedLineChart,
  CalendarToday
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { formatDate, formatWeight, formatHeight } from '../../utils/dataUtils';

const LatestMetricsCard = ({ metrics }) => {
  // If no metrics are provided, show empty state
  if (!metrics || metrics.length === 0) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>Latest Physical Metrics</Typography>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            justifyContent: 'center', 
            height: 200,
            mt: 2 
          }}>
            <Typography variant="body1" align="center" gutterBottom>
              No physical metrics recorded yet.
            </Typography>
            <Button 
              variant="outlined" 
              component={Link} 
              to="/health-profile"
              sx={{ mt: 2 }}
            >
              Add Metrics
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  // Get the most recent metrics entry
  const latestMetrics = metrics[metrics.length - 1];
  
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Latest Physical Metrics</Typography>
          <Button 
            variant="text" 
            component={Link} 
            to="/health-profile"
            size="small"
          >
            Update
          </Button>
        </Box>
        
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'center', 
          mb: 2 
        }}>
          <CalendarToday fontSize="small" color="action" sx={{ mr: 1 }} />
          <Typography variant="body2" color="text.secondary">
            {formatDate(latestMetrics.date, true)}
          </Typography>
        </Box>
        
        <List>
          {/* Weight */}
          <ListItem>
            <ListItemIcon>
              <Scale />
            </ListItemIcon>
            <ListItemText
              primary="Weight"
              secondary={formatWeight(latestMetrics.weight)}
            />
          </ListItem>
          
          {/* Height */}
          <ListItem>
            <ListItemIcon>
              <Height />
            </ListItemIcon>
            <ListItemText
              primary="Height"
              secondary={formatHeight(latestMetrics.height)}
            />
          </ListItem>
          
          {/* Body Fat Percentage (if available) */}
          {latestMetrics.bodyFatPercentage && (
            <ListItem>
              <ListItemIcon>
                <FitnessCenter />
              </ListItemIcon>
              <ListItemText
                primary="Body Fat"
                secondary={`${latestMetrics.bodyFatPercentage}%`}
              />
            </ListItem>
          )}
          
          {/* Waist Circumference (if available) */}
          {latestMetrics.waistCircumference && latestMetrics.waistCircumference.value && (
            <ListItem>
              <ListItemIcon>
                <StackedLineChart />
              </ListItemIcon>
              <ListItemText
                primary="Waist Circumference"
                secondary={`${latestMetrics.waistCircumference.value} ${latestMetrics.waistCircumference.unit}`}
              />
            </ListItem>
          )}
        </List>
      </CardContent>
    </Card>
  );
};

export default LatestMetricsCard;