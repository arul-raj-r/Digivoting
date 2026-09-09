import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  // Initialize user from localStorage for instant routing without flicker
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('digivote_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('digivote_access_token');
  });
  const [isLoading, setIsLoading] = useState(false);
  const [otpRequired, setOtpRequired] = useState(false);
  const [pendingUser, setPendingUser] = useState(null); // { email, challengeId }
  const [authState, setAuthState] = useState(() => {
    return localStorage.getItem('digivote_access_token') ? 'AUTHENTICATED' : 'LOGGED_OUT';
  }); 

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await authService.logout();
    } catch (e) {
      console.error('Logout error on backend:', e);
    } finally {
      localStorage.removeItem('digivote_access_token');
      localStorage.removeItem('digivote_refresh_token');
      localStorage.removeItem('digivote_user');
      setUser(null);
      setPendingUser(null);
      setIsAuthenticated(false);
      setOtpRequired(false);
      setAuthState('LOGGED_OUT');
      setIsLoading(false);
    }
  }, []);

  const logoutAll = useCallback(async () => {
    setIsLoading(true);
    try {
      await authService.logoutAll();
    } catch (e) {
      console.error('Logout all error on backend:', e);
    } finally {
      localStorage.removeItem('digivote_access_token');
      localStorage.removeItem('digivote_refresh_token');
      localStorage.removeItem('digivote_user');
      setUser(null);
      setPendingUser(null);
      setIsAuthenticated(false);
      setOtpRequired(false);
      setAuthState('LOGGED_OUT');
      setIsLoading(false);
    }
  }, []);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('digivote_access_token');
    if (!token) {
      setUser(null);
      setIsAuthenticated(false);
      setAuthState('LOGGED_OUT');
      return;
    }

    try {
      const response = await authService.getCurrentUser();
      if (response && response.user) {
        setUser(response.user);
        setIsAuthenticated(true);
        setAuthState('AUTHENTICATED');
        localStorage.setItem('digivote_user', JSON.stringify(response.user));
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setAuthState('LOGGED_OUT');
      }
    } catch (err) {
      // If 401 or token invalid, clear session
      if (err?.response?.status === 401) {
        localStorage.removeItem('digivote_access_token');
        localStorage.removeItem('digivote_user');
        setUser(null);
        setIsAuthenticated(false);
        setAuthState('LOGGED_OUT');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const res = await authService.login(email, password);
      if (res.status === 'OTP_REQUIRED' || res.auth_state === 'PENDING_MFA') {
        const challengeId = res.challenge_id || res.pre_auth_token;
        setOtpRequired(true);
        setAuthState('OTP_REQUIRED');
        const pendingData = {
          email: res.email || email,
          challengeId,
          preAuthToken: challengeId,
          destination: res.destination,
          expiresInSeconds: res.expires_in_seconds || 300,
          cooldownSeconds: res.cooldown_seconds || 30,
          maxAttempts: res.max_attempts || 3
        };
        setPendingUser(pendingData);
        setIsLoading(false);
        return { otpRequired: true, ...pendingData };
      }
      throw new Error(res.message || 'Invalid login response payload.');
    } catch (err) {
      setIsLoading(false);
      // Translate backend specific codes into UI Auth States
      if (err.code === 'EMAIL_VERIFICATION_REQUIRED') {
        setAuthState('EMAIL_VERIFICATION_REQUIRED');
      } else if (err.code === 'ACCOUNT_LOCKED' || err.code === 'ACCOUNT_INACTIVE') {
        setAuthState('ACCOUNT_LOCKED');
      }
      throw err;
    }
  };

  const verifyOtp = async (code) => {
    setIsLoading(true);
    try {
      const challengeId = pendingUser?.challengeId || pendingUser?.preAuthToken;
      if (!challengeId) {
        throw new Error('Challenge session has expired. Please sign in again.');
      }
      const res = await authService.verifyOTP(challengeId, code);
      if (res.tokens?.access) {
        localStorage.setItem('digivote_access_token', res.tokens.access);
        localStorage.setItem('digivote_refresh_token', res.tokens.refresh);
      }
      if (res.user) {
        localStorage.setItem('digivote_user', JSON.stringify(res.user));
        setUser(res.user);
        setIsAuthenticated(true);
        setOtpRequired(false);
        setAuthState('AUTHENTICATED');
        setPendingUser(null);
        setIsLoading(false);
        return { success: true, role: res.user.role, user: res.user };
      }
      throw new Error('Invalid verification response.');
    } catch (err) {
      setIsLoading(false);
      throw err;
    }
  };

  const googleLogin = async (credential) => {
    setIsLoading(true);
    try {
      const res = await authService.googleLogin(credential);
      if (res.status === 'OTP_REQUIRED' || res.auth_state === 'PENDING_MFA') {
        const challengeId = res.challenge_id || res.pre_auth_token;
        setOtpRequired(true);
        setAuthState('OTP_REQUIRED');
        const pendingData = {
          email: res.email,
          challengeId,
          preAuthToken: challengeId,
          destination: res.destination,
          expiresInSeconds: res.expires_in_seconds || 300,
          cooldownSeconds: res.cooldown_seconds || 30,
          maxAttempts: res.max_attempts || 3
        };
        setPendingUser(pendingData);
        setIsLoading(false);
        return { otpRequired: true, ...pendingData };
      }
      throw new Error(res.message || 'Invalid Google login response payload.');
    } catch (err) {
      setIsLoading(false);
      if (err.code === 'ACCOUNT_LOCKED' || err.code === 'ACCOUNT_INACTIVE') {
        setAuthState('ACCOUNT_LOCKED');
      }
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        isAuthenticated,
        isLoading,
        otpRequired,
        pendingUser,
        authState,
        login,
        logout,
        logoutAll,
        verifyOtp,
        googleLogin,
        checkAuth,
        setOtpRequired,
        setPendingUser,
        setAuthState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
