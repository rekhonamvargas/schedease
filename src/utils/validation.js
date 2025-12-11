/**
 * Data Validation Middleware
 * Validates and sanitizes all data operations to prevent tampering
 */

/**
 * Validate schedule data structure
 */
export function validateSchedule(schedule) {
  if (!schedule || typeof schedule !== 'object') {
    throw new Error('Invalid schedule data');
  }

  const required = ['id', 'name', 'sections'];
  for (const field of required) {
    if (!(field in schedule)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  // Sanitize name
  if (typeof schedule.name !== 'string') {
    throw new Error('Schedule name must be a string');
  }

  // Validate sections array
  if (!Array.isArray(schedule.sections)) {
    throw new Error('Sections must be an array');
  }

  return true;
}

/**
 * Validate subject data structure
 */
export function validateSubject(subject) {
  if (!subject || typeof subject !== 'object') {
    throw new Error('Invalid subject data');
  }

  const required = ['subjectCode', 'subjectTitle'];
  for (const field of required) {
    if (!(field in subject)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  return true;
}

/**
 * Validate user data structure
 */
export function validateUser(user) {
  if (!user || typeof user !== 'object') {
    throw new Error('Invalid user data');
  }

  const required = ['username', 'email', 'password'];
  for (const field of required) {
    if (!(field in user)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(user.email)) {
    throw new Error('Invalid email format');
  }

  // Username validation (alphanumeric and underscore only)
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  if (!usernameRegex.test(user.username)) {
    throw new Error('Invalid username format');
  }

  return true;
}

/**
 * Sanitize string input
 */
export function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  
  // Remove HTML tags and dangerous characters
  return str
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>'"]/g, '') // Remove dangerous characters
    .trim();
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  const sanitized = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      
      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value);
      } else if (typeof value === 'object') {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
  }

  return sanitized;
}

/**
 * Rate limiting for operations
 */
const operationTimestamps = new Map();

export function checkRateLimit(operationId, maxAttempts = 5, windowMs = 60000) {
  const now = Date.now();
  const timestamps = operationTimestamps.get(operationId) || [];
  
  // Remove old timestamps outside the window
  const recentTimestamps = timestamps.filter(t => now - t < windowMs);
  
  if (recentTimestamps.length >= maxAttempts) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }
  
  recentTimestamps.push(now);
  operationTimestamps.set(operationId, recentTimestamps);
  
  return true;
}

/**
 * Validate data size to prevent memory attacks
 */
export function validateDataSize(data, maxSizeBytes = 5 * 1024 * 1024) { // 5MB default
  const size = new Blob([JSON.stringify(data)]).size;
  
  if (size > maxSizeBytes) {
    throw new Error('Data size exceeds maximum allowed size');
  }
  
  return true;
}

/**
 * Create a readonly proxy for sensitive data
 */
export function createReadonlyProxy(obj) {
  return new Proxy(obj, {
    set(target, prop, value) {
      console.warn(`Attempt to modify readonly property: ${prop}`);
      return false;
    },
    deleteProperty(target, prop) {
      console.warn(`Attempt to delete readonly property: ${prop}`);
      return false;
    }
  });
}

/**
 * Validate token before operations
 */
export function validateToken() {
  const token = localStorage.getItem('token');
  
  if (!token) {
    throw new Error('Authentication required');
  }
  
  // In production, validate token with backend
  // For now, just check it exists
  return true;
}

/**
 * Log security events
 */
export function logSecurityEvent(eventType, details) {
  const event = {
    type: eventType,
    timestamp: new Date().toISOString(),
    details: details,
    userAgent: navigator.userAgent
  };
  
  if (process.env.NODE_ENV === 'development') {
    console.warn('Security Event:', event);
  }
  
  // In production, send to backend logging service
  // For now, store in sessionStorage for debugging
  try {
    const events = JSON.parse(sessionStorage.getItem('security_events') || '[]');
    events.push(event);
    // Keep only last 50 events
    if (events.length > 50) {
      events.shift();
    }
    sessionStorage.setItem('security_events', JSON.stringify(events));
  } catch (e) {
    // Ignore storage errors
  }
}
