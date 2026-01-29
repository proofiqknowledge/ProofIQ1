import api from './api';

export const submitCodingExam = async (payload) => {
  const res = await api.post('/results/submit', payload);
  return res.data;
};

export default {
  submitCodingExam,
};
