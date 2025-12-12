// Utilities for namespacing localStorage keys by current user

const API_BASE_URL = "http://localhost:4000/api";

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

// API-based users management
export async function loadUsers() {
  try {
    const res = await fetch(`${API_BASE_URL}/users`);
    if (!res.ok) {
      if (res.status === 404) return [];
      throw new Error(`Failed to load users: ${res.status}`);
    }
    return await res.json();
  } catch (e) {
    console.error('Error loading users:', e);
    return [];
  }
}

export async function saveUser(user) {
  try {
    if (!user || typeof user !== 'object') {
      throw new Error('User must be an object');
    }

    // Validate user object
    if (!user.username || !user.email || !user.password) {
      throw new Error('User must have username, email, and password');
    }

    const res = await fetch(`${API_BASE_URL}/users/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(user),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || `Failed to register user: ${res.status}`);
    }

    return await res.json();
  } catch (e) {
    console.error('Error saving user:', e);
    throw e;
  }
}

export async function loginUser(email, password) {
  try {
    const res = await fetch(`${API_BASE_URL}/users/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Invalid credentials');
    }

    return await res.json();
  } catch (e) {
    console.error('Error logging in:', e);
    throw e;
  }
}
