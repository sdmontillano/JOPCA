// src/components/AddTransaction.jsx
import React, { useState, useEffect } from "react";
import {
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  MenuItem,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  CircularProgress,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useNavigate } from "react-router-dom";
import api from "../services/tokenService";
import { useToast } from "../ToastContext";

/**
 * AddTransaction component
 *
 * Usage patterns:
 * 1. Modal usage (preferred for in-dashboard flows):
 *    <AddTransaction open={open} onClose={() => setOpen(false)} onCreated={(txn) => {...}} />
 *
 * 2. Standalone page (keeps original behavior):
 *    <AddTransaction />  // will render as a Paper page and navigate back to /dashboard on success
 *
 * The component will fetch bank accounts from /bankaccounts/ and post to /transactions-crud/.
 */
export default function AddTransaction({ open: openProp = undefined, onClose = undefined, onCreated = undefined }) {
  const isControlled = typeof openProp !== "undefined";
  const [open, setOpen] = useState(Boolean(openProp));
  useEffect(() => {
    if (isControlled) setOpen(Boolean(openProp));
  }, [openProp, isControlled]);

  const todayIsoDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const [form, setForm] = useState({
    amount: "",
    description: "",
    type: "deposit",
    bank_account: "",
    date: todayIsoDate,
    check_no: "",
    reference: "",
    pdc_status: "",
  });
  const [fromBank, setFromBank] = useState('');
  const [toBank, setToBank] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const transactionTypes = [
    { value: "deposit", label: "Deposit" },
    { value: "disbursement", label: "Disbursement" },
    { value: "adjustment_in", label: "Adjustment (+)" },
    { value: "adjustment_out", label: "Adjustment (-)" },
    { value: "bank_charges", label: "Bank Charges" },
    { value: "fund_transfer", label: "Fund Transfer" },
  ];

  const pdcStatuses = [
    { value: "", label: "-- PDC Status --" },
    { value: "outstanding", label: "Outstanding" },
    { value: "cleared", label: "Cleared" },
    { value: "bounced", label: "Bounced" },
  ];

  // fetch accounts (used both in modal and standalone)
  useEffect(() => {
    let mounted = true;
    api
      .get("/api/bankaccounts/")
      .then((res) => {
        if (!mounted) return;
        const data = res.data ?? res;
        const list = Array.isArray(data) ? data : data.results ?? [];
        setAccounts(list);
      })
      .catch((err) => {
        console.error("Failed to fetch accounts", err);
        if (!mounted) return;
        setMessage({ type: "error", text: "❌ Error fetching bank accounts." });
      });
    return () => {
      mounted = false;
    };
  }, []);

  // reset form helper
  const resetForm = () => {
    setForm({
      amount: "",
      description: "",
      type: "deposit",
      bank_account: "",
      date: todayIsoDate,
      check_no: "",
      reference: "",
      pdc_status: "",
    });
    setFromBank('');
    setToBank('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const closeLocal = () => {
    if (isControlled) {
      if (typeof onClose === "function") onClose();
    } else {
      setOpen(false);
      navigate("/dashboard");
    }
  };

  const handleSubmit = async (e) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    setMessage(null);

    const isFundTransfer = form.type === 'fund_transfer';

    if (isFundTransfer) {
      if (!fromBank || !toBank) {
        setMessage({ type: "error", text: "Please select both From Bank and To Bank." });
        return;
      }
      if (fromBank === toBank) {
        setMessage({ type: "error", text: "From Bank and To Bank must be different." });
        return;
      }
    } else {
      if (!form.amount || Number(form.amount) <= 0) {
        setMessage({ type: "error", text: "Amount must be greater than 0." });
        return;
      }
      if (!form.bank_account) {
        setMessage({ type: "error", text: "Please select a bank account." });
        return;
      }
    }

    setLoading(true);
    try {
      if (isFundTransfer) {
        const payload = {
          from_bank: parseInt(fromBank, 10),
          to_bank: parseInt(toBank, 10),
          date: form.date,
          amount: parseFloat(form.amount),
          description: form.description?.trim() || '',
        };
        await api.post("/api/fund-transfers/", payload);
        showToast("Fund transfer created successfully!", "success");
        setMessage({ type: "success", text: "✅ Fund transfer added successfully!" });
        setFromBank('');
        setToBank('');
      } else {
        const payload = {
          amount: form.amount === "" ? null : parseFloat(form.amount),
          type: form.type,
          date: form.date,
          bank_account_id: form.bank_account === "" ? null : parseInt(form.bank_account, 10),
          description: form.description?.trim() || null,
          check_no: form.check_no?.trim() || null,
          reference: form.reference?.trim() || null,
          pdc_status: form.pdc_status || null,
        };
        const res = await api.post("/api/transactions-crud/", payload);
        const created = res.data ?? res;
        showToast("Transaction created successfully!", "success");
        setMessage({ type: "success", text: "✅ Transaction added successfully!" });
      }
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
      console.error("Failed to add transaction", err);
      let errMsg = "Failed to add transaction.";
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
      } catch {
        // ignore parsing errors
      }
      showToast(errMsg, "error");
      setMessage({ type: "error", text: errMsg });
    } finally {
      setLoading(false);
    }
  };

  // Render as Dialog when used as modal (open prop provided), otherwise render as standalone Paper page
  if (isControlled) {
    return (
      <Dialog
        open={Boolean(open)}
        onClose={() => {
          resetForm();
          if (typeof onClose === "function") onClose();
        }}
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
          <span>Add Transaction</span>
          <IconButton
            size="small"
            onClick={() => {
              resetForm();
              if (typeof onClose === "function") onClose();
            }}
            aria-label="close"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          <Box component="form" id="add-transaction-form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
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

            <TextField label="Description (optional)" name="description" value={form.description} onChange={handleChange} fullWidth />

            <TextField select label="Type" name="type" value={form.type} onChange={handleChange} fullWidth>
              {transactionTypes.map((t) => (
                <MenuItem key={t.value} value={t.value}>
                  {t.label}
                </MenuItem>
              ))}
            </TextField>

            {form.type === 'fund_transfer' ? (
              <>
                <TextField select label="From Bank" value={fromBank} onChange={(e) => setFromBank(e.target.value)} required fullWidth>
                  {accounts.map((acc) => (
                    <MenuItem key={acc.id} value={acc.id}>
                      {acc.name} ({acc.account_number})
                    </MenuItem>
                  ))}
                </TextField>
                <TextField select label="To Bank" value={toBank} onChange={(e) => setToBank(e.target.value)} required fullWidth>
                  {accounts.map((acc) => (
                    <MenuItem key={acc.id} value={acc.id}>
                      {acc.name} ({acc.account_number})
                    </MenuItem>
                  ))}
                </TextField>
              </>
            ) : (
              <TextField select label="Bank Account" name="bank_account" value={form.bank_account} onChange={handleChange} required fullWidth>
                {accounts.map((acc) => (
                  <MenuItem key={acc.id} value={acc.id}>
                    {acc.name} ({acc.account_number})
                  </MenuItem>
                ))}
              </TextField>
            )}

            <TextField label="Date" name="date" type="date" value={form.date} onChange={handleChange} InputLabelProps={{ shrink: true }} required fullWidth />

            {message && (
              <Alert severity={message.type} sx={{ mt: 1 }}>
                {message.text}
              </Alert>
            )}
          </Box>
        </DialogContent>

        <DialogActions>
          <Button
            type="button"
            onClick={() => {
              resetForm();
              if (typeof onClose === "function") onClose();
            }}
          >
            Cancel
          </Button>
          <Button type="submit" form="add-transaction-form" variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={18} /> : "Save Transaction"}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  // Standalone page rendering (original behavior)
  return (
    <Paper sx={{ p: 3, m: 3 }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: "bold", color: "primary.main" }}>
        Add Transaction
      </Typography>

      <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField
          label="Amount (₱)"
          name="amount"
          type="number"
          value={form.amount}
          onChange={handleChange}
          inputProps={{ min: 0, step: "0.01" }}
          required
        />

        <TextField label="Description (optional)" name="description" value={form.description} onChange={handleChange} />

        <TextField select label="Type" name="type" value={form.type} onChange={handleChange}>
          {transactionTypes.map((t) => (
            <MenuItem key={t.value} value={t.value}>
              {t.label}
            </MenuItem>
          ))}
        </TextField>

        {form.type === 'fund_transfer' ? (
          <>
            <TextField select label="From Bank" value={fromBank} onChange={(e) => setFromBank(e.target.value)} required>
              {accounts.map((acc) => (
                <MenuItem key={acc.id} value={acc.id}>
                  {acc.name} ({acc.account_number})
                </MenuItem>
              ))}
            </TextField>
            <TextField select label="To Bank" value={toBank} onChange={(e) => setToBank(e.target.value)} required>
              {accounts.map((acc) => (
                <MenuItem key={acc.id} value={acc.id}>
                  {acc.name} ({acc.account_number})
                </MenuItem>
              ))}
            </TextField>
          </>
        ) : (
          <TextField select label="Bank Account" name="bank_account" value={form.bank_account} onChange={handleChange} required>
            {accounts.map((acc) => (
              <MenuItem key={acc.id} value={acc.id}>
                {acc.name} ({acc.account_number})
              </MenuItem>
            ))}
          </TextField>
        )}

        <TextField label="Date" name="date" type="date" value={form.date} onChange={handleChange} InputLabelProps={{ shrink: true }} required />

        <Box sx={{ display: "flex", gap: 2 }}>
          <Button type="submit" variant="contained" sx={{ bgcolor: "#22c55e", "&:hover": { bgcolor: "#16a34a" } }} disabled={loading}>
            {loading ? <CircularProgress size={18} /> : "Save Transaction"}
          </Button>

          <Button variant="outlined" color="primary" type="button" onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </Button>
        </Box>
      </Box>

      {message && (
        <Alert severity={message.type} sx={{ mt: 2 }}>
          {message.text}
        </Alert>
      )}
    </Paper>
  );
}