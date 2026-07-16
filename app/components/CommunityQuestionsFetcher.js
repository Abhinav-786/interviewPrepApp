'use client';

export default function CommunityQuestionsFetcher({
  fetcherOpen,
  setFetcherOpen,
  fetcherStep,
  setFetcherStep,
  fetcherExp,
  setFetcherExp,
  fetcherSources,
  setFetcherSources,
  fetcherLoading,
  fetchedQuestions,
  setFetchedQuestions,
  selectedFetched,
  setSelectedFetched,
  fetcherTargetBoard,
  setFetcherTargetBoard,
  fetcherMeta,
  activeBoardId,
  trackerBoards,
  handleFetchQuestions,
  handleImportFetched
}) {
  if (!fetcherOpen) return null;

  return (
    <div className="fetcher-overlay" onClick={(e) => { if (e.target.className === 'fetcher-overlay') { setFetcherOpen(false); setFetcherStep('config'); } }}>
      <div className="fetcher-modal">
        {/* Header */}
        <div className="fetcher-header">
          <div>
            <h2 className="fetcher-title">🌐 Fetch Live Community Questions</h2>
            <p className="fetcher-subtitle">
              {fetcherStep === 'config'
                ? 'Pull real SDET interview questions from Reddit & Stack Overflow, filtered by experience level.'
                : fetcherMeta ? `Fetched from ${fetcherMeta.totalFetched} posts · ${fetcherMeta.extracted} questions extracted for ${fetcherMeta.experience}` : 'Review and select questions to import.'}
            </p>
          </div>
          <button type="button" className="fetcher-close-btn" onClick={() => { setFetcherOpen(false); setFetcherStep('config'); }}>✕</button>
        </div>

        {/* Step 1: Config */}
        {fetcherStep === 'config' && (
          <div className="fetcher-body">
            {/* Experience Level */}
            <div className="fetcher-section">
              <label className="fetcher-label">🎓 Your Experience Level</label>
              <div className="fetcher-exp-tiles">
                {[
                  { key: 'junior', emoji: '🟢', title: 'Junior', sub: '0–2 years', desc: 'Fundamentals, Selenium basics, TestNG/JUnit, basic API testing' },
                  { key: 'mid', emoji: '🟡', title: 'Mid-Level', sub: '2–5 years', desc: 'Framework design, CI/CD, API automation, Page Object Model' },
                  { key: 'senior', emoji: '🔴', title: 'Senior', sub: '5+ years', desc: 'Architecture, test strategy, leadership, system design' },
                ].map(exp => (
                  <div
                    key={exp.key}
                    className={`fetcher-exp-tile ${fetcherExp === exp.key ? 'selected' : ''}`}
                    onClick={() => setFetcherExp(exp.key)}
                  >
                    <div className="fetcher-exp-emoji">{exp.emoji}</div>
                    <div className="fetcher-exp-title">{exp.title}</div>
                    <div className="fetcher-exp-sub">{exp.sub}</div>
                    <div className="fetcher-exp-desc">{exp.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sources */}
            <div className="fetcher-section">
              <label className="fetcher-label">📡 Data Sources</label>
              <div className="fetcher-sources">
                {[
                  { key: 'reddit', label: '🟠 Reddit', sub: 'r/QualityAssurance, r/cscareerquestions' },
                  { key: 'stackoverflow', label: '🔵 Stack Overflow', sub: 'selenium, automation-testing tags' },
                ].map(src => (
                  <div
                    key={src.key}
                    className={`fetcher-source-chip ${fetcherSources.includes(src.key) ? 'selected' : ''}`}
                    onClick={() => setFetcherSources(prev =>
                      prev.includes(src.key) ? prev.filter(s => s !== src.key) : [...prev, src.key]
                    )}
                  >
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{src.label}</div>
                    <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{src.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Target Board */}
            <div className="fetcher-section">
              <label className="fetcher-label">📋 Import to Board</label>
              <select
                className="fetcher-select"
                value={fetcherTargetBoard || activeBoardId}
                onChange={e => setFetcherTargetBoard(e.target.value)}
              >
                {trackerBoards.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            {/* CTA */}
            <button
              type="button"
              className="fetcher-cta-btn"
              onClick={handleFetchQuestions}
              disabled={fetcherLoading || fetcherSources.length === 0}
            >
              {fetcherLoading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="fetcher-spinner" /> Fetching & analysing questions…
                </span>
              ) : '🔍 Fetch Questions →'}
            </button>

            {fetcherLoading && (
              <div className="fetcher-loading-note">
                ⚡ Pulling from Reddit &amp; Stack Overflow, then passing through AI for extraction. This may take 15–25 seconds.
              </div>
            )}
          </div>
        )}

        {/* Step 2: Results */}
        {fetcherStep === 'results' && (
          <div className="fetcher-body">
            {/* Controls bar */}
            <div className="fetcher-results-bar">
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {selectedFetched.size} of {fetchedQuestions.length} selected
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="fetcher-mini-btn" onClick={() => setSelectedFetched(new Set(fetchedQuestions.map(q => q.id)))}>Select All</button>
                <button type="button" className="fetcher-mini-btn" onClick={() => setSelectedFetched(new Set())}>Clear</button>
                <button type="button" className="fetcher-mini-btn" onClick={() => { setFetcherStep('config'); setFetchedQuestions([]); }}>← Back</button>
              </div>
            </div>

            {/* Question Cards */}
            <div className="fetcher-questions-list">
              {fetchedQuestions.map(q => (
                <div
                  key={q.id}
                  className={`fetcher-q-card ${selectedFetched.has(q.id) ? 'selected' : ''}`}
                  onClick={() => setSelectedFetched(prev => {
                    const next = new Set(prev);
                    if (next.has(q.id)) next.delete(q.id); else next.add(q.id);
                    return next;
                  })}
                >
                  <div className="fetcher-q-check">{selectedFetched.has(q.id) ? '✅' : '⬜'}</div>
                  <div className="fetcher-q-content">
                    <div className="fetcher-q-text">{q.question}</div>
                    {q.hint && <div className="fetcher-q-hint">💡 {q.hint}</div>}
                    <div className="fetcher-q-meta">
                      <span className={`fetcher-source-badge ${q.source}`}>
                        {q.source === 'reddit' ? '🟠 Reddit' : '🔵 Stack Overflow'}
                      </span>
                      {q.tags?.map(t => (
                        <span key={t} className="fetcher-tag">{t}</span>
                      ))}
                      {q.sourceUrl && (
                        <a href={q.sourceUrl} target="_blank" rel="noreferrer" className="fetcher-source-link" onClick={e => e.stopPropagation()}>
                          View Source ↗
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Import CTA */}
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button
                type="button"
                className="fetcher-cta-btn"
                onClick={handleImportFetched}
                disabled={selectedFetched.size === 0}
              >
                📥 Import {selectedFetched.size} Question{selectedFetched.size !== 1 ? 's' : ''} to Board
              </button>
              <button type="button" className="btn btn-secondary" onClick={handleFetchQuestions} disabled={fetcherLoading}>
                🔄 Re-fetch
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
