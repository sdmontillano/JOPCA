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
  Button,
  TextField,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import WarningIcon from "@mui/icons-material/Warning";
import pdcService from "../services/pdcService";
import { useNavigate } from "react-router-dom";

export default function PdcPage() {
  const [pdcList, setPdcList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [returnDialog, setReturnDialog] = useState({ open: false, pdc: null, reason: "" });
  const navigate = useNavigate();

  const fetchPdcs = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await pdcService.listPdcs();
      const raw = Array.isArray(res.data) ? res.data : res.data?.results ?? [];
      const normalized = raw.map((p) => ({
        id: p.id,
        client_name: p.customer ?? "-",
        check_number: p.check_number ?? "-",
        bank: p.deposit_bank?.name ?? "-",
        deposit_bank_id: p.deposit_bank?.id ?? null,
        amount: p.amount ?? 0,
        issue_date: p.issue_date ?? null,
        maturity_date: p.maturity_date ?? null,
        status: (p.status || "outstanding").toLowerCase(),
      }));

      let filtered = normalized;
      if (filterStatus) filtered = filtered.filter((x) => x.status === filterStatus.toLowerCase());
      if (fromDate) filtered = filtered.filter((x) => (x.maturity_date ? new Date(x.maturity_date) >= new Date(fromDate) : false));
      if (toDate) filtered = filtered.filter((x) => (x.maturity_date ? new Date(x.maturity_date) <= new Date(toDate) : false));

      setPdcList(filtered);
    } catch (err) {
      console.error("Error fetching PDCs", err);
      setError(err?.response?.data || err?.message || "Failed to load PDCs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPdcs();
  }, []);

  const formatPeso = (value) =>
    `₱${Number(value ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handleMarkMatured = async (id) => {
    try {
      await pdcService.markPdcMatured(id);
      fetchPdcs();
    } catch (err) {
      console.error(err);
      alert("Failed to mark matured");
    }
  };

  const handleDeposit = async (id, bankId) => {
    try {
      await pdcService.depositPdc(id, bankId, new Date().toISOString().slice(0, 10), "WEB-DEPOSIT");
      fetchPdcs();
    } catch (err) {
      console.error(err);
      alert("Failed to deposit PDC");
    }
  };

  const handleOpenReturnDialog = (pdc) => {
    setReturnDialog({ open: true, pdc, reason: "" });
  };

  const handleCloseReturnDialog = () => {
    setReturnDialog({ open: false, pdc: null, reason: "" });
  };

  const handleRecordReturned = async () => {
    if (!returnDialog.pdc) return;
    try {
      await pdcService.recordPdcReturned(
        returnDialog.pdc.id,
        new Date().toISOString().slice(0, 10),
        returnDialog.reason
      );
      handleCloseReturnDialog();
      fetchPdcs();
    } catch (err) {
      console.error("Record return failed:", err);
      const errorMsg = err?.response?.data?.detail || err?.message || "Failed to record returned check";
      alert(errorMsg);
    }
  };

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 6 }}>
        <CircularProgress />
      </Box>
    );
  if (error) return <Alert severity="error">{String(error)}</Alert>;

  const getStatusColor = (status) => {
    switch (status) {
      case "outstanding": return "warning";
      case "matured": return "success";
      case "deposited": return "info";
      case "returned": return "error";
      default: return "default";
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: "primary.dark" }}>
            PDC Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage postdated checks: accept, mark matured/deposited, or record returned checks.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} alignItems="center">
          <TextField 
            size="small" 
            label="From Date" 
            type="date" 
            value={fromDate} 
            onChange={(e) => setFromDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField 
            size="small" 
            label="To Date" 
            type="date" 
            value={toDate} 
            onChange={(e) => setToDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField 
            size="small" 
            label="Status" 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)} 
            placeholder="outstanding|matured"
          />
          <Button variant="contained" onClick={fetchPdcs}>Filter</Button>
          <Button variant="outlined" onClick={() => navigate(-1)}>Back</Button>
        </Stack>
      </Stack>

      <Paper sx={{ p: 0, borderRadius: 3, boxShadow: "0 4px 12px rgba(0,0,0,0.08)", overflow: "hidden" }}>
        <Box sx={{ p: 2, bgcolor: "primary.main", display: "flex", alignItems: "center" }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "white" }}>
            Post Dated Checks
          </Typography>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: "white", fontWeight: 700 }}>Client</TableCell>
              <TableCell sx={{ color: "white", fontWeight: 700 }}>Check #</TableCell>
              <TableCell sx={{ color: "white", fontWeight: 700 }}>Bank</TableCell>
              <TableCell align="right" sx={{ color: "white", fontWeight: 700 }}>Amount</TableCell>
              <TableCell sx={{ color: "white", fontWeight: 700 }}>Issue Date</TableCell>
              <TableCell sx={{ color: "white", fontWeight: 700 }}>Maturity Date</TableCell>
              <TableCell sx={{ color: "white", fontWeight: 700 }}>Status</TableCell>
              <TableCell sx={{ color: "white", fontWeight: 700 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pdcList.length > 0 ? (
              pdcList.map((p) => (
                <TableRow key={p.id} sx={{ "&:hover": { bgcolor: "action.hover" } }}>
                  <TableCell sx={{ fontWeight: 500 }}>{p.client_name}</TableCell>
                  <TableCell sx={{ fontFamily: "monospace", fontSize: "0.85rem" }}>{p.check_number}</TableCell>
                  <TableCell>{p.bank}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600, color: "primary.dark" }}>{formatPeso(p.amount)}</TableCell>
                  <TableCell>{p.issue_date ?? "-"}</TableCell>
                  <TableCell>{p.maturity_date ?? "-"}</TableCell>
                  <TableCell>
                    <Chip
                      label={p.status.toUpperCase()}
                      size="small"
                      color={getStatusColor(p.status)}
                      sx={{ fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      {(p.status === "outstanding" || p.status === "matured") && (
                        <Button 
                          size="small" 
                          variant="contained" 
                          color="error"
                          startIcon={<WarningIcon />}
                          onClick={() => handleOpenReturnDialog(p)}
                          sx={{ fontSize: "0.7rem" }}
                        >
                          Record Return
                        </Button>
                      )}
                      {p.status === "outstanding" && (
                        <Button 
                          size="small" 
                          variant="contained" 
                          color="success"
                          onClick={() => handleMarkMatured(p.id)}
                          sx={{ fontSize: "0.7rem" }}
                        >
                          Mark Matured
                        </Button>
                      )}
                      {p.status === "matured" && (
                        <Button 
                          size="small" 
                          variant="contained" 
                          color="primary"
                          onClick={() => handleDeposit(p.id, p.deposit_bank_id)}
                          sx={{ fontSize: "0.7rem" }}
                        >
                          Deposit
                        </Button>
                      )}
                      <Button 
                        size="small" 
                        variant="outlined" 
                        onClick={() => navigate(`/pdc/${p.id}`)}
                        sx={{ fontSize: "0.7rem" }}
                      >
                        View
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4, color: "text.secondary" }}>
                  No PDC records found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* Return Dialog */}
      <Dialog open={returnDialog.open} onClose={handleCloseReturnDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", bgcolor: "error.main", color: "white" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <WarningIcon />
            <span>Record Returned Check</span>
          </Box>
          <IconButton onClick={handleCloseReturnDialog} sx={{ color: "white" }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {returnDialog.pdc && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">Check Details:</Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {returnDialog.pdc.client_name} - {returnDialog.pdc.check_number}
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: "error.main" }}>
                {formatPeso(returnDialog.pdc.amount)}
              </Typography>
            </Box>
          )}
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Return Reason (Optional)"
            placeholder="Enter reason for returning the check (e.g., Insufficient funds, Account closed, etc.)"
            value={returnDialog.reason}
            onChange={(e) => setReturnDialog((prev) => ({ ...prev, reason: e.target.value }))}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseReturnDialog} variant="outlined">Cancel</Button>
          <Button onClick={handleRecordReturned} variant="contained" color="error">
            Confirm Return
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}