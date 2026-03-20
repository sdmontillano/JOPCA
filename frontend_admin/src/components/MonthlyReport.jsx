import { useEffect, useState, useCallback } from "react";
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  Stack,
  TextField,
  IconButton,
  Chip,
  Collapse,
  InputAdornment,
  TableContainer,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import RefreshIcon from "@mui/icons-material/Refresh";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import WalletIcon from "@mui/icons-material/Wallet";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import SearchIcon from "@mui/icons-material/Search";
import DownloadIcon from "@mui/icons-material/Download";
import api from "../services/tokenService";

function formatCurrency(value) {
  return `₱${Number(value ?? 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

function SectionHeader({ title, icon, count, total, expanded, onToggle }) {
  return (
    <Box
      onClick={onToggle}
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        p: 2,
        bgcolor: "#F9FAFB",
        borderBottom: "1px solid #E5E7EB",
        cursor: "pointer",
        "&:hover": { bgcolor: "#F3F4F6" },
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box sx={{ color: "#475569" }}>{icon}</Box>
        <Typography variant="body2" sx={{ fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.03em" }}>
          {title}
        </Typography>
        <Chip label={`${count} items`} size="small" sx={{ bgcolor: "#E5E7EB", color: "#6B7280", fontSize: "0.7rem" }} />
      </Stack>
      <Stack direction="row" spacing={2} alignItems="center">
        <Typography variant="body2" sx={{ fontWeight: 600, color: "#1E293B" }}>
          {total}
        </Typography>
        <IconButton size="small">{expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}</IconButton>
      </Stack>
    </Box>
  );
}

function TransactionRow({ transaction, type = "bank" }) {
  const isPositive = ["collection", "deposit", "replenishment", "local_deposits"].includes(transaction.type?.toLowerCase());
  const isNegative = ["disbursement", "withdrawal", "returned_check", "bank_charges"].includes(transaction.type?.toLowerCase());

  let amountColor = "#6B7280";
  if (isPositive) amountColor = "#166534";
  if (isNegative) amountColor = "#991B1B";

  const prefix = isNegative ? "-" : isPositive ? "+" : "";

  return (
    <TableRow sx={{ "&:hover": { bgcolor: "#F9FAFB" } }}>
      <TableCell sx={{ color: "#6B7280", fontSize: "0.8rem", whiteSpace: "nowrap" }}>
        {formatDate(transaction.date)}
      </TableCell>
      <TableCell sx={{ fontWeight: 500, color: "#374151", fontSize: "0.85rem" }}>
        {type === "bank" ? transaction.bank_name : transaction.pcf_name}
      </TableCell>
      <TableCell sx={{ color: "#6B7280", fontSize: "0.8rem" }}>
        {type === "bank" ? transaction.account_number : transaction.location}
      </TableCell>
      <TableCell>
        <Chip
          label={transaction.type?.replace("_", " ") || "N/A"}
          size="small"
          sx={{
            bgcolor: isPositive ? "#DCFCE7" : isNegative ? "#FEE2E2" : "#F3F4F6",
            color: isPositive ? "#166534" : isNegative ? "#991B1B" : "#374151",
            fontWeight: 500,
            fontSize: "0.7rem",
            textTransform: "capitalize",
          }}
        />
      </TableCell>
      <TableCell sx={{ color: "#374151", fontSize: "0.85rem", maxWidth: 200 }}>
        {transaction.description || <Typography component="span" sx={{ color: "#9CA3AF", fontStyle: "italic" }}>No description</Typography>}
      </TableCell>
      <TableCell align="right" sx={{ fontWeight: 700, color: amountColor, fontSize: "0.85rem" }}>
        {prefix}{formatCurrency(transaction.amount)}
      </TableCell>
    </TableRow>
  );
}

export default function MonthlyReport() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    return new Date().toISOString().slice(0, 7);
  });
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Section states (all expanded by default)
  const [expandedSections, setExpandedSections] = useState({
    bank: true,
    pcf: true,
    pdc: true,
    grouped: false,
  });

  // Search/Filter
  const [searchBank, setSearchBank] = useState("");
  const [searchPcf, setSearchPcf] = useState("");
  const [filterBankType, setFilterBankType] = useState("all");
  const [filterPcfType, setFilterPcfType] = useState("all");

  const navigate = useNavigate();

  const fetchReport = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .get("/summary/monthly-full/", { params: { month: selectedMonth } })
      .then((res) => {
        setReport(res.data || res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err?.response?.data?.detail || err.message || "Failed to fetch report");
        setLoading(false);
      });
  }, [selectedMonth]);



  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Filter transactions
  const filteredBankTxns = (report?.bank_transactions || []).filter((t) => {
    const matchSearch =
      !searchBank ||
      (t.bank_name || "").toLowerCase().includes(searchBank.toLowerCase()) ||
      (t.description || "").toLowerCase().includes(searchBank.toLowerCase()) ||
      (t.account_number || "").includes(searchBank);
    const matchType = filterBankType === "all" || t.type === filterBankType;
    return matchSearch && matchType;
  });

  const filteredPcfTxns = (report?.pcf_transactions || []).filter((t) => {
    const matchSearch =
      !searchPcf ||
      (t.pcf_name || "").toLowerCase().includes(searchPcf.toLowerCase()) ||
      (t.description || "").toLowerCase().includes(searchPcf.toLowerCase());
    const matchType = filterPcfType === "all" || t.type === filterPcfType;
    return matchSearch && matchType;
  });

  const handleExport = () => {
    const rows = [
      ["MONTHLY REPORT", selectedMonth],
      [],
      ["BANK TRANSACTIONS"],
      ["Date", "Bank", "Account #", "Type", "Description", "Amount"],
      ...(report?.bank_transactions || []).map((t) => [
        t.date,
        t.bank_name,
        t.account_number,
        t.type,
        t.description,
        t.amount,
      ]),
      [],
      ["PCF TRANSACTIONS"],
      ["Date", "PCF Name", "Location", "Type", "Description", "Amount"],
      ...(report?.pcf_transactions || []).map((t) => [
        t.date,
        t.pcf_name,
        t.location,
        t.type,
        t.description,
        t.amount,
      ]),
      [],
      ["PDC THIS MONTH"],
      ["Check #", "Bank", "Amount", "Status", "Maturity Date"],
      ...(report?.pdc_this_month || []).map((p) => [
        p.check_no,
        p.bank_name,
        p.amount,
        p.status,
        p.maturity_date,
      ]),
    ];

    const csvContent = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `monthly-report-${selectedMonth}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading && !report) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
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
              <AccountBalanceIcon sx={{ color: "#475569", fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: "#1E293B" }}>
                Monthly Report
              </Typography>
              <Typography variant="body2" sx={{ color: "#6B7280" }}>
                Complete transaction details for the month
              </Typography>
            </Box>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              type="month"
              size="small"
              label="Select Month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{
                minWidth: 160,
                "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#1E293B",
                },
                "& .MuiInputLabel-root.Mui-focused": {
                  color: "#1E293B",
                },
              }}
            />
            <IconButton
              onClick={fetchReport}
              disabled={loading}
              sx={{
                bgcolor: "#1E293B",
                color: "white",
                "&:hover": { bgcolor: "#334155" },
                "&:disabled": { bgcolor: "#E5E7EB", color: "#9CA3AF" },
              }}
            >
              <RefreshIcon />
            </IconButton>
            <IconButton
              onClick={handleExport}
              sx={{
                bgcolor: "#166534",
                color: "white",
                "&:hover": { bgcolor: "#14532D" },
              }}
            >
              <DownloadIcon />
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

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Report Content */}
      {report && (
        <>
          {/* Summary Cards */}
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(5, 1fr)" }, gap: 2, mb: 3 }}>
            {/* Bank Inflows */}
            <Paper
              sx={{
                p: 2.5,
                borderRadius: 1,
                border: "1px solid",
                borderColor: "#E5E7EB",
                bgcolor: "#FFFFFF",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                <AccountBalanceIcon sx={{ fontSize: 16, color: "#166534" }} />
                <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 500, textTransform: "uppercase", fontSize: "0.65rem" }}>
                  Inflows
                </Typography>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: "#166534" }}>
                {formatCurrency(report.summary?.bank_inflows || 0)}
              </Typography>
              <Typography variant="caption" sx={{ color: "#6B7280" }}>
                {report.summary?.bank_txn_count || 0} transactions
              </Typography>
            </Paper>

            {/* Bank Outflows */}
            <Paper
              sx={{
                p: 2.5,
                borderRadius: 1,
                border: "1px solid",
                borderColor: "#E5E7EB",
                bgcolor: "#FFFFFF",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                <AccountBalanceIcon sx={{ fontSize: 16, color: "#991B1B" }} />
                <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 500, textTransform: "uppercase", fontSize: "0.65rem" }}>
                  Outflows
                </Typography>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: "#991B1B" }}>
                {formatCurrency(report.summary?.bank_outflows || 0)}
              </Typography>
              <Typography variant="caption" sx={{ color: "#6B7280" }}>
                Net: {formatCurrency(report.summary?.bank_net || 0)}
              </Typography>
            </Paper>

            {/* PCF Disbursements */}
            <Paper
              sx={{
                p: 2.5,
                borderRadius: 1,
                border: "1px solid",
                borderColor: "#E5E7EB",
                bgcolor: "#FFFFFF",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                <WalletIcon sx={{ fontSize: 16, color: "#475569" }} />
                <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 500, textTransform: "uppercase", fontSize: "0.65rem" }}>
                  PCF Disb
                </Typography>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: "#1E293B" }}>
                {report.summary?.pcf_txn_count || 0}
              </Typography>
              <Typography variant="body2" sx={{ color: "#991B1B", fontWeight: 600 }}>
                {formatCurrency(report.summary?.pcf_total_disbursements || 0)}
              </Typography>
            </Paper>

            {/* PCF Replenishments */}
            <Paper
              sx={{
                p: 2.5,
                borderRadius: 1,
                border: "1px solid",
                borderColor: "#E5E7EB",
                bgcolor: "#FFFFFF",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                <WalletIcon sx={{ fontSize: 16, color: "#475569" }} />
                <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 500, textTransform: "uppercase", fontSize: "0.65rem" }}>
                  PCF Rep
                </Typography>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: "#1E293B" }}>
                {report.summary?.pcf_txn_count || 0}
              </Typography>
              <Typography variant="body2" sx={{ color: "#166534", fontWeight: 600 }}>
                {formatCurrency(report.summary?.pcf_total_replenishments || 0)}
              </Typography>
            </Paper>

            {/* PDC This Month */}
            <Paper
              sx={{
                p: 2.5,
                borderRadius: 1,
                border: "1px solid",
                borderColor: "#E5E7EB",
                bgcolor: "#FFFFFF",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                <ReceiptLongIcon sx={{ fontSize: 16, color: "#475569" }} />
                <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 500, textTransform: "uppercase", fontSize: "0.65rem" }}>
                  PDC This Month
                </Typography>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: "#1E293B" }}>
                {report.summary?.pdc_count || 0}
              </Typography>
              <Typography variant="body2" sx={{ color: "#B45309", fontWeight: 600 }}>
                {formatCurrency(report.summary?.pdc_total || 0)}
              </Typography>
            </Paper>
          </Box>

          {/* A. BANK TRANSACTIONS SECTION */}
          <Paper sx={{ mb: 2, borderRadius: 1, border: "1px solid", borderColor: "#E5E7EB", bgcolor: "#FFFFFF", overflow: "hidden" }}>
            <SectionHeader
              title="Bank Transactions"
              icon={<AccountBalanceIcon sx={{ fontSize: 20 }} />}
              count={filteredBankTxns.length}
              total={`In: ${formatCurrency(report.summary?.bank_inflows || 0)} | Out: ${formatCurrency(report.summary?.bank_outflows || 0)}`}
              expanded={expandedSections.bank}
              onToggle={() => toggleSection("bank")}
            />
            <Collapse in={expandedSections.bank}>
              {/* Search and Filter */}
              <Box sx={{ p: 2, borderBottom: "1px solid #E5E7EB", display: "flex", gap: 2, flexWrap: "wrap" }}>
                <TextField
                  size="small"
                  placeholder="Search bank, description..."
                  value={searchBank}
                  onChange={(e) => setSearchBank(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: "#9CA3AF", fontSize: 20 }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ minWidth: 250 }}
                />
                <Stack direction="row" spacing={1}>
                  {["all", "collections", "local_deposits", "disbursement", "returned_check", "bank_charges", "adjustments", "fund_transfer", "transfer", "interbank_transfer"].map((type) => (
                    <Chip
                      key={type}
                      label={type === "all" ? "All" : type.replace(/_/g, " ")}
                      size="small"
                      onClick={() => setFilterBankType(type)}
                      sx={{
                        bgcolor: filterBankType === type ? "#1E293B" : "#F3F4F6",
                        color: filterBankType === type ? "white" : "#6B7280",
                        fontSize: "0.7rem",
                        textTransform: "capitalize",
                        cursor: "pointer",
                      }}
                    />
                  ))}
                </Stack>
              </Box>
              <TableContainer sx={{ maxHeight: 500 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ bgcolor: "#1E293B", color: "white", fontWeight: 700, fontSize: "0.75rem", whiteSpace: "nowrap" }}>Date</TableCell>
                      <TableCell sx={{ bgcolor: "#1E293B", color: "white", fontWeight: 700, fontSize: "0.75rem" }}>Bank</TableCell>
                      <TableCell sx={{ bgcolor: "#1E293B", color: "white", fontWeight: 700, fontSize: "0.75rem" }}>Account #</TableCell>
                      <TableCell sx={{ bgcolor: "#1E293B", color: "white", fontWeight: 700, fontSize: "0.75rem" }}>Type</TableCell>
                      <TableCell sx={{ bgcolor: "#1E293B", color: "white", fontWeight: 700, fontSize: "0.75rem" }}>Description</TableCell>
                      <TableCell align="right" sx={{ bgcolor: "#1E293B", color: "white", fontWeight: 700, fontSize: "0.75rem" }}>Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredBankTxns.length > 0 ? (
                      filteredBankTxns.map((t, idx) => <TransactionRow key={t.id || idx} transaction={t} type="bank" />)
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 4, color: "#9CA3AF" }}>
                          No bank transactions found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Collapse>
          </Paper>

          {/* B. PCF TRANSACTIONS SECTION */}
          <Paper sx={{ mb: 2, borderRadius: 1, border: "1px solid", borderColor: "#E5E7EB", bgcolor: "#FFFFFF", overflow: "hidden" }}>
            <SectionHeader
              title="PCF Transactions"
              icon={<WalletIcon sx={{ fontSize: 20 }} />}
              count={filteredPcfTxns.length}
              total={`Disb: ${formatCurrency(report.summary?.pcf_total_disbursements || 0)} | Rep: ${formatCurrency(report.summary?.pcf_total_replenishments || 0)}`}
              expanded={expandedSections.pcf}
              onToggle={() => toggleSection("pcf")}
            />
            <Collapse in={expandedSections.pcf}>
              {/* Search and Filter */}
              <Box sx={{ p: 2, borderBottom: "1px solid #E5E7EB", display: "flex", gap: 2, flexWrap: "wrap" }}>
                <TextField
                  size="small"
                  placeholder="Search PCF, description..."
                  value={searchPcf}
                  onChange={(e) => setSearchPcf(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: "#9CA3AF", fontSize: 20 }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ minWidth: 250 }}
                />
                <Stack direction="row" spacing={1}>
                  {["all", "disbursement", "replenishment"].map((type) => (
                    <Chip
                      key={type}
                      label={type === "all" ? "All" : type}
                      size="small"
                      onClick={() => setFilterPcfType(type)}
                      sx={{
                        bgcolor: filterPcfType === type ? "#1E293B" : "#F3F4F6",
                        color: filterPcfType === type ? "white" : "#6B7280",
                        fontSize: "0.7rem",
                        textTransform: "capitalize",
                        cursor: "pointer",
                      }}
                    />
                  ))}
                </Stack>
              </Box>
              <TableContainer sx={{ maxHeight: 400 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ bgcolor: "#475569", color: "white", fontWeight: 700, fontSize: "0.75rem", whiteSpace: "nowrap" }}>Date</TableCell>
                      <TableCell sx={{ bgcolor: "#475569", color: "white", fontWeight: 700, fontSize: "0.75rem" }}>PCF Name</TableCell>
                      <TableCell sx={{ bgcolor: "#475569", color: "white", fontWeight: 700, fontSize: "0.75rem" }}>Location</TableCell>
                      <TableCell sx={{ bgcolor: "#475569", color: "white", fontWeight: 700, fontSize: "0.75rem" }}>Type</TableCell>
                      <TableCell sx={{ bgcolor: "#475569", color: "white", fontWeight: 700, fontSize: "0.75rem" }}>Description</TableCell>
                      <TableCell align="right" sx={{ bgcolor: "#475569", color: "white", fontWeight: 700, fontSize: "0.75rem" }}>Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredPcfTxns.length > 0 ? (
                      filteredPcfTxns.map((t, idx) => <TransactionRow key={t.id || idx} transaction={t} type="pcf" />)
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 4, color: "#9CA3AF" }}>
                          No PCF transactions found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Collapse>
          </Paper>

          {/* C. PDC THIS MONTH */}
          <Paper sx={{ mb: 2, borderRadius: 1, border: "1px solid", borderColor: "#E5E7EB", bgcolor: "#FFFFFF", overflow: "hidden" }}>
            <SectionHeader
              title="PDC Maturing This Month"
              icon={<ReceiptLongIcon sx={{ fontSize: 20 }} />}
              count={report.summary?.pdc_count || 0}
              total={formatCurrency(report.summary?.pdc_total || 0)}
              expanded={expandedSections.pdc}
              onToggle={() => toggleSection("pdc")}
            />
            <Collapse in={expandedSections.pdc}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ bgcolor: "#B45309", color: "white", fontWeight: 700, fontSize: "0.75rem" }}>Check #</TableCell>
                      <TableCell sx={{ bgcolor: "#B45309", color: "white", fontWeight: 700, fontSize: "0.75rem" }}>Bank</TableCell>
                      <TableCell align="right" sx={{ bgcolor: "#B45309", color: "white", fontWeight: 700, fontSize: "0.75rem" }}>Amount</TableCell>
                      <TableCell sx={{ bgcolor: "#B45309", color: "white", fontWeight: 700, fontSize: "0.75rem" }}>Status</TableCell>
                      <TableCell sx={{ bgcolor: "#B45309", color: "white", fontWeight: 700, fontSize: "0.75rem" }}>Maturity Date</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {report.pdc_this_month && report.pdc_this_month.length > 0 ? (
                      report.pdc_this_month.map((p, idx) => (
                        <TableRow key={p.id || idx} sx={{ "&:hover": { bgcolor: "#F9FAFB" } }}>
                          <TableCell sx={{ fontWeight: 500, color: "#374151", fontSize: "0.85rem" }}>{p.check_no || "-"}</TableCell>
                          <TableCell sx={{ color: "#6B7280", fontSize: "0.85rem" }}>{p.bank_name || "-"}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, color: "#1E293B", fontSize: "0.85rem" }}>{formatCurrency(p.amount)}</TableCell>
                          <TableCell>
                            <Chip
                              label={p.status || "N/A"}
                              size="small"
                              sx={{
                                bgcolor: p.status === "matured" ? "#DCFCE7" : p.status === "deposited" ? "#DBEAFE" : p.status === "returned" ? "#FEE2E2" : "#F3F4F6",
                                color: p.status === "matured" ? "#166534" : p.status === "deposited" ? "#1D4ED8" : p.status === "returned" ? "#991B1B" : "#374151",
                                fontWeight: 500,
                                fontSize: "0.7rem",
                                textTransform: "capitalize",
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ color: "#6B7280", fontSize: "0.85rem" }}>{formatDate(p.maturity_date)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 4, color: "#9CA3AF" }}>
                          No PDC maturing this month
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Collapse>
          </Paper>

          {/* D. GROUPED SUMMARIES */}
          <Paper sx={{ mb: 2, borderRadius: 1, border: "1px solid", borderColor: "#E5E7EB", bgcolor: "#FFFFFF", overflow: "hidden" }}>
            <SectionHeader
              title="Grouped Summaries"
              icon={<AccountBalanceIcon sx={{ fontSize: 20 }} />}
              count={(report.grouped_by_account?.length || 0) + (report.grouped_by_type?.length || 0)}
              total=""
              expanded={expandedSections.grouped}
              onToggle={() => toggleSection("grouped")}
            />
            <Collapse in={expandedSections.grouped}>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 0 }}>
                {/* By Account */}
                <Box sx={{ borderRight: { md: "1px solid #E5E7EB" } }}>
                  <Box sx={{ p: 2, bgcolor: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: "#374151", textTransform: "uppercase" }}>
                      By Account
                    </Typography>
                  </Box>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ bgcolor: "#64748B", color: "white", fontWeight: 700, fontSize: "0.75rem" }}>Account</TableCell>
                        <TableCell sx={{ bgcolor: "#64748B", color: "white", fontWeight: 700, fontSize: "0.75rem" }}>Account #</TableCell>
                        <TableCell align="right" sx={{ bgcolor: "#64748B", color: "white", fontWeight: 700, fontSize: "0.75rem" }}>Count</TableCell>
                        <TableCell align="right" sx={{ bgcolor: "#64748B", color: "white", fontWeight: 700, fontSize: "0.75rem" }}>Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {report.grouped_by_account && report.grouped_by_account.length > 0 ? (
                        report.grouped_by_account.map((a, idx) => (
                          <TableRow key={idx} sx={{ "&:hover": { bgcolor: "#F9FAFB" } }}>
                            <TableCell sx={{ fontWeight: 500, color: "#374151", fontSize: "0.85rem" }}>{a.bank_account__name || "N/A"}</TableCell>
                            <TableCell sx={{ color: "#6B7280", fontSize: "0.8rem" }}>{a.bank_account__account_number || "-"}</TableCell>
                            <TableCell align="right" sx={{ color: "#6B7280", fontSize: "0.8rem" }}>{a.count}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, color: "#1E293B", fontSize: "0.85rem" }}>{formatCurrency(a.total)}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} align="center" sx={{ py: 3, color: "#9CA3AF" }}>No data</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Box>
                {/* By Type */}
                <Box>
                  <Box sx={{ p: 2, bgcolor: "#F9FAFB", borderBottom: "1px solid #E5E7EB" }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: "#374151", textTransform: "uppercase" }}>
                      By Type
                    </Typography>
                  </Box>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ bgcolor: "#64748B", color: "white", fontWeight: 700, fontSize: "0.75rem" }}>Type</TableCell>
                        <TableCell align="right" sx={{ bgcolor: "#64748B", color: "white", fontWeight: 700, fontSize: "0.75rem" }}>Count</TableCell>
                        <TableCell align="right" sx={{ bgcolor: "#64748B", color: "white", fontWeight: 700, fontSize: "0.75rem" }}>Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {report.grouped_by_type && report.grouped_by_type.length > 0 ? (
                        report.grouped_by_type.map((t, idx) => {
                          // total is already signed from backend (negative for outflows)
                          const isNegative = t.total < 0;
                          const displayAmount = Math.abs(t.total);
                          const prefix = isNegative ? "-" : "+";
                          return (
                            <TableRow key={idx} sx={{ "&:hover": { bgcolor: "#F9FAFB" } }}>
                              <TableCell>
                                <Chip
                                  label={(t.type || "N/A").replace(/_/g, " ")}
                                  size="small"
                                  sx={{
                                    bgcolor: isNegative ? "#FEE2E2" : "#DCFCE7",
                                    color: isNegative ? "#991B1B" : "#166534",
                                    fontWeight: 500,
                                    fontSize: "0.7rem",
                                    textTransform: "capitalize",
                                  }}
                                />
                              </TableCell>
                              <TableCell align="right" sx={{ color: "#6B7280", fontSize: "0.8rem" }}>{t.count}</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 700, color: isNegative ? "#991B1B" : "#166534", fontSize: "0.85rem" }}>
                                {prefix}{formatCurrency(displayAmount)}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={3} align="center" sx={{ py: 3, color: "#9CA3AF" }}>No data</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Box>
              </Box>
            </Collapse>
          </Paper>
        </>
      )}
    </Box>
  );
}
