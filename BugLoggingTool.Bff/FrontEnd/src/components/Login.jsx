// src/components/Login.jsx
// Simplified version without react-router-dom dependency
import React from 'react';
import { useAuth } from '../hooks/useAuth';
import './Login.css';

/**
 * Login Page Component
 * 
 * Displays login button and handles Microsoft authentication
 * Note: No routing - authentication state handled by AuthContext
 */
export function Login() {
  const { login, isLoading, error } = useAuth();

  const handleLogin = () => {
    login();
  };

  return (
    <div className="login-container">
      <div className="login-box">
        {/* Logo */}
        <div className="login-logo">
          <svg width="80" height="80" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="#667eea" />
            <text 
              x="50" 
              y="65" 
              fontSize="50" 
              fontWeight="bold" 
              fill="white" 
              textAnchor="middle"
            >
              BLT
            </text>
          </svg>
        </div>

        {/* Title */}
        <h1 className="login-title">Bug Logging Tool</h1>
        <p className="login-subtitle">Enterprise Bug Reporting System</p>

        {/* Error Message */}
        {error && (
          <div className="login-error">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Login Button */}
        <button
          className="login-button"
          onClick={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="spinner-small"></span>
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <svg className="microsoft-logo" width="24" height="24" viewBox="0 0 24 24">
                <rect x="1" y="1" width="10" height="10" fill="#f25022"/>
                <rect x="13" y="1" width="10" height="10" fill="#7fba00"/>
                <rect x="1" y="13" width="10" height="10" fill="#00a4ef"/>
                <rect x="13" y="13" width="10" height="10" fill="#ffb900"/>
              </svg>
              <span>Sign in with Microsoft</span>
            </>
          )}
        </button>

        {/* Information */}
        <div className="login-info">
          <p>Sign in with your organization account</p>
          <ul>
            <li>✓ Secure Azure AD authentication</li>
            <li>✓ Single sign-on (SSO)</li>
            <li>✓ Works offline after first login</li>
          </ul>
        </div>

        {/* Footer */}
        <div className="login-footer">
          <p className="text-muted">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>

      {/* Background Pattern */}
      <div className="login-background">
        <div className="bg-pattern"></div>
      </div>
    </div>
  );
}

export default Login;