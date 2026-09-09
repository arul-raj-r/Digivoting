import api from './api';

export const votingApi = {
  // Get ballot candidates for voter
  getBallotCandidates: async (electionId) => {
    const res = await api.get(`/voting/${electionId}/candidates/`);
    return res.data;
  },

  // Confirm authorization token and candidate choice before casting ballot
  confirmBallot: async (electionId, authorizationToken, candidateId) => {
    const res = await api.post(`/voting/${electionId}/confirm/`, {
      authorization_token: authorizationToken,
      candidate_id: candidateId
    });
    return res.data;
  },

  // Cast anonymous encrypted ballot returning digital receipt
  castBallot: async (electionId, confirmationToken, candidateId) => {
    const res = await api.post(`/voting/${electionId}/submit/`, {
      confirmation_token: confirmationToken,
      candidate_id: candidateId
    });
    return res.data;
  }
};

export default votingApi;
