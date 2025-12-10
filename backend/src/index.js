import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdir } from 'fs/promises';
import { authMiddleware, optionalAuth } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import booksRouter from './routes/books.js';
import settingsRouter from './routes/settings.js';
import healthRouter from './routes/health.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure data directory exists
const dataDir = join(__dirname, '..', 'data');
await mkdir(dataDir, { recursive: true });

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 204,
  maxAge: 86400,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Auth-User', process.env.AUTH_REMOTE_HTTP_HEADER].filter(Boolean)
};

app.use(cors(corsOptions));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));

// Content-Type validation for POST/PUT requests
app.use((req, res, next) => {
  if (['POST', 'PUT'].includes(req.method) && req.path !== '/api/health') {
    const contentType = req.get('Content-Type');
    if (!contentType || !contentType.includes('application/json')) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Content-Type must be application/json'
      });
    }
  }
  next();
});

// Health check (no auth required)
app.use('/api/health', healthRouter);

// Apply authentication middleware to all other API routes
app.use('/api', authMiddleware);

// API routes
app.use('/api/books', booksRouter);
app.use('/api/settings', settingsRouter);

// 404 handler for unknown routes
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Only start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`ReadTrail backend server running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Auth enabled: ${process.env.AUTH_ENABLE === 'true'}`);
    console.log(`Guest mode: ${process.env.AUTH_GUEST_USER_ENABLE === 'true'}`);
  });
}

export default app;
