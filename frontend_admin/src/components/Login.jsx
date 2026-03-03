import { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
} from "@mui/material";
import axios from "axios";
import { setAccessToken } from "../services/tokenService";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // ✅ Authtoken login endpoint
      const res = await axios.post("http://localhost:8000/api-token-auth/", {
        username,
        password,
      });

      if (res.status === 200) {
        // Save the authtoken
        setAccessToken(res.data.token);

        // ✅ Redirect to dashboard
        window.location.href = "/dashboard";
      } else {
        setError("Login failed");
      }
    } catch (err) {
      console.error("Login error", err);
      setError("Invalid credentials or server error");
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
        bgcolor: "#f9fafb",
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          width: 400,
          borderRadius: 3,
          textAlign: "center",
        }}
      >
        <Typography
          variant="h4"
          sx={{ mb: 3, fontWeight: "bold", color: "#0ea5e9" }}
        >
          Banking Admin
        </Typography>
        <Typography sx={{ mb: 3, color: "text.secondary" }}>
          Sign in to continue
        </Typography>
        <form onSubmit={handleLogin}>
          <TextField
            label="Username"
            fullWidth
            sx={{ mb: 2 }}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <TextField
            label="Password"
            type="password"
            fullWidth
            sx={{ mb: 2 }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && (
            <Typography color="error" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}
          <Button
            type="submit"
            variant="contained"
            fullWidth
            sx={{
              bgcolor: "#0ea5e9",
              "&:hover": { bgcolor: "#0284c7" },
              borderRadius: 2,
              py: 1.2,
              fontWeight: "bold",
            }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : "Login"}
          </Button>
        </form>
      </Paper>
    </Box>
  );
}
