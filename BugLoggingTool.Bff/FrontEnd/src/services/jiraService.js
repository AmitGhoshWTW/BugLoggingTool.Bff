// /**
//  * jiraService.js  —  calls BLT Sync Service (.NET Core 10) for JIRA integration
//  * Identical exports to original.
//  */

// import { markReportSyncedLocal, localDB } from './pouchdbService';

// const SYNC_SERVICE_URL = 'http://localhost:5005';

// // ─────────────────────────────────────────────────────────────
// // Internal: build payload for .NET API
// // ─────────────────────────────────────────────────────────────

// async function buildJiraPayload(report) {
//   const screenshots = [];

//   // Load screenshot blobs
//   for (const ssId of (report.screenshots || report.captures || [])) {
//     try {
//       const blob = await localDB.getAttachment(ssId, 'image.png');
//       const reader = new FileReader();
//       const base64 = await new Promise((res, rej) => {
//         reader.onload  = () => res(reader.result.split(',')[1]);
//         reader.onerror = rej;
//         reader.readAsDataURL(blob);
//       });
//       screenshots.push({ id: ssId, base64, mimeType: blob.type || 'image/png' });
//     } catch (e) {
//       console.warn('[jiraService] Could not load screenshot:', ssId);
//     }
//   }

//   return {
//     reportId   : report._id || report.id,
//     reporter   : report.reporter || {},
//     category   : report.category || '',
//     description: report.description || '',
//     createdAt  : report.createdAt,
//     metadata   : report.metadata || {},
//     screenshots
//   };
// }

// // ─────────────────────────────────────────────────────────────
// // Send single report to JIRA via .NET API
// // ─────────────────────────────────────────────────────────────

// export async function sendReportToJira(report) {
//   try {
//     const payload = await buildJiraPayload(report);

//     const resp = await fetch(`${SYNC_SERVICE_URL}/api/jira/create`, {
//       method : 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body   : JSON.stringify(payload)
//     });

//     if (!resp.ok) {
//       const err = await resp.json().catch(() => ({}));
//       throw new Error(err.error || `HTTP ${resp.status}`);
//     }

//     const jiraInfo = await resp.json();
//     await markReportSyncedLocal(report._id || report.id, jiraInfo);

//     console.log('[jiraService] ✅ JIRA ticket created:', jiraInfo.key);
//     return { ok: true, jiraInfo };
//   } catch (err) {
//     console.error('[jiraService] Error:', err.message);
//     return { ok: false, error: err };
//   }
// }

// // ─────────────────────────────────────────────────────────────
// // Bulk send — used by QueueView
// // ─────────────────────────────────────────────────────────────

// export async function sendBulkToJira(reports) {
//   const results = [];
//   for (const r of reports) {
//     const res = await sendReportToJira(r);
//     results.push({ id: r._id || r.id, res });
//   }
//   return results;
// }

// // ─────────────────────────────────────────────────────────────
// // Auto-sync all pending
// // ─────────────────────────────────────────────────────────────

// export async function syncPendingToJira() {
//   const { getPendingReports } = await import('./pouchdbService');
//   const pending = await getPendingReports();
//   for (const p of pending) await sendReportToJira(p);
// }

// export default { sendReportToJira, sendBulkToJira, syncPendingToJira };

/**
 * jiraService.js  —  sends reports to BLT.JiraService (server)
 *
 * VITE_JIRA_SERVICE_URL = https://blt-jira.yourcompany.com
 *
 * Same exports as original — QueueView needs zero changes.
 */

import { markReportSyncedLocal, localDB } from './pouchdbService';

// Server-hosted JIRA service — set in .env
const JIRA_SERVICE_URL =
  import.meta.env.VITE_JIRA_SERVICE_URL || 'http://localhost:4000';

// ─────────────────────────────────────────────────────────────
// Build payload — load screenshot blobs from local IndexedDB
// ─────────────────────────────────────────────────────────────

async function buildPayload(report) {
  const screenshots = [];

  for (const ssId of (report.screenshots || report.captures || [])) {
    try {
      const ss = await localDB.get(ssId, { attachments: true, binary: true });
      if (ss._attachments?.['image.png']?.data) {
        const blob   = ss._attachments['image.png'].data;
        const base64 = await blobToBase64(blob);
        screenshots.push({
          id      : ssId,
          base64,
          mimeType: blob.type || 'image/png'
        });
      } else if (ss.base64) {
        // Dexie storage — base64 inline
        screenshots.push({ id: ssId, base64: ss.base64, mimeType: ss.mimeType || 'image/png' });
      }
    } catch (e) {
      console.warn('[jiraService] Could not load screenshot:', ssId);
    }
  }

  // Load log files
  const logFiles = [];
  for (const lfId of (report.logFiles || [])) {
    try {
      const lf = await localDB.get(lfId);
      logFiles.push({
        id           : lfId,
        filename     : lf.filename,
        contentBase64: lf.contentBase64 || null,
        filesize     : lf.filesize || 0
      });
    } catch (e) {
      console.warn('[jiraService] Could not load log file:', lfId);
    }
  }

  return {
    reportId    : report._id || report.id,
    reporter    : report.reporter || {},
    category    : report.category || '',
    description : report.description || '',
    createdAt   : report.createdAt,
    metadata    : report.metadata || {},
    screenshots,
    logFiles
  };
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload  = () => resolve(r.result.split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

// ─────────────────────────────────────────────────────────────
// Send single report to JIRA
// ─────────────────────────────────────────────────────────────

export async function sendReportToJira(report) {
  try {
    const payload = await buildPayload(report);

    const resp = await fetch(`${JIRA_SERVICE_URL}/api/jira/create`, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify(payload)
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${resp.status}`);
    }

    const result = await resp.json();

    if (result.success) {
      await markReportSyncedLocal(report._id || report.id, {
        key: result.key,
        url: result.url
      });
      console.log('[jiraService] ✅ JIRA ticket created:', result.key);
    }

    return { ok: result.success, jiraInfo: result };
  } catch (err) {
    console.error('[jiraService] Error:', err.message);
    return { ok: false, error: err };
  }
}

// ─────────────────────────────────────────────────────────────
// Bulk send — used by QueueView "Sync Selected" button
// ─────────────────────────────────────────────────────────────

export async function sendBulkToJira(reports) {
  const results = [];
  for (const r of reports) {
    const res = await sendReportToJira(r);
    results.push({ id: r._id || r.id, res });
  }
  return results;
}

// ─────────────────────────────────────────────────────────────
// Auto-sync all pending
// ─────────────────────────────────────────────────────────────

export async function syncPendingToJira() {
  const { getPendingReports } = await import('./pouchdbService');
  const pending = await getPendingReports();
  for (const p of pending) await sendReportToJira(p);
}

export default { sendReportToJira, sendBulkToJira, syncPendingToJira };
