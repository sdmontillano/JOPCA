// src/components/RequireAuth.jsx
import React, { useEffect, useState, useCallback } from "react";
import { Navigate, useLocation } from "react-router-dom";
import api, { getAccessToken, clearTokens } from "../services/tokenService";

/**
 * Robust RequireAuth
 * - Tries multiple verify endpoints until one returns success.
 * - Caches the working endpoint in localStorage to avoid repeated 404s.
 * - On 401 -> clear tokens and redirect to /login.
 * - On network/server error -> offline banner and allow access until revalidation.
 */

const VALIDATE_CACHE_KEY = "validate_endpoint";
const CANDIDATE_ENDPOINTS = [
  "/auth/validate/",
  "/api/auth/verify/",
  "/api-token-verify/",
  "/api-token-auth/verify/",
  "/api/auth/token/verify/",
  "/api/auth/verify-token/",
  "/api/me/",
  "/api/user/",
];

export default function RequireAuth({ children }) {
  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);
  const [offline, setOffline] = useState(false);
  const location = useLocation();

  const tryValidateWith = async (endpoint) => {
    try {
      const res = await api.get(endpoint);
      // treat any 2xx as success
      if (res && res.status >= 200 && res.status < 300) {
        console.debug("[RequireAuth] validate success:", endpoint, res.status);
        return { ok: true, endpoint };
      }
      return { ok: false, status: res?.status ?? null };
    } catch (err) {
      const status = err?.response?.status;
      // 404 -> endpoint not found, try next
      if (status === 404) {
        console.debug("[RequireAuth] validate 404 (not found):", endpoint);
        return { ok: false, status: 404 };
      }
      // 401 -> invalid token
      if (status === 401) {
        console.debug("[RequireAuth] validate 401 (invalid token):", endpoint);
        return { ok: false, status: 401 };
      }
      // network or other server error
      console.debug("[RequireAuth] validate network/server error:", endpoint, status, err?.message);
      return { ok: false, status: status ?? "network", error: err };
    }
  };

  const runValidation = useCallback(async () => {
    setChecking(true);
    setOffline(false);

    const token = getAccessToken();
    if (!token) {
      setValid(false);
      setChecking(false);
      return;
    }

    // If we previously discovered a working endpoint, try it first
    const cached = localStorage.getItem(VALIDATE_CACHE_KEY);
    const endpoints = cached ? [cached, ...CANDIDATE_ENDPOINTS.filter((e) => e !== cached)] : CANDIDATE_ENDPOINTS;

    let sawNetworkError = false;
    for (const ep of endpoints) {
      const result = await tryValidateWith(ep);
      if (result.ok) {
        // cache working endpoint
        try {
          localStorage.setItem(VALIDATE_CACHE_KEY, ep);
        } catch (e) {
          /* ignore storage errors */
        }
        setValid(true);
        setOffline(false);
        setChecking(false);
        return;
      }

      if (result.status === 401) {
        // invalid token -> clear and redirect
        clearTokens();
        setValid(false);
        setChecking(false);
        return;
      }

      if (result.status === 404) {
        // try next endpoint
        continue;
      }

      // network or unknown error: mark network problem and stop trying further
      sawNetworkError = true;
      break;
    }

    if (sawNetworkError) {
      // backend unreachable -> offline mode
      setOffline(true);
      // keep previous valid state false (do not auto-login)
      setChecking(false);
      return;
    }

    // If we exhausted endpoints without network error and without 401,
    // treat as invalid (no verify endpoint worked)
    console.warn("[RequireAuth] No verify endpoint succeeded; clearing token and redirecting to login.");
    clearTokens();
    setValid(false);
    setChecking(false);
  }, []);

  useEffect(() => {
    runValidation();
    const onOnline = () => runValidation();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [runValidation]);

  if (checking) {
    return <div style={{ padding: 24, textAlign: "center" }}>Checking authentication…</div>;
  }

  if (!valid && !offline) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <>
      {offline && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1200,
            background: "#ffecb5",
            color: "#7a4f01",
            padding: "8px 12px",
            textAlign: "center",
            fontWeight: 600,
          }}
        >
          Server unreachable — working offline. We will revalidate when the backend is available.
        </div>
      )}
      {children}
    </>
  );
}