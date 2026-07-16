'use client';

import { getTagStyle } from './utils';

export default function PrepTab({
  tags,
  prepSelectedTags,
  setPrepSelectedTags,
  prepKeywords,
  setPrepKeywords,
  prepGuide,
  copiedPrep,
  generatingPrep,
  handleGeneratePrep,
  copyPrepGuide,
  downloadPrepMarkdown,
  handleStartTracking
}) {
  return (
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
  );
}
