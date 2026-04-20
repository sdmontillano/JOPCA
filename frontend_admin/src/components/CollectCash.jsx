// src/components/CollectCash.jsx
import React, { useState } from "react";
import {
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  Stack,
  CircularProgress,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import api from "../services/tokenService";
import { useToast } from "../ToastContext";

export default function CollectCash() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    amount: "",
    description: "",
    date: today,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    if (!form.amount || Number(form.amount) <= 0) {
      setMessage({ type: "error", text: "Amount must be greater than 0." });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        amount: parseFloat(form.amount),
        status: "UNDEPOSITED",
        description: form.description?.trim() || "",
        date: form.date || null,
      };

      await api.post("/api/collections/", payload);

      showToast("Cash collected successfully!", "success");
      setMessage({ type: "success", text: "✅ Cash collected successfully!" });
      setForm({ amount: "", description: "", date: today });
    } catch (err) {
      console.error("Failed to collect cash", err);
      let errMsg = "Failed to collect cash.";
      try {
        const data = err?.response?.data;
        if (data && typeof data === "object") {
          const details = Object.entries(data)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
            .join(" | ");
          if (details) errMsg += ` ${details}`;
        } else if (typeof err?.response?.data === "string") {
          errMsg += ` ${err.response.data}`;
        } else if (err?.message) {
          errMsg += ` ${err.message}`;
        }
      } catch {}
      showToast(errMsg, "error");
      setMessage({ type: "error", text: errMsg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: "auto", mt: 4 }}>
      <Paper sx={{ p: 4, borderRadius: 2 }}>
        <Typography variant="h5" sx={{ mb: 3, fontWeight: "bold", color: "#1E293B" }}>
          Collect Cash
        </Typography>

        <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <TextField
            label="Amount (₱)"
            name="amount"
            type="number"
            value={form.amount}
            onChange={handleChange}
            inputProps={{ min: 0, step: "0.01" }}
            required
            fullWidth
          />

          <TextField
            label="Date Collected"
            name="date"
            type="date"
            value={form.date}
            onChange={handleChange}
            InputLabelProps={{ shrink: true }}
            fullWidth
            helperText="When the cash was collected (leave blank for today)"
          />

          <TextField
            label="Note (optional)"
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="e.g., Cash payment from customer"
            fullWidth
            multiline
            rows={2}
          />

          {message && (
            <Alert severity={message.type} sx={{ mt: 1 }}>
              {message.text}
            </Alert>
          )}

          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            <Button
              type="submit"
              variant="contained"
              sx={{ bgcolor: "#22c55e", "&:hover": { bgcolor: "#16a34a" } }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={18} /> : "Submit"}
            </Button>
            <Button
              type="button"
              variant="outlined"
              onClick={() => navigate("/collections")}
            >
              View Collections
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}