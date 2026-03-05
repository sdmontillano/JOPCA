// src/components/PdcDetail.jsx
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import api from "../services/tokenService";
import { normalizePdc, partitionPdcList, pdcTotalsFromPartition } from "../utils/pdcUtils";

/**
 * PdcDetail component
 *
 * Props:
 * - onClose: function to call when closing the detail view
 * - onRefresh: optional function to call after any PDC action (refresh dashboard)
 *
 * This component fetches the PDC list, shows partitioned buckets, and provides
 * actions: Mark Matured, Deposit, Record Returned. All actions call backend
 * endpoints and then refresh local list and call onRefresh() if provided.
 */
export default function PdcDetail({ onClose = () => {}, onRefresh = null }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pdcList, setPdcList] = useState([]);
  const [partition, setPartition] = useState(null);
  const [selectedPdc, setSelectedPdc] = useState(null);
  const [depositOpen, setDepositOpen] = useState(false);
  const [returnedOpen, setReturnedOpen] = useState(false);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [depositBankId, setDepositBankId] = useState(null);
  const [depositDate, setDepositDate] = useState(new Date().toISOString().slice(0, 10));
  const [depositRef, setDepositRef] = useState("");
  const [returnedReason, setReturnedReason] = useState("");
  const [returnedDate, setReturnedDate] = useState(new Date().toISOString().slice(0, 10));
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch PDC list and bank accounts
  const fetchPdc = async () => {
    setError(null);
    setLoading(true);
    try {
      const [pdcRes, banksRes] = await Promise.all([api.get("/pdc/"), api.get("/bank-accounts/")]);
      // backend may return wrapper {status, data} or raw array
      const rawPdc = Array.isArray(pdcRes.data) ? pdcRes.data : pdcRes.data?.results ?? pdcRes.data?.data ?? pdcRes.data ?? [];
      const normalized = (rawPdc || []).map((p) => normalizePdc(p));
      setPdcList(normalized);

      const rawBanks = Array.isArray(banksRes.data) ? banksRes.data : banksRes.data?.results ?? banksRes.data?.data ?? banksRes.data ?? [];
      setBankAccounts(rawBanks.map((b) => ({ id: b.id ?? b.pk ?? b.bank_account_id, name: b.name ?? b.bank_name ?? b.account_name, account_number: b.account_number ?? b.account_no ?? b.number })));
      if (rawBanks.length > 0) setDepositBankId(rawBanks[0].id ?? rawBanks[0].pk ?? rawBanks[0].bank_account_id);
    } catch (err) {
      console.error("Failed to fetch PDCs or bank accounts", err);
      setError(err?.response?.data || err?.message || "Failed to load PDCs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPdc();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!pdcList) return;
    const part = partitionPdcList(pdcList);
    setPartition(part);
  }, [pdcList]);

  const refreshAll = async () => {
    await fetchPdc();
    if (typeof onRefresh === "function") {
      try {
        await onRefresh();
      } catch (e) {
        // ignore onRefresh errors
      }
    }
  };

  // Actions
  const markMatured = async (pdc) => {
    if (!pdc?.id) return;
    setActionLoading(true);
    try {
      await api.patch(`/pdc/${pdc.id}/`, { status: "matured" });
      await refreshAll();
    } catch (err) {
      console.error("Failed to mark matured", err);
      alert("Failed to mark PDC matured");
    } finally {
      setActionLoading(false);
    }
  };

  const openDeposit = (pdc) => {
    setSelectedPdc(pdc);
    setDepositDate(new Date().toISOString().slice(0, 10));
    setDepositRef("");
    setDepositOpen(true);
  };

  const submitDeposit = async () => {
    if (!selectedPdc?.id) return;
    setActionLoading(true);
    try {
      await api.post(`/pdc/${selectedPdc.id}/deposit/`, {
        bank_account_id: depositBankId,
        deposit_date: depositDate,
        reference: depositRef,
      });
      setDepositOpen(false);
      setSelectedPdc(null);
      await refreshAll();
    } catch (err) {
      console.error("Failed to deposit PDC", err);
      alert("Failed to deposit PDC");
    } finally {
      setActionLoading(false);
    }
  };

  const openReturned = (pdc) => {
    setSelectedPdc(pdc);
    setReturnedReason("");
    setReturnedDate(new Date().toISOString().slice(0, 10));
    setReturnedOpen(true);
  };

  const submitReturned = async () => {
    if (!selectedPdc?.id) return;
    setActionLoading(true);
    try {
      await api.patch(`/pdc/${selectedPdc.id}/`, {
        status: "returned",
        returned_reason: returnedReason,
        returned_date: returnedDate,
      });
      setReturnedOpen(false);
      setSelectedPdc(null);
      await refreshAll();
    } catch (err) {
      console.error("Failed to record returned PDC", err);
      alert("Failed to record returned check");
    } finally {
      setActionLoading(false);
    }
  };

  // Utility to render a PDC row with actions
  const renderPdcRow = (p) => (
    <TableRow key={p.id}>
      <TableCell>{p.customer ?? "-"}</TableCell>
      <TableCell>{p.check_number ?? "-"}</TableCell>
      <TableCell>{p.maturity_date ?? "-"}</TableCell>
      <TableCell align="right">{Number(p.amount ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
      <TableCell>{p.status}</TableCell>
      <TableCell>
        <Stack direction="row" spacing={1}>
          {p.status === "outstanding" && (
            <Button size="small" variant="contained" onClick={() => markMatured(p)} disabled={actionLoading}>
              Mark Matured
            </Button>
          )}
          {(p.status === "matured" || p.status === "outstanding") && (
            <Button size="small" variant="contained" color="success" onClick={() => openDeposit(p)} disabled={actionLoading}>
              Deposit
            </Button>
          )}
          {p.status !== "returned" && (
            <Button size="small" variant="outlined" color="error" onClick={() => openReturned(p)} disabled={actionLoading}>
              Record Returned
            </Button>
          )}
        </Stack>
      </TableCell>
    </TableRow>
  );

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
          {String(error)}
        </Alert>
        <Stack direction="row" spacing={1}>
          <Button variant="contained" onClick={fetchPdc}>
            Retry
          </Button>
          <Button variant="outlined" onClick={onClose}>
            Close
          </Button>
        </Stack>
      </Box>
    );

  const totals = partition ? pdcTotalsFromPartition(partition) : null;

  return (
    <Dialog open fullWidth maxWidth="lg" onClose={onClose}>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span>PDC Management</span>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2}>
          <Paper sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">Summary</Typography>
              <Stack direction="row" spacing={2}>
                <Typography variant="body2">This Month: ₱{(totals?.this_month ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</Typography>
                <Typography variant="body2">Matured: ₱{(totals?.matured ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</Typography>
                <Typography variant="body2">Total: ₱{(totals?.total ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</Typography>
              </Stack>
            </Stack>
          </Paper>

          {/* Buckets */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700 }}>
              This Month
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Customer</TableCell>
                  <TableCell>Check #</TableCell>
                  <TableCell>Mat. Date</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(partition?.this_month || []).length > 0 ? (
                  partition.this_month.map(renderPdcRow)
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No PDCs for this month
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700 }}>
              Next Month
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Customer</TableCell>
                  <TableCell>Check #</TableCell>
                  <TableCell>Mat. Date</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(partition?.next_month || []).length > 0 ? (
                  partition.next_month.map(renderPdcRow)
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No PDCs for next month
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700 }}>
              Two Months
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Customer</TableCell>
                  <TableCell>Check #</TableCell>
                  <TableCell>Mat. Date</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(partition?.two_months || []).length > 0 ? (
                  partition.two_months.map(renderPdcRow)
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No PDCs for two months
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700 }}>
              Over Two Months
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Customer</TableCell>
                  <TableCell>Check #</TableCell>
                  <TableCell>Mat. Date</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(partition?.over_two_months || []).length > 0 ? (
                  partition.over_two_months.map(renderPdcRow)
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No PDCs over two months
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>

          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700 }}>
              Matured / Deposited
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Customer</TableCell>
                  <TableCell>Check #</TableCell>
                  <TableCell>Mat. Date</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(partition?.matured || []).length > 0 ? (
                  partition.matured.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.customer}</TableCell>
                      <TableCell>{p.check_number}</TableCell>
                      <TableCell>{p.maturity_date}</TableCell>
                      <TableCell align="right">{Number(p.amount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell>{p.status}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      No matured PDCs
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" onClick={refreshAll}>Refresh</Button>
      </DialogActions>

      {/* Deposit Modal */}
      <Dialog open={depositOpen} onClose={() => setDepositOpen(false)}>
        <DialogTitle>Deposit PDC</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1, minWidth: 360 }}>
            <TextField
              select
              label="Bank Account"
              value={depositBankId ?? ""}
              onChange={(e) => setDepositBankId(e.target.value)}
              fullWidth
            >
              {bankAccounts.map((b) => (
                <MenuItem key={b.id} value={b.id}>
                  {b.name} — {b.account_number}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Deposit Date"
              type="date"
              value={depositDate}
              onChange={(e) => setDepositDate(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />

            <TextField label="Reference" value={depositRef} onChange={(e) => setDepositRef(e.target.value)} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDepositOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submitDeposit} disabled={actionLoading}>
            Confirm Deposit
          </Button>
        </DialogActions>
      </Dialog>

      {/* Returned Modal */}
      <Dialog open={returnedOpen} onClose={() => setReturnedOpen(false)}>
        <DialogTitle>Record Returned Check</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1, minWidth: 360 }}>
            <TextField
              label="Returned Date"
              type="date"
              value={returnedDate}
              onChange={(e) => setReturnedDate(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Reason"
              value={returnedReason}
              onChange={(e) => setReturnedReason(e.target.value)}
              fullWidth
              multiline
              minRows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReturnedOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={submitReturned} disabled={actionLoading}>
            Record Returned
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}