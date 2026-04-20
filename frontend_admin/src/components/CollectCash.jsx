// src/components/CollectCash.jsx
import React, { useState, useEffect } from "react";
import {
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  Stack,
  CircularProgress,
  IconButton,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tooltip,
  InputAdornment,
  Snackbar,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PaidIcon from "@mui/icons-material/Paid";
import api from "../services/tokenService";
import { useToast } from "../ToastContext";

export default function CollectCash() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    amount: "",
    description: "",
    date: today,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [collections, setCollections] = useState([]);
  const [collectionsLoading, setCollectionsLoading] = useState(true);
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [depositForm, setDepositForm] = useState({
    bank_account: "",
    deposit_date: new Date().toISOString().slice(0, 10),
  });
  const [depositLoading, setDepositLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Fetch collections data
  const fetchCollections = async () => {
    try {
      const res = await api.get("/api/collections/");
      const data = res.data?.results ?? res.data ?? [];
      setCollections(Array.isArray(data) ? data.slice(0, 10) : []); // Show last 10 collections
    } catch (err) {
      console.error("Error fetching collections:", err);
      setCollections([]);
    } finally {
      setCollectionsLoading(false);
    }
  };

  // Fetch bank accounts
  const fetchBankAccounts = async () => {
    try {
      const res = await api.get("/api/bankaccounts/");
      const data = res.data?.results ?? res.data ?? [];
      setBankAccounts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching bank accounts:", err);
      setBankAccounts([]);
    }
  };

  useEffect(() => {
    fetchCollections();
    fetchBankAccounts();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    if (!form.amount || Number(form.amount) <= 0) {
      setMessage({ type: "error", text: "Amount must be greater than 0." });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        amount: parseFloat(form.amount),
        status: "UNDEPOSITED",
        description: form.description?.trim() || "",
        date: form.date || null,
      };

      await api.post("/api/collections/", payload);

      const successText = `Successfully collected PHP ${parseFloat(form.amount).toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}!`;
      showToast(successText, "success");
      setMessage({ type: "success", text: successText });
      setSuccessMessage(successText);
      setShowSuccess(true);
      setForm({ amount: "", description: "", date: today });
      fetchCollections(); // Refresh collections list
      
      // Hide success message after 3 seconds
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to collect cash", err);
      let errMsg = "Failed to collect cash.";
      try {
        const data = err?.response?.data;
        if (data && typeof data === "object") {
          const details = Object.entries(data)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
            .join(" | ");
          if (details) errMsg += ` ${details}`;
        } else if (typeof err?.response?.data === "string") {
          errMsg += ` ${err.response.data}`;
        } else if (err?.message) {
          errMsg += ` ${err.message}`;
        }
      } catch {}
      showToast(errMsg, "error");
      setMessage({ type: "error", text: errMsg });
    } finally {
      setLoading(false);
    }
  };

  // Handle deposit modal
  const handleDepositClick = (collection) => {
    setSelectedCollection(collection);
    setDepositForm({
      bank_account: "",
      deposit_date: new Date().toISOString().slice(0, 10),
    });
    setDepositModalOpen(true);
  };

  const handleDepositFormChange = (e) => {
    const { name, value } = e.target;
    setDepositForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleDepositSubmit = async () => {
    if (!depositForm.bank_account) {
      showToast("Please select a bank account", "error");
      return;
    }

    setDepositLoading(true);
    try {
      // Update collection status to DEPOSITED
      await api.patch(`/api/collections/${selectedCollection.id}/`, {
        status: "DEPOSITED",
        bank_account: depositForm.bank_account,
        deposit_date: depositForm.deposit_date,
      });

      // Create a transaction record for the deposit
      await api.post("/transactions/", {
        amount: selectedCollection.amount,
        type: "deposit",
        description: `Deposit from collection: ${selectedCollection.description || "Cash collection"}`,
        bank_account_id: depositForm.bank_account,
        date: depositForm.deposit_date,
      });

      // Update bank balance using the new endpoint
      try {
        const balanceResponse = await api.post(`/api/bankaccounts/${depositForm.bank_account}/update_balance/`);
        console.log("Balance update debug info:", balanceResponse.data);
      } catch (balanceErr) {
        console.warn("Balance update failed, but deposit succeeded:", balanceErr);
        // Continue even if balance update fails - deposit is the important part
      }

      const depositSuccessText = `Successfully deposited PHP ${Number(selectedCollection.amount).toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} to ${bankAccounts.find(acc => acc.id === depositForm.bank_account)?.name || 'selected bank'}!`;
      showToast(depositSuccessText, "success");
      setDepositModalOpen(false);
      fetchCollections(); // Refresh collections list
    } catch (err) {
      console.error("Failed to deposit cash:", err);
      showToast("Failed to deposit cash. Please try again.", "error");
    } finally {
      setDepositLoading(false);
    }
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
                bgcolor: "#F1F5F9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <PaidIcon sx={{ color: "#475569", fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: "#1E293B" }}>
                Collect Cash
              </Typography>
              <Typography variant="body2" sx={{ color: "#6B7280" }}>
                Record cash collections
              </Typography>
            </Box>
          </Box>
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
      </Paper>

      {/* Form */}
      <Paper
        sx={{
          p: 4,
          borderRadius: 1,
          border: "1px solid",
          borderColor: "#E5E7EB",
          bgcolor: "#FFFFFF",
          maxWidth: 600,
          mx: "auto",
        }}
      >
        <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <TextField
            label="Amount (PHP)"
            name="amount"
            type="number"
            value={form.amount}
            onChange={handleChange}
            inputProps={{ min: 0, step: "0.01" }}
            required
            fullWidth
            InputProps={{
              startAdornment: <InputAdornment position="start">PHP</InputAdornment>,
            }}
            helperText="Enter the amount collected (e.g., 1500.00)"
            sx={{
              "& .MuiOutlinedInput-root": {
                "&:hover fieldset": { borderColor: "#D1D5DB" },
                "&.Mui-focused fieldset": { borderColor: "#3B82F6", borderWidth: 2 },
              },
            }}
          />

          <TextField
            label="Date Collected"
            name="date"
            type="date"
            value={form.date}
            onChange={handleChange}
            InputLabelProps={{ shrink: true }}
            fullWidth
            helperText="Select when the cash was collected (defaults to today)"
            sx={{
              "& .MuiOutlinedInput-root": {
                "&:hover fieldset": { borderColor: "#D1D5DB" },
                "&.Mui-focused fieldset": { borderColor: "#3B82F6", borderWidth: 2 },
              },
            }}
          />

          <TextField
            label="Note (optional)"
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="e.g., Cash payment from customer, Sales receipt #123"
            fullWidth
            multiline
            rows={2}
            helperText="Add a description to help identify this collection later"
            sx={{
              "& .MuiOutlinedInput-root": {
                "&:hover fieldset": { borderColor: "#D1D5DB" },
                "&.Mui-focused fieldset": { borderColor: "#3B82F6", borderWidth: 2 },
              },
            }}
          />

          {message && (
            <Alert severity={message.type} sx={{ mt: 1 }}>
              {message.text}
            </Alert>
          )}

          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            <Button
              type="submit"
              variant="contained"
              sx={{ 
                bgcolor: "#22c55e", 
                "&:hover": { bgcolor: "#16a34a" },
                px: 4,
                py: 1.5,
                fontWeight: 600,
              }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={18} /> : "Collect Cash"}
            </Button>
            <Button
              type="button"
              variant="outlined"
              onClick={() => navigate("/collections")}
              sx={{
                borderColor: "#E5E7EB",
                color: "#475569",
                "&:hover": { bgcolor: "#F3F4F6", borderColor: "#D1D5DB" },
              }}
            >
              View Collections
            </Button>
          </Stack>
        </Box>
      </Paper>

      {/* Collections Table */}
      <Paper
        sx={{
          mt: 3,
          borderRadius: 1,
          border: "1px solid",
          borderColor: "#E5E7EB",
          bgcolor: "#FFFFFF",
          overflow: "hidden",
        }}
      >
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: "#1E293B", mb: 2 }}>
            Recent Cash Collections
          </Typography>
          
          {collectionsLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
              <CircularProgress />
            </Box>
          ) : collections.length === 0 ? (
            <Box sx={{ textAlign: "center", p: 4 }}>
              <Typography variant="body2" sx={{ color: "#9CA3AF" }}>
                No collections found
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: "#F9FAFB" }}>
                    <TableCell sx={{ fontWeight: 600, color: "#374151", fontSize: "0.875rem" }}>
                      Amount
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: "#374151", fontSize: "0.875rem" }}>
                      Description
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: "#374151", fontSize: "0.875rem" }}>
                      Date
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: "#374151", fontSize: "0.875rem" }}>
                      Time
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: "#374151", fontSize: "0.875rem" }}>
                      Status
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: "#374151", fontSize: "0.875rem" }}>
                      Action
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {collections.map((collection, index) => (
                    <TableRow
                      key={collection.id}
                      sx={{
                        "&:hover": { bgcolor: "#F9FAFB" },
                        "&:last-child td, &:last-child th": { border: 0 },
                      }}
                    >
                      <TableCell sx={{ fontWeight: 500, color: "#1F2937" }}>
                        {`PHP ${Number(collection.amount || 0).toLocaleString("en-PH", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}`}
                      </TableCell>
                      <TableCell sx={{ color: "#6B7280" }}>
                        {collection.description || "No description"}
                      </TableCell>
                      <TableCell sx={{ color: "#6B7280" }}>
                        {collection.date ? new Date(collection.date).toLocaleDateString("en-PH") : "N/A"}
                      </TableCell>
                      <TableCell sx={{ color: "#6B7280" }}>
                        {collection.created_at ? new Date(collection.created_at).toLocaleTimeString("en-PH", {
                          hour: "2-digit",
                          minute: "2-digit",
                        }) : "N/A"}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={collection.status || "UNDEPOSITED"}
                          size="small"
                          sx={{
                            fontWeight: 500,
                            fontSize: "0.75rem",
                            bgcolor: collection.status === "DEPOSITED" ? "#D1FAE5" : "#FEF3C7",
                            color: collection.status === "DEPOSITED" ? "#065F46" : "#92400E",
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        {collection.status !== "DEPOSITED" ? (
                          <Tooltip 
                            title={`Deposit PHP ${Number(collection.amount || 0).toLocaleString("en-PH", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })} to bank account`}
                            arrow
                          >
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => handleDepositClick(collection)}
                              sx={{
                                borderColor: "#3B82F6",
                                color: "#3B82F6",
                                fontSize: "0.75rem",
                                fontWeight: 500,
                                px: 2,
                                py: 0.5,
                                "&:hover": {
                                  bgcolor: "#3B82F6",
                                  color: "white",
                                  borderColor: "#3B82F6",
                                },
                              }}
                            >
                              Deposit
                            </Button>
                          </Tooltip>
                        ) : (
                          <Tooltip title="This collection has already been deposited" arrow>
                            <Chip
                              label="Completed"
                              size="small"
                              sx={{
                                bgcolor: "#E5E7EB",
                                color: "#6B7280",
                                fontSize: "0.7rem",
                              }}
                            />
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </Paper>

      {/* Deposit Modal */}
      <Dialog open={depositModalOpen} onClose={() => setDepositModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 600, color: "#1E293B" }}>
          Deposit Cash Collection
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ mb: 3, p: 2, bgcolor: "#F9FAFB", borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontWeight: 600 }}>
              Collection Details:
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 500, color: "#1F2937" }}>
              Amount: {selectedCollection && `PHP ${Number(selectedCollection.amount || 0).toLocaleString("en-PH", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Description: {selectedCollection?.description || "No description"}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Collected on: {selectedCollection?.date ? new Date(selectedCollection.date).toLocaleDateString("en-PH") : "N/A"}
            </Typography>
          </Box>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="bank-account-label">Select Bank Account *</InputLabel>
            <Select
              labelId="bank-account-label"
              name="bank_account"
              value={depositForm.bank_account}
              onChange={handleDepositFormChange}
              label="Select Bank Account *"
              required
            >
              {bankAccounts.map((account) => (
                <MenuItem key={account.id} value={account.id}>
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {account.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {account.account_number}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Deposit Date *"
            name="deposit_date"
            type="date"
            value={depositForm.deposit_date}
            onChange={handleDepositFormChange}
            InputLabelProps={{ shrink: true }}
            fullWidth
            required
            helperText="When was this cash deposited to the bank?"
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button
            onClick={() => setDepositModalOpen(false)}
            sx={{
              borderColor: "#E5E7EB",
              color: "#475569",
              "&:hover": { bgcolor: "#F3F4F6", borderColor: "#D1D5DB" },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDepositSubmit}
            variant="contained"
            disabled={depositLoading}
            sx={{
              bgcolor: "#3B82F6",
              "&:hover": { bgcolor: "#2563EB" },
              px: 3,
            }}
          >
            {depositLoading ? <CircularProgress size={18} /> : "Deposit Cash"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}