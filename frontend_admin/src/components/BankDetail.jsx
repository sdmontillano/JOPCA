import { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
  Button,
  Stack,
  Alert,
} from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/tokenService";

export default function BankDetail() {
  const { id } = useParams(); // bank id from route
  const navigate = useNavigate();

  const [bank, setBank] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const formatPeso = (value) =>
    `₱${Number(value ?? 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch bank details
        const bankRes = await api.get(`/bankaccounts/${id}/`);
        if (!mounted) return;
        setBank(bankRes.data);

        // Fetch transactions filtered by bank_account_id
        const txRes = await api.get(`/transactions/?bank_account_id=${id}`);
        if (!mounted) return;

        const rawTx = Array.isArray(txRes.data)
          ? txRes.data
          : txRes.data.results ?? [];

        setTransactions(rawTx);
      } catch (err) {
        console.error("Error fetching bank detail", err);
        if (mounted) setError("❌ Failed to load bank details or transactions.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchData();
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Button variant="text" onClick={() => navigate("/banks")}>
        ← Back to Banks
      </Button>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        sx={{ mt: 2, mb: 2, gap: 2 }}
      >
        <Typography variant="h5">
          {bank ? `${bank.name} (${bank.account_number})` : "Bank Account"}
        </Typography>

        <Paper sx={{ p: 2, bgcolor: "#f1f5f9" }}>
          <Typography variant="subtitle2">Current Balance</Typography>
          <Typography variant="h6" sx={{ fontWeight: "bold" }}>
            {formatPeso(bank?.balance ?? 0)}
          </Typography>
        </Paper>
      </Stack>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Transactions
        </Typography>

        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Type</TableCell>
              <TableCell align="right">Amount (₱)</TableCell>
              <TableCell>Description</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.length > 0 ? (
              transactions.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{t.date ?? "-"}</TableCell>
                  <TableCell>{t.type ?? "-"}</TableCell>
                  <TableCell align="right">{formatPeso(t.amount)}</TableCell>
                  <TableCell>{t.description || "-"}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} align="center">
                  No transactions found for this account.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}