import { useState, useEffect } from "react";
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  Typography, Chip, InputAdornment, CircularProgress, MenuItem, Select, FormControl, InputLabel
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AdminLayout from "./AdminLayout";
import api from "../services/tokenService";
import { useToast } from "../ToastContext";
import ExportButtons from "./ExportButtons";

export default function AdminCollections() {
  const { showToast } = useToast();
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [formData, setFormData] = useState({ amount: "", description: "", date: "", status: "" });
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const breadcrumbs = [
    { label: "Home", href: "/admin/home" },
    { label: "Collections" },
  ];

  useEffect(() => {
    fetchCollections();
  }, []);

  const fetchCollections = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/collections/");
      const data = res.data?.results ?? res.data ?? [];
      setCollections(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch collections", err);
      showToast("Failed to load collections", "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredCollections = collections.filter(c => {
    const matchesSearch = 
      c.description?.toLowerCase().includes(search.toLowerCase()) ||
      c.amount?.toString().includes(search) ||
      c.id?.toString().includes(search);
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenDialog = (collection) => {
    if (collection) {
      setIsEditing(true);
      setSelectedCollection(collection);
      setFormData({ 
        amount: collection.amount?.toString() || "",
        description: collection.description || "",
        date: collection.date || "",
        status: collection.status || ""
      });
    } else {
      setIsEditing(false);
      setSelectedCollection(null);
      setFormData({ amount: "", description: "", date: "", status: "" });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.amount || Number(formData.amount) <= 0) {
      showToast("Amount must be greater than 0", "error");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        amount: parseFloat(formData.amount),
        description: formData.description?.trim() || "",
        date: formData.date || null,
      };

      if (formData.status && formData.status !== selectedCollection.status) {
        payload.status = formData.status;
      }

      await api.patch(`/api/collections/${selectedCollection.id}/`, payload);
      showToast("Collection updated successfully", "success");
      setDialogOpen(false);
      fetchCollections();
    } catch (err) {
      console.error("Failed to save collection", err);
      showToast(err.response?.data?.detail || "Failed to save collection", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/api/collections/${selectedCollection.id}/`);
      showToast("Collection deleted successfully", "success");
      setDeleteDialogOpen(false);
      fetchCollections();
    } catch (err) {
      console.error("Failed to delete collection", err);
      showToast("Failed to delete collection", "error");
    }
  };

  const openDeleteDialog = (collection) => {
    setSelectedCollection(collection);
    setDeleteDialogOpen(true);
  };

  const formatAmount = (amount) => {
    const num = parseFloat(amount || 0);
    return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(num);
  };

  return (
    <AdminLayout title="Collections" breadcrumbs={breadcrumbs}>
      <Paper sx={{ width: "100%", overflow: "hidden" }}>
        <Box sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", flexWrap: "wrap", gap: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <TextField
              size="small"
              placeholder="Search collections..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ width: 250 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "#64748b" }} />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="UNDEPOSITED">Undeposited</MenuItem>
                <MenuItem value="DEPOSITED">Deposited</MenuItem>
              </Select>
            </FormControl>
            <ExportButtons 
              data={filteredCollections} 
              filename="collections" 
              label="Export"
              columns={[
                { label: "ID", key: "id" },
                { label: "Amount", key: "amount" },
                { label: "Description", key: "description" },
                { label: "Date", key: "date" },
                { label: "Status", key: "status" },
                { label: "Created At", key: "created_at" },
              ]}
            />
          </Box>
        </Box>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer sx={{ maxHeight: "calc(100vh - 280px)" }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "#f8fafc" }}>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "#f1f5f9" }}>ID</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "#f1f5f9" }} align="right">Amount</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "#f1f5f9" }}>Description</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "#f1f5f9" }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "#f1f5f9" }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "#f1f5f9" }}>Created At</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "#f1f5f9" }} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCollections.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4, color: "#64748b" }}>
                      No collections found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCollections.map((collection) => (
                    <TableRow key={collection.id} hover>
                      <TableCell sx={{ color: "#64748b" }}>{collection.id}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 500, fontFamily: "monospace" }}>
                        {formatAmount(collection.amount)}
                      </TableCell>
                      <TableCell sx={{ color: "#374151", maxWidth: 200 }}>
                        {collection.description || <Typography component="span" sx={{ color: "#9CA3AF", fontStyle: "italic" }}>No description</Typography>}
                      </TableCell>
                      <TableCell sx={{ color: "#64748b" }}>
                        {collection.date ? new Date(collection.date).toLocaleDateString("en-PH") : "-"}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={collection.status || "UNDEPOSITED"}
                          size="small"
                          sx={{
                            fontWeight: 500,
                            fontSize: "0.7rem",
                            bgcolor: collection.status === "DEPOSITED" ? "#D1FAE5" : "#FEF3C7",
                            color: collection.status === "DEPOSITED" ? "#065F46" : "#92400E",
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ color: "#64748b" }}>
                        {collection.created_at ? new Date(collection.created_at).toLocaleString("en-PH", {
                          month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit"
                        }) : "-"}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => handleOpenDialog(collection)} sx={{ color: "#0ea5e9" }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => openDeleteDialog(collection)} sx={{ color: "#ef4444" }}>
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

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ borderBottom: "1px solid #e2e8f0", fontWeight: 600 }}>
          Edit Collection
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              ID: {selectedCollection?.id}
            </Typography>
            <TextField
              label="Amount (PHP)"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              type="number"
              fullWidth
              required
              inputProps={{ step: "0.01", min: 0 }}
            />
            <TextField
              label="Date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status}
                label="Status"
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <MenuItem value="UNDEPOSITED">Undeposited</MenuItem>
                <MenuItem value="DEPOSITED">Deposited</MenuItem>
              </Select>
            </FormControl>
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
            {saving ? "Saving..." : "Update"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle sx={{ fontWeight: 600 }}>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this collection of <strong>{selectedCollection && formatAmount(selectedCollection.amount)}</strong>?
            <br />
            <Typography component="span" sx={{ color: "#ef4444", fontSize: "0.875rem" }}>
              This action cannot be undone.
            </Typography>
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