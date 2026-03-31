// src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * Protected Route Component
 * 
 * Wraps routes that require authentication
 * Redirects to login if user is not authenticated
 * 
 * Props:
 *   - children: Component to render if authenticated
 *   - requiredRoles: Array of roles required to access route (optional)
 *   - redirectPath: Path to redirect if not authenticated (default: '/login')
 * 
 * Usage:
 *   <ProtectedRoute>
 *     <MyComponent />
 *   </ProtectedRoute>
 * 
 *   <ProtectedRoute requiredRoles={['Admin', 'ITSupport']}>
 *     <AdminPanel />
 *   </ProtectedRoute>
 */
export function ProtectedRoute({ 
  children, 
  requiredRoles = [], 
  redirectPath = '/login' 
}) {
  const { isAuthenticated, isLoading, hasAnyRole } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Authenticating...</p>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    // Save the location user was trying to access
    return <Navigate to={redirectPath} state={{ from: location }} replace />;
  }

  // Check role requirements
  if (requiredRoles.length > 0 && !hasAnyRole(requiredRoles)) {
    // User is authenticated but doesn't have required role
    return (
      <div className="unauthorized-container">
        <div className="unauthorized-message">
          <h1>⛔ Access Denied</h1>
          <p>You do not have permission to access this page.</p>
          <p>Required roles: {requiredRoles.join(', ')}</p>
          <button onClick={() => window.history.back()}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // User is authenticated and has required role (if any)
  return children;
}

/**
 * Role-Based Route Component
 * 
 * Convenience component for routes that require specific roles
 * 
 * Usage:
 *   <RoleBasedRoute roles={['Admin']}>
 *     <AdminPanel />
 *   </RoleBasedRoute>
 */
export function RoleBasedRoute({ children, roles }) {
  return (
    <ProtectedRoute requiredRoles={roles}>
      {children}
    </ProtectedRoute>
  );
}

export default ProtectedRoute;
