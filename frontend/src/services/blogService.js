import api from './api'; // same instance you use elsewhere

const BlogService = {
    create: (formData) => api.post('/blogs/create', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),
    getApproved: () => api.get('/blogs/approved'),
    getMy: () => api.get('/blogs/my'),
    getById: (id) => api.get(`/blogs/${id}`),
    like: (id) => api.post(`/blogs/${id}/like`),
    comment: (id, payload) => api.post(`/blogs/${id}/comment`, payload),
    delete: (id) => api.delete(`/blogs/${id}`),
    claimPoints: (id) => api.post(`/blogs/${id}/claim-points`),
    update: (id, formData) => api.put(`/blogs/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),

    // admin
    getPending: () => api.get('/blogs/admin/pending'),
    approve: (id) => api.post(`/blogs/admin/${id}/approve`),
    reject: (id, reason) => api.post(`/blogs/admin/${id}/reject`, { reason }),
    requestChanges: (id, reason) => api.post(`/blogs/admin/${id}/request-changes`, { reason })
};

export default BlogService;
