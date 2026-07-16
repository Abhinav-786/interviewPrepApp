'use client';

export default function FlashcardsTab({
  flashcardBoardId,
  setFlashcardBoardId,
  flashcardIndex,
  setFlashcardIndex,
  flashcardFlipped,
  setFlashcardFlipped,
  trackerBoards,
  setTrackerBoards,
  showToast
}) {
  const selectedBoard = trackerBoards.find(b => b.id === flashcardBoardId) || trackerBoards[0];
  const cards = selectedBoard ? selectedBoard.questions : [];

  if (cards.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '24px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>🎴 Flashcard Review</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
              Test your memory. Flip cards to view AI answers, and update your tracker boards directly.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Study Board:</span>
            <select
              value={flashcardBoardId}
              onChange={(e) => {
                setFlashcardBoardId(e.target.value);
                setFlashcardIndex(0);
                setFlashcardFlipped(false);
              }}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '6px 12px',
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                fontSize: 13
              }}
            >
              {trackerBoards.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.questions.length} cards)
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎴</div>
          <h3>No cards in this board</h3>
          <p style={{ fontSize: 13 }}>Add questions to this board in Progress Tracker or Prep Generator to review flashcards.</p>
        </div>
      </div>
    );
  }

  const card = cards[flashcardIndex] || cards[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '24px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>🎴 Flashcard Review</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Test your memory. Flip cards to view AI answers, and update your tracker boards directly.
          </p>
        </div>

        {/* Select Board */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Study Board:</span>
          <select
            value={flashcardBoardId}
            onChange={(e) => {
              setFlashcardBoardId(e.target.value);
              setFlashcardIndex(0);
              setFlashcardFlipped(false);
            }}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '6px 12px',
              color: 'var(--text-primary)',
              fontFamily: 'inherit',
              fontSize: 13
            }}
          >
            {trackerBoards.map(b => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.questions.length} cards)
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flashcards-container">
        {/* Progress Indicator */}
        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-muted)' }}>
          <span>Card {flashcardIndex + 1} of {cards.length}</span>
          <span>{Math.round(((flashcardIndex + 1) / cards.length) * 100)}% reviewed</span>
        </div>

        {/* 3D Flashcard */}
        <div className="flashcard-perspective" onClick={() => setFlashcardFlipped(!flashcardFlipped)}>
          <div className={`flashcard-inner ${flashcardFlipped ? 'flipped' : ''}`}>
            {/* Front Side */}
            <div className="flashcard-face flashcard-front">
              <span className="flashcard-category">{card.category}</span>
              <h3 className="flashcard-question-text">{card.text}</h3>
              <div className="flashcard-prompt-flip">
                <span>🔄 Click card to flip and view answer</span>
              </div>
            </div>

            {/* Back Side */}
            <div className="flashcard-face flashcard-back">
              <span className="flashcard-category" style={{ background: 'var(--accent-green-dim)', color: 'var(--accent-green)' }}>
                AI Recommendation & Notes
              </span>
              <div className="flashcard-answer-text">
                {card.aiAnalysis || card.notes || 'No review notes or AI answer generated yet for this question. You can trigger "Generate Answer" in the Progress Tracker tab.'}
              </div>
              <div className="flashcard-prompt-flip" style={{ marginTop: 'auto' }}>
                <span>🔄 Click card to return to question</span>
              </div>
            </div>
          </div>
        </div>

        {/* Flashcard Actions & Navigation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', alignItems: 'center' }}>
          <div className="flashcard-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={(e) => {
                e.stopPropagation();
                // Mark as In Progress (Needs Review)
                setTrackerBoards(prev => prev.map(b => {
                  if (b.id === flashcardBoardId) {
                    const updatedQ = b.questions.map(q => q.id === card.id ? { ...q, status: 'In Progress' } : q);
                    return { ...b, questions: updatedQ };
                  }
                  return b;
                }));
                showToast('Marked card for review');
                if (flashcardIndex < cards.length - 1) {
                  setFlashcardIndex(prev => prev + 1);
                  setFlashcardFlipped(false);
                }
              }}
            >
              ⚠️ Needs Review
            </button>

            <button
              type="button"
              className="btn btn-success"
              onClick={(e) => {
                e.stopPropagation();
                // Mark as Done (Learned)
                setTrackerBoards(prev => prev.map(b => {
                  if (b.id === flashcardBoardId) {
                    const updatedQ = b.questions.map(q => q.id === card.id ? { ...q, status: 'Done' } : q);
                    return { ...b, questions: updatedQ };
                  }
                  return b;
                }));
                showToast('Marked card as learned!');
                if (flashcardIndex < cards.length - 1) {
                  setFlashcardIndex(prev => prev + 1);
                  setFlashcardFlipped(false);
                }
              }}
            >
              ✅ Learned
            </button>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={flashcardIndex === 0}
              onClick={() => {
                setFlashcardIndex(prev => prev - 1);
                setFlashcardFlipped(false);
              }}
            >
              ⬅️ Previous
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={flashcardIndex === cards.length - 1}
              onClick={() => {
                setFlashcardIndex(prev => prev + 1);
                setFlashcardFlipped(false);
              }}
            >
              Next ➡️
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
