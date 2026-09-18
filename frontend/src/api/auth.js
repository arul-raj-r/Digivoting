import api from './api';

const apiClient = api;


/**
 * Register a new voter account on DigiVote (Module 1).
 * @param {Object} userData - { full_name, email, mobile_number, password, confirm_password }
 * @returns {Promise<Object>} API response payload
 */
export const register = async (userData) => {
  try {
    const response = await apiClient.post('/auth/register/', userData);
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      // Structured error response from DRF endpoint
      const errData = error.response.data;
      const formattedError = new Error(errData.message || 'Registration failed.');
      formattedError.status = error.response.status;
      formattedError.code = errData.code || error.code || null;
      formattedError.action = errData.action || error.action || null;
      formattedError.field = errData.field || null;
      formattedError.errors = errData.errors || null;
      formattedError.response = error.response;
      throw formattedError;
    }
    throw new Error('Network error. Unable to connect to the registration service.');
  }
};

/**
 * Authenticate citizen credentials with email + password (Module 2).
 * Returns pre_auth_token and PENDING_MFA state.
 * @param {Object} credentials - { email, password, remember_device }
 * @returns {Promise<Object>} API response payload
 */
export const login = async (credentials) => {
  try {
    const response = await apiClient.post('/auth/login/', credentials);
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      const errData = error.response.data;
      const formattedError = new Error(errData.message || 'Login failed.');
      formattedError.status = error.response.status;
      formattedError.code = errData.code || error.code || null;
      formattedError.action = errData.action || error.action || null;
      formattedError.warning = errData.warning || null;
      formattedError.failed_attempts = errData.failed_attempts || null;
      formattedError.resend_available = errData.resend_available || false;
      formattedError.field = errData.field || null;
      formattedError.errors = errData.errors || null;
      formattedError.response = error.response;
      throw formattedError;
    }
    if (error.response?.status === 429) {
      const throttleError = new Error('Too many login attempts. Please wait a minute before trying again.');
      throttleError.status = 429;
      throw throttleError;
    }
    throw new Error('Network error. Unable to connect to the authentication service.');
  }
};

/**
 * Authenticate or register using Google OAuth ID token (Module 3).
 * @param {string} idToken - Google OAuth ID Token
 * @returns {Promise<Object>} API response payload
 */
export const googleLogin = async (idToken) => {
  try {
    const tokenStr = typeof idToken === 'object' && idToken !== null ? (idToken.credential || idToken.id_token || idToken) : idToken;
    const response = await apiClient.post('/auth/google/', {
      id_token: tokenStr,
      credential: tokenStr,
    });
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      const errData = error.response.data;
      const formattedError = new Error(errData.message || 'Google sign-in failed.');
      formattedError.status = error.response.status;
      formattedError.code = errData.code || null;
      throw formattedError;
    }
    throw new Error('Network error. Unable to connect to Google authentication service.');
  }
};

/**
 * Verify citizen email using token from verification link OR { email, otp_code } (Module 4).
 * @param {string|Object} tokenOrPayload - Token string or { email, otp_code }
 * @returns {Promise<Object>} API response payload
 */
export const verifyEmail = async (tokenOrPayload) => {
  try {
    const payload = typeof tokenOrPayload === 'string' ? { token: tokenOrPayload } : tokenOrPayload;
    const response = await apiClient.post('/auth/verify-email/', payload);
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      const errData = error.response.data;
      const formattedError = new Error(errData.message || 'Email verification failed.');
      formattedError.status = error.response.status;
      formattedError.code = errData.code || error.code || null;
      formattedError.action = errData.action || error.action || null;
      formattedError.response = error.response;
      throw formattedError;
    }
    throw new Error('Network error. Unable to connect to email verification service.');
  }
};

/**
 * Resend verification email with server-side cooldown (Module 4).
 * @param {string} email
 * @returns {Promise<Object>} API response payload
 */
export const resendVerification = async (email) => {
  try {
    const response = await apiClient.post('/auth/resend-verification/', { email });
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      const errData = error.response.data;
      const formattedError = new Error(errData.message || 'Failed to resend verification email.');
      formattedError.status = error.response.status;
      formattedError.code = errData.code || error.code || null;
      formattedError.action = errData.action || error.action || null;
      formattedError.response = error.response;
      throw formattedError;
    }
    throw new Error('Network error. Unable to connect to verification service.');
  }
};

/**
 * Request an OTP code using pre-auth token (Module 5).
 * @param {string} preAuthToken
 * @returns {Promise<Object>} API response payload
 */
export const sendOTP = async (preAuthToken) => {
  try {
    const response = await apiClient.post('/auth/otp/send/', { pre_auth_token: preAuthToken });
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      const errData = error.response.data;
      const formattedError = new Error(errData.message || 'Failed to send verification code.');
      formattedError.status = error.response.status;
      formattedError.code = errData.code || error.code || null;
      formattedError.action = errData.action || error.action || null;
      formattedError.response = error.response;
      throw formattedError;
    }
    throw new Error('Network error. Unable to connect to OTP service.');
  }
};

/**
 * Submit 6-digit OTP code to complete MFA authentication (Module 5).
 * @param {string} preAuthToken
 * @param {string} otpCode
 * @returns {Promise<Object>} API response payload
 */
export const verifyOTP = async (preAuthToken, otpCode) => {
  try {
    const response = await apiClient.post('/auth/otp/verify/', {
      pre_auth_token: preAuthToken,
      otp_code: otpCode,
    });
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      const errData = error.response.data;
      const formattedError = new Error(errData.message || 'OTP verification failed.');
      formattedError.status = error.response.status;
      formattedError.code = errData.code || error.code || null;
      formattedError.action = errData.action || error.action || null;
      formattedError.attemptsRemaining = errData.attempts_remaining ?? null;
      formattedError.errors = errData.errors || null;
      formattedError.response = error.response;
      throw formattedError;
    }
    throw new Error('Network error. Unable to connect to MFA verification service.');
  }
};

/**
 * Resend fresh OTP code with 30s cooldown (Module 5).
 * @param {string} preAuthToken
 * @returns {Promise<Object>} API response payload
 */
export const resendOTP = async (preAuthToken) => {
  try {
    const response = await apiClient.post('/auth/otp/resend/', { pre_auth_token: preAuthToken });
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      const errData = error.response.data;
      const formattedError = new Error(errData.message || 'Failed to resend verification code.');
      formattedError.status = error.response.status;
      formattedError.code = errData.code || null;
      throw formattedError;
    }
    throw new Error('Network error. Unable to connect to OTP service.');
  }
};

/**
 * Fetch all active sessions for the authenticated user (Module 6).
 * @returns {Promise<Object>} API response payload with sessions list
 */
export const getSessions = async () => {
  const token = localStorage.getItem('digivote_access_token');
  try {
    const response = await apiClient.get('/auth/sessions/', {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
    });
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      const errData = error.response.data;
      const formattedError = new Error(errData.message || 'Failed to fetch active sessions.');
      formattedError.status = error.response.status;
      formattedError.code = errData.code || null;
      throw formattedError;
    }
    throw new Error('Network error. Unable to connect to session service.');
  }
};

/**
 * Revoke a specific session (Module 6).
 * @param {string} sessionId
 * @returns {Promise<Object>} API response payload
 */
export const revokeSession = async (sessionId) => {
  const token = localStorage.getItem('digivote_access_token');
  try {
    const response = await apiClient.delete(`/auth/sessions/${sessionId}/`, {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
    });
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      const errData = error.response.data;
      const formattedError = new Error(errData.message || 'Failed to revoke session.');
      formattedError.status = error.response.status;
      formattedError.code = errData.code || null;
      throw formattedError;
    }
    throw new Error('Network error. Unable to connect to session service.');
  }
};

/**
 * Revoke all sessions with optional keep_current flag (Module 6).
 * @param {boolean} keepCurrent
 * @returns {Promise<Object>} API response payload
 */
export const revokeAllSessions = async (keepCurrent = false) => {
  const token = localStorage.getItem('digivote_access_token');
  try {
    const response = await apiClient.post(
      '/auth/sessions/revoke-all/',
      { keep_current: keepCurrent },
      {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      }
    );
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      const errData = error.response.data;
      const formattedError = new Error(errData.message || 'Failed to revoke sessions.');
      formattedError.status = error.response.status;
      formattedError.code = errData.code || null;
      throw formattedError;
    }
    throw new Error('Network error. Unable to connect to session service.');
  }
};

/**
 * Logout current device session (Module 6).
 * @returns {Promise<Object>} API response payload
 */
export const logout = async () => {
  const token = localStorage.getItem('digivote_access_token');
  const refresh = localStorage.getItem('digivote_refresh_token');
  try {
    const response = await apiClient.post(
      '/auth/logout/',
      { refresh: refresh || '' },
      {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      }
    );
    return response.data;
  } catch (error) {
    // Continue even if backend call fails during logout
    return { success: true };
  } finally {
    localStorage.removeItem('digivote_access_token');
    localStorage.removeItem('digivote_refresh_token');
    localStorage.removeItem('digivote_user');
  }
};

/**
 * Request password reset link (Module 7).
 * @param {string} email
 * @returns {Promise<Object>} API response payload
 */
export const forgotPassword = async (email) => {
  try {
    const response = await apiClient.post('/auth/forgot-password/', { email });
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      const errData = error.response.data;
      const formattedError = new Error(errData.message || 'Password reset request failed.');
      formattedError.status = error.response.status;
      formattedError.code = errData.code || null;
      throw formattedError;
    }
    throw new Error('Network error. Unable to connect to password reset service.');
  }
};

/**
 * Confirm password reset using token and set new password (Module 7).
 * Also revokes all active sessions for security.
 * @param {string} token
 * @param {string} password
 * @param {string} confirmPassword
 * @returns {Promise<Object>} API response payload
 */
export const resetPassword = async (token, password, confirmPassword) => {
  try {
    const response = await apiClient.post('/auth/reset-password/', {
      token,
      password,
      confirm_password: confirmPassword,
      password_confirmation: confirmPassword,
    });
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      const errData = error.response.data;
      const formattedError = new Error(errData.message || 'Password reset failed.');
      formattedError.status = error.response.status;
      formattedError.code = errData.code || null;
      throw formattedError;
    }
    throw new Error('Network error. Unable to reset password.');
  }
};

/**
 * Fetch authenticated voter's security activity logs (Module 7).
 * @returns {Promise<Object>}
 */
export const getSecurityActivity = async () => {
  const token = localStorage.getItem('digivote_access_token');
  try {
    const response = await apiClient.get('/auth/security-activity/', {
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
    });
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      const errData = error.response.data;
      const formattedError = new Error(errData.message || 'Failed to fetch security logs.');
      formattedError.status = error.response.status;
      throw formattedError;
    }
    throw new Error('Network error. Unable to fetch security activity.');
  }
};

export default {
  register,
  login,
  googleLogin,
  verifyEmail,
  resendVerification,
  sendOTP,
  verifyOTP,
  resendOTP,
  getSessions,
  revokeSession,
  revokeAllSessions,
  logout,
  forgotPassword,
  resetPassword,
  getSecurityActivity,
};




