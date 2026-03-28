import { useState, useEffect } from "react";
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  Typography, Chip, InputAdornment, CircularProgress
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AdminLayout from "./AdminLayout";
import api from "../services/tokenService";
import { useToast } from "../ToastContext";

export default function AdminBanks() {
  const { showToast } = useToast();
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState(null);
  const [formData, setFormData] = useState({ name: "", account_number: "", opening_balance: "0.00" });
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const breadcrumbs = [
    { label: "Home", href: "/admin" },
    { label: "Banks" },
  ];

  useEffect(() => {
    fetchBanks();
  }, []);

  const fetchBanks = async () => {
    setLoading(true);
    try {
      const res = await api.get("/bankaccounts/");
      setBanks(res.data.results || res.data);
    } catch (err) {
      console.error("Failed to fetch banks", err);
      showToast("Failed to load banks", "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredBanks = banks.filter(b => 
    b.name?.toLowerCase().includes(search.toLowerCase()) ||
    b.account_number?.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenDialog = (bank = null) => {
    if (bank) {
      setIsEditing(true);
      setSelectedBank(bank);
      setFormData({ name: bank.name, account_number: bank.account_number, opening_balance: bank.opening_balance });
    } else {
      setIsEditing(false);
      setSelectedBank(null);
      setFormData({ name: "", account_number: "", opening_balance: "0.00" });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.account_number) {
      showToast("Name and account number are required", "error");
      return;
    }

    setSaving(true);
    try {
      if (isEditing) {
        await api.patch(`/bankaccounts/${selectedBank.id}/`, formData);
        showToast("Bank updated successfully", "success");
      } else {
        await api.post("/bankaccounts/", formData);
        showToast("Bank created successfully", "success");
      }
      setDialogOpen(false);
      fetchBanks();
    } catch (err) {
      console.error("Failed to save bank", err);
      showToast(err.response?.data?.detail || "Failed to save bank", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/bankaccounts/${selectedBank.id}/`);
      showToast("Bank deleted successfully", "success");
      setDeleteDialogOpen(false);
      fetchBanks();
    } catch (err) {
      console.error("Failed to delete bank", err);
      showToast("Failed to delete bank", "error");
    }
  };

  const openDeleteDialog = (bank) => {
    setSelectedBank(bank);
    setDeleteDialogOpen(true);
  };

  const formatAmount = (amount) => {
    const num = parseFloat(amount || 0);
    return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(num);
  };

  return (
    <AdminLayout title="Banks" breadcrumbs={breadcrumbs}>
      <Paper sx={{ width: "100%", overflow: "hidden" }}>
        <Box sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0" }}>
          <TextField
            size="small"
            placeholder="Search banks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ width: 300 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "#64748b" }} />
                </InputAdornment>
              ),
            }}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{ bgcolor: "#0ea5e9", "&:hover": { bgcolor: "#0284c7" } }}
          >
            Add Bank
          </Button>
        </Box>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer sx={{ maxHeight: "calc(100vh - 250px)" }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "#f8fafc" }}>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "#f1f5f9" }}>ID</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "#f1f5f9" }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "#f1f5f9" }}>Account Number</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "#f1f5f9" }} align="right">Opening Balance</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "#f1f5f9" }}>Created</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "#f1f5f9" }} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredBanks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4, color: "#64748b" }}>
                      No banks found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBanks.map((bank) => (
                    <TableRow key={bank.id} hover>
                      <TableCell sx={{ color: "#64748b" }}>{bank.id}</TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>{bank.name}</TableCell>
                      <TableCell sx={{ fontFamily: "monospace" }}>{bank.account_number}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 500, fontFamily: "monospace" }}>
                        {formatAmount(bank.opening_balance)}
                      </TableCell>
                      <TableCell sx={{ color: "#64748b" }}>
                        {bank.created_at ? new Date(bank.created_at).toLocaleDateString() : "-"}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => handleOpenDialog(bank)} sx={{ color: "#64748b" }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => openDeleteDialog(bank)} sx={{ color: "#ef4444" }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ borderBottom: "1px solid #e2e8f0", fontWeight: 600 }}>
          {isEditing ? "Edit Bank" : "Add Bank"}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField
              label="Bank Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
              placeholder="e.g., BDO, BPI, PNB"
            />
            <TextField
              label="Account Number"
              value={formData.account_number}
              onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
              fullWidth
              required
              placeholder="e.g., 1234567890"
            />
            <TextField
              label="Opening Balance"
              type="number"
              value={formData.opening_balance}
              onChange={(e) => setFormData({ ...formData, opening_balance: e.target.value })}
              fullWidth
              inputProps={{ step: "0.01" }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: "1px solid #e2e8f0" }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ color: "#64748b" }}>Cancel</Button>
          <Button 
            onClick={handleSave} 
            variant="contained" 
            disabled={saving}
            sx={{ bgcolor: "#0ea5e9", "&:hover": { bgcolor: "#0284c7" } }}
          >
            {saving ? "Saving..." : isEditing ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle sx={{ fontWeight: 600 }}>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete bank "<strong>{selectedBank?.name}</strong>"?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} sx={{ color: "#64748b" }}>Cancel</Button>
          <Button onClick={handleDelete} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </AdminLayout>
  );
}
