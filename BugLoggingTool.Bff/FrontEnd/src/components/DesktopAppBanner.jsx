// src/components/DesktopAppBanner.jsx
import React, { useState, useEffect } from 'react';

const DESKTOP_APP_VERSION = '1.0.0';
const INSTALLER_URL = '/downloads/BLT-Setup-1.0.0.exe'; // Or from CDN/S3

export default function DesktopAppBanner() {
  const [isElectron, setIsElectron] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if running in Electron
    const inElectron = !!(window.electronAPI || window.process?.type);
    setIsElectron(inElectron);

    // Check if user dismissed banner
    const wasDismissed = localStorage.getItem('desktop-banner-dismissed');
    
    // Show banner only if: not Electron AND not dismissed
    if (!inElectron && !wasDismissed) {
      setShowBanner(true);
    }
  }, []);

  function handleDismiss() {
    setShowBanner(false);
    setDismissed(true);
    localStorage.setItem('desktop-banner-dismissed', 'true');
  }

  function handleDownload() {
    // Track download
    console.log('[DesktopAppBanner] Downloading installer...');
    
    // Option 1: Direct download link
    window.location.href = INSTALLER_URL;
    
    // Option 2: If hosted externally (S3, GitHub releases, etc.)
    // window.open('https://github.com/yourcompany/blt/releases/download/v1.0.0/BLT-Setup.exe', '_blank');
    
    // Show instructions after download
    setTimeout(() => {
      alert('📥 Installer downloaded!\n\nSteps:\n1. Open the downloaded BLT-Setup.exe\n2. Follow installation wizard\n3. Launch BLT Desktop App\n\n✨ You\'ll get auto-collect log file features!');
    }, 1000);
  }

  function handleRemindLater() {
    setShowBanner(false);
    // Don't set dismissed flag, will show again next session
  }

  if (!showBanner || isElectron) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      padding: '16px 20px',
      boxShadow: '0 -4px 12px rgba(0,0,0,0.15)',
      zIndex: 9999,
      animation: 'slideUp 0.5s ease-out'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        flexWrap: 'wrap'
      }}>
        {/* Icon */}
        <div style={{ fontSize: '48px' }}>
          💻
        </div>

        {/* Message */}
        <div style={{ flex: 1, minWidth: '300px' }}>
          <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>
            🚀 Get the Desktop App for More Features!
          </div>
          <div style={{ fontSize: '14px', opacity: 0.95 }}>
            Auto-collect log files, work offline, and get enhanced performance with the BLT Desktop App
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={handleDownload}
            style={{
              padding: '12px 24px',
              background: 'white',
              color: '#667eea',
              border: 'none',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              transition: 'transform 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
          >
            ⬇️ Download Desktop App
          </button>

          <button
            onClick={handleRemindLater}
            style={{
              padding: '12px 24px',
              background: 'rgba(255,255,255,0.2)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.3)'}
            onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
          >
            Remind Me Later
          </button>

          <button
            onClick={handleDismiss}
            style={{
              padding: '12px',
              background: 'transparent',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              fontSize: '20px',
              opacity: 0.8
            }}
            onMouseEnter={(e) => e.target.style.opacity = '1'}
            onMouseLeave={(e) => e.target.style.opacity = '0.8'}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}