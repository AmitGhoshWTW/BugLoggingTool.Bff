// src/components/AgentAutoInstaller.jsx
import React, { useState, useEffect } from 'react';
import { agentService } from '../services/agentService';

function AgentAutoInstaller() {
  const [status, setStatus] = useState('checking');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    checkAgent();
  }, []);

  const checkAgent = async () => {
    console.log('[AgentAutoInstaller] Checking for agent...');
    setStatus('checking');

    const isInstalled = await agentService.checkAgent();

    if (isInstalled) {
      console.log('[AgentAutoInstaller] ✅ Agent already installed');
      setStatus('installed');
      return;
    }

    console.log('[AgentAutoInstaller] ❌ Agent not found');

    const installDeclined = localStorage.getItem('blt-agent-declined');
    const lastPrompt = localStorage.getItem('blt-agent-last-prompt');
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    if (installDeclined === 'true' && lastPrompt && (now - parseInt(lastPrompt)) < oneDayMs) {
      console.log('[AgentAutoInstaller] User declined recently, skipping auto-prompt');
      setStatus('not-installed');
      return;
    }

    setStatus('not-installed');
    setShowModal(true);

    localStorage.setItem('blt-agent-last-prompt', now.toString());
    localStorage.removeItem('blt-agent-declined');
  };

  const handleDownload = () => {
    setStatus('downloading');

    const link = document.createElement('a');
    link.href = '/downloads/blt-agent-installer.exe';
    link.download = 'blt-agent-installer.exe';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setStatus('downloaded');
    }, 1000);
  };

  const handleInstalled = () => {
    setStatus('installing');

    const checkInterval = setInterval(async () => {
      const isInstalled = await agentService.checkAgent();

      if (isInstalled) {
        console.log('[AgentAutoInstaller] ✅ Agent installation detected!');
        clearInterval(checkInterval);
        setStatus('installed');
        setShowModal(false);

        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    }, 2000);

    setTimeout(() => {
      clearInterval(checkInterval);
      if (status === 'installing') {
        setStatus('downloaded');
        alert('Installation timeout. Please verify the agent installed correctly.');
      }
    }, 5 * 60 * 1000);
  };

  const handleDecline = () => {
    localStorage.setItem('blt-agent-declined', 'true');
    setShowModal(false);
    setStatus('not-installed');
  };

  if (status === 'installed' || status === 'checking' || !showModal) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 100000,
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '32px',
        maxWidth: '600px',
        width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🚀</div>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', color: '#333' }}>
            Enable Auto-Collect Feature
          </h2>
          <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
            Install BLT Agent to automatically collect log files from your PC
          </p>
        </div>

        {status === 'not-installed' && (
          <>
            <div style={{
              padding: '16px',
              background: '#e3f2fd',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#0078d7', marginBottom: '8px' }}>
                What is BLT Agent?
              </div>
              <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '13px', color: '#333', lineHeight: '1.6' }}>
                <li>Lightweight background service (runs in system tray)</li>
                <li>Automatically collects log files from configured folders</li>
                <li>Secure localhost-only communication</li>
                <li>Only 5 MB - starts with Windows automatically</li>
              </ul>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={handleDownload}
                style={{
                  padding: '14px 32px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                }}
              >
                📥 Download & Install
              </button>
              <button
                onClick={handleDecline}
                style={{
                  padding: '14px 32px',
                  background: 'transparent',
                  color: '#666',
                  border: '1px solid #dee2e6',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                Maybe Later
              </button>
            </div>

            <div style={{
              marginTop: '20px',
              padding: '12px',
              background: '#fff3cd',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#856404'
            }}>
              💡 <strong>Note:</strong> You can still use the app without the agent - you'll just need to manually attach log files to reports.
            </div>
          </>
        )}

        {status === 'downloading' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📥</div>
            <div style={{ fontSize: '16px', fontWeight: '600', color: '#333' }}>
              Downloading BLT Agent...
            </div>
          </div>
        )}

        {status === 'downloaded' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
              <div style={{ fontSize: '18px', fontWeight: '600', color: '#28a745', marginBottom: '8px' }}>
                Download Complete!
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>
                File saved to your Downloads folder
              </div>
            </div>

            <div style={{
              padding: '20px',
              background: '#f8f9fa',
              borderRadius: '8px',
              marginBottom: '20px'
            }}>
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#333', marginBottom: '12px' }}>
                📋 Installation Steps:
              </div>
              <ol style={{ margin: '0', paddingLeft: '20px', fontSize: '14px', lineHeight: '1.8' }}>
                <li>Open your <strong>Downloads</strong> folder</li>
                <li><strong>Right-click</strong> on <code style={{ background: '#fff', padding: '2px 6px', borderRadius: '3px' }}>blt-agent-installer.exe</code></li>
                <li>Select <strong>"Run as administrator"</strong></li>
                <li>Click <strong>"Yes"</strong> when Windows asks for permission</li>
                <li>Click <strong>"Install"</strong> in the installer window</li>
                <li>Wait for "Installation Complete!" message</li>
              </ol>
            </div>

            <button
              onClick={handleInstalled}
              style={{
                width: '100%',
                padding: '14px',
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                marginBottom: '12px'
              }}
            >
              ✓ I've Installed It - Check Now
            </button>

            <button
              onClick={() => setShowModal(false)}
              style={{
                width: '100%',
                padding: '12px',
                background: 'transparent',
                color: '#666',
                border: '1px solid #dee2e6',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              I'll Install Later
            </button>
          </>
        )}

        {status === 'installing' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: '#333', marginBottom: '12px' }}>
              Waiting for Installation...
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>
              The page will refresh automatically when installation completes
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AgentAutoInstaller;