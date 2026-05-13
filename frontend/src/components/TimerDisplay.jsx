// components/TimerDisplay.jsx — Countdown timer visual

import React from 'react';

export default function TimerDisplay({ timeLeft, formatted }) {
  if (timeLeft === null) return null;

  const isCritical = timeLeft < 60;
  const isWarning = timeLeft < 180 && !isCritical;

  const color = isCritical ? 'var(--accent-danger)'
    : isWarning ? 'var(--accent-warning)'
    : 'var(--accent-primary)';

  const percentage = timeLeft !== null ? Math.max(0, timeLeft) : 100;

  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <div className="text-xs text-secondary mb-2" style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        Time Remaining
      </div>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '2.25rem',
        fontWeight: 700,
        color,
        letterSpacing: '0.05em',
        animation: isCritical ? 'pulse 1s ease-in-out infinite' : 'none'
      }}>
        {formatted}
      </div>
      <div className="progress-bar mt-2" style={{ height: 4 }}>
        <div className="progress-fill" style={{
          width: '100%',
          background: isCritical ? 'var(--accent-danger)' : isWarning ? 'var(--accent-warning)' : 'var(--gradient-primary)'
        }} />
      </div>
      {isCritical && (
        <div className="text-xs text-danger mt-2 animate-pulse">⚠️ Less than 1 minute!</div>
      )}
    </div>
  );
}
