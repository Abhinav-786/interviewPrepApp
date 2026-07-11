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

// ─── Toast ───────────────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`toast toast-${type}`}>
      <span className="toast-icon">{type === 'success' ? '✅' : '❌'}</span>
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
          apiKey: nvidiaKey,
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
    onSave({
      id: initialData?.id || genId(),
      url: url.trim(),
      author: author.trim() || 'Unknown Author',
      content: content.trim(),
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
                            style={{ width: 160, height: 26, fontSize: 11, padding: '2px 8px', background: 'transparent', border: 'none', color: '#fff' }}
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
  const [activeTab, setActiveTab] = useState('sheet'); // 'sheet' | 'prep'
  const [prepSelectedTags, setPrepSelectedTags] = useState([]);
  const [prepKeywords, setPrepKeywords] = useState('');
  const [prepGuide, setPrepGuide] = useState(null);
  const [copiedPrep, setCopiedPrep] = useState(false);
  const [generatingPrep, setGeneratingPrep] = useState(false);

  const [search, setSearch] = useState('');
  const [filterTag, setFilterTag] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [sortCol, setSortCol] = useState('addedAt');
  const [sortDir, setSortDir] = useState('desc');
  const [toast, setToast] = useState(null);
  const [nvidiaKey, setNvidiaKey] = useState('');
  const [mounted, setMounted] = useState(false);

  // Load from project files & check URL import
  useEffect(() => {
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

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
  }, []);

  function addPost(post) {
    setPosts((prev) => [post, ...prev]);
    showToast('Post added to your sheet!');
  }

  function savePost(updatedPost) {
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

    // 1. Filter local posts matching tags or keywords
    const matched = posts.filter(post => {
      const pTags = getPostTags(post);
      const hasTagMatch = prepSelectedTags.some(t => pTags.includes(t));
      
      let hasKeywordMatch = false;
      if (cleanKeywords) {
        const words = cleanKeywords.toLowerCase().split(',').map(w => w.trim()).filter(Boolean);
        const contentLower = (post.content || '').toLowerCase();
        hasKeywordMatch = words.some(w => contentLower.includes(w));
      }
      
      return hasTagMatch || hasKeywordMatch;
    });

    if (matched.length === 0) {
      showToast('No matching questions found in your sheet.', 'error');
      setPrepGuide(null);
      return;
    }

    // 2. Concatenate raw questions from all matched posts
    const contentToConsolidate = matched.map((p, i) => `[Source ${i + 1}: ${p.author || 'Company'}]\n${p.content}`).join('\n\n');

    setGeneratingPrep(true);
    setPrepGuide(null);

    try {
      const res = await fetch('/api/generate-study-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: contentToConsolidate,
          topics: prepSelectedTags.join(', ') || cleanKeywords,
          apiKey: nvidiaKey
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

  function cycleStatus(id) {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, status: STATUS_CYCLE[p.status] || 'To Read' } : p
      )
    );
  }

  function handleSort(col) {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortCol(col); setSortDir('asc'); }
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
      const matchStatus = filterStatus === 'All' || p.status === filterStatus;
      return matchSearch && matchTag && matchStatus;
    })
    .sort((a, b) => {
      let av = a[sortCol] || '', bv = b[sortCol] || '';
      if (sortDir === 'asc') return av > bv ? 1 : -1;
      return av < bv ? 1 : -1;
    });

  const countByStatus = (s) => posts.filter((p) => p.status === s).length;

  function SortTh({ col, label }) {
    const active = sortCol === col;
    return (
      <th
        className={active ? 'sorted' : ''}
        onClick={() => handleSort(col)}
        id={`sort-${col}`}
      >
        {label}
        <span className="sort-indicator">{active ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ' ↕'}</span>
      </th>
    );
  }

  return (
    <>
      {/* Header */}
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <div className="logo-icon">🎯</div>
            <span className="logo-text">InterviewPrep</span>
            <span className="logo-badge">Beta</span>
          </div>
          <div className="header-actions">
            <button
              className="btn btn-success btn-sm"
              onClick={() => posts.length && downloadCSV(filtered.length ? filtered : posts)}
              disabled={posts.length === 0}
              id="export-csv-btn"
              title="Export visible posts to CSV"
            >
              ⬇ Export CSV
            </button>
            <button
              className="btn btn-primary"
              onClick={() => setShowModal(true)}
              id="add-post-btn"
            >
              + Add Post
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="main">
        {/* Hero */}
        <section className="hero">
          <h1>Your LinkedIn Interview Prep Sheet</h1>
          <p>Collect posts, tag by topic, track your progress, and export to CSV — all in one place.</p>
        </section>

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'sheet' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('sheet')}
            style={{ borderRadius: '6px 6px 0 0', padding: '10px 20px', fontSize: 14 }}
          >
            📋 Sheet View
          </button>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === 'prep' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('prep')}
            style={{ borderRadius: '6px 6px 0 0', padding: '10px 20px', fontSize: 14 }}
          >
            🎯 Prep Generator
          </button>
        </div>

        {activeTab === 'sheet' ? (
          <>
            {/* Stats */}
            <div className="stats-bar">
              <div className="stat-chip">
                <span className="stat-dot" style={{ background: 'var(--accent-blue)' }} />
                <strong>{posts.length}</strong> Total Posts
              </div>
              <div className="stat-chip">
                <span className="stat-dot" style={{ background: 'var(--accent-blue)' }} />
                <strong>{countByStatus('To Read')}</strong> To Read
              </div>
              <div className="stat-chip">
                <span className="stat-dot" style={{ background: 'var(--accent-amber)' }} />
                <strong>{countByStatus('In Progress')}</strong> In Progress
              </div>
              <div className="stat-chip">
                <span className="stat-dot" style={{ background: 'var(--accent-green)' }} />
                <strong>{countByStatus('Done')}</strong> Done
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
              <select
                id="filter-status"
                className="filter-select"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="All">All Status</option>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
              {filtered.length < posts.length && (
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Showing {filtered.length} of {posts.length}
                </span>
              )}
            </div>

            {/* Table */}
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
              <div className="table-wrap">
                <table className="table" role="table" aria-label="LinkedIn posts sheet">
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>#</th>
                      <SortTh col="url" label="URL" />
                      <SortTh col="author" label="Company" />
                      <SortTh col="addedAt" label="Date Added" />
                      <th>Content</th>
                      <SortTh col="tag" label="Tags" />
                      <SortTh col="status" label="Status" />
                      <th style={{ width: 80 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                          No posts match your filters.
                        </td>
                      </tr>
                    ) : (
                      filtered.map((post, i) => {
                        return (
                          <tr key={post.id}>
                            <td className="col-num">{i + 1}</td>
                            <td>
                              {post.url ? (
                                <a
                                  className="post-url-link"
                                  href={post.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title={post.url}
                                >
                                  🔗 {post.url.replace('https://www.linkedin.com/posts/', '').slice(0, 30)}…
                                </a>
                              ) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                              )}
                            </td>
                            <td>
                              <div className="author-cell">
                                <div className="author-avatar">{initials(post.author)}</div>
                                <span className="author-name">{post.author}</span>
                              </div>
                            </td>
                            <td className="date-cell">{formatDate(post.addedAt)}</td>
                            <td style={{ cursor: 'pointer' }} onClick={() => setViewingPost(post)}>
                              <span className="content-cell" title="Click to view full content">
                                {truncate(post.content, 120)}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 220 }}>
                                {getPostTags(post).map(t => (
                                  <span key={t} className="tag" style={getTagStyle(t)}>{t}</span>
                                ))}
                              </div>
                            </td>
                            <td>
                              <button
                                className={`status-badge ${STATUS_CLASS[post.status]}`}
                                onClick={() => cycleStatus(post.id)}
                                title="Click to cycle status"
                                id={`status-${post.id}`}
                              >
                                <span className="status-dot" />
                                {STATUS_EMOJI[post.status]} {post.status}
                              </button>
                            </td>
                            <td>
                              <div className="row-actions">
                                <button
                                  className="btn btn-secondary btn-sm btn-icon"
                                  onClick={() => setViewingPost(post)}
                                  title="View details"
                                  style={{ marginRight: 6 }}
                                  id={`view-${post.id}`}
                                  aria-label={`View post by ${post.author}`}
                                >
                                  👁
                                </button>
                                <button
                                  className="btn btn-secondary btn-sm btn-icon"
                                  onClick={() => setPostToEdit(post)}
                                  title="Edit post"
                                  style={{ marginRight: 6 }}
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
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
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

      {/* Toast */}
      {toast && (
        <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />
      )}
    </>
  );
}
