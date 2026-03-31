// /**
//  * pouchdbService.js  —  Dexie.js (IndexedDB) replacement for PouchDB
//  *
//  * ALL exports are identical to the original pouchdbService.js.
//  * Zero changes required in any React component.
//  *
//  * Key differences from PouchDB version:
//  *  • Screenshots stored as base64 inline (not as binary attachments)
//  *  • localDB is a compatibility shim — QueueView works unchanged
//  *  • No CouchDB / remote sync here — that lives in syncManager.js
//  */

// import Dexie from 'dexie';

// // ─────────────────────────────────────────────────────────────
// // Browser identity  (unique per browser install)
// // ─────────────────────────────────────────────────────────────

// const BROWSER_ID_KEY = 'blt_browser_id';

// export function getBrowserId() {
//   let id = localStorage.getItem(BROWSER_ID_KEY);
//   if (!id) {
//     id = 'BR-' + Date.now().toString(36).toUpperCase() + '-' +
//          Math.random().toString(36).substring(2, 6).toUpperCase();
//     localStorage.setItem(BROWSER_ID_KEY, id);
//   }
//   return id;
// }

// // ─────────────────────────────────────────────────────────────
// // Dexie database schema
// // ─────────────────────────────────────────────────────────────

// export const db = new Dexie('blt_local_db');

// db.version(1).stores({
//   reports:     '_id, type, createdAt, synced, isDeleted, sourceBrowserId',
//   screenshots: '_id, type, attachedToReport, createdAt, synced, isDeleted, sourceBrowserId',
//   logfiles:    '_id, type, attachedToReport, uploadedAt, synced, isDeleted, sourceBrowserId',
//   systemlogs:  '++id, level, timestamp',
//   syncQueue:   '++id, recordId, recordType, isSynced, queuedAt',
//   syncMeta:    'key'   // key-value: lastSeq, lastSyncTime, ...
// });

// // ─────────────────────────────────────────────────────────────
// // Helpers
// // ─────────────────────────────────────────────────────────────

// function generateShortId() {
//   return Math.random().toString(36).substring(2, 11);
// }

// function generateRandomId() {
//   return Math.random().toString(36).substring(2, 11);
// }

// function nowIso() {
//   return new Date().toISOString();
// }

// function base64ToBlob(base64 = '', mimeType = 'image/png') {
//   try {
//     const binary = atob(base64);
//     const arr = new Uint8Array(binary.length);
//     for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
//     return new Blob([arr], { type: mimeType });
//   } catch {
//     return new Blob([], { type: mimeType });
//   }
// }

// async function blobToBase64(blob) {
//   return new Promise((resolve, reject) => {
//     const r = new FileReader();
//     r.onload  = () => resolve(r.result.split(',')[1]);
//     r.onerror = reject;
//     r.readAsDataURL(blob);
//   });
// }

// // Add to sync queue (every local write)
// async function enqueue(recordId, recordType, operation) {
//   await db.syncQueue.add({
//     recordId,
//     recordType,
//     operation,
//     browserId : getBrowserId(),
//     isSynced  : false,
//     queuedAt  : nowIso(),
//     retryCount: 0
//   });
// }

// // ─────────────────────────────────────────────────────────────
// // PouchDB compatibility shim — localDB
// // Used directly by QueueView, logFileService, etc.
// // ─────────────────────────────────────────────────────────────

// export const localDB = {

//   info: async () => {
//     const [reports, screenshots, logfiles] = await Promise.all([
//         db.reports.count(),
//         db.screenshots.count(),
//         db.logfiles.count()
//     ]);
//     return {
//         db_name   : 'blt_local_db',
//         doc_count : reports + screenshots + logfiles,
//         update_seq: reports + screenshots + logfiles,
//         adapter   : 'dexie-indexeddb'
//     };
// },

//   /**
//    * Mimic PouchDB.get(id, { attachments, binary })
//    * QueueView calls this for screenshots and log files.
//    */
//   get: async (id, options = {}) => {
//     // ── Screenshot ───────────────────────────────────────────
//     if (id.startsWith('screenshot:')) {
//       const ss = await db.screenshots.get(id);
//       if (!ss) throw { status: 404, message: 'Not found', name: 'not_found' };

//       if (options.attachments || options.binary) {
//         const blob = base64ToBlob(ss.base64 || '', ss.mimeType || 'image/png');
//         ss._attachments = {
//           'image.png': {
//             data         : blob,
//             content_type : ss.mimeType || 'image/png',
//             length       : blob.size
//           }
//         };
//       }
//       return ss;
//     }

//     // ── Log file ─────────────────────────────────────────────
//     if (id.startsWith('logfile:')) {
//       const lf = await db.logfiles.get(id);
//       if (!lf) throw { status: 404, message: 'Not found', name: 'not_found' };

//       if (options.attachments) {
//         const raw = lf.contentBase64 || '';
//         const data = options.binary
//           ? base64ToBlob(raw, lf.filetype || 'text/plain')
//           : raw;                               // base64 string — QueueView decodes with atob
//         lf._attachments = {
//           [lf.filename || 'file.log']: {
//             data,
//             content_type: lf.filetype || 'text/plain'
//           }
//         };
//       }
//       return lf;
//     }

//     // ── Report ───────────────────────────────────────────────
//     if (id.startsWith('report:')) {
//       const r = await db.reports.get(id);
//       if (!r) throw { status: 404, message: 'Not found', name: 'not_found' };
//       return r;
//     }

//     throw { status: 404, message: 'Not found', name: 'not_found' };
//   },

//   /**
//    * Mimic PouchDB.getAttachment(id, attachmentName)
//    * Used by jiraService to fetch screenshot blobs.
//    */
//   getAttachment: async (id, _attachmentName) => {
//     if (id.startsWith('screenshot:')) {
//       const ss = await db.screenshots.get(id);
//       if (!ss?.base64) throw new Error('No attachment');
//       return base64ToBlob(ss.base64, ss.mimeType || 'image/png');
//     }
//     throw new Error('Not found');
//   }
// };

// // ─────────────────────────────────────────────────────────────
// // Indexes  (no-op — Dexie handles indexes via schema)
// // ─────────────────────────────────────────────────────────────

// export async function createIndexes() {
//   console.log('[pouchdbService] ✅ Dexie indexes ready (schema-managed)');
// }

// // ─────────────────────────────────────────────────────────────
// // Reports
// // ─────────────────────────────────────────────────────────────

// export async function saveReport(reportData) {
//   const reportId = `report:${Date.now()}:${generateShortId()}`;
//   const browserId = getBrowserId();

//   const doc = {
//     _id          : reportId,
//     type         : 'report',
//     reporter     : reportData.reporter     || {},
//     category     : reportData.category     || '',
//     description  : reportData.description  || '',
//     screenshots  : reportData.screenshots  || [],
//     logFiles     : reportData.logFiles     || [],
//     createdAt    : reportData.createdAt    || nowIso(),
//     updatedAt    : nowIso(),
//     synced       : false,
//     isDeleted    : false,
//     metadata     : reportData.metadata     || {},
//     version      : 1,
//     sourceBrowserId      : browserId,
//     lastModifiedBrowserId: browserId
//   };

//   await db.reports.put(doc);
//   await enqueue(reportId, 'report', 'create');

//   console.log('[pouchdbService] ✅ Report saved:', reportId);
//   return reportId;
// }

// export async function getAllReports() {
//   const docs = await db.reports
//     .filter(r => r.type === 'report' && !r.isDeleted)
//     .toArray();
//   return docs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
// }

// export async function getPendingReports() {
//   return db.reports
//     .filter(r => r.type === 'report' && !r.synced && !r.isDeleted)
//     .toArray();
// }

// export async function markReportSyncedLocal(reportId, jiraInfo = null) {
//   const doc = await db.reports.get(reportId);
//   if (!doc) return;
//   doc.synced   = true;
//   doc.syncedAt = nowIso();
//   if (jiraInfo) doc.jiraInfo = jiraInfo;
//   await db.reports.put(doc);
//   console.log('[pouchdbService] ✅ Report marked synced:', reportId);
// }

// export async function getReportById(reportId) {
//   const doc = await db.reports.get(reportId);
//   if (!doc) throw { status: 404, message: 'Not found' };
//   return doc;
// }

// export async function updateReport(reportId, updates) {
//   const doc = await db.reports.get(reportId);
//   if (!doc) throw { status: 404, message: 'Not found' };
//   const updated = { ...doc, ...updates, updatedAt: nowIso() };
//   await db.reports.put(updated);
//   await enqueue(reportId, 'report', 'update');
//   return updated;
// }

// export async function deleteReport(reportId) {
//   const doc = await db.reports.get(reportId);
//   if (!doc) return;
//   doc.isDeleted = true;
//   doc.updatedAt = nowIso();
//   doc.version   = (doc.version || 1) + 1;
//   await db.reports.put(doc);
//   await enqueue(reportId, 'report', 'delete');
//   console.log('[pouchdbService] ✅ Report soft-deleted:', reportId);
// }

// // ─────────────────────────────────────────────────────────────
// // Screenshots
// // ─────────────────────────────────────────────────────────────

// /**
//  * saveScreenshotAttachment — identical signature to PouchDB version.
//  * imageData can be Blob, File, or base64 data URL string.
//  */
// export async function saveScreenshotAttachment(metadata, imageData) {
//   const browserId = getBrowserId();

//   // Convert to base64
//   let base64 = '';
//   let mimeType = 'image/png';

//   if (imageData instanceof Blob || imageData instanceof File) {
//     mimeType = imageData.type || 'image/png';
//     base64   = await blobToBase64(imageData);
//   } else if (typeof imageData === 'string') {
//     // data URL format: "data:image/png;base64,xxxxx"
//     const match = imageData.match(/^data:([^;]+);base64,(.+)$/);
//     if (match) {
//       mimeType = match[1];
//       base64   = match[2];
//     } else {
//       base64 = imageData; // already raw base64
//     }
//   } else {
//     throw new Error('Invalid image data format');
//   }

//   const timestamp = Date.now();
//   const docId     = `screenshot:${timestamp}:${generateRandomId()}`;

//   const doc = {
//     _id         : docId,
//     type        : 'screenshot',
//     description : metadata.description || 'Screenshot',
//     from        : metadata.from        || 'browser',
//     surface     : metadata.surface     || 'monitor',
//     timestamp   : metadata.timestamp   || timestamp,
//     createdAt   : nowIso(),
//     updatedAt   : nowIso(),
//     position    : metadata.position    || 0,
//     synced      : false,
//     isDeleted   : false,
//     url         : metadata.url         || '',
//     base64      : base64,
//     mimeType    : mimeType,
//     version     : 1,
//     sourceBrowserId      : browserId,
//     lastModifiedBrowserId: browserId,
//     // imageUrl for direct <img src> use
//     imageUrl    : `data:${mimeType};base64,${base64}`
//   };

//   await db.screenshots.put(doc);
//   await enqueue(docId, 'screenshot', 'create');

//   console.log('[pouchdbService] ✅ Screenshot saved:', docId);
//   return docId;
// }

// export async function getAllScreenshots() {
//   const docs = await db.screenshots
//     .filter(s => s.type === 'screenshot' && !s.isDeleted)
//     .toArray();

//   // Ensure imageUrl is always present
//   return docs
//     .map(doc => ({
//       ...doc,
//       imageUrl: doc.imageUrl || (doc.base64 ? `data:${doc.mimeType || 'image/png'};base64,${doc.base64}` : null)
//     }))
//     .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
// }

// export async function getScreenshotById(screenshotId) {
//   const doc = await db.screenshots.get(screenshotId);
//   if (!doc) throw { status: 404, message: 'Not found' };
//   return {
//     ...doc,
//     imageUrl: doc.imageUrl || `data:${doc.mimeType || 'image/png'};base64,${doc.base64}`
//   };
// }

// export async function deleteScreenshot(docId) {
//   const doc = await db.screenshots.get(docId);
//   if (!doc) return;
//   doc.isDeleted = true;
//   doc.updatedAt = nowIso();
//   await db.screenshots.put(doc);
//   await enqueue(docId, 'screenshot', 'delete');
// }

// export async function updateScreenshot(docId, updates) {
//   const doc = await db.screenshots.get(docId);
//   if (!doc) throw { status: 404, message: 'Not found' };
//   const updated = { ...doc, ...updates, updatedAt: nowIso() };
//   await db.screenshots.put(updated);
//   await enqueue(docId, 'screenshot', 'update');
//   return updated;
// }

// export async function deleteScreenshots(docIds) {
//   for (const id of docIds) await deleteScreenshot(id);
// }

// export async function markScreenshotsAttached(screenshotIds, reportId) {
//   for (const id of screenshotIds) {
//     const doc = await db.screenshots.get(id);
//     if (!doc) continue;
//     doc.attachedToReport = reportId;
//     doc.attachedAt       = nowIso();
//     doc.updatedAt        = nowIso();
//     await db.screenshots.put(doc);
//   }
// }

// export async function getUnattachedScreenshots() {
//   const all = await getAllScreenshots();
//   return all.filter(s => !s.attachedToReport);
// }

// // ─────────────────────────────────────────────────────────────
// // Sync queue helpers  (used by syncManager)
// // ─────────────────────────────────────────────────────────────

// export async function getPendingSyncItems() {
//   return db.syncQueue.filter(q => !q.isSynced).toArray();
// }

// export async function markSyncItemDone(id) {
//   await db.syncQueue.update(id, { isSynced: true, syncedAt: nowIso() });
// }

// export async function getPendingCount() {
//   return db.syncQueue.filter(q => !q.isSynced).count();
// }

// // ─────────────────────────────────────────────────────────────
// // Sync meta  (used by syncManager)
// // ─────────────────────────────────────────────────────────────

// export async function getMeta(key) {
//   const row = await db.syncMeta.get(key);
//   return row?.value ?? null;
// }

// export async function setMeta(key, value) {
//   await db.syncMeta.put({ key, value });
// }

// // ─────────────────────────────────────────────────────────────
// // Upsert from sync pull  (used by syncManager)
// // ─────────────────────────────────────────────────────────────

// export async function upsertFromSync(recordType, payload) {
//   const doc = typeof payload === 'string' ? JSON.parse(payload) : payload;
//   // Always overwrite — server is authoritative on pull
//   doc.synced = true;

//   if (recordType === 'report')     await db.reports    .put(doc);
//   if (recordType === 'screenshot') {
//     // Ensure imageUrl is set
//     if (doc.base64 && !doc.imageUrl) {
//       doc.imageUrl = `data:${doc.mimeType || 'image/png'};base64,${doc.base64}`;
//     }
//     await db.screenshots.put(doc);
//   }
//   if (recordType === 'logfile')    await db.logfiles   .put(doc);
// }

// // ─────────────────────────────────────────────────────────────
// // System logs  (App.jsx dynamic import)
// // ─────────────────────────────────────────────────────────────

// export async function getSystemLogs({ level, limit = 100 } = {}) {
//   let query = db.systemlogs.orderBy('id').reverse();
//   if (level) query = query.filter(l => l.level === level);
//   return query.limit(limit).toArray();
// }

// export async function addSystemLog(level, message, data = {}) {
//   await db.systemlogs.add({ level, message, data, timestamp: nowIso() });
// }

// // ─────────────────────────────────────────────────────────────
// // Database info / clear
// // ─────────────────────────────────────────────────────────────

// export async function getDatabaseInfo() {
//   const [reports, screenshots, logfiles] = await Promise.all([
//     db.reports.count(),
//     db.screenshots.count(),
//     db.logfiles.count()
//   ]);
//   return { reports, screenshots, logfiles, name: 'blt_local_db' };
// }

// export async function clearAllData() {
//   await db.reports    .clear();
//   await db.screenshots.clear();
//   await db.logfiles   .clear();
//   await db.syncQueue  .clear();
//   await db.syncMeta   .clear();
//   console.log('[pouchdbService] ✅ All data cleared');
//   return db;
// }
/**
 * pouchdbService.js  —  Dexie.js (IndexedDB) replacement for PouchDB
 *
 * ALL exports identical to original pouchdbService.js.
 * localDB is a full PouchDB compatibility shim — main.jsx needs zero changes.
 */

import Dexie from 'dexie';

// ─────────────────────────────────────────────────────────────
// Browser identity
// ─────────────────────────────────────────────────────────────

const BROWSER_ID_KEY = 'blt_browser_id';

export function getBrowserId() {
  let id = localStorage.getItem(BROWSER_ID_KEY);
  if (!id) {
    id = 'BR-' + Date.now().toString(36).toUpperCase() + '-' +
         Math.random().toString(36).substring(2, 6).toUpperCase();
    localStorage.setItem(BROWSER_ID_KEY, id);
  }
  return id;
}

// ─────────────────────────────────────────────────────────────
// Dexie database schema
// ─────────────────────────────────────────────────────────────

export const db = new Dexie('blt_local_db');

db.version(1).stores({
  reports:     '_id, type, createdAt, synced, isDeleted, sourceBrowserId',
  screenshots: '_id, type, attachedToReport, createdAt, synced, isDeleted, sourceBrowserId',
  logfiles:    '_id, type, attachedToReport, uploadedAt, synced, isDeleted, sourceBrowserId',
  systemlogs:  '++id, level, timestamp',
  syncQueue:   '++id, recordId, recordType, isSynced, queuedAt',
  syncMeta:    'key'
});

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function generateShortId()  { return Math.random().toString(36).substring(2, 11); }
function generateRandomId() { return Math.random().toString(36).substring(2, 11); }
function nowIso()           { return new Date().toISOString(); }

function base64ToBlob(base64 = '', mimeType = 'image/png') {
  try {
    const binary = atob(base64);
    const arr = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
    return new Blob([arr], { type: mimeType });
  } catch { return new Blob([], { type: mimeType }); }
}

async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload  = () => resolve(r.result.split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

// Route _id prefix to the correct Dexie table
function tableFor(id = '') {
  if (id.startsWith('report:'))     return db.reports;
  if (id.startsWith('screenshot:')) return db.screenshots;
  if (id.startsWith('logfile:'))    return db.logfiles;
  if (id.startsWith('log:'))        return db.systemlogs;
  return null;
}

// Add to sync queue on every local write
async function enqueue(recordId, recordType, operation) {
  await db.syncQueue.add({
    recordId, recordType, operation,
    browserId : getBrowserId(),
    isSynced  : false,
    queuedAt  : nowIso(),
    retryCount: 0
  });
}

// ─────────────────────────────────────────────────────────────
// PouchDB compatibility shim — localDB
// main.jsx calls: info(), allDocs(), bulkDocs(), get(), put(),
//                 remove(), destroy(), getAttachment()
// ─────────────────────────────────────────────────────────────

export const localDB = {

  // ── info ──────────────────────────────────────────────────
  info: async () => {
    const [reports, screenshots, logfiles] = await Promise.all([
      db.reports.count(),
      db.screenshots.count(),
      db.logfiles.count()
    ]);
    return {
      db_name   : 'blt_local_db',
      doc_count : reports + screenshots + logfiles,
      update_seq: reports + screenshots + logfiles,
      adapter   : 'dexie-indexeddb'
    };
  },

  // ── get ───────────────────────────────────────────────────
  get: async (id, options = {}) => {
    if (id.startsWith('screenshot:')) {
      const ss = await db.screenshots.get(id);
      if (!ss) throw { status: 404, message: 'Not found', name: 'not_found' };
      if (options.attachments || options.binary) {
        const blob = base64ToBlob(ss.base64 || '', ss.mimeType || 'image/png');
        ss._attachments = {
          'image.png': {
            data        : blob,
            content_type: ss.mimeType || 'image/png',
            length      : blob.size
          }
        };
      }
      return ss;
    }
    if (id.startsWith('logfile:')) {
      const lf = await db.logfiles.get(id);
      if (!lf) throw { status: 404, message: 'Not found', name: 'not_found' };
      if (options.attachments) {
        const raw  = lf.contentBase64 || '';
        const data = options.binary
          ? base64ToBlob(raw, lf.filetype || 'text/plain')
          : raw;
        lf._attachments = {
          [lf.filename || 'file.log']: { data, content_type: lf.filetype || 'text/plain' }
        };
      }
      return lf;
    }
    if (id.startsWith('report:')) {
      const r = await db.reports.get(id);
      if (!r) throw { status: 404, message: 'Not found', name: 'not_found' };
      return r;
    }
    throw { status: 404, message: 'Not found', name: 'not_found' };
  },

  // ── put ───────────────────────────────────────────────────
  put: async (doc) => {
    if (!doc._id) throw { status: 400, message: '_id required' };
    const table = tableFor(doc._id);
    if (!table) throw { status: 400, message: `Unknown doc type for _id: ${doc._id}` };
    await table.put(doc);
    return { ok: true, id: doc._id, rev: '1-dexie' };
  },

  // ── remove ────────────────────────────────────────────────
  remove: async (docOrId) => {
    const id = typeof docOrId === 'string' ? docOrId : docOrId._id;
    const table = tableFor(id);
    if (table) await table.delete(id);
    return { ok: true, id };
  },

  // ── bulkDocs ──────────────────────────────────────────────
  // Used by main.jsx deleteAllLogs and other bulk operations
  bulkDocs: async (docs) => {
    const results = [];
    for (const doc of docs) {
      try {
        if (doc._deleted) {
          const id = doc._id;
          const table = tableFor(id);
          if (table) await table.delete(id);
          results.push({ ok: true, id });
        } else {
          const r = await localDB.put(doc);
          results.push(r);
        }
      } catch (e) {
        results.push({ ok: false, id: doc._id, error: e.message });
      }
    }
    return results;
  },

  // ── allDocs ───────────────────────────────────────────────
  // Used by main.jsx __BLT_DEBUG__.getDatabaseInfo and deleteAllLogs
  allDocs: async (options = {}) => {
    const startkey     = options.startkey || '';
    const endkey       = options.endkey   || '';
    const includeDocs  = options.include_docs !== false;

    let rows = [];

    // Route by key prefix
    if (startkey.startsWith('report:')) {
      const docs = await db.reports.toArray();
      rows = docs
        .filter(d => d._id >= startkey && d._id <= endkey)
        .map(doc => ({ id: doc._id, key: doc._id, doc: includeDocs ? doc : undefined }));
    } else if (startkey.startsWith('screenshot:')) {
      const docs = await db.screenshots.toArray();
      rows = docs
        .filter(d => d._id >= startkey && d._id <= endkey)
        .map(doc => ({ id: doc._id, key: doc._id, doc: includeDocs ? doc : undefined }));
    } else if (startkey.startsWith('logfile:')) {
      const docs = await db.logfiles.toArray();
      rows = docs
        .filter(d => d._id >= startkey && d._id <= endkey)
        .map(doc => ({ id: doc._id, key: doc._id, doc: includeDocs ? doc : undefined }));
    } else if (startkey.startsWith('log:')) {
      // system logs — return empty (they're in systemlogs table with auto-increment id)
      rows = [];
    } else {
      // No prefix — return all
      const [r, s, l] = await Promise.all([
        db.reports.toArray(),
        db.screenshots.toArray(),
        db.logfiles.toArray()
      ]);
      rows = [...r, ...s, ...l].map(doc => ({
        id: doc._id, key: doc._id, doc: includeDocs ? doc : undefined
      }));
    }

    return { rows, total_rows: rows.length, offset: 0 };
  },

  // ── find ──────────────────────────────────────────────────
  // Used by getPendingReports (pouchdb-find query)
  find: async ({ selector = {}, sort = [], limit = 1000 } = {}) => {
    let docs = [];

    if (selector.type === 'report') {
      docs = await db.reports.filter(r => {
        if (selector.synced !== undefined && r.synced !== selector.synced) return false;
        if (selector.isDeleted !== undefined && r.isDeleted !== selector.isDeleted) return false;
        return true;
      }).limit(limit).toArray();
    } else if (selector.type === 'screenshot') {
      docs = await db.screenshots.filter(s => {
        if (selector.synced !== undefined && s.synced !== selector.synced) return false;
        return true;
      }).limit(limit).toArray();
    } else {
      docs = await db.reports.limit(limit).toArray();
    }

    // Basic sort support
    if (sort.length > 0) {
      const [sortField] = Object.keys(sort[0] || {});
      const sortDir     = sort[0]?.[sortField] === 'asc' ? 1 : -1;
      if (sortField) {
        docs.sort((a, b) => {
          if (a[sortField] < b[sortField]) return -1 * sortDir;
          if (a[sortField] > b[sortField]) return  1 * sortDir;
          return 0;
        });
      }
    }

    return { docs };
  },

  // ── getIndexes ────────────────────────────────────────────
  // Used by createIndexes() check
  getIndexes: async () => ({
    indexes: [
      { def: { fields: ['type', 'createdAt'] } },
      { def: { fields: ['synced'] } },
      { def: { fields: ['type', 'synced'] } }
    ]
  }),

  // ── createIndex ───────────────────────────────────────────
  createIndex: async () => ({ result: 'exists' }),

  // ── sync ──────────────────────────────────────────────────
  // Stub — sync is handled by syncManager.js, not PouchDB
  sync: () => {
    console.warn('[localDB] .sync() called — use syncManager.startSync() instead');
    return {
      on: () => ({ on: () => ({ on: () => ({}) }) }),
      cancel: () => {}
    };
  },

  // ── destroy ───────────────────────────────────────────────
  destroy: async () => {
    await clearAllData();
    return { ok: true };
  },

  // ── getAttachment ─────────────────────────────────────────
  getAttachment: async (id, _attachmentName) => {
    if (id.startsWith('screenshot:')) {
      const ss = await db.screenshots.get(id);
      if (!ss?.base64) throw new Error('No attachment');
      return base64ToBlob(ss.base64, ss.mimeType || 'image/png');
    }
    throw new Error('Not found');
  }
};

// ─────────────────────────────────────────────────────────────
// Indexes  (no-op — Dexie handles via schema)
// ─────────────────────────────────────────────────────────────

export async function createIndexes() {
  console.log('[pouchdbService] ✅ Dexie indexes ready (schema-managed)');
}

// ─────────────────────────────────────────────────────────────
// Reports
// ─────────────────────────────────────────────────────────────

export async function saveReport(reportData) {
  const reportId  = `report:${Date.now()}:${generateShortId()}`;
  const browserId = getBrowserId();

  const doc = {
    _id         : reportId,
    type        : 'report',
    reporter    : reportData.reporter    || {},
    category    : reportData.category    || '',
    description : reportData.description || '',
    screenshots : reportData.screenshots || [],
    logFiles    : reportData.logFiles    || [],
    createdAt   : reportData.createdAt   || nowIso(),
    updatedAt   : nowIso(),
    synced      : false,
    isDeleted   : false,
    metadata    : reportData.metadata    || {},
    version     : 1,
    sourceBrowserId      : browserId,
    lastModifiedBrowserId: browserId
  };

  await db.reports.put(doc);
  await enqueue(reportId, 'report', 'create');
  console.log('[pouchdbService] ✅ Report saved:', reportId);
  return reportId;
}

export async function getAllReports() {
  const docs = await db.reports
    .filter(r => r.type === 'report' && !r.isDeleted)
    .toArray();
  return docs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function getPendingReports() {
  return db.reports
    .filter(r => r.type === 'report' && !r.synced && !r.isDeleted)
    .toArray();
}

export async function markReportSyncedLocal(reportId, jiraInfo = null) {
  const doc = await db.reports.get(reportId);
  if (!doc) return;
  doc.synced   = true;
  doc.syncedAt = nowIso();
  if (jiraInfo) doc.jiraInfo = jiraInfo;
  await db.reports.put(doc);
}

export async function getReportById(reportId) {
  const doc = await db.reports.get(reportId);
  if (!doc) throw { status: 404, message: 'Not found' };
  return doc;
}

export async function updateReport(reportId, updates) {
  const doc = await db.reports.get(reportId);
  if (!doc) throw { status: 404, message: 'Not found' };
  const updated = { ...doc, ...updates, updatedAt: nowIso() };
  await db.reports.put(updated);
  await enqueue(reportId, 'report', 'update');
  return updated;
}

export async function deleteReport(reportId) {
  const doc = await db.reports.get(reportId);
  if (!doc) return;
  doc.isDeleted = true;
  doc.updatedAt = nowIso();
  doc.version   = (doc.version || 1) + 1;
  await db.reports.put(doc);
  await enqueue(reportId, 'report', 'delete');
}

// ─────────────────────────────────────────────────────────────
// Screenshots
// ─────────────────────────────────────────────────────────────

export async function saveScreenshotAttachment(metadata, imageData) {
  const browserId = getBrowserId();
  let base64 = '', mimeType = 'image/png';

  if (imageData instanceof Blob || imageData instanceof File) {
    mimeType = imageData.type || 'image/png';
    base64   = await blobToBase64(imageData);
  } else if (typeof imageData === 'string') {
    const match = imageData.match(/^data:([^;]+);base64,(.+)$/);
    if (match) { mimeType = match[1]; base64 = match[2]; }
    else base64 = imageData;
  } else {
    throw new Error('Invalid image data format');
  }

  const timestamp = Date.now();
  const docId     = `screenshot:${timestamp}:${generateRandomId()}`;

  const doc = {
    _id         : docId,
    type        : 'screenshot',
    description : metadata.description || 'Screenshot',
    from        : metadata.from        || 'browser',
    surface     : metadata.surface     || 'monitor',
    timestamp   : metadata.timestamp   || timestamp,
    createdAt   : nowIso(),
    updatedAt   : nowIso(),
    position    : metadata.position    || 0,
    synced      : false,
    isDeleted   : false,
    url         : metadata.url         || '',
    base64, mimeType,
    imageUrl    : `data:${mimeType};base64,${base64}`,
    version     : 1,
    sourceBrowserId      : browserId,
    lastModifiedBrowserId: browserId
  };

  await db.screenshots.put(doc);
  await enqueue(docId, 'screenshot', 'create');
  console.log('[pouchdbService] ✅ Screenshot saved:', docId);
  return docId;
}

export async function getAllScreenshots() {
  const docs = await db.screenshots
    .filter(s => s.type === 'screenshot' && !s.isDeleted)
    .toArray();
  return docs
    .map(d => ({
      ...d,
      imageUrl: d.imageUrl || (d.base64 ? `data:${d.mimeType||'image/png'};base64,${d.base64}` : null)
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function getScreenshotById(id) {
  const doc = await db.screenshots.get(id);
  if (!doc) throw { status: 404, message: 'Not found' };
  return { ...doc, imageUrl: doc.imageUrl || `data:${doc.mimeType||'image/png'};base64,${doc.base64}` };
}

export async function deleteScreenshot(docId) {
  const doc = await db.screenshots.get(docId);
  if (!doc) return;
  doc.isDeleted = true; doc.updatedAt = nowIso();
  await db.screenshots.put(doc);
  await enqueue(docId, 'screenshot', 'delete');
}

export async function updateScreenshot(docId, updates) {
  const doc = await db.screenshots.get(docId);
  if (!doc) throw { status: 404, message: 'Not found' };
  const updated = { ...doc, ...updates, updatedAt: nowIso() };
  await db.screenshots.put(updated);
  await enqueue(docId, 'screenshot', 'update');
  return updated;
}

export async function deleteScreenshots(docIds) {
  for (const id of docIds) await deleteScreenshot(id);
}

export async function markScreenshotsAttached(screenshotIds, reportId) {
  for (const id of screenshotIds) {
    const doc = await db.screenshots.get(id);
    if (!doc) continue;
    doc.attachedToReport = reportId;
    doc.attachedAt = doc.updatedAt = nowIso();
    await db.screenshots.put(doc);
  }
}

export async function getUnattachedScreenshots() {
  const all = await getAllScreenshots();
  return all.filter(s => !s.attachedToReport);
}

// ─────────────────────────────────────────────────────────────
// Sync helpers  (used by syncManager)
// ─────────────────────────────────────────────────────────────

export async function getPendingSyncItems() {
  return db.syncQueue.filter(q => !q.isSynced).toArray();
}

export async function markSyncItemDone(id) {
  await db.syncQueue.update(id, { isSynced: true, syncedAt: nowIso() });
}

export async function getPendingCount() {
  return db.syncQueue.filter(q => !q.isSynced).count();
}

export async function getMeta(key) {
  const row = await db.syncMeta.get(key);
  return row?.value ?? null;
}

export async function setMeta(key, value) {
  await db.syncMeta.put({ key, value });
}

export async function upsertFromSync(recordType, payload) {
  const doc = typeof payload === 'string' ? JSON.parse(payload) : payload;
  doc.synced = true;
  if (recordType === 'report')     { await db.reports.put(doc); return; }
  if (recordType === 'screenshot') {
    if (doc.base64 && !doc.imageUrl)
      doc.imageUrl = `data:${doc.mimeType||'image/png'};base64,${doc.base64}`;
    await db.screenshots.put(doc); return;
  }
  if (recordType === 'logfile') { await db.logfiles.put(doc); return; }
}

// ─────────────────────────────────────────────────────────────
// System logs
// ─────────────────────────────────────────────────────────────

export async function getSystemLogs({ level, limit = 100 } = {}) {
  let q = db.systemlogs.orderBy('id').reverse();
  if (level) q = q.filter(l => l.level === level);
  return q.limit(limit).toArray();
}

export async function addSystemLog(level, message, data = {}) {
  await db.systemlogs.add({ level, message, data, timestamp: nowIso() });
}

// ─────────────────────────────────────────────────────────────
// Database info / clear
// ─────────────────────────────────────────────────────────────

export async function getDatabaseInfo() {
  const [reports, screenshots, logfiles] = await Promise.all([
    db.reports.count(), db.screenshots.count(), db.logfiles.count()
  ]);
  return { reports, screenshots, logfiles, name: 'blt_local_db' };
}

export async function clearAllData() {
  await Promise.all([
    db.reports.clear(), db.screenshots.clear(), db.logfiles.clear(),
    db.syncQueue.clear(), db.syncMeta.clear()
  ]);
  console.log('[pouchdbService] ✅ All data cleared');
  return db;
}