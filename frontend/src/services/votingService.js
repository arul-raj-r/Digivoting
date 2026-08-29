import api from './api';

export const votingService = {
  castVote: async (electionId, candidateId, authPayload) => {
    const res = await api.post(`/elections/${electionId}/vote/`, {
      candidate_id: candidateId,
      auth_payload: authPayload,
    });
    return res.data;
  },
};
export default votingService;
