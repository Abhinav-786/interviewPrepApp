'use client';

import { useState } from 'react';
import { formatDate, getTagStyle, getPostTags, STATUS_CLASS, STATUS_EMOJI } from './utils';

export default function ViewPostModal({ post, onClose }) {
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
