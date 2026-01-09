import api from './api';

export const login = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};

export const register = async (userData) => {
  try {
    console.log('Sending registration request:', { ...userData, password: '[REDACTED]' });
    const response = await api.post('/auth/register', userData);
    console.log('Registration response:', { ...response.data, token: '[REDACTED]' });
    return response.data;
  } catch (err) {
    console.error('Registration error:', {
      status: err.response?.status,
      statusText: err.response?.statusText,
      data: err.response?.data,
      message: err.message
    });
    throw err;
  }
};

export const requestPasswordReset = async (email) => {
  const response = await api.post('/auth/forgot-password', { email });
  return response.data;
};

export const resetPassword = async ({ userId, token, password }) => {
  const response = await api.post('/auth/reset-password', { userId, token, password });
  return response.data;
};
