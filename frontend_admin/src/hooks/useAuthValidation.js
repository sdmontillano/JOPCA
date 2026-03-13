// src/hooks/useAuthValidation.js
import { useEffect, useState, useCallback } from "react";
import { getAccessToken, clearTokens } from "../services/tokenService";
import api from "../services/tokenService";
import { useNavigate } from "react-router-dom";

/**
 * Hook responsibilities
 * - validate token on mount
 * - revalidate when browser goes online
 * - expose isAuthenticated, offline, and a revalidate function
 */
export default function useAuthValidation() {
  const navigate = useNavigate();
  const [offline, setOffline] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(!!getAccessToken());

  const validate = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setIsAuthenticated(false);
      navigate("/login");
      return;
    }

    try {
      // Adjust endpoint to your backend verify endpoint if different
      await api.get("/api/auth/verify/");
      setOffline(false);
      setIsAuthenticated(true);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401) {
        // token invalid -> clear and redirect to login
        clearTokens();
        setIsAuthenticated(false);
        navigate("/login");
      } else {
        // network or server error -> treat as offline
        setOffline(true);
      }
    }
  }, [navigate]);

  useEffect(() => {
    // run validation once on mount
    validate();

    // re-run when browser goes online
    const onOnline = () => {
      validate();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [validate]);

  return { isAuthenticated, offline, revalidate: validate };
}