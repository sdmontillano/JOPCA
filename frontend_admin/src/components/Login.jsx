// src/components/Login.jsx
import { useState, useEffect } from "react";
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
  FormControlLabel,
  Switch,
  Divider,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
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
  
  // Registration form state
  const [showRegister, setShowRegister] = useState(false);
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regIsAdmin, setRegIsAdmin] = useState(false);
  const [regLoading, setRegLoading] = useState(false);

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
  
  // Handle registration
  async function handleRegister(e) {
    e.preventDefault();
    if (!regUsername.trim() || !regPassword) {
      showToast("Username and password are required", "error");
      return;
    }
    
    setRegLoading(true);
    try {
      await api.post("/api/create-user/", {
        username: regUsername.trim(),
        password: regPassword,
        email: regEmail.trim() || undefined,
        is_staff: regIsAdmin,
        is_superuser: regIsAdmin,
      });
      showToast("Account created! Please login.", "success");
      setShowRegister(false);
      setRegUsername("");
      setRegPassword("");
      setRegEmail("");
      setRegIsAdmin(false);
    } catch (err) {
      const msg = err?.response?.data?.error || "Failed to create account";
      showToast(msg, "error");
    } finally {
      setRegLoading(false);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    if (!validate()) return;

    // Clear any stale auth header before login POST
    delete api.defaults.headers.common["Authorization"];
    
    setLoading(true);
    try {
      const res = await api.post("/api-token-auth/", {
        username: username.trim(),
        password,
      });

      console.debug("Login response", res.status, res.data);

      // Accept multiple token field names
      const token = res?.data?.token ?? res?.data?.access ?? res?.data?.key ?? null;

      if (res.status === 200 && token) {
        // Save token and user role immediately
        try {
          persistToken(token);
          localStorage.setItem("userRole", loginAs);
          localStorage.setItem("username", username);
          console.log("Login data saved:", { token: !!token, userRole: loginAs, username });
        } catch (err) {
          console.error("Failed to save login data:", err);
          setError("Failed to save login data.");
          setLoading(false);
          return;
        }

        showToast("Login successful!", "success");

        // Force redirect with window.location as fallback
        setTimeout(() => {
          const target = loginAs === "admin" ? "/admin/home" : "/dashboard";
          console.log("Redirecting to:", target);
          try {
            navigate(target);
            // Fallback if navigate doesn't work
            setTimeout(() => {
              window.location.hash = target;
            }, 100);
          } catch (err) {
            console.error("Navigation failed:", err);
            window.location.hash = target;
          }
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
            
            {!showRegister && (
              <Button
                fullWidth
                variant="text"
                startIcon={<PersonAddIcon />}
                onClick={() => setShowRegister(true)}
                sx={{ mt: 1.5, color: "#64748b", textTransform: "none" }}
              >
                Create Account
              </Button>
            )}
            
            {showRegister && (
              <Box sx={{ mt: 2, p: 2, bgcolor: "#f8fafc", borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: "#0b74de" }}>
                  Create New Account
                </Typography>
                
                <TextField
                  label="Username"
                  fullWidth
                  size="small"
                  sx={{ mb: 1 }}
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  disabled={regLoading}
                />
                
                <TextField
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  fullWidth
                  size="small"
                  sx={{ mb: 1 }}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  disabled={regLoading}
                />
                
                <TextField
                  label="Email (optional)"
                  type="email"
                  fullWidth
                  size="small"
                  sx={{ mb: 1 }}
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  disabled={regLoading}
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={regIsAdmin}
                      onChange={(e) => setRegIsAdmin(e.target.checked)}
                      size="small"
                    />
                  }
                  label={<Typography variant="caption">Make as Admin</Typography>}
                  sx={{ mb: 1 }}
                />
                
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    size="small"
                    onClick={() => setShowRegister(false)}
                    disabled={regLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    fullWidth
                    variant="contained"
                    size="small"
                    onClick={handleRegister}
                    disabled={regLoading || !regUsername.trim() || !regPassword}
                    sx={{ bgcolor: "#0b74de" }}
                  >
                    {regLoading ? <CircularProgress size={16} /> : "Register"}
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}