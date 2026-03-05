// src/services/tokenService.js
import axios from "axios";

const API_URL = "http://localhost:8000";

export const setAccessToken = (token) => {
  localStorage.setItem("token", token);
};

export const getAccessToken = () => {
  return localStorage.getItem("token");
};

export const clearTokens = () => {
  localStorage.removeItem("token");
};

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers["Authorization"] = `Token ${token}`;
  }

  return config;
});

export default api;