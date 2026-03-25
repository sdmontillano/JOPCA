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
  IconButton,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/tokenService";

export default function BankDetail() {
  const { id } = useParams(); // bank id from route
  const navigate = useNavigate();

  const [bank, setBank] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState({
    type: "",
    date: "",
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

  const clearFilters = () => {
    setFilters({ type: "", date: "" });
    setPage(1);
    fetchData();
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
    <Box sx={{ minHeight: "100vh", bgcolor: "#F9FAFB", p: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Paper
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 1,
          border: "1px solid",
          borderColor: "#E5E7EB",
          bgcolor: "#FFFFFF",
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <IconButton onClick={() => navigate("/banks")}>
              <ArrowBackIcon />
            </IconButton>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: "primary.dark" }}>
                {bank ? `${bank.name} (${bank.account_number})` : "Bank Account"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Bank transactions and details
              </Typography>
            </Box>
          </Box>
          <Paper sx={{ p: 2, bgcolor: "#1E293B", borderRadius: 1 }}>
            <Typography variant="subtitle2" sx={{ color: "#fff" }}>Current Balance</Typography>
            <Typography variant="h6" sx={{ fontWeight: "bold", color: "#fff" }}>
              {formatPeso(bank?.balance ?? 0)}
            </Typography>
          </Paper>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
          <TextField
            select
            label="Transaction Type"
            name="type"
            value={filters.type}
            onChange={handleFilterChange}
            sx={{ minWidth: 180 }}
            size="small"
          >
            <MenuItem value="">All Types</MenuItem>
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
            size="small"
          />
          <Button
            variant="contained"
            onClick={applyFilters}
            sx={{ bgcolor: "#1E293B", "&:hover": { bgcolor: "#0f172a" } }}
          >
            Apply
          </Button>
          <Button
            variant="outlined"
            onClick={clearFilters}
          >
            Clear
          </Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 3, borderRadius: 1, border: "1px solid", borderColor: "#E5E7EB", bgcolor: "#FFFFFF" }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
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