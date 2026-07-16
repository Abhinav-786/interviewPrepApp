'use client';

import { useState } from 'react';

export default function SaveBoardModal({ onClose, onConfirm, defaultName, loading }) {
  const [boardName, setBoardName] = useState(defaultName || '');

  function handleSubmit(e) {
    e.preventDefault();
    if (boardName.trim()) {
      onConfirm(boardName.trim());
    }
  }

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal" style={{ maxWidth: 420, textAlign: 'center', padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <span className="spinner" style={{ width: 42, height: 42 }} />
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
              🪄 AI is polishing your questions...
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Formatting, structuring, and classifying study questions. This will take just a few seconds.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <span className="modal-title">📂 Track Study Progress</span>
          <button className="modal-close" onClick={onClose} disabled={loading}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Choose a name for your new Study Tracker Board. This will group and track these questions under a separate tab in your Progress Tracker.
            </p>
            <div className="form-group">
              <label className="form-label" style={{ marginBottom: 6, display: 'block' }}>Board Name</label>
              <input
                type="text"
                className="form-input"
                required
                placeholder="e.g. Java Core, Selenium Automation, Barclays Prep"
                value={boardName}
                onChange={(e) => setBoardName(e.target.value)}
                autoFocus
                disabled={loading}
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', height: 38, padding: '0 12px', borderRadius: '6px', width: '100%' }}
              />
            </div>
          </div>

          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>Create & Track</button>
          </div>
        </form>
      </div>
    </div>
  );
}
