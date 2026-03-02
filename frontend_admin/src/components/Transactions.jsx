import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  Typography,
  TableContainer,
} from "@mui/material";

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch("http://localhost:8000/transactions/", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setTransactions(data));
  }, []);

  return (
    <Paper sx={{ p: 3, m: 3 }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: "bold" }}>
        Transactions
      </Typography>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: "#e2e8f0" }}>
              <TableCell>Date</TableCell>
              <TableCell>Account</TableCell>
              <TableCell>Type</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell>Description</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.map((t, i) => (
              <TableRow key={i} hover>
                <TableCell>{t.date}</TableCell>
                <TableCell>{t.account}</TableCell>
                <TableCell>{t.type}</TableCell>
                <TableCell align="right">
                  ${Number(t.amount).toLocaleString()}
                </TableCell>
                <TableCell>{t.description}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
