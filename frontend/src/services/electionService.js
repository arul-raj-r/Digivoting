import api from './api';

export const electionService = {
  getActiveElections: async () => {
    const res = await api.get('/elections/active/');
    return res.data;
  },

  getUpcomingElections: async () => {
    const res = await api.get('/elections/upcoming/');
    return res.data;
  },

  getCompletedElections: async () => {
    const res = await api.get('/elections/completed/');
    return res.data;
  },

  getElectionById: async (id) => {
    const res = await api.get(`/elections/${id}/`);
    return res.data;
  },

  getElectionResults: async (id) => {
    const res = await api.get(`/elections/${id}/results/`);
    return res.data;
  },
};
export default electionService;
