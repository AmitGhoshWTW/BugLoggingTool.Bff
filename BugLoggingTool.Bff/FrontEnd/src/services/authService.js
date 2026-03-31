// src/services/authService.js
/**
 * Authentication Service
 * 
 * Utility functions for authentication-related operations
 */

import { graphConfig } from '../config/authConfig';

/**
 * Fetch user's manager from Microsoft Graph
 * Requires User.Read.All permission
 */
export async function fetchUserManager(accessToken) {
  try {
    const response = await fetch(`${graphConfig.graphMeEndpoint}/manager`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        // User doesn't have a manager assigned
        return null;
      }
      throw new Error('Failed to fetch manager information');
    }

    const manager = await response.json();
    return {
      name: manager.displayName,
      email: manager.mail || manager.userPrincipalName,
    };
  } catch (error) {
    console.error('Error fetching user manager:', error);
    return null;
  }
}

/**
 * Fetch user's photo from Microsoft Graph
 */
export async function fetchUserPhoto(accessToken) {
  try {
    const response = await fetch(graphConfig.graphPhotoEndpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Error fetching user photo:', error);
    return null;
  }
}

/**
 * Search users in Azure AD
 * Requires User.ReadBasic.All permission
 */
export async function searchUsers(accessToken, searchTerm) {
  try {
    const response = await fetch(
      `${graphConfig.graphUsersEndpoint}?$filter=startswith(displayName,'${searchTerm}') or startswith(mail,'${searchTerm}')&$top=10&$select=id,displayName,mail,jobTitle`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to search users');
    }

    const data = await response.json();
    return data.value.map(user => ({
      id: user.id,
      name: user.displayName,
      email: user.mail,
      jobTitle: user.jobTitle,
    }));
  } catch (error) {
    console.error('Error searching users:', error);
    return [];
  }
}

/**
 * Validate Azure AD token (client-side basic validation)
 * For production, always validate tokens server-side as well
 */
export function validateToken(idToken) {
  if (!idToken) {
    return { valid: false, error: 'No token provided' };
  }

  try {
    // Decode JWT token (without verification - for client-side only)
    const base64Url = idToken.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    const payload = JSON.parse(jsonPayload);

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return { valid: false, error: 'Token expired' };
    }

    // Check issued time
    if (payload.iat && payload.iat > now + 300) {
      // Allow 5 minutes clock skew
      return { valid: false, error: 'Token issued in the future' };
    }

    return { valid: true, payload };
  } catch (error) {
    return { valid: false, error: 'Invalid token format' };
  }
}

/**
 * Extract user claims from ID token
 */
export function extractUserClaims(idToken) {
  const validation = validateToken(idToken);
  if (!validation.valid) {
    return null;
  }

  const claims = validation.payload;
  return {
    userId: claims.oid || claims.sub,
    username: claims.preferred_username || claims.upn || claims.email,
    name: claims.name,
    email: claims.email || claims.preferred_username,
    roles: claims.roles || [],
    tenantId: claims.tid,
    issuer: claims.iss,
    audience: claims.aud,
    issuedAt: new Date(claims.iat * 1000),
    expiresAt: new Date(claims.exp * 1000),
  };
}

/**
 * Create CouchDB authentication header from Azure AD token
 * This should be done server-side in production
 */
export async function getCouchDBAuthHeader(azureToken, backendUrl) {
  try {
    const response = await fetch(`${backendUrl}/api/auth/couchdb-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${azureToken}`,
      },
      body: JSON.stringify({ azureToken }),
    });

    if (!response.ok) {
      throw new Error('Failed to get CouchDB token');
    }

    const { couchToken } = await response.json();
    return `Bearer ${couchToken}`;
  } catch (error) {
    console.error('Error getting CouchDB auth header:', error);
    throw error;
  }
}

/**
 * Check if user has specific permission/role
 */
export function hasPermission(user, permission) {
  if (!user || !user.roles) {
    return false;
  }

  // Admin has all permissions
  if (user.roles.includes('Admin')) {
    return true;
  }

  // Check specific permissions
  const permissionMap = {
    'create_report': ['User', 'PowerUser', 'ITSupport', 'Admin'],
    'view_own_reports': ['User', 'PowerUser', 'ITSupport', 'Admin'],
    'view_all_reports': ['ITSupport', 'Admin'],
    'edit_report': ['PowerUser', 'ITSupport', 'Admin'],
    'delete_report': ['ITSupport', 'Admin'],
    'manage_users': ['Admin'],
    'view_analytics': ['ITSupport', 'Admin'],
  };

  const allowedRoles = permissionMap[permission] || [];
  return user.roles.some(role => allowedRoles.includes(role));
}

/**
 * Format user display name
 */
export function formatDisplayName(user) {
  if (!user) return 'Unknown User';
  
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  
  if (user.name) {
    return user.name;
  }
  
  if (user.email) {
    return user.email.split('@')[0];
  }
  
  return 'Unknown User';
}

/**
 * Get user initials for avatar
 */
export function getUserInitials(user) {
  if (!user) return 'U';
  
  if (user.firstName && user.lastName) {
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  }
  
  if (user.name) {
    const parts = user.name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return user.name.substring(0, 2).toUpperCase();
  }
  
  if (user.email) {
    return user.email.substring(0, 2).toUpperCase();
  }
  
  return 'U';
}

/**
 * Check if token needs refresh (expires in less than 5 minutes)
 */
export function needsTokenRefresh(expiresAt) {
  if (!expiresAt) return true;
  
  const now = new Date();
  const exp = new Date(expiresAt);
  const fiveMinutes = 5 * 60 * 1000;
  
  return (exp - now) < fiveMinutes;
}

/**
 * Log authentication event (for audit trail)
 */
export function logAuthEvent(event, user, details = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event: event, // 'login', 'logout', 'token_refresh', 'permission_denied'
    userId: user?.id || 'unknown',
    userEmail: user?.email || 'unknown',
    details: details,
    userAgent: navigator.userAgent,
    platform: navigator.platform,
  };

  console.log('[AUTH EVENT]', logEntry);
  
  // In production, send to backend for audit logging
  // sendToAuditLog(logEntry);
}

export default {
  fetchUserManager,
  fetchUserPhoto,
  searchUsers,
  validateToken,
  extractUserClaims,
  getCouchDBAuthHeader,
  hasPermission,
  formatDisplayName,
  getUserInitials,
  needsTokenRefresh,
  logAuthEvent,
};
