import api from './api';

export const voterApi = {
  // Get all eligible voters for an election
  getEligibleVoters: async (electionId) => {
    const res = await api.get(`/elections/${electionId}/voters/`);
    return res.data;
  },

  // Add single eligible voter to election roll
  addEligibleVoter: async (electionId, voterData) => {
    const res = await api.post(`/elections/${electionId}/voters/`, voterData);
    return res.data;
  },

  // Bulk upload voter roll (CSV/Excel)
  bulkUploadVoters: async (electionId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post(`/elections/${electionId}/voters/bulk-upload/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },

  // Remove voter from election roll
  removeEligibleVoter: async (electionId, voterId) => {
    const res = await api.delete(`/elections/${electionId}/voters/${voterId}/`);
    return res.data;
  },

  // Get voter's own profile and active verification audits
  getMyProfile: async () => {
    const res = await api.get('/voters/profile/');
    return res.data;
  },

  // Get voter's verification status
  getVerificationStatus: async () => {
    const res = await api.get('/voters/verification-status/');
    return res.data;
  }
};

export default voterApi;
