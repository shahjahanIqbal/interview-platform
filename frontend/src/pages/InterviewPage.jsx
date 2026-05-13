// pages/InterviewPage.jsx - Main interview screen

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import useVoice from '../hooks/useVoice';
import useTabDetection from '../hooks/useTabDetection';
import VoiceControls from '../components/VoiceControls';

export default function InterviewPage() {
  const { sessionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const config = JSON.parse(sessionStorage.getItem('interviewConfig') || '{}');
  const { mode = 'text', role = '', difficulty = 'medium', trackTabs = true, totalQuestions = 5 } = config;

  const [messages, setMessages]           = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(location.state?.firstQuestion || '');
  const [textInput, setTextInput]         = useState('');
  const [isLoading, setIsLoading]         = useState(false);
  const [isComplete, setIsComplete]       = useState(false);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [timeLeft, setTimeLeft]           = useState(config.duration ? config.duration * 60 : null);
  const [lastEvaluation, setLastEvaluation] = useState(null);
  const [chatTranscript, setChatTranscript] = useState([]);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [ended, setEnded]                 = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);
  const timerRef       = useRef(null);
  const hasInitialized = useRef(false);

  // ── Tab detection (with suppression for mic popup) ────────────────────────
  const tabDetection = useTabDetection({
    enabled: trackTabs,
    onViolation: (v, count) => {
      addSystemMessage(`⚠️ Warning: ${count} tab switch(es) detected. This will be recorded in your report.`);
    }
  });

  // ── Voice hook — pass suppressFor so mic popup doesn't flag violations ────
  const voice = useVoice();

  // When voice's startRecording is triggered, suppress tab detection first
  const handleVoiceStart = useCallback(() => {
    tabDetection.suppressFor(5000); // cover the browser mic permission dialog
    voice.startRecording();
  }, [voice, tabDetection]);

  // ── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (timeLeft === null || isComplete || ended) return;
    if (timeLeft <= 0) { handleEndSession(true); return; }
    timerRef.current = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [timeLeft, isComplete, ended]);

  // ── Init: show first question ─────────────────────────────────────────────
  useEffect(() => {
    if (!hasInitialized.current && currentQuestion) {
      hasInitialized.current = true;
      addAIMessage(currentQuestion, true);
      if (mode === 'voice') {
        setTimeout(() => voice.speak(currentQuestion), 600);
      }
    }
  }, [currentQuestion]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Message helpers ───────────────────────────────────────────────────────
  const addAIMessage = (text, isQuestion = false) => {
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), role: 'ai', text, isQuestion, timestamp: new Date().toLocaleTimeString() }]);
    setChatTranscript(prev => [...prev, { role: 'interviewer', text, timestamp: Date.now() }]);
  };

  const addUserMessage = (text) => {
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), role: 'user', text, timestamp: new Date().toLocaleTimeString() }]);
    setChatTranscript(prev => [...prev, { role: 'candidate', text, timestamp: Date.now() }]);
  };

  const addSystemMessage = (text) => {
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), role: 'system', text, timestamp: new Date().toLocaleTimeString() }]);
  };

  // ── Submit answer ─────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async (answerText) => {
    const answer = (answerText || textInput).trim();
    if (!answer || isLoading || isComplete || ended) return;

    addUserMessage(answer);
    setTextInput('');
    voice.clearTranscript?.();
    setIsLoading(true);

    try {
      const result = await api.submitAnswer({ sessionId, answer, questionIndex: questionNumber });
      setLastEvaluation(result.evaluation);

      const scoreEmoji = result.evaluation.score >= 4 ? '🌟' : result.evaluation.score >= 3 ? '✅' : '⚠️';
      let feedbackMsg = `${scoreEmoji} Score: ${result.evaluation.score}/5 — ${result.evaluation.rating}`;
      if (result.evaluation.strengths?.length)    feedbackMsg += `\n\n💪 ${result.evaluation.strengths[0]}`;
      if (result.evaluation.improvements?.length) feedbackMsg += `\n💡 ${result.evaluation.improvements[0]}`;

      addAIMessage(feedbackMsg, false);
      if (mode === 'voice') {
        await voice.speak(`Score: ${result.evaluation.score} out of 5. ${result.evaluation.rating}.`);
      }

      if (result.isComplete || (!result.nextQuestion && !result.followUpQuestion)) {
        setIsComplete(true);
        addAIMessage('🎉 Interview complete! Well done. Preparing your results…', false);
        if (mode === 'voice') await voice.speak('Interview complete. Well done! Preparing your results.');
        setTimeout(() => navigateToResults(), 2500);
      } else {
        const nextQ = result.followUpQuestion || result.nextQuestion;
        setCurrentQuestion(nextQ);
        setQuestionNumber(result.questionNumber);
        setTimeout(() => {
          addAIMessage(nextQ, true);
          if (mode === 'voice') voice.speak(nextQ);
        }, 1200);
      }
    } catch (err) {
      addSystemMessage('⚠️ Error: ' + err.message + '. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [textInput, isLoading, isComplete, ended, sessionId, questionNumber, mode]);

  // ── End session ───────────────────────────────────────────────────────────
  const handleEndSession = async (timeUp = false) => {
    if (ended) return;
    setEnded(true);
    clearInterval(timerRef.current);
    try { await api.endInterview(sessionId); } catch {}
    if (timeUp) addSystemMessage("⏰ Time's up! The interview has ended.");
    navigateToResults();
  };

  const navigateToResults = () => {
    navigate(`/results/${sessionId}`, { state: { violations: tabDetection.violations } });
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const formatTime = (s) => {
    if (s === null) return '∞';
    const m = Math.floor(s / 60), sec = s % 60;
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  };

  const timerClass  = timeLeft !== null ? (timeLeft < 60 ? 'critical' : timeLeft < 180 ? 'warning' : '') : '';
  const progress    = totalQuestions > 0 ? (questionNumber / totalQuestions) * 100 : 0;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* ── Tab-switch warning banner ── */}
      {tabDetection.isWarning && (
        <div className="tab-warning">
          <div className="flex items-center gap-3">
            <span style={{ fontSize: '1.25rem' }}>⚠️</span>
            <div>
              <strong>Tab Switch Detected!</strong>
              <span style={{ marginLeft: 8, opacity: 0.9 }}>
                Violation #{tabDetection.violationCount} logged.
              </span>
            </div>
          </div>
          <button onClick={tabDetection.dismissWarning}
            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.4rem', lineHeight: 1 }}>
            ×
          </button>
        </div>
      )}

      <div className="interview-layout">

        {/* ── Main chat panel ── */}
        <div className="chat-container card" style={{ padding: '20px 24px' }}>

          {/* Header */}
          <div className="flex items-center justify-between mb-4 pb-4"
            style={{ borderBottom: '1px solid var(--border-secondary)' }}>
            <div className="flex items-center gap-3">
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'var(--gradient-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.1rem', boxShadow: 'var(--shadow-glow)'
              }}>🤖</div>
              <div>
                <div className="font-bold">AI Interviewer</div>
                <div className="text-xs text-secondary">{role} · {difficulty}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isLoading && (
                <div className="flex items-center gap-2 text-xs text-secondary">
                  <span className="animate-spin">⚙️</span> Evaluating…
                </div>
              )}
              <span className={`badge ${isComplete ? 'badge-green' : 'badge-blue'}`}>
                {isComplete ? '✓ Complete' : `Q ${questionNumber + 1} / ${totalQuestions}`}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="progress-bar mb-4">
            <div className="progress-fill" style={{ width: `${Math.min(100, progress)}%` }} />
          </div>

          {/* Messages */}
          <div className="chat-messages">
            {messages.map(msg => (
              <div key={msg.id} className={`message ${msg.role === 'user' ? 'user' : 'ai'}`}>
                {msg.role !== 'system' && (
                  <div className="message-avatar">{msg.role === 'ai' ? '🤖' : '👤'}</div>
                )}
                <div style={{ flex: 1 }}>
                  {msg.role === 'system' ? (
                    <div style={{
                      padding: '10px 16px', borderRadius: 'var(--radius-md)',
                      background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
                      fontSize: '0.875rem', color: 'var(--accent-warning)', whiteSpace: 'pre-line'
                    }}>{msg.text}</div>
                  ) : (
                    <>
                      <div className="message-bubble" style={{ whiteSpace: 'pre-line' }}>
                        {msg.isQuestion && (
                          <span className="badge badge-blue" style={{ display: 'inline-flex', marginBottom: 8 }}>
                            Question {Math.max(1, questionNumber)}
                          </span>
                        )}
                        <div>{msg.text}</div>
                      </div>
                      <div className="message-time">{msg.timestamp}</div>
                    </>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="message ai">
                <div className="message-avatar">🤖</div>
                <div className="message-bubble">
                  <div className="typing-indicator">
                    <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* ── Input area ── */}
          {!isComplete && !ended && (
            <div className="chat-input-area">
              {mode === 'voice' ? (
                <VoiceControls
                  voice={{ ...voice, startRecording: handleVoiceStart }}
                  onSubmitText={handleSubmit}
                  onClear={() => voice.clearTranscript?.()}
                  disabled={isLoading}
                  suppressTab={(ms) => tabDetection.suppressFor(ms)}
                />
              ) : (
                <>
                  <textarea
                    ref={inputRef}
                    className="chat-input"
                    placeholder="Type your answer… (Enter to submit, Shift+Enter for new line)"
                    value={textInput}
                    onChange={e => setTextInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
                    }}
                    disabled={isLoading}
                    rows={2}
                  />
                  <button className="btn btn-primary"
                    onClick={() => handleSubmit()}
                    disabled={!textInput.trim() || isLoading}
                    style={{ height: 56, padding: '0 20px', fontSize: '1.1rem' }}>
                    {isLoading ? <span className="animate-spin">⚙️</span> : '→'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div className="sidebar-panel">

          {/* Timer */}
          {timeLeft !== null && (
            <div className="card">
              <div className="text-xs text-secondary mb-2 text-center"
                style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>Time Remaining</div>
              <div className={`timer-display ${timerClass}`}>{formatTime(timeLeft)}</div>
            </div>
          )}

          {/* Session info */}
          <div className="card">
            <div className="text-xs text-secondary mb-3" style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>Session</div>
            <div className="flex flex-col gap-2">
              {[
                ['Role', role],
                ['Difficulty', difficulty],
                ['Mode', mode],
                ['Progress', `${questionNumber} / ${totalQuestions}`],
                ['Violations', tabDetection.violationCount > 0 ? `⚠️ ${tabDetection.violationCount}` : '✓ 0'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-xs text-muted">{k}</span>
                  <span className="text-xs font-bold">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Last evaluation */}
          {lastEvaluation && (
            <div className="card eval-card">
              <div className="text-xs text-secondary mb-3" style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>Last Answer</div>
              <div className="score-stars mb-2">
                {[1,2,3,4,5].map(n => (
                  <span key={n} className={`star ${n <= lastEvaluation.score ? 'filled' : ''}`}>
                    {n <= lastEvaluation.score ? '⭐' : '☆'}
                  </span>
                ))}
              </div>
              <div className="text-sm font-bold mb-2" style={{
                color: lastEvaluation.score >= 4 ? 'var(--accent-success)'
                  : lastEvaluation.score >= 3 ? 'var(--accent-warning)' : 'var(--accent-danger)'
              }}>{lastEvaluation.rating}</div>
              {lastEvaluation.improvements?.[0] && (
                <div className="text-xs text-secondary" style={{
                  padding: '8px 10px', background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-sm)', borderLeft: '2px solid var(--accent-primary)'
                }}>
                  💡 {lastEvaluation.improvements[0]}
                </div>
              )}
            </div>
          )}

          {/* Recent transcript */}
          {chatTranscript.length > 0 && (
            <div className="card" style={{ maxHeight: 280, overflow: 'hidden' }}>
              <div className="text-xs text-secondary mb-3" style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>Transcript</div>
              <div style={{ overflowY: 'auto', maxHeight: 220, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {chatTranscript.slice(-6).map((t, i) => (
                  <div key={i} className={`transcript-item ${t.role}`}>
                    <div className="text-xs font-bold mb-1"
                      style={{ color: t.role === 'interviewer' ? 'var(--accent-primary)' : 'var(--accent-secondary)' }}>
                      {t.role === 'interviewer' ? 'AI' : 'You'}
                    </div>
                    <div className="text-xs text-secondary" style={{
                      overflow: 'hidden', display: '-webkit-box',
                      WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'
                    }}>{t.text}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* End session */}
          {!isComplete && !ended && (
            showEndConfirm ? (
              <div className="card" style={{ border: '1px solid rgba(239,68,68,0.3)' }}>
                <p className="text-sm text-danger mb-3">⚠️ End interview early? Progress will be saved.</p>
                <div className="flex gap-2">
                  <button className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={() => handleEndSession()}>Yes, End</button>
                  <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => setShowEndConfirm(false)}>Continue</button>
                </div>
              </div>
            ) : (
              <button className="btn btn-danger w-full" onClick={() => setShowEndConfirm(true)}>
                ⏹ End Session
              </button>
            )
          )}

          {(isComplete || ended) && (
            <button className="btn btn-success w-full" onClick={navigateToResults}>
              📊 View Results
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
