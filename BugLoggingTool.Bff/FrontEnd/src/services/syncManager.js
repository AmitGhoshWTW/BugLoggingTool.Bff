import {
  db,
  getBrowserId,
  getPendingSyncItems,
  markSyncItemDone,
  getMeta,
  setMeta,
  upsertFromSync
} from './pouchdbService';
import eventBus from '../utils/eventBus';

// ─────────────────────────────────────────────────────────────
// Module state
// ─────────────────────────────────────────────────────────────

let SYNC_SERVICE_URL = 'http://localhost:42080';
let syncTimerId      = null;
let _status          = 'idle';
let _lastSyncTime    = null;
let _failCount       = 0;

// ── Token cache ───────────────────────────────────────────────
let _agentToken      = null;   // cached after first fetch; cleared on 401

const PUSH_BATCH    = 25;
const PULL_LIMIT    = 200;
const SYNC_INTERVAL = 10_000;   // 10s
const BACKOFF       = [5000, 10_000, 20_000, 40_000, 60_000];
const MAX_FAILURES  = 5;        // pause sync after this many consecutive errors

// ─────────────────────────────────────────────────────────────
// Token management
// ─────────────────────────────────────────────────────────────

/**
 * Fetches the agent token from /api/token (responds to 127.0.0.1 only).
 * Caches it in memory — cleared automatically on any 401 response.
 */
async function _getAgentToken() {
  if (_agentToken) return _agentToken;

  try {
    const res = await fetch(`${SYNC_SERVICE_URL}/api/token`, {
      cache : 'no-store',
      signal: AbortSignal.timeout(3000)
    });
    if (!res.ok) throw new Error(`Token endpoint returned ${res.status}`);
    const data  = await res.json();
    _agentToken = data.token;
    console.log('[syncManager] ✅ Agent token acquired');
    return _agentToken;
  } catch (err) {
    console.warn('[syncManager] ⚠️ Could not fetch agent token:', err.message);
    return null;
  }
}

/**
 * Authenticated fetch wrapper for all /api/sync/* calls.
 * On 401: clears cached token and retries ONCE (handles agent restart).
 */
async function _agentFetch(path, options = {}, _isRetry = false) {
  const token = await _getAgentToken();

  if (!token) {
    _status = 'paused';
    throw new Error('No agent token — agent may not be running');
  }

  const res = await fetch(`${SYNC_SERVICE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type' : 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(options.headers || {})
    }
  });

  // 401 = token rotated (agent restarted) — clear and retry once
  if (res.status === 401 && !_isRetry) {
    console.warn('[syncManager] 401 received — token stale, refreshing and retrying...');
    _agentToken = null;
    return _agentFetch(path, options, true);
  }

  return res;
}

// ─────────────────────────────────────────────────────────────
// Public API  (same signatures as before — no breaking changes)
// ─────────────────────────────────────────────────────────────

export function configureRemote(url, _username, _password) {
  SYNC_SERVICE_URL = 'http://localhost:42080';
  console.log('[syncManager] Sync service: BLT Agent at', SYNC_SERVICE_URL);
  return null;
}

export async function testRemoteConnection() {
  try {
    const resp = await fetch(`${SYNC_SERVICE_URL}/health`,
      { signal: AbortSignal.timeout(2000) });
    const ok = resp.ok;
    if (ok) console.log('[syncManager] ✅ BLT Agent reachable');
    else    console.warn('[syncManager] ❌ BLT Agent responded but not ok');
    return ok;
  } catch (err) {
    console.warn('[syncManager] ❌ BLT Agent not reachable:', err.message);
    return false;
  }
}

export function startSync() {
  if (syncTimerId) {
    console.log('[syncManager] Sync already running');
    return syncTimerId;
  }

  console.log('[syncManager] Starting sync (10s interval)...');
  _status = 'active';

  // Pre-fetch token + register browser on startup (non-blocking)
  _getAgentToken()
    .then(() => _registerBrowser())
    .catch(() => {});

  syncTimerId = setTimeout(async function tick() {
    await _runFullSync();

    // Pause for 2 min if too many consecutive failures — stops the infinite retry stack
    if (_failCount >= MAX_FAILURES) {
      console.error(`[syncManager] ${MAX_FAILURES} consecutive failures — pausing 2 min`);
      _status    = 'paused';
      _failCount = 0;
      syncTimerId = setTimeout(tick, 2 * 60 * 1000);
      return;
    }

    const delay = _failCount === 0
      ? SYNC_INTERVAL
      : BACKOFF[Math.min(_failCount - 1, BACKOFF.length - 1)];

    syncTimerId = setTimeout(tick, delay);
  }, 2000);

  return syncTimerId;
}

export function stopSync() {
  if (syncTimerId) {
    clearTimeout(syncTimerId);
    syncTimerId = null;
    _status     = 'paused';
    console.log('[syncManager] Sync stopped');
  }
}

export async function syncOnce() {
  console.log('[syncManager] Manual sync...');
  await _runFullSync();
}

export function getSyncStatus() {
  return {
    status   : _status,
    isActive : !!syncTimerId,
    remoteUrl: SYNC_SERVICE_URL,
    lastSync : _lastSyncTime
  };
}

// Compatibility stubs
export function getRemoteDB()    { return null; }
export function getLocalDB()     { return db; }
export function getSyncHandler() { return syncTimerId; }
export function getRemoteUrl()   { return SYNC_SERVICE_URL; }

// ─────────────────────────────────────────────────────────────
// Core sync loop
// ─────────────────────────────────────────────────────────────

async function _runFullSync() {
  const available = await testRemoteConnection();
  if (!available) { _status = 'paused'; return; }

  _status = 'syncing';
  try {
    const pushed = await _push();
    const pulled = await _pull();

    _failCount    = 0;
    _status       = 'active';
    _lastSyncTime = new Date().toISOString();

    if (pushed + pulled > 0) {
      console.log(`[syncManager] ✅ Sync: +${pushed} pushed, +${pulled} pulled`);
      eventBus.emit('data-synced', {
        direction     : 'both',
        docCount      : pushed + pulled,
        hasReports    : true,
        hasScreenshots: true
      });
    }
  } catch (err) {
    _failCount++;
    _status = 'error';
    console.error(`[syncManager] ❌ Sync error (fail ${_failCount}):`, err.message);
  }
}

// ─────────────────────────────────────────────────────────────
// PUSH — now uses _agentFetch (token auth)
// ─────────────────────────────────────────────────────────────

async function _push() {
  const browserId = getBrowserId();
  const queue     = await getPendingSyncItems();
  if (queue.length === 0) return 0;

  console.log(`[syncManager] Pushing ${queue.length} records...`);
  let pushed = 0;

  for (let i = 0; i < queue.length; i += PUSH_BATCH) {
    const batch   = queue.slice(i, i + PUSH_BATCH);
    const dtos    = [];
    const itemIds = [];

    for (const item of batch) {
      const dto = await _buildDto(item);
      if (dto) { dtos.push(dto); itemIds.push(item.id); }
    }
    if (dtos.length === 0) continue;

    try {
      const resp = await _agentFetch('/api/sync/push', {         // ← was plain fetch
        method: 'POST',
        body  : JSON.stringify({
          browserId,
          browserName: _getBrowserName(),
          records    : dtos
        })
      });

      if (!resp.ok) throw new Error(`Push HTTP ${resp.status}`);
      const result = await resp.json();

      for (const id of itemIds)            await markSyncItemDone(id);
      for (const dto of dtos) {
        if (!result.conflictIds?.includes(dto.id))
          await _markSynced(dto.id, dto.recordType);
      }

      pushed += result.accepted || 0;
    } catch (err) {
      console.error('[syncManager] Push batch error:', err.message);
    }
  }

  return pushed;
}

async function _buildDto(item) {
  try {
    let record = null;
    if      (item.recordType === 'report')     record = await db.reports    .get(item.recordId);
    else if (item.recordType === 'screenshot') record = await db.screenshots.get(item.recordId);
    else if (item.recordType === 'logfile')    record = await db.logfiles   .get(item.recordId);
    if (!record) return null;

    return {
      id         : record._id,
      recordType : item.recordType,
      updatedAt  : record.updatedAt  || record.createdAt,
      version    : record.version    || 1,
      isDeleted  : record.isDeleted  || false,
      payloadJson: JSON.stringify(record)
    };
  } catch { return null; }
}

async function _markSynced(id, type) {
  const table = type === 'report'     ? db.reports
              : type === 'screenshot' ? db.screenshots
              : db.logfiles;
  const doc = await table.get(id);
  if (!doc) return;
  doc.synced = true;
  await table.put(doc);
}

// ─────────────────────────────────────────────────────────────
// PULL — now uses _agentFetch (token auth)
// ─────────────────────────────────────────────────────────────

async function _pull() {
  const browserId = getBrowserId();
  const sinceSeq  = (await getMeta('lastSeq')) ?? 0;

  let pulled     = 0;
  let lastSeq    = sinceSeq;
  let hasMore    = true;
  let currentSeq = sinceSeq;

  while (hasMore) {
    try {
      const resp = await _agentFetch('/api/sync/pull', {         // ← was plain fetch
        method: 'POST',
        body  : JSON.stringify({ browserId, sinceSeq: currentSeq, limit: PULL_LIMIT })
      });

      if (!resp.ok) throw new Error(`Pull HTTP ${resp.status} - ${resp.statusText}`);
      const result = await resp.json();

      for (const rec of result.records ?? []) {
        await upsertFromSync(rec.recordType, rec.payloadJson);
        pulled++;
      }

      lastSeq    = result.lastSeq ?? currentSeq;
      currentSeq = lastSeq;
      hasMore    = result.hasMore ?? false;
    } catch (err) {
      console.error('[syncManager] Pull error:', err.message);
      hasMore = false;
    }
  }

  if (lastSeq > sinceSeq) {
    await setMeta('lastSeq',      lastSeq);
    await setMeta('lastSyncTime', new Date().toISOString());
  }

  return pulled;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

async function _registerBrowser() {
  try {
    await _agentFetch('/api/sync/register', {                    // ← was plain fetch
      method: 'POST',
      body  : JSON.stringify({
        browserId  : getBrowserId(),
        browserName: _getBrowserName()
      })
    });
    console.log('[syncManager] ✅ Browser registered with agent');
  } catch (err) {
    console.warn('[syncManager] Browser registration failed:', err.message);
  }
}

function _getBrowserName() {
  const ua = navigator.userAgent;
  if (ua.includes('Edg/'))    return 'Microsoft Edge';
  if (ua.includes('Chrome'))  return 'Google Chrome';
  if (ua.includes('Firefox')) return 'Mozilla Firefox';
  return 'Browser';
}
