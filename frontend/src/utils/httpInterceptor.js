import axios from 'axios';
import api from '../api/api';

let isInterceptorAttached = false;

/**
 * Setup global Axios and central API interceptors for handling 401 Unauthorized errors
 * due to revoked/expired sessions (Module 6).
 */
export function setupHttpInterceptors(navigate) {
  if (isInterceptorAttached) return;
  isInterceptorAttached = true;

  const handler = (error) => {
    if (error.response?.status === 401) {
      const errCode = error.response.data?.code;
      if (errCode === 'SESSION_REVOKED' || errCode === 'SESSION_EXPIRED' || errCode === 'SESSION_NOT_FOUND') {
        // Clear all local session tokens
        localStorage.removeItem('digivote_access_token');
        localStorage.removeItem('digivote_refresh_token');
        localStorage.removeItem('digivote_user');

        // Notify user and redirect to login
        if (navigate) {
          navigate('/login', {
            state: { error: 'Your session has been logged out or revoked. Please sign in again.' },
            replace: true,
          });
        } else {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  };

  // Attach to both default axios and central api instance
  axios.interceptors.response.use((response) => response, handler);
  api.interceptors.response.use((response) => response, handler);
}

export default setupHttpInterceptors;
