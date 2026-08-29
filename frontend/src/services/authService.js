import api from './api';

export const authService = {
  login: async (email, password) => {
    const res = await api.post('/auth/login/', { username: email, password });
    return res.data;
  },
  
  verifyOTP: async (challenge_id, otp) => {
    const res = await api.post('/auth/verify-otp/', { challenge_id, otp });
    return res.data;
  },

  resendOTP: async (challenge_id) => {
    const res = await api.post('/auth/resend-otp/', { challenge_id });
    return res.data;
  },

  register: async (userData) => {
    // userData contains email, password, password_confirmation, first_name, last_name, mobile_number
    const res = await api.post('/auth/register/', userData);
    return res.data;
  },

  verifyEmail: async (verification_token) => {
    const res = await api.post('/auth/verify-email/', { verification_token });
    return res.data;
  },

  resendEmailVerification: async (email) => {
    const res = await api.post('/auth/resend-verification/', { email });
    return res.data;
  },

  logout: async () => {
    const res = await api.post('/auth/logout/');
    return res.data;
  },

  logoutAll: async () => {
    const res = await api.post('/auth/logout-all/');
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
    const res = await api.post('/auth/reset-password/', { reset_token, password, password_confirmation });
    return res.data;
  },

  changePassword: async (current_password, new_password, new_password_confirmation) => {
    const res = await api.post('/auth/change-password/', { current_password, new_password, new_password_confirmation });
    return res.data;
  },

  googleLogin: async (credential) => {
    const res = await api.post('/auth/google/', { credential });
    return res.data;
  },

  getSessions: async () => {
    const res = await api.get('/auth/sessions/');
    return res.data;
  },

  revokeSession: async (id) => {
    const res = await api.delete(`/auth/sessions/${id}/`);
    return res.data;
  }
};

export default authService;
