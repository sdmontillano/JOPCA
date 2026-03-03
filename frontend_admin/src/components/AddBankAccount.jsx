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

export default function AddBankAccount() {
  const [form, setForm] = useState({
    name: "",
    account_number: "",
    area: "main_office",
    opening_balance: "",
  });
  const [accounts, setAccounts] = useState([]);
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();

  // ✅ Fetch existing accounts for duplicate check
  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch("http://localhost:8000/bankaccounts/", {
      headers: { Authorization: `Token ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setAccounts(data))
      .catch(() =>
        setMessage({ type: "error", text: "❌ Error fetching accounts." })
      );
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");

    // ✅ Check if account number already exists
    const exists = accounts.some(
      (acc) => acc.account_number === form.account_number
    );
    if (exists) {
      setMessage({ type: "error", text: "❌ Account number already exists!" });
      return;
    }

    try {
      const res = await fetch("http://localhost:8000/bankaccounts/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        setMessage({
          type: "success",
          text: "✅ Bank account added successfully!",
        });
        setForm({
          name: "",
          account_number: "",
          area: "main_office",
          opening_balance: "",
        });
        // ✅ redirect back to dashboard after short delay
        setTimeout(() => navigate("/dashboard"), 1000);
      } else {
        setMessage({ type: "error", text: "❌ Failed to add bank account." });
      }
    } catch {
      setMessage({ type: "error", text: "❌ Error connecting to server." });
    }
  };

  return (
    <Paper sx={{ p: 3, m: 3 }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: "bold", color: "primary.main" }}>
        Add Bank Account
      </Typography>
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: "flex", flexDirection: "column", gap: 2 }}
      >
        <TextField
          label="Bank Name"
          name="name"
          value={form.name}
          onChange={handleChange}
          required
        />
        <TextField
          label="Account Number"
          name="account_number"
          value={form.account_number}
          onChange={handleChange}
          required
        />
        <TextField
          select
          label="Area"
          name="area"
          value={form.area}
          onChange={handleChange}
        >
          <MenuItem value="main_office">Main Office</MenuItem>
          <MenuItem value="tagoloan_parts">Tagoloan Parts</MenuItem>
          <MenuItem value="midsayap_parts">Midsayap Parts</MenuItem>
          <MenuItem value="valencia_parts">Valencia Parts</MenuItem>
        </TextField>
        <TextField
          label="Opening Balance (₱)"
          name="opening_balance"
          type="number"
          value={form.opening_balance}
          onChange={handleChange}
          inputProps={{ min: 0 }}
          required
        />

        {/* ✅ Save + Back buttons */}
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            type="submit"
            variant="contained"
            sx={{ bgcolor: "#22c55e", "&:hover": { bgcolor: "#16a34a" } }}
          >
            Save Bank Account
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
