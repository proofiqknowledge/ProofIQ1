import api from './api';

// Get all users
export const getAllUsers = async () => {
  const res = await api.get('/users');
  return res.data;
};

export const fetchUserDashboard = async () => {
  try {
    console.log('Fetching user dashboard...');
    const res = await api.get('/users/dashboard');
    console.log('Dashboard response:', res);
    return res.data;
  } catch (err) {
    console.error('Dashboard fetch error:', err.response || err);
    throw err;
  }
};

export const fetchAdminUserDashboard = async (userId) => {
  try {
    console.log('Fetching admin dashboard for user:', userId);
    const res = await api.get(`/users/admin/${userId}/dashboard`);
    console.log('Admin dashboard response:', res);
    return res.data;
  } catch (err) {
    console.error('Admin dashboard fetch error:', err.response || err);
    throw err;
  }
};

export const bulkUploadUsers = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const res = await api.post('/users/bulk-upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return res.data;
};

// Create single user
export const createSingleUser = async (userData) => {
  console.log('Creating user with data:', userData);
  const response = await api.post('/users/create', userData);
  console.log('Create user response:', response.data);
  return response.data;
};
export const getLeaderboard = async (top) => {
  const url = top ? `/leaderboard?top=${top}` : '/leaderboard';
  const res = await api.get(url);
  console.log('Leaderboard response:', res.data);
  return Array.isArray(res.data) ? res.data : res.data.users || [];
};

export const updateUser = async (userId, userData) => {
  const res = await api.put(`/users/${userId}`, userData);
  return res.data;
};

export const blockUser = async (userId) => {
  const res = await api.patch(`/users/${userId}/block`);
  return res.data;
};

export const unblockUser = async (userId) => {
  const res = await api.patch(`/users/${userId}/unblock`);
  return res.data;
};
