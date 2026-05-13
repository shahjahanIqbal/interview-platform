// components/ExportMenu.jsx — Download report in multiple formats

import React, { useState } from 'react';
import { exportAsPDF, exportAsDOCX, exportAsMarkdown } from '../utils/export';

const FORMATS = [
  { key: 'pdf', label: 'PDF Report', icon: '📄', desc: 'Full report with charts context' },
  { key: 'docx', label: 'Word Document', icon: '📝', desc: 'Editable .docx file' },
  { key: 'md', label: 'Markdown', icon: '📋', desc: 'Plain text, great for GitHub' },
];

export default function ExportMenu({ results }) {
  const [loading, setLoading] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleExport = async (format) => {
    if (!results || loading) return;
    setLoading(format);
    setSuccess(null);
    try {
      if (format === 'pdf') await exportAsPDF(results);
      else if (format === 'docx') await exportAsDOCX(results);
      else exportAsMarkdown(results);
      setSuccess(format);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      alert('Export failed: ' + err.message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="card">
      <h3 className="mb-4" style={{ color: 'var(--accent-primary)', fontSize: '1rem' }}>
        📥 Download Report
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {FORMATS.map(({ key, label, icon, desc }) => (
          <button key={key}
            onClick={() => handleExport(key)}
            disabled={!!loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 16px', borderRadius: 'var(--radius-md)',
              background: success === key ? 'rgba(16,185,129,0.1)' : 'var(--bg-secondary)',
              border: `1px solid ${success === key ? 'var(--accent-success)' : 'var(--border-secondary)'}`,
              color: 'var(--text-primary)', cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading && loading !== key ? 0.5 : 1,
              transition: 'var(--transition)', textAlign: 'left', width: '100%',
              fontFamily: 'var(--font-body)'
            }}
          >
            <span style={{ fontSize: '1.25rem' }}>
              {loading === key ? '⏳' : success === key ? '✅' : icon}
            </span>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{label}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{desc}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
