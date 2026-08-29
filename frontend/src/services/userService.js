import api from './api';

export const userService = {
  updateProfile: async (profileData) => {
    const res = await api.put('/users/profile/', profileData);
    return res.data;
  },

  changePassword: async (passwordData) => {
    const res = await api.post('/users/change-password/', passwordData);
    return res.data;
  },
};
export default userService;
