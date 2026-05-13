// hooks/useTabDetection.js - Detect tab/window switching during interview
// Supports suppression window so mic-permission popups don't count as violations.

import { useState, useEffect, useRef, useCallback } from 'react';

export function useTabDetection({ enabled = true, onViolation } = {}) {
  const [violations, setViolations] = useState([]);
  const [isWarning, setIsWarning] = useState(false);
  const [lastViolation, setLastViolation] = useState(null);
  const countRef = useRef(0);

  // When true, ALL blur/visibility events are silently ignored.
  // Call suppressFor(ms) before triggering anything that steals focus
  // (mic permission popup, file dialog, etc.)
  const suppressedRef = useRef(false);
  const suppressTimerRef = useRef(null);

  // Suppress violations for `ms` milliseconds (default 4 s – enough for any
  // browser permission dialog to appear and disappear)
  const suppressFor = useCallback((ms = 4000) => {
    suppressedRef.current = true;
    if (suppressTimerRef.current) clearTimeout(suppressTimerRef.current);
    suppressTimerRef.current = setTimeout(() => {
      suppressedRef.current = false;
    }, ms);
  }, []);

  // Immediately lift suppression (call after permission is granted/denied)
  const liftSuppression = useCallback(() => {
    if (suppressTimerRef.current) clearTimeout(suppressTimerRef.current);
    // Small grace period so the browser's focus-return event fires first
    suppressTimerRef.current = setTimeout(() => {
      suppressedRef.current = false;
    }, 800);
  }, []);

  const recordViolation = useCallback((type) => {
    if (!enabled || suppressedRef.current) return;

    countRef.current += 1;
    const violation = {
      id: countRef.current,
      type,
      timestamp: new Date().toISOString(),
      time: new Date().toLocaleTimeString()
    };

    setViolations(prev => [...prev, violation]);
    setLastViolation(violation);
    setIsWarning(true);

    if (onViolation) onViolation(violation, countRef.current);

    setTimeout(() => setIsWarning(false), 5000);
  }, [enabled, onViolation]);

  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.hidden) recordViolation('tab_switch');
    };

    const handleWindowBlur = () => {
      if (!document.hidden) recordViolation('window_blur');
    };

    const handleCopy    = () => recordViolation('copy_detected');
    const handlePaste   = () => recordViolation('paste_detected');

    const handleContextMenu = (e) => {
      e.preventDefault();
      recordViolation('right_click');
    };

    const handleKeyDown = (e) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
        (e.ctrlKey && e.key === 'U')
      ) {
        e.preventDefault();
        recordViolation('devtools_attempt');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      if (suppressTimerRef.current) clearTimeout(suppressTimerRef.current);
    };
  }, [enabled, recordViolation]);

  const dismissWarning  = useCallback(() => setIsWarning(false), []);
  const clearViolations = useCallback(() => {
    setViolations([]);
    countRef.current = 0;
  }, []);

  return {
    violations,
    violationCount: countRef.current,
    isWarning,
    lastViolation,
    dismissWarning,
    clearViolations,
    suppressFor,
    liftSuppression,
  };
}

export default useTabDetection;
