// src/services/updateManager.js
import systemLogger from './systemLogger';

const PERIODIC_CHECK_MINUTES = 5;   // was 60 — must detect within a user session

class UpdateManager {
  constructor() {
    this.updateAvailable = false;
    this.newWorker       = null;
    this.listeners       = [];
    this.checkInterval   = null;
    this._registration   = null;
  }

  // ── Init ────────────────────────────────────────────────────────────────────

  init() {
    if (!('serviceWorker' in navigator)) {
      console.warn('[UpdateManager] Service Worker not supported in this browser');
      return;
    }
    console.log('[UpdateManager] Initializing...');
    systemLogger.logInfo('UpdateManager initialized');

    this._registerServiceWorker();
    this._setupTriggers();
    this._schedulePeriodicChecks();
  }

  // ── SW Registration ─────────────────────────────────────────────────────────

  async _registerServiceWorker() {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', {
        scope:         '/',
        updateViaCache: 'none'   // always ask server for new SW — never use browser HTTP cache
      });

      this._registration = reg;
      console.log('[UpdateManager] SW registered:', reg.scope);
      systemLogger.logInfo('Service Worker registered', { scope: reg.scope });

      // Check immediately on registration
      await reg.update();

      reg.addEventListener('updatefound', () => this._onUpdateFound(reg));

      // When a new SW takes control, optionally reload
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[UpdateManager] SW controller changed — new version active');
        systemLogger.logInfo('New SW controller active');
        this._notify({ type: 'update-activated' });

        if (this._shouldAutoReload()) {
          console.log('[UpdateManager] Auto-reload triggered');
          window.location.reload();
        }
      });

      // Listen for SW messages (SW_ACTIVATED confirmation)
      navigator.serviceWorker.addEventListener('message', event => {
        if (event.data?.type === 'SW_ACTIVATED') {
          console.log('[UpdateManager] SW activation confirmed:', event.data.version);
        }
      });

    } catch (err) {
      console.error('[UpdateManager] SW registration failed:', err);
      systemLogger.logError('SW registration failed', { error: err.message });
    }
  }

  // ── Update Detection ────────────────────────────────────────────────────────

  _onUpdateFound(reg) {
    const worker = reg.installing;
    if (!worker) return;

    console.log('[UpdateManager] New SW found — installing...');
    this.newWorker = worker;

    worker.addEventListener('statechange', () => {
      console.log('[UpdateManager] SW state:', worker.state);

      // installed + existing controller = new version waiting
      if (worker.state === 'installed' && navigator.serviceWorker.controller) {
        this.updateAvailable = true;
        console.log('[UpdateManager] New SW installed and waiting');
        systemLogger.logInfo('SW update ready');
        this._notify({ type: 'update-available', worker });
      }
    });
  }

  async checkForUpdates(reg) {
    try {
      const registration = reg || this._registration || await navigator.serviceWorker.getRegistration();
      if (!registration) return false;
      console.log('[UpdateManager] Checking SW for updates...');
      await registration.update();
      return true;
    } catch (err) {
      console.warn('[UpdateManager] SW update check failed:', err.message);
      return false;
    }
  }

  // ── Triggers ────────────────────────────────────────────────────────────────

  _setupTriggers() {
    // Trigger when user returns to tab — most likely moment they'd see a stale app
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        console.log('[UpdateManager] Tab visible — triggering update check');
        this.checkForUpdates();
      }
    });

    // Trigger when network comes back — agent might have pushed while offline
    window.addEventListener('online', () => {
      console.log('[UpdateManager] Network online — triggering update check');
      this.checkForUpdates();
    });
  }

  _schedulePeriodicChecks() {
    this.checkInterval = setInterval(() => {
      console.log('[UpdateManager] Scheduled SW update check');
      this.checkForUpdates();
    }, PERIODIC_CHECK_MINUTES * 60 * 1000);
  }

  stopPeriodicChecks() {
    clearInterval(this.checkInterval);
    this.checkInterval = null;
  }

  // ── Apply Update ────────────────────────────────────────────────────────────

  async applyUpdate() {
    if (!this.newWorker) {
      console.warn('[UpdateManager] applyUpdate called but no waiting worker');
      return false;
    }
    console.log('[UpdateManager] Posting SKIP_WAITING to new SW');
    systemLogger.logInfo('Applying SW update');
    this.newWorker.postMessage({ type: 'SKIP_WAITING' });
    // controllerchange event fires → reload handled there
    return true;
  }

  async forceUpdate() {
    console.log('[UpdateManager] Force update — unregistering SW + clearing caches');
    systemLogger.logInfo('Force update triggered');

    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));

      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    } catch (err) {
      console.error('[UpdateManager] Force update cleanup error:', err);
    }

    window.location.reload();
  }

  // ── Cache Utilities ─────────────────────────────────────────────────────────

  async clearOldCaches() {
    try {
      const allKeys = await caches.keys();
      // Keep only the cache whose name starts with "blt-cache-" and matches current SW
      // We don't know the exact current key here, so delete anything that isn't in use
      const registration = this._registration || await navigator.serviceWorker.getRegistration();
      const controller   = registration?.active;

      // Ask active SW which cache it owns via postMessage
      // Simpler: delete ALL non-current caches — SW activate handler already does this,
      // so this is just a belt-and-braces cleanup from the app side.
      const bltCaches = allKeys.filter(k => k.startsWith('blt-cache-'));
      if (bltCaches.length > 1) {
        // Keep the newest (lexically largest buildId timestamp), delete the rest
        bltCaches.sort().slice(0, -1).forEach(k => {
          console.log('[UpdateManager] Removing old BLT cache:', k);
          caches.delete(k);
        });
      }
    } catch (err) {
      console.error('[UpdateManager] clearOldCaches error:', err);
    }
  }

  async getCacheStatus() {
    try {
      const keys = await caches.keys();
      return await Promise.all(
        keys.map(async name => {
          const c   = await caches.open(name);
          const ks  = await c.keys();
          return { name, entries: ks.length };
        })
      );
    } catch (err) {
      return [];
    }
  }

  // ── Listeners ───────────────────────────────────────────────────────────────

  onUpdate(callback) {
    this.listeners.push(callback);
    return () => { this.listeners = this.listeners.filter(cb => cb !== callback); };
  }

  _notify(event) {
    this.listeners.forEach(cb => {
      try { cb(event); } catch (err) { console.error('[UpdateManager] Listener error:', err); }
    });
  }

  // ── Config ──────────────────────────────────────────────────────────────────

  _shouldAutoReload() {
    return localStorage.getItem('blt_autoUpdateReload') === 'true';
  }

  setAutoReload(enabled) {
    localStorage.setItem('blt_autoUpdateReload', enabled ? 'true' : 'false');
  }

  getStatus() {
    return {
      updateAvailable: this.updateAvailable,
      hasNewWorker:    this.newWorker !== null,
      swSupported:     'serviceWorker' in navigator,
      autoReload:      this._shouldAutoReload()
    };
  }
}

const updateManager = new UpdateManager();
export default updateManager;
