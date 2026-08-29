import api from './api';

export const receiptService = {
  getReceiptById: async (id) => {
    const res = await api.get(`/receipts/${id}/`);
    return res.data;
  },

  verifyReceipt: async (reference) => {
    const res = await api.post('/receipts/verify/', { reference });
    return res.data;
  },
};
export default receiptService;
