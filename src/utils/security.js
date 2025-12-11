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
 * Protect critical storage functions from tampering
 */
export function protectStorageFunctions() {
  // Freeze critical storage objects to prevent modification
  if (typeof Storage !== 'undefined') {
    const originalSetItem = Storage.prototype.setItem;
    const originalGetItem = Storage.prototype.getItem;
    const originalRemoveItem = Storage.prototype.removeItem;
    const originalClear = Storage.prototype.clear;

    // Make storage methods non-configurable and non-writable
    Object.defineProperty(Storage.prototype, 'setItem', {
      configurable: false,
      enumerable: false,
      writable: false,
      value: originalSetItem
    });

    Object.defineProperty(Storage.prototype, 'getItem', {
      configurable: false,
      enumerable: false,
      writable: false,
      value: originalGetItem
    });

    Object.defineProperty(Storage.prototype, 'removeItem', {
      configurable: false,
      enumerable: false,
      writable: false,
      value: originalRemoveItem
    });

    Object.defineProperty(Storage.prototype, 'clear', {
      configurable: false,
      enumerable: false,
      writable: false,
      value: originalClear
    });
  }
}

/**
 * Protect DOM and prevent tampering
 */
export function protectDOM() {
  // Prevent modification of critical DOM methods
  if (typeof document !== 'undefined') {
    const originalCreateElement = document.createElement;
    const originalQuerySelector = document.querySelector;
    const originalGetElementById = document.getElementById;

    Object.defineProperty(document, 'createElement', {
      configurable: false,
      writable: false,
      value: originalCreateElement
    });

    Object.defineProperty(document, 'querySelector', {
      configurable: false,
      writable: false,
      value: originalQuerySelector
    });

    Object.defineProperty(document, 'getElementById', {
      configurable: false,
      writable: false,
      value: originalGetElementById
    });
  }
}

/**
 * Monitor localStorage for unauthorized changes
 */
export function monitorStorageChanges() {
  let lastStorageSnapshot = JSON.stringify(localStorage);
  
  const checkStorage = () => {
    const currentSnapshot = JSON.stringify(localStorage);
    
    if (currentSnapshot !== lastStorageSnapshot) {
      // Storage has been modified - verify it's authorized
      const currentUser = localStorage.getItem('schedease_current_user');
      const token = localStorage.getItem('token');
      
      // If user or token is missing, someone might be tampering
      if (!currentUser && !token) {
        console.warn('Unauthorized storage modification detected');
        // Could redirect to login or take other action
      }
      
      lastStorageSnapshot = currentSnapshot;
    }
  };

  // Check every 2 seconds
  setInterval(checkStorage, 2000);
}

/**
 * Prevent console tampering
 */
export function protectConsole() {
  if (process.env.NODE_ENV === 'production') {
    // Store original console methods
    const originalConsole = { ...console };

    // Freeze console object
    Object.freeze(console);

    // Prevent reassignment of console
    Object.defineProperty(window, 'console', {
      configurable: false,
      writable: false,
      value: console
    });

    // Override toString to hide implementation
    console.toString = () => '[object Console]';
  }
}

/**
 * Disable drag and drop to prevent data extraction
 */
export function disableDragDrop() {
  document.addEventListener('dragstart', (e) => {
    e.preventDefault();
    return false;
  });

  document.addEventListener('drop', (e) => {
    e.preventDefault();
    return false;
  });
}

/**
 * Clear clipboard on sensitive operations
 */
export function protectClipboard() {
  // Prevent copying sensitive data
  document.addEventListener('copy', (e) => {
    const selection = window.getSelection().toString();
    
    // Check if selection contains sensitive patterns
    const sensitivePatterns = [
      /password/i,
      /token/i,
      /secret/i,
      /api[_-]?key/i,
      /\$2[aby]\$\d{2}\$/  // bcrypt hash pattern
    ];

    const isSensitive = sensitivePatterns.some(pattern => pattern.test(selection));
    
    if (isSensitive) {
      e.preventDefault();
      e.clipboardData.setData('text/plain', '[Sensitive data cannot be copied]');
      return false;
    }
  });

  // Clear clipboard periodically in production
  if (process.env.NODE_ENV === 'production') {
    setInterval(() => {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText('').catch(() => {});
      }
    }, 30000); // Clear every 30 seconds
  }
}

/**
 * Detect and prevent iframe injection
 */
export function preventIframeInjection() {
  // Prevent page from being loaded in iframe
  if (window.self !== window.top) {
    window.top.location = window.self.location;
  }

  // Monitor for iframe creation
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.tagName === 'IFRAME') {
          console.warn('Unauthorized iframe detected');
          node.remove();
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

/**
 * Protect against XSS attacks
 */
export function sanitizeInput(input) {
  if (!input) return input;
  
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

/**
 * Initialize security measures
 */
export function initSecurity() {
  disableConsoleInProduction();
  protectDevTools();
  protectStorageFunctions();
  protectDOM();
  monitorStorageChanges();
  protectConsole();
  disableDragDrop();
  protectClipboard();
  preventIframeInjection();
  
  // Clear sensitive data on page unload
  window.addEventListener('beforeunload', () => {
    sessionStorage.clear();
  });

  // Detect if running in production
  if (process.env.NODE_ENV === 'production') {
    // Additional production-only protections
    
    // Disable eval and Function constructor
    window.eval = function() {
      throw new Error('eval is disabled for security');
    };
    
    // Prevent modification of window object
    Object.freeze(Object.prototype);
  }
}
