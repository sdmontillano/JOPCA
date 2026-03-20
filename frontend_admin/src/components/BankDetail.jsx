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
  Alert,
  TextField,
  MenuItem,
  Pagination,
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

  const todayIsoDate = new Date().toISOString().slice(0, 10);

  const [filters, setFilters] = useState({
    type: "",
    date: todayIsoDate,
  });

  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);

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

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const bankRes = await api.get(`/bankaccounts/${id}/`);
      setBank(bankRes.data);

      const params = new URLSearchParams();
      params.append("bank_account_id", id);
      if (filters.type) params.append("type", filters.type);
      if (filters.date) params.append("date", filters.date);
      params.append("page", page);

      const txRes = await api.get(`/transactions/?${params.toString()}`);
      const data = txRes.data;
      const results = Array.isArray(data) ? data : data.results ?? [];
      setTransactions(results);
      setCount(data.count ?? results.length);
    } catch (err) {
      console.error("Error fetching bank detail", err);
      setError("❌ Failed to load bank details or transactions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, page]);

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const applyFilters = () => {
    setPage(1);
    fetchData();
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

      {/* ✅ Filters */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 2 }}>
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
                  <TableCell>{t.created_by_username || "-"}</TableCell> {/* NEW */}
                  <TableCell>
                    {t.created_at ? new Date(t.created_at).toLocaleString() : "-"}
                  </TableCell> {/* NEW */}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No transactions found for this account.
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