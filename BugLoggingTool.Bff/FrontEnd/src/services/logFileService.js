/**
 * logFileService.js  —  Dexie replacement for PouchDB log file storage
 * Identical exports to original.
 */

import { db, getBrowserId } from './pouchdbService';
import { db as _db } from './pouchdbService';

function generateShortId() {
  return Math.random().toString(36).substring(2, 11);
}

function nowIso() { return new Date().toISOString(); }

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload  = () => resolve(r.result.split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

async function enqueue(recordId, operation) {
  await db.syncQueue.add({
    recordId,
    recordType: 'logfile',
    operation,
    browserId : getBrowserId(),
    isSynced  : false,
    queuedAt  : nowIso(),
    retryCount: 0
  });
}

// ─────────────────────────────────────────────────────────────

export async function saveLogFileAttachment(file, metadata = {}) {
  console.log('[LogFileService] Saving log file:', file.name);

  const browserId = getBrowserId();
  const docId     = `logfile:${Date.now()}:${generateShortId()}`;

  // Convert file content to base64
  const contentBase64 = await fileToBase64(file);

  const doc = {
    _id         : docId,
    type        : 'logfile',
    filename    : file.name,
    filesize    : file.size,
    filetype    : file.type || 'text/plain',
    uploadedAt  : nowIso(),
    createdAt   : nowIso(),
    updatedAt   : nowIso(),
    synced      : false,
    isDeleted   : false,
    contentBase64,
    metadata    : {
      originalPath: metadata.originalPath || '',
      description : metadata.description  || '',
      autoCollected: metadata.autoCollected || false,
      ...metadata
    },
    version              : 1,
    sourceBrowserId      : browserId,
    lastModifiedBrowserId: browserId
  };

  await db.logfiles.put(doc);
  await enqueue(docId, 'create');

  console.log('[LogFileService] ✅ Log file saved:', docId);
  return docId;
}

export async function getLogFileById(logfileId) {
  const doc = await db.logfiles.get(logfileId);
  if (!doc) throw { status: 404, message: 'Not found' };
  return doc;
}

export async function getAllLogFiles() {
  return db.logfiles
    .filter(l => l.type === 'logfile' && !l.isDeleted)
    .toArray();
}

export async function deleteLogFile(logfileId) {
  const doc = await db.logfiles.get(logfileId);
  if (!doc) return;
  doc.isDeleted = true;
  doc.updatedAt = nowIso();
  await db.logfiles.put(doc);
  await enqueue(logfileId, 'delete');
  console.log('[LogFileService] ✅ Log file deleted:', logfileId);
}

export async function downloadLogFile(logfileId) {
  const doc = await getLogFileById(logfileId);
  if (!doc.contentBase64) throw new Error('No content found');

  const binary = atob(doc.contentBase64);
  const arr    = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  const blob = new Blob([arr], { type: doc.filetype || 'text/plain' });

  return {
    filename    : doc.filename,
    blob,
    content_type: doc.filetype || 'text/plain'
  };
}
