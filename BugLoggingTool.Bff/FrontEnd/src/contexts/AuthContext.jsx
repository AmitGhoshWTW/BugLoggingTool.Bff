// src/contexts/AuthContext.jsx
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { 
  InteractionRequiredAuthError,
  EventType
} from '@azure/msal-browser';
import { loginRequest, tokenRequest, graphConfig, AppRoles } from '../config/authConfig';

// Import the single shared MSAL instance from App.jsx
// Do NOT create a new instance here — that causes the duplicate warning
import { msalInstance } from '../App';

// Create Auth Context
export const AuthContext = createContext(null);

/**
 * Authentication Provider Component
 * 
 * Provides authentication state and methods to all child components
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [account, setAccount] = useState(null);

  /**
   * Get user roles from token claims
   */
  const getUserRoles = useCallback((account) => {
    if (!account || !account.idTokenClaims) {
      return [];
    }
    return account.idTokenClaims.roles || [];
  }, []);

  /**
   * Check if user has specific role
   */
  const hasRole = useCallback((role) => {
    if (!account) return false;
    const roles = getUserRoles(account);
    return roles.includes(role);
  }, [account, getUserRoles]);

  /**
   * Check if user has any of the specified roles
   */
  const hasAnyRole = useCallback((roles) => {
    if (!account) return false;
    const userRoles = getUserRoles(account);
    return roles.some(role => userRoles.includes(role));
  }, [account, getUserRoles]);

  /**
   * Fetch user profile from Microsoft Graph
   */
  const fetchUserProfile = useCallback(async (accessToken) => {
    try {
      const response = await fetch(graphConfig.graphMeEndpoint, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }

      const profile = await response.json();
      
      return {
        id: profile.id,
        email: profile.mail || profile.userPrincipalName,
        name: profile.displayName,
        firstName: profile.givenName,
        lastName: profile.surname,
        jobTitle: profile.jobTitle,
        department: profile.department,
        officeLocation: profile.officeLocation,
        mobilePhone: profile.mobilePhone,
        businessPhones: profile.businessPhones,
      };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }, []);

  /**
   * Initialize authentication state on mount
   */
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setIsLoading(true);

        // Handle redirect response
        // const response = await msalInstance.handleRedirectPromise();

        try {
          const response = await msalInstance.handleRedirectPromise();

          if (response) {
            // User just logged in via redirect
            console.log('Login successful via redirect');
            setAccount(response.account);
          }
        } catch (err) {
          // no_token_request_cache_error fires on fresh loads with no active redirect
          // This is expected behaviour — not a real error
          if (err.errorCode === 'no_token_request_cache_error') {
            console.debug('[MSAL] No redirect in progress — normal on fresh load');
          } else {
            console.error('Authentication initialization error:', err);
            throw err;   // re-throw real auth errors
          }
        }
        
        // if (response) {
        //   // User just logged in via redirect
        //   console.log('Login successful via redirect');
        //   setAccount(response.account);
        // }

        // Check if user is already logged in
        const accounts = msalInstance.getAllAccounts();
        
        if (accounts.length > 0) {
          const currentAccount = accounts[0];
          setAccount(currentAccount);
          msalInstance.setActiveAccount(currentAccount);

          // Get access token for Microsoft Graph
          try {
            const tokenResponse = await msalInstance.acquireTokenSilent({
              ...tokenRequest,
              account: currentAccount,
            });

            // Fetch user profile
            const userProfile = await fetchUserProfile(tokenResponse.accessToken);
            
            if (userProfile) {
              setUser({
                ...userProfile,
                roles: getUserRoles(currentAccount),
              });
              setIsAuthenticated(true);
            }
          } catch (tokenError) {
            console.error('Error acquiring token:', tokenError);
            
            // If token acquisition fails, user needs to re-authenticate
            if (tokenError instanceof InteractionRequiredAuthError) {
              // Don't automatically redirect - let user click login button
              setIsAuthenticated(false);
            }
          }
        }

        setError(null);
      } catch (error) {
        console.error('Authentication initialization error:', error);
        setError(error.message);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [fetchUserProfile, getUserRoles]);

  /**
   * Set up MSAL event callbacks
   */
  useEffect(() => {
    const callbackId = msalInstance.addEventCallback((event) => {
      if (event.eventType === EventType.LOGIN_SUCCESS && event.payload.account) {
        console.log('Login success event');
        setAccount(event.payload.account);
        msalInstance.setActiveAccount(event.payload.account);
      }

      if (event.eventType === EventType.LOGIN_FAILURE) {
        console.error('Login failure event:', event.error);
        setError(event.error?.message || 'Login failed');
      }

      if (event.eventType === EventType.LOGOUT_SUCCESS) {
        console.log('Logout success event');
        setAccount(null);
        setUser(null);
        setIsAuthenticated(false);
      }

      if (event.eventType === EventType.ACQUIRE_TOKEN_SUCCESS) {
        console.log('Token acquired successfully');
      }

      if (event.eventType === EventType.ACQUIRE_TOKEN_FAILURE) {
        console.error('Token acquisition failed:', event.error);
      }
    });

    return () => {
      if (callbackId) {
        msalInstance.removeEventCallback(callbackId);
      }
    };
  }, []);

  /**
   * Login using redirect
   */
  const login = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Use redirect for better mobile compatibility
      await msalInstance.loginRedirect(loginRequest);
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message);
      setIsLoading(false);
    }
  }, []);

  /**
   * Login using popup (alternative method)
   */
  const loginPopup = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await msalInstance.loginPopup(loginRequest);
      
      if (response && response.account) {
        setAccount(response.account);
        msalInstance.setActiveAccount(response.account);

        // Get user profile
        const userProfile = await fetchUserProfile(response.accessToken);
        
        if (userProfile) {
          setUser({
            ...userProfile,
            roles: getUserRoles(response.account),
          });
          setIsAuthenticated(true);
        }
      }
    } catch (error) {
      console.error('Login popup error:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [fetchUserProfile, getUserRoles]);

  /**
   * Logout
   */
  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const logoutRequest = {
        account: account,
        postLogoutRedirectUri: msalConfig.auth.postLogoutRedirectUri,
      };

      await msalInstance.logoutRedirect(logoutRequest);
    } catch (error) {
      console.error('Logout error:', error);
      setError(error.message);
      setIsLoading(false);
    }
  }, [account]);

  /**
   * Get access token for API calls
   */
  const getAccessToken = useCallback(async (scopes = tokenRequest.scopes) => {
    if (!account) {
      throw new Error('No active account. Please login.');
    }

    try {
      // Try to acquire token silently (from cache)
      const response = await msalInstance.acquireTokenSilent({
        scopes: scopes,
        account: account,
      });

      return response.accessToken;
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        // Token expired or consent required - need user interaction
        console.log('Interactive authentication required');
        
        try {
          // Use redirect for token acquisition
          await msalInstance.acquireTokenRedirect({
            scopes: scopes,
            account: account,
          });
        } catch (redirectError) {
          console.error('Token acquisition redirect error:', redirectError);
          throw redirectError;
        }
      } else {
        console.error('Token acquisition error:', error);
        throw error;
      }
    }
  }, [account]);

  /**
   * Refresh user profile
   */
  const refreshUserProfile = useCallback(async () => {
    if (!account) return;

    try {
      const accessToken = await getAccessToken();
      const userProfile = await fetchUserProfile(accessToken);
      
      if (userProfile) {
        setUser({
          ...userProfile,
          roles: getUserRoles(account),
        });
      }
    } catch (error) {
      console.error('Error refreshing user profile:', error);
    }
  }, [account, getAccessToken, fetchUserProfile, getUserRoles]);

  /**
   * Get ID token (for backend validation)
   */
  const getIdToken = useCallback(() => {
    if (!account) return null;
    return account.idToken;
  }, [account]);

  /**
   * Check if token is expired
   */
  const isTokenExpired = useCallback(() => {
    if (!account || !account.idTokenClaims) return true;
    
    const exp = account.idTokenClaims.exp;
    const now = Math.floor(Date.now() / 1000);
    
    return exp < now;
  }, [account]);

  // Context value
  const value = {
    // State
    user,
    isAuthenticated,
    isLoading,
    error,
    account,

    // Methods
    login,
    loginPopup,
    logout,
    getAccessToken,
    getIdToken,
    refreshUserProfile,
    isTokenExpired,

    // Role methods
    hasRole,
    hasAnyRole,
    getUserRoles: () => getUserRoles(account),

    // Role constants
    roles: AppRoles,

    // MSAL instance (for advanced usage)
    msalInstance,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;
