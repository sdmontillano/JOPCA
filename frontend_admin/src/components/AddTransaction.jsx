import { useState, useEffect } from "react";
import {
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  MenuItem,
  Alert,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

export default function AddTransaction() {
  const todayIsoDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const [form, setForm] = useState({
    amount: "",
    description: "",
    type: "deposit",
    bank_account: "",
    date: todayIsoDate,
  });
  const [accounts, setAccounts] = useState([]);
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();

  // ✅ Transaction types aligned with Django model
  const transactionTypes = [
    { value: "deposit", label: "Deposit" },
    { value: "collections", label: "Collections" },
    { value: "local_deposits", label: "Local Deposits" },
    { value: "disbursement", label: "Disbursement" },
    { value: "returned_check", label: "Returned Check" },
    { value: "bank_charges", label: "Bank Charges" },
    { value: "adjustments", label: "Adjustments" },
    { value: "transfer", label: "Transfer" },
    { value: "fund_transfer", label: "Fund Transfer" },
    { value: "interbank_transfer", label: "Interbank Transfer" },
    { value: "post_dated_check", label: "Post-Dated Check" },
  ];

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch("http://localhost:8000/bankaccounts/", {
      headers: { Authorization: `Token ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch accounts");
        return res.json();
      })
      .then((data) => setAccounts(data))
      .catch(() =>
        setMessage({ type: "error", text: "❌ Error fetching bank accounts." })
      );
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    const token = localStorage.getItem("token");

    // ✅ Payload matches backend expectations
    const payload = {
      amount: form.amount === "" ? null : parseFloat(form.amount),
      type: form.type,
      date: form.date,
      bank_account_id:
        form.bank_account === "" ? null : parseInt(form.bank_account, 10),
      description: form.description?.trim() || null,
    };

    try {
      const res = await fetch("http://localhost:8000/transactions-crud/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setMessage({
          type: "success",
          text: "✅ Transaction added successfully!",
        });
        setForm({
          amount: "",
          description: "",
          type: "deposit",
          bank_account: "",
          date: todayIsoDate,
        });
        setTimeout(() => navigate("/dashboard"), 1000);
      } else {
        let errMsg = "❌ Failed to add transaction.";
        try {
          const errJson = await res.json();
          const details = Object.entries(errJson)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
            .join(" | ");
          if (details) errMsg += ` ${details}`;
        } catch {
          const text = await res.text().catch(() => null);
          if (text) errMsg += ` ${text}`;
        }
        setMessage({ type: "error", text: errMsg });
      }
    } catch {
      setMessage({ type: "error", text: "❌ Error connecting to server." });
    }
  };

  return (
    <Paper sx={{ p: 3, m: 3 }}>
      <Typography
        variant="h5"
        sx={{ mb: 2, fontWeight: "bold", color: "primary.main" }}
      >
        Add Transaction
      </Typography>

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: "flex", flexDirection: "column", gap: 2 }}
      >
        <TextField
          label="Amount (₱)"
          name="amount"
          type="number"
          value={form.amount}
          onChange={handleChange}
          inputProps={{ min: 0, step: "0.01" }}
          required
        />

        <TextField
          label="Description (optional)"
          name="description"
          value={form.description}
          onChange={handleChange}
        />

        <TextField
          select
          label="Type"
          name="type"
          value={form.type}
          onChange={handleChange}
        >
          {transactionTypes.map((t) => (
            <MenuItem key={t.value} value={t.value}>
              {t.label}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="Bank Account"
          name="bank_account"
          value={form.bank_account}
          onChange={handleChange}
          required
        >
          {accounts.map((acc) => (
            <MenuItem key={acc.id} value={acc.id}>
              {acc.name} ({acc.account_number})
            </MenuItem>
          ))}
        </TextField>

        <TextField
          label="Date"
          name="date"
          type="date"
          value={form.date}
          onChange={handleChange}
          InputLabelProps={{ shrink: true }}
          required
        />

        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            type="submit"
            variant="contained"
            sx={{ bgcolor: "#22c55e", "&:hover": { bgcolor: "#16a34a" } }}
          >
            Save Transaction
          </Button>

          <Button
            variant="outlined"
            color="primary"
            onClick={() => navigate("/dashboard")}
          >
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