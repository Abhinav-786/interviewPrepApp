'use client';

import { useState } from 'react';
import { initials, formatDate, getTagStyle, getPostTags } from './utils';

export default function ResourcesTab({
  posts,
  tags,
  setShowModal,
  setViewingPost,
  setPostToEdit,
  deletePost
}) {
  const [search, setSearch] = useState('');
  const [filterTag, setFilterTag] = useState('All');

  // Filter posts locally
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
      // Default to sorting by addedAt desc
      const av = a.addedAt || '';
      const bv = b.addedAt || '';
      return av < bv ? 1 : -1;
    });

  return (
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
  );
}
