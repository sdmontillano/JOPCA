// src/components/Dashboard.jsx
import React, { useEffect, useState, useCallback } from "react";

import {
  AppBar,
  Toolbar,
  Box,
  Paper,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
  Alert,
  Stack,
  Tooltip,
  IconButton,
  Divider,
  Button,
  Grid,
  TextField,
  Collapse,
  Chip,
  Menu,
  MenuItem,
  Avatar,
  useMediaQuery,
  Snackbar,
  Badge,
  Fab,
  Zoom,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import HomeIcon from "@mui/icons-material/Home";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import AddIcon from "@mui/icons-material/Add";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import BarChartIcon from "@mui/icons-material/BarChart";
import LogoutIcon from "@mui/icons-material/Logout";
import RefreshIcon from "@mui/icons-material/Refresh";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import CloseIcon from "@mui/icons-material/Close";
import WalletIcon from "@mui/icons-material/Wallet";
import NotificationsIcon from "@mui/icons-material/Notifications";
import SettingsIcon from "@mui/icons-material/Settings";
import WarningIcon from "@mui/icons-material/Warning";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import AssessmentIcon from "@mui/icons-material/Assessment";
import PaidIcon from "@mui/icons-material/Paid";

import api, { unwrapResponse, getResponseCount, clearTokens } from "../services/tokenService";
import { useNavigate } from "react-router-dom";
import { mapDailyResponse, mapMonthlyResponse } from "../utils/dataMappers";

import AddBankAccount from "./AddBankAccount";
import AddTransaction from "./AddTransaction";
import PdcCreateModal from "./PdcCreateModal";
import PcfTable from "./PcfTable";
import CashOnHandCollections from "./CashOnHandCollections";
import AddPcfModal from "./AddPcfModal";
import AlertsModal from "./AlertsModal";

import logo from "../assets/jopca-logo.png";

import usePdcTotals from "../hooks/usePdcTotals";

// Helpers
function isoDateOffset(baseIso, offsetDays) {
  const d = new Date(baseIso);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}
function formatCurrency(v) {
  try {
    return Number(v ?? 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } catch {
    return String(v ?? "0.00");
  }
}
function formatPeso(value) {
  return `₱${Number(value ?? 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
function monthString(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Cash In Bank 2-Day Inline Component
function CashInBank2DayInline({ initialCenterDate = null, collapsed = false, onToggleCollapse = () => {} }) {
  const todayIso = new Date().toISOString().slice(0, 10);
  const defaultCenter = initialCenterDate || isoDateOffset(todayIso, -1);
  const [centerDate, setCenterDate] = useState(defaultCenter);
  const [dataMap, setDataMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const computeRange = (centerIso) => {
    const prev = isoDateOffset(centerIso, -1);
    return { dates: [prev, centerIso] };
  };

  const fetchRange = useCallback(async (centerIso) => {
    setLoading(true);
    setMessage(null);
    const { dates } = computeRange(centerIso);
    try {
      const results = [];
      const errors = [];
      
      for (const d of dates) {
        try {
          const res = await api.get("/summary/detailed-daily/", { params: { date: d } });
          results.push(res.data ?? res);
        } catch (err) {
          errors.push({ date: d, error: err });
          results.push({ cash_in_bank: [], accounts: [] });
        }
      }
      
      if (errors.length > 0) {
        const errorMsg = errors.map(e => `${e.date}: ${e.error?.response?.data?.detail || e.error?.message || 'Failed'}`).join('; ');
        setMessage({ type: "error", text: `Failed to load some data: ${errorMsg}` });
      }
      
      const out = {};
      dates.forEach((d, i) => {
        const payload = results[i] || { cash_in_bank: [], accounts: [] };
        const bankRows = Array.isArray(payload.cash_in_bank) && payload.cash_in_bank.length > 0
          ? payload.cash_in_bank
          : [{
              particulars: "No transactions",
              account_number: null,
              beginning: 0,
              collections: 0,
              local_deposits: 0,
              disbursements: 0,
              fund_transfers: 0,
              adjustments: 0,
              ending: 0,
            }];
        out[d] = { cash_in_bank: bankRows, accounts: Array.isArray(payload.accounts) ? payload.accounts : [] };
      });
      setDataMap(out);
    } catch (err) {
      console.error("Failed to fetch 2-day cash-in-bank", err);
      setMessage({ type: "error", text: "Failed to load cash-in-bank data." });
      setDataMap({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRange(centerDate);
  }, [centerDate, fetchRange]);

  const goPrev = () => setCenterDate((d) => isoDateOffset(d, -1));
  const goNext = () => setCenterDate((d) => isoDateOffset(d, 1));
  const refresh = () => fetchRange(centerDate);

  const { dates } = computeRange(centerDate);

  const totalsFor = (dateIso) => {
    const dayData = dataMap[dateIso] || { cash_in_bank: [], accounts: [] };
    const rows = Array.isArray(dayData.cash_in_bank) ? dayData.cash_in_bank : [];
    const pcfData = Array.isArray(dayData.accounts) ? dayData.accounts : [];

    const totalPcfBalance = pcfData.reduce((s, p) => s + Number(p.current_balance || p.ending || 0), 0);
    const totalPcfDisbursements = pcfData.reduce((s, p) => s + Number(p.disbursements || 0), 0);
    const totalPcfUnreplenished = pcfData.reduce((s, p) => s + Number(p.unreplenished || p.unreplenished_amount || 0), 0);

    const totalDisbursementsFromPcf = pcfData.reduce((s, p) => {
      let total = 0;
      if (p.transactions && Array.isArray(p.transactions)) {
        total = p.transactions.reduce((sum, t) => {
          if (t.type && t.type.toString().toLowerCase().includes('disburse')) {
            return sum + Number(t.amount || t.total || 0);
          }
          return sum;
        }, 0);
      }
      return s + total;
    }, 0);

    const displayTotalDisbursements = totalPcfDisbursements > 0 ? totalPcfDisbursements : totalDisbursementsFromPcf;

    return rows.reduce(
      (acc, r) => {
        acc.beginning += Number(r.beginning ?? r.beginning_balance ?? 0);
        acc.collections += Number(r.collections ?? 0);
        acc.local_deposits += Number(r.local_deposits ?? 0);
        acc.disbursements += displayTotalDisbursements;
        acc.fund_transfers_out += Number(r.fund_transfers_out ?? 0);
        acc.fund_transfers_in += Number(r.fund_transfers_in ?? 0);
        acc.adjustments += Number(r.adjustments ?? 0);
        acc.ending += Number(r.ending ?? 0);
        return acc;
      },
      { beginning: 0, collections: 0, local_deposits: 0, disbursements: 0, fund_transfers_out: 0, fund_transfers_in: 0, adjustments: 0, ending: 0 }
    );
  };

  return (
    <Paper sx={{ p: 2, mt: 2, borderRadius: 1, border: "1px solid", borderColor: "#E5E7EB", bgcolor: "#FFFFFF" }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#1E293B" }}>
            Cash in Bank — Yesterday & Previous Day
          </Typography>
          <Typography variant="caption" sx={{ color: "#6B7280" }}>
            Center (yesterday): <strong>{centerDate}</strong>
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button 
            variant="outlined" 
            size="small" 
            startIcon={<AccountBalanceIcon />} 
            onClick={onToggleCollapse} 
            sx={{ textTransform: "none", px: 2, borderColor: "#D1D5DB", color: "#475569" }}
          >
            {collapsed ? "Show" : "Hide"}
          </Button>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ ml: 1 }}>
            <Chip label={dates[0]} size="small" variant="outlined" sx={{ borderColor: "#E5E7EB", color: "#6B7280" }} />
            <Chip 
              label={dates[1]} 
              size="small" 
              sx={{ 
                borderColor: "#1E293B", 
                color: "#1E293B", 
                bgcolor: "#F1F5F9",
                fontWeight: 600
              }} 
            />
          </Stack>
          <IconButton size="small" onClick={goPrev} aria-label="previous day" sx={{ color: "#475569" }}>
            <ArrowBackIosNewIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={goNext} aria-label="next day" sx={{ color: "#475569" }}>
            <ArrowForwardIosIcon fontSize="small" />
          </IconButton>
          <Button size="small" onClick={refresh} disabled={loading} variant="contained" sx={{ bgcolor: "#1E293B" }}>
            Refresh
          </Button>
        </Stack>
      </Stack>

      <Collapse in={!collapsed} timeout={400}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress /></Box>
        ) : (
          <>
            {message && <Alert severity={message.type} sx={{ mb: 2 }}>{message.text}</Alert>}
            <Grid container spacing={2}>
              {dates.map((dateIso) => {
                const dayData = dataMap[dateIso] || { cash_in_bank: [], accounts: [] };
                const rows = Array.isArray(dayData.cash_in_bank) ? dayData.cash_in_bank : [];
                const totals = totalsFor(dateIso);
                const isToday = dateIso === centerDate;
                return (
                  <Grid item xs={12} md={6} key={dateIso}>
                    <Paper 
                      variant="outlined" 
                      sx={{ 
                        p: 2, 
                        height: "100%", 
                        borderRadius: 1,
                        border: "1px solid",
                        borderColor: isToday ? "#1E293B" : "#E5E7EB",
                        bgcolor: isToday ? "#F8FAFB" : "white"
                      }}
                    >
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: isToday ? "#1E293B" : "#374151" }}>
                            {dateIso}
                          </Typography>
                          {isToday && <Chip label="TODAY" size="small" sx={{ height: 18, fontSize: "0.65rem", bgcolor: "#1E293B", color: "white" }} />}
                        </Box>
                        <Typography variant="caption" sx={{ color: "#6B7280" }}>
                          {dayData.accounts?.length ? `${dayData.accounts.length} accounts` : "No accounts"}
                        </Typography>
                      </Box>
                        <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ color: "white", fontWeight: 700, fontSize: "0.7rem", bgcolor: "#1E293B" }}>Particulars</TableCell>
                            <TableCell align="right" sx={{ color: "white", fontWeight: 700, fontSize: "0.7rem", bgcolor: "#1E293B" }}>Beginning</TableCell>
                            <TableCell align="right" sx={{ color: "white", fontWeight: 700, fontSize: "0.7rem", bgcolor: "#1E293B" }}>Collections</TableCell>
                            <TableCell align="right" sx={{ color: "white", fontWeight: 700, fontSize: "0.7rem", bgcolor: "#1E293B" }}>Local Deposits</TableCell>
                            <TableCell align="right" sx={{ color: "white", fontWeight: 700, fontSize: "0.7rem", bgcolor: "#1E293B" }}>Disbursements</TableCell>
                            <TableCell align="right" sx={{ color: "white", fontWeight: 700, fontSize: "0.7rem", bgcolor: "#1E293B" }}>Fund Transfer</TableCell>
                            <TableCell align="right" sx={{ color: "white", fontWeight: 700, fontSize: "0.7rem", bgcolor: "#1E293B" }}>Fund Receipt</TableCell>
                            <TableCell align="right" sx={{ color: "white", fontWeight: 700, fontSize: "0.7rem", bgcolor: "#1E293B" }}>Adjustments</TableCell>
                            <TableCell align="right" sx={{ color: "white", fontWeight: 700, fontSize: "0.7rem", bgcolor: "#1E293B" }}>Ending</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {rows.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={8} align="center" sx={{ py: 3, color: "text.secondary" }}>
                                No data available
                              </TableCell>
                            </TableRow>
                          ) : (
                            rows.map((r, idx) => (
                              <TableRow key={r.bank_id ?? `${r.particulars}-${r.account_number}-${idx}`} sx={{ "&:hover": { bgcolor: "#F9FAFB" } }}>
                                <TableCell sx={{ fontWeight: 500, fontSize: "0.8rem", color: "#374151" }}>
                                  {r.particulars}
                                  <Typography variant="caption" display="block" sx={{ color: "#9CA3AF", fontSize: "0.7rem" }}>
                                    {r.account_number ?? ""}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right" sx={{ fontSize: "0.8rem", color: "#6B7280" }}>{formatCurrency(r.beginning ?? r.beginning_balance ?? 0)}</TableCell>
                                <TableCell align="right" sx={{ fontSize: "0.8rem", color: "#166534" }}>{formatCurrency(r.collections ?? 0)}</TableCell>
                                <TableCell align="right" sx={{ fontSize: "0.8rem", color: "#991B1B" }}>{formatCurrency(r.local_deposits ?? 0)}</TableCell>
                                <TableCell align="right" sx={{ fontSize: "0.8rem", color: "#991B1B" }}>{formatCurrency(r.disbursements ?? 0)}</TableCell>
                                <TableCell align="right" sx={{ fontSize: "0.8rem", color: "#991B1B" }}>{formatCurrency(r.fund_transfers_out ?? 0)}</TableCell>
                                <TableCell align="right" sx={{ fontSize: "0.8rem", color: "#166534" }}>{formatCurrency(r.fund_transfers_in ?? 0)}</TableCell>
                                <TableCell align="right" sx={{ fontSize: "0.8rem", color: "#B45309" }}>{formatCurrency(r.adjustments ?? 0)}</TableCell>
                                <TableCell align="right" sx={{ fontSize: "0.8rem", fontWeight: 700, color: "#1E293B" }}>{formatCurrency(r.ending ?? 0)}</TableCell>
                              </TableRow>
                            ))
                          )}
                          <TableRow sx={{ bgcolor: "#F1F5F9", borderTop: "2px solid #E5E7EB" }}>
                            <TableCell sx={{ fontWeight: 700, fontSize: "0.8rem", color: "#1E293B" }}>TOTALS</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600, color: "#6B7280", fontSize: "0.8rem" }}>{formatCurrency(totals.beginning)}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600, color: "#166534", fontSize: "0.8rem" }}>{formatCurrency(totals.collections)}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600, color: "#991B1B", fontSize: "0.8rem" }}>{formatCurrency(totals.local_deposits)}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600, color: "#991B1B", fontSize: "0.8rem" }}>{formatCurrency(totals.disbursements)}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600, color: "#991B1B", fontSize: "0.8rem" }}>{formatCurrency(totals.fund_transfers_out)}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600, color: "#166534", fontSize: "0.8rem" }}>{formatCurrency(totals.fund_transfers_in)}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600, color: "#B45309", fontSize: "0.8rem" }}>{formatCurrency(totals.adjustments)}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, color: "#1E293B", fontSize: "0.9rem" }}>{formatCurrency(totals.ending)}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                      <Box sx={{ mt: 1.5, pt: 1, borderTop: "1px dashed", borderColor: "#E5E7EB" }}>
                        <Typography variant="caption" sx={{ fontWeight: 600, color: "#6B7280", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          Accounts
                        </Typography>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, mt: 0.5 }}>
                          {(dayData.accounts || []).length > 0 ? (
                            (dayData.accounts || []).slice(0, 4).map((a) => (
                              <Box key={a.id} sx={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem" }}>
                                <Typography variant="body2" sx={{ fontWeight: 500, color: "#374151" }}>{a.name}</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 700, color: "#1E293B" }}>₱{formatCurrency(a.balance)}</Typography>
                              </Box>
                            ))
                          ) : (
                            <Typography variant="caption" sx={{ color: "#6B7280" }}>No accounts</Typography>
                          )}
                        </Box>
                      </Box>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          </>
        )}
      </Collapse>
    </Paper>
  );
}

// Top Navigation Bar
function TopNav({ onOpenAddBank, onOpenAddPdc, onOpenAddTransaction, onOpenAddPcf, onOpenAlerts, alertCount = 0 }) {
  const navigate = useNavigate();
  const isSmall = useMediaQuery((theme) => theme.breakpoints.down("md"));
  const [anchorEl, setAnchorEl] = useState(null);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);

  const navItems = [
    { key: "dashboard", label: "Dashboard", icon: <HomeIcon />, to: "/dashboard" },
    { key: "banks", label: "Banks", icon: <AccountBalanceIcon />, to: "/banks" },
    { key: "cash-summary", label: "Cash Summary", icon: <AccountBalanceWalletIcon />, to: "/cash-summary" },
    { key: "collect-cash", label: "Collect Cash", icon: <AccountBalanceWalletIcon />, to: "/collect-cash" },
    { key: "analysis", label: "Analysis", icon: <AssessmentIcon />, to: "/analysis" },
    { key: "transactions", label: "Transactions", icon: <ReceiptLongIcon />, to: "/transactions" },
    { key: "monthly", label: "Monthly", icon: <BarChartIcon />, to: "/monthly-report" },
    { key: "pdc", label: "PDC", icon: <ReceiptLongIcon />, to: "/pdc" },
    { key: "settings", label: "Settings", icon: <SettingsIcon />, to: "/settings" },
  ];

  const openMenu = (e) => setAnchorEl(e.currentTarget);
  const closeMenu = () => setAnchorEl(null);
  const openUserMenu = (e) => setUserMenuAnchor(e.currentTarget);
  const closeUserMenu = () => setUserMenuAnchor(null);
  const handleNavigate = (to) => { navigate(to); closeMenu(); };
  const handleLogout = async () => {
    try {
      await api.post("/api/auth/logout/");
    } catch (e) {
      // Ignore logout API errors
    }
    clearTokens();
    navigate("/login");
  };

  return (
    <AppBar position="sticky" color="default" elevation={2}>
      <Toolbar sx={{ gap: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, cursor: "pointer" }} onClick={() => navigate("/dashboard")}>
          <Box component="img" src={logo} alt="JOPCA logo" sx={{ width: 40, height: 40, objectFit: "contain" }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>JOPCA</Typography>
            <Typography variant="caption" color="text.secondary">Daily Cash Position</Typography>
          </Box>
        </Box>

        <Box sx={{ flex: 1 }} />

        {isSmall ? (
          <>
            <IconButton onClick={openMenu} aria-label="open menu"><MenuIcon /></IconButton>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={closeMenu}>
              {navItems.map((n) => (
                <MenuItem key={n.key} onClick={() => handleNavigate(n.to)}>{n.icon} <Box sx={{ ml: 1 }}>{n.label}</Box></MenuItem>
              ))}
              <Divider />
              <MenuItem onClick={() => { onOpenAddTransaction(); closeMenu(); }}><AddCircleOutlineIcon sx={{ mr: 1 }} /> Add Transaction</MenuItem>
              <MenuItem onClick={() => { onOpenAddBank(); closeMenu(); }}><AccountBalanceIcon sx={{ mr: 1 }} /> Add Bank</MenuItem>
              <MenuItem onClick={() => { onOpenAddPdc(); closeMenu(); }}><ReceiptLongIcon sx={{ mr: 1 }} /> Add PDC</MenuItem>
              <MenuItem onClick={() => { onOpenAddPcf(); closeMenu(); }}><WalletIcon sx={{ mr: 1 }} /> Add PCF</MenuItem>
              <MenuItem onClick={() => { onOpenAlerts(); closeMenu(); }}><NotificationsIcon sx={{ mr: 1 }} /> Alerts {alertCount > 0 && <Chip label={alertCount} size="small" color="error" sx={{ ml: 1 }} />}</MenuItem>
            </Menu>
          </>
        ) : (
          <>
            <Stack direction="row" spacing={1} alignItems="center">
              {navItems.map((n) => (
                <Button key={n.key} startIcon={n.icon} onClick={() => navigate(n.to)} color="inherit" sx={{ textTransform: "none" }}>
                  {n.label}
                </Button>
              ))}
            </Stack>
          </>
        )}

        <Box sx={{ width: 12 }} />

        <Tooltip title="Refresh">
          <IconButton color="inherit" onClick={() => window.location.reload()}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>

        <IconButton onClick={openUserMenu} sx={{ ml: 1 }}>
          <Avatar sx={{ bgcolor: "primary.main" }}><AccountCircleIcon /></Avatar>
        </IconButton>

        <Menu anchorEl={userMenuAnchor} open={Boolean(userMenuAnchor)} onClose={closeUserMenu}>
          <MenuItem onClick={() => { closeUserMenu(); navigate("/settings"); }}>
            <AccountCircleIcon sx={{ mr: 1 }} /> Settings
          </MenuItem>
          <MenuItem onClick={() => { closeUserMenu(); navigate("/change-password"); }}>
            <AccountCircleIcon sx={{ mr: 1 }} /> Change Password
          </MenuItem>
          <Divider />
          <MenuItem onClick={() => { closeUserMenu(); handleLogout(); }}>
            <LogoutIcon sx={{ mr: 1 }} /> Logout
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}

// Main Dashboard Component
export default function Dashboard() {
  return <DashboardInner />;
}

function DashboardInner() {
  // State
  const [dailyReport, setDailyReport] = useState({});
  const [dailyRaw, setDailyRaw] = useState(null);
  const [monthlyReport, setMonthlyReport] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [manualMonth, setManualMonth] = useState("");
  const navigate = useNavigate();

  // Modal states
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [pdcModalOpen, setPdcModalOpen] = useState(false);
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [pcfModalOpen, setPcfModalOpen] = useState(false);
  const [alertsModalOpen, setAlertsModalOpen] = useState(false);

  // UI states
  const [showCashInBank, setShowCashInBank] = useState(false);
  const [cashCollapsed, setCashCollapsed] = useState(false);
  const [actionAlert, setActionAlert] = useState(null);
  const [pcfData, setPcfData] = useState([]);
  const [collectionsData, setCollectionsData] = useState([]);
  const [alertCount, setAlertCount] = useState(0);
  
  // FAB Menu State
  const [fabOpen, setFabOpen] = useState(false);

  // PDC fallback hook
  const reportMonth = manualMonth || monthString();
  const {
    totals: pdcFallbackTotals,
    refresh: refreshPdcTotals,
  } = usePdcTotals(reportMonth);

  // Fetch all data
  const fetchAll = useCallback(async (monthOverride = null) => {
    setError(null);
    setRefreshing(true);
    try {
      // Fetch daily data with error handling
      let dailyRes;
      try {
        dailyRes = await api.get("/summary/detailed-daily/");
      } catch (dailyErr) {
        console.error("Failed to fetch daily data:", dailyErr);
        throw new Error(`Failed to load daily data: ${dailyErr.response?.data?.detail || dailyErr.message || 'Unknown error'}`);
      }

      // Fetch monthly data with error handling
      let monthlyRes;
      try {
        const today = new Date();
        const monthStr = monthOverride || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
        monthlyRes = await api.get(`/summary/detailed-monthly/?month=${monthStr}`);
      } catch (monthlyErr) {
        console.error("Failed to fetch monthly data:", monthlyErr);
        throw new Error(`Failed to load monthly data: ${monthlyErr.response?.data?.detail || monthlyErr.message || 'Unknown error'}`);
      }

      // Extract raw data from axios response
      const rawDaily = dailyRes.data || dailyRes;
      const rawMonthly = monthlyRes.data || monthlyRes;

      // Map the data with null safety
      const mappedDaily = (() => {
        try {
          return mapDailyResponse(rawDaily) || {};
        } catch (e) {
          console.error("mapDailyResponse failed", e);
          return {};
        }
      })();

      const mappedMonthly = (() => {
        try {
          return mapMonthlyResponse(rawMonthly) || {};
        } catch (e) {
          console.error("mapMonthlyResponse failed", e);
          return {};
        }
      })();

      setDailyRaw(rawDaily);
      setDailyReport(mappedDaily);
      setMonthlyReport(mappedMonthly);
      
      // Extract PCF data - prioritize raw API data, then mapped data with null safety
      const rawCashOnHand = rawDaily?.cash_on_hand || [];
      const mappedCashOnHand = mappedDaily?.cash_on_hand || [];
      
      // Use PCF data if available and non-empty
      if (Array.isArray(rawCashOnHand) && rawCashOnHand.length > 0) {
        setPcfData(rawCashOnHand);
      } else if (Array.isArray(mappedCashOnHand) && mappedCashOnHand.length > 0) {
        setPcfData(mappedCashOnHand);
      } else {
        setPcfData([]);  // No PCF data available
      }

      // Extract Collections data from API response
      const rawCollections = rawDaily?.cash_collections || [];
      const individualCollections = rawDaily?.individual_collections || [];
      
      // Debug logging
      console.log("DEBUG: Collections data received:", {
        rawCollections: rawCollections,
        individualCollections: individualCollections,
        individualCollectionsCount: individualCollections.length
      });
      
      setCollectionsData(Array.isArray(individualCollections) ? individualCollections : []);
    } catch (err) {
      console.error("Error fetching dashboard data", err);
      const msg = err?.response?.data?.detail || err?.response?.data || err?.message || "Failed to load dashboard data";
      setError(String(msg));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Fetch alerts count
  const fetchAlertsCount = async () => {
    try {
      const res = await api.get("/summary/pcf-alerts/");
      const alerts = res?.data?.alerts || [];
      setAlertCount(alerts.length);
    } catch (err) {
      console.error("Failed to fetch alerts", err);
      setAlertCount(0);
    }
  };

  useEffect(() => {
    // Small delay to ensure everything is initialized before fetching data
    const timer = setTimeout(() => {
      fetchAll();
      fetchAlertsCount();
    }, 500); // 0.5 second delay for dashboard data fetch
    return () => clearTimeout(timer);
  }, [fetchAll]);

  // Derive data - use pcfData directly for PCF display
  const cashOnHand = pcfData;

  const deriveBankRowsFromTxns = (txns = []) =>
    (Array.isArray(txns) ? txns : []).reduce((acc, t) => {
      const bank = t.particulars || "Unknown Bank";
      let row = acc.find((r) => r.particulars === bank);
      if (!row) {
        row = {
          particulars: bank,
          beginning: 0,
          collections: 0,
          local_deposits: 0,
          disbursements: 0,
          fund_transfers: 0,
          returned_checks: 0,
          adjustments: 0,
          ending: 0,
          raw_rows: [],
          account_number: t.account_number || null,
        };
        acc.push(row);
      }
      const total = Number(t.total ?? t.amount ?? 0) || 0;
      const type = (t.type || "").toString().toLowerCase();
      // Transaction categorization:
      // - Collections: cash received (goes to Cash on Hand, NOT bank)
      // - Local Deposits: cash deposited TO bank (increases bank balance)
      // - Disbursements: payments from bank (decreases bank balance)
      // - Fund Transfers: transfers between accounts
      // - Returned Checks: checks returned (decreases bank balance)
      // - Adjustments: bank charges, etc.
      if (type.includes("collect")) row.collections += total;
      else if (type.includes("local_deposit")) row.local_deposits += total;
      else if (type.includes("deposit") && !type.includes("local")) row.local_deposits += total;
      else if (type.includes("disburse")) row.disbursements += total;
      else if (type.includes("fund") || type.includes("interbank")) row.fund_transfers += total;
      else if (type.includes("return")) row.returned_checks += total;
      else if (type.includes("adjust") || type.includes("bank_charge")) row.adjustments += total;
      row.raw_rows.push(t.raw || t);
      // Cash in Bank Formula: Beginning + Deposits - Disbursements + Fund Transfers In - Fund Transfers Out
      // Note: Collections are NOT included (they go to Cash on Hand, not bank balance)
      // Local Deposits is tracking only (does NOT affect ending balance)
      // Adjustments and Returned Checks are tracking only - they do NOT affect ending balance
      row.ending = (row.beginning || 0) + (row.deposits || 0) - (row.disbursements || 0) + (row.fund_transfers_in || 0) - (row.fund_transfers_out || 0);
      if (!row.account_number && t.account_number) row.account_number = t.account_number;
      return acc;
    }, []);

  const initialDerivedCashInBank =
    Array.isArray(dailyReport?.cash_in_bank) && dailyReport.cash_in_bank.length > 0
      ? dailyReport.cash_in_bank
      : Array.isArray(dailyReport?.transactions) && dailyReport.transactions.length > 0
      ? deriveBankRowsFromTxns(dailyReport.transactions)
      : Array.isArray(monthlyReport?.transactions) && monthlyReport.transactions.length > 0
      ? deriveBankRowsFromTxns(monthlyReport.transactions)
      : [];

  const mergeAccountsIntoCashInBank = (derivedRows, dailyAccounts, monthlyAccounts) => {
    const rows = Array.isArray(derivedRows) ? [...derivedRows] : [];
    const seen = new Map(rows.map((r) => [String((r.particulars || "").toLowerCase()) + "|" + String(r.account_number || ""), r]));
    const addAccount = (a) => {
      if (!a) return;
      const name = a.name || a.bank_name || a.particulars || "Unknown";
      const acct = a.account_number || a.account_no || a.number || null;
      const key = String((name || "").toLowerCase()) + "|" + String(acct || "");
      if (seen.has(key)) {
        const existing = seen.get(key);
        if (!existing.account_number && acct) existing.account_number = acct;
        return;
      }
      const newRow = {
        particulars: name,
        account_number: acct,
        beginning: 0,
        collections: 0,
        local_deposits: 0,
        disbursements: 0,
        fund_transfers_out: 0,
        fund_transfers_in: 0,
        adjustments: 0,
        ending: Number(a.balance ?? a.amount ?? 0) || 0,
        raw_rows: [],
        raw_account: a,
      };
      rows.push(newRow);
      seen.set(key, newRow);
    };
    if (Array.isArray(dailyAccounts)) dailyAccounts.forEach(addAccount);
    if (Array.isArray(monthlyAccounts)) monthlyAccounts.forEach(addAccount);
    return rows;
  };

  const cashInBank = mergeAccountsIntoCashInBank(
    initialDerivedCashInBank,
    Array.isArray(dailyReport?.accounts) ? dailyReport.accounts : [],
    Array.isArray(monthlyReport?.accounts) ? monthlyReport.accounts : []
  );

  const banksList = (() => {
    if (Array.isArray(dailyReport?.accounts) && dailyReport.accounts.length > 0) {
      return dailyReport.accounts.map((a) => ({
        name: a.name || a.bank_name || a.particulars || "Unknown",
        account_number: a.account_number || a.account_no || a.number || null,
        balance: a.balance ?? a.amount ?? 0,
        raw: a,
      }));
    }
    if (Array.isArray(monthlyReport?.accounts) && monthlyReport.accounts.length > 0) {
      return monthlyReport.accounts.map((a) => ({
        name: a.name || a.bank_name || a.particulars || "Unknown",
        account_number: a.account_number || a.account_no || a.number || null,
        balance: a.balance ?? a.amount ?? 0,
        raw: a,
      }));
    }
    return [];
  })();

  // Calculate totals for KPI cards
  const bankCollections = cashInBank.reduce((sum, bank) => sum + Number(bank.collections || 0), 0);
  const cashCollections = collectionsData.reduce((sum, collection) => sum + Number(collection.amount || 0), 0);
  const totalCollections = bankCollections + cashCollections;
  const totalEndingAllBanks = cashInBank.reduce((sum, bank) => sum + Number(bank.ending || 0), 0);
  const totalPcfBalance = pcfData.reduce((sum, pcf) => sum + Number(pcf.current_balance || pcf.ending || 0), 0);
  const totalPcfUnreplenished = pcfData.reduce((sum, pcf) => sum + Number(pcf.unreplenished || pcf.unreplenished_amount || 0), 0);

  const handleOpenAddTransaction = () => {
    setTransactionModalOpen(true);
  };

  const handleOpenAddPdc = () => {
    setPdcModalOpen(true);
  };

  const handleOpenAddPcf = () => {
    setPcfModalOpen(true);
  };

  const handleOpenAlerts = () => {
    setAlertsModalOpen(true);
  };

  // PDC Summary
  const backendPdc = dailyReport?.pdc_summary ?? dailyRaw?.pdc_summary ?? null;
  const backendTotal = Number(backendPdc?.total ?? backendPdc?.this_month ?? 0) || 0;
  const backendMatured = Number(backendPdc?.matured ?? 0) || 0;

  const effectivePdcSummary = (backendPdc && (backendTotal > 0 || backendMatured > 0))
    ? {
        matured: Number(backendPdc.matured ?? backendPdc.mature ?? 0),
        this_month: Number(backendPdc.this_month ?? backendPdc.thisMonth ?? 0),
        next_month: Number(backendPdc.next_month ?? backendPdc.nextMonth ?? 0),
        total: Number(backendPdc.total ?? backendPdc.total_amount ?? backendTotal),
      }
    : {
        matured: pdcFallbackTotals.matured || 0,
        this_month: pdcFallbackTotals.this_month || 0,
        next_month: pdcFallbackTotals.next_month || 0,
        total: pdcFallbackTotals.total || 0,
      };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        <Stack direction="row" spacing={1}>
          <Button variant="contained" startIcon={<RefreshIcon />} onClick={() => fetchAll(manualMonth || null)}>Retry Fetch</Button>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <TopNav
        onOpenAddBank={() => setBankModalOpen(true)}
        onOpenAddPdc={handleOpenAddPdc}
        onOpenAddTransaction={handleOpenAddTransaction}
        onOpenAddPcf={handleOpenAddPcf}
        onOpenAlerts={handleOpenAlerts}
        alertCount={alertCount}
      />

      <Box sx={{ p: { xs: 2, md: 4 } }}>
        {actionAlert && (
          <Snackbar open autoHideDuration={4500} onClose={() => setActionAlert(null)}>
            <Alert severity={actionAlert.severity} sx={{ width: "100%" }}>{actionAlert.text}</Alert>
          </Snackbar>
        )}

        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: "primary.dark", letterSpacing: "-0.5px" }}>
              JOPCA CORPORATION
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 500, color: "text.secondary" }}>
              Daily Cash Position Report
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 500 }}>
              {dailyReport?.office || "CAGAYAN DE ORO MAIN OFFICE"} — {dailyReport?.date || ""}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            {(localStorage.getItem("isStaff") === "true" || localStorage.getItem("isSuperuser") === "true") && (
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  localStorage.setItem("userRole", "admin");
                  window.location.hash = "#/admin";
                  window.location.reload();
                }}
                sx={{ 
                  borderColor: "#1E293B", 
                  color: "#1E293B",
                  textTransform: "none",
                  "&:hover": { bgcolor: "#1E293B", color: "#FFFFFF" }
                }}
              >
                Go to Admin
              </Button>
            )}
          </Box>

        </Stack>

        {/* KPI Cards Row - Modern Minimal */}
        <Box sx={{ mb: 3, display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(5, 1fr)" }, gap: 2 }}>
          {/* Collections Card */}
          <Paper elevation={0} sx={{ 
            p: 2.5, 
            borderRadius: 1,
            border: "1px solid",
            borderColor: "#E5E7EB",
            bgcolor: "#FFFFFF",
            transition: "all 0.15s ease",
            "&:hover": { borderColor: "#1E293B", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }
          }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
              <Box sx={{ 
                width: 32, 
                height: 32, 
                borderRadius: 1, 
                bgcolor: "#ECFDF5",
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center" 
              }}>
                <PaidIcon sx={{ fontSize: 16, color: "#166534" }} />
              </Box>
              <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.65rem" }}>
                Collections
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#166534", letterSpacing: "-0.01em" }}>
              {formatPeso(totalCollections)}
            </Typography>
          </Paper>

          {/* Cash in Bank Card */}
          <Paper elevation={0} sx={{ 
            p: 2.5, 
            borderRadius: 1,
            border: "1px solid",
            borderColor: "#E5E7EB",
            bgcolor: "#FFFFFF",
            transition: "all 0.15s ease",
            "&:hover": { borderColor: "#1E293B", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }
          }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
              <Box sx={{ 
                width: 32, 
                height: 32, 
                borderRadius: 1, 
                bgcolor: "#F1F5F9",
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center" 
              }}>
                <AccountBalanceIcon sx={{ fontSize: 16, color: "#475569" }} />
              </Box>
              <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.65rem" }}>
                Cash in Bank
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#1E293B", letterSpacing: "-0.01em" }}>
              {formatPeso(totalEndingAllBanks)}
            </Typography>
          </Paper>

          {/* PCF Balance Card */}
          <Paper elevation={0} sx={{ 
            p: 2.5, 
            borderRadius: 1,
            border: "1px solid",
            borderColor: "#E5E7EB",
            bgcolor: "#FFFFFF",
            transition: "all 0.15s ease",
            "&:hover": { borderColor: "#1E293B", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }
          }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
              <Box sx={{ 
                width: 32, 
                height: 32, 
                borderRadius: 1, 
                bgcolor: "#F1F5F9",
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center" 
              }}>
                <WalletIcon sx={{ fontSize: 16, color: "#475569" }} />
              </Box>
              <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.65rem" }}>
                PCF Balance
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#1E293B", letterSpacing: "-0.01em" }}>
              {formatPeso(totalPcfBalance)}
            </Typography>
          </Paper>

          {/* PDC This Month Card */}
          <Paper elevation={0} sx={{ 
            p: 2.5, 
            borderRadius: 1,
            border: "1px solid",
            borderColor: "#E5E7EB",
            bgcolor: "#FFFFFF",
            transition: "all 0.15s ease",
            "&:hover": { borderColor: "#1E293B", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }
          }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
              <Box sx={{ 
                width: 32, 
                height: 32, 
                borderRadius: 1, 
                bgcolor: "#F1F5F9",
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center" 
              }}>
                <ReceiptLongIcon sx={{ fontSize: 16, color: "#475569" }} />
              </Box>
              <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.65rem" }}>
                PDC This Month
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#1E293B", letterSpacing: "-0.01em" }}>
              {formatPeso(effectivePdcSummary.this_month ?? 0)}
            </Typography>
          </Paper>

          {/* PDC Total Card */}
          <Paper elevation={0} sx={{ 
            p: 2.5, 
            borderRadius: 1,
            border: "1px solid",
            borderColor: "#E5E7EB",
            bgcolor: "#FFFFFF",
            transition: "all 0.15s ease",
            "&:hover": { borderColor: "#1E293B", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }
          }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
              <Box sx={{ 
                width: 32, 
                height: 32, 
                borderRadius: 1, 
                bgcolor: "#F1F5F9",
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center" 
              }}>
                <ReceiptLongIcon sx={{ fontSize: 16, color: "#475569" }} />
              </Box>
              <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.65rem" }}>
                PDC Total
              </Typography>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#1E293B", letterSpacing: "-0.01em" }}>
              {formatPeso(effectivePdcSummary.total ?? 0)}
            </Typography>
          </Paper>
        </Box>

        {/* Unreplenished Alert Card - Muted */}
        {totalPcfUnreplenished > 0 && (
          <Paper elevation={0} sx={{ 
            mb: 3, 
            p: 2, 
            borderRadius: 1,
            border: "1px solid",
            borderColor: "#FDE68A",
            bgcolor: "#FFFBEB",
            borderLeft: "3px solid",
            borderLeftColor: "#B45309",
          }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <WarningIcon sx={{ color: "#B45309", fontSize: 20 }} />
                <Typography variant="body2" sx={{ color: "#92400E", fontWeight: 500 }}>
                  Unreplenished PCF:
                </Typography>
                <Typography variant="body2" sx={{ color: "#92400E", fontWeight: 700 }}>
                  {formatPeso(totalPcfUnreplenished)}
                </Typography>
              </Box>
            </Box>
          </Paper>
        )}

        {/* PCF Cash on Hand Section */}
        <Box sx={{ mb: 3 }}>
          <PcfTable pcfs={cashOnHand} showExport={true} defaultExpanded={true} />
        </Box>

        {/* Bank Collections Section */}
        <Box sx={{ mb: 3 }}>
          <CashOnHandCollections showExport={true} defaultExpanded={true} />
        </Box>

        {/* Cash in Bank Section */}
        <Box sx={{ mb: 3 }}>
          <Paper elevation={0} sx={{ borderRadius: 1, border: "1px solid", borderColor: "#E5E7EB", overflow: "hidden" }}>
            {/* Section Header - Minimal */}
            <Box sx={{ 
              px: 2,
              py: 1.5, 
              bgcolor: "#FFFFFF",
              borderBottom: "1px solid #E5E7EB",
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center"
            }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <AccountBalanceIcon sx={{ color: "#475569", fontSize: 18 }} />
                <Typography variant="body2" sx={{ fontWeight: 600, color: "#374151", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                  Cash in Bank
                </Typography>
              </Box>
              <Button
                variant="outlined"
                onClick={() => { setShowCashInBank((s) => !s); if (!showCashInBank) setCashCollapsed(false); }}
                size="small"
                sx={{ 
                  borderColor: "#E5E7EB",
                  color: "#475569",
                  "&:hover": { bgcolor: "#F3F4F6", borderColor: "#D1D5DB" }
                }}
              >
                {showCashInBank ? "Hide" : "Show"} History
              </Button>
            </Box>

            {showCashInBank && (
              <Box sx={{ p: 2, bgcolor: "#F9FAFB" }}>
                <CashInBank2DayInline initialCenterDate={null} collapsed={cashCollapsed} onToggleCollapse={() => setCashCollapsed((c) => !c)} />
              </Box>
            )}

            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: "white", fontWeight: 700, bgcolor: "#1E293B" }}>PARTICULARS</TableCell>
                  <TableCell sx={{ color: "white", fontWeight: 700, bgcolor: "#1E293B" }}>Account #</TableCell>
                  <TableCell align="right" sx={{ color: "white", fontWeight: 700, bgcolor: "#1E293B" }}>Beginning</TableCell>
                  <TableCell align="right" sx={{ color: "white", fontWeight: 700, bgcolor: "#1E293B" }}>Collections</TableCell>
                  <TableCell align="right" sx={{ color: "white", fontWeight: 700, bgcolor: "#1E293B" }}>Local Deposits</TableCell>
                  <TableCell align="right" sx={{ color: "white", fontWeight: 700, bgcolor: "#1E293B" }}>Disbursements</TableCell>
                  <TableCell align="right" sx={{ color: "white", fontWeight: 700, bgcolor: "#1E293B" }}>Fund Transfer</TableCell>
                  <TableCell align="right" sx={{ color: "white", fontWeight: 700, bgcolor: "#1E293B" }}>Fund Receipt</TableCell>
                  <TableCell align="right" sx={{ color: "white", fontWeight: 700, bgcolor: "#1E293B" }}>Adjustments</TableCell>
                  <TableCell align="right" sx={{ color: "white", fontWeight: 700, bgcolor: "#1E293B" }}>Returned</TableCell>
                  <TableCell align="right" sx={{ color: "white", fontWeight: 700, bgcolor: "#1E293B" }}>Ending</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {cashInBank.length > 0 ? (
                  cashInBank.map((r, i) => (
                    <TableRow key={i} sx={{ "&:hover": { bgcolor: "#F3F4F6" } }}>
                      <TableCell sx={{ fontWeight: 500, color: "#374151" }}>{r.particulars || `Bank ${i + 1}`}</TableCell>
                      <TableCell sx={{ fontFamily: "monospace", fontSize: "0.8rem", color: "#9CA3AF" }}>
                        {r.account_number || 
                         (r.raw_rows && r.raw_rows.length > 0 && r.raw_rows[0]?.bank_account__account_number) || 
                         "-"}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 500, color: "#6B7280" }}>{formatPeso(r.beginning ?? 0)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 500, color: "#166534" }}>{formatPeso(r.collections ?? 0)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 500, color: "#991B1B" }}>{formatPeso(r.local_deposits ?? 0)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 500, color: "#991B1B" }}>{formatPeso(r.disbursements ?? 0)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 500, color: "#991B1B" }}>{formatPeso(r.fund_transfers_out ?? 0)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 500, color: "#166534" }}>{formatPeso(r.fund_transfers_in ?? 0)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 500, color: "#B45309" }}>{formatPeso(r.adjustments ?? 0)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 500, color: "#B45309" }}>{formatPeso(r.returned_checks ?? 0)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: "#1E293B" }}>{formatPeso(r.ending ?? 0)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={11} align="center" sx={{ py: 4, color: "#9CA3AF" }}>
                      No bank transactions found
                    </TableCell>
                  </TableRow>
                )}
                <TableRow sx={{ bgcolor: "#1E293B" }}>
                  <TableCell colSpan={2} sx={{ fontWeight: 700, fontSize: "0.85rem", color: "#FFFFFF" }}>
                    GRAND TOTAL
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, color: "#FFFFFF" }}></TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, color: "#FFFFFF" }}></TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, color: "#FFFFFF" }}></TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, color: "#FFFFFF" }}></TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, color: "#FFFFFF" }}></TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, color: "#FFFFFF" }}></TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: "1rem", p: 1, color: "#F59E0B" }}>
                    {formatPeso(totalEndingAllBanks)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Paper>
        </Box>

        </Box>

      {/* Floating Action Button - Quick Add Menu */}
      <Zoom in timeout={300}>
        <Fab
          aria-label="add"
          sx={{
            position: "fixed",
            bottom: 32,
            right: 32,
            width: 60,
            height: 60,
            bgcolor: "#1E293B",
            color: "white",
            boxShadow: "0 4px 12px rgba(30,41,59,0.3)",
            "&:hover": {
              bgcolor: "#334155",
              boxShadow: "0 6px 16px rgba(30,41,59,0.4)",
              transform: "scale(1.05)",
            },
            transition: "all 0.2s ease-in-out",
          }}
          onClick={() => setFabOpen(!fabOpen)}
        >
          <AddIcon sx={{ fontSize: 28 }} />
        </Fab>
      </Zoom>

      {/* FAB Menu */}
      <Zoom in={fabOpen}>
        <Paper
          sx={{
            position: "fixed",
            bottom: 100,
            right: 32,
            p: 1.5,
            borderRadius: 2,
            minWidth: 200,
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            zIndex: 1000,
          }}
        >
          <Typography variant="caption" sx={{ px: 1, pb: 1, color: "text.secondary", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", display: "block" }}>
            Quick Actions
          </Typography>
          <Divider sx={{ mb: 1 }} />
          <MenuItem onClick={() => { handleOpenAddTransaction(); setFabOpen(false); }} sx={{ borderRadius: 1, py: 1.5 }}>
            <AddCircleOutlineIcon sx={{ mr: 1.5, color: "primary.main" }} />
            <Typography variant="body2" fontWeight={500}>Add Transaction</Typography>
          </MenuItem>
          <MenuItem onClick={() => { setBankModalOpen(true); setFabOpen(false); }} sx={{ borderRadius: 1, py: 1.5 }}>
            <AccountBalanceIcon sx={{ mr: 1.5, color: "primary.main" }} />
            <Typography variant="body2" fontWeight={500}>Add Bank Account</Typography>
          </MenuItem>
          <MenuItem onClick={() => { handleOpenAddPdc(); setFabOpen(false); }} sx={{ borderRadius: 1, py: 1.5 }}>
            <ReceiptLongIcon sx={{ mr: 1.5, color: "info.main" }} />
            <Typography variant="body2" fontWeight={500}>Add PDC</Typography>
          </MenuItem>
          <MenuItem onClick={() => { handleOpenAddPcf(); setFabOpen(false); }} sx={{ borderRadius: 1, py: 1.5 }}>
            <WalletIcon sx={{ mr: 1.5, color: "secondary.main" }} />
            <Typography variant="body2" fontWeight={500}>Add PCF</Typography>
          </MenuItem>
        </Paper>
      </Zoom>

      {/* FAB Backdrop */}
      {fabOpen && (
        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: "rgba(0,0,0,0.3)",
            zIndex: 999,
          }}
          onClick={() => setFabOpen(false)}
        />
      )}

      {/* Modals */}
      <AddBankAccount
        open={bankModalOpen}
        onClose={() => setBankModalOpen(false)}
        onCreated={(newBank) => {
          setDailyReport((prev) => {
            if (!prev) return prev;
            const accounts = Array.isArray(prev.accounts) ? [newBank, ...prev.accounts] : [newBank];
            return { ...prev, accounts };
          });
        }}
      />

      <PdcCreateModal
        open={pdcModalOpen}
        onClose={() => setPdcModalOpen(false)}
        onCreated={() => {
          setPdcModalOpen(false);
          fetchAll(manualMonth || null);
          refreshPdcTotals();
        }}
      />

      <AddTransaction
        open={transactionModalOpen}
        onClose={() => setTransactionModalOpen(false)}
        onCreated={() => {
          fetchAll(manualMonth || null);
        }}
      />

      <AddPcfModal
        open={pcfModalOpen}
        onClose={() => setPcfModalOpen(false)}
        onCreated={() => {
          setPcfModalOpen(false);
          fetchAll(manualMonth || null);
        }}
      />

      <AlertsModal
        open={alertsModalOpen}
        onClose={() => setAlertsModalOpen(false)}
      />
    </Box>
  );
}
