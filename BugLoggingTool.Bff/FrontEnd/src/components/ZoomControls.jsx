// src/components/ZoomControls.jsx
import React, { useState, useEffect } from 'react';

export default function ZoomControls() {
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isElectron] = useState(!!window.electronAPI);

  useEffect(() => {
    if (isElectron) {
      updateZoomLevel();
    }
  }, [isElectron]);

  const updateZoomLevel = async () => {
    if (window.electronAPI) {
      const zoom = await window.electronAPI.getZoomLevel();
      setZoomLevel(zoom.percentage);
    }
  };

  const handleZoomIn = async () => {
    if (window.electronAPI) {
      window.electronAPI.zoomIn();
      setTimeout(updateZoomLevel, 100);
    }
  };

  const handleZoomOut = async () => {
    if (window.electronAPI) {
      window.electronAPI.zoomOut();
      setTimeout(updateZoomLevel, 100);
    }
  };

  const handleZoomReset = async () => {
    if (window.electronAPI) {
      window.electronAPI.zoomReset();
      setTimeout(updateZoomLevel, 100);
    }
  };

  if (!isElectron) {
    return null; // Only show in Electron
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: 'white',
      padding: '8px 12px',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      zIndex: 1000
    }}>
      <button
        onClick={handleZoomOut}
        style={{
          padding: '6px 10px',
          background: '#f0f0f0',
          border: '1px solid #ddd',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '16px'
        }}
        title="Zoom Out (Ctrl+-)"
      >
        −
      </button>

      <span style={{
        fontSize: '13px',
        fontWeight: '500',
        minWidth: '50px',
        textAlign: 'center',
        color: '#333'
      }}>
        {zoomLevel}%
      </span>

      <button
        onClick={handleZoomIn}
        style={{
          padding: '6px 10px',
          background: '#f0f0f0',
          border: '1px solid #ddd',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '16px'
        }}
        title="Zoom In (Ctrl++)"
      >
        +
      </button>

      <button
        onClick={handleZoomReset}
        style={{
          padding: '6px 10px',
          background: '#f0f0f0',
          border: '1px solid #ddd',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '11px',
          fontWeight: '500'
        }}
        title="Reset Zoom (Ctrl+0)"
      >
        Reset
      </button>
    </div>
  );
}