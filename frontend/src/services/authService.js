import api from './api';

export const authService = {
  login: async (email, password) => {
    const res = await api.post('/auth/login/', { email, username: email, password });
    return res.data;
  },
  
  verifyOTP: async (challenge_id, otp) => {
    const res = await api.post('/auth/verify-otp/', {
      challenge_id,
      otp,
      pre_auth_token: challenge_id,
      otp_code: otp,
    });
    return res.data;
  },

  resendOTP: async (challenge_id) => {
    const res = await api.post('/auth/resend-otp/', {
      challenge_id,
      pre_auth_token: challenge_id,
    });
    return res.data;
  },

  register: async (userData) => {
    const res = await api.post('/auth/register/', userData);
    return res.data;
  },

  verifyEmail: async (verification_token) => {
    const res = await api.post('/auth/verify-email/', {
      verification_token,
      token: verification_token,
    });
    return res.data;
  },

  resendEmailVerification: async (email) => {
    const res = await api.post('/auth/resend-verification/', { email });
    return res.data;
  },

  logout: async () => {
    const refresh = localStorage.getItem('digivote_refresh_token');
    const res = await api.post('/auth/logout/', { refresh: refresh || '' });
    return res.data;
  },

  logoutAll: async () => {
    const res = await api.post('/auth/sessions/revoke-all/', { keep_current: false });
    return res.data;
  },

  getCurrentUser: async () => {
    const res = await api.get('/auth/me/');
    return res.data;
  },

  forgotPassword: async (email) => {
    const res = await api.post('/auth/forgot-password/', { email });
    return res.data;
  },

  resetPassword: async (reset_token, password, password_confirmation) => {
    const res = await api.post('/auth/reset-password/', {
      token: reset_token,
      reset_token,
      password,
      confirm_password: password_confirmation,
      password_confirmation,
    });
    return res.data;
  },

  changePassword: async (current_password, new_password, new_password_confirmation) => {
    const res = await api.post('/auth/change-password/', {
      current_password,
      new_password,
      new_password_confirmation,
      confirm_password: new_password_confirmation,
    });
    return res.data;
  },

  googleLogin: async (credential) => {
    const tokenStr = typeof credential === 'object' && credential !== null
      ? (credential.credential || credential.id_token || credential)
      : credential;
    const res = await api.post('/auth/google/', {
      credential: tokenStr,
      id_token: tokenStr,
    });
    return res.data;
  },

  getSessions: async () => {
    const res = await api.get('/auth/sessions/');
    return res.data;
  },

  revokeSession: async (id) => {
    const res = await api.delete(`/auth/sessions/${id}/`);
    return res.data;
  },

  getSecurityActivity: async () => {
    const res = await api.get('/auth/security-activity/');
    return res.data;
  }
};

export default authService;
