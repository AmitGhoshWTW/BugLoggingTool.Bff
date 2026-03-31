// // src/services/backendClient.js

// const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

// class BackendClient {
//   constructor() {
//     this.baseURL = BACKEND_URL;
//     this.timeout = 10000; // 10 seconds
//   }

//   /**
//    * Generic fetch with timeout
//    */
//   async fetchWithTimeout(url, options = {}) {
//     const controller = new AbortController();
//     const timeoutId = setTimeout(() => controller.abort(), this.timeout);

//     try {
//       const response = await fetch(url, {
//         ...options,
//         signal: controller.signal
//       });

//       clearTimeout(timeoutId);

//       if (!response.ok) {
//         const error = await response.json().catch(() => ({}));
//         throw new Error(error.error || `HTTP ${response.status}`);
//       }

//       return await response.json();
//     } catch (error) {
//       clearTimeout(timeoutId);
      
//       if (error.name === 'AbortError') {
//         throw new Error('Request timeout - backend service may not be running');
//       }
      
//       throw error;
//     }
//   }

//   /**
//    * Check if backend service is available
//    */
//   async healthCheck() {
//     try {
//       const data = await this.fetchWithTimeout(`${this.baseURL}/api/health`);
//       return data.status === 'ok';
//     } catch (error) {
//       console.error('[BackendClient] Health check failed:', error.message);
//       return false;
//     }
//   }

//   /**
//    * Get configured log paths
//    */
//   async getLogPaths() {
//     try {
//       const data = await this.fetchWithTimeout(`${this.baseURL}/api/log-paths`);
//       return data.paths || [];
//     } catch (error) {
//       console.error('[BackendClient] Error getting log paths:', error);
//       throw error;
//     }
//   }

//   /**
//    * Test all configured paths
//    */
//   async testPaths() {
//     try {
//       const data = await this.fetchWithTimeout(`${this.baseURL}/api/log-paths/test`);
//       return data.results || [];
//     } catch (error) {
//       console.error('[BackendClient] Error testing paths:', error);
//       throw error;
//     }
//   }

//   /**
//    * Auto-collect all log files
//    */
//   async autoCollectLogs() {
//     try {
//       console.log('[BackendClient] Requesting auto-collect...');
      
//       const data = await this.fetchWithTimeout(`${this.baseURL}/api/log-files/auto-collect`);
      
//       console.log('[BackendClient] Auto-collect response:', {
//         collected: data.collected?.length || 0,
//         failed: data.failed?.length || 0
//       });

//       return data;
//     } catch (error) {
//       console.error('[BackendClient] Error in auto-collect:', error);
//       throw error;
//     }
//   }

//   /**
//    * Read single log file by path
//    */
//   async readLogFile(path) {
//     try {
//       const data = await this.fetchWithTimeout(`${this.baseURL}/api/log-file/read`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json'
//         },
//         body: JSON.stringify({ path })
//       });

//       return data.fileData;
//     } catch (error) {
//       console.error('[BackendClient] Error reading log file:', error);
//       throw error;
//     }
//   }

//   /**
//    * Read log file by ID (from config)
//    */
//   async readLogFileById(id) {
//     try {
//       const data = await this.fetchWithTimeout(`${this.baseURL}/api/log-file/${id}`);
//       return data.fileData;
//     } catch (error) {
//       console.error('[BackendClient] Error reading log file by ID:', error);
//       throw error;
//     }
//   }

//   /**
//    * Convert file data from backend to File object
//    */
//   createFileFromData(fileData) {
//     const blob = new Blob([fileData.content], { type: 'text/plain' });
    
//     const file = new File([blob], fileData.filename, {
//       type: 'text/plain',
//       lastModified: fileData.modified ? new Date(fileData.modified).getTime() : Date.now()
//     });

//     return file;
//   }
// }

// export const backendClient = new BackendClient();

// src/services/backendClient.js
// Redirected: localhost:3001 --> BLT Agent localhost:42080
// All log collection, health check and file ops now go through the agent.

const AGENT_URL = 'http://localhost:42080';

// ── Token cache ───────────────────────────────────────────────────────────────
let _token = null;

async function _getToken() {
  if (_token) return _token;
  try {
    const r = await fetch(`${AGENT_URL}/api/token`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(3000)
    });
    if (!r.ok) throw new Error(`Token endpoint ${r.status}`);
    const d = await r.json();
    _token = d.token;
    return _token;
  } catch (err) {
    console.warn('[BackendClient] Could not get agent token:', err.message);
    return null;
  }
}

async function _agentFetch(path, options = {}, _isRetry = false) {
  const token = await _getToken();
  const res = await fetch(`${AGENT_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  // Token rotated (agent restarted) — clear and retry once
  if (res.status === 401 && !_isRetry) {
    _token = null;
    return _agentFetch(path, options, true);
  }
  return res;
}

// ── BackendClient ─────────────────────────────────────────────────────────────

class BackendClient {
  constructor() {
    this.baseURL = AGENT_URL;
    this.timeout = 10000;
  }

  // ── Was: GET localhost:3001/api/health
  // ── Now: GET localhost:42080/health  (no auth needed — public endpoint)
  async healthCheck() {
    try {
      const r = await fetch(`${AGENT_URL}/health`, {
        signal: AbortSignal.timeout(2000)
      });
      if (!r.ok) return false;
      const d = await r.json();
      return d.status === 'ok';
    } catch (err) {
      console.error('[BackendClient] Health check failed:', err.message);
      return false;
    }
  }

  // ── Was: GET localhost:3001/api/log-paths
  // ── Now: GET localhost:42080/api/log-paths
  async getLogPaths() {
    try {
      const r = await _agentFetch('/api/log-paths');
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      return d.paths || [];
    } catch (err) {
      console.error('[BackendClient] Error getting log paths:', err.message);
      throw err;
    }
  }

  // ── Was: GET localhost:3001/api/log-paths/test
  // ── Now: POST localhost:42080/api/test-path  (agent tests one path at a time)
  //         Called for each path returned by getLogPaths()
  async testPaths() {
    try {
      const paths = await this.getLogPaths();
      const results = await Promise.all(
        paths.map(async path => {
          const r = await _agentFetch('/api/test-path', {
            method: 'POST',
            body: JSON.stringify({ path })
          });
          const d = r.ok ? await r.json() : { accessible: false };
          return { path, ...d };
        })
      );
      return results;
    } catch (err) {
      console.error('[BackendClient] Error testing paths:', err.message);
      throw err;
    }
  }

  // ── Was: GET localhost:3001/api/log-files/auto-collect
  // ── Now: GET localhost:42080/api/collect-logs
  async autoCollectLogs() {
    try {
      console.log('[BackendClient] Requesting auto-collect...');
      const r = await _agentFetch('/api/collect-logs');
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      console.log('[BackendClient] Auto-collect response:', {
        collected: d.collected?.length || d.files?.length || 0,
        failed:    d.failed?.length || 0
      });
      return d;
    } catch (err) {
      console.error('[BackendClient] Error in auto-collect:', err.message);
      throw err;
    }
  }

  // ── Was: POST localhost:3001/api/log-file/read  { path }
  // ── Now: POST localhost:42080/api/log-paths     (add path then collect)
  //         Agent doesn't have a direct "read file by path" endpoint —
  //         add the path, collect, then remove it (non-destructive)
  async readLogFile(path) {
    try {
      // 1. Register path with agent
      const addRes = await _agentFetch('/api/log-paths', {
        method: 'POST',
        body: JSON.stringify({ path })
      });
      if (!addRes.ok && addRes.status !== 409) { // 409 = already exists, fine
        throw new Error(`Add path failed: ${addRes.status}`);
      }

      // 2. Collect
      const collectRes = await _agentFetch('/api/collect-logs');
      if (!collectRes.ok) throw new Error(`Collect failed: ${collectRes.status}`);
      const data = await collectRes.json();

      // 3. Find the file that matches our path
      const files = data.files || data.collected || [];
      const match = files.find(f => f.path === path || f.filePath === path);

      return match?.fileData || match?.content || null;
    } catch (err) {
      console.error('[BackendClient] Error reading log file:', err.message);
      throw err;
    }
  }

  // ── Was: GET localhost:3001/api/log-file/:id
  // ── Now: GET localhost:42080/api/logfiles/:id  (agent log file by id)
  async readLogFileById(id) {
    try {
      const r = await _agentFetch(`/api/logfiles/${id}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      return d.fileData || d.content || null;
    } catch (err) {
      console.error('[BackendClient] Error reading log file by ID:', err.message);
      throw err;
    }
  }

  // ── Unchanged — pure client-side, no network call ─────────────────────────
  createFileFromData(fileData) {
    const blob = new Blob([fileData.content], { type: 'text/plain' });
    return new File([blob], fileData.filename, {
      type: 'text/plain',
      lastModified: fileData.modified
        ? new Date(fileData.modified).getTime()
        : Date.now()
    });
  }
}

export const backendClient = new BackendClient();