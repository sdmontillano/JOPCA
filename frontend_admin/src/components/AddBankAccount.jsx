// src/components/AddBankAccount.jsx
import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  MenuItem,
  Alert,
  CircularProgress,
  IconButton,
  Paper,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import api from "../services/tokenService";
import { useNavigate } from "react-router-dom";
import { useToast } from "../ToastContext";

/**
 * AddBankAccount
 * - If `open` prop is provided, acts as a modal (Dialog).
 * - If `open` is not provided, renders as a standalone page (Paper-like layout).
 * - Opening balance is optional now: if left empty, payload sends null.
 */
export default function AddBankAccount({ open: openProp = undefined, onClose = undefined, onCreated = undefined }) {
  const isControlled = typeof openProp !== "undefined";
  const [open, setOpen] = useState(Boolean(openProp));
  useEffect(() => {
    if (isControlled) setOpen(Boolean(openProp));
  }, [openProp, isControlled]);

  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    name: "",
    account_number: "",
    area: "main_office",
    opening_balance: "",
    start_date: today,
  });
  const [accounts, setAccounts] = useState([]);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    let mounted = true;
    api
      .get("/api/bankaccounts/")
      .then((res) => {
        if (!mounted) return;
        const data = res.data ?? res;
        setAccounts(Array.isArray(data) ? data : data.results ?? []);
      })
      .catch((err) => {
        console.error("Failed to fetch accounts", err);
        if (!mounted) return;
        setMessage({ type: "error", text: "❌ Error fetching accounts." });
      });
    return () => {
      mounted = false;
    };
  }, []);

  const resetForm = () =>
    setForm({
      name: "",
      account_number: "",
      area: "main_office",
      opening_balance: "",
      start_date: today,
    });

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const closeLocal = () => {
    resetForm();
    setMessage(null);
    if (isControlled) {
      if (typeof onClose === "function") onClose();
    } else {
      navigate("/dashboard");
    }
  };

  const handleSubmit = async (e) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    setMessage(null);

    // duplicate check
    const exists = accounts.some((acc) => String(acc.account_number) === String(form.account_number));
    if (exists) {
      setMessage({ type: "error", text: "❌ Account number already exists!" });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: form.name?.trim(),
        account_number: form.account_number?.trim(),
        area: form.area,
        // opening_balance optional: send null when empty
        opening_balance: form.opening_balance === "" ? null : (() => {
          const val = parseFloat(form.opening_balance);
          return isNaN(val) ? null : val;
        })(),
        start_date: form.start_date || null,
      };

      const res = await api.post("/api/bankaccounts/", payload);
      const created = res.data ?? res;

      showToast("Bank account created successfully!", "success");
      setMessage({ type: "success", text: "✅ Bank account added successfully!" });
      resetForm();

      if (typeof onCreated === "function") {
        try {
          onCreated(created);
        } catch (err) {
          console.error("onCreated callback threw", err);
        }
      }

      setTimeout(() => {
        if (isControlled) {
          if (typeof onClose === "function") onClose();
        } else {
          navigate("/dashboard");
        }
      }, 700);
    } catch (err) {
      console.error("Failed to add bank account", err);
      let errMsg = "Failed to add bank account.";
      try {
        const data = err?.response?.data;
        if (data && typeof data === "object") {
          const details = Object.entries(data)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
            .join(" | ");
          if (details) errMsg += ` ${details}`;
        } else if (err?.message) {
          errMsg += ` ${err.message}`;
        }
      } catch {
      showToast(errMsg, "error");
        // ignore
      }
      setMessage({ type: "error", text: errMsg });
    } finally {
      setLoading(false);
    }
  };

  // Modal rendering when controlled
  if (isControlled) {
    return (
      <Dialog
        open={Boolean(open)}
        onClose={closeLocal}
        fullWidth
        maxWidth="sm"
        BackdropProps={{
          sx: {
            backgroundColor: "rgba(0,0,0,0.36)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
          },
        }}
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Add Bank Account</span>
          <IconButton size="small" onClick={closeLocal} aria-label="close">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          <Box component="form" id="add-bank-form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField label="Bank Name" name="name" value={form.name} onChange={handleChange} required fullWidth />
            <TextField label="Account Number" name="account_number" value={form.account_number} onChange={handleChange} required fullWidth />
            <TextField select label="Area" name="area" value={form.area} onChange={handleChange} fullWidth>
              <MenuItem value="main_office">Main Office</MenuItem>
              <MenuItem value="tagoloan_parts">Tagoloan Parts</MenuItem>
              <MenuItem value="midsayap_parts">Midsayap Parts</MenuItem>
              <MenuItem value="valencia_parts">Valencia Parts</MenuItem>
            </TextField>

            {/* Opening balance is optional now (no required attribute) */}
            <TextField
              label="Opening Balance (₱) (optional)"
              name="opening_balance"
              type="number"
              value={form.opening_balance}
              onChange={handleChange}
              inputProps={{ min: 0, step: "0.01" }}
              fullWidth
            />

            <TextField
              label="Start Date"
              name="start_date"
              type="date"
              value={form.start_date}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
              fullWidth
              helperText="When this bank account starts tracking"
            />

            {message && (
              <Alert severity={message.type} sx={{ mt: 1 }}>
                {message.text}
              </Alert>
            )}
          </Box>
        </DialogContent>

        <DialogActions>
          <Button type="button" onClick={closeLocal}>
            Cancel
          </Button>
          <Button type="submit" form="add-bank-form" variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={18} /> : "Save Bank Account"}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  // Standalone page rendering (original behavior)
  return (
    <Box sx={{ p: 3, m: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField label="Bank Name" name="name" value={form.name} onChange={handleChange} required />
          <TextField label="Account Number" name="account_number" value={form.account_number} onChange={handleChange} required />
          <TextField select label="Area" name="area" value={form.area} onChange={handleChange}>
            <MenuItem value="main_office">Main Office</MenuItem>
            <MenuItem value="tagoloan_parts">Tagoloan Parts</MenuItem>
            <MenuItem value="midsayap_parts">Midsayap Parts</MenuItem>
            <MenuItem value="valencia_parts">Valencia Parts</MenuItem>
          </TextField>

          <TextField
            label="Opening Balance (₱) (optional)"
            name="opening_balance"
            type="number"
            value={form.opening_balance}
            onChange={handleChange}
            inputProps={{ min: 0, step: "0.01" }}
          />

          <TextField
            label="Start Date"
            name="start_date"
            type="date"
            value={form.start_date}
            onChange={handleChange}
            InputLabelProps={{ shrink: true }}
            helperText="When this bank account starts tracking"
          />

          <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
            <Button type="submit" variant="contained" sx={{ bgcolor: "#22c55e", "&:hover": { bgcolor: "#16a34a" } }} disabled={loading}>
              {loading ? <CircularProgress size={18} /> : "Save Bank Account"}
            </Button>
            <Button variant="outlined" color="primary" onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </Button>
          </Box>

          {message && (
            <Alert severity={message.type} sx={{ mt: 2 }}>
              {message.text}
            </Alert>
          )}
        </Box>
      </Paper>
    </Box>
  );
}