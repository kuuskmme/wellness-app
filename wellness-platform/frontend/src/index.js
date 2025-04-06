
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Register ChartJS globally if needed (though we're doing it per component now)
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);