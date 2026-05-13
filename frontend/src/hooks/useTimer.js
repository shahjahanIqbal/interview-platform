// hooks/useTimer.js — Countdown timer hook

import { useState, useEffect, useRef, useCallback } from 'react';

export function useTimer({ initialSeconds = null, onExpire, autoStart = true } = {}) {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(autoStart && initialSeconds !== null);
  const intervalRef = useRef(null);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  const clear = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    if (!isRunning || timeLeft === null) return;
    intervalRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clear();
          setIsRunning(false);
          if (onExpireRef.current) onExpireRef.current();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return clear;
  }, [isRunning]);

  const start = useCallback(() => setIsRunning(true), []);
  const pause = useCallback(() => { clear(); setIsRunning(false); }, []);
  const reset = useCallback((s) => {
    clear();
    setTimeLeft(s ?? initialSeconds);
    setIsRunning(false);
  }, [initialSeconds]);

  const format = (s) => {
    if (s === null) return '∞';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  return {
    timeLeft,
    isRunning,
    formatted: format(timeLeft),
    isWarning: timeLeft !== null && timeLeft < 180,
    isCritical: timeLeft !== null && timeLeft < 60,
    isExpired: timeLeft === 0,
    start,
    pause,
    reset,
  };
}

export default useTimer;
