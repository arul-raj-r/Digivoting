import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
      formattedError.field = errData.field || null;
      formattedError.errors = errData.errors || null;
      throw formattedError;
    }
    throw new Error('Network error. Unable to connect to the registration service.');
  }
};

/**
 * Stub helper for Module 4 (Email Verification resend).
 * @param {string} email
 */
export const resendVerification = async (email) => {
  try {
    const response = await apiClient.post('/auth/resend-verification/', { email });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to resend verification email.');
  }
};

export default {
  register,
  resendVerification,
};
