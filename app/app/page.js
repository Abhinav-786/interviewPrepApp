'use client';

import { useState, useEffect, useCallback } from 'react';

// ─── Constants ──────────────────────────────────────────────────────────────
const DEFAULT_TAGS = ['Java', 'Javascript', 'Selenium', 'Automation', 'Manual', 'Playwright', 'Nightwatch', 'API Testing', 'General'];
const STATUSES = ['To Read', 'In Progress', 'Done'];
const STATUS_CYCLE = { 'To Read': 'In Progress', 'In Progress': 'Done', 'Done': 'To Read' };
const STATUS_CLASS = { 'To Read': 'status-todo', 'In Progress': 'status-progress', 'Done': 'status-done' };
const STATUS_EMOJI = { 'To Read': '📖', 'In Progress': '⏳', 'Done': '✅' };
const LS_KEY = 'interviewprep_posts';
const LS_TAGS_KEY = 'interviewprep_tags';

function genId() {
  return `post_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function initials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function truncate(str, n = 140) {
  return str && str.length > n ? str.slice(0, n).trimEnd() + '…' : str;
}

// Generates cohesive, professional colors dynamically for any tag name
function getTagStyle(tag) {
  if (!tag) return {};
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  const s = 65;
  const l = 65;
  return {
    background: `hsla(${h}, ${s}%, ${l}%, 0.15)`,
    color: `hsla(${h}, ${s + 15}%, ${l + 10}%, 1)`,
    border: `1px solid hsla(${h}, ${s}%, ${l}%, 0.3)`
  };
}

function getPostTags(post) {
  if (!post) return [];
  if (Array.isArray(post.tags)) return post.tags;
  if (post.tag) return [post.tag];
  return [];
}

function getPostQuestions(post) {
  if (!post) return [];
  if (Array.isArray(post.questions)) return post.questions;
  // Fallback: parse lines from content
  const lines = (post.content || '').split('\n');
  const parsed = [];
  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const cleaned = trimmed.replace(/^[-*•\d+[\.\)]\s*/, '').trim();
    if (cleaned) {
      parsed.push({
        text: cleaned,
        tag: getPostTags(post)[0] || 'General'
      });
    }
  }
  return parsed;
}

// ─── CSV Export ─────────────────────────────────────────────────────────────
function toCSV(posts) {
  const headers = ['#', 'Post URL', 'Company Name', 'Date Added', 'Topic Tags', 'Status', 'Content'];
  const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = posts.map((p, i) =>
    [i + 1, p.url || '', p.author || '', formatDate(p.addedAt), getPostTags(p).join(' | '), p.status, p.content || ''].map(escape).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

function downloadCSV(posts) {
  const blob = new Blob([toCSV(posts)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `interview-prep-posts-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Helper to parse questions from markdown guide
function parseQuestionsFromMarkdown(markdownText) {
  if (!markdownText) return [];
  const lines = markdownText.split('\n');
  const questions = [];
  let currentCategory = 'General';

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    // Detect headings (e.g. ### Java Core Concepts)
    if (line.startsWith('#')) {
      currentCategory = line.replace(/^#+\s*/, '').trim();
      continue;
    }

    // Strip bold formatting globally for matching (e.g. **1.** What is Java? -> 1. What is Java?)
    const lineWithoutBold = line.replace(/\*\*/g, '').trim();

    // Check for standard list item indicators: e.g. "1. ", "1) ", "- ", "* "
    const listItemMatch = lineWithoutBold.match(/^(\d+[\.\)]\s*|[-*•]\s*|\[\s*\]\s*|\[x\]\s*)(.+)$/i);

    // Check for "Question 1:" or "Q1:" prefixes
    const questionPrefixMatch = lineWithoutBold.match(/^(Question\s*\d+:\s*|Q\d+:\s*)(.+)$/i);

    let isQuestion = false;
    let questionText = '';

    if (listItemMatch) {
      isQuestion = true;
      questionText = listItemMatch[2].trim();
    } else if (questionPrefixMatch) {
      isQuestion = true;
      questionText = questionPrefixMatch[2].trim();
    } else if (lineWithoutBold.endsWith('?') || lineWithoutBold.toLowerCase().startsWith('how ') || lineWithoutBold.toLowerCase().startsWith('what ') || lineWithoutBold.toLowerCase().startsWith('explain ')) {
      // Direct question fallback
      isQuestion = true;
      questionText = lineWithoutBold;
    }

    // Clean up residual styling character wraps
    if (questionText) {
      // Remove leading/trailing quotes, underscores, asterisks
      questionText = questionText.replace(/^[\*_\s"'`]+/, '').replace(/[\*_\s"'`]+$/, '').trim();
    }

    if (isQuestion && questionText && !questionText.startsWith('#') && !questionText.startsWith('---') && questionText.length > 5) {
      questions.push({
        id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        category: currentCategory,
        text: questionText,
        status: 'To Do'
      });
    }
  }
  return questions;
}

// ─── Toast ───────────────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
  return (
    <div className={`toast toast-${type}`}>
      <span className="toast-icon">{icon}</span>
      {msg}
    </div>
  );
}

// ─── Scrape Status Bar ───────────────────────────────────────────────────────
function ScrapeProgress({ step, error, authWall, loggingIn, loginStatus, onLogin }) {
  if (error) {
    return (
      <div className="fetch-status" style={{ borderColor: 'rgba(255,107,107,0.3)', color: 'var(--accent-red)' }}>
        ⚠️ {error}
      </div>
    );
  }
  if (authWall) {
    return (
      <div className="fetch-status" style={{ borderColor: 'rgba(245,166,35,0.3)', color: 'var(--accent-amber)', flexDirection: 'column', alignItems: 'flex-start', gap: 8, padding: '16px' }}>
        <strong style={{ display: 'flex', alignItems: 'center', gap: 6 }}>🔐 LinkedIn Login Required</strong>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
          LinkedIn requires login to view this post. Click the button below to connect your profile once in Chrome.
        </span>

        {loginStatus && (
          <div style={{ fontSize: 11, padding: '6px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: 4, width: '100%', border: '1px solid var(--border)', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
            {loginStatus}
          </div>
        )}

        <button
          className="btn btn-secondary btn-sm"
          type="button"
          onClick={onLogin}
          disabled={loggingIn}
          style={{ marginTop: 4 }}
        >
          {loggingIn ? <span className="spinner" /> : '🔑'} Connect LinkedIn Profile
        </button>
      </div>
    );
  }
  const steps = ['Connecting to LinkedIn…', 'Extracting content…', '✅ Content loaded!'];
  return (
    <div className="fetch-status">
      <span className="spinner" />
      {steps[step] || 'Working…'}
    </div>
  );
}

// ─── Bookmarklet code (runs on linkedin.com in user's browser) ────────────────
function getBookmarkletCode(baseUrl) {
  // Minified inline script that grabs text from the LinkedIn page DOM and redirects via window.open
  const script = `
(function(){
  function getText(sels){for(var s of sels){var e=document.querySelector(s);if(e&&e.innerText&&e.innerText.trim()){return e.innerText.trim();}}return '';}
  var content=getText([
    '.update-components-text .update-components-text-view',
    '.feed-shared-update-v2__commentary',
    '.update-components-text',
    '.feed-shared-inline-show-more-text',
    '.feed-shared-text',
    '[data-test-id="main-feed-activity-card__commentary"]',
    '.break-words'
  ]);
  var author=getText([
    '.update-components-actor__title span[aria-hidden]',
    '.update-components-actor__name',
    '.feed-shared-actor__title',
    '.feed-shared-actor__name'
  ]);
  var url=window.location.href;
  if(!content){alert('Could not find post text. Make sure you are on a LinkedIn post page.');return;}
  
  var target = '${baseUrl}/api/receive-post-get?content=' + encodeURIComponent(content) + '&author=' + encodeURIComponent(author) + '&url=' + encodeURIComponent(url);
  window.open(target, '_blank');
})();`.trim().replace(/\n\s*/g, ' ');
  return `javascript:${encodeURIComponent(script)}`;
}


// ─── Tracker Task Modal ───────────────────────────────────────────────────────
function TrackerTaskModal({ task, onClose, onUpdate, tags, nvidiaKeyProp, showToast }) {
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
                  className="form-input"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', height: 38, padding: '0 8px', borderRadius: '6px' }}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {tags.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Status</label>
                <select
                  className="form-input"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', height: 38, padding: '0 8px', borderRadius: '6px' }}
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
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
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  style={{ padding: '2px 8px', fontSize: 10, display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  {analyzing ? (
                    <><span className="spinner" style={{ width: 10, height: 10 }} /> Analyzing...</>
                  ) : (
                    notes.trim() ? '🪄 Verify Answer with AI' : '💡 Ask AI for Answer'
                  )}
                </button>
              </div>
              <textarea
                className="form-textarea"
                style={{ minHeight: 180 }}
                placeholder="Write your study notes, solutions, or answers here. Click 'Verify with AI' to check your answer..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Right Column: AI Analysis */}
          {showAiPane && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, borderLeft: '1px solid var(--border)', paddingLeft: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" style={{ margin: 0, color: 'var(--primary)' }}>🧠 AI Expert Coach</label>
                {aiResponse && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '2px 8px', fontSize: 10 }}
                    onClick={() => {
                      setNotes(prev => {
                        const spacer = prev.trim() ? '\n\n---\n### AI Explanation:\n' : '';
                        return prev + spacer + aiResponse;
                      });
                      if (showToast) {
                        showToast('AI analysis appended to your notes!');
                      }
                    }}
                  >
                    💾 Copy to Notes
                  </button>
                )}
              </div>

              <div
                className="form-textarea"
                style={{
                  flex: 1,
                  minHeight: 330,
                  maxHeight: 390,
                  overflowY: 'auto',
                  background: 'rgba(0,0,0,0.2)',
                  borderColor: 'rgba(255,255,255,0.05)',
                  fontSize: 12.5,
                  lineHeight: 1.6,
                  padding: 12,
                  whiteSpace: 'pre-wrap',
                  color: 'var(--text-secondary)'
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
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}


// ─── Save Board Modal ────────────────────────────────────────────────────────
function SaveBoardModal({ onClose, onConfirm, defaultName, loading }) {
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


// ─── Add Post Modal ──────────────────────────────────────────────────────────
function AddPostModal({ onClose, onSave, tags, onAddTag, initialData, isEdit, nvidiaKeyProp, onSaveNvidiaKey }) {
  const [mode, setMode] = useState(isEdit ? 'manual' : 'bookmarklet'); // 'bookmarklet' | 'manual'
  const [url, setUrl] = useState(initialData?.url || '');
  const [author, setAuthor] = useState(initialData?.author || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [selectedTags, setSelectedTags] = useState(initialData ? getPostTags(initialData) : ['General']);
  const [newTagText, setNewTagText] = useState('');
  const [waiting, setWaiting] = useState(false);
  const [received, setReceived] = useState(!!initialData);
  const [copied, setCopied] = useState(false);
  const [baseUrl, setBaseUrl] = useState('http://localhost:3000');
  const [structuredQuestions, setStructuredQuestions] = useState(initialData?.questions || []);

  // AI Extraction State
  const [nvidiaKey, setNvidiaKey] = useState(nvidiaKeyProp || '');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBaseUrl(window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (nvidiaKeyProp) {
      setNvidiaKey(nvidiaKeyProp);
    }
  }, [nvidiaKeyProp]);

  function toggleTag(t) {
    if (selectedTags.includes(t)) {
      setSelectedTags(prev => prev.filter(x => x !== t));
    } else {
      setSelectedTags(prev => [...prev, t]);
    }
  }

  function handleSaveKey(key) {
    const cleanKey = key.trim();
    setNvidiaKey(cleanKey);
    if (onSaveNvidiaKey) {
      onSaveNvidiaKey(cleanKey);
    }
    setShowKeyInput(false);
    setExtractError(null);
  }

  async function handleExtractQuestions() {
    if (!content.trim()) return;
    setExtracting(true);
    setExtractError(null);

    try {
      const res = await fetch('/api/extract-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          availableTags: tags
        })
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.needsKey) {
          setShowKeyInput(true);
        }
        throw new Error(data.error || 'Failed to extract questions.');
      }

      if (data.questions) {
        setContent(data.questions);
      }
      if (Array.isArray(data.structuredQuestions)) {
        setStructuredQuestions(data.structuredQuestions);
      }
      if (data.company) {
        setAuthor(data.company);
      }
      if (Array.isArray(data.tags)) {
        data.tags.forEach(t => {
          onAddTag(t);
        });
        setSelectedTags(data.tags);
      }
    } catch (err) {
      setExtractError(err.message);
    } finally {
      setExtracting(false);
    }
  }

  function copyBookmarklet() {
    const code = getBookmarkletCode(baseUrl);

    function fallbackCopy() {
      try {
        const ta = document.createElement('textarea');
        ta.value = code;
        ta.style.position = 'fixed';
        ta.style.top = '0';
        ta.style.left = '0';
        ta.style.width = '2em';
        ta.style.height = '2em';
        ta.style.padding = '0';
        ta.style.border = 'none';
        ta.style.outline = 'none';
        ta.style.boxShadow = 'none';
        ta.style.background = 'transparent';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const success = document.execCommand('copy');
        document.body.removeChild(ta);
        if (success) {
          setCopied(true);
          setTimeout(() => setCopied(false), 3000);
        } else {
          throw new Error('execCommand failed');
        }
      } catch (err) {
        alert('Could not copy automatically. Please copy the code manually from the text box below.');
      }
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      }).catch(() => {
        fallbackCopy();
      });
    } else {
      fallbackCopy();
    }
  }

  // ─── No polling needed — bookmarklet form POST redirects directly ───────────

  function handleConfirm() {
    if (!content.trim() && !url.trim()) return;

    // Parse content string into structured questions array
    const parsedQ = [];
    const lines = content.split('\n');
    for (let line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const cleaned = trimmed.replace(/^[-*•\d+[\.\)]\s*/, '').trim();
      if (cleaned) {
        // Look up tag from structuredQuestions, else fall back to first selected tag
        const match = structuredQuestions.find(q => q.text === cleaned);
        parsedQ.push({
          text: cleaned,
          tag: match ? match.tag : (selectedTags[0] || 'General')
        });
      }
    }

    onSave({
      id: initialData?.id || genId(),
      url: url.trim(),
      author: author.trim() || 'Unknown Author',
      content: content.trim(),
      questions: parsedQ,
      tags: selectedTags.length > 0 ? selectedTags : ['General'],
      status: initialData?.status || 'To Read',
      addedAt: initialData?.addedAt || new Date().toISOString(),
    });
    onClose();
  }

  function handleAddCustomTag(e) {
    if (e) e.preventDefault();
    const clean = newTagText.trim();
    if (!clean) return;
    onAddTag(clean);
    if (!selectedTags.includes(clean)) {
      setSelectedTags(prev => [...prev, clean]);
    }
    setNewTagText('');
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" style={{ maxWidth: 600 }}>
        <div className="modal-header">
          <span className="modal-title" id="modal-title">{isEdit ? '✏️ Edit Post' : '➕ Add LinkedIn Post'}</span>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="modal-body">
          {/* Mode tabs */}
          {!isEdit && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
              <button
                type="button"
                className={`btn btn-sm ${mode === 'bookmarklet' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setMode('bookmarklet')}
              >🔖 Use Bookmarklet</button>
              <button
                type="button"
                className={`btn btn-sm ${mode === 'manual' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setMode('manual')}
              >✍️ Paste Manually</button>
            </div>
          )}

          {/* ─── Bookmarklet Mode ─── */}
          {mode === 'bookmarklet' && (
            <>
              {!received ? (
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, color: 'var(--text-primary)' }}>
                      📌 Step 1 — Install the bookmarklet
                    </div>
                    <ol style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8, paddingLeft: 18, margin: 0 }}>
                      <li>Click <strong>Copy Bookmarklet Code</strong> below</li>
                      <li>Show bookmarks bar: <kbd style={{ padding: '1px 5px', borderRadius: 3, background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border)', fontSize: 11 }}>Cmd+Shift+B</kbd></li>
                      <li>Right-click the bookmarks bar → <strong>Add page…</strong> or <strong>Add bookmark</strong></li>
                      <li>Set Name: <code style={{ fontSize: 11, background: 'rgba(255,255,255,0.06)', padding: '1px 4px', borderRadius: 3 }}>📋 Grab LinkedIn Post</code></li>
                      <li>Set URL: paste the copied code</li>
                      <li>Save ✅</li>
                    </ol>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
                      <button
                        type="button"
                        onClick={copyBookmarklet}
                        className="btn btn-primary"
                        style={{ width: '100%' }}
                      >
                        {copied ? '✅ Copied to Clipboard!' : '📋 Copy Bookmarklet Code'}
                      </button>

                      <span style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 4 }}>
                        or click inside the box below to select and copy manually:
                      </span>

                      <textarea
                        readOnly
                        value={getBookmarkletCode(baseUrl)}
                        onClick={(e) => e.target.select()}
                        placeholder="Bookmarklet code will load here..."
                        style={{
                          width: '100%',
                          height: '60px',
                          fontSize: '11px',
                          background: 'rgba(0,0,0,0.25)',
                          border: '1px solid var(--border)',
                          borderRadius: '6px',
                          padding: '8px',
                          color: 'var(--text-secondary)',
                          fontFamily: 'monospace',
                          resize: 'none',
                          cursor: 'pointer',
                          outline: 'none'
                        }}
                        title="Click to select all code"
                      />
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, color: 'var(--text-primary)' }}>
                      🔗 Step 2 — Open the LinkedIn post
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      Navigate to any LinkedIn post page in this browser, then click the <strong>📋 Grab LinkedIn Post</strong> bookmark.
                      A new tab will immediately open with the content auto-filled and ready to save!
                    </p>
                  </div>
                </div>
              ) : (
                <div style={{ background: 'rgba(52,216,139,0.08)', border: '1px solid rgba(52,216,139,0.2)', borderRadius: 'var(--radius-md)', padding: 14, fontSize: 13, color: 'var(--accent-green)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  ✅ Post content received! Fill in the details below and click "Add to Sheet".
                </div>
              )}
            </>
          )}

          {/* ─── Manual Mode ─── */}
          {mode === 'manual' && (
            <div className="form-group">
              <label className="form-label" htmlFor="post-url-manual">LinkedIn Post URL (optional)</label>
              <input
                id="post-url-manual"
                className="form-input"
                type="url"
                placeholder="https://www.linkedin.com/posts/…"
                value={url}
                onChange={e => setUrl(e.target.value)}
              />
            </div>
          )}

          {/* Company — shown in both modes once content arrived or in manual mode */}
          {(received || mode === 'manual') && (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="post-author">Company Name</label>
                <input
                  id="post-author"
                  className="form-input"
                  type="text"
                  placeholder="e.g. Google"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="post-content">
                  Post Content
                  {received && <span style={{ color: 'var(--accent-green)', fontWeight: 600, marginLeft: 6, fontSize: 11 }}>✅ Auto-filled</span>}
                </label>
                <textarea
                  id="post-content"
                  className="form-textarea"
                  placeholder="Paste the LinkedIn post content here…"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  style={received ? { borderColor: 'rgba(52,216,139,0.3)', minHeight: 140 } : { minHeight: 140 }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                  <span className="form-hint">{content.length} characters</span>

                  {content.trim() && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {showKeyInput ? (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                          <input
                            type="password"
                            placeholder="Enter Custom API Key..."
                            className="form-input"
                            defaultValue={nvidiaKey}
                            style={{ width: 160, height: 26, fontSize: 11, padding: '2px 8px', background: 'transparent', border: 'none', color: 'var(--text-primary)' }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveKey(e.target.value);
                              }
                            }}
                          />
                          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Press Enter</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={handleExtractQuestions}
                          disabled={extracting}
                          style={{ padding: '4px 10px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                          {extracting ? <><span className="spinner" style={{ width: 10, height: 10 }} /> Extracting...</> : '🪄 Extract Questions only'}
                        </button>
                      )}

                      {!showKeyInput && (
                        <button
                          type="button"
                          onClick={() => setShowKeyInput(true)}
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 10, cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          {nvidiaKey ? 'Change Key' : 'Custom Key'}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {extractError && (
                  <div style={{ color: '#ff6b6b', fontSize: 11, marginTop: 4, fontWeight: 500 }}>
                    ⚠️ {extractError}
                  </div>
                )}
              </div>
            </>
          )}

          {/* URL field also shown in bookmarklet mode once received */}
          {received && mode === 'bookmarklet' && (
            <div className="form-group">
              <label className="form-label" htmlFor="post-url-bm">LinkedIn Post URL</label>
              <input
                id="post-url-bm"
                className="form-input"
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
              />
            </div>
          )}

          {/* Tag Selector & Creator */}
          <div className="form-group">
            <label className="form-label">Topic Tags (select multiple)</label>
            <div className="tag-selector" role="group" aria-label="Select topic tags">
              {tags.map((t) => (
                <button
                  key={t}
                  type="button"
                  className="tag-option"
                  style={selectedTags.includes(t) ? getTagStyle(t) : {}}
                  onClick={() => toggleTag(t)}
                  id={`tag-option-${t}`}
                >
                  {t}
                </button>
              ))}
            </div>
            <form onSubmit={handleAddCustomTag} style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input
                type="text"
                className="form-input"
                placeholder="Create custom tag…"
                value={newTagText}
                onChange={(e) => setNewTagText(e.target.value)}
                style={{ flex: 1, padding: '8px 12px', fontSize: 13 }}
              />
              <button type="submit" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: 13 }}>
                + Add Tag
              </button>
            </form>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose} id="cancel-add">Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={!content.trim() && !url.trim()}
            id="confirm-add"
          >
            {isEdit ? '💾 Save Changes' : '✅ Add to Sheet'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── View Post Modal ─────────────────────────────────────────────────────────
function ViewPostModal({ post, onClose }) {
  const [copied, setCopied] = useState(false);

  function copyContent() {
    navigator.clipboard.writeText(post.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="view-modal-title" style={{ maxWidth: 650 }}>
        <div className="modal-header">
          <span className="modal-title" id="view-modal-title">📖 View Post Details</span>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Header info */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{post.author}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Added on {formatDate(post.addedAt)}</div>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className={`status-badge ${STATUS_CLASS[post.status]}`} style={{ cursor: 'default' }}>
                <span className="status-dot" />
                {STATUS_EMOJI[post.status]} {post.status}
              </span>
            </div>
          </div>

          {/* Tags */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {getPostTags(post).map(t => (
              <span key={t} className="tag" style={{ ...getTagStyle(t), padding: '4px 10px', fontSize: 12 }}>{t}</span>
            ))}
          </div>

          {/* URL */}
          {post.url && (
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', marginBottom: 4 }}>LinkedIn Link</span>
              <a href={post.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-blue)', fontSize: 13, wordBreak: 'break-all', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                🔗 {post.url}
              </a>
            </div>
          )}

          {/* Content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Post Content / Questions</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={copyContent}
                style={{ padding: '4px 10px', fontSize: 11 }}
              >
                {copied ? '✅ Copied' : '📋 Copy Content'}
              </button>
            </div>

            <div style={{
              background: 'rgba(0,0,0,0.2)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '16px',
              maxHeight: '350px',
              overflowY: 'auto',
              whiteSpace: 'pre-wrap',
              fontSize: '14px',
              lineHeight: '1.6',
              color: 'var(--text-secondary)',
              fontFamily: 'inherit'
            }}>
              {post.content}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [tags, setTags] = useState(DEFAULT_TAGS);
  const [showModal, setShowModal] = useState(false);
  const [initialImportData, setInitialImportData] = useState(null);
  const [viewingPost, setViewingPost] = useState(null);
  const [postToEdit, setPostToEdit] = useState(null);

  // Prep Generator Tab State
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'resources' | 'prep' | 'tracker'
  const [prepSelectedTags, setPrepSelectedTags] = useState([]);
  const [prepKeywords, setPrepKeywords] = useState('');
  const [prepGuide, setPrepGuide] = useState(null);
  const [copiedPrep, setCopiedPrep] = useState(false);
  const [generatingPrep, setGeneratingPrep] = useState(false);

  // Progress Tracker Tab State
  const [trackerBoards, setTrackerBoards] = useState([]);
  const [activeBoardId, setActiveBoardId] = useState('default');
  const [showSaveBoardModal, setShowSaveBoardModal] = useState(false);
  const [isTrackingLoading, setIsTrackingLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionCategory, setNewQuestionCategory] = useState('General');
  const [showAddQuestionInline, setShowAddQuestionInline] = useState(false);
  const [activeTrackerTask, setActiveTrackerTask] = useState(null);

  const activeBoard = trackerBoards.find(b => b.id === activeBoardId) || trackerBoards[0];
  const activeQuestions = activeBoard ? activeBoard.questions : [];

  function updateActiveBoardQuestions(updater) {
    setTrackerBoards(prev => prev.map(board => {
      if (board.id === activeBoardId || (!activeBoardId && board.id === 'default')) {
        const nextQuestions = typeof updater === 'function' ? updater(board.questions) : updater;
        return { ...board, questions: nextQuestions };
      }
      return board;
    }));
  }

  const [search, setSearch] = useState('');
  const [filterTag, setFilterTag] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [sortCol, setSortCol] = useState('addedAt');
  const [sortDir, setSortDir] = useState('desc');
  const [toast, setToast] = useState(null);
  const [nvidiaKey, setNvidiaKey] = useState('');
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [boardsLoaded, setBoardsLoaded] = useState(false);

  function toggleTheme() {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('interviewprep_theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  }

  // Load from project files & check URL import
  useEffect(() => {
    // 0. Load theme from localStorage
    const savedTheme = localStorage.getItem('interviewprep_theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);

    // 1. Fetch initial data from backend API
    fetch('/api/posts')
      .then(res => res.json())
      .then(data => {
        let loadedPosts = [];
        let loadedTags = [];
        let loadedKey = '';

        if (data.success) {
          loadedPosts = data.posts || [];
          loadedTags = data.tags || [];
          if (data.config && data.config.nvidiaKey) {
            loadedKey = data.config.nvidiaKey;
          }
        }

        // 2. Browser LocalStorage Migration Check
        if (loadedPosts.length === 0 && typeof window !== 'undefined') {
          try {
            const savedPostsStr = localStorage.getItem('interviewprep_posts');
            const savedTagsStr = localStorage.getItem('interviewprep_tags');
            const savedKeyStr = localStorage.getItem('interviewprep_nvidia_key') || localStorage.getItem('interviewprep_gemini_key') || '';

            const savedPosts = savedPostsStr ? JSON.parse(savedPostsStr) : [];
            const savedTags = savedTagsStr ? JSON.parse(savedTagsStr) : [];

            if (savedPosts.length > 0) {
              console.log('Migrating localStorage data to project files...');
              loadedPosts = savedPosts;
              if (savedTags.length > 0) loadedTags = savedTags;
              if (savedKeyStr) loadedKey = savedKeyStr;

              // Save to project files via POST
              fetch('/api/posts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  posts: loadedPosts,
                  tags: loadedTags,
                  config: { nvidiaKey: loadedKey }
                })
              }).catch(err => console.error('Migration save error:', err));
            }
          } catch (e) {
            console.error('LocalStorage migration failed:', e);
          }
        }

        // 3. Set React states
        setPosts(loadedPosts);
        if (loadedTags.length > 0) setTags(loadedTags);
        if (loadedKey) setNvidiaKey(loadedKey);

        setMounted(true);
      })
      .catch(err => {
        console.error('Failed to load project files:', err);
        setMounted(true);
      });

    // 2. Check for bookmarklet import_id
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const importId = params.get('import_id');
      if (importId) {
        fetch(`/api/pending-post?id=${importId}`)
          .then(res => {
            if (res.ok) return res.json();
            throw new Error('Failed to fetch pending post');
          })
          .then(data => {
            if (data && data.content) {
              setInitialImportData(data);
              setShowModal(true);

              // Automatically register any new suggested tags into the main tags list!
              if (Array.isArray(data.tags)) {
                setTags(prev => {
                  const merged = [...prev];
                  let changed = false;
                  data.tags.forEach(t => {
                    if (t && !merged.includes(t)) {
                      merged.push(t);
                      changed = true;
                    }
                  });
                  return merged;
                });
              }

              // Clean up the URL query params so they don't reload it on refresh
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          })
          .catch(err => console.error(err));
      }
    }
  }, []);

  // Persist posts to project files
  useEffect(() => {
    if (!mounted) return;
    fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ posts })
    }).catch(err => console.error('Save posts error:', err));
  }, [posts, mounted]);

  // Persist tags to project files
  useEffect(() => {
    if (!mounted) return;
    fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags })
    }).catch(err => console.error('Save tags error:', err));
  }, [tags, mounted]);

  // Load tracker boards from project file (data/boards.json) on mount
  useEffect(() => {
    if (!mounted) return;

    fetch('/api/boards')
      .then(res => res.json())
      .then(data => {
        if (!data.success) throw new Error(data.error || 'Failed to load boards');

        let boards = data.boards || [];

        // Migration: if server only has the empty default board, check localStorage
        const isEmptyDefault = boards.length === 1 && boards[0].id === 'default' && boards[0].questions.length === 0;
        if (isEmptyDefault && typeof window !== 'undefined') {
          try {
            const lsBoards = localStorage.getItem('interviewprep_boards');
            if (lsBoards) {
              const parsed = JSON.parse(lsBoards);
              if (Array.isArray(parsed) && parsed.length > 0) {
                boards = parsed;
                // Migrate: save to project file
                fetch('/api/boards', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ boards })
                }).catch(err => console.error('Board migration save error:', err));
                localStorage.removeItem('interviewprep_boards');
                console.log('Migrated tracker boards from localStorage to data/boards.json');
              }
            }
          } catch (e) {
            console.error('Board localStorage migration failed:', e);
          }
        }

        setTrackerBoards(boards);
        if (boards.length > 0) {
          const hasActive = boards.some(b => b.id === activeBoardId);
          if (!hasActive) setActiveBoardId(boards[0].id);
        }

        // Mark boards as loaded so the save effect can run
        setBoardsLoaded(true);
      })
      .catch(err => {
        console.error('Failed to load tracker boards:', err);
        // Even on error, allow saves to work
        setBoardsLoaded(true);
      });
  }, [mounted]);

  // Save tracker boards to project file whenever they change
  useEffect(() => {
    if (!mounted || !boardsLoaded) return;
    fetch('/api/boards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ boards: trackerBoards })
    }).catch(err => console.error('Save boards error:', err));
  }, [trackerBoards, mounted, boardsLoaded]);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
  }, []);

  function addPost(post) {
    setPosts((prev) => [post, ...prev]);
    showToast('Post added to your sheet!');
  }

  function savePost(updatedPost) {
    if (!Array.isArray(updatedPost.questions) || updatedPost.questions.length === 0) {
      const parsedQuestions = [];
      const lines = (updatedPost.content || '').split('\n');
      for (let line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const cleaned = trimmed.replace(/^[-*•\d+[\.\)]\s*/, '').trim();
        if (cleaned) {
          parsedQuestions.push({
            text: cleaned,
            tag: updatedPost.tags?.[0] || 'General'
          });
        }
      }
      updatedPost.questions = parsedQuestions;
    }
    setPosts((prev) => prev.map((p) => p.id === updatedPost.id ? updatedPost : p));
    showToast('Post updated successfully!');
  }

  function saveNvidiaKey(key) {
    setNvidiaKey(key);
    fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: { nvidiaKey: key } })
    }).catch(err => console.error('Save config error:', err));
  }

  async function handleGeneratePrep() {
    const cleanKeywords = prepKeywords.trim();
    if (prepSelectedTags.length === 0 && !cleanKeywords) {
      showToast('Please select at least one tag or enter a keyword.', 'error');
      return;
    }

    // 1. Gather all individual questions from posts matching tags or keywords locally
    const matchedQuestions = [];
    posts.forEach(post => {
      const qList = getPostQuestions(post);
      qList.forEach(q => {
        const hasTagMatch = prepSelectedTags.includes(q.tag);

        let hasKeywordMatch = false;
        if (cleanKeywords) {
          const words = cleanKeywords.toLowerCase().split(',').map(w => w.trim()).filter(Boolean);
          const textLower = q.text.toLowerCase();
          hasKeywordMatch = words.some(w => textLower.includes(w));
        }

        if (hasTagMatch || hasKeywordMatch) {
          matchedQuestions.push({
            text: q.text,
            tag: q.tag,
            company: post.author || 'Company'
          });
        }
      });
    });

    if (matchedQuestions.length === 0) {
      showToast('No matching questions found in your sheet.', 'error');
      setPrepGuide(null);
      return;
    }

    // 2. Concatenate only the matched individual questions for LLM consolidation
    const contentToConsolidate = matchedQuestions
      .map((q, idx) => `[Source: ${q.company}] [Topic: ${q.tag}]\n- ${q.text}`)
      .join('\n\n');

    setGeneratingPrep(true);
    setPrepGuide(null);

    try {
      const res = await fetch('/api/generate-study-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: contentToConsolidate,
          topics: prepSelectedTags.join(', ') || cleanKeywords,
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate consolidated study guide.');
      }

      if (data.guide) {
        setPrepGuide(data.guide);
        showToast('Unified study guide generated successfully!');
      }
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setGeneratingPrep(false);
    }
  }

  function copyPrepGuide() {
    if (!prepGuide) return;
    navigator.clipboard.writeText(prepGuide).then(() => {
      setCopiedPrep(true);
      showToast('Copied study guide to clipboard!');
      setTimeout(() => setCopiedPrep(false), 2000);
    });
  }

  function downloadPrepMarkdown() {
    if (!prepGuide) return;
    const blob = new Blob([prepGuide], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interview-prep-guide-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded study guide as Markdown!');
  }

  function handleStartTracking() {
    if (!prepGuide) return;
    setShowSaveBoardModal(true);
  }

  async function handleConfirmStartTracking(boardName) {
    if (!prepGuide) return;
    const parsed = parseQuestionsFromMarkdown(prepGuide);
    if (parsed.length === 0) {
      showToast('No questions found in the generated guide to track.', 'error');
      setShowSaveBoardModal(false);
      return;
    }

    setIsTrackingLoading(true);

    try {
      const res = await fetch('/api/extract-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionsToPolish: parsed.map(q => q.text),
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to polish questions.');
      }

      const polishedTexts = data.polishedQuestions || [];
      const questions = parsed.map((q, idx) => ({
        id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        text: polishedTexts[idx] || q.text,
        category: q.category || 'General',
        status: 'To Do',
        notes: '',
        aiAnalysis: ''
      }));

      const newBoard = {
        id: `board_${Date.now()}`,
        name: boardName,
        questions
      };

      setTrackerBoards(prev => {
        // Remove default board if empty
        const filteredPrev = prev.filter(b => !(b.id === 'default' && b.questions.length === 0));
        return [...filteredPrev, newBoard];
      });
      setActiveBoardId(newBoard.id);
      setActiveTab('tracker');
      showToast(`Successfully created study board "${boardName}" with ${questions.length} polished questions!`);
      setShowSaveBoardModal(false);
    } catch (err) {
      console.error('Failed to track questions:', err);
      showToast(`Error polishing questions: ${err.message}`, 'error');
    } finally {
      setIsTrackingLoading(false);
    }
  }

  // Automatically add any custom tags in loaded posts back to tags list
  useEffect(() => {
    if (posts.length > 0) {
      let updated = false;
      const nextTags = [...tags];
      posts.forEach(p => {
        const pTags = getPostTags(p);
        pTags.forEach(t => {
          if (t && !nextTags.includes(t)) {
            nextTags.push(t);
            updated = true;
          }
        });
      });
      if (updated) {
        setTags(nextTags);
      }
    }
  }, [posts]);

  function deletePost(id) {
    setPosts((prev) => prev.filter((p) => p.id !== id));
    showToast('Post removed.', 'error');
  }

  function addTag(newTag) {
    if (!tags.includes(newTag)) {
      setTags((prev) => [...prev, newTag]);
      showToast(`Tag "${newTag}" created successfully!`);
    }
  }

  // Filter + Sort
  const filtered = posts
    .filter((p) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        (p.author || '').toLowerCase().includes(q) ||
        (p.content || '').toLowerCase().includes(q) ||
        getPostTags(p).some(t => t.toLowerCase().includes(q)) ||
        (p.url || '').toLowerCase().includes(q);
      const matchTag = filterTag === 'All' || getPostTags(p).includes(filterTag);
      return matchSearch && matchTag;
    })
    .sort((a, b) => {
      let av = a[sortCol] || '', bv = b[sortCol] || '';
      if (sortDir === 'asc') return av > bv ? 1 : -1;
      return av < bv ? 1 : -1;
    });

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div>
          {/* Logo (Acts as Sidebar Collapse Toggler) */}
          <div 
            className="sidebar-logo" 
            style={{ 
              margin: '0 0 24px 0', 
              padding: '0 8px', 
              cursor: 'pointer',
              userSelect: 'none'
            }}
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            🎯 <span>SDET Co-Pilot</span>
          </div>

          
          <nav className="sidebar-menu">
            <div 
              className={`sidebar-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
              title={sidebarCollapsed ? 'Dashboard' : ''}
            >
              📊 <span>Dashboard</span>
            </div>
            <div 
              className={`sidebar-item ${activeTab === 'resources' ? 'active' : ''}`}
              onClick={() => setActiveTab('resources')}
              title={sidebarCollapsed ? 'Study Resources' : ''}
            >
              📋 <span>Study Resources</span>
            </div>
            <div 
              className={`sidebar-item ${activeTab === 'prep' ? 'active' : ''}`}
              onClick={() => setActiveTab('prep')}
              title={sidebarCollapsed ? 'Prep Generator' : ''}
            >
              🎯 <span>Prep Generator</span>
            </div>
            <div 
              className={`sidebar-item ${activeTab === 'tracker' ? 'active' : ''}`}
              onClick={() => setActiveTab('tracker')}
              title={sidebarCollapsed ? 'Progress Tracker' : ''}
            >
              📅 <span>Progress Tracker</span>
            </div>
          </nav>
        </div>

        <div className="sidebar-footer">
          {/* Theme Switcher inside sidebar */}
          {!sidebarCollapsed ? (
            <button
              type="button"
              className="theme-toggle-btn"
              onClick={toggleTheme}
              style={{ width: '100%', justifyContent: 'center', gap: 8 }}
            >
              {theme === 'dark' ? '🌙 Night Mode' : '☀️ Day Mode'}
            </button>
          ) : (
            <button
              type="button"
              className="theme-toggle-btn"
              onClick={toggleTheme}
              style={{ width: 42, height: 42, borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}
              title={theme === 'dark' ? 'Switch to Day Mode' : 'Switch to Night Mode'}
            >
              {theme === 'dark' ? '🌙' : '☀️'}
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={`main-content ${sidebarCollapsed ? 'collapsed' : ''}`}>
        {activeTab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Header/Hero Section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div className="hero-badge" style={{ marginBottom: 12, display: 'inline-flex' }}>
                  <span className="badge-glow"></span>
                  <span className="badge-text">🚀 SDET Interview Prep Co-Pilot</span>
                </div>
                <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8, color: 'var(--text-primary)' }}>
                  Welcome back to your Study Dashboard
                </h1>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                  Track your progress, build study guides, and review polished technical interview questions.
                </p>
              </div>

              {/* Quick Actions */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className="btn btn-success"
                  onClick={() => posts.length && downloadCSV(posts)}
                  disabled={posts.length === 0}
                  id="export-csv-btn-dashboard"
                  title="Export all posts to CSV"
                >
                  ⬇ Export CSV
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => setShowModal(true)}
                  id="add-post-btn-dashboard"
                >
                  + Add Post
                </button>
              </div>
            </div>

            {/* Resources Stats Summary */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
              gap: 16 
            }}>
              <div className="dashboard-stat-card">
                <div className="dashboard-stat-icon">🏢</div>
                <div>
                  <span className="dashboard-stat-label">Target Companies</span>
                  <div className="dashboard-stat-value">
                    {new Set(posts.map(p => p.author.toLowerCase().trim())).size}
                  </div>
                </div>
              </div>

              <div className="dashboard-stat-card">
                <div className="dashboard-stat-icon">📰</div>
                <div>
                  <span className="dashboard-stat-label">Resource Posts</span>
                  <div className="dashboard-stat-value">{posts.length}</div>
                </div>
              </div>

              <div className="dashboard-stat-card">
                <div className="dashboard-stat-icon">❓</div>
                <div>
                  <span className="dashboard-stat-label">Extracted Questions</span>
                  <div className="dashboard-stat-value">
                    {posts.reduce((sum, p) => sum + (p.questions?.length || 0), 0)}
                  </div>
                </div>
              </div>

              <div className="dashboard-stat-card">
                <div className="dashboard-stat-icon">📅</div>
                <div>
                  <span className="dashboard-stat-label">Study Boards</span>
                  <div className="dashboard-stat-value">{trackerBoards.filter(b => b.questions.length > 0).length}</div>
                </div>
              </div>
            </div>

            {/* Progress & Charts Section */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', 
              gap: 20 
            }}>
              {/* Overall Progress Tracker Summary */}
              <div className="dashboard-section">
                <h3 className="dashboard-section-title">📊 Overall Study Progress</h3>
                
                {trackerBoards.flatMap(b => b.questions || []).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)', fontSize: 13 }}>
                    No questions in Progress Tracker yet. Import a guide or add questions to view stats.
                  </div>
                ) : (() => {
                  const allQuestions = trackerBoards.flatMap(b => b.questions || []);
                  const total = allQuestions.length;
                  const todo = allQuestions.filter(q => q.status === 'To Do').length;
                  const progress = allQuestions.filter(q => q.status === 'In Progress').length;
                  const done = allQuestions.filter(q => q.status === 'Done').length;
                  const pct = Math.round((done / total) * 100);

                  return (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                        <div style={{
                          width: 80,
                          height: 80,
                          borderRadius: '50%',
                          background: `conic-gradient(var(--accent-green) ${pct}%, var(--border) 0)`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative'
                        }}>
                          <div style={{
                            width: 66,
                            height: 66,
                            borderRadius: '50%',
                            background: 'var(--bg-card)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 16,
                            fontWeight: 700
                          }}>
                            {pct}%
                          </div>
                        </div>

                        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <div style={{ background: 'rgba(0,0,0,0.1)', padding: '8px 12px', borderRadius: 8 }}>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Total Cards</span>
                            <strong style={{ fontSize: 15 }}>{total}</strong>
                          </div>
                          <div style={{ background: 'var(--accent-blue-dim)', padding: '8px 12px', borderRadius: 8 }}>
                            <span style={{ fontSize: 11, color: 'var(--accent-blue)', textTransform: 'uppercase', display: 'block' }}>To Do</span>
                            <strong style={{ fontSize: 15, color: 'var(--accent-blue)' }}>{todo}</strong>
                          </div>
                          <div style={{ background: 'var(--accent-amber-dim)', padding: '8px 12px', borderRadius: 8 }}>
                            <span style={{ fontSize: 11, color: 'var(--accent-amber)', textTransform: 'uppercase', display: 'block' }}>In Progress</span>
                            <strong style={{ fontSize: 15, color: 'var(--accent-amber)' }}>{progress}</strong>
                          </div>
                          <div style={{ background: 'var(--accent-green-dim)', padding: '8px 12px', borderRadius: 8 }}>
                            <span style={{ fontSize: 11, color: 'var(--accent-green)', textTransform: 'uppercase', display: 'block' }}>Completed</span>
                            <strong style={{ fontSize: 15, color: 'var(--accent-green)' }}>{done}</strong>
                          </div>
                        </div>
                      </div>

                      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', marginBottom: 8 }}>Progress Bar</span>
                        <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', background: 'var(--border)' }}>
                          <div style={{ width: `${(todo / total) * 100}%`, background: 'var(--accent-blue)' }} title={`To Do: ${todo}`} />
                          <div style={{ width: `${(progress / total) * 100}%`, background: 'var(--accent-amber)' }} title={`In Progress: ${progress}`} />
                          <div style={{ width: `${(done / total) * 100}%`, background: 'var(--accent-green)' }} title={`Done: ${done}`} />
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Topic Distribution Chart */}
              <div className="dashboard-section">
                <h3 className="dashboard-section-title">🏷️ Top Study Categories</h3>
                
                {trackerBoards.flatMap(b => b.questions || []).length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)', fontSize: 13 }}>
                    No topics categorized yet. Polished question tags will be listed here.
                  </div>
                ) : (() => {
                  const allQuestions = trackerBoards.flatMap(b => b.questions || []);
                  const total = allQuestions.length;
                  const categoryCounts = {};
                  allQuestions.forEach(q => {
                    categoryCounts[q.category] = (categoryCounts[q.category] || 0) + 1;
                  });
                  const categoriesSorted = Object.entries(categoryCounts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 4);

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {categoriesSorted.map(([category, count]) => {
                        const pct = Math.round((count / total) * 100);
                        return (
                          <div key={category}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                              <span style={{ fontWeight: 600 }}>{category}</span>
                              <span style={{ color: 'var(--text-muted)' }}>{count} questions ({pct}%)</span>
                            </div>
                            <div style={{ background: 'var(--border)', height: 6, borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ 
                                background: 'linear-gradient(90deg, var(--accent-blue) 0%, var(--accent-purple) 100%)', 
                                width: `${pct}%`, 
                                height: '100%', 
                                borderRadius: 3 
                              }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Target Study Boards Completion Progress */}
            <div className="dashboard-section">
              <h3 className="dashboard-section-title">📂 Active Study Boards Readiness</h3>

              {trackerBoards.filter(b => b.questions.length > 0).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)', fontSize: 13 }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>🎯</div>
                  No study boards created yet. Use <strong>Prep Generator</strong> → <strong>Track Study Progress</strong> to create your first board!
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
                  {trackerBoards.filter(b => b.questions.length > 0).map(board => {
                    const total = board.questions.length;
                    const done = board.questions.filter(q => q.status === 'Done').length;
                    const inProgress = board.questions.filter(q => q.status === 'In Progress').length;
                    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                    return (
                      <div 
                        key={board.id} 
                        className="dashboard-board-card"
                        onClick={() => {
                          setActiveBoardId(board.id);
                          setActiveTab('tracker');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, alignItems: 'flex-start' }}>
                          <span style={{ fontWeight: 700, fontSize: 14 }}>📂 {board.name}</span>
                          <span style={{ 
                            fontSize: 11, 
                            background: pct === 100 ? 'var(--accent-green-dim)' : 'rgba(255,255,255,0.06)', 
                            color: pct === 100 ? 'var(--accent-green)' : 'var(--text-muted)',
                            padding: '2px 8px', 
                            borderRadius: 99,
                            fontWeight: 600
                          }}>
                            {pct === 100 ? '✅ Complete' : `${pct}%`}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 10, fontSize: 11, color: 'var(--text-secondary)' }}>
                          <span>{total} questions</span>
                          <span>·</span>
                          <span style={{ color: 'var(--accent-amber)' }}>{inProgress} in progress</span>
                          <span>·</span>
                          <span style={{ color: 'var(--accent-green)' }}>{done} done</span>
                        </div>
                        <div style={{ background: 'var(--border)', height: 5, borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ 
                            width: `${pct}%`, 
                            height: '100%', 
                            background: pct === 100 
                              ? 'var(--accent-green)' 
                              : 'linear-gradient(90deg, var(--accent-blue), var(--accent-green))', 
                            borderRadius: 3,
                            transition: 'width 0.4s ease'
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'resources' && (
          <>
            {/* Resources Summary Stats */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
              gap: 16, 
              marginBottom: 24 
            }}>
              <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 14
              }}>
                <div style={{ fontSize: 24 }}>🏢</div>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Companies</span>
                  <strong style={{ fontSize: 18, color: 'var(--text-primary)' }}>
                    {new Set(posts.map(p => p.author.toLowerCase().trim())).size}
                  </strong>
                </div>
              </div>

              <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 14
              }}>
                <div style={{ fontSize: 24 }}>📰</div>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>LinkedIn Posts</span>
                  <strong style={{ fontSize: 18, color: 'var(--text-primary)' }}>{posts.length}</strong>
                </div>
              </div>

              <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 14
              }}>
                <div style={{ fontSize: 24 }}>❓</div>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: 600 }}>Total Questions</span>
                  <strong style={{ fontSize: 18, color: 'var(--text-primary)' }}>
                    {posts.reduce((sum, p) => sum + (p.questions?.length || 0), 0)}
                  </strong>
                </div>
              </div>
            </div>

            {/* Toolbar */}
            <div className="toolbar">
              <div className="search-wrap">
                <span className="search-icon">🔍</span>
                <input
                  id="search-input"
                  className="search-input"
                  type="search"
                  placeholder="Search posts, companies, tags…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <select
                id="filter-tag"
                className="filter-select"
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
              >
                <option value="All">All Tags</option>
                {tags.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              {filtered.length < posts.length && (
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Showing {filtered.length} of {posts.length}
                </span>
              )}
            </div>

            {/* Dashboard Cards Grid */}
            {posts.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <h3>Your sheet is empty</h3>
                <p>Add your first LinkedIn post to get started.</p>
                <button className="btn btn-primary" onClick={() => setShowModal(true)} id="empty-add-btn">
                  + Add Your First Post
                </button>
              </div>
            ) : (
              <div className="dashboard-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: 20,
                marginTop: 20
              }}>
                {filtered.length === 0 ? (
                  <div style={{
                    gridColumn: '1 / -1',
                    textAlign: 'center',
                    padding: '60px 20px',
                    color: 'var(--text-muted)',
                    background: 'var(--bg-card)',
                    border: '1px dashed var(--border)',
                    borderRadius: 12
                  }}>
                    No posts match your filters.
                  </div>
                ) : (
                  filtered.map((post) => (
                    <div key={post.id} className="dashboard-card" style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      padding: 20,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 14,
                      position: 'relative',
                      boxShadow: 'var(--shadow-card)',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer'
                    }}
                    onClick={() => setViewingPost(post)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent-blue)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                    >
                      {/* Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="author-avatar" style={{ margin: 0 }}>{initials(post.author)}</div>
                          <div>
                            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>
                              {post.author}
                            </span>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              {formatDate(post.addedAt)}
                            </span>
                          </div>
                        </div>

                        {post.url && (
                          <a
                            href={post.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              fontSize: 12,
                              color: 'var(--text-muted)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              background: 'rgba(255,255,255,0.04)',
                              border: '1px solid var(--border)',
                              textDecoration: 'none'
                            }}
                            title="Open LinkedIn Post"
                          >
                            🔗
                          </a>
                        )}
                      </div>

                      {/* Content Preview */}
                      <div style={{ 
                        fontSize: 13, 
                        lineHeight: 1.6, 
                        color: 'var(--text-secondary)',
                        flexGrow: 1,
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 4,
                        WebkitBoxOrient: 'vertical',
                        whiteSpace: 'pre-wrap',
                        maxHeight: 84
                      }}>
                        {post.content}
                      </div>

                      {/* Questions Count Indicator */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 12,
                        color: 'var(--accent-blue)',
                        background: 'var(--accent-blue-dim)',
                        width: 'fit-content',
                        padding: '4px 10px',
                        borderRadius: 6,
                        fontWeight: 600
                      }}>
                        ❓ {post.questions?.length || 0} Questions Extracted
                      </div>

                      {/* Divider */}
                      <div style={{ height: '1px', background: 'var(--border)' }} />

                      {/* Footer Actions and Tags */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                        {/* Tags */}
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', overflow: 'hidden', height: 22, flexGrow: 1 }}>
                          {getPostTags(post).slice(0, 2).map(t => (
                            <span key={t} className="tag" style={{ ...getTagStyle(t), padding: '2px 8px', fontSize: 10 }}>{t}</span>
                          ))}
                          {getPostTags(post).length > 2 && (
                            <span style={{ fontSize: 10, color: 'var(--text-muted)', alignSelf: 'center' }}>
                              +{getPostTags(post).length - 2}
                            </span>
                          )}
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
                          <button
                            className="btn btn-secondary btn-sm btn-icon"
                            onClick={() => setViewingPost(post)}
                            title="View details"
                            id={`view-${post.id}`}
                            aria-label={`View post by ${post.author}`}
                          >
                            👁
                          </button>
                          <button
                            className="btn btn-secondary btn-sm btn-icon"
                            onClick={() => setPostToEdit(post)}
                            title="Edit post"
                            id={`edit-${post.id}`}
                            aria-label={`Edit post by ${post.author}`}
                          >
                            ✏️
                          </button>
                          <button
                            className="btn btn-danger btn-sm btn-icon"
                            onClick={() => deletePost(post.id)}
                            title="Delete post"
                            id={`delete-${post.id}`}
                            aria-label={`Delete post by ${post.author}`}
                          >
                            🗑
                          </button>
                        </div>
                      </div>

                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}

        {activeTab === 'prep' && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, color: 'var(--text-primary)' }}>Consolidated Interview Prep Guide</h2>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Select topics and type keywords to scan your sheet and compile all matching questions into a single study guide.</p>
            </div>

            {/* Step 1: Select tags */}
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>1. Select Study Topics (Tags)</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {tags.map(t => {
                  const active = prepSelectedTags.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setPrepSelectedTags(prev => active ? prev.filter(x => x !== t) : [...prev, t]);
                      }}
                      className="tag-option"
                      style={active ? getTagStyle(t) : { border: '1px solid var(--border)', background: 'transparent', opacity: 0.6 }}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Keywords */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="prep-keywords" style={{ fontSize: 12, textTransform: 'uppercase' }}>2. Search Keywords (comma-separated, optional)</label>
              <input
                id="prep-keywords"
                className="form-input"
                type="text"
                placeholder="e.g. exceptions, merge, WebDriver"
                value={prepKeywords}
                onChange={e => setPrepKeywords(e.target.value)}
              />
            </div>

            {/* Generate Button */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleGeneratePrep}
                style={{ padding: '10px 24px' }}
              >
                🔍 Generate Study Guide
              </button>
              {prepGuide && (
                <>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={copyPrepGuide}
                  >
                    {copiedPrep ? '✅ Copied!' : '📋 Copy Guide'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={downloadPrepMarkdown}
                  >
                    ⬇ Download (Markdown)
                  </button>
                  <button
                    type="button"
                    className="btn btn-success"
                    onClick={handleStartTracking}
                  >
                    🎯 Track Study Progress
                  </button>
                </>
              )}
            </div>

            {/* Loading */}
            {generatingPrep && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24, textAlign: 'center', padding: '40px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <span className="spinner" style={{ width: 32, height: 32 }} />
                <div style={{ fontSize: 14, fontWeight: 600 }}>AI is consolidating, de-duplicating and organizing questions...</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>This can take up to 10 seconds.</div>
              </div>
            )}

            {/* Results */}
            {prepGuide && !generatingPrep && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Consolidated Study Guide</span>

                <div style={{
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '24px',
                  maxHeight: '550px',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                  fontSize: '14px',
                  lineHeight: '1.7',
                  color: 'var(--text-secondary)',
                  fontFamily: 'inherit'
                }}>
                  {prepGuide}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'tracker' && (
          <div className="tracker-container">
            {/* Boards Sub-tabs + Actions row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
              {/* Tabs */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: 1 }}>
                {trackerBoards.map(board => (
                  <div 
                    key={board.id} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      background: activeBoardId === board.id ? 'var(--accent-blue-dim)' : 'var(--bg-card)',
                      border: '1px solid',
                      borderColor: activeBoardId === board.id ? 'var(--accent-blue)' : 'var(--border)',
                      borderRadius: '8px',
                      padding: '6px 14px',
                      gap: 8,
                      cursor: 'pointer',
                      transition: 'var(--transition)'
                    }}
                    onClick={() => setActiveBoardId(board.id)}
                  >
                    <span style={{ fontSize: 13, fontWeight: 600, color: activeBoardId === board.id ? 'var(--accent-blue)' : 'var(--text-secondary)' }}>
                      {board.name}
                    </span>
                    <span style={{ fontSize: 11, background: activeBoardId === board.id ? 'rgba(79,142,247,0.15)' : 'rgba(255,255,255,0.06)', padding: '1px 7px', borderRadius: '99px', color: activeBoardId === board.id ? 'var(--accent-blue)' : 'var(--text-muted)', fontWeight: 600 }}>
                      {board.questions.length}
                    </span>
                    {board.id !== 'default' && (
                      <button
                        type="button"
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12, padding: '0 2px', display: 'flex', alignItems: 'center' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Are you sure you want to delete the board "${board.name}"?`)) {
                            setTrackerBoards(prev => prev.filter(b => b.id !== board.id));
                            setActiveBoardId('default');
                          }
                        }}
                        title="Delete Board"
                        aria-label={`Delete board ${board.name}`}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowAddQuestionInline(!showAddQuestionInline)}
                  aria-label="Add a question manually"
                >
                  {showAddQuestionInline ? '✕ Close' : '+ Add Question'}
                </button>

                {activeQuestions.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    onClick={() => {
                      if (confirm('Are you sure you want to clear all questions from this board?')) {
                        updateActiveBoardQuestions([]);
                      }
                    }}
                    aria-label="Reset board — clear all questions"
                  >
                    🗑 Reset Board
                  </button>
                )}

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    const name = prompt('Enter a name for the new Study Board:');
                    if (name && name.trim()) {
                      const newBoard = {
                        id: `board_${Date.now()}`,
                        name: name.trim(),
                        questions: []
                      };
                      setTrackerBoards(prev => [...prev, newBoard]);
                      setActiveBoardId(newBoard.id);
                    }
                  }}
                >
                  ＋ New Board
                </button>
              </div>
            </div>

            {/* Progress stats bar */}
            {activeQuestions.length > 0 && (
              <div style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 16
              }}>
                <div style={{ display: 'flex', gap: 24 }}>
                  <div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>Total</span>
                    <strong style={{ fontSize: 16 }}>{activeQuestions.length}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', color: 'var(--accent-blue)' }}>To Do</span>
                    <strong style={{ fontSize: 16, color: 'var(--accent-blue)' }}>
                      {activeQuestions.filter(q => q.status === 'To Do').length}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', color: 'var(--accent-amber)' }}>In Progress</span>
                    <strong style={{ fontSize: 16, color: 'var(--accent-amber)' }}>
                      {activeQuestions.filter(q => q.status === 'In Progress').length}
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', color: 'var(--accent-green)' }}>Done</span>
                    <strong style={{ fontSize: 16, color: 'var(--accent-green)' }}>
                      {activeQuestions.filter(q => q.status === 'Done').length}
                    </strong>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, justifyContent: 'flex-end', minWidth: 260 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Completion: {Math.round((activeQuestions.filter(q => q.status === 'Done').length / activeQuestions.length) * 100) || 0}%
                  </span>
                  <div className="progress-bar-container">
                    <div
                      className="progress-bar-fill"
                      style={{
                        width: `${Math.round((activeQuestions.filter(q => q.status === 'Done').length / activeQuestions.length) * 100) || 0}%`
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Inline Add Question Form */}
            {showAddQuestionInline && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const text = newQuestionText.trim();
                  if (!text) return;
                  const newQ = {
                    id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                    category: newQuestionCategory.trim() || 'General',
                    text,
                    status: 'To Do'
                  };
                  updateActiveBoardQuestions(prev => [newQ, ...prev]);
                  setNewQuestionText('');
                  showToast('Question added on top of board!');
                }}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12
                }}
              >
                <h3 style={{ fontSize: 14, fontWeight: 600 }}>Add Custom Question</h3>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 260 }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Enter question text..."
                      value={newQuestionText}
                      onChange={e => setNewQuestionText(e.target.value)}
                      required
                    />
                  </div>
                  <div style={{ width: 180 }}>
                    <select
                      className="form-select"
                      value={newQuestionCategory}
                      onChange={e => setNewQuestionCategory(e.target.value)}
                    >
                      <option value="General">General</option>
                      {tags.filter(t => t !== 'All').map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ padding: '10px 20px' }}>
                    Add
                  </button>
                </div>
              </form>
            )}

            {/* Kanban Board columns */}
            <div className="tracker-board">
              {activeQuestions.length === 0 ? (
                <div className="tracker-empty">
                  <div style={{ fontSize: 40 }}>📊</div>
                  <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Your Study Board is empty</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 400, margin: '0 auto 8px' }}>
                    Go to the <strong>Prep Generator</strong> tab, compile some interview questions using AI, and click <strong>Track Study Progress</strong> to populate this board automatically.
                  </p>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => setActiveTab('prep')}
                    >
                      🎯 Go to Prep Generator
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setShowAddQuestionInline(true);
                      }}
                    >
                      ✍️ Add Question Manually
                    </button>
                  </div>
                </div>
              ) : (
                ['To Do', 'In Progress', 'Done'].map(statusName => {
                  const items = activeQuestions.filter(q => q.status === statusName);
                  const columnClass = statusName === 'To Do' ? 'tracker-column-todo' : statusName === 'In Progress' ? 'tracker-column-progress' : 'tracker-column-done';

                  return (
                    <div key={statusName} className={`tracker-column ${columnClass}`}>
                      <div className="column-title">
                        <span>
                          {statusName === 'To Do' ? '📖 ' : statusName === 'In Progress' ? '⏳ ' : '✅ '}
                          {statusName}
                        </span>
                        <span className="column-count">{items.length}</span>
                      </div>

                      <div className="tracker-card-list">
                        {items.length === 0 ? (
                          <div style={{
                            textAlign: 'center',
                            padding: '30px 10px',
                            color: 'var(--text-muted)',
                            fontSize: 12,
                            border: '1px dashed var(--border)',
                            borderRadius: 'var(--radius-sm)',
                            marginTop: 10
                          }}>
                            No questions here.
                          </div>
                        ) : (
                          items.map(q => (
                            <div key={q.id} className="tracker-card">
                              <div
                                className="tracker-card-text"
                                onClick={() => setActiveTrackerTask(q)}
                                style={{ cursor: 'pointer' }}
                                title="Click to view details & write notes"
                              >
                                {q.text}
                              </div>
                              <div className="tracker-card-footer">
                                <span className="tag" style={{ ...getTagStyle(q.category), fontSize: 10, padding: '2px 8px' }}>
                                  {q.category}
                                </span>

                                <div className="tracker-card-actions">
                                  {statusName === 'To Do' && (
                                    <button
                                      type="button"
                                      className="tracker-action-btn"
                                      aria-label="Start studying — move to In Progress"
                                      onClick={() => {
                                        updateActiveBoardQuestions(prev => prev.map(item => item.id === q.id ? { ...item, status: 'In Progress' } : item));
                                      }}
                                      title="Start studying (Move to In Progress)"
                                    >
                                      ➡️
                                    </button>
                                  )}

                                  {statusName === 'In Progress' && (
                                    <>
                                      <button
                                        type="button"
                                        className="tracker-action-btn"
                                        aria-label="Move back to To Do"
                                        onClick={() => {
                                          updateActiveBoardQuestions(prev => prev.map(item => item.id === q.id ? { ...item, status: 'To Do' } : item));
                                        }}
                                        title="Move back to To Do"
                                      >
                                        ⬅️
                                      </button>
                                      <button
                                        type="button"
                                        className="tracker-action-btn"
                                        aria-label="Mark as Done"
                                        onClick={() => {
                                          updateActiveBoardQuestions(prev => prev.map(item => item.id === q.id ? { ...item, status: 'Done' } : item));
                                        }}
                                        title="Complete studying (Move to Done)"
                                      >
                                        ✅
                                      </button>
                                    </>
                                  )}

                                  {statusName === 'Done' && (
                                    <button
                                      type="button"
                                      className="tracker-action-btn"
                                      aria-label="Reopen — move back to In Progress"
                                      onClick={() => {
                                        updateActiveBoardQuestions(prev => prev.map(item => item.id === q.id ? { ...item, status: 'In Progress' } : item));
                                      }}
                                      title="Reopen (Move to In Progress)"
                                    >
                                      ↩️
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    className="tracker-action-btn delete"
                                    aria-label="Delete this question from board"
                                    onClick={() => {
                                      updateActiveBoardQuestions(prev => prev.filter(item => item.id !== q.id));
                                      showToast('Question removed from board.');
                                    }}
                                    title="Delete Question"
                                  >
                                    🗑
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      {showModal && (
        <AddPostModal
          onClose={() => {
            setShowModal(false);
            setInitialImportData(null);
          }}
          onSave={addPost}
          tags={tags}
          onAddTag={addTag}
          initialData={initialImportData}
          nvidiaKeyProp={nvidiaKey}
          onSaveNvidiaKey={saveNvidiaKey}
        />
      )}

      {postToEdit && (
        <AddPostModal
          onClose={() => setPostToEdit(null)}
          onSave={savePost}
          tags={tags}
          onAddTag={addTag}
          initialData={postToEdit}
          isEdit={true}
          nvidiaKeyProp={nvidiaKey}
          onSaveNvidiaKey={saveNvidiaKey}
        />
      )}

      {viewingPost && (
        <ViewPostModal
          post={viewingPost}
          onClose={() => setViewingPost(null)}
        />
      )}

      {activeTrackerTask && (
        <TrackerTaskModal
          task={activeTrackerTask}
          onClose={() => setActiveTrackerTask(null)}
          onUpdate={(updatedTask) => {
            updateActiveBoardQuestions(prev => prev.map(item => item.id === updatedTask.id ? updatedTask : item));
            showToast('Question updated successfully!');
          }}
          tags={tags}
          nvidiaKeyProp={nvidiaKey}
          showToast={showToast}
        />
      )}

      {showSaveBoardModal && (
        <SaveBoardModal
          onClose={() => setShowSaveBoardModal(false)}
          onConfirm={handleConfirmStartTracking}
          defaultName="New Study Guide"
          loading={isTrackingLoading}
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
