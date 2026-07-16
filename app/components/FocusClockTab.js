'use client';

import { useState, useEffect } from 'react';

export default function FocusClockTab({
  timerMinutes,
  setTimerMinutes,
  timerSeconds,
  setTimerSeconds,
  timerActive,
  setTimerActive,
  timerMode,
  setTimerMode,
  timerTotalDuration,
  setTimerTotalDuration,
  showToast
}) {
  const [notificationPermission, setNotificationPermission] = useState('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Request browser desktop notification permissions
  const requestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        if (permission === 'granted') {
          showToast('Desktop notifications successfully enabled! Reminders will chime every 10 mins.', 'success');
        } else if (permission === 'denied') {
          showToast('Notifications blocked. Please enable them in your browser settings if you want chimes.', 'warning');
        }
      } catch (err) {
        console.error('Error requesting notification permission:', err);
      }
    }
  };

  // Helper formatting mm:ss
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Preset time blocks
  const presets = [
    { label: '⚡ 15m Sprint', mins: 15 },
    { label: '⏱️ 25m Pomodoro', mins: 25 },
    { label: '🚀 45m Deep Study', mins: 45 },
    { label: '🧘 60m Focus Block', mins: 60 }
  ];

  const handleApplyPreset = (mins) => {
    setTimerActive(false);
    setTimerMinutes(mins);
    const duration = mins * 60;
    setTimerSeconds(duration);
    setTimerTotalDuration(duration);
    showToast(`Timer preset set to ${mins} minutes.`);

    // Request permissions proactively on user action
    if (notificationPermission === 'default') {
      requestNotificationPermission();
    }
  };

  const handleToggleStart = () => {
    const nextActive = !timerActive;
    setTimerActive(nextActive);

    // Request permissions proactively on first play click
    if (nextActive && notificationPermission === 'default') {
      requestNotificationPermission();
    }

    if (nextActive) {
      showToast('Focus Clock running. Keep up the great work!', 'success');
    }
  };

  const handleReset = () => {
    setTimerActive(false);
    const duration = timerMode === 'work' ? timerMinutes * 60 : 5 * 60;
    setTimerSeconds(duration);
    setTimerTotalDuration(duration);
    showToast('Timer reset.');
  };

  const handleSwitchMode = () => {
    setTimerActive(false);
    const nextMode = timerMode === 'work' ? 'break' : 'work';
    const duration = nextMode === 'work' ? timerMinutes * 60 : 5 * 60;
    setTimerMode(nextMode);
    setTimerSeconds(duration);
    setTimerTotalDuration(duration);
    showToast(`Switched to ${nextMode === 'work' ? 'Study' : 'Break'} Mode.`);
  };

  // SVG parameters
  const radius = 110;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (timerSeconds / timerTotalDuration) * circumference;

  return (
    <div style={{
      maxWidth: 640,
      margin: '0 auto',
      padding: '24px 0',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 28
    }}>
      {/* Tab Title */}
      <div style={{ textAlign: 'center', width: '100%', borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>⏱️ Study Focus Clock</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0' }}>
          Immersive Pomodoro countdown clock. We will alert you every 10 minutes to update your board tasks!
        </p>
      </div>

      {/* Enable Notification Banner (Helpful nudge) */}
      {notificationPermission === 'default' && (
        <div style={{
          width: '100%',
          background: 'var(--accent-blue-dim)',
          border: '1px solid rgba(79, 142, 247, 0.2)',
          borderRadius: 12,
          padding: '12px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          boxShadow: 'var(--shadow-card)'
        }}>
          <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>
            🔔 <strong>Enable Desktop Notifications</strong> to get chimes and task prompts in the background.
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={requestNotificationPermission}
            style={{ whiteSpace: 'nowrap' }}
          >
            Allow alerts
          </button>
        </div>
      )}

      {/* Main Clock Circle Visualization */}
      <div className="focus-clock-visual-container" style={{
        position: 'relative',
        width: 280,
        height: 280,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {/* SVG Ring Progress */}
        <svg style={{
          transform: 'rotate(-90deg)',
          position: 'absolute',
          top: 0,
          left: 0,
          width: 280,
          height: 280
        }}>
          {/* Inner ring background */}
          <circle
            cx="140"
            cy="140"
            r={radius}
            fill="transparent"
            stroke="var(--border)"
            strokeWidth={strokeWidth}
          />
          {/* Outer glowing dynamic indicator */}
          <circle
            cx="140"
            cy="140"
            r={radius}
            fill="transparent"
            stroke={timerMode === 'work' ? 'var(--accent-blue)' : 'var(--accent-green)'}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: timerActive ? 'stroke-dashoffset 1s linear' : 'stroke-dashoffset 0.3s ease' }}
          />
        </svg>

        {/* Center Text Details */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          zIndex: 10
        }}>
          {/* Active Mode Label */}
          <span style={{
            fontSize: 12,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            color: timerMode === 'work' ? 'var(--accent-blue)' : 'var(--accent-green)',
            background: timerMode === 'work' ? 'var(--accent-blue-dim)' : 'var(--accent-green-dim)',
            padding: '4px 12px',
            borderRadius: 20
          }}>
            {timerMode === 'work' ? '✍️ Studying' : '☕ On Break'}
          </span>

          {/* Time display */}
          <div style={{
            fontSize: 60,
            fontWeight: 800,
            fontFamily: 'monospace',
            color: 'var(--text-primary)',
            lineHeight: 1.1,
            marginTop: 6
          }}>
            {formatTime(timerSeconds)}
          </div>

          {/* Reminders schedule indicator */}
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {timerActive ? 'Task reminder in 10m' : 'Ticking runs in background'}
          </span>
        </div>
      </div>

      {/* Control deck */}
      <div style={{ display: 'flex', gap: 12, width: '100%', justifyContent: 'center' }}>
        <button
          type="button"
          className={`btn ${timerActive ? 'btn-danger' : 'btn-primary'}`}
          onClick={handleToggleStart}
          style={{ minWidth: 140, padding: '12px 24px', fontSize: 15, fontWeight: 700 }}
        >
          {timerActive ? '⏸️ Pause Timer' : '▶️ Start Timer'}
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleReset}
          style={{ minWidth: 100, padding: '12px 20px', fontSize: 14 }}
        >
          🔄 Reset
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleSwitchMode}
          style={{ minWidth: 130, padding: '12px 20px', fontSize: 14 }}
        >
          {timerMode === 'work' ? '☕ Go to Break' : '✍️ Go to Study'}
        </button>
      </div>

      {/* Presets and custom settings */}
      <div style={{
        width: '100%',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)' }}>
          Session Configuration
        </h3>

        {/* Preset Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: 10
        }}>
          {presets.map((preset) => (
            <button
              key={preset.mins}
              type="button"
              className="btn btn-secondary"
              onClick={() => handleApplyPreset(preset.mins)}
              style={{
                padding: '10px 14px',
                fontSize: 12.5,
                fontWeight: 600,
                textAlign: 'center',
                justifyContent: 'center',
                borderColor: timerMinutes === preset.mins ? 'var(--accent-blue)' : 'var(--border)',
                background: timerMinutes === preset.mins ? 'var(--accent-blue-dim)' : 'rgba(255,255,255,0.02)'
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Custom Duration Input */}
        {!timerActive && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid var(--border)',
            paddingTop: 16,
            marginTop: 8
          }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Custom Work Duration:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="number"
                min="1"
                max="180"
                value={timerMinutes}
                onChange={(e) => {
                  const val = Math.max(1, parseInt(e.target.value, 10) || 25);
                  setTimerMinutes(val);
                  setTimerSeconds(val * 60);
                  setTimerTotalDuration(val * 60);
                }}
                style={{
                  width: 70,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  color: 'var(--text-primary)',
                  textAlign: 'center',
                  padding: '6px 8px',
                  fontFamily: 'inherit',
                  fontSize: 14,
                  fontWeight: 700
                }}
              />
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>minutes</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
