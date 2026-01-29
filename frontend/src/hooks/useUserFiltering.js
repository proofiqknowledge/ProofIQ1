import { useState, useMemo } from 'react';

export const useUserFiltering = (users = []) => {  // ✅ Default empty array
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = useMemo(() => {
    // ✅ Safety checks
    if (!users || !Array.isArray(users)) {
      console.warn('useUserFiltering: users is not an array', users);
      return [];
    }
    
    if (!searchTerm) return users;

    return users.filter(user => {
      const searchLower = searchTerm.toLowerCase();
      return (
        user.name?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower) ||
        user.employeeId?.toLowerCase().includes(searchLower) ||
        user.designation?.toLowerCase().includes(searchLower)
      );
    });
  }, [users, searchTerm]);

  const students = useMemo(() => {
    return filteredUsers.filter(user => user.role === 'Student');
  }, [filteredUsers]);

  const trainers = useMemo(() => {
    return filteredUsers.filter(user => user.role === 'Trainer');
  }, [filteredUsers]);

  return {
    searchTerm,
    setSearchTerm,
    filteredUsers,
    students,
    trainers
  };
};
