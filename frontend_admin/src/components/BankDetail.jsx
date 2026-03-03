// src/components/BankDetail.jsx
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
} from "@mui/material";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/tokenService";

export default function BankDetail() {
  const { id } = useParams();
  const [bank, setBank] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        // Try to fetch bank details
        const bankRes = await api.get(`/bankaccounts/${id}/`);
        if (!mounted) return;
        setBank(bankRes.data);

        // Preferred: ask backend to filter by bank id
        // Try common query param names in order
        const queries = [
          `/transactions/?bank_account_id=${id}`,
          `/transactions/?bank=${id}`,
          `/transactions/?account=${id}`,
        ];

        let txRes = null;
        for (const q of queries) {
          try {
            const res = await api.get(q);
            // If the response looks like it's filtered (array or results with same bank id), accept it
            const data = Array.isArray(res.data) ? res.data : res.data.results ?? [];
            // quick heuristic: if all returned txs belong to this bank or array is empty, accept
            const allMatch = data.length === 0 || data.every((t) => {
              const bankId = t.bank_account_id ?? t.bank_account ?? t.account ?? null;
              return bankId === null || String(bankId) === String(id);
            });
            if (allMatch) {
              txRes = res;
              break;
            }
            // otherwise try next query param
          } catch (e) {
            // ignore and try next query
          }
        }

        // If none of the filtered queries returned, fetch all transactions and filter client-side
        if (!txRes) {
          const res = await api.get("/transactions/");
          txRes = res;
        }

        if (!mounted) return;
        const rawTx = Array.isArray(txRes.data) ? txRes.data : txRes.data.results ?? [];
        // Final filter client-side to ensure only this bank's transactions are shown
        const filtered = rawTx.filter((t) => {
          const bankId = t.bank_account_id ?? t.bank_account ?? t.account ?? null;
          return String(bankId) === String(id);
        });

        setTransactions(filtered);
      } catch (err) {
        console.error("Error fetching bank detail", err);
        if (mounted) setError("Failed to load bank details or transactions.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchData();
    return () => {
      mounted = false;
    };
  }, [id]);

  const formatPeso = (value) =>
    `₱${Number(value ?? 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

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
        <Typography color="error" sx={{ mt: 2 }}>
          {error}
        </Typography>
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
                  <TableCell>{t.date ?? t.created_at ?? "-"}</TableCell>
                  <TableCell>{t.type ?? "-"}</TableCell>
                  <TableCell align="right">{formatPeso(t.amount)}</TableCell>
                  <TableCell>{t.description || "-"}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4}>No transactions found for this account.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}