import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Custom hook for persisting state to localStorage
 * @param {string} key - The localStorage key
 * @param {any} initialValue - The initial value if no stored value exists
 * @returns {[any, function]} - Current value and setter function
 */
export function useLocalStorage(key, initialValue) {
  // Get stored value or use initial value
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (!item) return initialValue;

      const parsed = JSON.parse(item);

      // Basic validation for common data types
      if (initialValue === null && parsed !== null) return initialValue;
      if (Array.isArray(initialValue) && !Array.isArray(parsed))
        return initialValue;
      if (
        typeof initialValue === "object" &&
        !Array.isArray(initialValue) &&
        (typeof parsed !== "object" || Array.isArray(parsed))
      )
        return initialValue;

      return parsed;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = useCallback(
    (value) => {
      try {
        // Allow value to be a function so we have the same API as useState
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  // Listen for changes to localStorage from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(JSON.parse(e.newValue));
        } catch (error) {
          console.error(
            `Error parsing localStorage value for key "${key}":`,
            error
          );
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [key]);

  return [storedValue, setValue];
}

/**
 * Hook to clear all stored data
 */
export function useClearStorage() {
  return useCallback(() => {
    try {
      // Clear all keys that start with our app prefix
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("fragment_")) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
      console.log("Cleared all fragment storage");
    } catch (error) {
      console.error("Error clearing storage:", error);
    }
  }, []);
}

/**
 * Custom hook for nodes with localStorage persistence
 * Handles the complex node state management for React Flow
 */
export function useNodesWithStorage(key, initialValue) {
  const [nodes, setNodes] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (!item) return initialValue;

      const parsed = JSON.parse(item);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
      return initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  const setNodesWithStorage = useCallback(
    (value) => {
      try {
        const valueToStore =
          value instanceof Function ? value(nodesRef.current) : value;
        setNodes(valueToStore);
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key]
  );

  return [nodes, setNodesWithStorage];
}
