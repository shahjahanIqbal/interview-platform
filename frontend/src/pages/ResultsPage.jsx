// pages/ResultsPage.jsx - Visual results dashboard

import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, Cell, PieChart, Pie, Legend
} from 'recharts';
import api from '../utils/api';
import { exportAsPDF, exportAsDOCX, exportAsMarkdown } from '../utils/export';

const SCORE_COLORS = { 1: '#ef4444', 2: '#f59e0b', 3: '#3b82f6', 4: '#10b981', 5: '#00d4ff' };

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--border-primary)',
      borderRadius: 8, padding: '10px 14px', fontSize: '0.85rem'
    }}>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || 'var(--accent-primary)', fontWeight: 600 }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

export default function ResultsPage() {
  const { sessionId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exportLoading, setExportLoading] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const violations = location.state?.violations || [];

  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    api.getResults(sessionId)
      .then(setResults)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const handleExport = async (format) => {
    if (!results) return;
    setExportLoading(format);
    try {
      if (format === 'pdf') await exportAsPDF(results);
      else if (format === 'docx') await exportAsDOCX(results);
      else if (format === 'md') exportAsMarkdown(results);
    } catch (err) {
      alert('Export failed: ' + err.message);
    } finally {
      setExportLoading(null);
    }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: '3rem', animation: 'spin 1s linear infinite' }}>⚙️</div>
      <p style={{ color: 'var(--text-secondary)' }}>Generating your results...</p>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: '3rem' }}>❌</div>
      <p style={{ color: 'var(--accent-danger)' }}>{error}</p>
      <button className="btn btn-secondary" onClick={() => navigate('/')}>Go Home</button>
    </div>
  );

  if (!results) return null;

  // Chart data
  const barData = results.evaluations?.map((ev, i) => ({
    name: `Q${i + 1}`,
    score: ev.score,
    label: ev.question?.substring(0, 30) + '...'
  })) || [];

  const radarData = [
    { subject: 'Relevance', value: results.averageScore * 1.1 > 5 ? 5 : results.averageScore * 1.1 },
    { subject: 'Clarity', value: results.averageScore },
    { subject: 'Depth', value: Math.max(1, results.averageScore - 0.5) },
    { subject: 'Structure', value: Math.min(5, results.averageScore + 0.3) },
    { subject: 'Confidence', value: results.averageScore * 0.9 },
  ].map(d => ({ ...d, value: parseFloat(d.value.toFixed(1)) }));

  const pieData = [
    { name: 'Attempted', value: results.questionsAttempted, color: 'var(--accent-primary)' },
    { name: 'Skipped', value: results.totalQuestions - results.questionsAttempted, color: 'var(--bg-elevated)' },
  ];

  const scoreDistribution = [1, 2, 3, 4, 5].map(s => ({
    score: `${s}★`,
    count: results.evaluations?.filter(e => e.score === s).length || 0
  }));

  const getRatingColor = (rating) => {
    const map = { Excellent: 'var(--accent-primary)', Good: 'var(--accent-success)', Fair: 'var(--accent-warning)', Poor: 'var(--accent-danger)', 'Very Poor': '#dc2626', 'Below Average': '#f59e0b', Average: '#3b82f6' };
    return map[rating] || 'var(--text-primary)';
  };

  const tabs = ['overview', 'questions', 'transcript', 'violations'];

  return (
    <div className="results-layout" style={{ animation: 'fadeIn 0.5s ease' }}>
      {/* Header */}
      <div className="results-header">
        <div style={{ fontSize: '4rem', marginBottom: 16 }}>
          {results.averageScore >= 4 ? '🏆' : results.averageScore >= 3 ? '👍' : '📚'}
        </div>
        <div className="overall-score">{results.averageScore?.toFixed(1)}<span style={{ fontSize: '2rem', opacity: 0.5 }}>/5</span></div>
        <div className="text-xl mb-2" style={{ color: getRatingColor(results.summary?.overallRating) }}>
          {results.summary?.overallRating || 'Completed'}
        </div>
        <div className="text-secondary">
          {results.role} Interview · {results.difficulty} · {results.questionsAttempted}/{results.totalQuestions} questions
        </div>
        <div className="text-muted text-sm mt-1">
          Duration: {Math.floor(results.duration / 60)}m {results.duration % 60}s
        </div>
      </div>

      {/* Export Buttons */}
      <div className="flex gap-3 justify-center mb-8">
        {[
          { format: 'pdf', label: '📄 PDF', },
          { format: 'docx', label: '📝 Word', },
          { format: 'md', label: '📋 Markdown', },
        ].map(({ format, label }) => (
          <button key={format} className="btn btn-secondary"
            onClick={() => handleExport(format)}
            disabled={exportLoading === format}
          >
            {exportLoading === format ? <span className="animate-spin">⚙️</span> : null}
            {label}
          </button>
        ))}
        <button className="btn btn-primary" onClick={() => navigate('/')}>
          🔄 New Interview
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8" style={{ borderBottom: '1px solid var(--border-secondary)', paddingBottom: 0 }}>
        {tabs.map(tab => (
          <button key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 20px', border: 'none', background: 'none',
              color: activeTab === tab ? 'var(--accent-primary)' : 'var(--text-secondary)',
              fontFamily: 'var(--font-body)', fontWeight: activeTab === tab ? 700 : 400,
              fontSize: '0.9rem', cursor: 'pointer', textTransform: 'capitalize',
              borderBottom: `2px solid ${activeTab === tab ? 'var(--accent-primary)' : 'transparent'}`,
              transition: 'var(--transition)'
            }}
          >
            {tab === 'violations' ? `⚠️ Violations (${violations.length})` : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="animate-fade-in">
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
            {[
              { label: 'Average Score', value: `${results.averageScore?.toFixed(1)}/5`, icon: '⭐' },
              { label: 'Questions Done', value: `${results.questionsAttempted}/${results.totalQuestions}`, icon: '✅' },
              { label: 'Duration', value: `${Math.floor(results.duration / 60)}m ${results.duration % 60}s`, icon: '⏱️' },
              { label: 'Violations', value: violations.length, icon: '🔒' }
            ].map(({ label, value, icon }) => (
              <div key={label} className="card card-glow text-center">
                <div style={{ fontSize: '1.75rem', marginBottom: 8 }}>{icon}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>{value}</div>
                <div className="text-xs text-secondary mt-1">{label}</div>
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div className="results-grid">
            {/* Score per Question */}
            <div className="card">
              <h3 className="mb-4">Score per Question</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fill: '#8ba3c4', fontSize: 12 }} />
                  <YAxis domain={[0, 5]} tick={{ fill: '#8ba3c4', fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                    {barData.map((entry, i) => (
                      <Cell key={i} fill={SCORE_COLORS[entry.score] || '#3b82f6'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Radar */}
            <div className="card">
              <h3 className="mb-4">Performance Profile</h3>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.08)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#8ba3c4', fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fill: '#4a6180', fontSize: 10 }} />
                  <Radar name="Score" dataKey="value" stroke="#00d4ff" fill="#00d4ff" fillOpacity={0.15} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Score Distribution */}
            <div className="card">
              <h3 className="mb-4">Score Distribution</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={scoreDistribution} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="score" tick={{ fill: '#8ba3c4', fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fill: '#8ba3c4', fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="#7c3aed" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Completion Pie */}
            <div className="card">
              <h3 className="mb-4">Completion</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90}
                    dataKey="value" stroke="none">
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Legend formatter={(v) => <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{v}</span>} />
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* AI Summary */}
          {results.summary && (
            <div className="card card-glow mt-6">
              <h3 className="mb-4" style={{ color: 'var(--accent-primary)' }}>🤖 AI Assessment</h3>
              <p className="text-secondary mb-6" style={{ lineHeight: 1.8 }}>{results.summary.summary}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                {results.summary.topStrengths?.length > 0 && (
                  <div>
                    <div className="text-sm font-bold text-success mb-3">✅ Strengths</div>
                    {results.summary.topStrengths.map((s, i) => (
                      <div key={i} style={{ padding: '8px 12px', background: 'rgba(16,185,129,0.06)', borderRadius: 8, marginBottom: 6, fontSize: '0.875rem', color: 'var(--text-secondary)', borderLeft: '2px solid var(--accent-success)' }}>
                        {s}
                      </div>
                    ))}
                  </div>
                )}
                {results.summary.areasToImprove?.length > 0 && (
                  <div>
                    <div className="text-sm font-bold text-warning mb-3">💡 Areas to Improve</div>
                    {results.summary.areasToImprove.map((a, i) => (
                      <div key={i} style={{ padding: '8px 12px', background: 'rgba(245,158,11,0.06)', borderRadius: 8, marginBottom: 6, fontSize: '0.875rem', color: 'var(--text-secondary)', borderLeft: '2px solid var(--accent-warning)' }}>
                        {a}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {results.summary.studyTopics?.length > 0 && (
                <div className="mt-4">
                  <div className="text-sm font-bold mb-3" style={{ color: 'var(--accent-primary)' }}>📚 Recommended Study Topics</div>
                  <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                    {results.summary.studyTopics.map((t, i) => (
                      <span key={i} className="badge badge-blue">{t}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'questions' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {results.evaluations?.map((ev, i) => (
            <div key={i} className="card question-result-item">
              <div className="flex items-center justify-between mb-3">
                <div className="badge badge-blue">Question {i + 1}</div>
                <div className="flex items-center gap-2">
                  <div className="score-stars">
                    {[1,2,3,4,5].map(n => (
                      <span key={n} style={{ fontSize: '1rem' }}>{n <= ev.score ? '⭐' : '☆'}</span>
                    ))}
                  </div>
                  <span className="font-bold" style={{ color: getRatingColor(ev.rating) }}>{ev.rating}</span>
                </div>
              </div>

              <div className="text-sm font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{ev.question}</div>

              <div style={{ padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 8, marginBottom: 12, fontSize: '0.875rem', color: 'var(--text-secondary)', borderLeft: '2px solid var(--accent-secondary)' }}>
                <strong style={{ color: 'var(--text-primary)' }}>Your Answer:</strong> {ev.answer}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                {ev.strengths?.length > 0 && (
                  <div>
                    <div className="text-xs font-bold text-success mb-2">✓ Strengths</div>
                    {ev.strengths.map((s, j) => <div key={j} className="text-xs text-secondary mb-1">• {s}</div>)}
                  </div>
                )}
                {ev.improvements?.length > 0 && (
                  <div>
                    <div className="text-xs font-bold text-warning mb-2">↑ Improvements</div>
                    {ev.improvements.map((imp, j) => <div key={j} className="text-xs text-secondary mb-1">• {imp}</div>)}
                  </div>
                )}
              </div>

              {ev.betterAnswer && (
                <div style={{ padding: '10px 14px', background: 'rgba(0,212,255,0.05)', borderRadius: 8, fontSize: '0.875rem', color: 'var(--text-secondary)', borderLeft: '2px solid var(--accent-primary)' }}>
                  <strong style={{ color: 'var(--accent-primary)' }}>💡 Better Answer:</strong> {ev.betterAnswer}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'transcript' && (
        <div className="animate-fade-in card">
          <h3 className="mb-4">Interview Transcript</h3>
          {results.transcript?.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {results.transcript.map((t, i) => (
                <div key={i} className={`transcript-item ${t.role}`}>
                  <div className="text-xs font-bold mb-1" style={{ color: t.role === 'interviewer' ? 'var(--accent-primary)' : 'var(--accent-secondary)' }}>
                    {t.role === 'interviewer' ? '🤖 AI Interviewer' : '👤 You'}
                  </div>
                  <div className="text-sm text-secondary">{t.text}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-secondary">No transcript available.</p>
          )}
        </div>
      )}

      {activeTab === 'violations' && (
        <div className="animate-fade-in">
          {violations.length === 0 ? (
            <div className="card text-center">
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>✅</div>
              <h3 className="mb-2">No Violations Detected</h3>
              <p className="text-secondary">You maintained focus throughout the interview. Great discipline!</p>
            </div>
          ) : (
            <div>
              <div className="card card-glow mb-6" style={{ border: '1px solid rgba(239,68,68,0.3)' }}>
                <div className="flex items-center gap-3">
                  <span style={{ fontSize: '2rem' }}>⚠️</span>
                  <div>
                    <h3 style={{ color: 'var(--accent-danger)' }}>{violations.length} Violation(s) Detected</h3>
                    <p className="text-secondary text-sm">These incidents were recorded during your interview session.</p>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {violations.map((v, i) => (
                  <div key={i} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div className="badge badge-red">#{i + 1}</div>
                    <div>
                      <div className="text-sm font-bold">{v.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
                      <div className="text-xs text-muted">{v.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
