
import React, { useState } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Chip,
  Paper,
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material';
import {
  LocalDining,
  DirectionsRun,
  Bedtime,
  SelfImprovement,
  Lightbulb,
  Bookmark,
  CalendarToday
} from '@mui/icons-material';
import { formatDate } from '../../utils/dataUtils';

// Function to get icon based on category
const getCategoryIcon = (category) => {
  switch (category) {
    case 'nutrition':
      return <LocalDining />;
    case 'activity':
      return <DirectionsRun />;
    case 'sleep':
      return <Bedtime />;
    case 'stress':
      return <SelfImprovement />;
    default:
      return <Lightbulb />;
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

const HealthInsightsList = ({ insights }) => {
  const [filter, setFilter] = useState('all');

  if (!insights || insights.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 3 }}>
        <Typography variant="body1">No health insights available</Typography>
      </Box>
    );
  }

  // Get unique categories
  const categories = [...new Set(insights.map(insight => insight.category))];
  
  // Filter insights based on selected category
  const filteredInsights = filter === 'all' 
    ? insights 
    : insights.filter(insight => insight.category === filter);
  
  const handleFilterChange = (event, newFilter) => {
    if (newFilter !== null) {
      setFilter(newFilter);
    }
  };
  
  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center' }}>
        <ToggleButtonGroup
          value={filter}
          exclusive
          onChange={handleFilterChange}
          aria-label="insights filter"
          size="small"
        >
          <ToggleButton value="all" aria-label="all insights">
            All
          </ToggleButton>
          {categories.map(category => (
            <ToggleButton 
              key={category} 
              value={category} 
              aria-label={`${category} insights`}
              sx={{ 
                textTransform: 'capitalize',
                '&.Mui-selected': { 
                  color: getCategoryColor(category),
                }
              }}
            >
              {category}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>
      
      <List>
        {filteredInsights.map((insight, index) => (
          <React.Fragment key={index}>
            {index > 0 && <Divider component="li" />}
            <ListItem alignItems="flex-start">
              <ListItemIcon
                sx={{ color: getCategoryColor(insight.category) }}
              >
                {getCategoryIcon(insight.category)}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                    <Typography variant="subtitle1" component="span">
                      {insight.insight}
                    </Typography>
                    <Chip
                      size="small"
                      label={insight.category}
                      sx={{
                        bgcolor: getCategoryColor(insight.category) + '20',
                        color: getCategoryColor(insight.category),
                        textTransform: 'capitalize'
                      }}
                    />
                    {insight.date && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', ml: 'auto' }}>
                        <CalendarToday fontSize="inherit" sx={{ mr: 0.5 }} />
                        {formatDate(insight.date, true)}
                      </Typography>
                    )}
                  </Box>
                }
                secondary={
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      {insight.recommendation}
                    </Typography>
                    {insight.recommendation && (
                      <Paper 
                        elevation={0} 
                        sx={{ 
                          mt: 1, 
                          p: 1, 
                          bgcolor: 'primary.light', 
                          color: 'primary.contrastText',
                          borderRadius: 1,
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <Bookmark fontSize="small" sx={{ mr: 1 }} />
                        <Typography variant="body2">
                          Try implementing this recommendation to improve your wellness score
                        </Typography>
                      </Paper>
                    )}
                  </Box>
                }
              />
            </ListItem>
          </React.Fragment>
        ))}
      </List>
      
      {filter === 'all' && categories.length > 0 && (
        <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
          <Typography variant="body2" color="text.secondary" sx={{ width: '100%', textAlign: 'center', mb: 1 }}>
            Insight Categories:
          </Typography>
          {categories.map(category => (
            <Chip
              key={category}
              icon={getCategoryIcon(category)}
              label={`${category} (${insights.filter(i => i.category === category).length})`}
              onClick={() => setFilter(category)}
              sx={{
                bgcolor: getCategoryColor(category) + '20',
                color: getCategoryColor(category),
                textTransform: 'capitalize'
              }}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

export default HealthInsightsList;