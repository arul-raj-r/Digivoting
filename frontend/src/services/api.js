import axios from 'axios';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Crucial for secure HttpOnly cookie storage
  headers: {
    'Content-Type': 'application/json',
  },
});

// Configure global interceptors for clean error translations and data unpacking
api.interceptors.response.use(
  (response) => {
    // Transparently unpack the API wrapper if present
    if (response.data && response.data.success === true && response.data.hasOwnProperty('data')) {
      response.data = response.data.data;
    }
    return response;
  },
  (error) => {
    if (error.response) {
      const status = error.response.status;
      
      // Attempt to extract the backend wrapped error payload
      if (error.response.data && error.response.data.success === false && error.response.data.error) {
        error.message = error.response.data.error.message || error.message;
        error.code = error.response.data.error.code;
        error.response.data.message = error.response.data.error.message;
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
    }
    return Promise.reject(error);
  }
);

export default api;
