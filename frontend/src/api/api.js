import axios from 'axios';

const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8000/api';

if (!API_BASE_URL) {
  throw new Error('VITE_API_URL is not configured');
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach bearer token if present in localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('digivote_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor: data unpacking and structured error translation
api.interceptors.response.use(
  (response) => {
    // Transparently unpack the API wrapper if present
    if (response.data && response.data.success === true && Object.prototype.hasOwnProperty.call(response.data, 'data')) {
      response.data = response.data.data;
    }
    return response;
  },
  (error) => {
    console.error('[DigiVote API] Request failed:', {
      url: error.config?.url,
      baseURL: error.config?.baseURL,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      hasRequest: !!error.request,
      message: error.message,
    });

    if (error.response) {
      const status = error.response.status;

      // Extract backend wrapped error payload if present
      if (error.response.data) {
        if (error.response.data.code) {
          error.code = error.response.data.code;
        }
        if (error.response.data.action) {
          error.action = error.response.data.action;
        }
        if (error.response.data.field) {
          error.field = error.response.data.field;
        }

        if (error.response.data.success === false) {
          if (error.response.data.error) {
            error.message = error.response.data.error.message || error.message;
            error.code = error.response.data.error.code || error.code;
            error.action = error.response.data.error.action || error.action;
            error.response.data.message = error.response.data.error.message;
          } else if (error.response.data.message) {
            error.message = error.response.data.message;
          }
        }
      }

      switch (status) {
        case 401:
          console.warn('Session unauthorized. Requires authentication clearance.');
          break;
        case 403:
          console.error('Forbidden action. Administrative credentials required.');
          break;
        case 429:
          console.error('Too many requests. Rate limit throttle applied.');
          break;
        case 500:
          console.error('Internal server error. Database interrupts on backend.');
          break;
        default:
          break;
      }
    } else if (error.request) {
      // Server unreachable / network issue
      console.error('DigiVote API Network Error: Unable to reach backend server at', API_BASE_URL, error.message);
      error.message = 'Unable to connect to the DigiVote server. Please try again.';
    }

    return Promise.reject(error);
  }
);

export default api;
