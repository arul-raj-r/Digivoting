import api from './api';

export const verificationService = {
  verifyFace: async (videoStream) => {
    // In later phases, we will capture a Blob from the stream and upload it
    const formData = new FormData();
    formData.append('capture', 'liveness-blob');
    const res = await api.post('/verification/face/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  registerWebAuthn: async () => {
    const res = await api.post('/verification/biometric/register/');
    return res.data;
  },

  authenticateWebAuthn: async () => {
    const res = await api.post('/verification/biometric/authenticate/');
    return res.data;
  },
};
export default verificationService;
