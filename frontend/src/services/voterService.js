import api from './api';

export const voterService = {
  getVoterStatus: async () => {
    const res = await api.get('/voter/status/');
    return res.data;
  },

  getSecurityActivity: async () => {
    const res = await api.get('/voter/security-logs/');
    return res.data;
  },
};
export default voterService;
