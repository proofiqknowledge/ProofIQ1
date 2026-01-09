import { useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { setUsers } from '../redux/slices/userSlice';
import api from '../services/api';

export const useUserManagement = (token) => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userDetail, setUserDetail] = useState(null);
  const [userLoading, setUserLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('fetchUsers response:', response.data);
      
      if (!Array.isArray(response.data)) {
        throw new Error('Invalid response format: expected array');
      }  // ✅ ADDED MISSING BRACE
      
      dispatch(setUsers(response.data));
      setError('');
    } catch (err) {
      console.error('fetchUsers error:', err);
      setError(err.response?.data?.message || 'Could not fetch users');
      dispatch(setUsers([]));  // ✅ Dispatch empty array on error
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token, dispatch]);

  const fetchUserDetails = useCallback(async (id) => {
    setUserLoading(true);
    setUserDetail(null);
    try {
      const response = await api.get(`/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserDetail(response.data);
      setError('');
    } catch (err) {
      console.error('fetchUserDetails error:', err);
      setError('Error fetching user details');
      setUserDetail({ 
        user: null, 
        courseStats: [], 
        exams: [], 
        error: 'Error fetching details' 
      });
    } finally {
      setUserLoading(false);
    }
  }, [token]);

  const generateUserCertificate = useCallback(async (userId, courseId) => {
    setGenerating(true);
    try {
      const response = await api.post(
        `/certificates/generate/${userId}/${courseId}`,
        {},
        {  // ✅ FIXED: Properly wrapped config object
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `certificate-${userId}-${courseId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);  // ✅ Clean up blob URL
      return true;
    } catch (err) {
      console.error('generateUserCertificate error:', err);
      throw new Error('Failed to generate certificate');
    } finally {
      setGenerating(false);
    }
  }, [token]);

  return {
    loading,
    error,
    userDetail,
    userLoading,
    generating,
    fetchUsers,
    fetchUserDetails,
    generateUserCertificate
  };
};
