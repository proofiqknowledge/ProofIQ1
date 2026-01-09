const winston = require('winston');

// Sensitive keys to redact
const SENSITIVE_KEYS = ['password', 'token', 'secret', 'authorization', 'cookie', 'passwordHash', 'masterPassword'];

// Redaction Formatter
const redactSensitive = winston.format((info) => {
  const mask = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    const newObj = Array.isArray(obj) ? [...obj] : { ...obj };
    
    for (const key in newObj) {
      if (SENSITIVE_KEYS.some(k => key.toLowerCase().includes(k))) {
        newObj[key] = '[REDACTED]';
      } else if (typeof newObj[key] === 'object') {
        newObj[key] = mask(newObj[key]);
      }
    }
    return newObj;
  };

  info.message = mask(info.message);
  if (info.meta) info.meta = mask(info.meta);
  return info;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    redactSensitive(),
    winston.format.json()
  ),
  defaultMeta: { service: 'lms-backend', env: process.env.NODE_ENV },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          // For local dev, print pretty 
          if (process.env.NODE_ENV !== 'production') {
             const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
             return `${timestamp} [${level}]: ${typeof message === 'object' ? JSON.stringify(message) : message} ${metaStr}`;
          }
          // For prod (Azure), strict JSON
          return JSON.stringify({ timestamp, level, message, ...meta });
        })
      )
    })
  ]
});

module.exports = logger;
