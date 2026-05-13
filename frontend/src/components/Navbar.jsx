// components/Navbar.jsx

import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Navbar() {
  const location = useLocation();
  const isInterview = location.pathname.startsWith('/interview/');

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand" style={{ textDecoration: 'none' }}>
        <span style={{ fontSize: '1.5rem' }}>🤖</span>
        <span>InterviewAI</span>
      </Link>

      {!isInterview && (
        <div className="flex items-center gap-4">
          <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>
            Powered by HuggingFace
          </span>
          <Link to="/" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
            New Interview
          </Link>
        </div>
      )}

      {isInterview && (
        <div className="flex items-center gap-3">
          <span className="animate-pulse" style={{ color: 'var(--accent-danger)', fontSize: '0.8rem', fontWeight: 600 }}>
            ● LIVE
          </span>
          <span className="badge badge-blue">Interview in Progress</span>
        </div>
      )}
    </nav>
  );
}
