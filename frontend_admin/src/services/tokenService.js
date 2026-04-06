// src/services/tokenService.js
import axios from "axios";

export const API_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) || "http://localhost:8000";
const STORAGE_KEY = "token";

/**
 * Unwrap API response data to handle both paginated and non-paginated responses.
 * - If response has .results (paginated), returns .results
 * - If response is an array, returns the array
 * - Otherwise returns the data as-is
 */
export function unwrapResponse(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return data;
}

/**
 * Get total count from paginated response.
 */
export function getResponseCount(data) {
  if (!data) return 0;
  if (typeof data?.count === 'number') return data.count;
  if (Array.isArray(data)) return data.length;
  if (Array.isArray(data?.results)) return data.results.length;
  return 0;
}

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
 * - On 401 with explicit auth error: clear tokens and redirect to /login
 * - On network errors: don't clear token (backend might not be ready yet)
 * - Re-throw other errors for local handling
 */
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    // Only clear token if it's a real authentication error (401 with explicit message)
    // Don't clear on network errors (backend not ready) or other errors
    if (status === 401 && err?.response?.data?.detail) {
      clearTokens();
      // Use HashRouter compatible redirect
      window.location.hash = "#/login";
    }
    return Promise.reject(err);
  }
);

export default api;