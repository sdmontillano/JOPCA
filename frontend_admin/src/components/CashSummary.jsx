// src/components/CashSummary.jsx
import { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Stack,
  Divider,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import PrintIcon from "@mui/icons-material/Print";
import DownloadIcon from "@mui/icons-material/Download";
import IconButton from "@mui/material/IconButton";
import api from "../services/tokenService";
import { useNavigate } from "react-router-dom";
import { exportCashSummaryPDF, exportCashSummaryExcel } from "../utils/exportUtils";
import QuickActionFAB from "./QuickActionFAB";
import AddTransaction from "./AddTransaction";
import AddBankAccount from "./AddBankAccount";
import PdcCreateModal from "./PdcCreateModal";
import AddPcfModal from "./AddPcfModal";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import WalletIcon from "@mui/icons-material/Wallet";

export default function CashSummary() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [user, setUser] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [addTransactionOpen, setAddTransactionOpen] = useState(false);
  const [addBankOpen, setAddBankOpen] = useState(false);
  const [addPdcOpen, setAddPdcOpen] = useState(false);
  const [addPcfOpen, setAddPcfOpen] = useState(false);
  const navigate = useNavigate();

  const handleExportPDF = () => {
    setExporting(true);
    try {
      exportCashSummaryPDF(data, selectedDate, user);
    } catch (err) {
      console.error('PDF export failed:', err);
    }
    setExporting(false);
  };

  const handleExportExcel = () => {
    setExporting(true);
    try {
      exportCashSummaryExcel(data, selectedDate, user);
    } catch (err) {
      console.error('Excel export failed:', err);
    }
    setExporting(false);
  };

  useEffect(() => {
    fetchData(selectedDate);
    fetchUserProfile();
  }, [selectedDate]);

  async function fetchUserProfile() {
    try {
      const res = await api.get("/api/user/profile/");
      setUser(res.data);
    } catch (err) {
      console.error("Error fetching user profile", err);
    }
  }

  async function fetchData(date) {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/summary/cash-summary/?date=${date}`);
      setData(res.data);
    } catch (err) {
      console.error("Error fetching cash summary", err);
      setError("Failed to load cash summary.");
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (value) =>
    `₱${Number(value ?? 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const formatShortCurrency = (value) => {
    const num = Number(value ?? 0);
    if (num >= 1000000) {
      return `₱${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `₱${(num / 1000).toFixed(0)}K`;
    }
    return formatCurrency(value);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const mainOfficeBanks = data?.areas?.main_office?.banks || [];
  const tagoloanBanks = data?.areas?.tagoloan_parts?.banks || [];
  const midsayapBanks = data?.areas?.midsayap_parts?.banks || [];
  const valenciaBanks = data?.areas?.valencia_parts?.banks || [];

  const maxRows = Math.max(mainOfficeBanks.length, tagoloanBanks.length + midsayapBanks.length + valenciaBanks.length);

  const allPartsBanks = [
    ...tagoloanBanks.map(b => ({ ...b, area: "Tagoloan Parts" })),
    ...midsayapBanks.map(b => ({ ...b, area: "Midsayap Parts" })),
    ...valenciaBanks.map(b => ({ ...b, area: "Valencia Parts" })),
  ];

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
                bgcolor: "#1E293B",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AccountBalanceWalletIcon sx={{ color: "#FFFFFF", fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: "primary.dark" }}>
                Cash Summary
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Cash position summary by area
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <Button
              variant="contained"
              size="small"
              startIcon={<PrintIcon />}
              onClick={handleExportPDF}
              disabled={exporting || loading}
              sx={{ 
                bgcolor: "#DC2626", 
                textTransform: "none",
                "&:hover": { bgcolor: "#B91C1C" }
              }}
            >
              PDF
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<DownloadIcon />}
              onClick={handleExportExcel}
              disabled={exporting || loading}
              sx={{ 
                bgcolor: "#16A34A", 
                textTransform: "none",
                "&:hover": { bgcolor: "#15803D" }
              }}
            >
              Excel
            </Button>
            <TextField
              type="date"
              size="small"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              sx={{ width: 150 }}
            />
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
          </Box>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : data ? (
        <Stack spacing={3}>
          {/* Main Report Table */}
          <Paper
            sx={{
              p: 3,
              borderRadius: 1,
              border: "1px solid",
              borderColor: "#E5E7EB",
              bgcolor: "#FFFFFF",
            }}
          >
            {/* Report Header */}
            <Box sx={{ textAlign: "center", mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                JOPCA CORPORATION
              </Typography>
              <Typography variant="h7" sx={{ fontWeight: 600 }}>
                CASH POSITION SUMMARY
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                As of: {formatDate(data.date)}
              </Typography>
            </Box>

            <Divider sx={{ mb: 3 }} />

            {/* Main Table */}
            <TableContainer>
              <Table size="small" sx={{ borderCollapse: "collapse" }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ bgcolor: "#1E293B", color: "white", fontWeight: 700, fontSize: "0.75rem", width: "30%" }}>AREA</TableCell>
                    <TableCell sx={{ bgcolor: "#1E293B", color: "white", fontWeight: 700, fontSize: "0.75rem" }} align="right">MAIN OFFICE</TableCell>
                    <TableCell sx={{ bgcolor: "#1E293B", color: "white", fontWeight: 700, fontSize: "0.75rem" }} align="right">PARTS</TableCell>
                    <TableCell sx={{ bgcolor: "#1E293B", color: "white", fontWeight: 700, fontSize: "0.75rem" }} align="right">TOTAL</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {/* Main Office Banks */}
                  {mainOfficeBanks.map((bank, index) => (
                    <TableRow key={bank.id}>
                      <TableCell sx={{ pl: 3 }}>{bank.account_number}</TableCell>
                      <TableCell sx={{ textAlign: "right" }}>{formatCurrency(bank.balance)}</TableCell>
                      <TableCell sx={{ textAlign: "right" }}>-</TableCell>
                      <TableCell sx={{ textAlign: "right" }}>{formatCurrency(bank.balance)}</TableCell>
                    </TableRow>
                  ))}

                  {/* Parts Banks */}
                  {allPartsBanks.map((bank, index) => (
                    <TableRow key={`parts-${index}`}>
                      <TableCell sx={{ pl: 3, fontStyle: "italic", color: "#666" }}>
                        {bank.area} - {bank.account_number}
                      </TableCell>
                      <TableCell sx={{ textAlign: "right" }}>-</TableCell>
                      <TableCell sx={{ textAlign: "right" }}>{formatCurrency(bank.balance)}</TableCell>
                      <TableCell sx={{ textAlign: "right" }}>{formatCurrency(bank.balance)}</TableCell>
                    </TableRow>
                  ))}

                  {/* Grand Total Row */}
                  <TableRow sx={{ bgcolor: "#1E293B", color: "#FFFFFF" }}>
                    <TableCell sx={{ fontWeight: 700, color: "#FFFFFF" }}>GRAND TOTAL</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: "right", color: "#FFFFFF" }}>
                      {formatCurrency(data.main_office_total)}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: "right", color: "#FFFFFF" }}>
                      {formatCurrency(data.parts_total)}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: "right", color: "#FFFFFF" }}>
                      {formatCurrency(data.grand_total)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            <Divider sx={{ my: 3 }} />

            {/* Payables Section */}
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
              PAYABLES:
            </Typography>

            <TableContainer>
              <Table size="small" sx={{ borderCollapse: "collapse" }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ bgcolor: "#1E293B", color: "white", fontWeight: 700, fontSize: "0.75rem" }}>DESCRIPTION</TableCell>
                    <TableCell sx={{ bgcolor: "#1E293B", color: "white", fontWeight: 700, fontSize: "0.75rem" }} align="right">MAIN OFFICE</TableCell>
                    <TableCell sx={{ bgcolor: "#1E293B", color: "white", fontWeight: 700, fontSize: "0.75rem" }} align="right">PARTS</TableCell>
                    <TableCell sx={{ fontWeight: 600, textAlign: "right" }}>TOTAL</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>Total Disb. for Today</TableCell>
                    <TableCell sx={{ textAlign: "right" }}>
                      {formatCurrency(data.payables?.main_office?.disbursements_today)}
                    </TableCell>
                    <TableCell sx={{ textAlign: "right" }}>
                      {formatCurrency(data.payables?.parts?.disbursements_today)}
                    </TableCell>
                    <TableCell sx={{ textAlign: "right" }}>
                      {formatCurrency(
                        (data.payables?.main_office?.disbursements_today || 0) +
                        (data.payables?.parts?.disbursements_today || 0)
                      )}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Outstanding Checks Due</TableCell>
                    <TableCell sx={{ textAlign: "right" }}>
                      {data.payables?.main_office?.outstanding_checks > 0
                        ? formatCurrency(data.payables?.main_office?.outstanding_checks)
                        : "-"}
                    </TableCell>
                    <TableCell sx={{ textAlign: "right" }}>
                      {data.payables?.parts?.outstanding_checks > 0
                        ? formatCurrency(data.payables?.parts?.outstanding_checks)
                        : "-"}
                    </TableCell>
                    <TableCell sx={{ textAlign: "right" }}>
                      {(data.payables?.main_office?.outstanding_checks > 0 ||
                        data.payables?.parts?.outstanding_checks > 0)
                        ? formatCurrency(
                            (data.payables?.main_office?.outstanding_checks || 0) +
                            (data.payables?.parts?.outstanding_checks || 0)
                          )
                        : "-"}
                    </TableCell>
                  </TableRow>
                  {/* Grand Total Payables */}
                  <TableRow sx={{ bgcolor: "#1E293B", color: "#FFFFFF" }}>
                    <TableCell sx={{ fontWeight: 700, color: "#FFFFFF" }}>GRAND TOTAL</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: "right", color: "#FFFFFF" }}>
                      {formatCurrency(data.payables?.main_office?.disbursements_today + data.payables?.main_office?.outstanding_checks)}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: "right", color: "#FFFFFF" }}>
                      {formatCurrency(data.payables?.parts?.disbursements_today + data.payables?.parts?.outstanding_checks)}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: "right", color: "#FFFFFF" }}>
                      {formatCurrency(
                        data.payables?.main_office?.disbursements_today + data.payables?.main_office?.outstanding_checks +
                        data.payables?.parts?.disbursements_today + data.payables?.parts?.outstanding_checks
                      )}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            <Divider sx={{ my: 3 }} />

            {/* Net Balance Section */}
            <TableContainer>
              <Table size="small" sx={{ borderCollapse: "collapse" }}>
                <TableBody>
                  <TableRow sx={{ bgcolor: "#10B981", color: "#FFFFFF" }}>
                    <TableCell sx={{ fontWeight: 700, color: "#FFFFFF" }}>NET BALANCE</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: "right", color: "#FFFFFF" }}>
                      {formatCurrency(data.net_balance?.main_office)}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: "right", color: "#FFFFFF" }}>
                      {formatCurrency(data.net_balance?.parts)}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: "right", color: "#FFFFFF" }}>
                      {formatCurrency(data.net_balance?.total)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            {/* Signatures */}
            <Box sx={{ display: "flex", justifyContent: "space-between", mt: 4, pt: 2, borderTop: "1px solid #E5E7EB" }}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>Prepared by:</Typography>
                <Typography variant="body2" sx={{ mt: 1, textTransform: "uppercase" }}>
                  {user?.first_name && user?.last_name 
                    ? `${user.first_name} ${user.last_name}` 
                    : user?.username || "User"}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>Approved by:</Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>JOHN P. CABAÑOG</Typography>
              </Box>
            </Box>
          </Paper>
        </Stack>
      ) : null}
    <QuickActionFAB
        customActions={[
          { label: "Add Transaction", icon: <AddCircleOutlineIcon />, onClick: () => setAddTransactionOpen(true) },
          { label: "Add Bank Account", icon: <AccountBalanceIcon />, onClick: () => setAddBankOpen(true) },
          { label: "Add PDC", icon: <ReceiptLongIcon />, onClick: () => setAddPdcOpen(true) },
          { label: "Add PCF", icon: <WalletIcon />, onClick: () => setAddPcfOpen(true) },
        ]}
      />

      <AddTransaction open={addTransactionOpen} onClose={() => setAddTransactionOpen(false)} refreshData={() => fetchData(selectedDate)} />
      <AddBankAccount open={addBankOpen} onClose={() => setAddBankOpen(false)} refreshData={fetchData} />
      <PdcCreateModal open={addPdcOpen} onClose={() => setAddPdcOpen(false)} refreshData={fetchData} />
      <AddPcfModal open={addPcfOpen} onClose={() => setAddPcfOpen(false)} refreshData={fetchData} />
    </Box>
  );
}
