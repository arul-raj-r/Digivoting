import api from './api';

export const electionApi = {
  // Fetch active/all elections
  getElections: async () => {
    const res = await api.get('/elections/');
    return res.data;
  },

  // Voter-specific election overview (with eligibility, voting status, lock status)
  getVoterOverview: async () => {
    const res = await api.get('/elections/voter-overview/');
    return res.data;
  },

  // Voter-specific eligible elections list with verification config
  getVoterEligibleElections: async () => {
    const res = await api.get('/voter/elections/');
    return res.data;
  },

  // Admin / Organizer summary
  getAdminSummary: async () => {
    const res = await api.get('/elections/admin-summary/');
    return res.data;
  },

  // Single election details
  getElection: async (id) => {
    const res = await api.get(`/elections/${id}/`);
    return res.data;
  },

  // Create election in draft
  createElection: async (data) => {
    const res = await api.post('/elections/', data);
    return res.data;
  },

  // Update election (allowed only before lock/start)
  updateElection: async (id, data) => {
    const res = await api.patch(`/elections/${id}/`, data);
    return res.data;
  },

  // Delete election
  deleteElection: async (id) => {
    const res = await api.delete(`/elections/${id}/`);
    return res.data;
  },

  // Lifecycle state controls
  startElection: async (id) => {
    const res = await api.post(`/elections/${id}/start/`);
    return res.data;
  },

  pauseElection: async (id) => {
    const res = await api.post(`/elections/${id}/pause/`);
    return res.data;
  },

  resumeElection: async (id) => {
    const res = await api.post(`/elections/${id}/resume/`);
    return res.data;
  },

  completeElection: async (id) => {
    const res = await api.post(`/elections/${id}/complete/`);
    return res.data;
  },

  stopElection: async (id, reason = '') => {
    const res = await api.post(`/elections/${id}/stop/`, { reason });
    return res.data;
  },

  // Live monitoring metrics
  getMonitoring: async (id) => {
    const res = await api.get(`/elections/${id}/monitoring/`);
    return res.data;
  },

  // Audit trail logs
  getAuditLogs: async (id) => {
    const res = await api.get(`/elections/${id}/audit-logs/`);
    return res.data;
  },

  // Candidates for this election
  getCandidates: async (id) => {
    const res = await api.get(`/elections/${id}/candidates/`);
    return res.data;
  },

  addCandidate: async (id, formData) => {
    const headers = formData instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {};
    const res = await api.post(`/elections/${id}/candidates/`, formData, { headers });
    return res.data;
  },

  deleteCandidate: async (electionId, candidateId) => {
    const res = await api.delete(`/elections/${electionId}/candidates/${candidateId}/`);
    return res.data;
  },

  // Verification configuration
  getVerificationConfig: async (id) => {
    const res = await api.get(`/elections/${id}/verification-config/`);
    return res.data;
  },

  updateVerificationConfig: async (id, data) => {
    const res = await api.put(`/elections/${id}/verification-config/`, data);
    return res.data;
  },

  // Schedule & rules
  getRules: async (id) => {
    const res = await api.get(`/elections/${id}/rules/`);
    return res.data;
  },

  updateRules: async (id, data) => {
    const res = await api.put(`/elections/${id}/rules/`, data);
    return res.data;
  }
};

export default electionApi;
