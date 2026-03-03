// src/services/tokenService.js
import axios from "axios";

const API_URL = "http://localhost:8000";

// Save single authtoken
export const setAccessToken = (token) => {
  localStorage.setItem("token", token);
};

export const getAccessToken = () => localStorage.getItem("token");

export const clearTokens = () => {
  localStorage.removeItem("token");
};

// Axios instance with authtoken support
const api = axios.create({ baseURL: API_URL });

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers["Authorization"] = `Token ${token}`; // ✅ authtoken format
  }
  return config;
});

export default api;
