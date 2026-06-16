import logger from '../middleware/logger.js';

/**
 * Log a route-level error with structured context.
 * Drop-in replacement for console.error inside catch blocks.
 *
 * Usage: routeError(req, '[clinical] POST allergies', err)
 */
export function routeError(req, tag, err) {
  logger.error(tag, {
    method:  req.method,
    route:   req.originalUrl,
    userId:  req.user?.id,
    error:   err.message,
    stack:   err.stack,
  });
}
