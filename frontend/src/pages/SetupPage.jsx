// pages/SetupPage.jsx - Interview configuration screen

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';

const DURATIONS = [
  { label: '10 min', value: 10, desc: '~3 questions' },
  { label: '20 min', value: 20, desc: '~6 questions' },
  { label: '30 min', value: 30, desc: '~10 questions' },
  { label: 'No limit', value: null, desc: 'Unlimited' },
];

const DIFFICULTIES = [
  { label: 'Easy', value: 'easy', icon: '🌱', desc: 'Beginner friendly' },
  { label: 'Medium', value: 'medium', icon: '⚡', desc: 'Intermediate' },
  { label: 'Hard', value: 'hard', icon: '🔥', desc: 'Advanced' },
];

const MODES = [
  { label: 'Text', value: 'text', icon: '⌨️', desc: 'Type your answers' },
  { label: 'Voice', value: 'voice', icon: '🎙️', desc: 'Speak your answers' },
];

export default function SetupPage() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [difficulty, setDifficulty] = useState('medium');
  const [duration, setDuration] = useState(20);
  const [mode, setMode] = useState('text');
  const [trackTabs, setTrackTabs] = useState(true);
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeAnalysis, setResumeAnalysis] = useState(null);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [resumeError, setResumeError] = useState(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const fileInputRef = useRef();

  useEffect(() => {
    api.getRoles().then(setRoles).catch(() => {});
  }, []);

  const categories = ['All', ...new Set(roles.map(r => r.category))];
  const filteredRoles = activeCategory === 'All' ? roles : roles.filter(r => r.category === activeCategory);

  const handleResumeUpload = async (file) => {
    if (!file) return;
    setResumeFile(file);
    setUploadingResume(true);
    setResumeError(null);
    setResumeAnalysis(null);

    try {
      const formData = new FormData();
      formData.append('resume', file);
      const result = await api.uploadResume(formData);
      setResumeAnalysis(result.analysis);
    } catch (err) {
      setResumeError(err.message);
      setResumeFile(null);
    } finally {
      setUploadingResume(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleResumeUpload(file);
  };

  const handleStart = async () => {
    if (!selectedRole) { setError('Please select a role for the interview'); return; }
    setStarting(true);
    setError(null);

    try {
      const result = await api.startInterview({
        role: selectedRole.label,
        difficulty,
        duration,
        mode,
        resumeContext: resumeAnalysis?.summary || null
      });

      // Store config in sessionStorage
      sessionStorage.setItem('interviewConfig', JSON.stringify({
        sessionId: result.sessionId,
        role: selectedRole.label,
        difficulty,
        duration,
        mode,
        trackTabs,
        totalQuestions: result.totalQuestions
      }));

      navigate(`/interview/${result.sessionId}`, {
        state: { firstQuestion: result.currentQuestion, config: result }
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="page" style={{ maxWidth: 1100, margin: '0 auto', paddingTop: 40 }}>
      {/* Header */}
      <div className="setup-hero">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'var(--gradient-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.75rem', boxShadow: 'var(--shadow-glow)'
          }}>🤖</div>
        </div>
        <h1 style={{ background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          AI Mock Interview
        </h1>
        <p className="subtitle">Configure your personalized interview session with AI-powered questions and real-time evaluation</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 32, alignItems: 'start' }}>
        {/* Left: Role + Settings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

          {/* Role Selection */}
          <div className="card">
            <h3 className="mb-4" style={{ color: 'var(--accent-primary)' }}>① Select Interview Role</h3>
            <div className="flex gap-2 mb-4" style={{ flexWrap: 'wrap' }}>
              {categories.map(cat => (
                <button key={cat}
                  className={`badge ${activeCategory === cat ? 'badge-blue' : ''}`}
                  style={{ cursor: 'pointer', background: activeCategory === cat ? undefined : 'var(--bg-elevated)' }}
                  onClick={() => setActiveCategory(cat)}
                >{cat}</button>
              ))}
            </div>
            <div className="setup-grid">
              {filteredRoles.map(role => (
                <div key={role.id}
                  className={`role-card ${selectedRole?.id === role.id ? 'selected' : ''}`}
                  onClick={() => setSelectedRole(role)}
                >
                  <div className="role-icon">{role.icon}</div>
                  <div className="role-label">{role.label}</div>
                  <div className="role-category">{role.category}</div>
                </div>
              ))}
            </div>
            {selectedRole && (
              <div className="mt-4 flex items-center gap-2">
                <span className="badge badge-blue">✓ {selectedRole.label} selected</span>
              </div>
            )}
          </div>

          {/* Difficulty */}
          <div className="card">
            <h3 className="mb-4" style={{ color: 'var(--accent-primary)' }}>② Difficulty Level</h3>
            <div className="flex gap-3">
              {DIFFICULTIES.map(d => (
                <button key={d.value}
                  className={`difficulty-btn ${d.value} ${difficulty === d.value ? 'selected' : ''}`}
                  onClick={() => setDifficulty(d.value)}
                >
                  <div style={{ fontSize: '1.75rem', marginBottom: 6 }}>{d.icon}</div>
                  <div style={{ fontWeight: 700 }}>{d.label}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>{d.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div className="card">
            <h3 className="mb-4" style={{ color: 'var(--accent-primary)' }}>③ Session Duration</h3>
            <div className="flex gap-3" style={{ flexWrap: 'wrap' }}>
              {DURATIONS.map(d => (
                <button key={d.label}
                  onClick={() => setDuration(d.value)}
                  style={{
                    flex: 1, minWidth: 100,
                    padding: '16px 12px', borderRadius: 'var(--radius-md)',
                    border: `2px solid ${duration === d.value ? 'var(--accent-primary)' : 'var(--border-secondary)'}`,
                    background: duration === d.value ? 'rgba(0,212,255,0.08)' : 'var(--bg-card)',
                    color: 'var(--text-primary)', cursor: 'pointer',
                    textAlign: 'center', transition: 'var(--transition)'
                  }}
                >
                  <div style={{ fontWeight: 700, fontFamily: 'var(--font-display)' }}>{d.label}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>{d.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Mode */}
          <div className="card">
            <h3 className="mb-4" style={{ color: 'var(--accent-primary)' }}>④ Interview Mode</h3>
            <div className="flex gap-3">
              {MODES.map(m => (
                <button key={m.value}
                  className={`difficulty-btn medium ${mode === m.value ? 'selected' : ''}`}
                  onClick={() => setMode(m.value)}
                  style={{ flex: 1 }}
                >
                  <div style={{ fontSize: '1.75rem', marginBottom: 6 }}>{m.icon}</div>
                  <div style={{ fontWeight: 700 }}>{m.label}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>{m.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Resume + Options + Start */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, position: 'sticky', top: 100 }}>

          {/* Resume Upload */}
          <div className="card">
            <h3 className="mb-3" style={{ color: 'var(--accent-primary)', fontSize: '1rem' }}>📄 Upload Resume (Optional)</h3>
            <p className="text-sm text-secondary mb-3">AI will ask personalized questions based on your experience</p>

            {!resumeFile ? (
              <div
                className="upload-zone"
                style={{ padding: 28 }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>📎</div>
                <div className="text-sm font-bold mb-2">Drop resume here or click to browse</div>
                <div className="text-xs text-muted">PDF, DOCX, TXT — max 10MB</div>
              </div>
            ) : (
              <div style={{ padding: '16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-primary)' }}>
                {uploadingResume ? (
                  <div className="flex items-center gap-2">
                    <span className="animate-spin">⚙️</span>
                    <span className="text-sm">Analyzing resume...</span>
                  </div>
                ) : resumeAnalysis ? (
                  <>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-success">✓</span>
                      <span className="text-sm font-bold">{resumeFile.name}</span>
                    </div>
                    {resumeAnalysis.highlights?.map((h, i) => (
                      <div key={i} className="text-xs text-secondary mb-1">• {h}</div>
                    ))}
                    {resumeAnalysis.skills?.length > 0 && (
                      <div className="flex gap-1 mt-2" style={{ flexWrap: 'wrap' }}>
                        {resumeAnalysis.skills.slice(0, 6).map(s => (
                          <span key={s} className="badge badge-blue" style={{ fontSize: '0.65rem' }}>{s}</span>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-danger text-sm">{resumeError}</div>
                )}
                <button
                  className="btn btn-secondary btn-sm mt-3 w-full"
                  onClick={() => { setResumeFile(null); setResumeAnalysis(null); setResumeError(null); }}
                >Remove</button>
              </div>
            )}

            <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: 'none' }}
              onChange={e => handleResumeUpload(e.target.files[0])} />
          </div>

          {/* Options */}
          <div className="card">
            <h3 className="mb-3" style={{ color: 'var(--accent-primary)', fontSize: '1rem' }}>⚙️ Options</h3>
            <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
              <div style={{
                width: 44, height: 24, borderRadius: 12,
                background: trackTabs ? 'var(--gradient-primary)' : 'var(--bg-elevated)',
                position: 'relative', transition: 'var(--transition)',
                border: '1px solid var(--border-primary)', cursor: 'pointer', flexShrink: 0
              }} onClick={() => setTrackTabs(!trackTabs)}>
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', background: 'white',
                  position: 'absolute', top: 2,
                  left: trackTabs ? 22 : 2, transition: 'var(--transition)'
                }} />
              </div>
              <div>
                <div className="text-sm font-bold">Tab Monitoring</div>
                <div className="text-xs text-muted">Warn when switching tabs</div>
              </div>
            </label>
          </div>

          {/* Start Button */}
          {error && (
            <div className="card" style={{ border: '1px solid rgba(239,68,68,0.3)', padding: 12 }}>
              <p className="text-danger text-sm">⚠️ {error}</p>
            </div>
          )}

          <button
            className="btn btn-primary btn-lg w-full"
            onClick={handleStart}
            disabled={starting || uploadingResume}
            style={{ justifyContent: 'center', fontSize: '1.1rem' }}
          >
            {starting ? (
              <><span className="animate-spin">⚙️</span> Preparing Interview...</>
            ) : (
              <><span>🚀</span> Start Interview</>
            )}
          </button>

          <div className="text-xs text-muted text-center">
            {selectedRole ? `${selectedRole.label} · ${difficulty} · ${duration ? duration + ' min' : 'No limit'}` : 'Select a role to continue'}
          </div>
        </div>
      </div>
    </div>
  );
}
