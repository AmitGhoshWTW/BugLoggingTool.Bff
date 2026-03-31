// src/services/electronScreenCapture.js

/**
 * Electron-specific screen capture using desktopCapturer API
 */
export async function captureScreenElectron() {
    if (!window.electronAPI?.getScreenSources) {
      throw new Error('Electron screen capture API not available');
    }
  
    console.log('[ElectronScreenCapture] Starting capture...');
  
    try {
      // Get available sources (screens and windows)
      const sources = await window.electronAPI.getScreenSources();
      console.log('[ElectronScreenCapture] Available sources:', sources.length);
  
      if (sources.length === 0) {
        throw new Error('No screen sources available');
      }
  
      // Show source picker if multiple sources
      let selectedSource;
      
      if (sources.length === 1) {
        selectedSource = sources[0];
        console.log('[ElectronScreenCapture] Auto-selected single source:', selectedSource.name);
      } else {
        selectedSource = await showSourcePicker(sources);
        if (!selectedSource) {
          throw new Error('No source selected');
        }
        console.log('[ElectronScreenCapture] User selected:', selectedSource.name);
      }
  
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
  
      console.log('[ElectronScreenCapture] Stream acquired');
  
      // Capture frame from stream
      const blob = await captureFrameFromStream(stream);
      
      // Stop stream
      stream.getTracks().forEach(track => track.stop());
  
      console.log('[ElectronScreenCapture] ✅ Capture successful');
      return blob;
  
    } catch (error) {
      console.error('[ElectronScreenCapture] ❌ Error:', error);
      throw error;
    }
  }
  
  /**
   * Show source picker modal
   */
  function showSourcePicker(sources) {
    return new Promise((resolve) => {
      // Create modal
      const modal = document.createElement('div');
      modal.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        padding: 20px;
      `;
  
      const content = document.createElement('div');
      content.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 24px;
        max-width: 800px;
        width: 100%;
        max-height: 80vh;
        overflow: auto;
      `;
  
      content.innerHTML = `
        <h2 style="margin: 0 0 20px 0; font-size: 24px; color: #333;">
          📸 Select Screen or Window
        </h2>
        <div id="source-grid" style="
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 20px;
        "></div>
        <div style="display: flex; justify-content: flex-end; gap: 12px;">
          <button id="cancel-btn" style="
            padding: 10px 20px;
            background: #6c757d;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
          ">Cancel</button>
        </div>
      `;
  
      const grid = content.querySelector('#source-grid');
  
      // Add source items
      sources.forEach((source, index) => {
        const item = document.createElement('div');
        item.style.cssText = `
          border: 2px solid #ddd;
          border-radius: 8px;
          padding: 12px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
        `;
  
        item.innerHTML = `
          <img src="${source.thumbnail.toDataURL()}" style="
            width: 100%;
            height: auto;
            border-radius: 4px;
            margin-bottom: 8px;
          ">
          <div style="
            font-size: 13px;
            font-weight: 500;
            color: #333;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          ">${source.name}</div>
          <div style="
            font-size: 11px;
            color: #666;
            margin-top: 4px;
          ">${source.id.startsWith('screen') ? '🖥️ Screen' : '🪟 Window'}</div>
        `;
  
        item.addEventListener('mouseenter', () => {
          item.style.borderColor = '#0078d7';
          item.style.transform = 'scale(1.05)';
        });
  
        item.addEventListener('mouseleave', () => {
          item.style.borderColor = '#ddd';
          item.style.transform = 'scale(1)';
        });
  
        item.addEventListener('click', () => {
          document.body.removeChild(modal);
          resolve(source);
        });
  
        grid.appendChild(item);
      });
  
      // Cancel button
      content.querySelector('#cancel-btn').addEventListener('click', () => {
        document.body.removeChild(modal);
        resolve(null);
      });
  
      modal.appendChild(content);
      document.body.appendChild(modal);
    });
  }
  
  /**
   * Capture frame from media stream
   */
  function captureFrameFromStream(stream) {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.style.display = 'none';
      document.body.appendChild(video);
  
      video.onloadedmetadata = () => {
        video.play();
  
        setTimeout(() => {
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
              reject(new Error('Failed to create blob'));
            }
          }, 'image/png');
        }, 100);
      };
  
      video.onerror = (error) => {
        document.body.removeChild(video);
        reject(error);
      };
    });
  }