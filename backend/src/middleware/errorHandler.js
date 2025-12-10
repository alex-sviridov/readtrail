import { ValidationError } from '../utils/validation.js';

export function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  // Validation errors
  if (err instanceof ValidationError) {
    return res.status(400).json({
      error: 'ValidationError',
      message: err.message,
      details: err.details || undefined
    });
  }

  // JSON parsing errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'ValidationError',
      message: 'Invalid JSON in request body'
    });
  }

  // Database constraint errors
  if (err.message && err.message.includes('SQLITE_CONSTRAINT')) {
    return res.status(400).json({
      error: 'ValidationError',
      message: 'Database constraint violation',
      details: { sqliteError: err.message }
    });
  }

  // Default server error
  res.status(500).json({
    error: 'ServerError',
    message: 'Internal server error'
  });
}

// 404 handler for unknown routes
export function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'NotFoundError',
    message: 'Route not found'
  });
}
