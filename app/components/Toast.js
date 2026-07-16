'use client';

import { useEffect } from 'react';

export default function Toast({ msg, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
  return (
    <div className={`toast toast-${type}`}>
      <span className="toast-icon">{icon}</span>
      {msg}
    </div>
  );
}
