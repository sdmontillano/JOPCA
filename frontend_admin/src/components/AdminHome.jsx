import { useState, useEffect } from "react";
import { Box, Paper, Typography, List, ListItem, ListItemText, Chip, Grid, LinearProgress } from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import ReceiptIcon from "@mui/icons-material/Receipt";
import EventNoteIcon from "@mui/icons-material/EventNote";
import PeopleIcon from "@mui/icons-material/People";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import AdminLayout from "./AdminLayout";
import api from "../services/tokenService";
import { useToast } from "../ToastContext";

export default function AdminHome() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ banks: 0, users: 0, transactions: 0, pdcs: 0 });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [recentPdcs, setRecentPdcs] = useState([]);
  const [chartData, setChartData] = useState([]);

  const breadcrumbs = [
    { label: "Home" },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [banksRes, usersRes, txRes, pdcRes] = await Promise.all([
        api.get("/api/bankaccounts/"),
        api.get("/api/users/"),
        api.get("/api/transactions-crud/"),
        api.get("/api/pdc/"),
      ]);

      const banks = banksRes.data.results || banksRes.data;
      const users = usersRes.data.results || usersRes.data;
      const transactions = txRes.data.results || txRes.data;
      const pdcs = pdcRes.data.results || pdcRes.data;

      setStats({
        banks: banks.length,
        users: users.length,
        transactions: transactions.length,
        pdcs: pdcs.length,
      });

      setRecentTransactions(transactions.slice(0, 5));
      setRecentPdcs(pdcs.slice(0, 5));

      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        const count = transactions.filter(t => t.date === dateStr).length;
        last7Days.push({ date: dateStr, count });
      }
      setChartData(last7Days);
    } catch (err) {
      console.error("Failed to fetch data", err);
      showToast("Failed to fetch dashboard data", "error");
    } finally {
      setLoading(false);
    }
  };

  const maxCount = Math.max(...chartData.map(d => d.count), 1);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatAmount = (amount) => {
    const num = parseFloat(amount || 0);
    return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(num);
  };

  const getTxTypeColor = (type) => {
    const colors = {
      collections: "#22c55e",
      collection: "#22c55e",
      deposit: "#3b82f6",
      deposits: "#3b82f6",
      disbursement: "#ef4444",
      disbursements: "#ef4444",
      local_deposits: "#f59e0b",
      local_deposit: "#f59e0b",
      fund_transfer: "#8b5cf6",
      fund_transfers: "#8b5cf6",
      interbank_transfer: "#8b5cf6",
      interbank_transfers: "#8b5cf6",
      adjustments: "#ec4899",
      adjustment: "#ec4899",
      bank_charges: "#64748b",
      bank_charge: "#64748b",
      returned_check: "#ef4444",
      returned_checks: "#ef4444",
      post_dated_check: "#f97316",
      post_dated_checks: "#f97316",
      transfer: "#8b5cf6",
      transfers: "#8b5cf6",
    };
    return colors[type] || "#64748b";
  };

  const getPdcStatusColor = (status) => {
    const colors = {
      on_hand: "#f59e0b",
      matured: "#3b82f6",
      deposited: "#22c55e",
      returned: "#ef4444",
    };
    return colors[status] || "#64748b";
  };

  if (loading) {
    return <AdminLayout title="Home" breadcrumbs={breadcrumbs}><LinearProgress /></AdminLayout>;
  }

  return (
    <AdminLayout title="Home" breadcrumbs={breadcrumbs}>
      <Grid container spacing={3}>
        {/* Stats Cards */}
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={{ p: 2, display: "flex", alignItems: "center", gap: 2 }}>
            <Box sx={{ bgcolor: "#dbeafe", p: 1, borderRadius: 2 }}>
              <AccountBalanceIcon sx={{ color: "#1d4ed8" }} />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight="bold">{stats.banks}</Typography>
              <Typography variant="body2" color="text.secondary">Banks</Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={{ p: 2, display: "flex", alignItems: "center", gap: 2 }}>
            <Box sx={{ bgcolor: "#dcfce7", p: 1, borderRadius: 2 }}>
              <ReceiptIcon sx={{ color: "#166534" }} />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight="bold">{stats.transactions}</Typography>
              <Typography variant="body2" color="text.secondary">Transactions</Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={{ p: 2, display: "flex", alignItems: "center", gap: 2 }}>
            <Box sx={{ bgcolor: "#fef3c7", p: 1, borderRadius: 2 }}>
              <EventNoteIcon sx={{ color: "#b45309" }} />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight="bold">{stats.pdcs}</Typography>
              <Typography variant="body2" color="text.secondary">PDCs</Typography>
            </Box>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={{ p: 2, display: "flex", alignItems: "center", gap: 2 }}>
            <Box sx={{ bgcolor: "#f3e8ff", p: 1, borderRadius: 2 }}>
              <PeopleIcon sx={{ color: "#6b21a8" }} />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight="bold">{stats.users}</Typography>
              <Typography variant="body2" color="text.secondary">Users</Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Chart - Last 7 Days */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
              <TrendingUpIcon sx={{ color: "#0ea5e9" }} />
              <Typography variant="h6" fontWeight="bold">Transactions - Last 7 Days</Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "flex-end", gap: 1, height: 150 }}>
              {chartData.map((day, idx) => (
                <Box key={idx} sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5 }}>
                    {day.count}
                  </Typography>
                  <Box
                    sx={{
                      width: "100%",
                      height: `${(day.count / maxCount) * 100}px`,
                      minHeight: day.count > 0 ? 8 : 2,
                      bgcolor: "#0ea5e9",
                      borderRadius: 1,
                      transition: "height 0.3s ease",
                    }}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                    {formatDate(day.date)}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>

        {/* Recent Activity */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper sx={{ p: 3, height: "100%" }}>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>Recent Transactions</Typography>
            <List dense>
              {recentTransactions.length === 0 ? (
                <ListItem><ListItemText primary="No transactions yet" /></ListItem>
              ) : (
                recentTransactions.map((tx) => (
                  <ListItem key={tx.id} sx={{ px: 0 }}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Chip
                            label={tx.type?.replace(/_/g, " ").substring(0, 8)}
                            size="small"
                            sx={{ bgcolor: getTxTypeColor(tx.type), color: "white", fontSize: 10, height: 20 }}
                          />
                          <Typography variant="body2">{formatAmount(tx.amount)}</Typography>
                        </Box>
                      }
                      secondary={tx.date}
                    />
                  </ListItem>
                ))
              )}
            </List>
          </Paper>
        </Grid>

        {/* Recent PDCs */}
        <Grid size={{ xs: 12 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>Recent PDCs</Typography>
            <Grid container spacing={2}>
              {recentPdcs.length === 0 ? (
                <Grid size={{ xs: 12 }}><Typography color="text.secondary">No PDCs yet</Typography></Grid>
              ) : (
                recentPdcs.map((pdc) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={pdc.id}>
                    <Box sx={{ p: 2, bgcolor: "#f8fafc", borderRadius: 2 }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                        <Typography variant="body2" fontWeight="bold">{pdc.check_number}</Typography>
                        <Chip
                          label={pdc.status?.replace(/_/g, " ")}
                          size="small"
                          sx={{ bgcolor: getPdcStatusColor(pdc.status), color: "white", fontSize: 10, height: 20 }}
                        />
                      </Box>
                      <Typography variant="h6" fontWeight="bold">{formatAmount(pdc.amount)}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {pdc.check_from || "No payer"} • {pdc.date_received}
                      </Typography>
                    </Box>
                  </Grid>
                ))
              )}
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </AdminLayout>
  );
}
