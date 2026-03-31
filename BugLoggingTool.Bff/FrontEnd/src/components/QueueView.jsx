// src/components/QueueView.jsx
// Updated with Role-Based Access Control - ALL existing features preserved
import React, { useEffect, useState, useRef } from "react";
import eventBus from "../utils/eventBus";
import { 
  getAllReports, 
  localDB, 
  saveScreenshotAttachment,
  deleteReport as deleteReportFromDB
} from "../services/pouchdbService";
import { sendBulkToJira } from "../services/jiraService";
import { useAuth } from "../hooks/useAuth";

/**
 * QueueView - PouchDB-backed with screenshot, log file support, and RBAC
 */
export default function QueueView() {
  const [reports, setReports] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Screenshot modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [carousel, setCarousel] = useState({ reportIndex: 0, imageIndex: 0, urls: [] });
  const [annotating, setAnnotating] = useState(false);
  const canvasRef = useRef(null);
  const drawingRef = useRef({ drawing: false, lastX: 0, lastY: 0 });

  // Log file modal states
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [currentLogFile, setCurrentLogFile] = useState(null);

  // ✨ NEW: RBAC - Get auth context
  const { user, hasRole, hasAnyRole, getUserRoles } = useAuth();
  
  // ✨ NEW: RBAC - Determine user permissions
  const canViewAllReports = hasAnyRole(['ITSupport', 'Admin']);
  const canDeleteReports = hasAnyRole(['PowerUser', 'ITSupport', 'Admin']);
  const canExportReports = hasAnyRole(['PowerUser', 'ITSupport', 'Admin']);
  const isAdmin = hasRole('Admin');
  const userRoles = getUserRoles();

  // ✨ NEW: RBAC - Filter mode
  const [filterMode, setFilterMode] = useState("mine"); // "mine" or "all"

  useEffect(() => {
    load();

    const onReportAdded = () => {
      console.log('[QueueView] Report added event received');
      load();
    };

    // Listen for sync events from other browsers
    const onDataSynced = (data) => {
      console.log('[QueueView] 🔄 Data synced from remote:', data);
      
      if (data.hasReports || data.hasScreenshots) {
        console.log('[QueueView] Auto-reloading due to remote changes...');
        load();
        
        if (data.direction === 'pull') {
          showToast('📥 New data synced from other device!');
        }
      }
    };
    
    eventBus.on("report-added", onReportAdded);
    eventBus.on("data-synced", onDataSynced);

    return () => {
      eventBus.off("report-added", onReportAdded);
      eventBus.off("data-synced", onDataSynced);
    };
  }, [filterMode]); // ✨ Reload when filter changes

  function showToast(message) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #4CAF50;
      color: white;
      padding: 12px 20px;
      border-radius: 6px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 3000);
  }

  async function load() {
    try {
      setLoading(true);
      console.log('[QueueView] Loading reports...');
      
      const data = await getAllReports();
      console.log('[QueueView] Got reports:', data.length);

      // Load screenshots AND log files for each report
      const enhanced = await Promise.all(
        data.map(async (r) => {
          const urls = [];
          
          // Load screenshots
          const screenshotIds = r.screenshots || r.captures || [];
          const validScreenshotIds = screenshotIds.filter(id => 
            id !== null && 
            id !== undefined && 
            typeof id === 'string' && 
            id.trim() !== ''
          );

          console.log('[QueueView] Report:', r._id, 'has valid screenshots:', validScreenshotIds.length);

          if (validScreenshotIds.length > 0) {
            for (const screenshotId of validScreenshotIds) {
              try {
                const doc = await localDB.get(screenshotId, {
                  attachments: true,
                  binary: true
                });

                if (doc._attachments && doc._attachments['image.png']) {
                  const blob = doc._attachments['image.png'].data;
                  
                  if (blob instanceof Blob) {
                    const url = URL.createObjectURL(blob);
                    urls.push({ id: screenshotId, url });
                    console.log('[QueueView] ✅ Loaded screenshot:', screenshotId);
                  }
                }
              } catch (e) {
                console.warn('[QueueView] ⚠️ Screenshot not found:', screenshotId, e.message);
              }
            }
          }

          // Load log files
          const logFileIds = r.logFiles || [];
          const logFiles = [];

          for (const logFileId of logFileIds) {
            try {
              const logDoc = await localDB.get(logFileId, {
                attachments: false // Don't load full content for preview
              });

              logFiles.push({
                id: logFileId,
                filename: logDoc.filename,
                filesize: logDoc.filesize,
                filetype: logDoc.filetype,
                uploadedAt: logDoc.uploadedAt,
                metadata: logDoc.metadata || {}
              });

              console.log('[QueueView] ✅ Loaded log file info:', logDoc.filename);
            } catch (e) {
              console.warn('[QueueView] ⚠️ Log file not found:', logFileId);
            }
          }

          return { 
            ...r, 
            previewUrls: urls,
            logFiles: logFiles
          };
        })
      );

      console.log('[QueueView] Enhanced reports:', enhanced.length);
      
      // ✨ NEW: Filter based on role and user selection
      let filteredReports = enhanced;
      
      if (filterMode === "mine" || !canViewAllReports) {
        // Show only user's own reports
        filteredReports = enhanced.filter(
          report => report.reporter?.azureAdUserId === user?.id ||
                    report.reporter?.azureAdEmail === user?.email ||
                    report.reporter?.azureAdName === user?.name
        );
        console.log('[QueueView] Filtered to user reports:', filteredReports.length);
      }
      // If filterMode === "all" and user has permission, show all reports
      
      setReports(filteredReports);
      
    } catch (error) {
      console.error('[QueueView] ❌ Error loading reports:', error);
      setReports([]);
    } finally {
      setLoading(false);
    }
  }

  function toggleSelect(id) {
    setSelected((prev) => 
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function syncSelected() {
    if (!selected.length) return;
    
    try {
      const sel = reports.filter((r) => selected.includes(r._id || r.id));
      console.log('[QueueView] Syncing reports to JIRA:', sel.length);
      
      await sendBulkToJira(sel);
      
      alert(`✅ Successfully synced ${sel.length} report(s) to JIRA!`);
      
      setSelected([]);
      await load();
    } catch (error) {
      console.error('[QueueView] Error syncing to JIRA:', error);
      alert('❌ Failed to sync to JIRA: ' + error.message);
    }
  }

  // ✨ NEW: RBAC - Export reports
  function handleExportReports() {
    if (!canExportReports) {
      alert("❌ You don't have permission to export reports.\n\nRequired roles: PowerUser, ITSupport, or Admin");
      return;
    }

    try {
      const dataStr = JSON.stringify(reports, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `blt-reports-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      
      showToast(`✅ Exported ${reports.length} report(s) successfully!`);
    } catch (error) {
      console.error('[QueueView] Error exporting reports:', error);
      alert('❌ Failed to export reports: ' + error.message);
    }
  }

  // ✨ NEW: RBAC - Delete individual report
  async function handleDeleteReport(reportId, reportDescription) {
    if (!canDeleteReports) {
      alert("❌ You don't have permission to delete reports.\n\nRequired roles: PowerUser, ITSupport, or Admin");
      return;
    }

    const confirmed = window.confirm(
      `⚠️ Are you sure you want to delete this report?\n\n` +
      `"${reportDescription?.substring(0, 60)}..."\n\n` +
      `This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      await deleteReportFromDB(reportId);
      showToast("✅ Report deleted successfully!");
      await load();
    } catch (error) {
      console.error('[QueueView] Error deleting report:', error);
      alert('❌ Failed to delete report: ' + error.message);
    }
  }

  // ✨ NEW: RBAC - Clear all reports (Admin only)
  async function handleClearAllReports() {
    if (!isAdmin) {
      alert("❌ You don't have permission to clear all reports.\n\nRequired role: Admin");
      return;
    }

    const confirmed = window.confirm(
      "🚨 DANGER: Clear ALL Reports?\n\n" +
      "This will permanently delete ALL bug reports in the database.\n\n" +
      "This action CANNOT be undone!\n\n" +
      "Are you absolutely sure?"
    );

    if (!confirmed) return;

    const doubleConfirm = window.confirm(
      "⚠️ FINAL WARNING\n\n" +
      `You are about to delete ${reports.length} reports.\n\n` +
      "Type YES in the next prompt to continue."
    );

    if (!doubleConfirm) return;

    const typed = prompt("Type YES (in capital letters) to confirm:");
    if (typed !== "YES") {
      alert("❌ Cancelled. Reports were NOT deleted.");
      return;
    }

    try {
      for (const report of reports) {
        await deleteReportFromDB(report._id);
      }
      showToast("✅ All reports cleared successfully!");
      await load();
    } catch (error) {
      console.error('[QueueView] Error clearing reports:', error);
      alert('❌ Failed to clear reports: ' + error.message);
    }
  }

  // ============================================
  // SCREENSHOT MODAL FUNCTIONS (EXISTING)
  // ============================================

  function openModal(reportIndex, imgIndex = 0) {
    const r = reports[reportIndex];
    const urls = (r.previewUrls || []).map((p) => p.url);
    
    if (!urls.length) {
      alert('No screenshots available for this report');
      return;
    }
    
    setCarousel({ reportIndex, imageIndex: imgIndex, urls });
    setModalOpen(true);
    setAnnotating(false);
  }

  function closeModal() {
    setModalOpen(false);
    setAnnotating(false);
  }

  function prevImage() {
    setCarousel((p) => ({ 
      ...p, 
      imageIndex: (p.imageIndex - 1 + p.urls.length) % p.urls.length 
    }));
  }

  function nextImage() {
    setCarousel((p) => ({ 
      ...p, 
      imageIndex: (p.imageIndex + 1) % p.urls.length 
    }));
  }

  function startDrawing(e) {
    if (!annotating) return;
    drawingRef.current.drawing = true;
    const rect = canvasRef.current.getBoundingClientRect();
    drawingRef.current.lastX = e.clientX - rect.left;
    drawingRef.current.lastY = e.clientY - rect.top;
  }

  function stopDrawing() {
    drawingRef.current.drawing = false;
  }

  function draw(e) {
    if (!annotating || !drawingRef.current.drawing) return;
    
    const ctx = canvasRef.current.getContext("2d");
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    ctx.strokeStyle = "#ffff00";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(drawingRef.current.lastX, drawingRef.current.lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
    
    drawingRef.current.lastX = x;
    drawingRef.current.lastY = y;
  }

  function enableAnnotation() {
    setAnnotating(true);
    
    setTimeout(() => {
      const imgUrl = carousel.urls[carousel.imageIndex];
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext("2d");
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.style.cursor = "crosshair";
      };
      
      img.crossOrigin = "anonymous";
      img.src = imgUrl;
    }, 50);
  }

  async function saveAnnotation() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.toBlob(async (blob) => {
      if (!blob) {
        alert('Failed to create annotation');
        return;
      }
      
      try {
        await saveScreenshotAttachment(
          { 
            from: "annotation",
            description: "Annotated screenshot",
            timestamp: Date.now()
          },
          blob
        );
        
        await load();
        setAnnotating(false);
        showToast("✅ Annotated image saved successfully!");
      } catch (error) {
        console.error('Error saving annotation:', error);
        alert('❌ Failed to save annotation: ' + error.message);
      }
    }, "image/png");
  }

  function clearAnnotation() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    const img = new Image();
    
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    
    img.crossOrigin = "anonymous";
    img.src = carousel.urls[carousel.imageIndex];
  }

  // ============================================
  // LOG FILE FUNCTIONS (EXISTING)
  // ============================================

  async function previewLogFile(logFileId, filename) {
    try {
      console.log('[QueueView] Previewing log file:', logFileId);

      const logDoc = await localDB.get(logFileId, {
        attachments: true,
        binary: false
      });

      const attachmentName = Object.keys(logDoc._attachments)[0];
      if (!attachmentName) {
        alert('❌ Log file attachment not found');
        return;
      }

      // Get content
      let content = logDoc._attachments[attachmentName].data;
      
      // If it's base64, decode it
      if (typeof content === 'string' && content.length > 0) {
        try {
          content = atob(content);
        } catch (e) {
          // Already decoded
        }
      }

      setCurrentLogFile({
        filename,
        content,
        filesize: logDoc.filesize
      });
      setLogModalOpen(true);

    } catch (error) {
      console.error('[QueueView] Error previewing log file:', error);
      alert('❌ Failed to preview log file: ' + error.message);
    }
  }

  async function downloadLogFile(logFileId, filename) {
    try {
      console.log('[QueueView] Downloading log file:', logFileId);

      const logDoc = await localDB.get(logFileId, {
        attachments: true,
        binary: true
      });

      const attachmentName = Object.keys(logDoc._attachments)[0];
      if (!attachmentName) {
        alert('❌ Log file attachment not found');
        return;
      }

      const blob = logDoc._attachments[attachmentName].data;
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log('[QueueView] ✅ Log file downloaded');
      showToast(`✅ Downloaded ${filename}`);
    } catch (error) {
      console.error('[QueueView] Error downloading log file:', error);
      alert('❌ Failed to download log file: ' + error.message);
    }
  }

  function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  // ✨ NEW: Helper for role badge styling
  const getRoleBadgeStyle = (role) => ({
    padding: "4px 10px",
    borderRadius: "12px",
    fontSize: "11px",
    fontWeight: "600",
    marginLeft: "6px",
    display: "inline-block",
    backgroundColor: 
      role === 'Admin' ? '#fce7f3' :
      role === 'ITSupport' ? '#dbeafe' :
      role === 'PowerUser' ? '#fef3c7' :
      '#f3e8ff',
    color:
      role === 'Admin' ? '#be185d' :
      role === 'ITSupport' ? '#1e40af' :
      role === 'PowerUser' ? '#92400e' :
      '#6b21a8'
  });

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="dashboard-box">
      {/* Header with Role Badges and Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h3 style={{ margin: 0 }}>Queued Reports ({reports.length})</h3>
          {/* ✨ NEW: Show user's roles */}
          {userRoles.map(role => (
            <span key={role} style={getRoleBadgeStyle(role)}>
              {role}
            </span>
          ))}
        </div>
        
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {/* ✨ NEW: Export Button (PowerUser+) */}
          <button
            onClick={handleExportReports}
            disabled={!canExportReports}
            style={{
              padding: '8px 16px',
              background: canExportReports ? '#28a745' : '#e9ecef',
              color: canExportReports ? 'white' : '#6c757d',
              border: 'none',
              borderRadius: '4px',
              cursor: canExportReports ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: '500',
              opacity: canExportReports ? 1 : 0.6,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
            title={!canExportReports ? "Required: PowerUser, ITSupport, or Admin role" : "Export reports to JSON"}
          >
            📦 Export
            {!canExportReports && <span style={{ fontSize: '10px' }}>🔒</span>}
          </button>

          {/* ✨ NEW: Clear All Button (Admin only) */}
          <button
            onClick={handleClearAllReports}
            disabled={!isAdmin}
            style={{
              padding: '8px 16px',
              background: isAdmin ? '#dc3545' : '#e9ecef',
              color: isAdmin ? 'white' : '#6c757d',
              border: 'none',
              borderRadius: '4px',
              cursor: isAdmin ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: '500',
              opacity: isAdmin ? 1 : 0.6,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
            title={!isAdmin ? "Required: Admin role" : "Clear all reports (DANGER)"}
          >
            🗑️ Clear All
            {!isAdmin && <span style={{ fontSize: '10px' }}>🔒</span>}
          </button>

          {/* EXISTING: Sync to JIRA */}
          <button 
            onClick={syncSelected} 
            disabled={!selected.length || loading}
            style={{
              padding: '8px 16px',
              background: selected.length ? '#0078d7' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: selected.length ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            📤 Sync Selected ({selected.length})
          </button>
        </div>
      </div>

      {/* ✨ NEW: Filter Controls (only show if user can view all reports) */}
      {canViewAllReports && (
        <div style={{
          padding: "12px",
          backgroundColor: "#f8f9fa",
          borderRadius: "8px",
          marginBottom: "16px"
        }}>
          <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
            <button
              onClick={() => setFilterMode("mine")}
              style={{
                padding: "8px 16px",
                border: "1px solid #dee2e6",
                borderRadius: "6px",
                backgroundColor: filterMode === "mine" ? "#0078d7" : "white",
                color: filterMode === "mine" ? "white" : "#495057",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: "500",
                transition: "all 0.2s"
              }}
            >
              👤 My Reports
            </button>
            <button
              onClick={() => setFilterMode("all")}
              style={{
                padding: "8px 16px",
                border: "1px solid #dee2e6",
                borderRadius: "6px",
                backgroundColor: filterMode === "all" ? "#0078d7" : "white",
                color: filterMode === "all" ? "white" : "#495057",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: "500",
                transition: "all 0.2s"
              }}
            >
              🌐 All Reports (IT Mode)
            </button>
          </div>
          
          {filterMode === "all" && (
            <div style={{ fontSize: "12px" }}>
              <span style={{
                color: "#856404",
                backgroundColor: "#fff3cd",
                padding: "4px 10px",
                borderRadius: "4px",
                display: "inline-block"
              }}>
                ℹ️ Viewing all reports (ITSupport/Admin privilege)
              </span>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          <p>⏳ Loading reports...</p>
        </div>
      ) : reports.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px', 
          border: '2px dashed #ddd',
          borderRadius: '8px',
          color: '#999'
        }}>
          <p style={{ margin: 0, fontSize: '16px' }}>📋 No reports yet</p>
          <p style={{ margin: '8px 0 0 0', fontSize: '13px' }}>
            {filterMode === "mine" 
              ? "Create your first report using the form above"
              : "No reports in the system yet"}
          </p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ 
            width: "100%", 
            borderCollapse: "collapse",
            fontSize: '14px'
          }}>
            <thead>
              <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                <th style={{ padding: '12px 8px', textAlign: 'left' }}>Select</th>
                <th style={{ padding: '12px 8px', textAlign: 'left' }}>ID</th>
                <th style={{ padding: '12px 8px', textAlign: 'left' }}>Reporter</th>
                <th style={{ padding: '12px 8px', textAlign: 'left' }}>Category</th>
                <th style={{ padding: '12px 8px', textAlign: 'left' }}>Description</th>
                <th style={{ padding: '12px 8px', textAlign: 'left' }}>Screenshots</th>
                <th style={{ padding: '12px 8px', textAlign: 'left' }}>Log Files</th>
                <th style={{ padding: '12px 8px', textAlign: 'left' }}>Created</th>
                <th style={{ padding: '12px 8px', textAlign: 'left' }}>Synced?</th>
                {/* ✨ NEW: Delete column */}
                <th style={{ padding: '12px 8px', textAlign: 'left' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r, ri) => (
                <tr 
                  key={r._id || r.id} 
                  style={{ 
                    borderBottom: "1px solid #eee",
                    background: selected.includes(r._id || r.id) ? '#e3f2fd' : 'white'
                  }}
                >
                  <td style={{ padding: '8px' }}>
                    <input 
                      type="checkbox" 
                      checked={selected.includes(r._id || r.id)} 
                      onChange={() => toggleSelect(r._id || r.id)} 
                      disabled={r.synced}
                      style={{ 
                        width: '18px', 
                        height: '18px', 
                        cursor: r.synced ? 'not-allowed' : 'pointer' 
                      }}
                    />
                  </td>
                  <td style={{ padding: '8px', fontFamily: "monospace", fontSize: '12px', color: '#666' }}>
                    <code style={{ 
                      background: '#f8f9fa', 
                      padding: '2px 6px', 
                      borderRadius: '4px'
                    }}>
                      {(r._id || r.id).split(':')[1]?.substring(0, 8) || (r._id || r.id).substring(0, 8)}
                    </code>
                  </td>
                  <td style={{ padding: '8px' }}>
                    <div style={{ fontWeight: '500' }}>{r.reporter?.fullName || '—'}</div>
                    {r.reporter?.supervisor && (
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        Sup: {r.reporter.supervisor}
                      </div>
                    )}
                    {/* ✨ NEW: Show email in "All Reports" mode */}
                    {filterMode === "all" && r.reporter?.azureAdEmail && (
                      <div style={{ fontSize: '11px', color: '#0078d7' }}>
                        📧 {r.reporter.azureAdEmail}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '8px' }}>
                    <span style={{
                      background: '#e3f2fd',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#0078d7'
                    }}>
                      {r.category || r.triage || "—"}
                    </span>
                  </td>
                  <td style={{ padding: '8px', maxWidth: 250 }}>
                    <div style={{ 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      fontSize: '13px',
                      color: '#495057',
                      lineHeight: '1.4'
                    }}>
                      {r.description || "—"}
                    </div>
                  </td>
                  <td style={{ padding: '8px' }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: 'wrap' }}>
                      {(r.previewUrls || []).slice(0, 3).map((p, idx) => (
                        <img 
                          key={idx} 
                          src={p.url} 
                          alt={`thumbnail ${idx + 1}`}
                          onClick={() => openModal(ri, idx)} 
                          style={{ 
                            width: 60, 
                            height: 45, 
                            objectFit: "cover", 
                            borderRadius: 4, 
                            cursor: "pointer", 
                            border: "2px solid #ddd",
                            transition: 'border-color 0.2s'
                          }} 
                          onMouseEnter={(e) => e.target.style.borderColor = '#0078d7'}
                          onMouseLeave={(e) => e.target.style.borderColor = '#ddd'}
                        />
                      ))}
                      {(r.previewUrls || []).length > 3 && (
                        <div style={{ 
                          fontSize: 12, 
                          color: "#666", 
                          fontWeight: '600',
                          background: '#f8f9fa',
                          padding: '4px 8px',
                          borderRadius: '4px'
                        }}>
                          +{r.previewUrls.length - 3}
                        </div>
                      )}
                      {(r.previewUrls || []).length === 0 && (
                        <span style={{ fontSize: 12, color: '#999' }}>No screenshots</span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '8px' }}>
                    {(r.logFiles || []).length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {r.logFiles.map((logFile) => (
                          <div 
                            key={logFile.id}
                            style={{
                              background: '#fff3cd',
                              padding: '6px 8px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              border: '1px solid #ffc107',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              gap: '8px',
                              minWidth: '200px'
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ 
                                fontWeight: '500', 
                                color: '#856404',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                📄 {logFile.filename}
                              </div>
                              <div style={{ fontSize: '11px', color: '#856404', opacity: 0.8 }}>
                                {formatFileSize(logFile.filesize)}
                                {logFile.metadata?.autoCollected && (
                                  <span style={{ marginLeft: '4px' }}>• AUTO</span>
                                )}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button
                                onClick={() => previewLogFile(logFile.id, logFile.filename)}
                                style={{
                                  padding: '4px 8px',
                                  background: '#0078d7',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '3px',
                                  cursor: 'pointer',
                                  fontSize: '11px',
                                  fontWeight: '500',
                                  whiteSpace: 'nowrap'
                                }}
                                title="Preview log file"
                              >
                                👁️
                              </button>
                              <button
                                onClick={() => downloadLogFile(logFile.id, logFile.filename)}
                                style={{
                                  padding: '4px 8px',
                                  background: '#28a745',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '3px',
                                  cursor: 'pointer',
                                  fontSize: '11px',
                                  fontWeight: '500',
                                  whiteSpace: 'nowrap'
                                }}
                                title="Download log file"
                              >
                                ⬇️
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: '#999' }}>No log files</span>
                    )}
                  </td>
                  <td style={{ padding: '8px', fontSize: '12px', color: '#666' }}>
                    {new Date(r.createdAt).toLocaleString()}
                  </td>
                  <td style={{ padding: '8px' }}>
                    <span style={{ 
                      background: r.synced ? '#d4edda' : '#fff3cd',
                      color: r.synced ? '#155724' : '#856404',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}>
                      {r.synced ? "✓ Synced" : "⏳ Pending"}
                    </span>
                  </td>
                  {/* ✨ NEW: Delete button column */}
                  <td style={{ padding: '8px' }}>
                    <button
                      onClick={() => handleDeleteReport(r._id, r.description)}
                      disabled={!canDeleteReports}
                      style={{
                        padding: '6px 12px',
                        background: canDeleteReports ? '#dc3545' : '#e9ecef',
                        color: canDeleteReports ? 'white' : '#6c757d',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: canDeleteReports ? 'pointer' : 'not-allowed',
                        fontSize: '12px',
                        fontWeight: '500',
                        opacity: canDeleteReports ? 1 : 0.6,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title={!canDeleteReports ? "Required: PowerUser, ITSupport, or Admin role" : "Delete this report"}
                    >
                      🗑️
                      {!canDeleteReports && <span style={{ fontSize: '8px' }}>🔒</span>}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ✨ NEW: Footer with Stats */}
      {reports.length > 0 && (
        <div style={{
          padding: "12px",
          backgroundColor: "#f8f9fa",
          borderRadius: "8px",
          marginTop: "16px",
          display: "flex",
          gap: "16px",
          alignItems: "center",
          fontSize: "13px",
          color: "#495057"
        }}>
          <span>Total Reports: <strong>{reports.length}</strong></span>
          {canViewAllReports && filterMode === "all" && (
            <span style={{
              backgroundColor: "#d1ecf1",
              color: "#0c5460",
              padding: "4px 10px",
              borderRadius: "4px",
              fontSize: "12px"
            }}>
              🌐 Viewing all reports across all users
            </span>
          )}
        </div>
      )}

      {/* EXISTING: Screenshot Modal with Annotation */}
      {modalOpen && (
        <div 
          className="modal-backdrop" 
          onClick={() => { if (!annotating) closeModal(); }} 
          style={{ 
            position: "fixed", 
            inset: 0, 
            background: "rgba(0,0,0,0.85)", 
            display: "flex", 
            justifyContent: "center", 
            alignItems: "center",
            zIndex: 10000,
            padding: '20px'
          }}
        >
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()} 
            style={{ 
              background: "#fff", 
              padding: 24, 
              borderRadius: 12, 
              width: "95%", 
              maxWidth: 1400,
              maxHeight: '95vh',
              overflow: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
            }}
          >
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              marginBottom: 16, 
              alignItems: 'center',
              paddingBottom: '12px',
              borderBottom: '2px solid #eee'
            }}>
              <div>
                <strong style={{ fontSize: '18px' }}>
                  Screenshot {carousel.imageIndex + 1} of {carousel.urls.length}
                </strong>
                <div style={{ fontSize: 13, color: "#666", marginTop: 6 }}>
                  {reports[carousel.reportIndex]?.category} - {reports[carousel.reportIndex]?.description?.substring(0, 60)}...
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {!annotating ? (
                  <button 
                    onClick={enableAnnotation}
                    style={{
                      padding: '8px 16px',
                      background: '#6f42c1',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    ✏️ Annotate
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={saveAnnotation}
                      style={{
                        padding: '8px 16px',
                        background: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      💾 Save
                    </button>
                    <button 
                      onClick={clearAnnotation}
                      style={{
                        padding: '8px 16px',
                        background: '#ffc107',
                        color: '#000',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      🔄 Clear
                    </button>
                    <button 
                      onClick={() => setAnnotating(false)}
                      style={{
                        padding: '8px 16px',
                        background: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    >
                      ✗ Exit
                    </button>
                  </>
                )}
                <button 
                  onClick={closeModal}
                  style={{
                    padding: '8px 16px',
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  ✕ Close
                </button>
              </div>
            </div>

            <div style={{ 
              display: "flex", 
              gap: 16, 
              alignItems: "center", 
              justifyContent: 'center',
              minHeight: '500px'
            }}>
              <button 
                onClick={prevImage}
                disabled={carousel.urls.length <= 1}
                style={{
                  padding: '16px 24px',
                  background: carousel.urls.length <= 1 ? '#ccc' : '#0078d7',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: carousel.urls.length <= 1 ? 'not-allowed' : 'pointer',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  boxShadow: carousel.urls.length > 1 ? '0 2px 8px rgba(0,0,0,0.2)' : 'none'
                }}
              >
                ◀
              </button>
              
              <div style={{ 
                flex: 1, 
                textAlign: "center", 
                position: "relative", 
                maxWidth: '1000px'
              }}>
                {!annotating ? (
                  <img 
                    src={carousel.urls[carousel.imageIndex]} 
                    alt="Screenshot"
                    style={{ 
                      maxWidth: "100%", 
                      maxHeight: "75vh", 
                      borderRadius: 8,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
                    }} 
                  />
                ) : (
                  <canvas 
                    ref={canvasRef} 
                    onMouseDown={startDrawing} 
                    onMouseUp={stopDrawing} 
                    onMouseMove={draw} 
                    onMouseOut={stopDrawing} 
                    style={{ 
                      maxWidth: "100%", 
                      maxHeight: "75vh", 
                      borderRadius: 8, 
                      border: "3px solid #6f42c1",
                      cursor: 'crosshair',
                      boxShadow: '0 8px 24px rgba(111, 66, 193, 0.4)',
                      background: 'white'
                    }} 
                  />
                )}
              </div>
              
              <button 
                onClick={nextImage}
                disabled={carousel.urls.length <= 1}
                style={{
                  padding: '16px 24px',
                  background: carousel.urls.length <= 1 ? '#ccc' : '#0078d7',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: carousel.urls.length <= 1 ? 'not-allowed' : 'pointer',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  boxShadow: carousel.urls.length > 1 ? '0 2px 8px rgba(0,0,0,0.2)' : 'none'
                }}
              >
                ▶
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXISTING: Log File Preview Modal */}
      {logModalOpen && currentLogFile && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10001,
            padding: '20px'
          }}
          onClick={() => setLogModalOpen(false)}
        >
          <div 
            style={{
              background: 'white',
              borderRadius: '12px',
              width: '90%',
              maxWidth: '1000px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              padding: '20px',
              borderBottom: '2px solid #eee',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', color: '#333' }}>
                  📄 {currentLogFile.filename}
                </h3>
                <div style={{ fontSize: '13px', color: '#666' }}>
                  Size: {formatFileSize(currentLogFile.filesize)}
                </div>
              </div>
              <button 
                onClick={() => setLogModalOpen(false)}
                style={{
                  padding: '8px 16px',
                  background: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                ✕ Close
              </button>
            </div>
            <div style={{
              padding: '20px',
              overflow: 'auto',
              flex: 1,
              background: '#f8f9fa'
            }}>
              <pre style={{
                margin: 0,
                fontFamily: "'Courier New', Consolas, monospace",
                fontSize: '13px',
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                color: '#333',
                lineHeight: '1.5'
              }}>{currentLogFile.content}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}