import { useState, useCallback, useEffect, useRef } from 'react';

export interface StatusMessage {
  message: string;
  type: 'success' | 'error' | 'sending';
  visible: boolean;
}

interface UseStatusMessageOptions {
  /** Duration to show message before fading (ms). Default: 2000 */
  duration?: number;
  /** Duration of fade transition (ms). Default: 500 */
  fadeDuration?: number;
}

/**
 * Hook for managing status messages with automatic fade-out and cleanup.
 * Properly cleans up timeouts on unmount or when new messages arrive.
 */
export function useStatusMessage(options: UseStatusMessageOptions = {}) {
  const { duration = 2000, fadeDuration = 500 } = options;

  const [status, setStatus] = useState<StatusMessage | null>(null);
  const fadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup function to clear all pending timeouts
  const clearTimeouts = useCallback(() => {
    if (fadeTimeoutRef.current !== null) {
      clearTimeout(fadeTimeoutRef.current);
      fadeTimeoutRef.current = null;
    }
    if (clearTimeoutRef.current !== null) {
      clearTimeout(clearTimeoutRef.current);
      clearTimeoutRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeouts();
    };
  }, [clearTimeouts]);

  /**
   * Show a status message that will automatically fade out
   */
  const showStatus = useCallback(
    (message: string, type: 'success' | 'error' | 'sending') => {
      // Clear any existing timeouts
      clearTimeouts();

      // Show the message
      setStatus({ message, type, visible: true });

      // For 'sending' type, don't auto-hide (caller will update when complete)
      if (type === 'sending') {
        return;
      }

      // Start fade after duration
      fadeTimeoutRef.current = setTimeout(() => {
        setStatus((prev) => (prev ? { ...prev, visible: false } : null));

        // Remove after fade completes
        clearTimeoutRef.current = setTimeout(() => {
          setStatus(null);
        }, fadeDuration);
      }, duration);
    },
    [duration, fadeDuration, clearTimeouts]
  );

  /**
   * Clear the status immediately
   */
  const clearStatus = useCallback(() => {
    clearTimeouts();
    setStatus(null);
  }, [clearTimeouts]);

  /**
   * Update an existing status (useful for transitioning from 'sending' to 'success'/'error')
   */
  const updateStatus = useCallback(
    (message: string, type: 'success' | 'error') => {
      // Clear any existing timeouts
      clearTimeouts();

      // Update the message
      setStatus({ message, type, visible: true });

      // Start fade after duration
      fadeTimeoutRef.current = setTimeout(() => {
        setStatus((prev) => (prev ? { ...prev, visible: false } : null));

        // Remove after fade completes
        clearTimeoutRef.current = setTimeout(() => {
          setStatus(null);
        }, fadeDuration);
      }, duration);
    },
    [duration, fadeDuration, clearTimeouts]
  );

  return {
    status,
    showStatus,
    updateStatus,
    clearStatus,
  };
}
