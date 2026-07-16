'use client';

import { getTagStyle } from './utils';

export default function TrackerTab({
  trackerBoards,
  setTrackerBoards,
  activeBoardId,
  setActiveBoardId,
  showAddQuestionInline,
  setShowAddQuestionInline,
  newQuestionText,
  setNewQuestionText,
  newQuestionCategory,
  setNewQuestionCategory,
  focusMonitorActive,
  setFocusMonitorActive,
  setLastInteractionTime,
  showToast,
  tags,
  setActiveTab,
  updateActiveBoardQuestions,
  setActiveTrackerTask
}) {
  const activeBoard = trackerBoards.find(b => b.id === activeBoardId) || trackerBoards[0];
  const activeQuestions = activeBoard ? activeBoard.questions : [];

  return (
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
          <button
            type="button"
            className={`btn btn-sm ${focusMonitorActive ? 'btn-danger' : 'btn-secondary'}`}
            onClick={() => {
              const nextActive = !focusMonitorActive;
              setFocusMonitorActive(nextActive);
              if (nextActive) {
                setLastInteractionTime(Date.now());
                showToast('Focus Monitor active: will beep if no board updates in 10 mins!', 'success');
              } else {
                showToast('Focus Monitor deactivated.');
              }
            }}
            title="Plays alert beeps if you do not update question statuses or study notes for 10 minutes"
          >
            {focusMonitorActive ? '🔔 Monitor: Active' : '🔕 Start Monitor'}
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
  );
}
