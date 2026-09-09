import api from '../services/api';

/**
 * Election Creation Module (Module 8) API service
 */
export const electionsApi = {
  /**
   * Create a new election with draft status
   * @param {Object} data { title, description, election_type }
   */
  createElection: async (data) => {
    const res = await api.post('/elections/', data);
    return res.data;
  },

  /**
   * Get all elections created by current user (or all if staff/admin)
   */
  getElections: async () => {
    const res = await api.get('/elections/');
    return res.data;
  },

  /**
   * Get overview of elections for the voter dashboard
   */
  getVoterOverview: async () => {
    const res = await api.get('/elections/voter-overview/');
    return res.data;
  },

  /**
   * Get single election details by ID
   * @param {string} id
   */
  getElection: async (id) => {
    const res = await api.get(`/elections/${id}/`);
    return res.data;
  },

  /**
   * Update election title, description, or type while in draft status
   * @param {string} id
   * @param {Object} data { title, description, election_type }
   */
  updateElection: async (id, data) => {
    const res = await api.patch(`/elections/${id}/`, data);
    return res.data;
  },

  /**
   * Delete a draft election
   * @param {string} id
   */
  deleteElection: async (id) => {
    const res = await api.delete(`/elections/${id}/`);
    return res.data;
  },

  /**
   * Module 9: Transition election status from 'draft' to 'configured'
   * @param {string} id
   */
  markElectionConfigured: async (id) => {
    const res = await api.patch(`/elections/${id}/`, { status: 'configured' });
    return res.data;
  },

  // ==========================================
  // VOTER CONFIGURATION (MODULE 9)
  // ==========================================

  /**
   * Get eligible voters for an election with optional search and filter
   * @param {string} electionId
   * @param {Object} params { search, has_voted }
   */
  getEligibleVoters: async (electionId, params = {}) => {
    const res = await api.get(`/elections/${electionId}/voters/`, { params });
    return res.data;
  },

  /**
   * Add a single eligible voter by email
   * @param {string} electionId
   * @param {Object} data { email }
   */
  addEligibleVoter: async (electionId, data) => {
    const res = await api.post(`/elections/${electionId}/voters/`, data);
    return res.data;
  },

  /**
   * Bulk upload eligible voters via CSV
   * @param {string} electionId
   * @param {FormData} formData with 'file' key
   */
  bulkUploadVoters: async (electionId, formData) => {
    const res = await api.post(`/elections/${electionId}/voters/bulk-upload/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  /**
   * Remove an eligible voter from the election roll
   * @param {string} electionId
   * @param {string} voterId
   */
  deleteEligibleVoter: async (electionId, voterId) => {
    const res = await api.delete(`/elections/${electionId}/voters/${voterId}/`);
    return res.data;
  },

  // ==========================================
  // CANDIDATE CONFIGURATION (MODULE 9)
  // ==========================================

  /**
   * Get candidates for an election ordered by display_order
   * @param {string} electionId
   */
  getCandidates: async (electionId) => {
    const res = await api.get(`/elections/${electionId}/candidates/`);
    return res.data;
  },

  /**
   * Add a new candidate with optional photo upload
   * @param {string} electionId
   * @param {FormData|Object} data
   */
  createCandidate: async (electionId, data) => {
    const isFormData = data instanceof FormData;
    const res = await api.post(`/elections/${electionId}/candidates/`, data, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {},
    });
    return res.data;
  },

  /**
   * Update candidate details or photo
   * @param {string} electionId
   * @param {string} candidateId
   * @param {FormData|Object} data
   */
  updateCandidate: async (electionId, candidateId, data) => {
    const isFormData = data instanceof FormData;
    const res = await api.patch(`/elections/${electionId}/candidates/${candidateId}/`, data, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {},
    });
    return res.data;
  },

  /**
   * Remove a candidate from the election
   * @param {string} electionId
   * @param {string} candidateId
   */
  deleteCandidate: async (electionId, candidateId) => {
    const res = await api.delete(`/elections/${electionId}/candidates/${candidateId}/`);
    return res.data;
  },

  /**
   * Atomic reorder of candidate display order
   * @param {string} electionId
   * @param {string[]} candidateIds Ordered array of candidate UUIDs
   */
  reorderCandidates: async (electionId, candidateIds) => {
    const res = await api.post(`/elections/${electionId}/candidates/reorder/`, {
      candidate_ids: candidateIds,
    });
    return res.data;
  },

  // =========================================================================
  // MODULE 10: VERIFICATION SETUP & SCHEDULE/RULES
  // =========================================================================

  /**
   * Fetch election verification requirements
   * @param {string} electionId
   */
  getVerificationConfig: async (electionId) => {
    const res = await api.get(`/elections/${electionId}/verification-config/`);
    return res.data;
  },

  /**
   * Update election verification requirements
   * @param {string} electionId
   * @param {Object} data { require_email_otp, require_webcam_verification, require_biometric_verification }
   */
  updateVerificationConfig: async (electionId, data) => {
    const res = await api.patch(`/elections/${electionId}/verification-config/`, data);
    return res.data;
  },

  /**
   * Fetch election rules and result visibility config
   * @param {string} electionId
   */
  getElectionRules: async (electionId) => {
    const res = await api.get(`/elections/${electionId}/rules/`);
    return res.data;
  },

  /**
   * Update election rules and result visibility config
   * @param {string} electionId
   * @param {Object} data { results_visibility, results_visible_at, allow_vote_change }
   */
  updateElectionRules: async (electionId, data) => {
    const res = await api.patch(`/elections/${electionId}/rules/`, data);
    return res.data;
  },

  /**
   * Set start/end datetime and transition election status to 'scheduled'
   * @param {string} electionId
   * @param {Object} data { start_datetime, end_datetime, status: 'scheduled' }
   */
  scheduleElection: async (electionId, data) => {
    const res = await api.patch(`/elections/${electionId}/`, {
      ...data,
      status: 'scheduled',
    });
    return res.data;
  },

  // =========================================================================
  // MODULE 11: START/STOP CONTROL, MONITORING & AUDIT LOGS
  // =========================================================================

  /**
   * Manual start control (scheduled -> active)
   * @param {string} electionId
   * @param {Object} data { force: boolean }
   */
  startElection: async (electionId, data = {}) => {
    const res = await api.post(`/elections/${electionId}/start/`, data);
    return res.data;
  },

  /**
   * Pause active election (active -> paused)
   * @param {string} electionId
   */
  pauseElection: async (electionId) => {
    const res = await api.post(`/elections/${electionId}/pause/`);
    return res.data;
  },

  /**
   * Resume paused election (paused -> active)
   * @param {string} electionId
   */
  resumeElection: async (electionId) => {
    const res = await api.post(`/elections/${electionId}/resume/`);
    return res.data;
  },

  /**
   * Complete election (active/paused -> completed) and calculate official results
   * @param {string} electionId
   */
  completeElection: async (electionId) => {
    const res = await api.post(`/elections/${electionId}/complete/`);
    return res.data;
  },

  /**
   * Emergency stop control (active -> cancelled)
   * @param {string} electionId
   * @param {Object} data { reason: string }
   */
  stopElection: async (electionId, data) => {
    const res = await api.post(`/elections/${electionId}/stop/`, data);
    return res.data;
  },

  /**
   * Fetch audit logs for an election
   * @param {string} electionId
   * @param {Object} params { action, date_from, date_to }
   */
  getElectionAuditLogs: async (electionId, params = {}) => {
    const res = await api.get(`/elections/${electionId}/audit-logs/`, { params });
    return res.data;
  },

  /**
   * Fetch live turnout monitoring aggregate stats
   * @param {string} electionId
   */
  getElectionMonitoring: async (electionId) => {
    const res = await api.get(`/elections/${electionId}/monitoring/`);
    return res.data;
  },
};

export default electionsApi;
