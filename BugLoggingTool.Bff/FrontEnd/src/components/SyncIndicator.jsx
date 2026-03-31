// src/components/SyncIndicator.jsx
import React, { useEffect, useState } from "react";
import eventBus from "../utils/eventBus";

export default function SyncIndicator() {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  useEffect(() => {
    function handleSync(data) {
      setSyncing(true);
      setLastSync(new Date());
      
      setTimeout(() => {
        setSyncing(false);
      }, 1000);
    }

    eventBus.on("data-synced", handleSync);
    return () => eventBus.off("data-synced", handleSync);
  }, []);

  return (
    <div style={{
      position: 'fixed',
      top: 20,
      right: 20,
      background: syncing ? '#4CAF50' : '#e0e0e0',
      color: syncing ? 'white' : '#666',
      padding: '8px 16px',
      borderRadius: '20px',
      fontSize: '13px',
      fontWeight: '500',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      transition: 'all 0.3s',
      zIndex: 1000,
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      <div style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: syncing ? 'white' : '#999',
        animation: syncing ? 'pulse 1s infinite' : 'none'
      }} />
      {syncing ? 'Syncing...' : 'In sync'}
      {lastSync && !syncing && (
        <span style={{ fontSize: '11px', opacity: 0.7 }}>
          {formatTime(lastSync)}
        </span>
      )}
    </div>
  );
}

function formatTime(date) {
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  
  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}