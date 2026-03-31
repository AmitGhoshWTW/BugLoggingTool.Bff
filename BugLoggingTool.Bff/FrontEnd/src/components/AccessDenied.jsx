// src/components/AccessDenied.jsx
import React from 'react';
import { useAuth } from '../hooks/useAuth';
import './AccessDenied.css';

/**
 * Access Denied Component
 * 
 * Shown when authenticated user doesn't have required roles
 */
export function AccessDenied() {
  const { user, logout, getUserRoles } = useAuth();
  
  const userRoles = getUserRoles();
  const requiredRoles = ['User', 'PowerUser', 'ITSupport', 'Admin'];

  return (
    <div className="access-denied-container">
      <div className="access-denied-card">
        {/* Icon */}
        <div className="access-denied-icon">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          </svg>
        </div>

        {/* Title */}
        <h1 className="access-denied-title">Access Denied</h1>
        
        {/* Message */}
        <p className="access-denied-message">
          You don't have permission to access the Bug Logging Tool.
        </p>

        {/* User Info */}
        <div className="access-denied-info">
          <div className="info-section">
            <span className="info-label">Signed in as:</span>
            <span className="info-value">{user?.name || 'Unknown User'}</span>
          </div>
          
          <div className="info-section">
            <span className="info-label">Email:</span>
            <span className="info-value">{user?.email || 'N/A'}</span>
          </div>

          {userRoles.length > 0 ? (
            <div className="info-section">
              <span className="info-label">Your roles:</span>
              <div className="roles-display">
                {userRoles.map(role => (
                  <span key={role} className="role-badge-denied">
                    {role}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="info-section">
              <span className="info-label">Your roles:</span>
              <span className="info-value-warning">No roles assigned</span>
            </div>
          )}

          <div className="info-section">
            <span className="info-label">Required roles:</span>
            <div className="roles-display">
              {requiredRoles.map(role => (
                <span key={role} className="role-badge-required">
                  {role}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="access-denied-instructions">
          <h3>What to do?</h3>
          <ol>
            <li>Contact your IT administrator or helpdesk</li>
            <li>Request access to the Bug Logging Tool</li>
            <li>Ask to be assigned one of the required roles above</li>
            <li>Sign out and sign in again after access is granted</li>
          </ol>
        </div>

        {/* Actions */}
        <div className="access-denied-actions">
          <button 
            onClick={logout}
            className="btn-logout"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3 1a1 1 0 00-1 1v12a1 1 0 001 1h5v-2H3V2h5V0H3zm7.5 4.5L9 7h5v2H9l1.5 1.5L9 12l-3.5-4L9 4l1.5 1.5z"/>
            </svg>
            Sign Out
          </button>

          <a 
            href="mailto:it-support@company.com?subject=BLT Access Request&body=Please grant me access to Bug Logging Tool"
            className="btn-contact"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M0 4a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H2a2 2 0 01-2-2V4zm2-1a1 1 0 00-1 1v.217l7 4.2 7-4.2V4a1 1 0 00-1-1H2zm13 2.383l-4.758 2.855L15 11.114v-5.73zm-.034 6.878L9.271 8.82 8 9.583 6.728 8.82l-5.694 3.44A1 1 0 002 13h12a1 1 0 00.966-.739zM1 11.114l4.758-2.876L1 5.383v5.73z"/>
            </svg>
            Contact IT Support
          </a>
        </div>

        {/* Footer */}
        <div className="access-denied-footer">
          <p>
            If you believe this is an error, please contact your system administrator.
          </p>
        </div>
      </div>
    </div>
  );
}

export default AccessDenied;
