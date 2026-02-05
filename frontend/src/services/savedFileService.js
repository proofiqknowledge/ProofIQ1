import api from './api';

const API_URL = '/saved-files';

export const getSavedFiles = async () => {
    const response = await api.get(API_URL);
    return response.data;
};

export const saveFile = async (data) => {
    const response = await api.post(`${API_URL}/save`, data);
    return response.data;
};

export const deleteFile = async (id) => {
    const response = await api.delete(`${API_URL}/${id}`);
    return response.data;
};
