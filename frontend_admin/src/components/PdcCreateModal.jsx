// src/components/PdcCreateModal.jsx
import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  CircularProgress,
  Alert,
  MenuItem,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import api from "../services/tokenService";

export default function PdcCreateModal({ open, onClose, onCreated = null }) {
  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    customer_name: "",
    check_number: "",
    check_date: "",
    maturity_date: today,
    amount: "",
    deposit_bank_id: "",
    notes: "",
    status: "outstanding",
  });

  const [banks, setBanks] = useState([]);
  const [fetchingBanks, setFetchingBanks] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    if (!open) return;
    setAlert(null);
    setForm((f) => ({ ...f, maturity_date: today }));
    let mounted = true;
    setFetchingBanks(true);
    api
      .get("/bankaccounts/")
      .then((res) => {
        if (!mounted) return;
        const data = res.data ?? res;
        const list = Array.isArray(data) ? data : data.results ?? [];
        setBanks(list);
      })
      .catch((err) => {
        console.error("Failed to fetch banks", err);
        if (!mounted) return;
        setAlert({ type: "error", text: "Failed to load deposit banks." });
      })
      .finally(() => {
        if (!mounted) return;
        setFetchingBanks(false);
      });
    return () => {
      mounted = false;
    };
  }, [open]);

  const resetForm = () =>
    setForm({
      customer_name: "",
      check_number: "",
      check_date: "",
      maturity_date: today,
      amount: "",
      deposit_bank_id: "",
      notes: "",
      status: "outstanding",
    });

  const handleClose = () => {
    resetForm();
    setAlert(null);
    if (typeof onClose === "function") onClose();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlert(null);

    if (!form.customer_name.trim()) {
      setAlert({ type: "error", text: "Customer Name is required." });
      return;
    }
    if (!form.check_number.trim()) {
      setAlert({ type: "error", text: "Check Number is required." });
      return;
    }
    if (!form.maturity_date) {
      setAlert({ type: "error", text: "Maturity Date is required." });
      return;
    }
    if (form.amount === "" || Number(form.amount) <= 0) {
      setAlert({ type: "error", text: "Amount must be greater than 0." });
      return;
    }
    if (!form.deposit_bank_id) {
      setAlert({ type: "error", text: "Deposit Bank is required." });
      return;
    }

    setLoading(true);
    try {
      // Normalize payload to common backend shape:
      // - use `customer` instead of `customer_name`
      // - ensure deposit_bank_id is numeric
      const payload = {
        customer: form.customer_name.trim(),
        check_number: form.check_number.trim(),
        check_date: form.check_date || null,
        maturity_date: form.maturity_date,
        amount: Number(form.amount),
        deposit_bank_id: Number(form.deposit_bank_id),
        notes: form.notes?.trim() || null,
        status: form.status || "outstanding",
      };

      const res = await api.post("/pdc/", payload);
      const created = res.data ?? res;

      setAlert({ type: "success", text: "PDC created successfully." });

      if (typeof onCreated === "function") {
        try {
          onCreated(created);
        } catch (err) {
          console.error("onCreated callback error", err);
        }
      }

      setTimeout(() => {
        handleClose();
      }, 700);
    } catch (err) {
      console.error("Failed to create PDC", err);
      const msg =
        err?.response?.data?.detail ||
        (err?.response?.data && JSON.stringify(err.response.data)) ||
        err?.message ||
        "Failed to create PDC";
      setAlert({ type: "error", text: String(msg) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={Boolean(open)}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      BackdropProps={{
        sx: {
          backgroundColor: "rgba(0,0,0,0.35)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
        },
      }}
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Add Post Dated Check</span>
        <IconButton onClick={handleClose} size="small" aria-label="close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <form id="pdc-create-form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            {alert && <Alert severity={alert.type}>{alert.text}</Alert>}

            <TextField label="Customer Name" name="customer_name" value={form.customer_name} onChange={handleChange} fullWidth required />
            <TextField label="Check Number" name="check_number" value={form.check_number} onChange={handleChange} fullWidth required />
            <TextField label="Check Date (optional)" name="check_date" type="date" value={form.check_date} onChange={handleChange} InputLabelProps={{ shrink: true }} fullWidth />
            <TextField label="Maturity Date" name="maturity_date" type="date" value={form.maturity_date} onChange={handleChange} InputLabelProps={{ shrink: true }} fullWidth required />
            <TextField label="Amount (₱)" name="amount" type="number" inputProps={{ step: "0.01", min: 0 }} value={form.amount} onChange={handleChange} fullWidth required />

            <TextField
              select
              label="Deposit Bank"
              name="deposit_bank_id"
              value={form.deposit_bank_id}
              onChange={handleChange}
              fullWidth
              required
              disabled={fetchingBanks}
              helperText={fetchingBanks ? "Loading banks..." : "Select a deposit bank"}
            >
              {banks.map((b) => (
                <MenuItem key={b.id ?? b.pk ?? b.account_number} value={b.id ?? b.pk ?? b.account_number}>
                  {b.name} {b.account_number ? `(${b.account_number})` : ""}
                </MenuItem>
              ))}
            </TextField>

            <TextField label="Notes (optional)" name="notes" value={form.notes} onChange={handleChange} fullWidth multiline minRows={2} />
          </Stack>
        </form>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button type="submit" form="pdc-create-form" variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={18} /> : "Create PDC"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}