// src/components/UpdateNotification.jsx
import React, { useState, useEffect, useRef } from 'react';
import { versionManager } from '../services/versionManager';

const FORCE_COUNTDOWN_SECS = 30;

export default function UpdateNotification() {
  const [updateInfo,    setUpdateInfo]    = useState(null);
  const [showDetails,   setShowDetails]   = useState(false);
  const [countdown,     setCountdown]     = useState(null);  // seconds remaining for force reload
  const [dismissed,     setDismissed]     = useState(false);
  const countdownTimer  = useRef(null);

  // ── Mount: attach listener + run initial check ───────────────────────────
  useEffect(() => {
    function handleUpdate(event) {
      const data = event.detail;
      if (!data?.latestVersion) return;

      console.log('[UpdateNotification] Update event received:', data);
      setUpdateInfo(data);
      setDismissed(false);

      if (data.forceReload) {
        startCountdown();
      }
    }

    window.addEventListener('update-available', handleUpdate);

    // Run initial check after a short delay (give main.jsx time to init)
    const t = setTimeout(() => {
      versionManager.checkForUpdates().catch(() => {});
    }, 1500);

    return () => {
      window.removeEventListener('update-available', handleUpdate);
      clearTimeout(t);
      clearInterval(countdownTimer.current);
    };
  }, []);

  // ── Force reload countdown ───────────────────────────────────────────────
  function startCountdown() {
    setCountdown(FORCE_COUNTDOWN_SECS);
    countdownTimer.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownTimer.current);
          versionManager.applyUpdate();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function handleUpdateNow() {
    clearInterval(countdownTimer.current);
    versionManager.applyUpdate();
  }

  function handleDismiss() {
    if (updateInfo?.forceReload) return;  // can't dismiss a forced update
    clearInterval(countdownTimer.current);
    setDismissed(true);
    setUpdateInfo(null);
  }

  if (!updateInfo || dismissed) return null;

  // ── Compact banner ───────────────────────────────────────────────────────
  if (!showDetails) {
    return (
      <div style={styles.banner}>
        <div style={styles.bannerLeft}>
          <span style={styles.emoji}>🔄</span>
          <div>
            <div style={styles.bannerTitle}>
              BLT {updateInfo.latestVersion} is available
            </div>
            {countdown !== null && (
              <div style={styles.bannerSub}>
                Auto-updating in <strong>{countdown}s</strong>
              </div>
            )}
          </div>
        </div>

        <div style={styles.bannerActions}>
          <button onClick={handleUpdateNow}  style={styles.btnPrimary}>
            Update Now
          </button>
          <button onClick={() => setShowDetails(true)} style={styles.btnSecondary}>
            What's New
          </button>
          {!updateInfo.forceReload && (
            <button onClick={handleDismiss} style={styles.btnClose} title="Dismiss">
              ✕
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Detail modal ─────────────────────────────────────────────────────────
  return (
    <div style={styles.overlay} onClick={() => !updateInfo.forceReload && setShowDetails(false)}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
          <h2 style={styles.modalTitle}>Update Available</h2>
          <p style={styles.modalSub}>
            {updateInfo.currentVersion} → <strong>{updateInfo.latestVersion}</strong>
          </p>
        </div>

        {updateInfo.releaseNotes?.length > 0 && (
          <div style={styles.releaseNotes}>
            <p style={styles.releaseNotesTitle}>What's new:</p>
            <ul style={styles.releaseNotesList}>
              {updateInfo.releaseNotes.map((n, i) => <li key={i}>{n}</li>)}
            </ul>
          </div>
        )}

        {countdown !== null && (
          <div style={styles.forceNotice}>
            ⚠️ This is a required update. App will reload in <strong>{countdown}s</strong>.
          </div>
        )}

        <div style={styles.hint}>
          💡 Your unsaved reports are stored locally and will not be lost.
        </div>

        <div style={styles.modalActions}>
          <button onClick={handleUpdateNow} style={styles.btnPrimaryLarge}>
            Update Now
          </button>
          {!updateInfo.forceReload && (
            <button onClick={() => { setShowDetails(false); }} style={styles.btnSecondaryLarge}>
              Later
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Styles ─────────────────────────────────────────────────────────────── */
const styles = {
  // Banner
  banner: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: '#fff', padding: '10px 16px', borderRadius: 8, marginBottom: 8,
    boxShadow: '0 4px 12px rgba(102,126,234,.35)'
  },
  bannerLeft:    { display: 'flex', alignItems: 'center', gap: 12 },
  emoji:         { fontSize: 24 },
  bannerTitle:   { fontWeight: 600, fontSize: 14 },
  bannerSub:     { fontSize: 12, opacity: .85, marginTop: 2 },
  bannerActions: { display: 'flex', gap: 8, alignItems: 'center' },

  // Buttons (banner)
  btnPrimary: {
    padding: '7px 16px', background: '#fff', color: '#667eea',
    border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer'
  },
  btnSecondary: {
    padding: '7px 14px', background: 'rgba(255,255,255,.15)', color: '#fff',
    border: '1px solid rgba(255,255,255,.3)', borderRadius: 6, fontSize: 13,
    fontWeight: 500, cursor: 'pointer'
  },
  btnClose: {
    background: 'transparent', border: 'none', color: '#fff',
    fontSize: 18, cursor: 'pointer', padding: '4px 6px', lineHeight: 1
  },

  // Modal
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    zIndex: 10001, padding: 20
  },
  modal: {
    background: '#fff', borderRadius: 16, maxWidth: 480, width: '100%',
    padding: 32, boxShadow: '0 20px 60px rgba(0,0,0,.25)'
  },
  modalTitle:     { margin: '0 0 6px', fontSize: 22, color: '#1a1a2e' },
  modalSub:       { margin: 0, color: '#555', fontSize: 14 },
  releaseNotes:   { background: '#f8f9fa', borderRadius: 8, padding: '12px 16px', marginBottom: 16 },
  releaseNotesTitle: { margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: '#333' },
  releaseNotesList:  { margin: 0, paddingLeft: 18, color: '#555', fontSize: 13, lineHeight: 1.8 },
  forceNotice: {
    background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 6,
    padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#856404'
  },
  hint: {
    background: '#e8f4f8', borderRadius: 6, padding: '10px 14px',
    fontSize: 12, color: '#0c5460', marginBottom: 20
  },
  modalActions: { display: 'flex', gap: 12 },
  btnPrimaryLarge: {
    flex: 1, padding: 14,
    background: 'linear-gradient(135deg, #667eea, #764ba2)',
    color: '#fff', border: 'none', borderRadius: 8,
    fontSize: 15, fontWeight: 600, cursor: 'pointer'
  },
  btnSecondaryLarge: {
    padding: '14px 24px', background: '#e9ecef', color: '#495057',
    border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 500, cursor: 'pointer'
  }
};
