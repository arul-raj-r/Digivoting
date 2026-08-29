import api from './api';

export const notificationService = {
  getNotifications: async () => {
    const res = await api.get('/notifications/');
    return res.data;
  },
};
export default notificationService;
