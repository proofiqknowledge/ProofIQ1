// src/utils/auth.js

// Check if user is logged in
export const isLoggedIn = () => {
  const token = localStorage.getItem("token");
  return !!token;
};

// Get user role
export const getUserRole = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  return user?.role || null;
};

// Logout function
export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};
