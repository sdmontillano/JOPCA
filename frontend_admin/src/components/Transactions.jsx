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
  IconButton,
  Chip,
  InputAdornment,
  TableContainer,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import ExportButtons from "./ExportButtons";
import api from "../services/tokenService";

const INFLOW_TYPES = ['collection', 'deposit', 'collections', 'local_deposits'];
const OUTFLOW_TYPES = ['disbursement', 'withdrawal', 'returned_check', 'bank_charges', 'adjustments', 'fund_transfer', 'transfer', 'interbank_transfer', 'post_dated_check'];

const typeColors = {
  collections: { bg: "#DCFCE7", color: "#166534" },
  local_deposits: { bg: "#DCFCE7", color: "#166534" },
  deposit: { bg: "#DCFCE7", color: "#166534" },
  disbursement: { bg: "#FEE2E2", color: "#991B1B" },
  returned_check: { bg: "#FEF3C7", color: "#B45309" },
  bank_charges: { bg: "#FEE2E2", color: "#991B1B" },
  adjustments: { bg: "#F3F4F6", color: "#374151" },
  fund_transfer: { bg: "#DBEAFE", color: "#1D4ED8" },
  transfer: { bg: "#DBEAFE", color: "#1D4ED8" },
  interbank_transfer: { bg: "#DBEAFE", color: "#1D4ED8" },
  post_dated_check: { bg: "#F3F4F6", color: "#374151" },
};

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [bankAccounts, setBankAccounts] = useState([]);

  // Filters - NO default date (show all by default)
  const [filters, setFilters] = useState({
    bank_account_id: "",
    type: "",
    date: "",
    search: "",
  });

  // Pagination
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);

  const navigate = useNavigate();

  const transactionTypes = [
    { value: "", label: "All Types" },
    { value: "collections", label: "Collections" },
    { value: "local_deposits", label: "Local Deposits" },
    { value: "deposit", label: "Deposit" },
    { value: "disbursement", label: "Disbursement" },
    { value: "returned_check", label: "Returned Check" },
    { value: "bank_charges", label: "Bank Charges" },
    { value: "adjustments", label: "Adjustments" },
    { value: "transfer", label: "Transfer" },
    { value: "fund_transfer", label: "Fund Transfer" },
    { value: "interbank_transfer", label: "Interbank Transfer" },
    { value: "post_dated_check", label: "Post-Dated Check" },
  ];

  const formatCurrency = (value) =>
    `₱${Number(value ?? 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleString("en-PH", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  // Fetch bank accounts for filter dropdown
  const fetchBankAccounts = async () => {
    try {
      const res = await api.get("/bankaccounts/");
      const data = res.data?.results ?? res.data ?? [];
      setBankAccounts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching bank accounts", err);
      setBankAccounts([]);
    }
  };

  // Fetch transactions
  const fetchTransactions = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters.bank_account_id) {
        params.append("bank_account_id", filters.bank_account_id);
      }
      if (filters.type) params.append("type", filters.type);
      if (filters.date) params.append("date", filters.date);
      if (filters.search.trim()) {
        params.append("search", filters.search.trim());
      }
      params.append("page", page);

      const res = await api.get(`/transactions/?${params.toString()}`);
      const data = res.data;
      
      // Handle paginated response
      if (Array.isArray(data)) {
        setTransactions(data);
        setCount(data.length);
      } else {
        const results = data.results ?? [];
        setTransactions(results);
        setCount(data.count ?? results.length);
      }
    } catch (err) {
      console.error("Error fetching transactions", err);
      setError("Failed to load transactions.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBankAccounts();
    fetchTransactions();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [page]);

  const applyFilters = () => {
    setPage(1);
    fetchTransactions();
  };

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const getAmountColor = (type) => {
    if (INFLOW_TYPES.includes(type)) return "#166534";
    if (OUTFLOW_TYPES.includes(type)) return "#991B1B";
    return "#6B7280";
  };

  const getAmountPrefix = (type) => {
    if (OUTFLOW_TYPES.includes(type)) return "-";
    if (INFLOW_TYPES.includes(type)) return "+";
    return "";
  };

  const getTypeColor = (type) => {
    return typeColors[type] || { bg: "#F3F4F6", color: "#374151" };
  };

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
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 1,
                bgcolor: "#F1F5F9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ReceiptLongIcon sx={{ color: "#475569", fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: "#1E293B" }}>
                Transactions
              </Typography>
              <Typography variant="body2" sx={{ color: "#6B7280" }}>
                {count} total transactions
              </Typography>
            </Box>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <ExportButtons 
              data={transactions} 
              filename="transactions" 
              label="Export" 
            />
            <IconButton
              onClick={() => fetchTransactions(true)}
              disabled={refreshing}
              sx={{
                bgcolor: "#1E293B",
                color: "white",
                "&:hover": { bgcolor: "#334155" },
                "&:disabled": { bgcolor: "#E5E7EB", color: "#9CA3AF" },
              }}
            >
              <RefreshIcon />
            </IconButton>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate("/dashboard")}
              sx={{
                borderColor: "#E5E7EB",
                color: "#475569",
                "&:hover": { bgcolor: "#F3F4F6", borderColor: "#D1D5DB" },
              }}
            >
              Back
            </Button>
          </Stack>
        </Box>
      </Paper>

      {/* Filters */}
      <Paper
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 1,
          border: "1px solid",
          borderColor: "#E5E7EB",
          bgcolor: "#FFFFFF",
        }}
      >
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="flex-end">
          <TextField
            size="small"
            label="Search"
            name="search"
            value={filters.search}
            onChange={handleFilterChange}
            placeholder="Search description, bank, account..."
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "#9CA3AF", fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 280 }}
          />
          <TextField
            select
            size="small"
            label="Bank Account"
            name="bank_account_id"
            value={filters.bank_account_id}
            onChange={handleFilterChange}
            sx={{ minWidth: 220 }}
          >
            <MenuItem value="">All Accounts</MenuItem>
            {bankAccounts.map((bank) => (
              <MenuItem key={bank.id} value={bank.id}>
                {bank.name} - {bank.account_number}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Type"
            name="type"
            value={filters.type}
            onChange={handleFilterChange}
            sx={{ minWidth: 180 }}
          >
            {transactionTypes.map((t) => (
              <MenuItem key={t.value} value={t.value}>
                {t.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            label="Date"
            name="date"
            type="date"
            value={filters.date}
            onChange={handleFilterChange}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 160 }}
          />
          <Button
            variant="contained"
            onClick={applyFilters}
            sx={{
              bgcolor: "#1E293B",
              "&:hover": { bgcolor: "#334155" },
              minWidth: 120,
            }}
          >
            Apply
          </Button>
        </Stack>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Transactions Table */}
      <Paper
        sx={{
          borderRadius: 1,
          border: "1px solid",
          borderColor: "#E5E7EB",
          bgcolor: "#FFFFFF",
          overflow: "hidden",
        }}
      >
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TableContainer sx={{ maxHeight: 600 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ bgcolor: "#1E293B", color: "white", fontWeight: 700, fontSize: "0.75rem", whiteSpace: "nowrap" }}>Date</TableCell>
                    <TableCell sx={{ bgcolor: "#1E293B", color: "white", fontWeight: 700, fontSize: "0.75rem" }}>Type</TableCell>
                    <TableCell sx={{ bgcolor: "#1E293B", color: "white", fontWeight: 700, fontSize: "0.75rem" }}>Description</TableCell>
                    <TableCell sx={{ bgcolor: "#1E293B", color: "white", fontWeight: 700, fontSize: "0.75rem" }}>Bank</TableCell>
                    <TableCell align="right" sx={{ bgcolor: "#1E293B", color: "white", fontWeight: 700, fontSize: "0.75rem" }}>Amount</TableCell>
                    <TableCell sx={{ bgcolor: "#1E293B", color: "white", fontWeight: 700, fontSize: "0.75rem" }}>Added By</TableCell>
                    <TableCell sx={{ bgcolor: "#1E293B", color: "white", fontWeight: 700, fontSize: "0.75rem", whiteSpace: "nowrap" }}>Created At</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transactions.length > 0 ? (
                    transactions.map((t) => {
                      const typeColor = getTypeColor(t.type);
                      const amountColor = getAmountColor(t.type);
                      const amountPrefix = getAmountPrefix(t.type);
                      return (
                        <TableRow key={t.id} sx={{ "&:hover": { bgcolor: "#F9FAFB" } }}>
                          <TableCell sx={{ color: "#6B7280", fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                            {formatDate(t.date)}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={(t.type || "N/A").replace(/_/g, " ")}
                              size="small"
                              sx={{
                                bgcolor: typeColor.bg,
                                color: typeColor.color,
                                fontWeight: 500,
                                fontSize: "0.7rem",
                                textTransform: "capitalize",
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ color: "#374151", fontSize: "0.85rem", maxWidth: 200 }}>
                            {t.description || <Typography component="span" sx={{ color: "#9CA3AF", fontStyle: "italic", fontSize: "0.8rem" }}>No description</Typography>}
                          </TableCell>
                          <TableCell sx={{ color: "#374151", fontSize: "0.85rem" }}>
                            <Stack spacing={0.25}>
                              <Typography variant="body2" sx={{ fontWeight: 500, fontSize: "0.85rem" }}>
                                {t.bank_account?.name || "-"}
                              </Typography>
                              <Typography variant="caption" sx={{ color: "#9CA3AF", fontSize: "0.75rem", fontFamily: "monospace" }}>
                                {t.bank_account?.account_number || "-"}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, color: amountColor, fontSize: "0.85rem" }}>
                            {amountPrefix}{formatCurrency(t.amount)}
                          </TableCell>
                          <TableCell sx={{ color: "#6B7280", fontSize: "0.85rem" }}>
                            {t.created_by_username || "-"}
                          </TableCell>
                          <TableCell sx={{ color: "#9CA3AF", fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                            {formatDateTime(t.created_at)}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 6, color: "#9CA3AF" }}>
                        No transactions found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination - only show if more than 1 page */}
            {count > 20 && (
              <Box sx={{ display: "flex", justifyContent: "center", py: 2, borderTop: "1px solid #E5E7EB" }}>
                <Typography variant="body2" sx={{ color: "#6B7280", mr: 2, alignSelf: "center" }}>
                  Showing {((page - 1) * 20) + 1}-{Math.min(page * 20, count)} of {count}
                </Typography>
                <Pagination
                  count={Math.ceil(count / 20)}
                  page={page}
                  onChange={(e, value) => setPage(value)}
                  color="primary"
                  shape="rounded"
                  size="small"
                />
              </Box>
            )}
          </>
        )}
      </Paper>
    </Box>
  );
}
