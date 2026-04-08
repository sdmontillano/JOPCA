import { useState, useEffect } from "react";
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Button, Chip, CircularProgress, MenuItem, Select, FormControl, InputLabel, Typography, Stack
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AdminLayout from "./AdminLayout";
import api from "../services/tokenService";
import { useToast } from "../ToastContext";

const ACTION_COLORS = {
  create: { bg: "#DCFCE7", color: "#166534" },
  update: { bg: "#DBEAFE", color: "#1D4ED8" },
  delete: { bg: "#FEE2E2", color: "#991B1B" },
  login: { bg: "#F3E8FF", color: "#6B21A8" },
  logout: { bg: "#F1F5F9", color: "#475569" },
  export: { bg: "#FEF3C7", color: "#92400E" },
  deposit: { bg: "#DCFCE7", color: "#166534" },
  withdraw: { bg: "#FEE2E2", color: "#991B1B" },
  replenish: { bg: "#DBEAFE", color: "#1D4ED8" },
};

const ENTITY_TYPES = [
  { value: "", label: "All Entities" },
  { value: "Transaction", label: "Transaction" },
  { value: "BankAccount", label: "Bank Account" },
  { value: "PettyCashFund", label: "PCF" },
  { value: "Pdc", label: "PDC" },
  { value: "User", label: "User" },
];

const ACTION_TYPES = [
  { value: "", label: "All Actions" },
  { value: "create", label: "Create" },
  { value: "update", label: "Update" },
  { value: "delete", label: "Delete" },
  { value: "login", label: "Login" },
  { value: "logout", label: "Logout" },
  { value: "export", label: "Export" },
];

export default function AdminAuditLogs() {
  const { showToast } = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const breadcrumbs = [
    { label: "Home", href: "/admin/home" },
    { label: "Audit Logs" },
  ];

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [search, actionFilter, entityFilter, dateFrom, dateTo, page]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", page);
      if (search) params.append("search", search);
      if (actionFilter) params.append("action", actionFilter);
      if (entityFilter) params.append("entity", entityFilter);
      if (dateFrom) params.append("date_from", dateFrom);
      if (dateTo) params.append("date_to", dateTo);

      const res = await api.get(`/api/audit-logs/?${params.toString()}`);
      const data = res.data;
      setLogs(data.results || data);
      setTotalCount(data.count || 0);
    } catch (err) {
      console.error("Failed to fetch audit logs", err);
      showToast("Failed to load audit logs", "error");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getActionColor = (action) => ACTION_COLORS[action] || { bg: "#F1F5F9", color: "#475569" };

  const pageSize = 20;
  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <AdminLayout title="Audit Logs" breadcrumbs={breadcrumbs}>
      <Paper sx={{ width: "100%", overflow: "hidden" }}>
        <Box sx={{ p: 2, borderBottom: "1px solid #e2e8f0" }}>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
            <TextField
              size="small"
              placeholder="Search logs..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              sx={{ width: 200 }}
              InputProps={{
                startAdornment: <SearchIcon sx={{ color: "#64748b", fontSize: 20 }} />,
              }}
            />
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>Action</InputLabel>
              <Select value={actionFilter} label="Action" onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}>
                {ACTION_TYPES.map(a => <MenuItem key={a.value} value={a.value}>{a.label}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Entity</InputLabel>
              <Select value={entityFilter} label="Entity" onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}>
                {ENTITY_TYPES.map(e => <MenuItem key={e.value} value={e.value}>{e.label}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField
              size="small"
              type="date"
              label="From"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              sx={{ width: 140 }}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              size="small"
              type="date"
              label="To"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              sx={{ width: 140 }}
              InputLabelProps={{ shrink: true }}
            />
            <Box sx={{ flexGrow: 1 }} />
            <Typography variant="body2" sx={{ color: "#64748b" }}>
              {totalCount} log{totalCount !== 1 ? "s" : ""} found
            </Typography>
          </Box>
        </Box>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}><CircularProgress /></Box>
        ) : (
          <TableContainer sx={{ maxHeight: "calc(100vh - 280px)" }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "#1E293B" }}>
                  <TableCell sx={{ color: "white", fontWeight: 700, fontSize: "0.75rem" }}>Timestamp</TableCell>
                  <TableCell sx={{ color: "white", fontWeight: 700, fontSize: "0.75rem" }}>User</TableCell>
                  <TableCell sx={{ color: "white", fontWeight: 700, fontSize: "0.75rem" }}>Action</TableCell>
                  <TableCell sx={{ color: "white", fontWeight: 700, fontSize: "0.75rem" }}>Entity</TableCell>
                  <TableCell sx={{ color: "white", fontWeight: 700, fontSize: "0.75rem" }}>Description</TableCell>
                  <TableCell sx={{ color: "white", fontWeight: 700, fontSize: "0.75rem" }}>IP Address</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4, color: "#64748b" }}>
                      No audit logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => {
                    const color = getActionColor(log.action);
                    return (
                      <TableRow key={log.id} hover>
                        <TableCell sx={{ fontSize: "0.8rem", color: "#64748b", whiteSpace: "nowrap" }}>
                          {formatDate(log.timestamp)}
                        </TableCell>
                        <TableCell sx={{ fontSize: "0.8rem" }}>
                          {log.username || log.user?.username || "-"}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={log.action?.toUpperCase() || "UNKNOWN"}
                            size="small"
                            sx={{ bgcolor: color.bg, color: color.color, fontWeight: 500, fontSize: "0.7rem" }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: "0.8rem" }}>
                          {log.entity}
                          {log.entity_id && <Typography component="span" sx={{ color: "#9CA3AF", ml: 0.5 }}>#{log.entity_id}</Typography>}
                        </TableCell>
                        <TableCell sx={{ fontSize: "0.8rem", maxWidth: 250, overflow: "hidden", textOverflow: "ellipsis" }}>
                          {log.description || "-"}
                        </TableCell>
                        <TableCell sx={{ fontSize: "0.8rem", color: "#64748b" }}>
                          {log.ip_address || "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {totalPages > 1 && (
          <Box sx={{ p: 2, display: "flex", justifyContent: "center", gap: 1 }}>
            <Button
              size="small"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              Previous
            </Button>
            <Typography sx={{ display: "flex", alignItems: "center", px: 2 }}>
              Page {page} of {totalPages}
            </Typography>
            <Button
              size="small"
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </Button>
          </Box>
        )}
      </Paper>
    </AdminLayout>
  );
}