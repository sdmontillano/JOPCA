import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import api from "../services/tokenService";
import { getAccessToken, clearTokens } from "../services/tokenService";

export default function RequireAuth({ children }) {
  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setChecking(false);
      setValid(false);
      return;
    }

    api
      .get("/auth/validate/")
      .then(() => setValid(true))
      .catch(() => {
        clearTokens();
        setValid(false);
      })
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return <div style={{ padding: 24, textAlign: "center" }}>Checking authentication…</div>;
  }

  if (!valid) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}