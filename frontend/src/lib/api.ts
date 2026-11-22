import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to attach JWT access token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("pms_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle 401 unauthorized
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.includes("/login")) {
      localStorage.removeItem("pms_token");
      localStorage.removeItem("pms_user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

