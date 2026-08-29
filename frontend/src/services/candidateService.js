import api from './api';

export const candidateService = {
  getCandidatesByElection: async (electionId) => {
    const res = await api.get(`/elections/${electionId}/candidates/`);
    return res.data;
  },
};
export default candidateService;
