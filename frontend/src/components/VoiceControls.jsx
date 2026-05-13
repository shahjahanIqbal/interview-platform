// components/VoiceControls.jsx — Voice interview controls
// States: idle → recording → paused → (resume or stop+submit)

import React from 'react';

const BTN = ({ onClick, disabled, color, children, title, pulse = false }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      padding: '12px 20px', borderRadius: 40, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
      fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '0.9rem',
      opacity: disabled ? 0.45 : 1,
      transition: 'all 0.2s ease',
      animation: pulse ? 'glow 1.5s ease-in-out infinite' : 'none',
      ...color,
    }}
  >
    {children}
  </button>
);

export default function VoiceControls({
  voice,          // useVoice() return value
  onSubmitText,   // called with final string when user hits Stop
  onClear,        // clears accumulated transcript
  disabled,       // e.g. while AI is loading
  suppressTab,    // fn(ms) — suppresses tab-detection during mic popup
}) {
  const { voiceState, isRecording, isPaused, isRequesting, isSpeaking, liveTranscript, isSupported } = voice;

  const hasText = liveTranscript?.trim().length > 0;

  // Mic button clicked — suppress tab detection BEFORE asking for permission
  const handleStartRecording = () => {
    if (suppressTab) suppressTab(5000); // 5 s window covers the browser dialog
    voice.startRecording();
  };

  const handleStopAndSubmit = () => {
    // stopRecording commits the transcript internally; we also call onSubmitText
    const text = voice.liveTranscript?.trim();
    voice.stopRecording();
    if (text && onSubmitText) onSubmitText(text);
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* ── Live transcript display ── */}
      <div style={{
        padding: '14px 18px',
        background: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-md)',
        border: `1px solid ${
          isRecording ? 'var(--accent-danger)'
          : isPaused  ? 'var(--accent-warning)'
          : 'var(--border-secondary)'
        }`,
        minHeight: 72,
        fontSize: '0.95rem',
        lineHeight: 1.6,
        color: hasText ? 'var(--text-primary)' : 'var(--text-muted)',
        transition: 'border-color 0.2s',
        boxShadow: isRecording ? '0 0 0 3px rgba(239,68,68,0.1)' : 'none',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {isRequesting ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--accent-warning)' }}>
            <span style={{ fontSize: '1.1rem' }}>🎤</span>
            Waiting for microphone permission…
          </span>
        ) : isRecording ? (
          <span style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span className="animate-pulse" style={{ color: 'var(--accent-danger)', fontSize: '0.75rem', marginTop: 5, flexShrink: 0 }}>●REC</span>
            <span>{liveTranscript || <em style={{ color: 'var(--text-muted)' }}>Listening — speak now…</em>}</span>
          </span>
        ) : isPaused ? (
          <span style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span style={{ color: 'var(--accent-warning)', fontSize: '0.75rem', marginTop: 5, flexShrink: 0 }}>⏸ PAUSED</span>
            <span>{liveTranscript || <em style={{ color: 'var(--text-muted)' }}>No speech captured yet</em>}</span>
          </span>
        ) : (
          liveTranscript || <span>Click <strong>Record</strong> and speak your answer. Pause anytime, then Stop to submit.</span>
        )}
      </div>

      {/* ── Control buttons ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>

        {/* IDLE → Record */}
        {!isRecording && !isPaused && (
          <BTN
            onClick={handleStartRecording}
            disabled={disabled || isSpeaking || !isSupported}
            title="Start recording"
            color={{ background: 'rgba(239,68,68,0.15)', color: 'var(--accent-danger)', border: '2px solid rgba(239,68,68,0.4)' }}
          >
            🎙️ Record
          </BTN>
        )}

        {/* RECORDING → Pause */}
        {isRecording && (
          <BTN
            onClick={voice.pauseRecording}
            disabled={disabled}
            title="Pause recording"
            pulse
            color={{ background: 'rgba(239,68,68,0.15)', color: 'var(--accent-danger)', border: '2px solid rgba(239,68,68,0.5)' }}
          >
            ⏸ Pause
          </BTN>
        )}

        {/* PAUSED → Resume */}
        {isPaused && (
          <BTN
            onClick={voice.resumeRecording}
            disabled={disabled}
            title="Resume recording"
            color={{ background: 'rgba(245,158,11,0.15)', color: 'var(--accent-warning)', border: '2px solid rgba(245,158,11,0.4)' }}
          >
            ▶ Resume
          </BTN>
        )}

        {/* RECORDING or PAUSED → Stop & Submit */}
        {(isRecording || isPaused) && (
          <BTN
            onClick={handleStopAndSubmit}
            disabled={disabled || !hasText}
            title="Stop recording and submit answer"
            color={{ background: 'var(--gradient-primary)', color: 'white', border: 'none', boxShadow: '0 4px 14px rgba(0,212,255,0.25)' }}
          >
            ⏹ Stop &amp; Submit
          </BTN>
        )}

        {/* IDLE + has text → Submit existing transcript */}
        {!isRecording && !isPaused && hasText && (
          <BTN
            onClick={() => onSubmitText && onSubmitText(liveTranscript.trim())}
            disabled={disabled}
            title="Submit this answer"
            color={{ background: 'var(--gradient-primary)', color: 'white', border: 'none', boxShadow: '0 4px 14px rgba(0,212,255,0.25)' }}
          >
            Submit Answer →
          </BTN>
        )}

        {/* Stop speaking AI */}
        {isSpeaking && (
          <BTN
            onClick={voice.stopSpeaking}
            title="Stop AI speaking"
            color={{ background: 'rgba(124,58,237,0.15)', color: '#a78bfa', border: '2px solid rgba(124,58,237,0.3)' }}
          >
            🔇 Stop AI
          </BTN>
        )}

        {/* Clear */}
        {hasText && !isRecording && (
          <BTN
            onClick={() => { voice.clearTranscript(); if (onClear) onClear(); }}
            disabled={disabled}
            title="Clear transcript"
            color={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-secondary)' }}
          >
            ✕ Clear
          </BTN>
        )}
      </div>

      {/* ── Status line ── */}
      <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', minHeight: 18 }}>
        {isRequesting && '⏳ Waiting for microphone permission…'}
        {isRecording  && '🔴 Recording — speak freely, then Pause or Stop & Submit'}
        {isPaused     && '⏸ Paused — Resume to keep recording, or Stop & Submit'}
        {isSpeaking   && <span className="animate-pulse">🔊 AI is speaking…</span>}
        {voice.error === 'mic_denied' && (
          <span style={{ color: 'var(--accent-danger)' }}>
            ❌ Microphone access denied. Please allow it in your browser settings and refresh.
          </span>
        )}
        {voice.error && voice.error !== 'mic_denied' && (
          <span style={{ color: 'var(--accent-warning)' }}>⚠️ Voice error: {voice.error}</span>
        )}
        {!isSupported && (
          <span style={{ color: 'var(--accent-danger)' }}>
            ⚠️ Web Speech API not supported — please use Google Chrome.
          </span>
        )}
      </div>
    </div>
  );
}
