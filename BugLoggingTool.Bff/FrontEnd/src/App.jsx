import React, { useEffect, useState } from "react";
import { MsalProvider } from '@azure/msal-react';
import { PublicClientApplication } from '@azure/msal-browser';

import CaptureArea from "./components/CaptureArea";
import ReporterForm from "./components/ReporterForm";
import ScreenshotManager from "./components/ScreenshotManager";
import QueueView from "./components/QueueView";
import PWAInstallButton from "./components/PWAInstallButton";
import UpdateNotification from "./components/UpdateNotification";
import ScreenshotPlaceholder from './components/ScreenshotPlaceholder';
import DesktopAppBanner from './components/DesktopAppBanner';
import ZoomControls from './components/ZoomControls';
import SyncIndicator from './components/SyncIndicator';

// ✨ Authentication imports
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './hooks/useAuth';
import Login from './components/Login';
import UserProfile from './components/UserProfile';
import AccessDenied from './components/AccessDenied';
import { msalConfig } from './config/authConfig';

import { getSyncStatus } from "./services/syncManager";
import systemLogger from "./services/systemLogger";
import { configureRemote, startSync } from './services/syncManager';

// Import version
// const APP_VERSION = "2.0.1"; 
const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';

// ✨ Initialize MSAL instance
// const msalInstance = new PublicClientApplication(msalConfig);
export const msalInstance = new PublicClientApplication(msalConfig);
await msalInstance.initialize();

// ✨ NEW: Define allowed roles for BLT access
const ALLOWED_ROLES = ['User', 'PowerUser', 'ITSupport', 'Admin'];

// ✨ Main App Content (wrapped with auth and role checking)
function AppContent() {
    const { isAuthenticated, isLoading, user, hasAnyRole } = useAuth();
    const [syncStatus, setSyncStatus] = useState("idle");
    const [networkStatus, setNetworkStatus] = useState(navigator.onLine);
    const [showSystemLogs, setShowSystemLogs] = useState(false);

    useEffect(() => {
        // Monitor network status
        const handleOnline = () => {
            setNetworkStatus(true);
            systemLogger.logInfo("Network connection restored");
            // Start cross-browser sync
            configureRemote('http://localhost:5005');
            startSync();
        };

        const handleOffline = () => {
            setNetworkStatus(false);
            systemLogger.logWarning("Network connection lost");
        };

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        // Update sync status periodically
        const syncInterval = setInterval(() => {
            const status = getSyncStatus();
            setSyncStatus(status.status);
        }, 3000);

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
            clearInterval(syncInterval);
        };
    }, []);

    // ✨ Show loading screen during authentication
    if (isLoading) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.spinner}></div>
                <p style={styles.loadingText}>Authenticating...</p>
            </div>
        );
    }

    // ✨ Show login screen if not authenticated
    if (!isAuthenticated) {
        return <Login />;
    }

    // ✨ NEW: Check if user has required role
    const hasAccess = hasAnyRole(ALLOWED_ROLES);

    // ✨ NEW: Show access denied if no required role
    if (!hasAccess) {
        console.warn('[BLT] Access denied - User does not have required role', {
            user: user?.email,
            userRoles: user?.roles || [],
            requiredRoles: ALLOWED_ROLES
        });
        return <AccessDenied />;
    }

    // ✅ User is authenticated AND has required role - show main app
    console.log('[BLT] Access granted', {
        user: user?.email,
        roles: user?.roles
    });

    return (
        <>
            <div style={styles.container}>
                {/* Header */}
                <header style={styles.header}>
                    <div style={styles.headerLeft}>
                        <h2 style={styles.title}>
                            <svg
                                width="28"
                                height="28"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                style={styles.logo}
                            >
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                            </svg>
                            WTW Bug Logging Tool
                        </h2>
                        <span style={styles.version}>v{APP_VERSION} {window.electronAPI ? '🖥️ Desktop' : '🌐 Web'}</span>
                    </div>

                    <div style={styles.headerRight}>
                        {/* Network Status */}
                        <div style={styles.statusBadge}>
                            <span
                                style={{
                                    ...styles.statusDot,
                                    backgroundColor: networkStatus ? "#10b981" : "#ef4444"
                                }}
                            />
                            {networkStatus ? "Online" : "Offline"}
                        </div>

                        {/* Sync Status */}
                        <div style={styles.statusBadge}>
                            <span
                                style={{
                                    ...styles.statusDot,
                                    backgroundColor: getSyncColor(syncStatus)
                                }}
                            />
                            Sync: {syncStatus}
                        </div>

                        {/* System Logs Toggle */}
                        <button
                            onClick={() => setShowSystemLogs(!showSystemLogs)}
                            style={styles.iconButton}
                            title="View system logs"
                        >
                            <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="12" y1="18" x2="12" y2="12" />
                                <line x1="9" y1="15" x2="15" y2="15" />
                            </svg>
                        </button>

                        <PWAInstallButton />

                        {/* User Profile Dropdown */}
                        <UserProfile compact={true} />
                    </div>
                </header>

                {/* Banner notifications */}
                <div style={{ padding: '0 24px' }}>
                    <SyncIndicator />
                    <UpdateNotification />
                    <DesktopAppBanner />
                </div>

                {/* System Logs Panel (collapsible) */}
                {showSystemLogs && <SystemLogsPanel onClose={() => setShowSystemLogs(false)} />}

                {/* Main Content */}
                <main style={styles.main}>
                    <div style={styles.mainContent}>
                        {/* Capture Area */}
                        <CaptureArea />

                        {/* Screenshot Placeholder (temporary, before saving) */}
                        <div style={styles.section}>
                            <ScreenshotPlaceholder />
                        </div>

                        {/* Reporter Form - Pass user prop */}
                        <div style={styles.section}>
                            <ReporterForm user={user} />
                        </div>

                        {/* Queue View */}
                        <div style={styles.section}>
                            <QueueView />
                        </div>
                    </div>

                    {/* Add zoom controls */}
                    <ZoomControls />
                </main>
            </div>
        </>
    );
}

// ✨ Wrapped App with MSAL and Auth providers
export default function App() {
    return (
        <MsalProvider instance={msalInstance}>
            <AuthProvider>
                <AppContent />
            </AuthProvider>
        </MsalProvider>
    );
}

function getSyncColor(status) {
    switch (status) {
        case "active":
        case "syncing":
            return "#10b981";
        case "paused":
            return "#f59e0b";
        case "error":
        case "denied":
            return "#ef4444";
        default:
            return "#6b7280";
    }
}

/* =========================================
   SYSTEM LOGS PANEL
========================================= */

function SystemLogsPanel({ onClose }) {
    const [logs, setLogs] = useState([]);
    const [filter, setFilter] = useState("all");

    useEffect(() => {
        loadLogs();
    }, [filter]);

    async function loadLogs() {
        const { getSystemLogs } = await import("./services/pouchdbService");
        const options = {};

        if (filter !== "all") {
            options.level = filter;
        }

        const systemLogs = await getSystemLogs(options);
        setLogs(systemLogs);
    }

    return (
        <div style={styles.logsPanel}>
            <div style={styles.logsPanelHeader}>
                <h3 style={styles.logsPanelTitle}>System Logs</h3>

                <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    style={styles.logsFilter}
                >
                    <option value="all">All Logs</option>
                    <option value="info">Info</option>
                    <option value="warning">Warnings</option>
                    <option value="error">Errors</option>
                    <option value="critical">Critical</option>
                </select>

                <button onClick={onClose} style={styles.closeButton}>✕</button>
            </div>

            <div style={styles.logsContent}>
                {logs.length === 0 ? (
                    <p style={styles.noLogs}>No logs available</p>
                ) : (
                    logs.map((log, idx) => (
                        <div key={idx} style={getLogStyle(log.level)}>
                            <div style={styles.logHeader}>
                                <span style={styles.logLevel}>{log.level.toUpperCase()}</span>
                                <span style={styles.logTime}>
                                    {new Date(log.timestamp).toLocaleString()}
                                </span>
                            </div>
                            <div style={styles.logMessage}>{log.message}</div>
                            {log.data && Object.keys(log.data).length > 0 && (
                                <details style={styles.logDetails}>
                                    <summary style={styles.logSummary}>Details</summary>
                                    <pre style={styles.logPre}>
                                        {JSON.stringify(log.data, null, 2)}
                                    </pre>
                                </details>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

function getLogStyle(level) {
    const base = {
        padding: "12px",
        marginBottom: "8px",
        borderRadius: "6px",
        borderLeft: "4px solid",
        fontSize: "13px"
    };

    switch (level) {
        case "error":
        case "critical":
            return { ...base, backgroundColor: "#fee2e2", borderColor: "#ef4444" };
        case "warning":
            return { ...base, backgroundColor: "#fef3c7", borderColor: "#f59e0b" };
        case "info":
            return { ...base, backgroundColor: "#dbeafe", borderColor: "#3b82f6" };
        default:
            return { ...base, backgroundColor: "#f3f4f6", borderColor: "#9ca3af" };
    }
}

/* =========================================
   STYLES
========================================= */

const styles = {
    container: {
        minHeight: "100vh",
        backgroundColor: "#f4f6f8",
        fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    },
    header: {
        backgroundColor: "#fff",
        padding: "16px 24px",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        position: "sticky",
        top: 0,
        zIndex: 100
    },
    headerLeft: {
        display: "flex",
        alignItems: "center",
        gap: "12px"
    },
    title: {
        margin: 0,
        fontSize: "22px",
        fontWeight: 600,
        color: "#2c3e50",
        display: "flex",
        alignItems: "center",
        gap: "10px"
    },
    logo: {
        color: "#0078d7"
    },
    version: {
        fontSize: "12px",
        padding: "4px 8px",
        backgroundColor: "#f3f4f6",
        borderRadius: "4px",
        color: "#6b7280",
        fontWeight: 500
    },
    headerRight: {
        display: "flex",
        gap: "12px",
        alignItems: "center"
    },
    statusBadge: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "6px 12px",
        backgroundColor: "#f3f4f6",
        borderRadius: "6px",
        fontSize: "13px",
        fontWeight: 500,
        color: "#4b5563"
    },
    statusDot: {
        width: "8px",
        height: "8px",
        borderRadius: "50%"
    },
    iconButton: {
        padding: "8px",
        backgroundColor: "#f3f4f6",
        border: "none",
        borderRadius: "6px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "background-color 0.2s"
    },
    main: {
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        maxWidth: "1600px",
        margin: "0 auto"
    },
    mainContent: {
        display: "flex",
        flexDirection: "column",
        gap: "24px"
    },
    section: {
        backgroundColor: "#fff",
        borderRadius: "12px",
        padding: "24px",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)"
    },
    logsPanel: {
        backgroundColor: "#fff",
        margin: "0 24px 24px 24px",
        borderRadius: "12px",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.1)",
        maxHeight: "400px",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column"
    },
    logsPanelHeader: {
        padding: "16px 20px",
        borderBottom: "1px solid #e5e7eb",
        display: "flex",
        alignItems: "center",
        gap: "12px"
    },
    logsPanelTitle: {
        margin: 0,
        fontSize: "16px",
        fontWeight: 600,
        color: "#2c3e50",
        flex: 1
    },
    logsFilter: {
        padding: "6px 10px",
        border: "1px solid #d1d5db",
        borderRadius: "6px",
        fontSize: "13px",
        cursor: "pointer"
    },
    closeButton: {
        padding: "4px 8px",
        backgroundColor: "#f3f4f6",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer",
        fontSize: "16px",
        color: "#6b7280"
    },
    logsContent: {
        padding: "16px 20px",
        overflowY: "auto",
        maxHeight: "320px"
    },
    noLogs: {
        textAlign: "center",
        color: "#9ca3af",
        padding: "20px"
    },
    logHeader: {
        display: "flex",
        justifyContent: "space-between",
        marginBottom: "6px"
    },
    logLevel: {
        fontWeight: 600,
        fontSize: "11px"
    },
    logTime: {
        fontSize: "11px",
        color: "#6b7280"
    },
    logMessage: {
        marginBottom: "8px",
        color: "#374151"
    },
    logDetails: {
        marginTop: "8px"
    },
    logSummary: {
        cursor: "pointer",
        fontSize: "12px",
        color: "#6b7280",
        marginBottom: "4px"
    },
    logPre: {
        fontSize: "11px",
        backgroundColor: "#f9fafb",
        padding: "8px",
        borderRadius: "4px",
        overflow: "auto",
        maxHeight: "120px",
        margin: 0
    },
    // Loading styles
    loadingContainer: {
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f7fafc"
    },
    spinner: {
        width: "60px",
        height: "60px",
        border: "6px solid #e2e8f0",
        borderTopColor: "#667eea",
        borderRadius: "50%",
        animation: "spin 1s linear infinite",
        marginBottom: "16px"
    },
    loadingText: {
        fontSize: "16px",
        color: "#718096",
        fontWeight: 500
    }
};
