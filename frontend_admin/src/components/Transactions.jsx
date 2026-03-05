// src/components/Transactions.jsx
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
  TextField,
  MenuItem,
  Pagination,
  Stack,
  Alert,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import api from "../services/tokenService";

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ Default date = today
  const todayIsoDate = new Date().toISOString().slice(0, 10);

  const [filters, setFilters] = useState({
    account_number: "",
    type: "",
    date: todayIsoDate,
  });

  // ✅ Pagination
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);

  const navigate = useNavigate();

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

  const formatPeso = (value) =>
    `₱${Number(value ?? 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  // ✅ Fetch transactions
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters.account_number.trim()) {
        params.append("account_number", filters.account_number.trim());
      }
      if (filters.type) params.append("type", filters.type);
      if (filters.date) params.append("date", filters.date);
      params.append("page", page);

      const res = await api.get(`/transactions/?${params.toString()}`);
      const data = res.data;
      const results = Array.isArray(data) ? data : data.results ?? [];
      setTransactions(results);
      setCount(data.count ?? results.length);
    } catch (err) {
      console.error("Error fetching transactions", err);
      setError("❌ Failed to load transactions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [page]);

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const applyFilters = () => {
    setPage(1);
    fetchTransactions();
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Button variant="text" onClick={() => navigate("/dashboard")} sx={{ mb: 2 }}>
        ← Back to Dashboard
      </Button>

      <Typography variant="h5" sx={{ mb: 2, fontWeight: "bold" }}>
        Transactions
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* ✅ Filters with Apply button */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          label="Account Number"
          name="account_number"
          value={filters.account_number}
          onChange={handleFilterChange}
          placeholder="e.g. 099"
          sx={{ minWidth: 180 }}
        />
        <TextField
          select
          label="Type"
          name="type"
          value={filters.type}
          onChange={handleFilterChange}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">All</MenuItem>
          {transactionTypes.map((t) => (
            <MenuItem key={t.value} value={t.value}>
              {t.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Date"
          name="date"
          type="date"
          value={filters.date}
          onChange={handleFilterChange}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 180 }}
        />
        <Button
          variant="contained"
          color="primary"
          onClick={applyFilters}
          sx={{ bgcolor: "#22c55e", "&:hover": { bgcolor: "#16a34a" } }}
        >
          Apply Filters
        </Button>
      </Stack>

      <Paper sx={{ p: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Type</TableCell>
              <TableCell align="right">Amount (₱)</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Bank</TableCell>
              <TableCell>Added By</TableCell>   {/* NEW */}
              <TableCell>Created At</TableCell> {/* NEW */}
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
                  <TableCell>
                    {t.bank_account?.name} ({t.bank_account?.account_number})
                  </TableCell>
                  <TableCell>{t.created_by_username || "-"}</TableCell> {/* NEW */}
                  <TableCell>
                    {t.created_at ? new Date(t.created_at).toLocaleString() : "-"}
                  </TableCell> {/* NEW */}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No transactions found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* ✅ Pagination */}
        <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
          <Pagination
            count={Math.ceil(count / 10)} // assuming backend page size = 10
            page={page}
            onChange={(e, value) => setPage(value)}
          />
        </Box>
      </Paper>
    </Box>
  );
}