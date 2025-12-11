// Utilities for namespacing localStorage keys by current user

/**
 * Data integrity check - create checksum for stored data
 */
function createChecksum(data) {
  let hash = 0;
  const str = JSON.stringify(data);
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

/**
 * Verify data integrity
 */
function verifyDataIntegrity(data, checksum) {
  return createChecksum(data) === checksum;
}

/**
 * Get current user ID with validation
 */
export function getCurrentUserId() {
  try {
    const u = localStorage.getItem("schedease_current_user");
    
    // Validate that it's not been tampered with
    if (u) {
      // Check if user exists in users list
      const users = loadUsers();
      const userExists = users.some(user => user.username === u || user.email === u);
      
      if (!userExists) {
        console.warn('Invalid user ID detected');
        localStorage.removeItem("schedease_current_user");
        return null;
      }
    }
    
    return u || null;
  } catch (e) {
    return null;
  }
}

export function setCurrentUserId(id) {
  try {
    if (id == null) {
      localStorage.removeItem("schedease_current_user");
    } else {
      // Validate input before storing
      const sanitized = String(id).replace(/[<>'"]/g, '');
      localStorage.setItem("schedease_current_user", sanitized);
    }
  } catch (e) {
    // ignore
  }
}

export function userKey(baseKey) {
  const id = getCurrentUserId();
  return id ? `${baseKey}::${id}` : `${baseKey}::guest`;
}

// Simple users store helpers (for demo/local auth)
const USERS_KEY = "schedease_users";
const USERS_CHECKSUM_KEY = "schedease_users_checksum";

export function loadUsers() {
  try {
    const s = localStorage.getItem(USERS_KEY);
    const checksum = localStorage.getItem(USERS_CHECKSUM_KEY);
    
    if (!s) return [];
    
    const users = JSON.parse(s);
    
    // Verify data integrity
    if (checksum && !verifyDataIntegrity(users, checksum)) {
      console.warn('Users data integrity check failed - possible tampering detected');
      // Return empty array if data has been tampered with
      localStorage.removeItem(USERS_KEY);
      localStorage.removeItem(USERS_CHECKSUM_KEY);
      return [];
    }
    
    return users;
  } catch (e) {
    console.error('Error loading users');
    return [];
  }
}

export function saveUsers(users) {
  try {
    if (!Array.isArray(users)) {
      throw new Error('Users must be an array');
    }
    
    // Validate each user object
    const validUsers = users.filter(user => {
      return user && 
             typeof user === 'object' &&
             user.username && 
             user.email && 
             user.password;
    });
    
    // Create checksum for integrity check
    const checksum = createChecksum(validUsers);
    
    localStorage.setItem(USERS_KEY, JSON.stringify(validUsers));
    localStorage.setItem(USERS_CHECKSUM_KEY, checksum);
  } catch (e) {
    console.error('Error saving users');
  }
}
