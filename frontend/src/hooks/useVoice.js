// hooks/useVoice.js - Web Speech API integration
// Supports: continuous recording, pause/resume, stop-and-commit transcript

import { useState, useRef, useCallback, useEffect } from 'react';

// Recording states
export const VOICE_STATE = {
  IDLE: 'idle',           // Not recording
  REQUESTING: 'requesting', // Waiting for mic permission
  RECORDING: 'recording', // Actively capturing
  PAUSED: 'paused',       // Paused (mic held, not listening)
};

export function useVoice({ onSubmit } = {}) {
  const [voiceState, setVoiceState] = useState(VOICE_STATE.IDLE);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');   // interim text during recording
  const [finalTranscript, setFinalTranscript] = useState(''); // committed text across pauses
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(false);

  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const accumulatedRef = useRef(''); // holds all final text across pause/resume cycles
  const stoppedIntentionallyRef = useRef(false); // true when user clicked Stop
  const pausedRef = useRef(false);               // true when paused (suppress auto-restart)

  // Build + configure a fresh SpeechRecognition instance
  const buildRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const r = new SpeechRecognition();
    r.continuous = true;       // keep listening until explicitly stopped
    r.interimResults = true;   // show words as they're spoken
    r.lang = 'en-US';
    r.maxAlternatives = 1;

    r.onresult = (event) => {
      let interim = '';
      let newFinal = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) newFinal += text;
        else interim += text;
      }

      if (newFinal) {
        accumulatedRef.current += (accumulatedRef.current ? ' ' : '') + newFinal.trim();
      }

      // Show accumulated + whatever is still in-progress
      const display = accumulatedRef.current
        + (interim ? (accumulatedRef.current ? ' ' : '') + interim : '');
      setLiveTranscript(display);
      setFinalTranscript(accumulatedRef.current);
    };

    // Chrome stops recognition after ~60 s of silence or sometimes spontaneously.
    // Auto-restart unless the user intentionally paused/stopped.
    r.onend = () => {
      if (!stoppedIntentionallyRef.current && !pausedRef.current) {
        try { r.start(); } catch {}
      } else if (stoppedIntentionallyRef.current) {
        setVoiceState(VOICE_STATE.IDLE);
      }
    };

    r.onerror = (event) => {
      // 'no-speech' is normal (silence); just let onend handle the restart
      if (event.error === 'no-speech') return;
      // 'aborted' fires when we call stop() ourselves
      if (event.error === 'aborted') return;
      setError(event.error);
      setVoiceState(VOICE_STATE.IDLE);
    };

    return r;
  }, []);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!(SpeechRecognition && window.speechSynthesis));

    return () => {
      if (recognitionRef.current) {
        stoppedIntentionallyRef.current = true;
        try { recognitionRef.current.abort(); } catch {}
      }
      synthRef.current?.cancel();
    };
  }, []);

  // Request mic permission explicitly BEFORE starting — so the browser popup
  // fires NOW, not on first speech recognition start.  The caller should set
  // suppressViolations=true while this promise is pending.
  const requestPermission = useCallback(async () => {
    if (permissionGranted) return true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Immediately release — we only needed the permission grant
      stream.getTracks().forEach(t => t.stop());
      setPermissionGranted(true);
      setError(null);
      return true;
    } catch (err) {
      setError('mic_denied');
      return false;
    }
  }, [permissionGranted]);

  // ── START recording ───────────────────────────────────────────────────────
  const startRecording = useCallback(async (suppressViolationsDuring) => {
    if (voiceState === VOICE_STATE.RECORDING) return;
    setError(null);

    // If we don't have permission yet, request it first.
    // suppressViolationsDuring() lets the caller mute tab-detection during popup.
    if (!permissionGranted) {
      setVoiceState(VOICE_STATE.REQUESTING);
      if (suppressViolationsDuring) suppressViolationsDuring(true);
      const granted = await requestPermission();
      if (suppressViolationsDuring) suppressViolationsDuring(false);
      if (!granted) { setVoiceState(VOICE_STATE.IDLE); return; }
    }

    // Fresh session → clear everything
    accumulatedRef.current = '';
    stoppedIntentionallyRef.current = false;
    pausedRef.current = false;
    setLiveTranscript('');
    setFinalTranscript('');

    const recognition = buildRecognition();
    if (!recognition) return;
    recognitionRef.current = recognition;

    try {
      recognition.start();
      setVoiceState(VOICE_STATE.RECORDING);
    } catch (err) {
      setError(err.message);
      setVoiceState(VOICE_STATE.IDLE);
    }
  }, [voiceState, permissionGranted, requestPermission, buildRecognition]);

  // ── PAUSE recording ───────────────────────────────────────────────────────
  const pauseRecording = useCallback(() => {
    if (voiceState !== VOICE_STATE.RECORDING) return;
    pausedRef.current = true;
    stoppedIntentionallyRef.current = false;
    try { recognitionRef.current?.stop(); } catch {}
    setVoiceState(VOICE_STATE.PAUSED);
  }, [voiceState]);

  // ── RESUME recording ──────────────────────────────────────────────────────
  const resumeRecording = useCallback(() => {
    if (voiceState !== VOICE_STATE.PAUSED) return;
    pausedRef.current = false;
    stoppedIntentionallyRef.current = false;

    const recognition = buildRecognition();
    if (!recognition) return;
    recognitionRef.current = recognition;

    try {
      recognition.start();
      setVoiceState(VOICE_STATE.RECORDING);
    } catch (err) {
      setError(err.message);
    }
  }, [voiceState, buildRecognition]);

  // ── STOP recording → commit transcript ───────────────────────────────────
  const stopRecording = useCallback(() => {
    if (voiceState === VOICE_STATE.IDLE) return;
    stoppedIntentionallyRef.current = true;
    pausedRef.current = false;
    try { recognitionRef.current?.stop(); } catch {}
    setVoiceState(VOICE_STATE.IDLE);

    const committed = accumulatedRef.current.trim();
    setFinalTranscript(committed);
    setLiveTranscript(committed);
    if (committed && onSubmit) onSubmit(committed);
  }, [voiceState, onSubmit]);

  // ── CLEAR transcript ──────────────────────────────────────────────────────
  const clearTranscript = useCallback(() => {
    accumulatedRef.current = '';
    setLiveTranscript('');
    setFinalTranscript('');
  }, []);

  // ── TTS speak ─────────────────────────────────────────────────────────────
  const speak = useCallback((text, options = {}) => {
    if (!synthRef.current || !text) return Promise.resolve();
    return new Promise((resolve) => {
      synthRef.current.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = options.rate || 0.95;
      utterance.pitch = options.pitch || 1.0;
      utterance.volume = options.volume || 1.0;
      utterance.lang = 'en-US';

      const voices = synthRef.current.getVoices();
      const preferred = voices.find(v =>
        v.name.includes('Google') || v.name.includes('Premium') || v.name.includes('Enhanced')
      ) || voices.find(v => v.lang === 'en-US') || voices[0];
      if (preferred) utterance.voice = preferred;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend   = () => { setIsSpeaking(false); resolve(); };
      utterance.onerror = () => { setIsSpeaking(false); resolve(); };
      synthRef.current.speak(utterance);
    });
  }, []);

  const stopSpeaking = useCallback(() => {
    synthRef.current?.cancel();
    setIsSpeaking(false);
  }, []);

  return {
    // State
    voiceState,
    isRecording:  voiceState === VOICE_STATE.RECORDING,
    isPaused:     voiceState === VOICE_STATE.PAUSED,
    isRequesting: voiceState === VOICE_STATE.REQUESTING,
    isSpeaking,
    isSupported,
    permissionGranted,
    error,

    // Transcript
    liveTranscript,
    finalTranscript,
    clearTranscript,

    // Controls
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    speak,
    stopSpeaking,

    // Legacy compat (InterviewPage uses these)
    isListening: voiceState === VOICE_STATE.RECORDING,
    transcript: liveTranscript,
    setTranscript: setLiveTranscript,
    startListening: startRecording,
    stopListening: pauseRecording,
  };
}

export default useVoice;
