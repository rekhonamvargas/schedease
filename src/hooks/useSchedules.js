import { useState, useCallback, useEffect } from "react";
import { nextId } from "../utils/ids";
import { validateSchedule, validateDataSize, sanitizeObject, logSecurityEvent } from "../utils/validation";

// Resolve API base dynamically with fallbacks to avoid "Failed to fetch" across environments
function getApiBases() {
  const bases = [];
  try {
    const envBase = (process.env.REACT_APP_API_BASE || process.env.REACT_APP_API_URL || "").trim();
    if (envBase) {
      const trimmed = envBase.replace(/\/$/, "");
      bases.push(trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`);
    }
  } catch {}
  if (typeof window !== "undefined") {
    try {
      const { protocol, hostname, origin } = window.location;
      // Local dev default
      if (hostname === "localhost" || hostname === "127.0.0.1") {
        bases.push(`${protocol}//localhost:4000/api`);
      }
      // Same-origin (supports reverse proxies in production)
      bases.push(`${origin.replace(/\/$/, "")}/api`);
      // If running over https, try https localhost as a fallback
      if (protocol === "https:") bases.push(`https://localhost:4000/api`);
    } catch {}
  }
  // Absolute fallback
  bases.push("http://localhost:4000/api");
  // Ensure uniqueness and defined values
  return Array.from(new Set(bases.filter(Boolean)));
}

async function apiFetch(path, { method = "GET", body, headers } = {}) {
  const bases = getApiBases();
  let lastErr;
  for (const base of bases) {
    const baseTrim = base.replace(/\/$/, "");
    const url = `${baseTrim}${path}`;
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...(headers || {}) },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${res.statusText} at ${url}: ${txt.slice(0, 200)}`);
      }
      const rawText = await res.text();
      return rawText ? JSON.parse(rawText) : null;
    } catch (e) {
      lastErr = e;
      // Try next base
      continue;
    }
  }
  throw lastErr || new Error("All API base URLs failed");
}

// Get current username from localStorage
function getCurrentUsername() {
  try {
    const user = localStorage.getItem("schedease_current_user");
    if (!user) return null;
    // Try to parse as JSON first, if it fails, it's a plain string
    try {
      const parsed = JSON.parse(user);
      return parsed.username || parsed;
    } catch {
      // It's already a plain string username
      return user;
    }
  } catch {
    return null;
  }
}

// Load schedules from API for current user
async function loadSchedulesFromAPI() {
  try {
    const username = getCurrentUsername();
    if (!username) {
      console.warn("No username found, cannot load schedules");
      return [];
    }

    const schedules = await apiFetch(`/schedules/${encodeURIComponent(username)}`, { method: "GET" });
    
    // Validate data integrity
    if (!Array.isArray(schedules)) {
      logSecurityEvent('INVALID_SCHEDULES_DATA', { reason: 'Not an array' });
      return [];
    }
    
    return schedules;
  } catch (error) {
    console.error("Failed to load schedules from API:", error);
    logSecurityEvent('SCHEDULES_LOAD_ERROR', { error: error.message });
    return [];
  }
}

// Save schedules to API for current user
async function saveSchedulesToAPI(schedules) {
  try {
    const username = getCurrentUsername();
    if (!username) {
      throw new Error('No username found');
    }

    // Validate data before saving
    if (!Array.isArray(schedules)) {
      throw new Error('Schedules must be an array');
    }
    
    // Sanitize data
    const sanitized = sanitizeObject(schedules);
    
    // Check size limits
    validateDataSize(sanitized);
    
    await apiFetch(`/schedules/save`, {
      method: "POST",
      body: { username, schedules: sanitized },
    });
  } catch (error) {
    console.error("Failed to save schedules to API:", error);
    logSecurityEvent('SCHEDULES_SAVE_ERROR', { error: error.message });
  }
}


export default function useSchedules(initial = []) {
  const [schedules, setSchedules] = useState(initial);
  const [isLoaded, setIsLoaded] = useState(false);

  // Helper to reload schedules from API
  const reloadSchedules = useCallback(() => {
    return loadSchedulesFromAPI().then((loadedSchedules) => {
      if (Array.isArray(loadedSchedules)) {
        setSchedules(loadedSchedules);
      }
      setIsLoaded(true);
    });
  }, []);

  // Load schedules from API on mount
  useEffect(() => {
    reloadSchedules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  
  const saveSchedule = useCallback((newSchedule) => {
    if (!newSchedule) return;

    try {
      // Validate schedule structure
      if (newSchedule.schedule_id || newSchedule.sections) {
        // Only validate if it looks like a full schedule
        try {
          validateSchedule(newSchedule);
        } catch (e) {
          console.warn('Schedule validation warning:', e.message);
          // Log but don't block
          logSecurityEvent('SCHEDULE_VALIDATION_WARNING', { error: e.message });
        }
      }

      // Sanitize the schedule data
      const sanitized = sanitizeObject(newSchedule);
      if (!sanitized.schedule_id) sanitized.schedule_id = nextId("schedule");

      // Update local state immediately for responsive UI and compute next list
      let nextList = [];
      setSchedules((prev) => {
        const exists = prev.find((s) => s.schedule_id === sanitized.schedule_id);
        nextList = exists
          ? prev.map((s) => (s.schedule_id === sanitized.schedule_id ? sanitized : s))
          : [sanitized, ...prev];
        return nextList;
      });

      // Persist immediately so other pages see the update on reload
      // Then broadcast the update event after persistence completes
      Promise.resolve(saveSchedulesToAPI(nextList))
        .catch((err) => {
          console.error('Immediate save to API failed:', err);
          logSecurityEvent('SCHEDULES_SAVE_ERROR_IMMEDIATE', { error: err?.message });
        })
        .finally(() => {
          window.dispatchEvent(new CustomEvent('schedulesUpdated'));
        });
    } catch (error) {
      console.error('Failed to save schedule:', error);
      logSecurityEvent('SCHEDULE_SAVE_FAILED', { error: error.message });
      throw error;
    }
  }, []);

  const deleteSchedule = useCallback((id) => {
    let nextList = [];
    setSchedules((prev) => {
      nextList = prev.filter((s) => s.schedule_id !== id);
      return nextList;
    });
    // Persist deletion immediately and then notify others
    Promise.resolve(saveSchedulesToAPI(nextList))
      .catch((err) => {
        console.error('Immediate delete save to API failed:', err);
        logSecurityEvent('SCHEDULES_DELETE_SAVE_ERROR_IMMEDIATE', { error: err?.message });
      })
      .finally(() => {
        window.dispatchEvent(new CustomEvent('schedulesUpdated'));
      });
  }, []);

  const removeSubjectFromSchedules = useCallback((subjectId) => {
    setSchedules((prev) =>
      prev.map((s) => ({ ...s, subjects: (s.subjects || []).filter((x) => x !== subjectId) }))
    );
  }, []);

  return { schedules, saveSchedule, deleteSchedule, removeSubjectFromSchedules, setSchedules, reloadSchedules };
}
