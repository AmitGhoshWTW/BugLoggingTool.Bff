// src/components/CaptureArea.jsx
import React, { useState, useEffect } from "react";
import eventBus from "../utils/eventBus";

// PouchDB services
import {
  saveScreenshotAttachment,
  getAllScreenshots
} from "../services/pouchdbService";

// Screenshot gallery reused from your app
import ScreenshotManager from "./ScreenshotManager";

// NEW: Temporary screenshot store
import { screenshotStore } from "../stores/screenshotStore";

export default function CaptureArea() {
  const [msg, setMsg] = useState("");
  const [previews, setPreviews] = useState([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [capturing, setCapturing] = useState(false);

  // ------------------------------------------------------
  // Initial load + Electron capture hookup (EXISTING)
  // ------------------------------------------------------
  useEffect(() => {
    loadScreenshots();

    // Electron integration: main → renderer event (EXISTING)
    if (window.electronAPI?.onScreenshotSaved) {
      window.electronAPI.onScreenshotSaved(async (base64) => {
        const blob = dataURLtoBlob(base64);

        // Add to temporary store
        screenshotStore.add(blob, {
          from: "electron",
          description: "Electron screenshot",
          timestamp: Date.now()
        });

        // Also save to PouchDB (for backward compatibility)
        await saveScreenshotAttachment(
          { from: "electron", description: "Electron screenshot" },
          blob
        );
        
        await loadScreenshots();
        setReloadKey((prev) => prev + 1);
        eventBus.emit("capture-saved");

        setMsg("Saved screenshot from Electron.");
      });
    }
  }, []);

  // ------------------------------------------------------
  // PRIMARY: Native Picker - Supports Screens, Windows, AND Tabs
  // Works in both Browser and Electron (RECOMMENDED)
  // ------------------------------------------------------
  async function captureScreen() {
    try {
      setCapturing(true);
      setMsg("Opening screen picker...");
      console.log('[CaptureArea] Starting capture with native picker...');

      // Use native getDisplayMedia - supports ALL sources including tabs
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: "always",
          displaySurface: "monitor", // Suggests screen but allows all
        },
        audio: false,
        preferCurrentTab: false // CRITICAL: Enables tab selection
      });
      
      console.log('[CaptureArea] Stream acquired from native picker');

      // Capture frame
      const track = stream.getVideoTracks()[0];
      
      // Get settings to see what was selected
      const settings = track.getSettings();
      console.log('[CaptureArea] Selected source type:', settings.displaySurface);

      const imageCapture = new ImageCapture(track);
      const bitmap = await imageCapture.grabFrame();

      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(bitmap, 0, 0);

      // Convert to blob
      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            setMsg("Failed to capture screenshot.");
            track.stop();
            stream.getTracks().forEach(t => t.stop());
            setCapturing(false);
            return;
          }

          console.log("Screenshot captured:", {
            size: blob.size,
            type: blob.type,
            source: settings.displaySurface,
            platform: window.electronAPI?.isElectron ? 'electron' : 'browser'
          });

          // Add to temporary store
          const tempId = screenshotStore.add(blob, {
            from: window.electronAPI?.isElectron ? "electron" : "browser",
            description: `Screenshot - ${settings.displaySurface || 'screen'}`,
            timestamp: Date.now(),
            url: window.location.href,
            sourceType: settings.displaySurface
          });

          console.log("[CaptureArea] Added to temp store:", tempId);

          // Reload screenshots
          await loadScreenshots();
          setReloadKey((p) => p + 1);
          
          // Emit event
          eventBus.emit("capture-saved");

          const sourceLabel = settings.displaySurface === 'browser' ? '🌐 Tab' : 
                             settings.displaySurface === 'window' ? '🪟 Window' : '🖥️ Screen';
          
          setMsg(`✅ ${sourceLabel} captured! (${screenshotStore.count()} in session)`);
          
          setTimeout(() => setMsg(""), 3000);

          // Stop tracks
          track.stop();
          stream.getTracks().forEach(t => t.stop());
          setCapturing(false);
        },
        "image/png",
        0.95
      );
      
    } catch (err) {
      console.error("Capture error:", err);
      
      if (err.name === "NotAllowedError") {
        setMsg("❌ Capture permission denied");
      } else if (err.name === "NotFoundError") {
        setMsg("❌ No screen sources available");
      } else if (err.name === "AbortError") {
        setMsg("Capture cancelled");
      } else {
        setMsg("❌ Capture failed: " + err.message);
      }
      
      setTimeout(() => setMsg(""), 3000);
      setCapturing(false);
    }
  }

  // ------------------------------------------------------
  // SECONDARY: Electron custom modal picker (EXISTING)
  // Shows thumbnail preview but does NOT support tabs
  // ------------------------------------------------------
  async function captureElectron() {
    try {
      setCapturing(true);
      setMsg("Capturing via Electron...");
      console.log('[CaptureArea] Starting Electron capture...');

      // Check if Electron API is available
      if (!window.electronAPI?.isElectron || !window.electronAPI?.getScreenSources) {
        console.log('[CaptureArea] Electron API not available, falling back to native picker');
        return await captureScreen();
      }

      // Get available sources (screens and windows)
      const sources = await window.electronAPI.getScreenSources();
      console.log('[CaptureArea] Available sources:', sources.length);

      if (sources.length === 0) {
        throw new Error('No screen sources available');
      }

      // Show source picker modal
      const selectedSource = await showSourcePicker(sources);
      
      if (!selectedSource) {
        console.log('[CaptureArea] User cancelled source selection');
        setMsg("Capture cancelled");
        setTimeout(() => setMsg(""), 2000);
        return;
      }

      console.log('[CaptureArea] Selected source:', selectedSource.name);

      // Get stream from selected source
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: selectedSource.id,
            minWidth: 1280,
            maxWidth: 1920,
            minHeight: 720,
            maxHeight: 1080
          }
        }
      });

      console.log('[CaptureArea] Stream acquired');

      // Capture frame from stream
      const blob = await captureFrameFromStream(stream);
      
      // Stop stream
      stream.getTracks().forEach(track => track.stop());

      console.log('[CaptureArea] ✅ Electron capture successful');

      // Add to temporary store
      const tempId = screenshotStore.add(blob, {
        from: "electron",
        description: "Electron screenshot",
        timestamp: Date.now()
      });

      console.log("[CaptureArea] Added to temp store:", tempId);

      // Reload screenshots
      await loadScreenshots();
      setReloadKey((p) => p + 1);
      
      // Emit event
      eventBus.emit("capture-saved");

      setMsg(`✅ Screenshot captured! (${screenshotStore.count()} in session)`);
      
      // Clear message after 3 seconds
      setTimeout(() => setMsg(""), 3000);

    } catch (error) {
      console.error('[CaptureArea] Electron capture error:', error);
      setMsg("Capture failed: " + error.message);
      setTimeout(() => setMsg(""), 3000);
    } finally {
      setCapturing(false);
    }
  }

  // ------------------------------------------------------
  // EXISTING: Custom modal for source selection
  // ------------------------------------------------------
  function showSourcePicker(sources) {
    return new Promise((resolve) => {
      // Create modal backdrop
      const modal = document.createElement('div');
      modal.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.85);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 100000;
        padding: 20px;
        animation: fadeIn 0.2s ease-out;
      `;

      // Create modal content
      const content = document.createElement('div');
      content.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 24px;
        max-width: 900px;
        width: 100%;
        max-height: 85vh;
        overflow: auto;
        box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      `;

      content.innerHTML = `
        <div style="margin-bottom: 20px;">
          <h2 style="margin: 0 0 8px 0; font-size: 24px; color: #333; font-weight: 600;">
            📸 Select Screen or Window to Capture
          </h2>
          <p style="margin: 0; font-size: 14px; color: #666;">
            Click on a screen or window below to capture it
          </p>
        </div>
        <div id="source-grid" style="
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 16px;
          margin-bottom: 20px;
        "></div>
        <div style="display: flex; justify-content: flex-end; gap: 12px; padding-top: 16px; border-top: 1px solid #eee;">
          <button id="cancel-btn" style="
            padding: 10px 24px;
            background: #6c757d;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: background 0.2s;
          ">✕ Cancel</button>
        </div>
      `;

      const grid = content.querySelector('#source-grid');

      // Add source items
      sources.forEach((source) => {
        const item = document.createElement('div');
        item.style.cssText = `
          border: 2px solid #ddd;
          border-radius: 8px;
          padding: 12px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
          background: white;
        `;

        const thumbnailUrl = source.thumbnail || '';

        item.innerHTML = `
          <img src="${thumbnailUrl}" style="
            width: 100%;
            height: auto;
            border-radius: 4px;
            margin-bottom: 10px;
            display: block;
          " alt="${source.name}">
          <div style="
            font-size: 13px;
            font-weight: 500;
            color: #333;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            margin-bottom: 4px;
          ">${source.name}</div>
          <div style="
            font-size: 11px;
            color: #666;
            padding: 3px 8px;
            background: #f0f0f0;
            border-radius: 4px;
            display: inline-block;
          ">${source.id.startsWith('screen') ? '🖥️ Screen' : '🪟 Window'}</div>
        `;

        item.addEventListener('mouseenter', () => {
          item.style.borderColor = '#0078d7';
          item.style.transform = 'translateY(-4px)';
          item.style.boxShadow = '0 4px 12px rgba(0,120,215,0.2)';
        });

        item.addEventListener('mouseleave', () => {
          item.style.borderColor = '#ddd';
          item.style.transform = 'translateY(0)';
          item.style.boxShadow = 'none';
        });

        item.addEventListener('click', () => {
          document.body.removeChild(modal);
          resolve(source);
        });

        grid.appendChild(item);
      });

      // Cancel button
      const cancelBtn = content.querySelector('#cancel-btn');
      cancelBtn.addEventListener('mouseenter', () => {
        cancelBtn.style.background = '#5a6268';
      });
      cancelBtn.addEventListener('mouseleave', () => {
        cancelBtn.style.background = '#6c757d';
      });
      cancelBtn.addEventListener('click', () => {
        document.body.removeChild(modal);
        resolve(null);
      });

      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          document.body.removeChild(modal);
          resolve(null);
        }
      });

      modal.appendChild(content);
      document.body.appendChild(modal);
    });
  }

  // ------------------------------------------------------
  // EXISTING: Capture frame from media stream
  // ------------------------------------------------------
  function captureFrameFromStream(stream) {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.muted = true;
      video.style.display = 'none';
      document.body.appendChild(video);

      video.onloadedmetadata = () => {
        video.play();

        setTimeout(() => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0);

            canvas.toBlob((blob) => {
              document.body.removeChild(video);
              if (blob) {
                resolve(blob);
              } else {
                reject(new Error('Failed to create blob from canvas'));
              }
            }, 'image/png');
          } catch (error) {
            document.body.removeChild(video);
            reject(error);
          }
        }, 200);
      };

      video.onerror = (error) => {
        document.body.removeChild(video);
        reject(new Error('Video error: ' + error));
      };
    });
  }

  // ------------------------------------------------------
  // EXISTING: Browser capture (unchanged)
  // ------------------------------------------------------
  async function captureBrowser() {
    try {
      setMsg("Capturing via browser...");

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" },
        audio: false
      });
      
      const track = stream.getVideoTracks()[0];
      const imageCapture = new ImageCapture(track);
      const bitmap = await imageCapture.grabFrame();

      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(bitmap, 0, 0);

      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            setMsg("Failed to capture screenshot.");
            track.stop();
            stream.getTracks().forEach(t => t.stop());
            return;
          }

          console.log("Browser screenshot captured:", {
            size: blob.size,
            type: blob.type
          });

          const tempId = screenshotStore.add(blob, {
            from: "browser",
            description: "Browser screenshot",
            timestamp: Date.now(),
            url: window.location.href
          });

          console.log("[CaptureArea] Added to temp store:", tempId);

          await loadScreenshots();
          setReloadKey((p) => p + 1);
          
          eventBus.emit("capture-saved");

          setMsg(`Screenshot captured! (${screenshotStore.count()} in session)`);
          
          setTimeout(() => setMsg(""), 3000);
        },
        "image/png",
        0.95
      );

      track.stop();
      stream.getTracks().forEach(t => t.stop());
      
    } catch (err) {
      console.error("captureBrowser error:", err);
      setMsg(err.name === "NotAllowedError" 
        ? "Capture permission denied." 
        : "Capture canceled or failed.");
      
      setTimeout(() => setMsg(""), 3000);
    }
  }

  // ------------------------------------------------------
  // EXISTING: Re-load screenshots from PouchDB
  // ------------------------------------------------------
  async function loadScreenshots() {
    try {
      const items = await getAllScreenshots();

      const mapped = items.map((i) => ({
        id: i._id,
        url: i.imageUrl || URL.createObjectURL(i.blob),
        createdAt: i.createdAt
      }));

      setPreviews(mapped.slice(0, 12));
    } catch (error) {
      console.error("Error loading screenshots:", error);
      setPreviews([]);
    }
  }

  // ------------------------------------------------------
  // EXISTING: Utility: Base64 → Blob
  // ------------------------------------------------------
  function dataURLtoBlob(dataURL) {
    const [meta, data] = dataURL.split(",");
    const mime = meta.match(/:(.*?);/)?.[1] || "image/png";
    const bytes = atob(data);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      arr[i] = bytes.charCodeAt(i);
    }
    return new Blob([arr], { type: mime });
  }

  // ------------------------------------------------------
  // UI - Updated with both options
  // ------------------------------------------------------
  return (
    <div className="dashboard-box">
      <h3>📸 Screen Capture</h3>

      {/* Platform indicator */}
      <div style={{
        marginBottom: '16px',
        padding: '12px 16px',
        background: window.electronAPI?.isElectron 
          ? 'linear-gradient(135deg, #e3f2fd 0%, #f0f7ff 100%)'
          : 'linear-gradient(135deg, #f0f7ff 0%, #e3f2fd 100%)',
        borderRadius: '8px',
        fontSize: '13px',
        color: '#0078d7',
        borderLeft: '4px solid #0078d7'
      }}>
        <div style={{ fontWeight: '600', marginBottom: '6px' }}>
          {window.electronAPI?.isElectron ? '🖥️ Desktop App Mode' : '🌐 Web App Mode'}
        </div>
        <div style={{ fontSize: '12px', lineHeight: '1.5' }}>
          Native picker supports: Entire screens • Application windows • <strong>Browser tabs</strong>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
        {/* PRIMARY: Native Picker Button (Recommended - supports tabs) */}
        <button 
          onClick={captureScreen}
          disabled={capturing}
          style={{
            padding: "10px 20px",
            background: capturing ? "#ccc" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: capturing ? "not-allowed" : "pointer",
            fontSize: "15px",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            boxShadow: capturing ? "none" : "0 4px 12px rgba(102, 126, 234, 0.3)",
            transition: "all 0.2s"
          }}
        >
          {capturing ? "⏳ Opening picker..." : "📸 Capture Screenshot"}
        </button>

        {/* SECONDARY: Custom Modal (Electron only - shows thumbnails) */}
        {window.electronAPI?.isElectron && (
          <button 
            onClick={captureElectron}
            disabled={capturing}
            style={{
              padding: "10px 20px",
              background: capturing ? "#ccc" : "#6f42c1",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: capturing ? "not-allowed" : "pointer",
              fontSize: "14px",
              fontWeight: "500",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}
          >
            🖼️ Advanced Picker
          </button>
        )}

        {/* Status Message */}
        {msg && (
          <span style={{ 
            color: msg.includes("✅") || msg.includes("captured") ? "#28a745" : 
                   msg.includes("❌") || msg.includes("failed") ? "#dc3545" : "#666",
            fontSize: "14px",
            fontWeight: "500",
            padding: "6px 12px",
            background: msg.includes("✅") ? "#d4edda" : 
                       msg.includes("❌") ? "#f8d7da" : "#f8f9fa",
            borderRadius: "6px",
            border: `1px solid ${msg.includes("✅") ? "#c3e6cb" : msg.includes("❌") ? "#f5c6cb" : "#dee2e6"}`
          }}>
            {msg}
          </span>
        )}
      </div>

      {/* Helper info */}
      <div style={{
        padding: '12px 16px',
        background: '#f8f9fa',
        borderRadius: '6px',
        fontSize: '12px',
        color: '#495057',
        border: '1px solid #dee2e6',
        marginBottom: '12px'
      }}>
        <div style={{ marginBottom: '6px' }}>
          <strong>💡 Recommended:</strong> Use <strong>"Capture Screenshot"</strong> button
        </div>
        <ul style={{ margin: '0', paddingLeft: '20px', lineHeight: '1.6' }}>
          <li>✅ Native OS picker</li>
          <li>✅ Supports browser tabs for both chrome and edge</li>
          <li>✅ Works in both web and desktop app</li>
        </ul>
        {window.electronAPI?.isElectron && (
          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #dee2e6' }}>
            <strong>"Advanced Picker"</strong> shows thumbnail previews but doesn't support tabs
          </div>
        )}
      </div>

      {/* Session screenshot count */}
      {screenshotStore.count() > 0 && (
        <div style={{
          padding: '10px 14px',
          background: '#fff3cd',
          border: '1px solid #ffc107',
          borderRadius: '6px',
          fontSize: '13px',
          color: '#856404',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '18px' }}>📷</span>
          <span>
            <strong>{screenshotStore.count()}</strong> screenshot{screenshotStore.count() !== 1 ? 's' : ''} captured this session
            <span style={{ fontSize: '11px', opacity: 0.8, marginLeft: '6px' }}>
              (will be saved with report)
            </span>
          </span>
        </div>
      )}

      {/* EXISTING: Commented out components */}
      {/* <ScreenshotManager sessionId="default" reloadKey={reloadKey} /> */}

      {/* EXISTING: Quick Preview Grid */}
      {/* {previews.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h4 style={{ fontSize: "14px", color: "#666", marginBottom: 8 }}>
            Recent Captures ({previews.length})
          </h4>
          <div style={{ 
            display: "flex", 
            flexWrap: "wrap", 
            gap: 10,
            maxHeight: "200px",
            overflow: "auto"
          }}>
            {previews.map((p) => (
              <div
                key={p.id}
                style={{
                  position: "relative",
                  borderRadius: "6px",
                  overflow: "hidden",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                }}
              >
                <img
                  src={p.url}
                  alt="screenshot preview"
                  style={{
                    width: 100,
                    height: 70,
                    objectFit: "cover",
                    display: "block"
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )} */}
    </div>
  );
}