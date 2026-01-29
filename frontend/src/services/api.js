// API service configuration for backend communication
import axios from "axios";
import store from "../redux/store";
import { logout } from "../redux/slices/authSlice";
import { msalInstance, MSAL_ENABLED } from "../config/msalConfig";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

// ============================================
// 🔐 Request Interceptor (LOGOUT-AWARE)
// ============================================
api.interceptors.request.use(
  (config) => {
    // 🚫 HARD BLOCK all API calls during logout
    if (sessionStorage.getItem("logout_in_progress") === "true") {
      return Promise.reject({
        isLogoutAbort: true,
        message: "Request blocked due to logout",
      });
    }

    const token = localStorage.getItem("token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }

    // Let axios handle Content-Type for FormData
    if (!(config.data instanceof FormData)) {
      config.headers["Content-Type"] = "application/json";
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ============================================
// ⚙️ Response Interceptor
// ============================================
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Ignore logout-aborted requests silently
    if (error?.isLogoutAbort) {
      return Promise.reject(error);
    }

    const status = error?.response?.status;

    if (status === 401) {
      // Clear auth state
      store.dispatch(logout());
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("role");

      // Force MSAL logout only if NOT already logging out
      if (
        sessionStorage.getItem("logout_in_progress") !== "true" &&
        MSAL_ENABLED &&
        msalInstance &&
        typeof msalInstance.logoutRedirect === "function"
      ) {
        try {
          sessionStorage.setItem("logout_in_progress", "true");
          msalInstance.logoutRedirect({
            postLogoutRedirectUri: `${window.location.origin}/login`,
          });
        } catch (err) {
          console.warn("MSAL forced logout failed:", err);
        }
      }

      if (
        typeof window !== "undefined" &&
        window.location.pathname !== "/login"
      ) {
        window.location.replace("/login?logout=force");
      }

      return Promise.reject(error);
    }

    // Log other errors
    if (error.response) {
      console.error(
        "❌ Server Error:",
        JSON.stringify(error.response.data, null, 2)
      );
    } else if (error.request) {
      console.error("❌ No response from server");
    } else {
      console.error("❌ Request setup error:", error.message);
    }

    return Promise.reject(error);
  }
);

export default api;
