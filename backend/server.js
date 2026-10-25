const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { initDB } = require('./db');
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const ticketRoutes = require('./routes/tickets');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for frontend web client
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Endpoint (Lightweight for EC2/ALB checks)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Event Management & Ticketing REST API',
    environment: process.env.NODE_ENV || 'development',
    region: process.env.AWS_REGION || 'ap-south-1'
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/tickets', ticketRoutes);

// Root Welcome Endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the Cloud-Based Event Management API',
    documentation: '/api/health',
    endpoints: {
      auth: '/api/auth',
      events: '/api/events',
      tickets: '/api/tickets'
    }
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Error]', err.stack || err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// Initialize DB and start HTTP server
async function startServer() {
  try {
    await initDB();
    console.log('[DB] Database connection pool initialized.');
  } catch (dbErr) {
    console.warn(`[DB] Warning during database init: ${dbErr.message}`);
    console.warn('[DB] Server will continue listening. Configure SSM parameters or local env variables.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[API Server] Running and listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
