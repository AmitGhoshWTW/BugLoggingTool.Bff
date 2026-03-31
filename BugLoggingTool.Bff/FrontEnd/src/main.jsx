// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

import { localDB, createIndexes }                           from './services/pouchdbService';
import { configureRemote, startSync, getRemoteDB }          from './services/syncManager';
import updateManager                                        from './services/updateManager';
import { versionManager }                                   from './services/versionManager';

// ── Build-time constants (injected by vite.config.js) ────────────────────────
const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';
const BUILD_ID    = typeof __BUILD_ID__    !== 'undefined' ? __BUILD_ID__    : 'local';

const COUCHDB_URL      = import.meta.env.VITE_COUCHDB_URL      || 'http://localhost:5005';
const COUCHDB_USER     = import.meta.env.VITE_COUCHDB_USER     || 'admin';
const COUCHDB_PASSWORD = import.meta.env.VITE_COUCHDB_PASSWORD || 'adminpassword';

const INIT_FLAG = 'blt_initialized';

/* ═══════════════════════════════════════════════════════════════════════════
   INITIALIZATION
═══════════════════════════════════════════════════════════════════════════ */
async function initializeApp() {
  console.log(`[main] 🚀 BLT PWA v${APP_VERSION} (build: ${BUILD_ID})`);

  // ── 1. Service Worker + update detection ────────────────────────────────
  console.log('[main] Initializing UpdateManager...');
  updateManager.init();

  updateManager.onUpdate(event => {
    if (event.type === 'update-available') {
      console.log('[main] SW update available — VersionManager will surface UI');
    }
  });

  // ── 2. Version polling — detects server-side app updates (version.json) ─
  //       This is separate from SW self-update; it catches deployments where
  //       the SW hasn't been replaced yet but version.json already points newer.
  console.log('[main] Starting VersionManager polling...');
  versionManager.startVersionCheck();   // ← THIS WAS MISSING in the original

  // ── 3. DB indexes (first run only) ──────────────────────────────────────
  if (!localStorage.getItem(INIT_FLAG)) {
    console.log('[main] First run — creating DB indexes...');
    await createIndexes();
    localStorage.setItem(INIT_FLAG, 'true');
    console.log('[main] ✅ Indexes created');
  }

  // ── 4. Verify local DB ──────────────────────────────────────────────────
  const localInfo = await localDB.info();
  console.log('[main] ✅ Local DB ready:', {
    docs: localInfo.doc_count,
    seq:  localInfo.update_seq
  });

  // ── 5. Configure + start remote sync ───────────────────────────────────
  if (COUCHDB_URL) {
    try {
      configureRemote(COUCHDB_URL, COUCHDB_USER, COUCHDB_PASSWORD);
      startSync();
      console.log('[main] ✅ Sync started — will retry until service available');
    } catch (err) {
      console.warn('[main] Remote DB setup failed — running offline:', err.message);
    }
  } else {
    console.log('[main] No remote DB configured — offline mode');
  }

  // ── 6. Debug tools ──────────────────────────────────────────────────────
  window.__BLT_DEBUG__ = {
    version:        APP_VERSION,
    buildId:        BUILD_ID,
    localDB,
    remoteDB:       getRemoteDB,
    updateManager,
    versionManager,

    getDatabaseInfo: async () => {
      const info       = await localDB.info();
      const reports    = await localDB.allDocs({ startkey: 'report:',     endkey: 'report:\uffff' });
      const screenshots= await localDB.allDocs({ startkey: 'screenshot:', endkey: 'screenshot:\uffff' });
      return { totalDocs: info.doc_count, reports: reports.rows.length, screenshots: screenshots.rows.length };
    },

    forceUpdate: () => updateManager.forceUpdate(),

    checkForUpdates: async () => {
      const available = await versionManager.checkForUpdates();
      console.log(available ? '✅ Update available' : '✅ Already on latest');
      return available;
    },

    getCacheStatus: () => updateManager.getCacheStatus(),

    resetInitFlag: () => {
      localStorage.removeItem(INIT_FLAG);
      console.log('✅ Init flag cleared — indexes recreated on next load');
    }
  };

  console.log('[main] ✅ Initialization complete');
  console.log('[main] Debug tools: window.__BLT_DEBUG__');
}

/* ═══════════════════════════════════════════════════════════════════════════
   RENDER
═══════════════════════════════════════════════════════════════════════════ */
initializeApp()
  .then(() => {
    ReactDOM.createRoot(document.getElementById('root')).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  })
  .catch(err => {
    console.error('[main] ❌ Critical init error:', err);
    document.getElementById('root').innerHTML = `
      <div style="padding:40px;max-width:600px;margin:0 auto;
                  font-family:-apple-system,'Segoe UI',sans-serif">
        <h2 style="color:#d32f2f">⚠️ Initialization Error</h2>
        <p style="color:#666;line-height:1.6">
          The application failed to start. Please check your connection and try again.
        </p>
        <details style="background:#f5f5f5;padding:16px;border-radius:8px;margin-bottom:20px">
          <summary style="cursor:pointer;font-weight:500">Error Details</summary>
          <pre style="font-size:13px;color:#333;overflow:auto;margin-top:8px">${err.message}\n\n${err.stack || ''}</pre>
        </details>
        <button onclick="window.location.reload()"
                style="padding:12px 24px;background:#0078d7;color:#fff;border:none;
                       border-radius:4px;cursor:pointer;font-size:16px;font-weight:500">
          🔄 Retry
        </button>
      </div>`;
  });

/* ═══════════════════════════════════════════════════════════════════════════
   GLOBAL HANDLERS
═══════════════════════════════════════════════════════════════════════════ */
window.addEventListener('error',              e => console.error('[main] Global error:', e.message, e.filename, e.lineno));
window.addEventListener('unhandledrejection', e => console.error('[main] Unhandled rejection:', e.reason?.message ?? e.reason));
window.addEventListener('online',  () => window.dispatchEvent(new CustomEvent('network-status-change', { detail: { online: true } })));
window.addEventListener('offline', () => window.dispatchEvent(new CustomEvent('network-status-change', { detail: { online: false } })));
