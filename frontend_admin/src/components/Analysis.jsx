// src/components/Analysis.jsx
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
  Snackbar,
  Chip,
} from "@mui/material";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import SaveIcon from "@mui/icons-material/Save";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import api from "../services/tokenService";

export default function Analysis() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [perBankValues, setPerBankValues] = useState({});

  useEffect(() => {
    fetchData(selectedDate);
  }, [selectedDate]);

  async function fetchData(date) {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/summary/bank-analysis/?date=${date}`);
      setData(res.data);
      initializePerBankValues(res.data.banks);
    } catch (err) {
      console.error("Error fetching bank analysis", err);
      setError("Failed to load bank analysis data.");
    } finally {
      setLoading(false);
    }
  }

  function initializePerBankValues(banks) {
    const values = {};
    banks.forEach((bank) => {
      const reconciliation = bank.reconciliation;
      values[bank.id] = reconciliation?.per_bank || 0;
    });
    setPerBankValues(values);
  }

  const handlePerBankChange = (bankId, value) => {
    setPerBankValues((prev) => ({
      ...prev,
      [bankId]: parseFloat(value) || 0,
    }));
  };

  const handleSave = async (bankId) => {
    setSaving(true);
    try {
      const bank = data.banks.find((b) => b.id === bankId);
      const autoVals = bank.auto_computed || {};
      const reconciliation = bank.reconciliation || {};
      
      await api.post("/summary/bank-analysis/", {
        bank_id: bankId,
        date: selectedDate,
        per_bank: perBankValues[bankId] || 0,
        outstanding_checks: reconciliation.outstanding_checks || autoVals.outstanding_checks || 0,
        deposit_in_transit: reconciliation.deposit_in_transit || autoVals.deposit_in_transit || 0,
        returned_checks: reconciliation.returned_checks || autoVals.returned_checks || 0,
        bank_charges: reconciliation.bank_charges || autoVals.bank_charges || 0,
        unbooked_transfers: reconciliation.unbooked_transfers || autoVals.unbooked_transfers || 0,
        remarks: reconciliation.remarks || "",
      });
      setSnackbar({ open: true, message: "Reconciliation saved!", severity: "success" });
      fetchData(selectedDate);
    } catch (err) {
      console.error("Error saving reconciliation", err);
      setSnackbar({ open: true, message: "Failed to save.", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    if (!data?.banks) return;
    setSaving(true);
    try {
      for (const bank of data.banks) {
        const autoVals = bank.auto_computed || {};
        const reconciliation = bank.reconciliation || {};
        
        await api.post("/summary/bank-analysis/", {
          bank_id: bank.id,
          date: selectedDate,
          per_bank: perBankValues[bank.id] || 0,
          outstanding_checks: reconciliation.outstanding_checks || autoVals.outstanding_checks || 0,
          deposit_in_transit: reconciliation.deposit_in_transit || autoVals.deposit_in_transit || 0,
          returned_checks: reconciliation.returned_checks || autoVals.returned_checks || 0,
          bank_charges: reconciliation.bank_charges || autoVals.bank_charges || 0,
          unbooked_transfers: reconciliation.unbooked_transfers || autoVals.unbooked_transfers || 0,
          remarks: reconciliation.remarks || "",
        });
      }
      setSnackbar({ open: true, message: "All reconciliations saved!", severity: "success" });
      fetchData(selectedDate);
    } catch (err) {
      console.error("Error saving reconciliations", err);
      setSnackbar({ open: true, message: "Failed to save.", severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value) =>
    `₱${Number(value ?? 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const getAccountTypeLabel = (accountNumber) => {
    if (!accountNumber) return "Account";
    if (accountNumber.toLowerCase().includes("ca")) return "Checking Account";
    if (accountNumber.toLowerCase().includes("sa")) return "Savings Account";
    return "Account";
  };

  const groupedByArea = () => {
    if (!data?.banks) return {};
    const groups = {};
    data.banks.forEach((bank) => {
      const area = bank.area || "unknown";
      if (!groups[area]) groups[area] = [];
      groups[area].push(bank);
    });
    return groups;
  };

  const areaLabels = {
    main_office: "Main Office",
    tagoloan_parts: "Tagoloan Parts",
    midsayap_parts: "Midsayap Parts",
    valencia_parts: "Valencia Parts",
  };

  const calculateDcprReconciled = (bank) => {
    const perDcpr = bank.per_dcpr || 0;
    const autoVals = bank.auto_computed || {};
    const outstandingChecks = bank.reconciliation?.outstanding_checks ?? autoVals.outstanding_checks ?? 0;
    const depositInTransit = bank.reconciliation?.deposit_in_transit ?? autoVals.deposit_in_transit ?? 0;
    const returnedChecks = bank.reconciliation?.returned_checks ?? autoVals.returned_checks ?? 0;
    const bankCharges = bank.reconciliation?.bank_charges ?? autoVals.bank_charges ?? 0;
    const unbookedTransfers = bank.reconciliation?.unbooked_transfers ?? autoVals.unbooked_transfers ?? 0;
    
    return perDcpr + depositInTransit + unbookedTransfers - outstandingChecks - returnedChecks - bankCharges;
  };

  const calculateBankReconciled = (bank) => {
    const perBank = perBankValues[bank.id] || 0;
    const autoVals = bank.auto_computed || {};
    const outstandingChecks = bank.reconciliation?.outstanding_checks ?? autoVals.outstanding_checks ?? 0;
    const depositInTransit = bank.reconciliation?.deposit_in_transit ?? autoVals.deposit_in_transit ?? 0;
    const returnedChecks = bank.reconciliation?.returned_checks ?? autoVals.returned_checks ?? 0;
    const bankCharges = bank.reconciliation?.bank_charges ?? autoVals.bank_charges ?? 0;
    
    return perBank + depositInTransit - outstandingChecks - returnedChecks - bankCharges;
  };

  const isBalanced = (bank) => {
    const dcprRec = calculateDcprReconciled(bank);
    const bankRec = calculateBankReconciled(bank);
    return Math.abs(dcprRec - bankRec) < 0.01;
  };

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
              <AccountBalanceIcon sx={{ color: "#FFFFFF", fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: "primary.dark" }}>
                Bank Reconciliation Analysis
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Auto-computed from transaction history
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
            <TextField
              type="date"
              size="small"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              sx={{ width: 150 }}
            />
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSaveAll}
              disabled={saving || !data?.banks?.length}
            >
              Save All
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
          {Object.entries(groupedByArea()).map(([area, banks]) => (
            <Paper
              key={area}
              sx={{
                p: 3,
                borderRadius: 1,
                border: "1px solid",
                borderColor: "#E5E7EB",
                bgcolor: "#FFFFFF",
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: "#1E293B" }}>
                {areaLabels[area] || area}
              </Typography>

              {banks.map((bank) => {
                const reconciliation = bank.reconciliation || {};
                const autoVals = bank.auto_computed || {};
                const dcprReconciled = calculateDcprReconciled(bank);
                const bankReconciled = calculateBankReconciled(bank);
                const balanced = isBalanced(bank);
                const diff = dcprReconciled - bankReconciled;

                return (
                  <Box
                    key={bank.id}
                    sx={{
                      mb: 3,
                      p: 2,
                      border: "1px solid",
                      borderColor: "#E5E7EB",
                      borderRadius: 1,
                    }}
                  >
                    {/* Bank Header */}
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {getAccountTypeLabel(bank.account_number)} - {bank.account_number}
                      </Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<SaveIcon />}
                        onClick={() => handleSave(bank.id)}
                        disabled={saving}
                      >
                        Save
                      </Button>
                    </Box>

                    {/* Balance Header */}
                    <TableContainer sx={{ mb: 2 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: "#F1F5F9" }}>
                            <TableCell sx={{ fontWeight: 600, width: "40%" }}>Description</TableCell>
                            <TableCell sx={{ fontWeight: 600, textAlign: "right" }}>Per DCPR</TableCell>
                            <TableCell sx={{ fontWeight: 600, textAlign: "right" }}>Per Bank</TableCell>
                            <TableCell sx={{ fontWeight: 600, textAlign: "center" }}>Remarks</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>Ending Balance</TableCell>
                            <TableCell sx={{ textAlign: "right", fontWeight: 600 }}>
                              {formatCurrency(bank.per_dcpr)}
                            </TableCell>
                            <TableCell sx={{ textAlign: "right" }}>
                              <TextField
                                type="number"
                                size="small"
                                value={perBankValues[bank.id] || ""}
                                onChange={(e) => handlePerBankChange(bank.id, e.target.value)}
                                inputProps={{ style: { textAlign: "right" } }}
                                sx={{ width: 150 }}
                                placeholder="Enter bank balance"
                              />
                            </TableCell>
                            <TableCell sx={{ textAlign: "center" }}>-</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>

                    <Divider sx={{ mb: 2 }} />

                    {/* Reconciling Items - Auto Computed */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: "#666" }}>
                        Reconciling Items:
                      </Typography>
                      <Chip
                        icon={<AutoAwesomeIcon sx={{ fontSize: 14 }} />}
                        label="Auto-computed"
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </Box>

                    <TableContainer>
                      <Table size="small">
                        <TableBody>
                          {/* Outstanding Checks */}
                          <TableRow>
                            <TableCell sx={{ pl: 3 }}>
                              a. Outstanding Checks (deduct to Bank)
                            </TableCell>
                            <TableCell sx={{ textAlign: "right", color: "#666" }}>-</TableCell>
                            <TableCell sx={{ textAlign: "right", bgcolor: "#F8FAFC" }}>
                              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 500, color: "#059669" }}>
                                  {formatCurrency(autoVals.outstanding_checks || 0)}
                                </Typography>
                                <Chip label="PDC" size="small" sx={{ height: 20, fontSize: "0.7rem" }} />
                              </Box>
                            </TableCell>
                            <TableCell sx={{ textAlign: "center" }}>-</TableCell>
                          </TableRow>

                          {/* Unbooked Fund Transfers */}
                          <TableRow>
                            <TableCell sx={{ pl: 3 }}>
                              b. Unbooked Fund Transfers (add to DCPR)
                            </TableCell>
                            <TableCell sx={{ textAlign: "right", bgcolor: "#F8FAFC" }}>
                              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 500, color: "#059669" }}>
                                  {formatCurrency(autoVals.unbooked_transfers || 0)}
                                </Typography>
                                <Chip label="XFER" size="small" sx={{ height: 20, fontSize: "0.7rem" }} />
                              </Box>
                            </TableCell>
                            <TableCell sx={{ textAlign: "right", color: "#666" }}>-</TableCell>
                            <TableCell sx={{ textAlign: "center" }}>-</TableCell>
                          </TableRow>

                          {/* Deposit in Transit */}
                          <TableRow>
                            <TableCell sx={{ pl: 3 }}>
                              c. Deposit in Transit (add to Bank)
                            </TableCell>
                            <TableCell sx={{ textAlign: "right", color: "#666" }}>-</TableCell>
                            <TableCell sx={{ textAlign: "right", bgcolor: "#F8FAFC" }}>
                              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 500, color: "#059669" }}>
                                  {formatCurrency(autoVals.deposit_in_transit || 0)}
                                </Typography>
                                <Chip label="COLL" size="small" sx={{ height: 20, fontSize: "0.7rem" }} />
                              </Box>
                            </TableCell>
                            <TableCell sx={{ textAlign: "center" }}>-</TableCell>
                          </TableRow>

                          {/* Returned Checks */}
                          <TableRow>
                            <TableCell sx={{ pl: 3 }}>
                              d. Returned Checks (deduct to DCPR)
                            </TableCell>
                            <TableCell sx={{ textAlign: "right", bgcolor: "#F8FAFC" }}>
                              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 500, color: "#DC2626" }}>
                                  {formatCurrency(autoVals.returned_checks || 0)}
                                </Typography>
                                <Chip label="RTN" size="small" sx={{ height: 20, fontSize: "0.7rem" }} />
                              </Box>
                            </TableCell>
                            <TableCell sx={{ textAlign: "right", color: "#666" }}>-</TableCell>
                            <TableCell sx={{ textAlign: "center" }}>-</TableCell>
                          </TableRow>

                          {/* Bank Charges */}
                          <TableRow>
                            <TableCell sx={{ pl: 3 }}>
                              e. Bank Charges (deduct to DCPR)
                            </TableCell>
                            <TableCell sx={{ textAlign: "right", bgcolor: "#F8FAFC" }}>
                              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 500, color: "#DC2626" }}>
                                  {formatCurrency(autoVals.bank_charges || 0)}
                                </Typography>
                                <Chip label="CHRG" size="small" sx={{ height: 20, fontSize: "0.7rem" }} />
                              </Box>
                            </TableCell>
                            <TableCell sx={{ textAlign: "right", color: "#666" }}>-</TableCell>
                            <TableCell sx={{ textAlign: "center" }}>-</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>

                    <Divider sx={{ my: 2 }} />

                    {/* Reconciled Balance */}
                    <TableContainer>
                      <Table size="small">
                        <TableBody>
                          <TableRow sx={{ bgcolor: balanced ? "#10B981" : "#EF4444", color: "#FFFFFF" }}>
                            <TableCell sx={{ fontWeight: 700, color: "#FFFFFF" }}>
                              Reconciled Balance
                              {balanced ? (
                                <CheckCircleIcon sx={{ ml: 1, fontSize: 16, verticalAlign: "middle" }} />
                              ) : (
                                <ErrorIcon sx={{ ml: 1, fontSize: 16, verticalAlign: "middle" }} />
                              )}
                            </TableCell>
                            <TableCell sx={{ fontWeight: 700, textAlign: "right", color: "#FFFFFF" }}>
                              {formatCurrency(dcprReconciled)}
                            </TableCell>
                            <TableCell sx={{ fontWeight: 700, textAlign: "right", color: "#FFFFFF" }}>
                              {formatCurrency(bankReconciled)}
                            </TableCell>
                            <TableCell sx={{ fontWeight: 700, textAlign: "center", color: "#FFFFFF" }}>
                              {balanced ? "Balanced" : `Diff: ${formatCurrency(diff)}`}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>

                    {/* Remarks */}
                    <Box sx={{ mt: 2 }}>
                      <TextField
                        label="Remarks"
                        size="small"
                        fullWidth
                        multiline
                        rows={2}
                        value={reconciliation.remarks || ""}
                        placeholder="Add notes..."
                        disabled={saving}
                      />
                    </Box>
                  </Box>
                );
              })}
            </Paper>
          ))}
        </Stack>
      ) : null}

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
