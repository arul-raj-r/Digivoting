import api from './api';

export const verificationApi = {
  // Check election eligibility & verification requirements for current logged-in voter
  getEligibility: async (electionId) => {
    const res = await api.get(`/voter/elections/${electionId}/eligibility/`);
    return res.data;
  },

  // Request Email OTP challenge for voting authorization
  requestOtp: async (electionId) => {
    const res = await api.post(`/voter/elections/${electionId}/otp/`, {
      action: 'request'
    });
    return res.data;
  },

  // Verify entered 6-digit Email OTP
  verifyOtp: async (electionId, otpCode, challengeId) => {
    const res = await api.post(`/voter/elections/${electionId}/otp/`, {
      action: 'verify',
      otp_code: otpCode,
      challenge_id: challengeId
    });
    return res.data;
  },

  // Verify live webcam snapshot using Deep Neural Network (YuNet + SFace ArcFace)
  verifyFace: async (electionId, imageBase64) => {
    const res = await api.post(`/voter/elections/${electionId}/face-verification/`, {
      image: imageBase64
    });
    return res.data;
  },

  // Request cryptographically secure single-use 15-minute voting authorization token
  getVotingAuthorization: async (electionId) => {
    const res = await api.post(`/voter/elections/${electionId}/authorization/`);
    return res.data;
  }
};

export default verificationApi;
