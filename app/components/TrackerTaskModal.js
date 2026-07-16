'use client';

import { useState } from 'react';

export default function TrackerTaskModal({ task, onClose, onUpdate, tags, nvidiaKeyProp, showToast }) {
  const [text, setText] = useState(task.text);
  const [category, setCategory] = useState(task.category || 'General');
  const [status, setStatus] = useState(task.status || 'To Do');
  const [notes, setNotes] = useState(task.notes || '');
  const [aiResponse, setAiResponse] = useState(task.aiAnalysis || '');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);

  function handleSave() {
    onUpdate({
      ...task,
      text: text.trim(),
      category,
      status,
      notes: notes.trim(),
      aiAnalysis: aiResponse,
    });
    onClose();
  }

  async function handleAnalyze() {
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      const res = await fetch('/api/analyze-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: text,
          answer: notes,
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to analyze question.');
      }
      setAiResponse(data.analysis);
      if (showToast) {
        showToast('AI analysis completed successfully!');
      }
    } catch (err) {
      setAnalysisError(err.message);
    } finally {
      setAnalyzing(false);
    }
  }

  const showAiPane = !!aiResponse || analyzing || analysisError;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: showAiPane ? 900 : 500, width: '90%', transition: 'max-width 0.3s ease' }}>
        <div className="modal-header">
          <span className="modal-title">📋 View Task Details</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: showAiPane ? '1fr 1fr' : '1fr', gap: 20 }}>
          {/* Left Column: Editor */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Question Text</label>
              <textarea
                className="form-textarea"
                style={{ minHeight: 70 }}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', height: 38, padding: '0 8px', borderRadius: '6px' }}
                >
                  {tags.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', height: 38, padding: '0 8px', borderRadius: '6px' }}
                >
                  <option value="To Do">📖 To Do</option>
                  <option value="In Progress">⏳ In Progress</option>
                  <option value="Done">✅ Done</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label className="form-label" style={{ margin: 0 }}>My Answer / Study Notes</label>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={analyzing || !notes.trim()}
                  onClick={handleAnalyze}
                  style={{ padding: '2px 8px', fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  {analyzing ? (
                    <><span className="spinner" style={{ width: 10, height: 10 }} /> Analyzing...</>
                  ) : (
                    '💡 AI Answer Coach'
                  )}
                </button>
              </div>
              <textarea
                className="form-textarea"
                placeholder="Write your study notes, solutions, or answer drafts here..."
                style={{ minHeight: 180 }}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Right Column: AI Analysis pane */}
          {showAiPane && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, borderLeft: '1px solid var(--border)', paddingLeft: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" style={{ margin: 0, color: 'var(--primary)' }}>🧠 AI Expert Coach</label>
                {aiResponse && !analyzing && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleAnalyze}
                    style={{ padding: '2px 8px', fontSize: 10 }}
                  >
                    🔄 Re-Evaluate
                  </button>
                )}
              </div>

              <div
                className="ai-response-box"
                style={{
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: 16,
                  height: 310,
                  overflowY: 'auto',
                  fontSize: 13,
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap'
                }}
              >
                {analyzing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
                    <span className="spinner" style={{ width: 28, height: 28 }} />
                    <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>NVIDIA AI is evaluating correctness...</span>
                  </div>
                ) : analysisError ? (
                  <div style={{ color: 'var(--accent-red)' }}>⚠️ {analysisError}</div>
                ) : (
                  aiResponse
                )}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={analyzing}>Close</button>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={analyzing}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}
