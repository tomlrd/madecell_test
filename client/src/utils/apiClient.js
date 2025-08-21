import axios from "axios";
import socketService from "../services/socket";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001/api";

// Instance axios simple
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Juste ajouter le token dans les headers
api.interceptors.request.use((config) => {
  const accessToken = localStorage.getItem("accessToken");
  if (accessToken && accessToken !== "undefined" && accessToken !== "null") {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Intercepteur simple pour gérer les 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;

      try {
        await socketService.refreshToken();

        // Retry avec le nouveau token
        const newToken = localStorage.getItem("accessToken");
        error.config.headers.Authorization = `Bearer ${newToken}`;
        return api(error.config);
      } catch {
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
