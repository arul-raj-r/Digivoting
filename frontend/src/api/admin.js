import api from './api';

const apiClient = api;


/**
 * Fetch centralized security events and summary stats (admin-only).
 * @param {Object} params - { event_type, email }
 * @returns {Promise<Object>}
 */
export const getSecurityEvents = async (params = {}) => {
  const token = localStorage.getItem('digivote_access_token');
  try {
    const response = await apiClient.get('/auth/admin/security-events/', {
      params,
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
    });
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      const errData = error.response.data;
      const formattedError = new Error(errData.message || 'Failed to fetch security events.');
      formattedError.status = error.response.status;
      throw formattedError;
    }
    throw new Error('Network error. Unable to reach security audit service.');
  }
};

/**
 * Manually unlock a locked citizen account (admin-only).
 * @param {string} userId
 * @returns {Promise<Object>}
 */
export const unlockUser = async (userId) => {
  const token = localStorage.getItem('digivote_access_token');
  try {
    const response = await apiClient.post(
      `/auth/admin/users/${userId}/unlock/`,
      {},
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
      const formattedError = new Error(errData.message || 'Failed to unlock user.');
      formattedError.status = error.response.status;
      throw formattedError;
    }
    throw new Error('Network error. Unable to reach admin unlock service.');
  }
};

export default {
  getSecurityEvents,
  unlockUser,
};
