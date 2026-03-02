import { useState, useEffect } from "react";
import {
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  MenuItem,
} from "@mui/material";

export default function AddTransaction() {
  const [form, setForm] = useState({
    bank_account: "",
    date: "",
    type: "",
    amount: "",
    description: "",
  });
  const [accounts, setAccounts] = useState([]);

  // Fetch bank accounts for dropdown
  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch("http://localhost:8000/bankaccounts/", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setAccounts(data));
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const res = await fetch("http://localhost:8000/transactions/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      alert("Transaction added successfully!");
      setForm({ bank_account: "", date: "", type: "", amount: "", description: "" });
    } else {
      alert("Failed to add transaction");
    }
  };

  return (
    <Paper sx={{ p: 3, m: 3 }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: "bold" }}>
        Add Transaction
      </Typography>
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: "flex", flexDirection: "column", gap: 2 }}
      >
        <TextField
          select
          label="Bank Account"
          name="bank_account"
          value={form.bank_account}
          onChange={handleChange}
        >
          {accounts.map((acc) => (
            <MenuItem key={acc.id} value={acc.id}>
              {acc.name} ({acc.account_number})
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Date"
          type="date"
          name="date"
          value={form.date}
          onChange={handleChange}
          InputLabelProps={{ shrink: true }}
        />
        <TextField
          select
          label="Type"
          name="type"
          value={form.type}
          onChange={handleChange}
        >
          <MenuItem value="deposit">Deposit</MenuItem>
          <MenuItem value="withdrawal">Withdrawal</MenuItem>
          <MenuItem value="transfer">Transfer</MenuItem>
        </TextField>
        <TextField
          label="Amount"
          type="number"
          name="amount"
          value={form.amount}
          onChange={handleChange}
        />
        <TextField
          label="Description"
          name="description"
          value={form.description}
          onChange={handleChange}
        />
        <Button type="submit" variant="contained" sx={{ bgcolor: "#0ea5e9" }}>
          Save
        </Button>
      </Box>
    </Paper>
  );
}
