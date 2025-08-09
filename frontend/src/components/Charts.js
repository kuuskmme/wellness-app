// src/components/Charts.js - Reusable Chart Components for Step 5
import React, { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Line Chart Component for Progress Tracking
export const LineChart = ({ data, options, title }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (chartRef.current) {
      const ctx = chartRef.current.getContext('2d');
      
      // Destroy existing chart
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      // Create new chart
      chartInstance.current = new ChartJS(ctx, {
        type: 'line',
        data: data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
            },
            title: {
              display: !!title,
              text: title
            },
            tooltip: {
              mode: 'index',
              intersect: false,
            }
          },
          scales: {
            x: {
              display: true,
              title: {
                display: true,
                text: 'Date'
              }
            },
            y: {
              display: true,
              title: {
                display: true,
                text: 'Value'
              }
            }
          },
          ...options
        }
      });
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data, options, title]);

  return (
    <div style={{ position: 'relative', height: '400px', width: '100%' }}>
      <canvas ref={chartRef}></canvas>
    </div>
  );
};

// Bar Chart Component for Comparisons
export const BarChart = ({ data, options, title }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (chartRef.current) {
      const ctx = chartRef.current.getContext('2d');
      
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      chartInstance.current = new ChartJS(ctx, {
        type: 'bar',
        data: data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
            },
            title: {
              display: !!title,
              text: title
            }
          },
          scales: {
            y: {
              beginAtZero: true
            }
          },
          ...options
        }
      });
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data, options, title]);

  return (
    <div style={{ position: 'relative', height: '400px', width: '100%' }}>
      <canvas ref={chartRef}></canvas>
    </div>
  );
};

// Doughnut Chart Component for Score Visualization
export const DoughnutChart = ({ data, options, title }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (chartRef.current) {
      const ctx = chartRef.current.getContext('2d');
      
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      chartInstance.current = new ChartJS(ctx, {
        type: 'doughnut',
        data: data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
            },
            title: {
              display: !!title,
              text: title
            }
          },
          ...options
        }
      });
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data, options, title]);

  return (
    <div style={{ position: 'relative', height: '300px', width: '100%' }}>
      <canvas ref={chartRef}></canvas>
    </div>
  );
};

// Gauge Chart Component for BMI/Wellness Score
export const GaugeChart = ({ value, max = 100, title, zones }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (chartRef.current) {
      const ctx = chartRef.current.getContext('2d');
      
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      // Create gauge data
      const gaugeData = {
        datasets: [{
          data: zones ? zones.map(z => z.value) : [value, max - value],
          backgroundColor: zones ? zones.map(z => z.color) : ['#3b82f6', '#e5e7eb'],
          borderWidth: 0,
          circumference: 180,
          rotation: 270,
        }]
      };

      chartInstance.current = new ChartJS(ctx, {
        type: 'doughnut',
        data: gaugeData,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              enabled: false
            }
          },
          cutout: '75%'
        }
      });
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [value, max, zones]);

  return (
    <div className="relative">
      <div style={{ position: 'relative', height: '200px', width: '100%' }}>
        <canvas ref={chartRef}></canvas>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-3xl font-bold">{value}</div>
          {title && <div className="text-sm text-gray-600">{title}</div>}
        </div>
      </div>
    </div>
  );
};

// Activity Heatmap Component
export const ActivityHeatmap = ({ data, title }) => {
  const getActivityColor = (count) => {
    if (count === 0) return 'bg-gray-100';
    if (count === 1) return 'bg-green-200';
    if (count === 2) return 'bg-green-300';
    if (count === 3) return 'bg-green-400';
    if (count >= 4) return 'bg-green-500';
    return 'bg-gray-100';
  };

  const weeks = [];
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Group data by weeks
  for (let i = 0; i < 12; i++) {
    const week = [];
    for (let j = 0; j < 7; j++) {
      const dataIndex = i * 7 + j;
      week.push(data[dataIndex] || { count: 0, date: null });
    }
    weeks.push(week);
  }

  return (
    <div className="bg-white p-4 rounded-lg">
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      
      <div className="flex gap-2">
        <div className="flex flex-col justify-between text-xs text-gray-500 mr-2">
          {days.map(day => (
            <div key={day} className="h-4 flex items-center">{day}</div>
          ))}
        </div>
        
        <div className="flex gap-1">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-1">
              {week.map((day, dayIndex) => (
                <div
                  key={`${weekIndex}-${dayIndex}`}
                  className={`w-4 h-4 rounded-sm ${getActivityColor(day.count)} hover:ring-2 hover:ring-blue-400 cursor-pointer`}
                  title={day.date ? `${day.date}: ${day.count} activities` : 'No data'}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex items-center gap-2 mt-4 text-xs text-gray-600">
        <span>Less</span>
        <div className="flex gap-1">
          {[0, 1, 2, 3, 4].map(level => (
            <div key={level} className={`w-3 h-3 rounded-sm ${getActivityColor(level)}`} />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  );
};

// Progress Ring Component
export const ProgressRing = ({ progress, size = 120, strokeWidth = 8, color = '#3b82f6' }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold">{progress}%</span>
      </div>
    </div>
  );
};

// Sparkline Component for Mini Trends
export const Sparkline = ({ data, color = '#3b82f6', height = 40 }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 100;
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points={`${points} ${width},${height} 0,${height}`}
        fill={`${color}20`}
        stroke="none"
      />
    </svg>
  );
};

// Comparison Chart Component
export const ComparisonChart = ({ current, target, title }) => {
  const percentage = Math.min(100, (current / target) * 100);
  const isAhead = current >= target;

  return (
    <div className="bg-white p-4 rounded-lg">
      {title && <h4 className="text-sm font-semibold mb-2">{title}</h4>}
      
      <div className="flex justify-between items-end mb-2">
        <div>
          <p className="text-xs text-gray-500">Current</p>
          <p className="text-xl font-bold">{current}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Target</p>
          <p className="text-xl font-bold">{target}</p>
        </div>
      </div>
      
      <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ${
            isAhead ? 'bg-green-500' : 'bg-blue-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      <p className={`text-xs mt-2 ${isAhead ? 'text-green-600' : 'text-blue-600'}`}>
        {isAhead ? '✓ Target achieved!' : `${(100 - percentage).toFixed(0)}% to go`}
      </p>
    </div>
  );
};