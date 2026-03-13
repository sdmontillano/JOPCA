// src/services/tokenService.js
import axios from "axios";

const API_URL = "http://localhost:8000";
const STORAGE_KEY = "token";

/**
 * Persist token and apply Authorization header to the shared axios instance.
 * - remember = true -> localStorage
 * - remember = false -> sessionStorage
 */
export const setAccessToken = (token, remember = true) => {
  try {
    if (remember) localStorage.setItem(STORAGE_KEY, token);
    else sessionStorage.setItem(STORAGE_KEY, token);
  } catch (e) {
    console.warn("Failed to persist token", e);
  }
  // ensure header is set on the axios instance
  api.defaults.headers.common["Authorization"] = `Token ${token}`;
};

/** Read token from storage (localStorage first, then sessionStorage) */
export const getAccessToken = () => {
  return localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY) || null;
};

/** Clear token from storage and remove Authorization header */
export const clearTokens = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn("Failed to clear tokens", e);
  }
  delete api.defaults.headers.common["Authorization"];
};

/** Shared axios instance used across the app */
const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

/** Apply token from storage on boot if present */
const bootToken = getAccessToken();
if (bootToken) {
  api.defaults.headers.common["Authorization"] = `Token ${bootToken}`;
}

/** Keep Authorization header in sync before each request */
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) config.headers["Authorization"] = `Token ${token}`;
    return config;
  },
  (err) => Promise.reject(err)
);

/**
 * Global response interceptor:
 * - On 401: clear tokens and redirect to /login
 * - Re-throw other errors for local handling
 */
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    if (status === 401) {
      clearTokens();
      try {
        // SPA-friendly attempt then fallback to full navigation
        window.history.pushState({}, "", "/login");
        window.location.href = "/login";
      } catch {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export default api;