import { useState } from "react";
import { Box, Button, TextField, Typography, Paper } from "@mui/material";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:8000/auth/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("token", data.access); // store JWT access token
        onLogin();
      } else {
        setError(data.detail || "Login failed");
      }
    } catch (err) {
      setError("Server error. Please try again.");
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "#0f172a",
      }}
    >
      <Paper
        elevation={6}
        sx={{
          p: 4,
          width: 350,
          textAlign: "center",
          borderRadius: 3,
          bgcolor: "#1e293b",
          color: "#fff",
        }}
      >
        <Typography variant="h5" sx={{ mb: 3, fontWeight: "bold" }}>
          Banking DCPR Login
        </Typography>
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            variant="outlined"
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            sx={{ mb: 2, bgcolor: "#fff", borderRadius: 1 }}
          />
          <TextField
            fullWidth
            type="password"
            variant="outlined"
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{ mb: 2, bgcolor: "#fff", borderRadius: 1 }}
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
            sx={{ bgcolor: "#0ea5e9", "&:hover": { bgcolor: "#0284c7" } }}
          >
            Login
          </Button>
        </form>
      </Paper>
    </Box>
  );
}
