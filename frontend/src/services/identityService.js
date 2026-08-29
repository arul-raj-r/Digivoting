import api from './api';

export const identityService = {
  verifyAadhaar: async () => {
    const res = await api.post('/identity/aadhaar/');
    return res.data;
  },

  getDigiLockerUrl: async () => {
    const res = await api.get('/identity/digilocker/url/');
    return res.data.url;
  },

  completeDigiLockerAuth: async (code, state) => {
    const res = await api.post('/identity/digilocker/callback/', { code, state });
    return res.data;
  },

  verifyVoterId: async (epicNumber) => {
    const res = await api.post('/identity/voter-id/', { epic_number: epicNumber });
    return res.data;
  },
};
export default identityService;
