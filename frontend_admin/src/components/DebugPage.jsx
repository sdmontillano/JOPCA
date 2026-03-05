// src/components/DebugPage.jsx
import { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Stack,
  TextField,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import api from "../services/tokenService";

export default function DebugPage() {
  const [dailyRaw, setDailyRaw] = useState(null);
  const [monthlyRaw, setMonthlyRaw] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [month, setMonth] = useState("");

  const fetchDebug = async (monthOverride = null) => {
    setError(null);
    setLoading(true);
    try {
      const dailyRes = await api.get("/summary/detailed-daily/");
      setDailyRaw({ status: dailyRes.status, data: dailyRes.data });

      const today = new Date();
      const monthStr =
        monthOverride ||
        `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
      const monthlyRes = await api.get(`/summary/detailed-monthly/?month=${monthStr}`);
      setMonthlyRaw({ status: monthlyRes.status, data: monthlyRes.data });
    } catch (err) {
      console.error("Debug fetch error", err);
      setError(err?.response?.data || err?.message || "Failed to fetch debug data");
      setDailyRaw(null);
      setMonthlyRaw(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebug();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            API Debug Viewer
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Inspect raw responses from /summary/detailed-daily/ and /summary/detailed-monthly/.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            size="small"
            label="Month (YYYY-MM)"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            placeholder="2026-02"
          />
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={() => fetchDebug(month || null)}
            disabled={loading}
          >
            Refresh
          </Button>
        </Stack>
      </Stack>

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {String(error)}
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
          /summary/detailed-daily/ (raw)
        </Typography>
        <pre style={{ whiteSpace: "pre-wrap", maxHeight: 360, overflow: "auto" }}>
          {dailyRaw ? JSON.stringify(dailyRaw, null, 2) : "No daily response yet"}
        </pre>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
          /summary/detailed-monthly/?month=YYYY-MM (raw)
        </Typography>
        <pre style={{ whiteSpace: "pre-wrap", maxHeight: 360, overflow: "auto" }}>
          {monthlyRaw ? JSON.stringify(monthlyRaw, null, 2) : "No monthly response yet"}
        </pre>
      </Paper>
    </Box>
  );
}