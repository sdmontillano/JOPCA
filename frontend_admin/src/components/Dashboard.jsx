import { useState, useEffect } from "react";
import { Paper, Typography, Box } from "@mui/material";

export default function Dashboard() {
  const [cashOnHand, setCashOnHand] = useState(0);
  const [cashInBank, setCashInBank] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("token");

    // Fetch daily cash positions
    fetch("http://localhost:8000/dailycashpositions/", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          // Example: use latest record
          const latest = data[0]; // assuming sorted by date desc
          const onHand =
            parseFloat(latest.collections || 0) -
            parseFloat(latest.disbursements || 0) -
            parseFloat(latest.returned_checks || 0);
          setCashOnHand(onHand);
        }
      });

    // Fetch bank accounts for cash in bank
    fetch("http://localhost:8000/bankaccounts/", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((accounts) => {
        if (Array.isArray(accounts)) {
          const total = accounts.reduce(
            (sum, acc) => sum + parseFloat(acc.opening_balance || 0),
            0
          );
          setCashInBank(total);
        }
      });
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: "bold" }}>
        Daily Cash Position
      </Typography>
      <Box sx={{ display: "flex", gap: 3 }}>
        <Paper
          sx={{
            flex: 1,
            p: 3,
            bgcolor: "#0ea5e9",
            color: "white",
            textAlign: "center",
          }}
        >
          <Typography variant="h6">Cash on Hand</Typography>
          <Typography variant="h4">₱{cashOnHand.toFixed(2)}</Typography>
        </Paper>
        <Paper
          sx={{
            flex: 1,
            p: 3,
            bgcolor: "#22c55e",
            color: "white",
            textAlign: "center",
          }}
        >
          <Typography variant="h6">Cash in Bank</Typography>
          <Typography variant="h4">₱{cashInBank.toFixed(2)}</Typography>
        </Paper>
      </Box>
    </Box>
  );
}
