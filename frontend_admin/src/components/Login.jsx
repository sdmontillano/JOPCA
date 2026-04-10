// src/components/Login.jsx
import { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
  InputAdornment,
  IconButton,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import api, { setAccessToken as saveTokenToService } from "../services/tokenService";
import { useNavigate } from "react-router-dom";
import { useToast } from "../ToastContext";
import logo from "../assets/jopca-logo.png";

/**
 * Robust login:
 * - accepts token keys: token | access | key
 * - persists token and sets axios default header
 * - uses navigate, falls back to window.location.href
 * - logs response for debugging
 */

export default function Login() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loginAs, setLoginAs] = useState("user");

  const BRAND = { primary: "#0b74de", primaryDark: "#095fb0", accent: "#06b6d4" };

  const validate = () => {
    if (!username.trim() || !password) {
      setError("Please enter both username and password.");
      return false;
    }
    return true;
  };

  // Helper: persist token and set axios header
  function persistToken(token) {
    try {
      saveTokenToService(token, true);
    } catch (e) {
      console.warn("tokenService.setAccessToken threw an error", e);
      localStorage.setItem("token", token);
    }
    api.defaults.headers.common["Authorization"] = `Token ${token}`;
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await api.post("/api-token-auth/", {
        username: username.trim(),
        password,
      });

      console.debug("Login response", res.status, res.data);

      // Accept multiple token field names
      const token = res?.data?.token ?? res?.data?.access ?? res?.data?.key ?? null;
      const isStaff = res?.data?.is_staff ?? false;
      const isSuperuser = res?.data?.is_superuser ?? false;

      if (res.status === 200 && token) {
        // Block login if user has no role assigned (both checkboxes unchecked)
        if (!isStaff && !isSuperuser) {
          setError("Your account has no access. Please contact admin to assign a role.");
          setLoading(false);
          return;
        }

        // Validate role selection against user's is_staff or is_superuser status
        // Admin access requires is_staff OR is_superuser
        if (loginAs === "admin" && !isStaff && !isSuperuser) {
          setError("Your account is not authorized for admin access.");
          setLoading(false);
          return;
        }
        
        if (loginAs === "user" && isStaff) {
          // Admin user logging in as normal user - allow it
        }

        try {
          persistToken(token);
          // Use DROPDOWN selection (loginAs) to determine user role
          localStorage.setItem("userRole", loginAs);
          localStorage.setItem("isStaff", isStaff);
          localStorage.setItem("isSuperuser", isSuperuser);
          localStorage.setItem("username", res?.data?.username || username);
        } catch (err) {
          console.error("Failed to persist token", err);
          setError("Login succeeded but saving token failed.");
          setLoading(false);
          return;
        }

        showToast("Login successful! Redirecting...", "success");

        // Small delay to ensure token is saved, then redirect
        setTimeout(() => {
          // Route based on DROPDOWN selection, not backend role
          const redirectPath = loginAs === "admin" ? "#/admin" : "#/dashboard";
          window.location.hash = redirectPath;
          window.location.reload();
        }, 500);
      } else {
        // If backend returns 200 but no token, show response for debugging
        console.warn("Login response missing token", res.data);
        setError("Login failed. Server did not return an auth token.");
      }
    } catch (err) {
      console.error("Login error", err);
      console.error("Login error response", err?.response?.data);
      
      const errorData = err?.response?.data;
      let msg = errorData?.detail || errorData?.message || errorData?.error || "Invalid credentials or server error";

      // Handle DRF's non_field_errors or other object formats
      if (typeof msg !== 'string' && errorData) {
        const firstKey = Object.keys(errorData)[0];
        const firstValue = errorData[firstKey];
        msg = Array.isArray(firstValue) ? firstValue[0] : String(firstValue);
      }
      
      // If still not a string, show the whole response for debugging
      if (typeof msg !== 'string') {
        msg = "Login failed. Please check your credentials.";
      }
       
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(135deg, ${BRAND.primary}10 0%, ${BRAND.accent}10 50%, #0f172a 100%)`,
        p: 3,
      }}
    >
      <Paper
        elevation={12}
        sx={{
          width: { xs: "100%", sm: 980 },
          maxWidth: 980,
          borderRadius: 3,
          overflow: "hidden",
          display: "flex",
          boxShadow: "0 10px 30px rgba(2,6,23,0.45)",
        }}
      >
        <Box
          sx={{
            flex: 1,
            minHeight: 420,
            background: `linear-gradient(180deg, ${BRAND.primary} 0%, ${BRAND.primaryDark} 100%)`,
            color: "white",
            display: { xs: "none", md: "flex" },
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            p: 4,
            gap: 2,
          }}
        >
          <Box component="img" src={logo} alt="Logo" sx={{ width: 96, height: 96, objectFit: "contain", mb: 1 }} />
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            JOPCA
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.95, maxWidth: 260, textAlign: "center" }}>
            Banking Admin Portal — secure access to daily cash position and PDC management.
          </Typography>
        </Box>

        <Box
          sx={{
            flex: 1,
            p: { xs: 4, sm: 6 },
            background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(250,250,250,0.98) 100%)",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box component="img" src={logo} alt="logo" sx={{ width: 48, height: 48, objectFit: "contain", display: { xs: "block", md: "none" } }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: "text.primary" }}>
                Welcome back
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Sign in to your account
              </Typography>
            </Box>
          </Box>

          <Box component="form" onSubmit={handleLogin} noValidate sx={{ mt: 1 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Login as</InputLabel>
              <Select
                value={loginAs}
                label="Login as"
                onChange={(e) => setLoginAs(e.target.value)}
                disabled={loading}
                sx={{ borderRadius: 2 }}
              >
                <MenuItem value="user">Normal User</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>

            <TextField label="Username" fullWidth autoFocus sx={{ mb: 2, "& .MuiInputBase-root": { borderRadius: 2 } }} value={username} onChange={(e) => setUsername(e.target.value)} disabled={loading} />

            <TextField
              label="Password"
              type={showPassword ? "text" : "password"}
              fullWidth
              sx={{ mb: 1.5, "& .MuiInputBase-root": { borderRadius: 2 } }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((s) => !s)} edge="end" size="small">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {error && (
              <Typography color="error" sx={{ mb: 1, fontSize: 14 }}>
                {error}
              </Typography>
            )}

            <Button
              type="submit"
              fullWidth
              disabled={loading}
              sx={{
                py: 1.25,
                borderRadius: 2,
                fontWeight: 800,
                textTransform: "none",
                color: "white",
                background: `linear-gradient(90deg, ${BRAND.primary} 0%, ${BRAND.accent} 100%)`,
                boxShadow: `0 6px 18px rgba(11,116,222,0.18)`,
                transition: "transform 160ms ease, box-shadow 160ms ease",
                "&:hover": { transform: "translateY(-2px)", boxShadow: `0 12px 30px rgba(11,116,222,0.22)` },
              }}
            >
              {loading ? <CircularProgress size={20} color="inherit" /> : "Sign in"}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}