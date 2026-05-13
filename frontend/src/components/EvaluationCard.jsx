// components/EvaluationCard.jsx — Inline evaluation display in interview sidebar

import React from 'react';

const SCORE_CONFIG = {
  5: { color: 'var(--accent-primary)', label: 'Excellent', emoji: '🌟' },
  4: { color: 'var(--accent-success)', label: 'Good', emoji: '✅' },
  3: { color: '#3b82f6', label: 'Fair', emoji: '👍' },
  2: { color: 'var(--accent-warning)', label: 'Needs Work', emoji: '⚠️' },
  1: { color: 'var(--accent-danger)', label: 'Poor', emoji: '❌' },
};

export default function EvaluationCard({ evaluation }) {
  if (!evaluation) return null;
  const cfg = SCORE_CONFIG[evaluation.score] || SCORE_CONFIG[3];

  return (
    <div className="card eval-card animate-fade-in">
      <div className="text-xs text-secondary mb-3" style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        Last Answer
      </div>

      {/* Score */}
      <div className="flex items-center gap-2 mb-3">
        <span style={{ fontSize: '1.5rem' }}>{cfg.emoji}</span>
        <div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: cfg.color, fontFamily: 'var(--font-display)' }}>
            {evaluation.score}/5
          </div>
          <div className="text-xs" style={{ color: cfg.color }}>{cfg.label}</div>
        </div>
      </div>

      {/* Stars */}
      <div className="score-stars mb-3">
        {[1, 2, 3, 4, 5].map(n => (
          <span key={n} style={{ fontSize: '1.1rem', filter: n <= evaluation.score ? 'none' : 'grayscale(1) opacity(0.3)' }}>
            ⭐
          </span>
        ))}
      </div>

      {/* Strength */}
      {evaluation.strengths?.[0] && (
        <div style={{
          padding: '8px 10px', background: 'rgba(16,185,129,0.06)',
          borderRadius: 'var(--radius-sm)', borderLeft: '2px solid var(--accent-success)',
          fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 8
        }}>
          <strong style={{ color: 'var(--accent-success)' }}>✓ </strong>
          {evaluation.strengths[0]}
        </div>
      )}

      {/* Improvement */}
      {evaluation.improvements?.[0] && (
        <div style={{
          padding: '8px 10px', background: 'rgba(0,212,255,0.05)',
          borderRadius: 'var(--radius-sm)', borderLeft: '2px solid var(--accent-primary)',
          fontSize: '0.8rem', color: 'var(--text-secondary)'
        }}>
          <strong style={{ color: 'var(--accent-primary)' }}>💡 </strong>
          {evaluation.improvements[0]}
        </div>
      )}
    </div>
  );
}
