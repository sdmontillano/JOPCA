import { useEffect, useState } from "react";
import {
  Paper,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
  Alert,
  Button,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate(); // ✅ hook for navigation

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch("http://localhost:8000/transactions/", {
      headers: { Authorization: `Token ${token}` }, // ✅ authtoken format
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch transactions");
        return res.json();
      })
      .then((data) => {
        setTransactions(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) return <CircularProgress sx={{ m: 3 }} />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Paper
      sx={{
        p: 3,
        m: 3,
        borderRadius: 3,
        boxShadow: 3,
        bgcolor: "#f9fafb", // Twitter/X inspired light background
      }}
    >
      <Typography
        variant="h5"
        sx={{ mb: 2, fontWeight: "bold", color: "#0ea5e9" }}
      >
        Transactions
      </Typography>

      <Table>
        <TableHead>
          <TableRow sx={{ bgcolor: "#e5e7eb" }}>
            <TableCell sx={{ fontWeight: "bold" }}>Date</TableCell>
            <TableCell sx={{ fontWeight: "bold" }}>Type</TableCell>
            <TableCell sx={{ fontWeight: "bold" }}>Amount (₱)</TableCell>
            <TableCell sx={{ fontWeight: "bold" }}>Description</TableCell>
            <TableCell sx={{ fontWeight: "bold" }}>Bank Account</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {transactions.map((tx) => (
            <TableRow
              key={tx.id}
              sx={{
                "&:hover": { bgcolor: "#f1f5f9" }, // subtle hover effect
              }}
            >
              <TableCell>{tx.date}</TableCell>
              <TableCell sx={{ textTransform: "capitalize" }}>
                {tx.type}
              </TableCell>
              <TableCell>
                ₱{new Intl.NumberFormat("en-PH").format(tx.amount)}
              </TableCell>
              <TableCell>{tx.description}</TableCell>
              <TableCell>
                {tx.bank_account?.name} ({tx.bank_account?.account_number})
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* ✅ Back to Dashboard button */}
      <Button
        variant="contained"
        sx={{
          mt: 3,
          bgcolor: "#0ea5e9",
          "&:hover": { bgcolor: "#0284c7" },
          borderRadius: 2,
          fontWeight: "bold",
        }}
        onClick={() => navigate("/dashboard")}
      >
        Back to Dashboard
      </Button>
    </Paper>
  );
}
