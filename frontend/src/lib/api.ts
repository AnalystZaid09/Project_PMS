import axios from "axios";

// Determine API base URL dynamically:
// 1. Explicit Vite env variable (if configured in Vercel)
// 2. Fallback to production Render backend if running on Vercel or any cloud domain
// 3. Fallback to local /api/v1 proxy if running on localhost / 127.0.0.1
const getBaseUrl = (): string => {
  let url = import.meta.env.VITE_API_BASE_URL;
  if (url && typeof url === "string") {
    // Automatically correct the non-existent apex-pms-backend URL to the real live backend URL
    if (url.includes("apex-pms-backend.onrender.com")) {
      url = url.replace("apex-pms-backend.onrender.com", "project-pms.onrender.com");
    }
    return url;
  }
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host && host !== "localhost" && host !== "127.0.0.1") {
      return "https://project-pms.onrender.com/api/v1";
    }
  }
  return "/api/v1";
};

export const API_BASE_URL = getBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to attach JWT access token and ensure correct backend endpoint
apiClient.interceptors.request.use(
  (config) => {
    // Automatic safety rewrite: ensure no request goes to the dead apex-pms-backend domain
    if (config.baseURL && config.baseURL.includes("apex-pms-backend.onrender.com")) {
      config.baseURL = config.baseURL.replace("apex-pms-backend.onrender.com", "project-pms.onrender.com");
    }
    if (config.url && config.url.includes("apex-pms-backend.onrender.com")) {
      config.url = config.url.replace("apex-pms-backend.onrender.com", "project-pms.onrender.com");
    }

    // Rewrite /masters/<path> to /<path> for universal compatibility across backend versions
    if (config.url && config.url.startsWith("/masters/")) {
      config.url = config.url.replace(/^\/masters\//, "/");
    }

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
