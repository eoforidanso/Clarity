import winston from 'winston';
import config from '../config.js';

const { combine, timestamp, errors, json, colorize, simple } = winston.format;

const logger = winston.createLogger({
  level: config.nodeEnv === 'production' ? 'info' : 'debug',
  format: combine(
    timestamp(),
    errors({ stack: true }),
    json()
  ),
  defaultMeta: { service: 'ehr-api' },
  transports: [
    // Always log to stdout (PM2 / container log aggregators pick this up)
    new winston.transports.Console({
      format: config.nodeEnv === 'production'
        ? combine(timestamp(), errors({ stack: true }), json())
        : combine(colorize(), simple()),
    }),
  ],
});

// In production add a persistent error log file as a safety net
if (config.nodeEnv === 'production') {
  logger.add(new winston.transports.File({
    filename: './logs/error.log',
    level: 'error',
    maxsize: 10 * 1024 * 1024,  // 10 MB
    maxFiles: 5,
    tailable: true,
  }));
  logger.add(new winston.transports.File({
    filename: './logs/combined.log',
    maxsize: 50 * 1024 * 1024, // 50 MB
    maxFiles: 7,
    tailable: true,
  }));
}

export default logger;
