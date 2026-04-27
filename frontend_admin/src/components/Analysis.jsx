// src/components/Analysis.jsx
import { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Stack,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Snackbar,
  IconButton,
  Divider,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import SaveIcon from "@mui/icons-material/Save";
import PrintIcon from "@mui/icons-material/Print";
import DownloadIcon from "@mui/icons-material/Download";
import api from "../services/tokenService";
import { useNavigate } from "react-router-dom";
import { exportAnalysisPDF, exportAnalysisExcel } from "../utils/exportUtils";
import QuickActionFAB from "./QuickActionFAB";
import AddTransaction from "./AddTransaction";
import AddBankAccount from "./AddBankAccount";
import PdcCreateModal from "./PdcCreateModal";
import AddPcfModal from "./AddPcfModal";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import WalletIcon from "@mui/icons-material/Wallet";

export default function Analysis() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [user, setUser] = useState(null);
  const [perBankValues, setPerBankValues] = useState({});
  const [remarksValues, setRemarksValues] = useState({});
  const [addTransactionOpen, setAddTransactionOpen] = useState(false);
  const [addBankOpen, setAddBankOpen] = useState(false);
  const [addPdcOpen, setAddPdcOpen] = useState(false);
  const [addPcfOpen, setAddPcfOpen] = useState(false);
  const navigate = useNavigate();

  const handleExportPDF = () => {
    setExporting(true);
    try {
      exportAnalysisPDF(data, selectedDate, user);
    } catch (err) {
      console.error('PDF export failed:', err);
    }
    setExporting(false);
  };

  const handleExportExcel = () => {
    setExporting(true);
    try {
      exportAnalysisExcel(data, selectedDate, user);
    } catch (err) {
      console.error('Excel export failed:', err);
    }
    setExporting(false);
  };

  useEffect(() => {
    fetchData(selectedDate);
    fetchUserProfile();
  }, [selectedDate]);

  async function fetchUserProfile() {
    try {
      const res = await api.get("/api/user/profile/");
      setUser(res.data);
    } catch (err) {
      console.error("Error fetching user profile", err);
    }
  }

  async function fetchData(date) {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/summary/bank-analysis/?date=${date}`);
      setData(res.data);
      initializeValues(res.data.banks);
    } catch (err) {
      console.error("Error fetching bank analysis", err);
      setError("Failed to load bank analysis data.");
    } finally {
      setLoading(false);
    }
  }

  function initializeValues(banks) {
    const perBank = {};
    const remarks = {};
    banks.forEach((bank) => {
      const reconciliation = bank.reconciliation;
      perBank[bank.id] = reconciliation?.per_bank ?? bank.per_dcpr ?? 0;
      remarks[bank.id] = reconciliation?.remarks ?? "";
    });
    setPerBankValues(perBank);
    setRemarksValues(remarks);
  }

  const handlePerBankChange = (bankId, value) => {
    setPerBankValues((prev) => ({
      ...prev,
      [bankId]: parseFloat(value) || 0,
    }));
  };

  const handleRemarksChange = (bankId, value) => {
    setRemarksValues((prev) => ({
      ...prev,
      [bankId]: value,
    }));
  };

  const calculateReconciledBalance = (bank) => {
    // Per Bank: use saved value, or opening_balance (auto-filled), or default to per_dcpr
    const perBank = perBankValues[bank.id] || (bank.reconciliation?.per_bank ?? (bank.per_dcpr || 0));
    const auto = bank.auto_computed || {};
    const rec = bank.reconciliation || {};
    
    // Use saved values if available, otherwise use auto-computed
    const depositInTransit = rec.deposit_in_transit ?? auto.deposit_in_transit ?? 0;
    const outstandingChecks = rec.outstanding_checks ?? auto.outstanding_checks ?? 0;
    const returnedChecks = rec.returned_checks ?? auto.returned_checks ?? 0;
    const bankCharges = rec.bank_charges ?? auto.bank_charges ?? 0;
    const unbookedTransfers = rec.unbooked_transfers ?? auto.unbooked_transfers ?? 0;
    
    // Bank Side: Per Bank + Deposit in Transit - Outstanding Checks - Returned Checks - Bank Charges
    const bankReconciled = parseFloat(perBank) + parseFloat(depositInTransit) - parseFloat(outstandingChecks) - parseFloat(returnedChecks) - parseFloat(bankCharges);
    
    return bankReconciled;
  };

  const handleSave = async (bankId) => {
    setSaving(true);
    try {
      const bank = data.banks.find(b => b.id === bankId);
      const auto = bank.auto_computed || {};
      const rec = bank.reconciliation || {};
      
      await api.post("/summary/bank-analysis/", {
        bank_id: bankId,
        date: selectedDate,
        per_bank: perBankValues[bankId] || 0,
        outstanding_checks: rec.outstanding_checks ?? auto.outstanding_checks ?? 0,
        deposit_in_transit: rec.deposit_in_transit ?? auto.deposit_in_transit ?? 0,
        returned_checks: rec.returned_checks ?? auto.returned_checks ?? 0,
        bank_charges: rec.bank_charges ?? auto.bank_charges ?? 0,
        unbooked_transfers: rec.unbooked_transfers ?? auto.unbooked_transfers ?? 0,
        remarks: remarksValues[bankId] || "",
      });
      setSnackbar({ open: true, message: "Saved!", severity: "success" });
      fetchData(selectedDate);
    } catch (err) {
      console.error("Error saving", err);
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
        const auto = bank.auto_computed || {};
        const rec = bank.reconciliation || {};
        
        await api.post("/summary/bank-analysis/", {
          bank_id: bank.id,
          date: selectedDate,
          per_bank: perBankValues[bank.id] || 0,
          outstanding_checks: rec.outstanding_checks ?? auto.outstanding_checks ?? 0,
          deposit_in_transit: rec.deposit_in_transit ?? auto.deposit_in_transit ?? 0,
          returned_checks: rec.returned_checks ?? auto.returned_checks ?? 0,
          bank_charges: rec.bank_charges ?? auto.bank_charges ?? 0,
          unbooked_transfers: rec.unbooked_transfers ?? auto.unbooked_transfers ?? 0,
          remarks: remarksValues[bank.id] || "",
        });
      }
      setSnackbar({ open: true, message: "All saved!", severity: "success" });
      fetchData(selectedDate);
    } catch (err) {
      console.error("Error saving", err);
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

  const getAccountType = (accountNumber) => {
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

  // Calculate grand totals
  const calculateGrandTotals = () => {
    if (!data?.banks) return { totalPerDcpr: 0, totalPerBank: 0, totalReconciled: 0 };
    
    let totalPerDcpr = 0;
    let totalPerBank = 0;
    let totalReconciled = 0;
    
    data.banks.forEach(bank => {
      totalPerDcpr += parseFloat(bank.per_dcpr) || 0;
      // Per Bank: use saved value, or opening_balance (auto-filled), or default to per_dcpr
      const perBank = perBankValues[bank.id] || (bank.reconciliation?.per_bank ?? (bank.per_dcpr || 0));
      totalPerBank += parseFloat(perBank) || 0;
      totalReconciled += calculateReconciledBalance(bank);
    });
    
    return { totalPerDcpr, totalPerBank, totalReconciled };
  };

  const grandTotals = calculateGrandTotals();

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
                Daily bank reconciliation statement
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <Button
              variant="contained"
              size="small"
              startIcon={<PrintIcon />}
              onClick={handleExportPDF}
              disabled={exporting || loading}
              sx={{ 
                bgcolor: "#DC2626", 
                textTransform: "none",
                "&:hover": { bgcolor: "#B91C1C" }
              }}
            >
              PDF
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<DownloadIcon />}
              onClick={handleExportExcel}
              disabled={exporting || loading}
              sx={{ 
                bgcolor: "#16A34A", 
                textTransform: "none",
                "&:hover": { bgcolor: "#15803D" }
              }}
            >
              Excel
            </Button>
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
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate("/dashboard")}
              sx={{
                borderColor: "#E5E7EB",
                color: "#475569",
                "&:hover": { bgcolor: "#F3F4F6", borderColor: "#D1D5DB" },
              }}
            >
              Back
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
                const isChecking = bank.account_number?.toLowerCase().includes("ca");
                const auto = bank.auto_computed || {};
                const rec = bank.reconciliation || {};
                
                // Use saved values if available, otherwise use auto-computed
                const depositInTransit = rec.deposit_in_transit ?? auto.deposit_in_transit ?? 0;
                const outstandingChecks = rec.outstanding_checks ?? auto.outstanding_checks ?? 0;
                const returnedChecks = rec.returned_checks ?? auto.returned_checks ?? 0;
                const bankCharges = rec.bank_charges ?? auto.bank_charges ?? 0;
                const unbookedTransfers = rec.unbooked_transfers ?? auto.unbooked_transfers ?? 0;
                
                const bankReconciled = calculateReconciledBalance(bank);
                
                return (
                  <Box
                    key={bank.id}
                    sx={{
                      mb: 4,
                      p: 2,
                      border: "1px solid",
                      borderColor: "#E5E7EB",
                      borderRadius: 1,
                    }}
                  >
                    {/* Bank Header */}
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                      {bank.name} - {getAccountType(bank.account_number)} ({bank.account_number})
                    </Typography>

                    {/* Table */}
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ bgcolor: "#1E293B", color: "white", fontWeight: 700, fontSize: "0.75rem", width: "45%" }}>Description</TableCell>
                            <TableCell sx={{ bgcolor: "#1E293B", color: "white", fontWeight: 700, fontSize: "0.75rem" }} align="right">Per DCPR</TableCell>
                            <TableCell sx={{ bgcolor: "#1E293B", color: "white", fontWeight: 700, fontSize: "0.75rem" }} align="right">Per Bank</TableCell>
                            <TableCell sx={{ bgcolor: "#1E293B", color: "white", fontWeight: 700, fontSize: "0.75rem", textAlign: "center" }}>Remarks</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {/* Ending Balance */}
                          <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>Ending Balance</TableCell>
                            <TableCell sx={{ textAlign: "right", fontWeight: 600 }}>
                              {formatCurrency(bank.per_dcpr)}
                            </TableCell>
                            <TableCell sx={{ textAlign: "right", fontWeight: 500, color: "#1E293B" }}>
                              {formatCurrency(perBankValues[bank.id] || bank.reconciliation?.per_bank || bank.per_dcpr || 0)}
                            </TableCell>
                            <TableCell sx={{ textAlign: "center", color: "#999" }}>auto-filled</TableCell>
                          </TableRow>

                          {/* Reconciling Items Label */}
                          <TableRow>
                            <TableCell colSpan={4} sx={{ py: 1, bgcolor: "#F8FAFC" }}>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: "#666" }}>
                                Reconciling Items:
                              </Typography>
                            </TableCell>
                          </TableRow>
                          
                          {isChecking ? (
                            // Checking Account items
                            <>
                              <TableRow>
                                <TableCell sx={{ pl: 3, fontSize: "0.85rem", color: "#555" }}>
                                  a. Outstanding Checks
                                </TableCell>
                                <TableCell sx={{ textAlign: "right", color: outstandingChecks > 0 ? "#ef4444" : "#666" }}>
                                  {formatCurrency(outstandingChecks)}
                                </TableCell>
                                <TableCell sx={{ textAlign: "right", color: "#666" }}>-</TableCell>
                                <TableCell sx={{ textAlign: "center", color: "#666", fontSize: "0.8rem" }}>
                                  deduct to Bank
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell sx={{ pl: 3, fontSize: "0.85rem", color: "#555" }}>
                                  b. Unbooked Fund Transfers
                                </TableCell>
                                <TableCell sx={{ textAlign: "right", color: unbookedTransfers > 0 ? "#22c55e" : "#666" }}>
                                  {formatCurrency(unbookedTransfers)}
                                </TableCell>
                                <TableCell sx={{ textAlign: "right", color: "#666" }}>-</TableCell>
                                <TableCell sx={{ textAlign: "center", color: "#666", fontSize: "0.8rem" }}>
                                  add to DCPR
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell sx={{ pl: 3, fontSize: "0.85rem", color: "#555" }}>
                                  c. Bank Charges
                                </TableCell>
                                <TableCell sx={{ textAlign: "right", color: bankCharges > 0 ? "#ef4444" : "#666" }}>
                                  {formatCurrency(bankCharges)}
                                </TableCell>
                                <TableCell sx={{ textAlign: "right", color: "#666" }}>-</TableCell>
                                <TableCell sx={{ textAlign: "center", color: "#666", fontSize: "0.8rem" }}>
                                  add/deduct to DCPR
                                </TableCell>
                              </TableRow>
                            </>
                          ) : (
                            // Savings Account items
                            <>
                              <TableRow>
                                <TableCell sx={{ pl: 3, fontSize: "0.85rem", color: "#555" }}>
                                  a. Deposit in Transit
                                </TableCell>
                                <TableCell sx={{ textAlign: "right", color: depositInTransit > 0 ? "#22c55e" : "#666" }}>
                                  {formatCurrency(depositInTransit)}
                                </TableCell>
                                <TableCell sx={{ textAlign: "right", color: "#666" }}>-</TableCell>
                                <TableCell sx={{ textAlign: "center", color: "#666", fontSize: "0.8rem" }}>
                                  add to Bank
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell sx={{ pl: 3, fontSize: "0.85rem", color: "#555" }}>
                                  b. Remittance to Checking Account
                                </TableCell>
                                <TableCell sx={{ textAlign: "right", color: unbookedTransfers > 0 ? "#ef4444" : "#666" }}>
                                  {formatCurrency(unbookedTransfers)}
                                </TableCell>
                                <TableCell sx={{ textAlign: "right", color: "#666" }}>-</TableCell>
                                <TableCell sx={{ textAlign: "center", color: "#666", fontSize: "0.8rem" }}>
                                  deduct to DCPR
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell sx={{ pl: 3, fontSize: "0.85rem", color: "#555" }}>
                                  c. Returned Check
                                </TableCell>
                                <TableCell sx={{ textAlign: "right", color: returnedChecks > 0 ? "#ef4444" : "#666" }}>
                                  {formatCurrency(returnedChecks)}
                                </TableCell>
                                <TableCell sx={{ textAlign: "right", color: "#666" }}>-</TableCell>
                                <TableCell sx={{ textAlign: "center", color: "#666" }}>-</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell sx={{ pl: 3, fontSize: "0.85rem", color: "#555" }}>
                                  d. Bank Charges
                                </TableCell>
                                <TableCell sx={{ textAlign: "right", color: bankCharges > 0 ? "#ef4444" : "#666" }}>
                                  {formatCurrency(bankCharges)}
                                </TableCell>
                                <TableCell sx={{ textAlign: "right", color: "#666" }}>-</TableCell>
                                <TableCell sx={{ textAlign: "center", color: "#666", fontSize: "0.8rem" }}>
                                  add/deduct to DCPR
                                </TableCell>
                              </TableRow>
                            </>
                          )}

                          {/* Reconciled Balance */}
                          <TableRow sx={{ bgcolor: "#1E293B", color: "#FFFFFF" }}>
                            <TableCell sx={{ fontWeight: 700, color: "#FFFFFF" }}>Reconciled Balance</TableCell>
                            <TableCell sx={{ fontWeight: 700, textAlign: "right", color: "#FFFFFF" }}>
                              {formatCurrency(bankReconciled)}
                            </TableCell>
                            <TableCell sx={{ fontWeight: 700, textAlign: "right", color: "#FFFFFF" }}>
                              {formatCurrency(bankReconciled)}
                            </TableCell>
                            <TableCell sx={{ fontWeight: 700, textAlign: "center", color: "#FFFFFF" }}>-</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>

                    {/* Remarks and Save */}
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2, gap: 2 }}>
                      <TextField
                        label="Remarks"
                        size="small"
                        fullWidth
                        value={remarksValues[bank.id] || ""}
                        onChange={(e) => handleRemarksChange(bank.id, e.target.value)}
                        placeholder="Add notes..."
                      />
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<SaveIcon />}
                        onClick={() => handleSave(bank.id)}
                        disabled={saving}
                      >
                        Save
                      </Button>
                    </Box>
                  </Box>
                );
              })}
            </Paper>
          ))}

          {/* Grand Total Section */}
          <Paper sx={{ p: 3, borderRadius: 1, border: "2px solid #1E293B", bgcolor: "#1E293B" }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: "#FFFFFF" }}>
              GRAND TOTAL - ALL ACCOUNTS
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableBody>
                  <TableRow sx={{ bgcolor: "#1E293B" }}>
                    <TableCell sx={{ fontWeight: 700, color: "#FFFFFF", fontSize: "1.1rem" }}>Total Per DCPR (Ending Balance)</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: "right", color: "#F59E0B", fontSize: "1.1rem" }}>
                      {formatCurrency(grandTotals.totalPerDcpr)}
                    </TableCell>
                  </TableRow>
                  <TableRow sx={{ bgcolor: "#1E293B" }}>
                    <TableCell sx={{ fontWeight: 700, color: "#FFFFFF", fontSize: "1.1rem" }}>Total Per Bank (Manual Entry)</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: "right", color: "#F59E0B", fontSize: "1.1rem" }}>
                      {formatCurrency(grandTotals.totalPerBank)}
                    </TableCell>
                  </TableRow>
                  <TableRow sx={{ bgcolor: "#F59E0B" }}>
                    <TableCell sx={{ fontWeight: 700, color: "#1E293B", fontSize: "1.2rem" }}>Total Reconciled Balance</TableCell>
                    <TableCell sx={{ fontWeight: 700, textAlign: "right", color: "#1E293B", fontSize: "1.2rem" }}>
                      {formatCurrency(grandTotals.totalReconciled)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          {/* Signatures */}
          <Paper sx={{ p: 3, borderRadius: 1, border: "1px solid #E5E7EB" }}>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>Prepared by:</Typography>
                <Typography variant="body2" sx={{ mt: 1, textTransform: "uppercase" }}>
                  {user?.first_name && user?.last_name 
                    ? `${user.first_name} ${user.last_name}` 
                    : user?.username || "User"}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>Approved by:</Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>JOHN P. CABAÑOG</Typography>
              </Box>
            </Box>
          </Paper>
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

      <QuickActionFAB
        customActions={[
          { label: "Add Transaction", icon: <AddCircleOutlineIcon />, onClick: () => setAddTransactionOpen(true) },
          { label: "Add Bank Account", icon: <AccountBalanceIcon />, onClick: () => setAddBankOpen(true) },
          { label: "Add PDC", icon: <ReceiptLongIcon />, onClick: () => setAddPdcOpen(true) },
          { label: "Add PCF", icon: <WalletIcon />, onClick: () => setAddPcfOpen(true) },
        ]}
      />

      <AddTransaction open={addTransactionOpen} onClose={() => setAddTransactionOpen(false)} refreshData={() => fetchData(selectedDate)} />
      <AddBankAccount open={addBankOpen} onClose={() => setAddBankOpen(false)} refreshData={fetchData} />
      <PdcCreateModal open={addPdcOpen} onClose={() => setAddPdcOpen(false)} refreshData={fetchData} />
      <AddPcfModal open={addPcfOpen} onClose={() => setAddPcfOpen(false)} refreshData={fetchData} />
    </Box>
  );
}