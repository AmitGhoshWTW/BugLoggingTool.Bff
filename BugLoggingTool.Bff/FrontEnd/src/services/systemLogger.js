// src/services/systemLogger.js
// LOGGING DISABLED - Minimal stub to prevent errors

const systemLogger = {
    init: () => {},
    log: () => {},
    logInfo: () => {},
    logWarning: () => {},
    logError: () => {},
    logCritical: () => {},
    flushQueue: () => Promise.resolve(),
    captureAppState: () => ({}),
    getNetworkStatus: () => 'online'
  };
  
  export default systemLogger;