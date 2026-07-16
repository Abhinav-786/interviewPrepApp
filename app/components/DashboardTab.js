'use client';

import { useCallback } from 'react';
import {
  formatDeterministicDate,
  formatDeterministicMonthYear,
  formatDeterministicLongDate
} from './utils';

export default function DashboardTab({
  posts,
  trackerBoards,
  activeBoardId,
  setActiveBoardId,
  setActiveTab,
  targetDate,
  setTargetDate,
  dailyGoal,
  setDailyGoal,
  studyDates,
  setShowModal,
  downloadCSV
}) {

  // Countdown target date remaining days calculation
  const getDaysRemaining = useCallback(() => {
    if (!targetDate) return null;
    const target = new Date(targetDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    const diff = target.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }, [targetDate]);

  const getQuestionsCompletedToday = useCallback(() => {
    const today = new Date().toISOString().slice(0, 10);
    return studyDates[today] || 0;
  }, [studyDates]);

  const generateHeatmapDates = useCallback(() => {
    const dates = [];
    const today = new Date();
    const start = new Date(today);
    // Go back 18 weeks (ending today)
    start.setDate(today.getDate() - (18 * 7) - today.getDay());

    for (let i = 0; i <= (18 * 7) + today.getDay(); i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const count = studyDates[dateStr] || 0;

      let level = 0;
      if (count > 0 && count <= 2) level = 1;
      else if (count > 2 && count <= 5) level = 2;
      else if (count > 5 && count <= 9) level = 3;
      else if (count > 9) level = 4;

      dates.push({
        dateStr,
        count,
        level,
        dayOfWeek: d.getDay(),
        dateObj: d
      });
    }
    return dates;
  }, [studyDates]);

  const calculateStreaks = useCallback(() => {
    const dates = Object.keys(studyDates).sort();
    if (dates.length === 0) return { current: 0, longest: 0 };

    let longest = 0;
    let current = 0;
    let running = 0;

    const todayStr = new Date().toISOString().slice(0, 10);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    // Longest streak
    let prevDate = null;
    const uniqueStudyDays = dates.filter(d => studyDates[d] > 0);

    uniqueStudyDays.forEach(dateStr => {
      const curDate = new Date(dateStr);
      if (!prevDate) {
        running = 1;
      } else {
        const diffTime = Math.abs(curDate - prevDate);
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          running += 1;
        } else if (diffDays > 1) {
          longest = Math.max(longest, running);
          running = 1;
        }
      }
      prevDate = curDate;
    });
    longest = Math.max(longest, running);

    // Current streak
    const hasStudiedToday = studyDates[todayStr] > 0;
    const hasStudiedYesterday = studyDates[yesterdayStr] > 0;

    if (hasStudiedToday || hasStudiedYesterday) {
      let checkDate = hasStudiedToday ? new Date() : yesterday;
      current = 0;
      while (true) {
        const checkStr = checkDate.toISOString().slice(0, 10);
        if (studyDates[checkStr] > 0) {
          current += 1;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
    } else {
      current = 0;
    }

    return { current, longest };
  }, [studyDates]);

  return (
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

      {/* Countdown & Daily Goals Section */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 16
      }}>
        {/* Countdown Card */}
        <div className="dashboard-section" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>🎯 Target Interview Date</span>
            {getDaysRemaining() !== null && (
              <span className="countdown-pill">
                {getDaysRemaining() > 0 ? `🔥 ${getDaysRemaining()} Days Left` : getDaysRemaining() === 0 ? '🏁 Today is the Day!' : '🎉 Target Passed'}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '8px 12px',
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                fontSize: 13,
                flex: 1
              }}
            />
            {targetDate && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setTargetDate('')}
                style={{ padding: '8px 12px' }}
                title="Clear target date"
              >
                Clear
              </button>
            )}
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
            {targetDate
              ? `Your interview is scheduled for ${formatDeterministicLongDate(targetDate)}.`
              : 'Set your target interview date to track time remaining and build urgency!'}
          </p>
        </div>

        {/* Daily Goal Card */}
        <div className="dashboard-section" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: 20 }}>
          {/* SVG Goal Circle */}
          {(() => {
            const completed = getQuestionsCompletedToday();
            const target = dailyGoal || 5;
            const pct = Math.min(100, Math.round((completed / target) * 100));
            const radius = 35;
            const circ = 2 * Math.PI * radius;
            const strokeOffset = circ - (pct / 100) * circ;

            return (
              <>
                <div className="goal-ring-container">
                  <svg width="86" height="86" style={{ transform: 'rotate(-90deg)' }}>
                    <circle
                      cx="43"
                      cy="43"
                      r={radius}
                      fill="none"
                      stroke="rgba(255, 255, 255, 0.05)"
                      strokeWidth="6"
                    />
                    <circle
                      cx="43"
                      cy="43"
                      r={radius}
                      fill="none"
                      stroke="var(--accent-green)"
                      strokeWidth="6"
                      strokeDasharray={circ}
                      strokeDashoffset={strokeOffset}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                    />
                  </svg>
                  <div className="goal-ring-text">
                    {pct}%
                  </div>
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>⚡ Daily Study Target</span>
                  <strong style={{ fontSize: 18, color: 'var(--text-primary)' }}>
                    {completed} / {target} questions
                  </strong>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '2px 8px', fontSize: 11 }}
                      onClick={() => setDailyGoal(prev => Math.max(1, prev - 1))}
                      disabled={dailyGoal <= 1}
                    >
                      -
                    </button>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Goal: {dailyGoal}</span>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '2px 8px', fontSize: 11 }}
                      onClick={() => setDailyGoal(prev => prev + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
              </>
            );
          })()}
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

      {/* Study Consistency Heatmap & Streaks */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {/* Heatmap Card */}
        <div className="dashboard-section" style={{ flex: 2 }}>
          <h3 className="dashboard-section-title">📅 Study Consistency Heatmap</h3>
          <div className="heatmap-wrapper">
            <div className="heatmap-grid">
              {generateHeatmapDates().map((cell) => (
                <div
                  key={cell.dateStr}
                  className={`heatmap-cell level-${cell.level}`}
                  title={`${cell.count} questions studied on ${formatDeterministicDate(cell.dateStr)}`}
                />
              ))}
            </div>
            <div className="heatmap-labels" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
              <span>{formatDeterministicMonthYear(generateHeatmapDates()[0].dateStr)}</span>
              <span>Today</span>
            </div>
            <div className="heatmap-legend" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-muted)', alignSelf: 'flex-end', marginTop: 8 }}>
              <span>Less</span>
              <div className="heatmap-cell level-0" />
              <div className="heatmap-cell level-1" />
              <div className="heatmap-cell level-2" />
              <div className="heatmap-cell level-3" />
              <div className="heatmap-cell level-4" />
              <span>More</span>
            </div>
          </div>
        </div>

        {/* Streaks Card */}
        {(() => {
          const streaks = calculateStreaks();
          return (
            <div className="dashboard-section" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <h3 className="dashboard-section-title">🔥 Study Streaks</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, flex: 1, alignItems: 'center' }}>
                <div style={{ background: 'rgba(255, 107, 107, 0.08)', border: '1px solid rgba(255, 107, 107, 0.2)', padding: '16px', borderRadius: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 32, marginBottom: 6 }}>🔥</div>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase' }}>Current Streak</span>
                  <strong style={{ fontSize: 24, color: '#ff6b6b' }}>{streaks.current} Days</strong>
                </div>
                <div style={{ background: 'var(--accent-amber-dim)', border: '1px solid rgba(245, 166, 35, 0.2)', padding: '16px', borderRadius: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 32, marginBottom: 6 }}>🏆</div>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase' }}>Longest Streak</span>
                  <strong style={{ fontSize: 24, color: 'var(--accent-amber)' }}>{streaks.longest} Days</strong>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
