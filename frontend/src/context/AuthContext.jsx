import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [otpRequired, setOtpRequired] = useState(false);
  const [pendingUser, setPendingUser] = useState(null); // { email, challengeId }
  const [authState, setAuthState] = useState('LOGGED_OUT'); 

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await authService.logout();
    } catch (e) {
      console.error('Logout error on backend:', e);
    } finally {
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
      setUser(null);
      setPendingUser(null);
      setIsAuthenticated(false);
      setOtpRequired(false);
      setAuthState('LOGGED_OUT');
      setIsLoading(false);
    }
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const response = await authService.getCurrentUser();
      if (response && response.user) {
        setUser(response.user);
        setIsAuthenticated(true);
        setAuthState('AUTHENTICATED');
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setAuthState('LOGGED_OUT');
      }
    } catch (err) {
      setUser(null);
      setIsAuthenticated(false);
      setAuthState('LOGGED_OUT');
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
      // res is unpacked by Axios response interceptor directly into res.data payload
      if (res.status === 'OTP_REQUIRED') {
        setOtpRequired(true);
        setAuthState('OTP_REQUIRED');
        setPendingUser({ email: res.email, challengeId: res.challenge_id });
        setIsLoading(false);
        return { otpRequired: true, challengeId: res.challenge_id, email: res.email };
      }
      throw new Error('Invalid login response payload.');
    } catch (err) {
      setIsLoading(false);
      // Translate backend specific codes into UI Auth States
      if (err.code === 'EMAIL_VERIFICATION_REQUIRED') {
        setAuthState('EMAIL_VERIFICATION_REQUIRED');
      } else if (err.code === 'ACCOUNT_INACTIVE') {
        setAuthState('ACCOUNT_LOCKED');
      }
      throw err;
    }
  };

  const verifyOtp = async (code) => {
    setIsLoading(true);
    try {
      const challengeId = pendingUser?.challengeId;
      if (!challengeId) {
        throw new Error('Challenge session has expired. Please sign in again.');
      }
      const res = await authService.verifyOTP(challengeId, code);
      if (res.user) {
        setUser(res.user);
        setIsAuthenticated(true);
        setOtpRequired(false);
        setAuthState('AUTHENTICATED');
        setPendingUser(null);
        setIsLoading(false);
        return { success: true, role: res.user.role };
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
      if (res.status === 'OTP_REQUIRED') {
        setOtpRequired(true);
        setAuthState('OTP_REQUIRED');
        setPendingUser({ email: res.email, challengeId: res.challenge_id });
        setIsLoading(false);
        return { otpRequired: true, challengeId: res.challenge_id, email: res.email };
      }
      throw new Error('Invalid Google login response payload.');
    } catch (err) {
      setIsLoading(false);
      if (err.code === 'ACCOUNT_INACTIVE') {
        setAuthState('ACCOUNT_LOCKED');
      }
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
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
        setAuthState
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
