// src/components/Dashboard.jsx
import React, { useEffect, useState, useCallback } from "react";
import { ThemeProvider } from "@mui/material/styles";
import jopcaTheme from "../theme/jopcaTheme";
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
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import HomeIcon from "@mui/icons-material/Home";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import BarChartIcon from "@mui/icons-material/BarChart";
import LogoutIcon from "@mui/icons-material/Logout";
import RefreshIcon from "@mui/icons-material/Refresh";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import CloseIcon from "@mui/icons-material/Close";

import api from "../services/tokenService";
import { useNavigate } from "react-router-dom";
import { mapDailyResponse, mapMonthlyResponse } from "../utils/dataMappers";

import AddBankAccount from "./AddBankAccount";
import AddTransaction from "./AddTransaction";
import PdcCreateModal from "./PdcCreateModal";

import logo from "../assets/jopca-logo.png";

import usePdcTotals from "../hooks/usePdcTotals";

/* ---------------------------
   Helpers
   --------------------------- */
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

/* ---------------------------
   Inline 2-day CashInBank component
   --------------------------- */
function CashInBank2DayInline({ initialCenterDate = null, collapsed = false, onToggleCollapse = () => {} }) {
  const todayIso = new Date().toISOString().slice(0, 10);
  const defaultCenter = initialCenterDate || isoDateOffset(todayIso, -1); // yesterday
  const [centerDate, setCenterDate] = useState(defaultCenter);
  const [dataMap, setDataMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const computeRange = (centerIso) => {
    const prev = isoDateOffset(centerIso, -1);
    return { dates: [prev, centerIso] };
  };

  const fetchRange = useCallback(
    async (centerIso) => {
      setLoading(true);
      setMessage(null);
      const { dates } = computeRange(centerIso);
      try {
        const promises = dates.map((d) =>
          api
            .get("/summary/detailed-daily/", { params: { date: d } })
            .then((r) => r.data ?? r)
            .catch(() => ({ cash_in_bank: [], accounts: [] }))
        );
        const results = await Promise.all(promises);
        const out = {};
        dates.forEach((d, i) => {
          const payload = results[i] || { cash_in_bank: [], accounts: [] };
          const bankRows = Array.isArray(payload.cash_in_bank) && payload.cash_in_bank.length > 0
            ? payload.cash_in_bank
            : [
                {
                  particulars: "No transactions",
                  account_number: null,
                  beginning: 0,
                  collections: 0,
                  local_deposits: 0,
                  disbursements: 0,
                  fund_transfers: 0,
                  returned_checks: 0,
                  ending: 0,
                },
              ];
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
    },
    []
  );

  useEffect(() => {
    fetchRange(centerDate);
  }, [centerDate, fetchRange]);

  const goPrev = () => setCenterDate((d) => isoDateOffset(d, -1));
  const goNext = () => setCenterDate((d) => isoDateOffset(d, 1));
  const refresh = () => fetchRange(centerDate);

  const { dates } = computeRange(centerDate);

  const totalsFor = (dateIso) => {
    const dayData = dataMap[dateIso] || { cash_in_bank: [] };
    const rows = Array.isArray(dayData.cash_in_bank) ? dayData.cash_in_bank : [];
    return rows.reduce(
      (acc, r) => {
        acc.beginning += Number(r.beginning ?? r.beginning_balance ?? 0);
        acc.collections += Number(r.collections ?? 0);
        acc.local_deposits += Number(r.local_deposits ?? 0);
        acc.disbursements += Number(r.disbursements ?? 0);
        acc.fund_transfers += Number(r.fund_transfers ?? r.transfers ?? 0);
        acc.returned_checks += Number(r.returned_checks ?? 0);
        acc.ending += Number(r.ending ?? 0);
        return acc;
      },
      { beginning: 0, collections: 0, local_deposits: 0, disbursements: 0, fund_transfers: 0, returned_checks: 0, ending: 0 }
    );
  };

  return (
    <Paper sx={{ p: 2, mt: 2, borderRadius: 2, boxShadow: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h6">Cash in Bank — Yesterday & Previous Day</Typography>
          <Typography variant="caption" color="text.secondary">
            Center (yesterday): {centerDate}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            variant="outlined"
            size="small"
            startIcon={<AccountBalanceIcon />}
            onClick={onToggleCollapse}
            sx={{ textTransform: "none", px: 2 }}
          >
            Show / Hide Recent Days
          </Button>

          <Stack direction="row" spacing={1} alignItems="center" sx={{ ml: 1 }}>
            <Chip label={dates[0]} size="small" color="primary" variant="outlined" />
            <Chip label={dates[1]} size="small" sx={{ borderColor: "secondary.main", color: "secondary.main", background: "rgba(255,213,74,0.06)" }} />
          </Stack>

          <IconButton size="small" onClick={goPrev} aria-label="previous day">
            <ArrowBackIosNewIcon fontSize="small" />
          </IconButton>

          <IconButton size="small" onClick={goNext} aria-label="next day">
            <ArrowForwardIosIcon fontSize="small" />
          </IconButton>

          <Button size="small" onClick={refresh} disabled={loading}>
            Refresh
          </Button>
        </Stack>
      </Stack>

      <Collapse in={!collapsed} timeout={400}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {message && (
              <Alert severity={message.type} sx={{ mb: 2 }}>
                {message.text}
              </Alert>
            )}

            <Grid container spacing={2}>
              {dates.map((dateIso) => {
                const dayData = dataMap[dateIso] || { cash_in_bank: [], accounts: [] };
                const rows = Array.isArray(dayData.cash_in_bank) ? dayData.cash_in_bank : [];
                const totals = totalsFor(dateIso);
                return (
                  <Grid item xs={12} md={6} key={dateIso}>
                    <Paper variant="outlined" sx={{ p: 1, height: "100%", borderRadius: 1 }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                          {dateIso}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {dayData.accounts?.length ? `${dayData.accounts.length} accounts` : "No accounts"}
                        </Typography>
                      </Box>

                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell><strong>Particulars</strong></TableCell>
                            <TableCell align="right"><strong>Beg</strong></TableCell>
                            <TableCell align="right"><strong>Coll</strong></TableCell>
                            <TableCell align="right"><strong>Local</strong></TableCell>
                            <TableCell align="right"><strong>Disb</strong></TableCell>
                            <TableCell align="right"><strong>Fund</strong></TableCell>
                            <TableCell align="right"><strong>Ret</strong></TableCell>
                            <TableCell align="right"><strong>End</strong></TableCell>
                          </TableRow>
                        </TableHead>

                        <TableBody>
                          {rows.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={8} align="center">No data</TableCell>
                            </TableRow>
                          ) : (
                            rows.map((r, idx) => (
                              <TableRow key={r.bank_id ?? `${r.particulars}-${r.account_number}-${idx}`}>
                                <TableCell sx={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 160 }}>
                                  {r.particulars}
                                  <Typography variant="caption" display="block">{r.account_number ?? ""}</Typography>
                                </TableCell>
                                <TableCell align="right">{formatCurrency(r.beginning ?? r.beginning_balance ?? 0)}</TableCell>
                                <TableCell align="right">{formatCurrency(r.collections ?? 0)}</TableCell>
                                <TableCell align="right">{formatCurrency(r.local_deposits ?? 0)}</TableCell>
                                <TableCell align="right">{formatCurrency(r.disbursements ?? 0)}</TableCell>
                                <TableCell align="right">{formatCurrency(r.fund_transfers ?? r.transfers ?? 0)}</TableCell>
                                <TableCell align="right">{formatCurrency(r.returned_checks ?? 0)}</TableCell>
                                <TableCell align="right">{formatCurrency(r.ending ?? 0)}</TableCell>
                              </TableRow>
                            ))
                          )}

                          <TableRow sx={{ backgroundColor: "rgba(14,165,233,0.06)" }}>
                            <TableCell sx={{ fontWeight: 700 }}>Totals</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCurrency(totals.beginning)}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCurrency(totals.collections)}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCurrency(totals.local_deposits)}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCurrency(totals.disbursements)}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCurrency(totals.fund_transfers)}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCurrency(totals.returned_checks)}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 900 }}>{formatCurrency(totals.ending)}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>

                      <Box sx={{ mt: 1 }}>
                        <Typography variant="caption" sx={{ display: "block", mb: 0.5 }}>Accounts</Typography>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                          {(dayData.accounts || []).length > 0 ? (
                            (dayData.accounts || []).slice(0, 4).map((a) => (
                              <Box key={a.id} sx={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                                <span>{a.name}</span>
                                <span>₱{formatCurrency(a.balance)}</span>
                              </Box>
                            ))
                          ) : (
                            <Typography variant="caption">No accounts</Typography>
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

/* ---------------------------
   Top navigation bar
   --------------------------- */
function TopNav({ onOpenAddBank, onOpenAddPdc, onOpenAddTransaction }) {
  const navigate = useNavigate();
  const isSmall = useMediaQuery((theme) => theme.breakpoints.down("md"));
  const [anchorEl, setAnchorEl] = useState(null);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);

  const navItems = [
    { key: "dashboard", label: "Dashboard", icon: <HomeIcon />, to: "/dashboard" },
    { key: "banks", label: "Banks", icon: <AccountBalanceIcon />, to: "/banks" },
    { key: "transactions", label: "Transactions", icon: <ReceiptLongIcon />, to: "/transactions" },
    { key: "monthly", label: "Monthly", icon: <BarChartIcon />, to: "/monthly-report" },
    { key: "pdc", label: "PDC", icon: <ReceiptLongIcon />, to: "/pdc" },
  ];

  const openMenu = (e) => setAnchorEl(e.currentTarget);
  const closeMenu = () => setAnchorEl(null);

  const openUserMenu = (e) => setUserMenuAnchor(e.currentTarget);
  const closeUserMenu = () => setUserMenuAnchor(null);

  const handleNavigate = (to) => {
    navigate(to);
    closeMenu();
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
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
            <IconButton onClick={openMenu} aria-label="open menu">
              <MenuIcon />
            </IconButton>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={closeMenu}>
              {navItems.map((n) => (
                <MenuItem key={n.key} onClick={() => handleNavigate(n.to)}>{n.icon} <Box sx={{ ml: 1 }}>{n.label}</Box></MenuItem>
              ))}
              <Divider />
              <MenuItem onClick={() => { onOpenAddTransaction(); closeMenu(); }}>
                <AddCircleOutlineIcon sx={{ mr: 1 }} /> Add Transaction
              </MenuItem>
              <MenuItem onClick={() => { onOpenAddBank(); closeMenu(); }}>
                <AccountBalanceIcon sx={{ mr: 1 }} /> Add Bank
              </MenuItem>
              <MenuItem onClick={() => { onOpenAddPdc(); closeMenu(); }}>
                <ReceiptLongIcon sx={{ mr: 1 }} /> Add PDC
              </MenuItem>
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

            <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />

            <Stack direction="row" spacing={1} alignItems="center">
              <Button variant="outlined" startIcon={<AddCircleOutlineIcon />} onClick={onOpenAddTransaction} size="small">Add Txn</Button>
              <Button variant="outlined" startIcon={<AccountBalanceIcon />} onClick={onOpenAddBank} size="small">Add Bank</Button>
              <Button variant="outlined" startIcon={<ReceiptLongIcon />} onClick={onOpenAddPdc} size="small">Add PDC</Button>
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
          <MenuItem onClick={() => { closeUserMenu(); navigate("/profile"); }}>Profile</MenuItem>
          <MenuItem onClick={() => { closeUserMenu(); handleLogout(); }}>
            <LogoutIcon sx={{ mr: 1 }} /> Logout
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}

/* ---------------------------
   Dashboard main component
   --------------------------- */
export default function Dashboard() {
  return (
    <ThemeProvider theme={jopcaTheme}>
      <DashboardInner />
    </ThemeProvider>
  );
}

function DashboardInner() {
  // Core state (hooks order is stable and unconditional)
  const [dailyReport, setDailyReport] = useState({});
  const [dailyRaw, setDailyRaw] = useState(null); // raw response for debugging/fallback
  const [monthlyReport, setMonthlyReport] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [manualMonth, setManualMonth] = useState("");
  const navigate = useNavigate();

  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [pdcModalOpen, setPdcModalOpen] = useState(false);
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);

  const [showCashInBank, setShowCashInBank] = useState(false);
  const [cashCollapsed, setCashCollapsed] = useState(false);

  const [actionAlert, setActionAlert] = useState(null);

  // PDC fallback hook (unconditional)
  const reportMonth = manualMonth || monthString();
  const {
    totals: pdcFallbackTotals,
    partition: pdcPartition,
    loading: pdcLoading,
    refresh: refreshPdcTotals,
  } = usePdcTotals(reportMonth);

  // fetchAll (keeps rawDaily and mapped responses)
  const fetchAll = async (monthOverride = null) => {
    setError(null);
    setRefreshing(true);
    try {
      const dailyRes = await api.get("/summary/detailed-daily/");
      const today = new Date();
      const monthStr = monthOverride || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
      const monthlyRes = await api.get(`/summary/detailed-monthly/?month=${monthStr}`);

      const rawDaily = dailyRes?.data ?? dailyRes;
      const mappedDaily = (() => {
        try {
          return mapDailyResponse(rawDaily);
        } catch (e) {
          console.error("mapDailyResponse failed, using rawDaily", e);
          return rawDaily;
        }
      })();

      const rawMonthly = monthlyRes?.data ?? monthlyRes;
      const mappedMonthly = (() => {
        try {
          return mapMonthlyResponse(rawMonthly);
        } catch (e) {
          console.error("mapMonthlyResponse failed, using rawMonthly", e);
          return rawMonthly;
        }
      })();

      setDailyRaw(rawDaily);
      setDailyReport(mappedDaily || {});
      setMonthlyReport(mappedMonthly || {});
    } catch (err) {
      console.error("Error fetching dashboard data", err);
      const msg = err?.response?.data?.detail || err?.response?.data || err?.message || "Failed to load dashboard data";
      setError(String(msg));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cashOnHand = Array.isArray(dailyReport?.cash_on_hand) ? dailyReport.cash_on_hand : [];

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
      if (type.includes("deposit")) row.local_deposits += total;
      else if (type.includes("collect")) row.collections += total;
      else if (type.includes("disburse")) row.disbursements += total;
      else row.collections += total;
      row.raw_rows.push(t.raw || t);
      row.ending =
        (row.beginning || 0) +
        (row.collections || 0) +
        (row.local_deposits || 0) -
        (row.disbursements || 0) +
        (row.fund_transfers || 0) -
        (row.returned_checks || 0) +
        (row.adjustments || 0);
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
        fund_transfers: 0,
        returned_checks: 0,
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
    return (cashInBank || []).map((b) => ({
      name: b.particulars || "Unknown",
      account_number: b.account_number || b.raw_rows?.[0]?.bank_account__account_number || null,
      balance: b.ending ?? 0,
      raw: b.raw_account || b,
    }));
  })();

  const totalEndingAllBanks = (cashInBank || []).reduce((s, r) => s + Number(r.ending ?? 0), 0);

  const handleOpenAddTransaction = () => {
    if (!banksList || banksList.length === 0) {
      setBankModalOpen(true);
      setActionAlert({ severity: "warning", text: "Please add a deposit bank first — transactions require a deposit bank." });
      setTimeout(() => setActionAlert(null), 4500);
      return;
    }
    setTransactionModalOpen(true);
  };

  const handleOpenAddPdc = () => {
    if (!banksList || banksList.length === 0) {
      setBankModalOpen(true);
      setActionAlert({ severity: "warning", text: "Please add a deposit bank first — PDC requires a deposit bank." });
      setTimeout(() => setActionAlert(null), 4500);
      return;
    }
    setPdcModalOpen(true);
  };

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 6 }}>
        <CircularProgress />
      </Box>
    );

  if (error)
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        <Stack direction="row" spacing={1}>
          <Button variant="contained" startIcon={<RefreshIcon />} onClick={() => fetchAll(manualMonth || null)}>Retry Fetch</Button>
        </Stack>
      </Box>
    );

  // Prefer backend pdc_summary if present and non-zero; otherwise use computed fallback totals
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

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <TopNav onOpenAddBank={() => setBankModalOpen(true)} onOpenAddPdc={handleOpenAddPdc} onOpenAddTransaction={handleOpenAddTransaction} />

      <Box sx={{ p: { xs: 2, md: 4 } }}>
        {actionAlert && (
          <Snackbar open autoHideDuration={4500} onClose={() => setActionAlert(null)}>
            <Alert severity={actionAlert.severity} sx={{ width: "100%" }}>{actionAlert.text}</Alert>
          </Snackbar>
        )}

        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: "primary.main" }}>
              JOPCA CORPORATION DAILY CASH POSITION REPORT
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {dailyReport?.office || "CAGAYAN DE ORO MAIN OFFICE"} — {dailyReport?.date || ""}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title="Refresh data from server">
              <IconButton color="primary" onClick={() => fetchAll(manualMonth || null)} disabled={refreshing}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>

            <TextField size="small" label="Month (YYYY-MM)" value={manualMonth} onChange={(e) => setManualMonth(e.target.value)} placeholder="2026-03" />
          </Stack>
        </Stack>

        {/* KPI row with Grand Total */}
        <Box sx={{ mb: 3, display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <Paper sx={{ p: 2, minWidth: 220, borderRadius: 2, boxShadow: 2 }}>
            <Typography variant="caption" color="text.secondary">Grand Total Ending (All Banks)</Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: "primary.main", mt: 0.5 }}>{formatPeso(totalEndingAllBanks)}</Typography>
          </Paper>

          <Paper sx={{ p: 2, minWidth: 220, borderRadius: 2, boxShadow: 1, bgcolor: "background.paper" }}>
            <Typography variant="caption" color="text.secondary">PDC This Month</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.5 }}>{formatPeso(effectivePdcSummary.this_month ?? 0)}</Typography>
          </Paper>

          <Paper sx={{ p: 2, minWidth: 220, borderRadius: 2, boxShadow: 1, bgcolor: "background.paper" }}>
            <Typography variant="caption" color="text.secondary">PDC Total</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.5 }}>{formatPeso(effectivePdcSummary.total ?? 0)}</Typography>
          </Paper>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, boxShadow: 2 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>CASH ON HAND (PCF)</Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>PARTICULARS</TableCell>
                    <TableCell align="right">Beginning</TableCell>
                    <TableCell align="right">Disbursements</TableCell>
                    <TableCell align="right">Replenishments</TableCell>
                    <TableCell align="right">Ending</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cashOnHand.length > 0 ? (
                    cashOnHand.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell>{r.particulars || `PCF ${i + 1}`}</TableCell>
                        <TableCell align="right">{formatPeso(r.beginning ?? 0)}</TableCell>
                        <TableCell align="right">{formatPeso(r.disbursements ?? 0)}</TableCell>
                        <TableCell align="right">{formatPeso(r.replenishments ?? r.replenish ?? 0)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>{formatPeso(r.ending ?? ((r.beginning ?? 0) - (r.disbursements ?? 0) + (r.replenishments ?? 0)))}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={5} align="center">No PCF (cash on hand) entries</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, boxShadow: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="h6" sx={{ mb: 0, fontWeight: "bold" }}>CASH IN BANK</Typography>
                <Stack direction="row" spacing={1}><Button
                    variant={showCashInBank ? "contained" : "outlined"}
                    startIcon={<AccountBalanceIcon />}
                    onClick={() => { setShowCashInBank((s) => !s); if (!showCashInBank) setCashCollapsed(false); }}
                    size="small"
                  >
                    Yesterday & Prev
                  </Button>
                </Stack>
              </Stack>

              {showCashInBank && <CashInBank2DayInline initialCenterDate={null} collapsed={cashCollapsed} onToggleCollapse={() => setCashCollapsed((c) => !c)} />}

              <Table size="small" sx={{ mt: 1 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>PARTICULARS</TableCell>
                    <TableCell>Account #</TableCell>
                    <TableCell align="right">Beginning</TableCell>
                    <TableCell align="right">Collections</TableCell>
                    <TableCell align="right">Local Deposits</TableCell>
                    <TableCell align="right">Disbursements</TableCell>
                    <TableCell align="right">Fund Transfers</TableCell>
                    <TableCell align="right">Returned Checks</TableCell>
                    <TableCell align="right">Ending</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cashInBank.length > 0 ? (
                    cashInBank.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell>{r.particulars || `Bank ${i + 1}`}</TableCell>
                        <TableCell>{r.account_number ?? r.raw_rows?.[0]?.bank_account__account_number ?? "-"}</TableCell>
                        <TableCell align="right">{formatPeso(r.beginning ?? 0)}</TableCell>
                        <TableCell align="right">{formatPeso(r.collections ?? 0)}</TableCell>
                        <TableCell align="right">{formatPeso(r.local_deposits ?? 0)}</TableCell>
                        <TableCell align="right">{formatPeso(r.disbursements ?? 0)}</TableCell>
                        <TableCell align="right">{formatPeso(r.fund_transfers ?? 0)}</TableCell>
                        <TableCell align="right">{formatPeso(r.returned_checks ?? 0)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>{formatPeso(r.ending ?? 0)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={9} align="center">No bank transactions</TableCell></TableRow>
                  )}

                  <TableRow sx={{ backgroundColor: "rgba(0,0,0,0.03)" }}>
                    <TableCell sx={{ fontWeight: 800 }}>Grand Total</TableCell>
                    <TableCell />
                    <TableCell />
                    <TableCell />
                    <TableCell />
                    <TableCell />
                    <TableCell />
                    <TableCell />
                    <TableCell align="right" sx={{ fontWeight: 900 }}>{formatPeso(totalEndingAllBanks)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Paper>
          </Grid>
        </Grid>

        {/* PDC, Transactions, Returned checks, etc. */}
        <Paper sx={{ p: 2, mt: 3, boxShadow: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" sx={{ fontWeight: "bold" }}>PDC SUMMARY</Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box sx={{ textAlign: "right" }}>
                <Typography variant="caption">This Month</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>{formatPeso(effectivePdcSummary.this_month ?? 0)}</Typography>
              </Box>

              <Box sx={{ textAlign: "right" }}>
                <Typography variant="caption">Total</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>{formatPeso(effectivePdcSummary.total ?? 0)}</Typography>
              </Box>

              <Button variant="contained" onClick={() => navigate("/pdc")}>View Details</Button>
              <Button variant="outlined" startIcon={<AddCircleOutlineIcon />} onClick={handleOpenAddPdc}>Add PDC</Button>
            </Stack>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Bank transactions are shown under Cash In Bank; PCF entries are in Cash On Hand.</Typography>
        </Paper>

        <Paper sx={{ p: 3, mt: 3, borderRadius: 2, boxShadow: 2 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>TRANSACTIONS FOR THIS MONTH</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>PARTICULARS</TableCell>
                <TableCell align="right">Amount (₱)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(monthlyReport?.transactions || []).length > 0 ? (
                (monthlyReport.transactions || []).map((t, i) => (
                  <TableRow key={i}>
                    <TableCell>{t.particulars || t.type || `Txn ${i + 1}`}</TableCell>
                    <TableCell align="right">{formatPeso(t.total ?? t.amount ?? 0)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={2} align="center">No transactions for this month</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>

        <Paper sx={{ p: 3, mt: 3, borderRadius: 2, boxShadow: 2 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>ANALYSIS OF RETURNED CHECKS</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Customer</TableCell>
                <TableCell>Check #</TableCell>
                <TableCell>RCNB / RCNR</TableCell>
                <TableCell align="right">Amount (₱)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(dailyReport?.returned_checks || []).length > 0 ? (
                (dailyReport.returned_checks || []).map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>{r.customer || r.payee || "-"}</TableCell>
                    <TableCell>{r.check_number || r.check_no || "-"}</TableCell>
                    <TableCell>{r.rcnb ?? r.rcnr ?? "-"}</TableCell>
                    <TableCell align="right">{formatPeso(r.amount ?? r.total ?? 0)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={4} align="center">No returned checks recorded</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>
      </Box>

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
          // Refetch summary and fallback totals after creating a PDC
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
    </Box>
  );
}