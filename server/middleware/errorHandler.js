import * as Sentry from '@sentry/node';
import logger from './logger.js';

export function errorHandler(err, req, res, _next) {
  const status = err.statusCode || err.status || 500;

  // Report unexpected server errors to Sentry
  if (status >= 500) {
    logger.error('Unhandled server error', {
      error: err.message,
      stack: err.stack,
      method: req.method,
      path: req.path,
    });
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(err);
    }
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }

  res.status(status).json({
    error: status === 500 ? 'Internal server error' : err.message,
  });
}
