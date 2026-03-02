import { useState } from "react";
import { Box, TextField, Button, Paper, Typography, MenuItem } from "@mui/material";

export default function AddBankAccount() {
  const [form, setForm] = useState({
    name: "",
    account_number: "",
    area: "Main Office",
    opening_balance: 0,
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const res = await fetch("http://localhost:8000/bankaccounts/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      alert("Bank account added successfully!");
      setForm({ name: "", account_number: "", area: "Main Office", opening_balance: 0 });
    } else {
      alert("Failed to add bank account");
    }
  };

  return (
    <Paper sx={{ p: 3, m: 3 }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: "bold" }}>
        Add Bank Account
      </Typography>
      <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField label="Name" name="name" value={form.name} onChange={handleChange} />
        <TextField label="Account Number" name="account_number" value={form.account_number} onChange={handleChange} />
        <TextField select label="Area" name="area" value={form.area} onChange={handleChange}>
          <MenuItem value="Main Office">Main Office</MenuItem>
          <MenuItem value="Quarry">Quarry</MenuItem>
          <MenuItem value="Branch">Branch</MenuItem>
        </TextField>
        <TextField
          label="Opening Balance"
          type="number"
          name="opening_balance"
          value={form.opening_balance}
          onChange={handleChange}
        />
        <Button type="submit" variant="contained" sx={{ bgcolor: "#0ea5e9" }}>
          Save
        </Button>
      </Box>
    </Paper>
  );
}
