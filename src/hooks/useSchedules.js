import { useState, useCallback, useEffect } from "react";
import { nextId } from "../utils/ids";
import { userKey } from "../utils/storage";
import { validateSchedule, validateDataSize, sanitizeObject, logSecurityEvent } from "../utils/validation";

const SCHEDULES_STORAGE_BASE = "schedease_schedules";

// Load schedules from localStorage for current user
function loadSchedulesFromStorage() {
  try {
    const key = userKey(SCHEDULES_STORAGE_BASE);
    const stored = localStorage.getItem(key);
    if (stored) {
      const schedules = JSON.parse(stored);
      
      // Validate data integrity
      if (!Array.isArray(schedules)) {
        logSecurityEvent('INVALID_SCHEDULES_DATA', { reason: 'Not an array' });
        return [];
      }
      
      return schedules;
    }
  } catch (error) {
    console.error("Failed to load schedules from localStorage:", error);
    logSecurityEvent('SCHEDULES_LOAD_ERROR', { error: error.message });
  }
  return [];
}

// Save schedules to localStorage for current user
function saveSchedulesToStorage(schedules) {
  try {
    // Validate data before saving
    if (!Array.isArray(schedules)) {
      throw new Error('Schedules must be an array');
    }
    
    // Sanitize data
    const sanitized = sanitizeObject(schedules);
    
    // Check size limits
    validateDataSize(sanitized);
    
    const key = userKey(SCHEDULES_STORAGE_BASE);
    localStorage.setItem(key, JSON.stringify(sanitized));
  } catch (error) {
    console.error("Failed to save schedules to localStorage:", error);
    logSecurityEvent('SCHEDULES_SAVE_ERROR', { error: error.message });
  }
}

export default function useSchedules(initial = []) {
  const [schedules, setSchedules] = useState(() => {
    // Initialize from localStorage on first render
    const stored = loadSchedulesFromStorage();
    return stored.length > 0 ? stored : initial;
  });

  // Persist schedules to localStorage whenever they change
  useEffect(() => {
    saveSchedulesToStorage(schedules);
  }, [schedules]);

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
      
      setSchedules((prev) => {
        const exists = prev.find((s) => s.schedule_id === sanitized.schedule_id);
        if (exists) return prev.map((s) => (s.schedule_id === sanitized.schedule_id ? sanitized : s));
        return [sanitized, ...prev];
      });
    } catch (error) {
      console.error('Failed to save schedule:', error);
      logSecurityEvent('SCHEDULE_SAVE_FAILED', { error: error.message });
      throw error;
    }
  }, []);

  const deleteSchedule = useCallback((id) => {
    setSchedules((prev) => prev.filter((s) => s.schedule_id !== id));
  }, []);

  const removeSubjectFromSchedules = useCallback((subjectId) => {
    setSchedules((prev) =>
      prev.map((s) => ({ ...s, subjects: (s.subjects || []).filter((x) => x !== subjectId) }))
    );
  }, []);

  return { schedules, saveSchedule, deleteSchedule, removeSubjectFromSchedules, setSchedules };
}
