import { useState, useCallback, useEffect } from "react";
import { nextId } from "../utils/ids";

const API_BASE_URL = "http://localhost:4000/api";

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

// Load subjects from API for current user
async function loadSubjectsFromAPI() {
  try {
    const username = getCurrentUsername();
    if (!username) {
      console.warn("No username found, cannot load subjects");
      return [];
    }

    const res = await fetch(`${API_BASE_URL}/subjects/${username}`);
    if (!res.ok) {
      if (res.status === 404) return []; // No subjects yet
      throw new Error(`Failed to load subjects: ${res.status}`);
    }
    
    return await res.json();
  } catch (error) {
    console.error("Failed to load subjects from API:", error);
    return [];
  }
}

// Save subjects to API for current user
async function saveSubjectsToAPI(subjects) {
  try {
    const username = getCurrentUsername();
    if (!username) {
      throw new Error('No username found');
    }

    const res = await fetch(`${API_BASE_URL}/subjects/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        subjects,
      }),
    });

    if (!res.ok) {
      throw new Error(`Failed to save subjects: ${res.status}`);
    }
  } catch (error) {
    console.error("Failed to save subjects to API:", error);
  }
}

export default function useSubjects(initial = []) {
  const [subjects, setSubjects] = useState(initial);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load subjects from API on mount
  useEffect(() => {
    loadSubjectsFromAPI().then((loadedSubjects) => {
      if (loadedSubjects.length > 0) {
        setSubjects(loadedSubjects);
      }
      setIsLoaded(true);
    });
  }, []);

  // Persist subjects to API whenever they change (but only after initial load)
  useEffect(() => {
    if (isLoaded) {
      saveSubjectsToAPI(subjects);
    }
  }, [subjects, isLoaded]);

  const addMany = useCallback((parsedArray = []) => {
    setSubjects((prev) => {
      const existing = new Set(prev.map((d) => String(d.data_id)));
      const mapped = parsedArray.map((p) => {
        let id = String(p.data_id || "");
        if (!id || existing.has(id)) {
          do {
            id = nextId("data");
          } while (existing.has(id));
        }
        existing.add(id);
        return { ...p, data_id: id };
      });
      return prev.concat(mapped);
    });
  }, []);

  const save = useCallback((item, skipValidation = false) => {
    if (!item) return { success: false, error: "No item provided" };
    if (!item.data_id) item.data_id = nextId("data");
    
    let result = { success: true };
    
    setSubjects((prev) => {
      // Check for duplicate title (case-insensitive) unless validation is skipped
      if (!skipValidation) {
        const trimmedTitle = (item.subject_title || "").trim().toLowerCase();
        if (trimmedTitle) {
          const isDuplicate = prev.some((p) => {
            const existingTitle = (p.subject_title || "").trim().toLowerCase();
            const isSameId = String(p.data_id) === String(item.data_id);
            return existingTitle === trimmedTitle && !isSameId;
          });
          
          if (isDuplicate) {
            result = { success: false, error: "A subject with this title already exists" };
            return prev; // Don't modify if duplicate found
          }
        }
      }
      
      let found = false;
      const next = prev.map((p) => {
        if (String(p.data_id) === String(item.data_id)) {
          found = true;
          return item;
        }
        return p;
      });
      if (!found) next.unshift(item);
      return next;
    });
    
    return result;
  }, []);

  const remove = useCallback((id) => {
    setSubjects((prev) => prev.filter((p) => String(p.data_id) !== String(id)));
  }, []);

  return { subjects, addMany, save, remove, setSubjects };
}
