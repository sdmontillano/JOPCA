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
  Chip,
  TableContainer,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/tokenService";

const INFLOW_TYPES = ['collection', 'deposit', 'collections', 'fund_transfer_in', 'adjustment_in'];
const OUTFLOW_TYPES = ['disbursement', 'withdrawal', 'bank_charges', 'adjustments', 'fund_transfer', 'fund_transfer_out', 'transfer', 'interbank_transfer', 'adjustment_out'];

const typeColors = {
  collections: { bg: "#DCFCE7", color: "#166534" },
  deposit: { bg: "#DCFCE7", color: "#166534" },
  disbursement: { bg: "#FEE2E2", color: "#991B1B" },
  returned_check: { bg: "#FEF3C7", color: "#B45309" },
  bank_charges: { bg: "#FEE2E2", color: "#991B1B" },
  adjustments: { bg: "#F3F4F6", color: "#374151" },
  adjustment_in: { bg: "#DCFCE7", color: "#166534" },
  adjustment_out: { bg: "#FEE2E2", color: "#991B1B" },
  fund_transfer: { bg: "#DBEAFE", color: "#1D4ED8" },
  fund_transfer_in: { bg: "#DCFCE7", color: "#166534" },
  fund_transfer_out: { bg: "#FEE2E2", color: "#991B1B" },
  transfer: { bg: "#DBEAFE", color: "#1D4ED8" },
  interbank_transfer: { bg: "#DBEAFE", color: "#1D4ED8" },
};

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
    { value: "disbursement", label: "Disbursement" },
    { value: "returned_check", label: "Returned Check" },
    { value: "bank_charges", label: "Bank Charges" },
    { value: "adjustments", label: "Adjustments" },
    { value: "transfer", label: "Transfer" },
    { value: "fund_transfer", label: "Fund Transfer" },
    { value: "interbank_transfer", label: "Interbank Transfer" },
  ];

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

  const formatAmount = (amount, type) => {
    const num = Number(amount ?? 0);
    // Returned check - no prefix (neutral, doesn't affect balance)
    if (type === "returned_check") {
      return `₱${Math.abs(num).toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }
    const prefix = INFLOW_TYPES.includes(type) ? "+" : "-";
    return `${prefix}₱${Math.abs(num).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getTypeColor = (type) => typeColors[type] || { bg: "#F3F4F6", color: "#374151" };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch bank details
      const bankRes = await api.get(`/bankaccounts/${id}/`);
      setBank(bankRes.data);

      // Fetch transactions
      const params = new URLSearchParams();
      params.append("bank_account_id", id);
      if (filters.type) params.append("type", filters.type);
      if (filters.date) params.append("date", filters.date);
      params.append("page", page);

      const txRes = await api.get(`/transactions/?${params.toString()}`);
      const data = txRes.data;
      
      // Handle paginated response
      let results = data.results ?? [];
      const totalCount = data.count ?? results.length;
      
      // Also fetch returned PDC for this bank (for display - no balance impact)
      try {
        const pdcRes = await api.get(`/pdc/by_bank/?bank_id=${id}`);
        const returnedPdcs = pdcRes.data || [];
        
        // Convert returned PDC to transaction-like format and merge
        const returnedItems = returnedPdcs.map(p => ({
          id: `pdc-${p.id}`,
          type: "returned_check",
          amount: p.amount,
          date: p.returned_date,
          created_at: p.returned_date,
          description: `Returned PDC - Check #${p.check_no || 'N/A'}${p.returned_reason ? ' - ' + p.returned_reason : ''}`,
          check_no: p.check_no,
          created_by_username: p.created_by_username || (p.created_by?.username) || '-'
        }));
        
        // Merge: returned items first (most recent), then transactions
        results = [...returnedItems, ...results];
      } catch (pdcErr) {
        console.log("No returned PDC found:", pdcErr.message);
      }
      
      setTransactions(results);
      setCount(totalCount);
    } catch (err) {
      console.error("Error fetching bank detail:", err.response?.data || err.message);
      setError("Failed to load bank details or transactions: " + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, page, filters.type, filters.date]);

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
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: "primary.dark" }}>
                {bank ? `${bank.name} (${bank.account_number})` : "Bank Account"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Bank transactions and details
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            <Paper sx={{ p: 2, bgcolor: "#1E293B", borderRadius: 1 }}>
              <Typography variant="subtitle2" sx={{ color: "#fff" }}>Current Balance</Typography>
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: "bold", 
                  color: Number(bank?.balance ?? 0) < 0 ? "#EF4444" : "#fff"
                }}
              >
                {`₱${Number(bank?.balance ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </Typography>
            </Paper>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate("/banks")}
              sx={{
                borderColor: "#E5E7EB",
                color: "#475569",
                "&:hover": { bgcolor: "#F3F4F6", borderColor: "#D1D5DB" },
              }}
            >
              Back
            </Button>
          </Box>
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

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ bgcolor: "#1E293B", color: "white", fontWeight: 700, fontSize: "0.75rem" }}>Date</TableCell>
                <TableCell sx={{ bgcolor: "#1E293B", color: "white", fontWeight: 700, fontSize: "0.75rem" }}>Type</TableCell>
                <TableCell sx={{ bgcolor: "#1E293B", color: "white", fontWeight: 700, fontSize: "0.75rem" }}>Description</TableCell>
                <TableCell sx={{ bgcolor: "#1E293B", color: "white", fontWeight: 700, fontSize: "0.75rem" }} align="right">Amount</TableCell>
                <TableCell sx={{ bgcolor: "#1E293B", color: "white", fontWeight: 700, fontSize: "0.75rem" }}>Added By</TableCell>
                <TableCell sx={{ bgcolor: "#1E293B", color: "white", fontWeight: 700, fontSize: "0.75rem" }}>Created At</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transactions.length > 0 ? (
                transactions.map((t) => {
                  const typeColor = getTypeColor(t.type);
                  return (
                    <TableRow key={t.id} sx={{ "&:hover": { bgcolor: "#F9FAFB" } }}>
                      <TableCell>{formatDate(t.date)}</TableCell>
                      <TableCell>
                        <Chip 
                          label={t.type?.replace(/_/g, " ") || "-"} 
                          size="small"
                          sx={{ 
                            bgcolor: typeColor.bg, 
                            color: typeColor.color,
                            fontWeight: 500,
                            fontSize: "0.75rem"
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ whiteSpace: "pre-wrap" }}>{t.description || "-"}</TableCell>
                      <TableCell align="right" sx={{ 
                        fontWeight: 600,
                        color: INFLOW_TYPES.includes(t.type) ? "#166534" : "#991B1B"
                      }}>
                        {formatAmount(t.amount, t.type)}
                      </TableCell>
                      <TableCell>{t.created_by_username || "-"}</TableCell>
                      <TableCell sx={{ fontSize: "0.8rem", color: "#666" }}>
                        {formatDateTime(t.created_at)}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No transactions found for this account.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination - only show if more than 1 page worth of data */}
        {count > 7 && (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
            <Pagination
              count={Math.ceil(count / 7)}
              page={page}
              onChange={(e, value) => setPage(value)}
            />
          </Box>
        )}
      </Paper>
    </Box>
  );
}