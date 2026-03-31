// src/config/authConfig.js
import { LogLevel } from '@azure/msal-browser';

/**
 * Azure AD Authentication Configuration
 * 
 * This configuration is used by MSAL (Microsoft Authentication Library)
 * to authenticate users against Azure Active Directory.
 */

// Read configuration from environment variables
const clientId = import.meta.env.VITE_AZURE_AD_CLIENT_ID;
const tenantId = import.meta.env.VITE_AZURE_AD_TENANT_ID;
const redirectUri = import.meta.env.VITE_AZURE_AD_REDIRECT_URI || window.location.origin;

if (!clientId || !tenantId) {
  console.error('Azure AD configuration is missing. Please check your .env file.');
}

/**
 * MSAL Configuration Object
 */
export const msalConfig = {
  auth: {
    clientId: clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri: redirectUri,
    postLogoutRedirectUri: redirectUri,
    navigateToLoginRequestUrl: true,
  },
  cache: {
    cacheLocation: 'sessionStorage', // Use sessionStorage for better security
    storeAuthStateInCookie: false, // Set to true for IE11 or Edge support
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) {
          return;
        }
        switch (level) {
          case LogLevel.Error:
            console.error(message);
            return;
          case LogLevel.Info:
            console.info(message);
            return;
          case LogLevel.Verbose:
            console.debug(message);
            return;
          case LogLevel.Warning:
            console.warn(message);
            return;
          default:
            return;
        }
      },
      logLevel: LogLevel.Warning, // Set to Verbose for debugging
      piiLoggingEnabled: false,
    },
    windowHashTimeout: 60000,
    iframeHashTimeout: 6000,
    loadFrameTimeout: 0,
  },
};

/**
 * Scopes for Microsoft Graph API
 * These define what user information we can access
 */
export const loginRequest = {
  scopes: ['User.Read', 'email', 'profile', 'openid'],
};

/**
 * Scopes for silent token acquisition
 */
export const tokenRequest = {
  scopes: ['User.Read'],
  forceRefresh: false, // Set to true to skip cached token
};

/**
 * Microsoft Graph API endpoints
 */
export const graphConfig = {
  graphMeEndpoint: 'https://graph.microsoft.com/v1.0/me',
  graphUsersEndpoint: 'https://graph.microsoft.com/v1.0/users',
  graphPhotoEndpoint: 'https://graph.microsoft.com/v1.0/me/photo/$value',
};

/**
 * Application Role Definitions
 * These must match the roles configured in Azure AD
 */
export const AppRoles = {
  USER: 'User',
  POWER_USER: 'PowerUser',
  IT_SUPPORT: 'ITSupport',
  ADMIN: 'Admin',
};

/**
 * Protected resources configuration
 * Maps resources to required scopes
 */
export const protectedResources = {
  graphApi: {
    endpoint: 'https://graph.microsoft.com/v1.0',
    scopes: ['User.Read'],
  },
  couchDb: {
    endpoint: import.meta.env.VITE_COUCHDB_URL,
    scopes: [], // CouchDB uses separate authentication
  },
};

/**
 * Error messages for common authentication errors
 */
export const authErrors = {
  loginFailed: 'Failed to login. Please try again.',
  tokenExpired: 'Your session has expired. Please login again.',
  insufficientPermissions: 'You do not have permission to access this resource.',
  networkError: 'Network error. Please check your connection and try again.',
  configurationError: 'Authentication configuration error. Please contact support.',
};

export default msalConfig;
