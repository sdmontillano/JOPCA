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
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import SaveIcon from "@mui/icons-material/Save";
import api from "../services/tokenService";
import { useNavigate } from "react-router-dom";

export default function Analysis() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [user, setUser] = useState(null);
  const [perBankValues, setPerBankValues] = useState({});
  const [remarksValues, setRemarksValues] = useState({});
  const navigate = useNavigate();

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

  const handleSave = async (bankId) => {
    setSaving(true);
    try {
      await api.post("/summary/bank-analysis/", {
        bank_id: bankId,
        date: selectedDate,
        per_bank: perBankValues[bankId] || 0,
        outstanding_checks: 0,
        deposit_in_transit: 0,
        returned_checks: 0,
        bank_charges: 0,
        unbooked_transfers: 0,
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
        await api.post("/summary/bank-analysis/", {
          bank_id: bank.id,
          date: selectedDate,
          per_bank: perBankValues[bank.id] || 0,
          outstanding_checks: 0,
          deposit_in_transit: 0,
          returned_checks: 0,
          bank_charges: 0,
          unbooked_transfers: 0,
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
            <IconButton onClick={() => navigate("/dashboard")}>
              <ArrowBackIcon />
            </IconButton>
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
                Daily bank reconciliation
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
                const isChecking = bank.account_number?.toLowerCase().includes("ca");
                
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
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
                      {getAccountType(bank.account_number)} - {bank.account_number}
                    </Typography>

                    {/* Table */}
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: "#F1F5F9" }}>
                            <TableCell sx={{ fontWeight: 600, width: "45%" }}>Description</TableCell>
                            <TableCell sx={{ fontWeight: 600, textAlign: "right" }}>Per DCPR</TableCell>
                            <TableCell sx={{ fontWeight: 600, textAlign: "right" }}>Per Bank</TableCell>
                            <TableCell sx={{ fontWeight: 600, textAlign: "center" }}>Remarks</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {/* Ending Balance */}
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
                              />
                            </TableCell>
                            <TableCell sx={{ textAlign: "center" }}>-</TableCell>
                          </TableRow>

                          {/* Reconciling Items Labels */}
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
                                <TableCell sx={{ textAlign: "right", color: "#666" }}>-</TableCell>
                                <TableCell sx={{ textAlign: "right", color: "#666" }}>-</TableCell>
                                <TableCell sx={{ textAlign: "center", color: "#666", fontSize: "0.8rem" }}>
                                  deduct to Bank
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell sx={{ pl: 3, fontSize: "0.85rem", color: "#555" }}>
                                  b. Unbooked Fund Transfers
                                </TableCell>
                                <TableCell sx={{ textAlign: "right", color: "#666" }}>-</TableCell>
                                <TableCell sx={{ textAlign: "right", color: "#666" }}>-</TableCell>
                                <TableCell sx={{ textAlign: "center", color: "#666", fontSize: "0.8rem" }}>
                                  add to DCPR
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell sx={{ pl: 3, fontSize: "0.85rem", color: "#555" }}>
                                  c. Bank Charges
                                </TableCell>
                                <TableCell sx={{ textAlign: "right", color: "#666" }}>-</TableCell>
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
                                <TableCell sx={{ textAlign: "right", color: "#666" }}>-</TableCell>
                                <TableCell sx={{ textAlign: "right", color: "#666" }}>-</TableCell>
                                <TableCell sx={{ textAlign: "center", color: "#666", fontSize: "0.8rem" }}>
                                  add to Bank
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell sx={{ pl: 3, fontSize: "0.85rem", color: "#555" }}>
                                  b. Remittance to Checking Account
                                </TableCell>
                                <TableCell sx={{ textAlign: "right", color: "#666" }}>-</TableCell>
                                <TableCell sx={{ textAlign: "right", color: "#666" }}>-</TableCell>
                                <TableCell sx={{ textAlign: "center", color: "#666", fontSize: "0.8rem" }}>
                                  Deduct to DCPR
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell sx={{ pl: 3, fontSize: "0.85rem", color: "#555" }}>
                                  c. Returned Check
                                </TableCell>
                                <TableCell sx={{ textAlign: "right", color: "#666" }}>-</TableCell>
                                <TableCell sx={{ textAlign: "right", color: "#666" }}>-</TableCell>
                                <TableCell sx={{ textAlign: "center", color: "#666" }}>-</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell sx={{ pl: 3, fontSize: "0.85rem", color: "#555" }}>
                                  d. Bank Charges
                                </TableCell>
                                <TableCell sx={{ textAlign: "right", color: "#666" }}>-</TableCell>
                                <TableCell sx={{ textAlign: "right", color: "#666" }}>-</TableCell>
                                <TableCell sx={{ textAlign: "center", color: "#666", fontSize: "0.8rem" }}>
                                  add/deduct to DCPR
                                </TableCell>
                              </TableRow>
                            </>
                          )}

                          {/* Reconciled Balance - Same as Ending */}
                          <TableRow sx={{ bgcolor: "#1E293B", color: "#FFFFFF" }}>
                            <TableCell sx={{ fontWeight: 700, color: "#FFFFFF" }}>Reconciled Balance</TableCell>
                            <TableCell sx={{ fontWeight: 700, textAlign: "right", color: "#FFFFFF" }}>
                              {formatCurrency(perBankValues[bank.id] || bank.per_dcpr)}
                            </TableCell>
                            <TableCell sx={{ fontWeight: 700, textAlign: "right", color: "#FFFFFF" }}>
                              {formatCurrency(perBankValues[bank.id] || bank.per_dcpr)}
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
    </Box>
  );
}
