// src/services/versionManager.js
import eventBus from '../utils/eventBus';

// ── Injected by vite.config.js at build time ──────────────────────────────────
const CURRENT_VERSION  = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';
const CURRENT_BUILD_ID = typeof __BUILD_ID__    !== 'undefined' ? __BUILD_ID__    : 'local';

const CHECK_INTERVAL_MS       = 1 * 60 * 1000;  // 5 minutes — detect updates within one user session
const FORCE_RELOAD_DELAY_MS   = 30 * 1000;       // 30-second countdown before forced reload
const STORED_VERSION_KEY      = 'blt_app_version';
const STORED_BUILD_KEY        = 'blt_build_id';

class VersionManager {
  constructor() {
    this.currentVersion  = CURRENT_VERSION;
    this.currentBuildId  = CURRENT_BUILD_ID;
    this.latestVersion   = null;
    this.latestBuildId   = null;
    this.updateAvailable = false;
    this.forceReload     = false;
    this.checkInterval   = null;
    this._forceTimer     = null;

    // Persist current version on first load so next load can detect changes
    this._persistCurrentVersion();
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  getCurrentVersion()  { return this.currentVersion; }
  getLatestVersion()   { return this.latestVersion; }
  isUpdateAvailable()  { return this.updateAvailable; }
  isForceReload()      { return this.forceReload; }

  startVersionCheck() {
    console.log(`[VersionManager] Starting — current: ${this.currentVersion} (${this.currentBuildId})`);
    this.checkForUpdates();
    this.checkInterval = setInterval(() => this.checkForUpdates(), CHECK_INTERVAL_MS);
  }

  stopVersionCheck() {
    clearInterval(this.checkInterval);
    clearTimeout(this._forceTimer);
    this.checkInterval = null;
  }

  // ── Core check ──────────────────────────────────────────────────────────────

  async checkForUpdates() {
    try {
      const response = await fetch(`/version.json?_=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });

      if (!response.ok) {
        console.warn('[VersionManager] version.json fetch failed:', response.status);
        return false;
      }

      const info = await response.json();
      this.latestVersion = info.version;
      this.latestBuildId = info.buildId || info.version;
      this.forceReload   = info.forceReload === true;

      console.log('[VersionManager] Check:', {
        current: `${this.currentVersion} (${this.currentBuildId})`,
        latest:  `${this.latestVersion}  (${this.latestBuildId})`,
        force:   this.forceReload
      });

      // Detect update by buildId first (catches same-semver rebuilds), fall back to semver
      const hasUpdate = this.latestBuildId !== this.currentBuildId
        && this._isNewer(this.latestVersion, this.currentVersion);

      // Also detect if stored version differs (another tab already updated)
      const storedBuild = localStorage.getItem(STORED_BUILD_KEY);
      const storeConflict = storedBuild && storedBuild !== this.currentBuildId
        && storedBuild === this.latestBuildId;

      if (hasUpdate || storeConflict) {
        this.updateAvailable = true;
        console.log('[VersionManager] 🎉 Update available!', {
          releaseNotes: info.releaseNotes
        });

        // Emit to the app
        eventBus.emit('update-available', {
          currentVersion: this.currentVersion,
          latestVersion:  this.latestVersion,
          buildId:        this.latestBuildId,
          releaseNotes:   info.releaseNotes || [],
          forceReload:    this.forceReload
        });

        // Ops-controlled force reload — start countdown
        if (this.forceReload && !this._forceTimer) {
          console.warn(`[VersionManager] ⚠️  forceReload=true — auto-reload in ${FORCE_RELOAD_DELAY_MS / 1000}s`);
          this._forceTimer = setTimeout(() => this.applyUpdate(), FORCE_RELOAD_DELAY_MS);
        }

        return true;
      }

      return false;
    } catch (err) {
      // Network down or offline — silently swallow, not an error condition
      console.warn('[VersionManager] Check skipped (offline?):', err.message);
      return false;
    }
  }

  // ── Apply update ────────────────────────────────────────────────────────────

  async applyUpdate() {
    console.log('[VersionManager] Applying update — unregistering SW and clearing caches...');

    try {
      // 1. Unregister all service workers
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
        console.log('[VersionManager] SW unregistered');
      }

      // 2. Delete all caches
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
        console.log('[VersionManager] Caches cleared:', keys);
      }

      // 3. Update stored version so other tabs know we've updated
      this._persistCurrentVersion(this.latestVersion, this.latestBuildId);

    } catch (err) {
      console.error('[VersionManager] Cleanup error (reloading anyway):', err);
    }

    // 4. Hard reload — browser fetches fresh index.html from server
    window.location.reload();
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  _isNewer(latest, current) {
    if (!latest || !current) return false;
    const l = latest.split('.').map(Number);
    const c = current.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      if ((l[i] ?? 0) > (c[i] ?? 0)) return true;
      if ((l[i] ?? 0) < (c[i] ?? 0)) return false;
    }
    return false;
  }

  _persistCurrentVersion(version = this.currentVersion, buildId = this.currentBuildId) {
    localStorage.setItem(STORED_VERSION_KEY, version);
    localStorage.setItem(STORED_BUILD_KEY,   buildId);
  }
}

export const versionManager = new VersionManager();
