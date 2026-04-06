import { useState, useEffect } from "react";
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  Typography, Chip, InputAdornment, CircularProgress, MenuItem, Select, FormControl, InputLabel
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AdminLayout from "./AdminLayout";
import api from "../services/tokenService";
import { useToast } from "../ToastContext";

const PCF_LOCATIONS = [
  { value: "office", label: "Office" },
  { value: "warehouse", label: "Warehouse" },
  { value: "store", label: "Store" },
];

export default function AdminPcf() {
  const { showToast } = useToast();
  const [pcfs, setPcfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPcf, setSelectedPcf] = useState(null);
  const [formData, setFormData] = useState({
    pcf_name: "",
    location: "office",
    fund_amount: "",
    responsible_person: ""
  });
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const breadcrumbs = [
    { label: "Home", href: "/admin/home" },
    { label: "PCF" },
  ];

  useEffect(() => {
    fetchPcfs();
  }, []);

  const fetchPcfs = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/pcf/");
      setPcfs(res.data.results || res.data);
    } catch (err) {
      console.error("Failed to fetch PCF", err);
      showToast("Failed to load PCF data", "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredPcfs = pcfs.filter(p => 
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    (p.note && p.note.toLowerCase().includes(search.toLowerCase()))
  );

  const handleOpenDialog = (pcf = null) => {
    if (pcf) {
      setIsEditing(true);
      setSelectedPcf(pcf);
      setFormData({
        pcf_name: pcf.name,
        location: pcf.location,
        fund_amount: pcf.opening_balance || pcf.current_balance || 0,
        responsible_person: pcf.note || ""
      });
    } else {
      setIsEditing(false);
      setSelectedPcf(null);
      setFormData({
        pcf_name: "",
        location: "office",
        fund_amount: "",
        responsible_person: ""
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.pcf_name || !formData.fund_amount) {
      showToast("PCF Name and Fund Amount are required", "error");
      return;
    }

    const payload = {
      name: formData.pcf_name,
      location: formData.location,
      opening_balance: parseFloat(formData.fund_amount) || 0,
      note: formData.responsible_person || ""
    };

    setSaving(true);
    try {
      if (isEditing) {
        await api.patch(`/api/pcf/${selectedPcf.id}/`, payload);
        showToast("PCF updated successfully", "success");
      } else {
        await api.post("/api/pcf/", payload);
        showToast("PCF created successfully", "success");
      }
      setDialogOpen(false);
      fetchPcfs();
    } catch (err) {
      console.error("Failed to save PCF", err);
      showToast(err.response?.data?.detail || "Failed to save PCF", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/api/pcf/${selectedPcf.id}/`);
      showToast("PCF deleted successfully", "success");
      setDeleteDialogOpen(false);
      fetchPcfs();
    } catch (err) {
      console.error("Failed to delete PCF", err);
      showToast("Failed to delete PCF", "error");
    }
  };

  const openDeleteDialog = (pcf) => {
    setSelectedPcf(pcf);
    setDeleteDialogOpen(true);
  };

  const formatAmount = (amount) => {
    const num = parseFloat(amount || 0);
    return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(isNaN(num) ? 0 : num);
  };

  return (
    <AdminLayout title="Petty Cash Funds (PCF)" breadcrumbs={breadcrumbs}>
      <Paper sx={{ width: "100%", overflow: "hidden" }}>
        <Box sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0" }}>
          <TextField
            size="small"
            placeholder="Search PCF..."
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
            Add PCF
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
                  <TableCell sx={{ fontWeight: 600, bgcolor: "#f1f5f9" }}>PCF Name</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "#f1f5f9" }}>Location</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "#f1f5f9" }}>Notes</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "#f1f5f9" }} align="right">Opening Balance</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "#f1f5f9" }} align="right">Current Balance</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "#f1f5f9" }}>Created</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "#f1f5f9" }} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredPcfs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4, color: "#64748b" }}>
                      No PCF records found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPcfs.map((pcf) => (
                    <TableRow key={pcf.id} hover>
                      <TableCell sx={{ color: "#64748b" }}>{pcf.id}</TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>{pcf.name}</TableCell>
                      <TableCell>
                        <Chip 
                          label={pcf.location_display || pcf.location?.toUpperCase()} 
                          size="small"
                          sx={{ bgcolor: "#e0f2fe", color: "#0369a1", fontWeight: 500, fontSize: 11 }}
                        />
                      </TableCell>
                      <TableCell>{pcf.note || "-"}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 500, fontFamily: "monospace" }}>
                        {formatAmount(pcf.opening_balance)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, fontFamily: "monospace", color: "#166534" }}>
                        {formatAmount(pcf.current_balance)}
                      </TableCell>
                      <TableCell sx={{ color: "#64748b" }}>
                        {pcf.created_at ? new Date(pcf.created_at).toLocaleDateString() : "-"}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => handleOpenDialog(pcf)} sx={{ color: "#64748b" }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => openDeleteDialog(pcf)} sx={{ color: "#ef4444" }}>
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
          {isEditing ? "Edit PCF" : "Add PCF"}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField
              label="PCF Name"
              value={formData.pcf_name}
              onChange={(e) => setFormData({ ...formData, pcf_name: e.target.value })}
              fullWidth
              required
              placeholder="e.g., Office PCF, Warehouse PCF"
            />
            <FormControl fullWidth required>
              <InputLabel>Location</InputLabel>
              <Select value={formData.location} label="Location" onChange={(e) => setFormData({ ...formData, location: e.target.value })}>
                {PCF_LOCATIONS.map(l => <MenuItem key={l.value} value={l.value}>{l.label}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField
              label="Fund Amount"
              type="number"
              value={formData.fund_amount}
              onChange={(e) => setFormData({ ...formData, fund_amount: e.target.value })}
              fullWidth
              required
              inputProps={{ step: "0.01" }}
            />
            <TextField
              label="Responsible Person"
              value={formData.responsible_person}
              onChange={(e) => setFormData({ ...formData, responsible_person: e.target.value })}
              fullWidth
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
            Are you sure you want to delete PCF "<strong>{selectedPcf?.name}</strong>"?
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
