// src/components/AddPcfModal.jsx
import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  CircularProgress,
  Alert,
  MenuItem,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  Tabs,
  Tab,
  Box,
  Divider,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AddIcon from "@mui/icons-material/Add";
import api from "../services/tokenService";

export default function AddPcfModal({ open, onClose, onCreated = null }) {
  const today = new Date().toISOString().slice(0, 10);
  const [activeTab, setActiveTab] = useState(0); // 0 = Add Transaction, 1 = Create New

  const [form, setForm] = useState({
    pcf_name: "",
    existing_pcf: "",
    location: "",
    opening_balance: "",
    type: "disbursement",
    date: today,
    amount: "",
    description: "",
  });

  const [pcfFunds, setPcfFunds] = useState([]);
  const [selectedPcf, setSelectedPcf] = useState("");
  const [pcfBalance, setPcfBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchingPcf, setFetchingPcf] = useState(false);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    if (!open) return;
    setAlert(null);
    setForm((f) => ({ ...f, date: today }));
    fetchPcfFunds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const fetchPcfFunds = () => {
    let mounted = true;
    setFetchingPcf(true);
    api
      .get("/pcf/")
      .then((res) => {
        if (!mounted) return;
        const data = res?.data?.results ?? res?.data ?? [];
        setPcfFunds(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.error("Failed to fetch PCF funds", err);
        setPcfFunds([]);
      })
      .finally(() => {
        if (!mounted) return;
        setFetchingPcf(false);
      });
    return () => {
      mounted = false;
    };
  };

  // Fetch PCF current balance when selected
  useEffect(() => {
    if (!selectedPcf) {
      setPcfBalance(null);
      return;
    }
    
    api
      .get(`/pcf/${selectedPcf}/balance/`)
      .then((res) => {
        setPcfBalance(res.data);
      })
      .catch((err) => {
        console.error("Failed to fetch PCF balance", err);
        // Fallback to local data
        const pcf = pcfFunds.find((p) => p.id === parseInt(selectedPcf));
        if (pcf) {
          setPcfBalance({
            ...pcf,
            current_balance: pcf.opening_balance || 0
          });
        }
      });
  }, [selectedPcf]);

  const resetForm = () => {
    setForm({
      pcf_name: "",
      existing_pcf: "",
      location: "",
      opening_balance: "",
      type: "disbursement",
      date: today,
      amount: "",
      description: "",
    });
    setSelectedPcf("");
    setPcfBalance(null);
  };

  const handleClose = () => {
    resetForm();
    setAlert(null);
    setActiveTab(0);
    if (typeof onClose === "function") onClose();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlert(null);
    setLoading(true);

    try {
      if (activeTab === 1) {
        // Create New PCF or Add to Existing
        if (form.existing_pcf) {
          // Add balance to existing PCF
          const selectedPcfObj = pcfFunds.find(p => p.id === parseInt(form.existing_pcf));
          if (!selectedPcfObj) {
            setAlert({ type: "error", text: "Selected PCF not found." });
            setLoading(false);
            return;
          }
          
          if (!form.opening_balance || Number(form.opening_balance) <= 0) {
            setAlert({ type: "error", text: "Please enter an amount to add." });
            setLoading(false);
            return;
          }

          await api.post(`/pcf/${form.existing_pcf}/add_balance/`, {
            amount: Number(form.opening_balance)
          });

          setAlert({ type: "success", text: `₱${Number(form.opening_balance).toLocaleString()} added to ${selectedPcfObj.name}!` });
          resetForm();
          fetchPcfFunds();

          if (typeof onCreated === "function") {
            try { onCreated(); } catch (err) { console.error("onCreated callback error", err); }
          }
          
          setTimeout(() => { handleClose(); }, 700);
          setLoading(false);
          return;
        }

        // Create New PCF
        if (!form.pcf_name.trim()) {
          setAlert({ type: "error", text: "PCF Name is required." });
          setLoading(false);
          return;
        }
        if (!form.location) {
          setAlert({ type: "error", text: "Location is required." });
          setLoading(false);
          return;
        }

        const pcfPayload = {
          name: form.pcf_name.trim(),
          location: form.location,
          opening_balance: Number(form.opening_balance) || 0,
        };

        await api.post("/pcf/", pcfPayload);

        setAlert({ type: "success", text: "PCF created successfully!" });
        resetForm();
        setActiveTab(0);
        fetchPcfFunds();

        if (typeof onCreated === "function") {
          try { onCreated(); } catch (err) { console.error("onCreated callback error", err); }
        }
      } else {
        // Add Transaction to Existing PCF
        if (!selectedPcf) {
          setAlert({ type: "error", text: "Please select a PCF fund." });
          setLoading(false);
          return;
        }
        if (!form.amount || Number(form.amount) <= 0) {
          setAlert({ type: "error", text: "Amount must be greater than 0." });
          setLoading(false);
          return;
        }

        const txnPayload = {
          pcf_id: Number(selectedPcf),
          type: form.type,
          date: form.date,
          amount: Number(form.amount),
          description: form.description?.trim() || null,
        };

        await api.post("/pcf-transactions/", txnPayload);

        setAlert({ type: "success", text: "PCF transaction added successfully!" });
        resetForm();

        if (typeof onCreated === "function") {
          try {
            onCreated();
          } catch (err) {
            console.error("onCreated callback error", err);
          }
        }

        setTimeout(() => {
          handleClose();
        }, 700);
      }
    } catch (err) {
      console.error("Failed to create/transaction", err);
      const data = err?.response?.data;
      let errMsg = "Failed to process request.";
      if (data) {
        if (typeof data === "string") {
          errMsg = data;
        } else if (Array.isArray(data)) {
          errMsg = data.join(" ");
        } else if (typeof data === "object") {
          const msgs = Object.values(data).flat().join(" ");
          errMsg = msgs || errMsg;
        }
      }
      setAlert({ type: "error", text: errMsg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={Boolean(open)}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      BackdropProps={{
        sx: {
          backgroundColor: "rgba(0,0,0,0.35)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
        },
      }}
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Petty Cash Fund</span>
        <IconButton onClick={handleClose} size="small" aria-label="close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Tabs value={activeTab} onChange={(e, v) => { setActiveTab(v); setAlert(null); }} sx={{ mb: 2 }}>
          <Tab label="Add Transaction" />
          <Tab label="Create / Add Balance" />
        </Tabs>

        <form id="pcf-form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            {alert && <Alert severity={alert.type}>{alert.text}</Alert>}

            {activeTab === 0 ? (
              // Add Transaction Tab
              <>
                <FormControl fullWidth required>
                  <InputLabel>Select PCF Fund</InputLabel>
                  <Select
                    name="selectedPcf"
                    value={selectedPcf}
                    onChange={(e) => setSelectedPcf(e.target.value)}
                    label="Select PCF Fund"
                  >
                    {fetchingPcf ? (
                      <MenuItem value="" disabled>Loading...</MenuItem>
                    ) : pcfFunds.length === 0 ? (
                      <MenuItem value="" disabled>No PCF funds available. Create one first.</MenuItem>
                    ) : (
                      pcfFunds.map((pf) => (
                        <MenuItem key={pf.id} value={pf.id}>
                          {pf.name} {pf.location ? `(${pf.location})` : ""}
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>

                {pcfBalance && (
                  <Alert severity="info" sx={{ py: 0.5 }}>
                    <div>Available Balance: <strong>₱{Number(pcfBalance.available_balance ?? pcfBalance.current_balance ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</strong></div>
                    {pcfBalance.disbursements > 0 && (
                      <div>Total Disbursements: ₱{Number(pcfBalance.disbursements || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</div>
                    )}
                    {pcfBalance.unreplenished > 0 && (
                      <div style={{ color: '#ed6c02', fontWeight: 600 }}>Unreplenished Fund (Company): ₱{Number(pcfBalance.unreplenished || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</div>
                    )}
                  </Alert>
                )}

                <FormControl fullWidth>
                  <InputLabel>Transaction Type</InputLabel>
                  <Select
                    name="type"
                    value={form.type}
                    onChange={handleChange}
                    label="Transaction Type"
                  >
                    <MenuItem value="disbursement">
                      <Box>
                        <Typography>Disbursement</Typography>
                        <Typography variant="caption" color="text.secondary">Your personal expense - reduces PCF balance</Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="unreplenished">
                      <Box>
                        <Typography>Unreplenished Fund</Typography>
                        <Typography variant="caption" color="warning.main">Company money used - tracked separately, does NOT reduce balance</Typography>
                      </Box>
                    </MenuItem>
                    <MenuItem value="replenishment">
                      <Box>
                        <Typography>Replenishment</Typography>
                        <Typography variant="caption" color="text.secondary">Add money back to PCF</Typography>
                      </Box>
                    </MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  label="Date"
                  name="date"
                  type="date"
                  value={form.date}
                  onChange={handleChange}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                  required
                />

                <TextField
                  label="Amount (₱)"
                  name="amount"
                  type="number"
                  inputProps={{ step: "0.01", min: 0 }}
                  value={form.amount}
                  onChange={handleChange}
                  fullWidth
                  required
                />

                <TextField
                  label="Description (optional)"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  fullWidth
                  multiline
                  minRows={2}
                />

                <Button
                  variant="text"
                  size="small"
                  onClick={() => setActiveTab(1)}
                  startIcon={<AddIcon />}
                >
                  Create New PCF Instead
                </Button>
              </>
            ) : (
              // Create New PCF Tab
              <>
                <Typography variant="body2" color="text.secondary">
                  Create a new Petty Cash Fund with an initial balance.
                </Typography>

                {pcfFunds.length > 0 && (
                  <FormControl fullWidth size="small">
                    <InputLabel>Or select existing PCF to add balance</InputLabel>
                    <Select
                      name="existing_pcf"
                      value={form.existing_pcf || ""}
                      onChange={(e) => {
                        if (!e.target.value) {
                          // Clear selection - reset to new PCF mode
                          setForm(p => ({
                            ...p,
                            existing_pcf: "",
                            pcf_name: "",
                            location: "",
                          }));
                        } else {
                          const selected = pcfFunds.find(p => p.id === parseInt(e.target.value));
                          if (selected) {
                            setForm(p => ({
                              ...p,
                              pcf_name: selected.name,
                              location: selected.location || "",
                              existing_pcf: e.target.value,
                            }));
                          }
                        }
                      }}
                      label="Or select existing PCF to add balance"
                    >
                      <MenuItem value=""><em>-- Select None (Create New) --</em></MenuItem>
                      {pcfFunds.map((pf) => (
                        <MenuItem key={pf.id} value={pf.id}>
                          {pf.name} {pf.location ? `(${pf.location})` : ""}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

                {form.existing_pcf && (
                  <Alert severity="info" sx={{ py: 0.5 }}>
                    Selected: <strong>{pcfFunds.find(p => p.id === parseInt(form.existing_pcf))?.name}</strong>
                    {' '}with opening balance of{' '}
                    <strong>₱{Number(pcfFunds.find(p => p.id === parseInt(form.existing_pcf))?.opening_balance || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}</strong>
                  </Alert>
                )}

                <TextField
                  label="PCF Name"
                  name="pcf_name"
                  value={form.pcf_name}
                  onChange={handleChange}
                  fullWidth
                  required
                  disabled={!!form.existing_pcf}
                  placeholder="e.g., PCF Office"
                  helperText={form.existing_pcf ? "Pre-filled from selected PCF" : "Enter new PCF name"}
                />

                <FormControl fullWidth required>
                  <InputLabel>Location</InputLabel>
                  <Select
                    name="location"
                    value={form.location}
                    onChange={handleChange}
                    label="Location"
                  >
                    <MenuItem value="office">Main Office</MenuItem>
                    <MenuItem value="quarry">Quarry</MenuItem>
                    <MenuItem value="tagoloan">Tagoloan Parts</MenuItem>
                    <MenuItem value="midsayap">Midsayap Parts</MenuItem>
                    <MenuItem value="valencia">Valencia Parts</MenuItem>
                    <MenuItem value="other">Other</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  label={form.existing_pcf ? "Amount to Add (₱)" : "Opening Balance (₱)"}
                  name="opening_balance"
                  type="number"
                  value={form.opening_balance}
                  onChange={handleChange}
                  inputProps={{ step: "0.01", min: 0 }}
                  fullWidth
                  required={!!form.existing_pcf}
                  helperText={form.existing_pcf ? "Enter amount to add to this PCF" : "Initial balance for new PCF (optional)"}
                />

                <Divider />

                <Button
                  variant="text"
                  size="small"
                  onClick={() => setActiveTab(0)}
                  startIcon={<AddIcon />}
                  disabled={pcfFunds.length === 0}
                >
                  {pcfFunds.length > 0 ? "Add Transaction to Existing PCF" : "No existing PCF, create new one"}
                </Button>
              </>
            )}
          </Stack>
        </form>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          type="submit"
          form="pcf-form"
          variant="contained"
          disabled={loading || (activeTab === 0 && pcfFunds.length === 0)}
        >
          {loading ? <CircularProgress size={18} /> : 
           activeTab === 0 ? "Add Transaction" : 
           form.existing_pcf ? "Add Balance" : "Create PCF"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
