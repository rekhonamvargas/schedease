import bcrypt from 'bcryptjs';

// Password hashing utilities
const SALT_ROUNDS = 10;

/**
 * Hash a plain text password
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
export async function hashPassword(password) {
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(password, salt);
    return hashedPassword;
  } catch (error) {
    console.error('Error hashing password');
    throw new Error('Failed to hash password');
  }
}

/**
 * Verify a plain text password against a hashed password
 * @param {string} password - Plain text password
 * @param {string} hashedPassword - Hashed password to compare against
 * @returns {Promise<boolean>} True if passwords match
 */
export async function verifyPassword(password, hashedPassword) {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    console.error('Error verifying password');
    return false;
  }
}

/**
 * Sanitize object for logging (hide sensitive fields)
 * @param {Object} obj - Object to sanitize
 * @returns {Object} Sanitized object
 */
export function sanitizeForLogging(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'api_key', 'authorization'];
  const sanitized = { ...obj };
  
  Object.keys(sanitized).forEach(key => {
    const lowerKey = key.toLowerCase();
    if (sensitiveFields.some(field => lowerKey.includes(field))) {
      sanitized[key] = '[REDACTED]';
    }
  });
  
  return sanitized;
}

/**
 * Disable console logs in production
 */
export function disableConsoleInProduction() {
  if (process.env.NODE_ENV === 'production') {
    console.log = () => {};
    console.debug = () => {};
    console.info = () => {};
    // Keep console.error and console.warn for critical issues
  }
}

/**
 * Prevent dev tools from modifying critical functions
 */
export function protectDevTools() {
  // Disable right-click context menu in production
  if (process.env.NODE_ENV === 'production') {
    document.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // Detect dev tools opening
  const devToolsChecker = () => {
    const threshold = 160;
    const widthThreshold = window.outerWidth - window.innerWidth > threshold;
    const heightThreshold = window.outerHeight - window.innerHeight > threshold;
    
    if (widthThreshold || heightThreshold) {
      // Dev tools might be open - you can add additional security measures
      console.warn('Developer tools detected');
    }
  };

  // Check periodically
  setInterval(devToolsChecker, 1000);

  // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
  document.addEventListener('keydown', (e) => {
    if (
      e.key === 'F12' ||
      (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
      (e.ctrlKey && e.key === 'U')
    ) {
      e.preventDefault();
      return false;
    }
  });

  // Prevent text selection on sensitive elements
  document.addEventListener('selectstart', (e) => {
    const target = e.target;
    if (target && target.classList && target.classList.contains('no-select')) {
      e.preventDefault();
    }
  });

  // Detect debugger statements
  const detectDebugger = () => {
    const before = new Date();
    debugger;
    const after = new Date();
    if (after - before > 100) {
      // Debugger was open
      console.warn('Debugger detected');
    }
  };

  // Run debugger detection periodically
  if (process.env.NODE_ENV === 'production') {
    setInterval(detectDebugger, 3000);
  }
}

/**
 * Clear sensitive data from localStorage on logout
 */
export function clearSensitiveData() {
  const keysToKeep = ['schedease_theme']; // Add any non-sensitive keys you want to keep
  
  const allKeys = Object.keys(localStorage);
  allKeys.forEach(key => {
    if (!keysToKeep.includes(key)) {
      localStorage.removeItem(key);
    }
  });
}

/**
 * Validate token format (basic check)
 * @param {string} token - Token to validate
 * @returns {boolean} True if token format is valid
 */
export function isValidTokenFormat(token) {
  if (!token || typeof token !== 'string') return false;
  // Basic JWT format check (3 parts separated by dots)
  const parts = token.split('.');
  return parts.length === 3;
}

/**
 * Secure storage wrapper that encrypts sensitive data
 * Note: This is basic obfuscation. For true security, use HTTPS and backend encryption
 */
export const secureStorage = {
  setItem(key, value) {
    try {
      const encoded = btoa(JSON.stringify(value));
      localStorage.setItem(key, encoded);
    } catch (e) {
      console.error('Error storing secure item');
    }
  },
  
  getItem(key) {
    try {
      const encoded = localStorage.getItem(key);
      if (!encoded) return null;
      return JSON.parse(atob(encoded));
    } catch (e) {
      console.error('Error retrieving secure item');
      return null;
    }
  },
  
  removeItem(key) {
    localStorage.removeItem(key);
  }
};

/**
 * Initialize security measures
 */
export function initSecurity() {
  disableConsoleInProduction();
  protectDevTools();
  
  // Clear sensitive data on page unload
  window.addEventListener('beforeunload', () => {
    // Don't clear everything, just ensure sensitive operations are handled
    sessionStorage.clear();
  });
}
