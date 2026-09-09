import api from './api';

export const resultsApi = {
  // Certified or live election results
  getResults: async (electionId) => {
    const res = await api.get(`/elections/${electionId}/results/`);
    return res.data;
  },

  // Turnout & participation metrics
  getParticipationReport: async (electionId) => {
    const res = await api.get(`/elections/${electionId}/reports/participation/`);
    return res.data;
  },

  // Candidate slate breakdown report
  getCandidatesReport: async (electionId) => {
    const res = await api.get(`/elections/${electionId}/reports/candidates/`);
    return res.data;
  },

  // Export report as CSV file download
  exportReportCsv: async (electionId) => {
    const res = await api.get(`/elections/${electionId}/reports/export/?format=csv`, {
      responseType: 'blob'
    });
    return res.data;
  },

  // Organizer publish results
  publishResults: async (electionId) => {
    const res = await api.post(`/elections/${electionId}/results/publish/`);
    return res.data;
  },

  // Recalculate tally
  recalculateResults: async (electionId) => {
    const res = await api.post(`/elections/${electionId}/results/recalculate/`);
    return res.data;
  }
};

export default resultsApi;
