const express = require('express');
const app = express();

// Import routes for testing
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const healthProfileRoutes = require('./routes/healthProfileRoutes');

console.log('\nAuth Routes:');
authRoutes.stack.forEach(layer => {
  if (layer.route) {
    const path = layer.route.path;
    const methods = Object.keys(layer.route.methods).map(method => method.toUpperCase()).join(', ');
    console.log(`${methods} /api/auth${path}`);
  }
});

console.log('\nUser Routes:');
userRoutes.stack.forEach(layer => {
  if (layer.route) {
    const path = layer.route.path;
    const methods = Object.keys(layer.route.methods).map(method => method.toUpperCase()).join(', ');
    console.log(`${methods} /api/users${path}`);
  }
});

console.log('\nHealth Profile Routes:');
healthProfileRoutes.stack.forEach(layer => {
  if (layer.route) {
    const path = layer.route.path;
    const methods = Object.keys(layer.route.methods).map(method => method.toUpperCase()).join(', ');
    console.log(`${methods} /api/health-profile${path}`);
  }
});

console.log('\nRoutes verification completed.');