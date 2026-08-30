// Simple structured logger utility

const formatLog = (level, message, meta = {}) => {
  const timestamp = new Date().toISOString();
  return JSON.stringify({
    timestamp,
    level,
    message,
    ...meta,
  });
};

const logger = {
  info: (message, meta) => console.log(formatLog('INFO', message, meta)),
  warn: (message, meta) => console.warn(formatLog('WARN', message, meta)),
  error: (message, meta) => console.error(formatLog('ERROR', message, meta)),
  debug: (message, meta) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(formatLog('DEBUG', message, meta));
    }
  },
};

module.exports = logger;
