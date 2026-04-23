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
  MenuItem,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import WarningIcon from "@mui/icons-material/Warning";
import pdcService from "../services/pdcService";
import api from "../services/tokenService";
import { useNavigate } from "react-router-dom";
import { useToast } from "../ToastContext";

export default function PdcPage() {
  const { showToast } = useToast();
  const [pdcList, setPdcList] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [returnDialog, setReturnDialog] = useState({ open: false, pdc: null, reason: "" });
  const [depositDialog, setDepositDialog] = useState({ open: false, pdc: null, bankId: null, depositDate: new Date().toISOString().slice(0, 10) });
  const navigate = useNavigate();

  const fetchPdcs = async () => {
    setError(null);
    setLoading(true);
    try {
      const [pdcRes, banksRes] = await Promise.all([pdcService.listPdcs(), api.get("/api/bankaccounts/")]);
      
      const raw = Array.isArray(pdcRes.data) ? pdcRes.data : pdcRes.data?.results ?? [];
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

      const rawBanks = Array.isArray(banksRes.data) ? banksRes.data : banksRes.data?.results ?? banksRes.data ?? [];
      const mappedBanks = rawBanks.map((b) => ({
        id: b.id ?? b.pk ?? b.bank_account_id,
        name: b.name ?? b.bank_name ?? b.account_name ?? "",
        account_number: b.account_number ?? b.account_no ?? b.number ?? "",
      }));
      setBankAccounts(mappedBanks);

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
      showToast("PDC marked as matured!", "success");
      fetchPdcs();
    } catch (err) {
      console.error(err);
      showToast("Failed to mark matured", "error");
    }
  };

  const handleDeposit = (pdc) => {
    setDepositDialog({ open: true, pdc, bankId: bankAccounts[0]?.id || null, depositDate: new Date().toISOString().slice(0, 10) });
  };

  const handleCloseDepositDialog = () => {
    setDepositDialog({ open: false, pdc: null, bankId: null, depositDate: null });
  };

  const handleConfirmDeposit = async () => {
    if (!depositDialog.pdc || !depositDialog.pdc.deposit_bank_id) return;
    try {
      await pdcService.depositPdc(
        depositDialog.pdc.id, 
        depositDialog.pdc.deposit_bank_id, 
        depositDialog.depositDate, 
        "WEB-DEPOSIT"
      );
      showToast("PDC deposited successfully!", "success");
      handleCloseDepositDialog();
      fetchPdcs();
    } catch (err) {
      console.error(err);
      showToast("Failed to deposit PDC: " + (err?.response?.data?.detail || err?.message), "error");
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
      showToast("Returned recorded successfully!", "success");
      handleCloseReturnDialog();
      fetchPdcs();
    } catch (err) {
      console.error("Record return failed:", err);
      const errorMsg = err?.response?.data?.detail || err?.message || "Failed to record returned check";
      showToast(errorMsg, "error");
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
                          onClick={() => handleDeposit(p)}
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

      {/* Deposit Dialog */}
      <Dialog open={depositDialog.open} onClose={handleCloseDepositDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", bgcolor: "primary.main", color: "white" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <span>Deposit PDC</span>
          </Box>
          <IconButton onClick={handleCloseDepositDialog} sx={{ color: "white" }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {depositDialog.pdc && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">Check Details:</Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {depositDialog.pdc.client_name} - {depositDialog.pdc.check_number}
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: "success.main" }}>
                {formatPeso(depositDialog.pdc.amount)}
              </Typography>
              <Typography variant="body1" sx={{ mt: 2 }}>
                <strong>Bank:</strong> {bankAccounts.find(b => b.id === depositDialog.pdc.deposit_bank_id)?.name || "Not assigned"}
              </Typography>
              
              <TextField
                label="Deposit Date"
                type="date"
                value={depositDialog.depositDate}
                onChange={(e) => setDepositDialog({ ...depositDialog, depositDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                fullWidth
                sx={{ mt: 2 }}
                helperText="Select the date when you deposited this check"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseDepositDialog} variant="outlined">Cancel</Button>
          <Button 
            onClick={handleConfirmDeposit} 
            variant="contained" 
            color="primary"
            disabled={!depositDialog.pdc?.deposit_bank_id}
          >
            Confirm Deposit
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}