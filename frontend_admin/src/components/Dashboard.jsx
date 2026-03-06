// src/components/Dashboard.jsx
import React, { useEffect, useState } from "react";
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
  Alert,
  Stack,
  Tooltip,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Button,
  Grid,
  TextField,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import HomeIcon from "@mui/icons-material/Home";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import BarChartIcon from "@mui/icons-material/BarChart";
import LogoutIcon from "@mui/icons-material/Logout";
import RefreshIcon from "@mui/icons-material/Refresh";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import api from "../services/tokenService";
import { useNavigate } from "react-router-dom";
import { mapDailyResponse, mapMonthlyResponse } from "../utils/dataMappers";

// Modal-capable components (must exist and accept open/onClose/onCreated)
import AddBankAccount from "./AddBankAccount";
import AddTransaction from "./AddTransaction";
import PdcCreateModal from "./PdcCreateModal";

/* ---------------------------
   Sidebar (embedded)
   - Minimal changes only: navy blue background and handler support
   - Keep layout and behavior identical otherwise
   --------------------------- */
function Sidebar({ sx = {}, onOpenAddBank = null, onOpenAddPdc = null, onOpenAddTransaction = null }) {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { key: "dashboard", label: "Home", icon: <HomeIcon />, to: "/dashboard" },
    { key: "banks", label: "Banks", icon: <AccountBalanceIcon />, to: "/banks" },
    { key: "add-bank", label: "Add Bank", icon: <AddCircleOutlineIcon />, to: "/add-bank" },
    { key: "add-tx", label: "Add Transaction", icon: <AddCircleOutlineIcon />, to: "/add-transaction" },
    { key: "transactions", label: "Transactions", icon: <ReceiptLongIcon />, to: "/transactions" },
    { key: "monthly", label: "Monthly Report", icon: <BarChartIcon />, to: "/monthly-report" },
    { key: "pdc", label: "PDC Management", icon: <ReceiptLongIcon />, to: "/pdc" },
    { key: "add-pdc", label: "Add PDC", icon: <AddCircleOutlineIcon />, to: "/pdc-create" },
    { key: "debug", label: "Debug", icon: <InfoOutlinedIcon />, to: "/debug" },
  ];

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <Box
      component="aside"
      sx={{
        width: collapsed ? { xs: 64, sm: 72 } : { xs: 72, sm: 200 },
        minHeight: "100vh",
        bgcolor: "#0b3d91", // navy blue
        color: "common.white",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        flexDirection: "column",
        p: 1,
        gap: 1,
        transition: "width 200ms ease",
        ...sx,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 16, display: collapsed ? "none" : "block", color: "common.white" }}>
          Banking Admin
        </Typography>
        <IconButton size="small" onClick={() => setCollapsed((s) => !s)} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} sx={{ color: "common.white" }}>
          <MenuIcon />
        </IconButton>
      </Box>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.06)" }} />

      <List sx={{ flexGrow: 1, px: 0 }}>
        {navItems.map((item) => (
          <ListItemButton
            key={item.key}
            onClick={() => {
              // call modal handlers when provided for add actions
              if (item.key === "add-bank" && typeof onOpenAddBank === "function") {
                onOpenAddBank();
                return;
              }
              if (item.key === "add-pdc" && typeof onOpenAddPdc === "function") {
                onOpenAddPdc();
                return;
              }
              if (item.key === "add-tx" && typeof onOpenAddTransaction === "function") {
                onOpenAddTransaction();
                return;
              }
              navigate(item.to);
            }}
            sx={{
              py: 1,
              px: 1.25,
              borderRadius: 1,
              justifyContent: collapsed ? "center" : "flex-start",
              "&:hover": { bgcolor: "rgba(255,255,255,0.04)" },
              color: "common.white",
            }}
          >
            <ListItemIcon sx={{ minWidth: 0, mr: collapsed ? 0 : 1.5, justifyContent: "center", color: "common.white" }}>{item.icon}</ListItemIcon>
            {!collapsed && <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 700, color: "common.white" }} />}
          </ListItemButton>
        ))}
      </List>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.06)" }} />

      <Box sx={{ px: 1, pb: 1 }}>
        <Button
          variant="contained"
          color="error"
          fullWidth={!collapsed}
          onClick={handleLogout}
          startIcon={!collapsed ? <LogoutIcon sx={{ color: "common.white" }} /> : null}
          sx={{
            borderRadius: 1.5,
            py: collapsed ? 1 : 0.75,
            minWidth: 0,
            justifyContent: collapsed ? "center" : "flex-start",
            fontWeight: 700,
            background: "linear-gradient(90deg,#ef4444,#dc2626)",
            color: "common.white",
            "&:hover": { opacity: 0.95 },
          }}
        >
          {!collapsed ? "Logout" : ""}
        </Button>
      </Box>
    </Box>
  );
}

/* ---------------------------
   Dashboard
   --------------------------- */
export default function Dashboard() {
  const [dailyReport, setDailyReport] = useState(null);
  const [monthlyReport, setMonthlyReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [manualMonth, setManualMonth] = useState("");
  const navigate = useNavigate();

  // modal states
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [pdcModalOpen, setPdcModalOpen] = useState(false);
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);

  const fetchAll = async (monthOverride = null) => {
    setError(null);
    setRefreshing(true);
    try {
      const dailyRes = await api.get("/summary/detailed-daily/");
      const today = new Date();
      const monthStr = monthOverride || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
      const monthlyRes = await api.get(`/summary/detailed-monthly/?month=${monthStr}`);

      const mappedDaily = mapDailyResponse(dailyRes.data ?? dailyRes);
      const mappedMonthly = mapMonthlyResponse(monthlyRes.data ?? monthlyRes);

      setDailyReport(mappedDaily);
      setMonthlyReport(mappedMonthly);
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

  const formatPeso = (value) =>
    `₱${Number(value ?? 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  // Cash on hand should be PCF rows (PCF Office / PCF Quarry)
  const cashOnHand = Array.isArray(dailyReport?.cash_on_hand) ? dailyReport.cash_on_hand : [];

  // Cash in bank should show bank-grouped transaction rows (deposits/collections/disbursements)
  const cashInBank =
    Array.isArray(dailyReport?.cash_in_bank) && dailyReport.cash_in_bank.length > 0
      ? dailyReport.cash_in_bank
      : (dailyReport?.transactions || []).reduce((acc, t) => {
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

  // Banks list: prefer accounts array (name + account_number), otherwise derive from cashInBank rows
  const banksList =
    Array.isArray(dailyReport?.accounts) && dailyReport.accounts.length > 0
      ? dailyReport.accounts.map((a) => ({
          name: a.name || a.bank_name || a.particulars || "Unknown",
          account_number: a.account_number || a.account_no || a.number || null,
          balance: a.balance ?? a.amount ?? 0,
          raw: a,
        }))
      : cashInBank.map((b) => ({
          name: b.particulars,
          account_number: b.account_number || b.raw_rows?.[0]?.bank_account__account_number || null,
          balance: b.ending ?? 0,
          raw: b,
        }));

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 6 }}>
        <CircularProgress />
      </Box>
    );

  if (error)
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Stack direction="row" spacing={1}>
          <Button variant="contained" startIcon={<RefreshIcon />} onClick={() => fetchAll(manualMonth || null)}>
            Retry Fetch
          </Button>
        </Stack>
      </Box>
    );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#f6f8fa" }}>
      <Sidebar onOpenAddBank={() => setBankModalOpen(true)} onOpenAddPdc={() => setPdcModalOpen(true)} onOpenAddTransaction={() => setTransactionModalOpen(true)} />

      <Box sx={{ flexGrow: 1, p: { xs: 2, md: 4 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: "#0ea5e9" }}>
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

            <Button variant="outlined" onClick={() => navigate("/pdc")}>
              Open PDC Management
            </Button>
          </Stack>
        </Stack>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, boxShadow: 2 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
                CASH ON HAND (PCF)
              </Typography>

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
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          {formatPeso(r.ending ?? ((r.beginning ?? 0) - (r.disbursements ?? 0) + (r.replenishments ?? 0)))}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        No PCF (cash on hand) entries
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, boxShadow: 2 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
                CASH IN BANK
              </Typography>

              <Table size="small">
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
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          {formatPeso(r.ending ?? 0)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} align="center">
                        No bank transactions
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Paper>
          </Grid>
        </Grid>

        {/* Banks list (explicit) */}
        <Paper sx={{ p: 2, mt: 3, boxShadow: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: "bold" }}>
              BANKS
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Name and account number
            </Typography>
          </Stack>

          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Bank Name</TableCell>
                <TableCell>Account Number</TableCell>
                <TableCell align="right">Balance (₱)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {banksList.length > 0 ? (
                banksList.map((b, i) => (
                  <TableRow key={i}>
                    <TableCell>{b.name}</TableCell>
                    <TableCell>{b.account_number ?? "-"}</TableCell>
                    <TableCell align="right">{formatPeso(b.balance ?? 0)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    No banks available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>

        <Paper sx={{ p: 2, mt: 3, boxShadow: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" sx={{ fontWeight: "bold" }}>
              PDC SUMMARY
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <Box sx={{ textAlign: "right" }}>
                <Typography variant="caption">This Month</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {formatPeso(dailyReport?.pdc_summary?.this_month ?? 0)}
                </Typography>
              </Box>

              <Box sx={{ textAlign: "right" }}>
                <Typography variant="caption">Total</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {formatPeso(dailyReport?.pdc_summary?.total ?? 0)}
                </Typography>
              </Box>

              <Button variant="contained" onClick={() => navigate("/pdc")}>
                View Details
              </Button>

              <Button variant="outlined" startIcon={<AddCircleOutlineIcon />} onClick={() => setPdcModalOpen(true)}>
                Add PDC
              </Button>
            </Stack>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Bank transactions are shown under Cash In Bank; PCF entries are in Cash On Hand.
          </Typography>
        </Paper>

        <Paper sx={{ p: 3, mt: 3, borderRadius: 2, boxShadow: 2 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
            TRANSACTIONS FOR THIS MONTH
          </Typography>
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
                <TableRow>
                  <TableCell colSpan={2} align="center">
                    No transactions for this month
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>

        <Paper sx={{ p: 3, mt: 3, borderRadius: 2, boxShadow: 2 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
            ANALYSIS OF RETURNED CHECKS
          </Typography>
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
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    No returned checks recorded
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>
      </Box>

      {/* Floating modals (render only if components exist) */}
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
        onCreated={(newPdc) => {
          setDailyReport((prev) => {
            if (!prev) return prev;
            const thisMonth = Number(prev.pdc_summary?.this_month ?? 0) + Number(newPdc.amount ?? 0);
            const total = Number(prev.pdc_summary?.total ?? 0) + Number(newPdc.amount ?? 0);
            return { ...prev, pdc_summary: { ...(prev.pdc_summary || {}), this_month: thisMonth, total } };
          });
        }}
      />

      <AddTransaction
        open={transactionModalOpen}
        onClose={() => setTransactionModalOpen(false)}
        onCreated={(txn) => {
          // conservative approach: refetch summary to keep data consistent
          fetchAll(manualMonth || null);
        }}
      />
    </Box>
  );
}