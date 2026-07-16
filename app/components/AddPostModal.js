'use client';

import { useState, useEffect } from 'react';
import { getPostTags, genId, getTagStyle, getBookmarkletCode } from './utils';

export default function AddPostModal({ onClose, onSave, tags, onAddTag, initialData, isEdit, nvidiaKeyProp, onSaveNvidiaKey }) {
  const [mode, setMode] = useState(isEdit ? 'manual' : 'bookmarklet'); // 'bookmarklet' | 'manual'
  const [url, setUrl] = useState(initialData?.url || '');
  const [author, setAuthor] = useState(initialData?.author || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [selectedTags, setSelectedTags] = useState(initialData ? getPostTags(initialData) : ['General']);
  const [newTagText, setNewTagText] = useState('');
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
