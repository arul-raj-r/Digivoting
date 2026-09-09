import api from '../services/api';

/**
 * Voting, Verification, Results & Reports API service (DigiVote)
 */
export const votingApi = {
  // ==========================================
  // VOTER VERIFICATION FLOW (MODULE 2)
  // ==========================================

  /**
   * Check voter eligibility, election status, and verification requirements
   * @param {string} electionId
   */
  getEligibility: async (electionId) => {
    const res = await api.get(`/voter/elections/${electionId}/eligibility/`);
    return res.data;
  },

  /**
   * Request Email OTP challenge for voting
   * @param {string} electionId
   */
  requestOtp: async (electionId) => {
    const res = await api.post(`/voter/elections/${electionId}/otp/`, {
      action: 'request',
    });
    return res.data;
  },

  /**
   * Verify entered 6-digit Email OTP
   * @param {string} electionId
   * @param {string} otpCode
   * @param {string} challengeId
   */
  verifyOtp: async (electionId, otpCode, challengeId) => {
    const res = await api.post(`/voter/elections/${electionId}/otp/`, {
      action: 'verify',
      otp_code: otpCode,
      challenge_id: challengeId,
    });
    return res.data;
  },

  /**
   * Verify voter webcam face snapshot using deep neural network (YuNet + SFace)
   * @param {string} electionId
   * @param {string} imageBase64
   */
  verifyFace: async (electionId, imageBase64) => {
    const res = await api.post(`/voter/elections/${electionId}/face-verification/`, {
      image: imageBase64,
    });
    return res.data;
  },

  /**
   * Request one-time single-use voting authorization token after all verifications pass
   * @param {string} electionId
   */
  getAuthorization: async (electionId) => {
    const res = await api.post(`/voter/elections/${electionId}/authorization/`);
    return res.data;
  },

  /**
   * Get voter's assigned elections overview
   */
  getVoterElections: async () => {
    const res = await api.get('/voter/elections/');
    return res.data;
  },

  // ==========================================
  // VOTING BOOTH (MODULE 3)
  // ==========================================

  /**
   * Load ballot for an active election (checks eligibility & returns candidates)
   * @param {string} electionId
   */
  getBallot: async (electionId) => {
    const res = await api.get(`/elections/${electionId}/ballot/`);
    return res.data;
  },

  /**
   * Request a single-use confirmation token for a selected candidate
   * @param {string} electionId
   * @param {string} candidateId
   */
  confirmBallot: async (electionId, candidateId) => {
    const res = await api.post(`/elections/${electionId}/ballot/confirm/`, {
      candidate_id: candidateId,
    });
    return res.data;
  },

  /**
   * Submit and encrypt final ballot choice inside atomic transaction
   * @param {string} electionId
   * @param {string} candidateId
   * @param {string} confirmationToken
   */
  submitBallot: async (electionId, candidateId, confirmationToken) => {
    const res = await api.post(`/elections/${electionId}/ballot/submit/`, {
      candidate_id: candidateId,
      confirmation_token: confirmationToken,
    });
    return res.data;
  },

  // ==========================================
  // RESULTS & REPORTS (MODULE 4)
  // ==========================================

  /**
   * Get election results (preview mode for creator, public view if completed & published)
   * @param {string} electionId
   */
  getResults: async (electionId) => {
    const res = await api.get(`/elections/${electionId}/results/`);
    return res.data;
  },

  /**
   * Calculate / recompute tally results (creator only)
   * @param {string} electionId
   */
  generateResults: async (electionId) => {
    const res = await api.post(`/results/${electionId}/generate/`);
    return res.data;
  },

  /**
   * Manually publish results (owner-only, results_visibility='manual')
   * @param {string} electionId
   */
  publishResults: async (electionId) => {
    const res = await api.post(`/elections/${electionId}/results/publish/`);
    return res.data;
  },

  /**
   * Unpublish results (owner-only)
   * @param {string} electionId
   */
  unpublishResults: async (electionId) => {
    const res = await api.post(`/results/${electionId}/unpublish/`);
    return res.data;
  },

  /**
   * Get participation turnout report (owner-only)
   * @param {string} electionId
   */
  getParticipationReport: async (electionId) => {
    const res = await api.get(`/elections/${electionId}/reports/participation/`);
    return res.data;
  },

  /**
   * Get candidates configuration report (owner-only)
   * @param {string} electionId
   */
  getCandidatesReport: async (electionId) => {
    const res = await api.get(`/elections/${electionId}/reports/candidates/`);
    return res.data;
  },

  /**
   * Download results CSV report (owner-only)
   * @param {string} electionId
   */
  downloadResultsCsv: async (electionId) => {
    const res = await api.get(`/elections/${electionId}/reports/export/?format=csv`, {
      responseType: 'blob',
    });
    const blob = new Blob([res.data], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `election_results_${electionId}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  /**
   * Open or download official printable PDF election report
   * @param {string} electionId
   */
  openResultsPdf: async (electionId) => {
    const res = await api.get(`/elections/${electionId}/reports/export/?format=pdf`, {
      responseType: 'text',
    });
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(res.data);
      printWindow.document.close();
    }
  },
};

export default votingApi;
