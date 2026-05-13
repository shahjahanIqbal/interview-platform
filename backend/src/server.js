require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { WebSocketServer } = require('ws');
const rateLimit = require('express-rate-limit');
const interviewRoutes = require('./routes/interview');
const resumeRoutes = require('./routes/resume');
const sessionRoutes = require('./routes/session');

const app = express();
const server = createServer(app);

// WebSocket server for real-time interaction
const wss = new WebSocketServer({ server, path: '/ws' });

// Middleware
//app.use(cors({
//  origin: process.env.FRONTEND_URL || 'htdtp://localhost:3000',
//  credentials: true
//}));
//app.use(express.json({ limit: '10mb' }));
//app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// Middleware

const allowedOrigins = [
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {

    // Allow requests with no origin
    // (mobile apps, curl, Postman, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api', limiter);

// Routes
app.use('/api/interview', interviewRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/session', sessionRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// WebSocket handler for real-time interview
const sessions = new Map();

wss.on('connection', (ws, req) => {
  const sessionId = new URL(req.url, 'ws://localhost').searchParams.get('sessionId');
  if (sessionId) {
    sessions.set(sessionId, ws);
    ws.on('close', () => sessions.delete(sessionId));
  }

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      ws.send(JSON.stringify({ type: 'ack', received: true }));
    } catch (err) {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  });
});

// Export sessions map so routes can use it
app.set('wsSessions', sessions);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket server on ws://localhost:${PORT}/ws`);
});

module.exports = { app, wss };
