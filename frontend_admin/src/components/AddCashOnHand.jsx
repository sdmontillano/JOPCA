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
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import api from "../services/tokenService";

export default function AddCashOnHand({ open, onClose, onCreated = null }) {
  const getDefaultForm = () => ({
    particulars: "",
    date: new Date().toISOString().slice(0, 10),
    beginning: "",
    disbursements: "",
    replenishments: "",
    ending: "",
    notes: "",
  });

  const [form, setForm] = useState(getDefaultForm);

  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    if (!open) return;
    setForm(getDefaultForm());
    setAlert(null);
  }, [open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleClose = () => {
    setAlert(null);
    if (typeof onClose === "function") onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlert(null);

    if (!form.particulars.trim()) {
      setAlert({ type: "error", text: "Particulars (PCF name) is required." });
      return;
    }
    if (form.beginning === "" && form.disbursements === "" && form.replenishments === "") {
      setAlert({ type: "error", text: "Provide at least one numeric value (beginning, disbursements, or replenishments)." });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        particulars: form.particulars.trim(),
        date: form.date || null,
        beginning: form.beginning === "" ? null : Number(form.beginning),
        disbursements: form.disbursements === "" ? null : Number(form.disbursements),
        replenishments: form.replenishments === "" ? null : Number(form.replenishments),
        ending: form.ending === "" ? null : Number(form.ending),
        notes: form.notes?.trim() || null,
      };

      // Adjust endpoint if your backend uses a different path
      const res = await api.post("/pcf/", payload);
      const created = res.data ?? res;

      setAlert({ type: "success", text: "PCF row created." });

      if (typeof onCreated === "function") {
        try {
          onCreated(created);
        } catch (err) {
          console.error("onCreated callback error", err);
        }
      }

      setTimeout(() => handleClose(), 600);
    } catch (err) {
      console.error("Failed to create PCF", err);
      const msg =
        err?.response?.data?.detail ||
        (err?.response?.data && JSON.stringify(err.response.data)) ||
        err?.message ||
        "Failed to create PCF";
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
        <span>Add Cash On Hand (PCF)</span>
        <IconButton onClick={handleClose} size="small" aria-label="close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <form id="pcf-create-form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            {alert && <Alert severity={alert.type}>{alert.text}</Alert>}

            <TextField
              label="Particulars (e.g., PCF Office)"
              name="particulars"
              value={form.particulars}
              onChange={handleChange}
              fullWidth
              required
            />

            <TextField
              label="Date"
              name="date"
              type="date"
              value={form.date}
              onChange={handleChange}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />

            <TextField
              label="Beginning (₱)"
              name="beginning"
              type="number"
              inputProps={{ step: "0.01", min: 0 }}
              value={form.beginning}
              onChange={handleChange}
              fullWidth
            />

            <TextField
              label="Disbursements (₱)"
              name="disbursements"
              type="number"
              inputProps={{ step: "0.01", min: 0 }}
              value={form.disbursements}
              onChange={handleChange}
              fullWidth
            />

            <TextField
              label="Replenishments (₱)"
              name="replenishments"
              type="number"
              inputProps={{ step: "0.01", min: 0 }}
              value={form.replenishments}
              onChange={handleChange}
              fullWidth
            />

            <TextField
              label="Ending (optional, ₱)"
              name="ending"
              type="number"
              inputProps={{ step: "0.01", min: 0 }}
              value={form.ending}
              onChange={handleChange}
              fullWidth
            />

            <TextField
              label="Notes (optional)"
              name="notes"
              value={form.notes}
              onChange={handleChange}
              fullWidth
              multiline
              minRows={2}
            />
          </Stack>
        </form>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button type="submit" form="pcf-create-form" variant="contained" disabled={loading}>
          {loading ? <CircularProgress size={18} /> : "Create PCF"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}