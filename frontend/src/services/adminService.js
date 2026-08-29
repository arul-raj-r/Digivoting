import api from './api';

export const adminService = {
  getDashboardMetrics: async () => {
    const res = await api.get('/admin/metrics/');
    return res.data;
  },

  getVotersList: async (params) => {
    const res = await api.get('/admin/voters/', { params });
    return res.data;
  },

  getElectionsList: async () => {
    const res = await api.get('/admin/elections/');
    return res.data;
  },

  getCandidatesList: async () => {
    const res = await api.get('/admin/candidates/');
    return res.data;
  },

  createElection: async (electionData) => {
    const res = await api.post('/admin/elections/', electionData);
    return res.data;
  },

  createCandidate: async (candidateData) => {
    const res = await api.post('/admin/candidates/', candidateData);
    return res.data;
  },

  verifyVoter: async (voterId) => {
    const res = await api.post(`/admin/voters/${voterId}/verify/`);
    return res.data;
  },

  suspendVoter: async (voterId) => {
    const res = await api.post(`/admin/voters/${voterId}/suspend/`);
    return res.data;
  },

  getElectionResults: async (electionId) => {
    const res = await api.get(`/admin/elections/${electionId}/results/`);
    return res.data;
  },

  toggleResultsPublish: async (electionId, isPublic) => {
    const res = await api.post(`/admin/elections/${electionId}/results/publish/`, { is_public: isPublic });
    return res.data;
  },

  getAuditLogs: async () => {
    const res = await api.get('/admin/audit-logs/');
    return res.data;
  },

  getSecurityAlerts: async () => {
    const res = await api.get('/admin/security-alerts/');
    return res.data;
  },
};
export default adminService;
