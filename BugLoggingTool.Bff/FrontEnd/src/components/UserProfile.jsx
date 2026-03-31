// src/components/UserProfile.jsx
// Simplified version without react-router-dom dependency
import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import './UserProfile.css';

/**
 * User Profile Component
 * 
 * Displays user information and provides logout functionality
 * Compact version for navigation bar (no routing needed)
 */
export function UserProfile({ compact = true }) {
  const { user, logout, isLoading, getUserRoles } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  if (!user) return null;

  const userRoles = getUserRoles();
  const initials = user.firstName && user.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`
    : user.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      logout();
    }
  };

  // Only compact version (for navigation bar)
  return (
    <div className="user-profile-compact">
      <button
        className="user-avatar-button"
        onClick={() => setShowDropdown(!showDropdown)}
        aria-label="User menu"
      >
        <div className="user-avatar">{initials}</div>
        <span className="user-name-short">{user.firstName || user.name}</span>
        <svg 
          className={`dropdown-arrow ${showDropdown ? 'open' : ''}`}
          width="16" 
          height="16" 
          viewBox="0 0 16 16"
        >
          <path 
            fill="currentColor" 
            d="M8 11L3 6h10z"
          />
        </svg>
      </button>

      {showDropdown && (
        <>
          <div 
            className="dropdown-backdrop" 
            onClick={() => setShowDropdown(false)}
          />
          <div className="user-dropdown">
            <div className="user-dropdown-header">
              <div className="user-avatar-large">{initials}</div>
              <div className="user-info">
                <div className="user-name-full">{user.name}</div>
                <div className="user-email">{user.email}</div>
              </div>
            </div>

            {userRoles.length > 0 && (
              <div className="user-roles">
                <div className="roles-label">Roles:</div>
                <div className="roles-list">
                  {userRoles.map(role => (
                    <span key={role} className="role-badge">
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="user-dropdown-divider" />

            <div className="user-dropdown-menu">
              {/* User Info Display */}
              <div className="dropdown-info-section">
                {user.jobTitle && (
                  <div className="info-row">
                    <span className="info-label">Job Title:</span>
                    <span className="info-value">{user.jobTitle}</span>
                  </div>
                )}
                {user.department && (
                  <div className="info-row">
                    <span className="info-label">Department:</span>
                    <span className="info-value">{user.department}</span>
                  </div>
                )}
                {user.officeLocation && (
                  <div className="info-row">
                    <span className="info-label">Office:</span>
                    <span className="info-value">{user.officeLocation}</span>
                  </div>
                )}
              </div>

              <div className="dropdown-divider" />

              <button 
                className="dropdown-item danger" 
                onClick={handleLogout}
                disabled={isLoading}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M3 1a1 1 0 00-1 1v12a1 1 0 001 1h5v-2H3V2h5V0H3zm7.5 4.5L9 7h5v2H9l1.5 1.5L9 12l-3.5-4L9 4l1.5 1.5z"/>
                </svg>
                <span>{isLoading ? 'Signing out...' : 'Sign out'}</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default UserProfile;