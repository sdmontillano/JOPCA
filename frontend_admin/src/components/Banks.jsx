// src/components/Banks.jsx
import { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  CircularProgress,
  Button,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import api from "../services/tokenService"; // axios instance with auth header

export default function Banks() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    async function fetchAccounts() {
      try {
        const res = await api.get("/bankaccounts/");
        if (mounted) setAccounts(res.data);
      } catch (err) {
        console.error("Error fetching bank accounts", err);
        if (mounted) setError("Failed to load bank accounts.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchAccounts();
    return () => {
      mounted = false;
    };
  }, []);

  const formatPeso = (value) =>
    `₱${Number(value ?? 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", p: 3 }}>
      <Paper sx={{ width: "100%", p: 2 }}>
        {/* Always-available back button */}
        <Button variant="text" onClick={() => navigate("/dashboard")} sx={{ mb: 2 }}>
          ← Back to Dashboard
        </Button>

        <Typography variant="h5" sx={{ mb: 2, fontWeight: "bold" }}>
          Bank Accounts
        </Typography>

        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        <List>
          {accounts.length === 0 && (
            <Typography>No bank accounts found.</Typography>
          )}

          {accounts.map((acc) => (
            <ListItemButton
              key={acc.id}
              onClick={() => navigate(`/banks/${acc.id}`)}
              sx={{
                borderRadius: 1,
                mb: 1,
                alignItems: "center",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <ListItemText
                primary={`${acc.name} (${acc.account_number})`}
                secondary={`Balance: ${formatPeso(acc.balance)}`}
              />
              <Button
                variant="outlined"
                size="small"
                onClick={(e) => {
                  e.stopPropagation(); // prevent parent click
                  navigate(`/banks/${acc.id}`);
                }}
              >
                View
              </Button>
            </ListItemButton>
          ))}
        </List>
      </Paper>
    </Box>
  );
}