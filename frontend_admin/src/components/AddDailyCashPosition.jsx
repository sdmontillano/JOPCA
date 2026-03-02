import { useState } from "react";
import { Box, TextField, Button, Paper, Typography } from "@mui/material";

export default function AddDailyCashPosition() {
  const [form, setForm] = useState({
    date: "",
    beginning_balance: 0,
    collections: 0,
    disbursements: 0,
    transfers: 0,
    returned_checks: 0,
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    const res = await fetch("http://localhost:8000/dailycashpositions/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      alert("Daily cash position added successfully!");
      setForm({
        date: "",
        beginning_balance: 0,
        collections: 0,
        disbursements: 0,
        transfers: 0,
        returned_checks: 0,
      });
    } else {
      alert("Failed to add daily cash position");
    }
  };

  return (
    <Paper sx={{ p: 3, m: 3 }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: "bold" }}>
        Add Daily Cash Position
      </Typography>
      <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField
          label="Date"
          type="date"
          name="date"
          value={form.date}
          onChange={handleChange}
          InputLabelProps={{ shrink: true }}
        />
        <TextField label="Beginning Balance" type="number" name="beginning_balance" value={form.beginning_balance} onChange={handleChange} />
        <TextField label="Collections" type="number" name="collections" value={form.collections} onChange={handleChange} />
        <TextField label="Disbursements" type="number" name="disbursements" value={form.disbursements} onChange={handleChange} />
        <TextField label="Transfers" type="number" name="transfers" value={form.transfers} onChange={handleChange} />
        <TextField label="Returned Checks" type="number" name="returned_checks" value={form.returned_checks} onChange={handleChange} />
        <Button type="submit" variant="contained" sx={{ bgcolor: "#0ea5e9" }}>
          Save
        </Button>
      </Box>
    </Paper>
  );
}
