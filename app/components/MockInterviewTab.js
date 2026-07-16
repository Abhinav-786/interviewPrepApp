'use client';

export default function MockInterviewTab({
  mockBoardId,
  setMockBoardId,
  mockQCount,
  setMockQCount,
  mockQuestions,
  setMockQuestions,
  mockAnswers,
  setMockAnswers,
  mockIndex,
  setMockIndex,
  mockActive,
  setMockActive,
  mockCompleted,
  setMockCompleted,
  mockReport,
  setMockReport,
  mockEvaluating,
  setMockEvaluating,
  mockRecording,
  setMockRecording,
  mockCurrentAnswer,
  setMockCurrentAnswer,
  trackerBoards,
  showToast,
  logStudyActivity
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '24px 0' }}>
      <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>🎙️ AI Mock Interview</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
          Test your SDET knowledge in a simulated verbal interview scored by AI.
        </p>
      </div>

      {/* Setup Mode */}
      {!mockActive && !mockCompleted && (
        <div className="dashboard-section" style={{ maxWidth: 500, margin: '20px auto', width: '100%', padding: 24, gap: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Configure Interview</h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Select Question Board</label>
            <select
              value={mockBoardId}
              onChange={(e) => setMockBoardId(e.target.value)}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '8px 12px',
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                fontSize: 13
              }}
            >
              {trackerBoards.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.questions.length} questions available)
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Number of Questions</label>
            <select
              value={mockQCount}
              onChange={(e) => setMockQCount(parseInt(e.target.value, 10))}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '8px 12px',
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                fontSize: 13
              }}
            >
              <option value={3}>3 Questions (Quick Practice)</option>
              <option value={5}>5 Questions (Standard Practice)</option>
              <option value={10}>10 Questions (Full Interview)</option>
            </select>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            style={{ width: '100%', padding: '10px 0', fontSize: 14, fontWeight: 700 }}
            onClick={() => {
              const board = trackerBoards.find(b => b.id === mockBoardId) || trackerBoards[0];
              if (!board || board.questions.length === 0) {
                showToast('Select a board that has questions to start.', 'error');
                return;
              }
              // Shuffle and pick QCount questions
              const shuffled = [...board.questions].sort(() => 0.5 - Math.random());
              const picked = shuffled.slice(0, mockQCount);
              setMockQuestions(picked);
              setMockAnswers([]);
              setMockIndex(0);
              setMockActive(true);
              setMockCompleted(false);
              setMockCurrentAnswer('');
            }}
          >
            🎙️ Start Interview
          </button>
        </div>
      )}

      {/* Active Interview Mode */}
      {mockActive && mockQuestions.length > 0 && (
        <div style={{ maxWidth: 680, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-muted)' }}>
            <span>Question {mockIndex + 1} of {mockQuestions.length}</span>
            <span style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>Active Session</span>
          </div>

          {/* Card */}
          <div className="dashboard-section" style={{ padding: 24, gap: 16 }}>
            <span className="tag" style={{ background: 'var(--accent-blue-dim)', color: 'var(--accent-blue)', fontSize: 10, alignSelf: 'flex-start', padding: '2px 8px', borderRadius: 99 }}>
              {mockQuestions[mockIndex].category}
            </span>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, lineHeight: 1.5 }}>
              {mockQuestions[mockIndex].text}
            </h3>
          </div>

          {/* Voice Dictation Output & Waveform Animation */}
          {mockRecording && (
            <div style={{ display: 'flex', alignItems: 'center', justifyStyle: 'center', gap: 12, padding: 14, background: 'rgba(79, 142, 247, 0.08)', borderRadius: 12, border: '1px solid rgba(79, 142, 247, 0.2)' }}>
              <div style={{ display: 'flex', gap: 3 }}>
                <span style={{ width: 3, height: 16, background: 'var(--accent-blue)', borderRadius: 2, animation: 'float 0.8s ease-in-out infinite' }} />
                <span style={{ width: 3, height: 24, background: 'var(--accent-blue)', borderRadius: 2, animation: 'float 0.8s ease-in-out infinite 0.15s' }} />
                <span style={{ width: 3, height: 12, background: 'var(--accent-blue)', borderRadius: 2, animation: 'float 0.8s ease-in-out infinite 0.3s' }} />
                <span style={{ width: 3, height: 28, background: 'var(--accent-blue)', borderRadius: 2, animation: 'float 0.8s ease-in-out infinite 0.45s' }} />
              </div>
              <span style={{ fontSize: 12, color: 'var(--accent-blue)', fontWeight: 600 }}>Listening to your voice... Speak clearly.</span>
            </div>
          )}

          {/* Answer Area */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>Your Answer</label>
            <textarea
              rows={6}
              placeholder="Type your technical response here, or click Speak Answer to dictate verbally..."
              value={mockCurrentAnswer}
              onChange={(e) => setMockCurrentAnswer(e.target.value)}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: '12px 16px',
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                fontSize: 14,
                lineHeight: '1.6',
                width: '100%',
                resize: 'vertical'
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {/* Recording button */}
              {!mockRecording ? (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  onClick={() => {
                    const SpeechReg = window.SpeechRecognition || window.webkitSpeechRecognition;
                    if (!SpeechReg) {
                      showToast('Speech recognition is not supported in this browser. Please type your response.', 'error');
                      return;
                    }
                    const rec = new SpeechReg();
                    rec.continuous = true;
                    rec.interimResults = false;
                    rec.lang = 'en-US';
                    rec.onstart = () => {
                      setMockRecording(true);
                      showToast('Recording active. Speak now.');
                    };
                    rec.onresult = (evt) => {
                      const result = evt.results[evt.results.length - 1][0].transcript;
                      setMockCurrentAnswer(prev => prev + (prev ? ' ' : '') + result);
                    };
                    rec.onerror = () => setMockRecording(false);
                    rec.onend = () => setMockRecording(false);
                    window.activeSpeechRec = rec;
                    rec.start();
                  }}
                >
                  🎙️ Speak Answer
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  onClick={() => {
                    if (window.activeSpeechRec) {
                      window.activeSpeechRec.stop();
                      window.activeSpeechRec = null;
                    }
                    setMockRecording(false);
                  }}
                >
                  🛑 Stop Recording
                </button>
              )}

              <button
                type="button"
                className="btn btn-primary"
                disabled={mockEvaluating}
                onClick={async () => {
                  // Stop voice rec if active
                  if (window.activeSpeechRec) {
                    window.activeSpeechRec.stop();
                    window.activeSpeechRec = null;
                  }
                  setMockRecording(false);

                  const updatedAnswers = [
                    ...mockAnswers,
                    {
                      question: mockQuestions[mockIndex].text,
                      answer: mockCurrentAnswer.trim()
                    }
                  ];
                  setMockAnswers(updatedAnswers);

                  if (mockIndex < mockQuestions.length - 1) {
                    setMockIndex(prev => prev + 1);
                    setMockCurrentAnswer('');
                  } else {
                    // Complete session, call evaluation endpoint
                    setMockEvaluating(true);
                    setMockActive(false);
                    setMockCompleted(true);
                    try {
                      const res = await fetch('/api/evaluate-interview', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ answers: updatedAnswers })
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error || 'Evaluation failed.');
                      setMockReport(data.report);
                      logStudyActivity(); // Log mock interview completion in study heatmap
                      showToast('AI interview evaluation generated successfully!', 'success');
                    } catch (err) {
                      showToast(err.message, 'error');
                    } finally {
                      setMockEvaluating(false);
                    }
                  }
                }}
              >
                {mockIndex < mockQuestions.length - 1 ? 'Next Question ➡️' : 'Finish & Grade 🏁'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Evaluation/Completed Mode */}
      {mockCompleted && (
        <div style={{ maxWidth: 720, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
          {mockEvaluating ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: 36, animation: 'float 2s infinite' }}>🤖</div>
              <h3 style={{ marginTop: 14 }}>SDET Co-Pilot is evaluating your interview...</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Analyzing answers, computing scores, and writing ideal recommendations. This will take a few seconds.</p>
            </div>
          ) : mockReport ? (
            <>
              {/* Scorecard Hero Panel */}
              <div className="dashboard-section" style={{
                padding: 24,
                display: 'flex',
                flexWrap: 'wrap',
                gap: 24,
                alignItems: 'center',
                justifyContent: 'space-between',
                borderLeft: `5px solid ${mockReport.verdict === 'Pass' ? 'var(--accent-green)' : mockReport.verdict === 'Borderline' ? 'var(--accent-amber)' : 'var(--accent-red)'}`
              }}>
                <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                  <div style={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    background: mockReport.verdict === 'Pass' ? 'var(--accent-green-dim)' : 'rgba(255,255,255,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                    fontWeight: 800,
                    color: mockReport.verdict === 'Pass' ? 'var(--accent-green)' : 'var(--text-primary)'
                  }}>
                    {mockReport.overallScore}/10
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Interview Verdict</span>
                    <h2 style={{ fontSize: 24, fontWeight: 800, margin: '2px 0 0', color: mockReport.verdict === 'Pass' ? 'var(--accent-green)' : 'var(--text-primary)' }}>
                      {mockReport.verdict}
                    </h2>
                  </div>
                </div>

                <p style={{ flex: 1, minWidth: 260, fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                  {mockReport.summary}
                </p>
              </div>

              {/* Question breakdown list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Question Evaluations</h3>
                {mockReport.evaluations.map((evalItem, idx) => (
                  <details
                    key={idx}
                    className="dashboard-section"
                    style={{ padding: 18, cursor: 'pointer' }}
                    open={idx === 0}
                  >
                    <summary style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700, fontSize: 14 }}>
                      <span>Q{idx + 1}: {evalItem.question}</span>
                      <span style={{
                        fontSize: 12,
                        fontWeight: 700,
                        background: evalItem.score >= 8 ? 'var(--accent-green-dim)' : evalItem.score >= 5 ? 'var(--accent-amber-dim)' : 'var(--accent-red-dim)',
                        color: evalItem.score >= 8 ? 'var(--accent-green)' : evalItem.score >= 5 ? 'var(--accent-amber)' : 'var(--accent-red)',
                        padding: '2px 8px',
                        borderRadius: 4
                      }}>
                        Score: {evalItem.score}/10
                      </span>
                    </summary>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14, cursor: 'default' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Your Answer</span>
                        <p style={{ fontSize: 13, margin: 0, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                          {evalItem.userAnswer || '(No answer provided)'}
                        </p>
                      </div>

                      <div style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>AI Evaluation & Feedback</span>
                        <p style={{ fontSize: 13, margin: 0, color: 'var(--text-secondary)' }}>
                          {evalItem.feedback}
                        </p>
                      </div>

                      <div style={{ background: 'var(--accent-blue-dim)', padding: 12, borderRadius: 8, border: '1px solid rgba(79, 142, 247, 0.2)' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-blue)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Principal Recommended Answer</span>
                        <p style={{ fontSize: 13, margin: 0, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                          {evalItem.idealAnswer}
                        </p>
                      </div>
                    </div>
                  </details>
                ))}
              </div>

              <button
                type="button"
                className="btn btn-secondary"
                style={{ alignSelf: 'center', padding: '10px 24px' }}
                onClick={() => {
                  setMockCompleted(false);
                  setMockActive(false);
                  setMockReport(null);
                }}
              >
                🔄 Restart Interview Practice
              </button>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <p style={{ color: 'var(--text-muted)' }}>Could not generate interview score report.</p>
              <button type="button" className="btn btn-secondary" onClick={() => setMockCompleted(false)}>Configure Again</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
