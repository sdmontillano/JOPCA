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
import pdcService from "../services/pdcService";
import { normalizePdc, partitionPdcList, pdcTotalsFromPartition } from "../utils/pdcUtils";

/**
 * PdcDetail component
 *
 * Props:
 * - open optional boolean (if parent controls visibility)
 * - onClose optional function (called when dialog closes)
 * - onRefresh optional function
 * - initialPdc optional object
 *
 * This component supports both controlled and uncontrolled usage:
 * - If parent passes open, parent should also handle onClose.
 * - If parent does not pass open, the component manages its own open state.
 *
 * Close behavior:
 * - If parent provided onClose, call it.
 * - Otherwise, navigate back using window.history.back() (works like browser Back).
 */
export default function PdcDetail({
  open: openProp = undefined,
  onClose: onCloseProp = undefined,
  onRefresh = null,
  initialPdc = null,
}) {
  // localOpen used when parent does not control the dialog
  const [localOpen, setLocalOpen] = useState(true);
  const isControlled = typeof openProp !== "undefined";
  const open = isControlled ? openProp : localOpen;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pdcList, setPdcList] = useState([]);
  const [partition, setPartition] = useState(null);
  const [selectedPdc, setSelectedPdc] = useState(initialPdc);
  const [depositOpen, setDepositOpen] = useState(false);
  const [returnedOpen, setReturnedOpen] = useState(false);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [depositBankId, setDepositBankId] = useState(null);
  const [depositDate, setDepositDate] = useState(new Date().toISOString().slice(0, 10));
  const [depositRef, setDepositRef] = useState("");
  const [returnedReason, setReturnedReason] = useState("");
  const [returnedDate, setReturnedDate] = useState(new Date().toISOString().slice(0, 10));
  const [actionLoading, setActionLoading] = useState(false);

  // navigation-aware close handler
  const handleClose = () => {
    // prefer parent handler if provided
    try {
      if (typeof onCloseProp === "function") {
        onCloseProp();
        return;
      }
    } catch (e) {
      // if parent handler throws, log and continue to fallback navigation
      // eslint-disable-next-line no-console
      console.error("parent onClose threw", e);
    }

    // fallback: go back in browser history (acts like Back to PDC page)
    try {
      if (window && typeof window.history?.back === "function") {
        window.history.back();
        return;
      }
    } catch (e) {
      // ignore
    }

    // final fallback: close locally if uncontrolled
    if (!isControlled) setLocalOpen(false);
  };

  // Fetch PDC list and bank accounts
  const fetchPdc = async () => {
    setError(null);
    setLoading(true);
    try {
      const [pdcRes, banksRes] = await Promise.all([pdcService.listPdcs(), api.get("/bankaccounts/")]);

      const rawPdc = Array.isArray(pdcRes.data) ? pdcRes.data : pdcRes.data?.results ?? pdcRes.data ?? [];
      const normalized = (rawPdc || []).map((p) => normalizePdc(p));
      setPdcList(normalized);

      const rawBanks = Array.isArray(banksRes.data) ? banksRes.data : banksRes.data?.results ?? banksRes.data ?? [];
      const mappedBanks = rawBanks.map((b) => ({
        id: b.id ?? b.pk ?? b.bank_account_id,
        name: b.name ?? b.bank_name ?? b.account_name ?? "",
        account_number: b.account_number ?? b.account_no ?? b.number ?? "",
      }));
      setBankAccounts(mappedBanks);
      if (mappedBanks.length > 0) setDepositBankId(mappedBanks[0].id);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to fetch PDCs or bank accounts", err);
      if (err?.response?.status === 404) {
        setBankAccounts([]);
        setError("Bank accounts endpoint not found. Deposit disabled until backend route is available.");
      } else {
        setError(err?.response?.data || err?.message || "Failed to load PDCs");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchPdc();
      if (initialPdc) setSelectedPdc(initialPdc);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
    // eslint-disable-next-line no-console
    console.log("markMatured clicked", pdc?.id);
    if (!pdc?.id) return;
    setActionLoading(true);
    try {
      await pdcService.markPdcMatured(pdc.id);
      await refreshAll();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to mark matured", err);
      setError("Failed to mark PDC matured");
    } finally {
      setActionLoading(false);
    }
  };

  const openDeposit = (pdc) => {
    // eslint-disable-next-line no-console
    console.log("openDeposit clicked", pdc?.id);
    setSelectedPdc(pdc);
    setDepositDate(new Date().toISOString().slice(0, 10));
    setDepositRef("");
    setDepositOpen(true);
  };

  const submitDeposit = async () => {
    // eslint-disable-next-line no-console
    console.log("submitDeposit clicked", selectedPdc?.id, depositBankId);
    if (!selectedPdc?.id) return;
    setActionLoading(true);
    try {
      await pdcService.depositPdc(selectedPdc.id, depositBankId, depositDate, depositRef);
      setDepositOpen(false);
      setSelectedPdc(null);
      await refreshAll();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to deposit PDC", err);
      setError("Failed to deposit PDC");
    } finally {
      setActionLoading(false);
    }
  };

  const openReturned = (pdc) => {
    // eslint-disable-next-line no-console
    console.log("openReturned clicked", pdc?.id);
    setSelectedPdc(pdc);
    setReturnedReason("");
    setReturnedDate(new Date().toISOString().slice(0, 10));
    setReturnedOpen(true);
  };

  const submitReturned = async () => {
    // eslint-disable-next-line no-console
    console.log("submitReturned clicked", selectedPdc?.id, returnedDate, returnedReason);
    if (!selectedPdc?.id) return;
    setActionLoading(true);
    try {
      await pdcService.recordPdcReturned(selectedPdc.id, returnedDate, returnedReason);
      setReturnedOpen(false);
      setSelectedPdc(null);
      await refreshAll();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Failed to record returned PDC", err);
      setError("Failed to record returned check");
    } finally {
      setActionLoading(false);
    }
  };

  const renderPdcRow = (p) => (
    <TableRow key={p.id}>
      <TableCell>{p.customer ?? "-"}</TableCell>
      <TableCell>{p.check_number ?? "-"}</TableCell>
      <TableCell>{p.maturity_date ?? "-"}</TableCell>
      <TableCell align="right">
        {Number(p.amount ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </TableCell>
      <TableCell>{p.status}</TableCell>
      <TableCell>
        <Stack direction="row" spacing={1}>
          {p.status === "outstanding" && (
            <Button type="button" size="small" variant="contained" onClick={() => markMatured(p)} disabled={actionLoading}>
              Mark Matured
            </Button>
          )}
          {(p.status === "matured" || p.status === "outstanding") && (
            <Button
              type="button"
              size="small"
              variant="contained"
              color="success"
              onClick={() => openDeposit(p)}
              disabled={actionLoading || bankAccounts.length === 0}
            >
              Deposit
            </Button>
          )}
          {p.status !== "returned" && (
            <Button type="button" size="small" variant="outlined" color="error" onClick={() => openReturned(p)} disabled={actionLoading}>
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
          <Button type="button" variant="contained" onClick={fetchPdc}>
            Retry
          </Button>
          <Button type="button" variant="outlined" onClick={handleClose}>
            Close
          </Button>
        </Stack>
      </Box>
    );

  const totals = partition ? pdcTotalsFromPartition(partition) : null;

  return (
    <Dialog open={open} fullWidth maxWidth="lg" onClose={handleClose}>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span>PDC Management</span>
        <IconButton type="button" onClick={handleClose} aria-label="close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2}>
          <Paper sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">Summary</Typography>
              <Stack direction="row" spacing={2}>
                <Typography variant="body2">
                  This Month: ₱{(totals?.this_month ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </Typography>
                <Typography variant="body2">
                  Matured: ₱{(totals?.matured ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </Typography>
                <Typography variant="body2">
                  Total: ₱{(totals?.total ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                </Typography>
              </Stack>
            </Stack>
          </Paper>

          {/* This Month */}
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

          {/* Next Month */}
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

          {/* Two Months */}
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

          {/* Over Two Months */}
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

          {/* Matured / Deposited */}
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
                      <TableCell align="right">
                        {Number(p.amount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                      </TableCell>
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
        <Button type="button" onClick={handleClose}>
          Close
        </Button>
        <Button type="button" variant="contained" onClick={refreshAll}>
          Refresh
        </Button>
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
          <Button type="button" onClick={() => setDepositOpen(false)}>
            Cancel
          </Button>
          <Button type="button" variant="contained" onClick={submitDeposit} disabled={actionLoading || bankAccounts.length === 0}>
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
          <Button type="button" onClick={() => setReturnedOpen(false)}>
            Cancel
          </Button>
          <Button type="button" variant="contained" color="error" onClick={submitReturned} disabled={actionLoading}>
            Record Returned
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}