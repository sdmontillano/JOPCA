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

const PDC_STATUSES = [
  { value: "", label: "All Statuses" },
  { value: "on_hand", label: "On Hand" },
  { value: "matured", label: "Matured" },
  { value: "deposited", label: "Deposited" },
  { value: "returned", label: "Returned" },
];

export default function AdminPdc() {
  const { showToast } = useToast();
  const [pdcs, setPdcs] = useState([]);
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPdc, setSelectedPdc] = useState(null);
  const [formData, setFormData] = useState({
    check_number: "",
    date_received: "",
    maturity_date: "",
    bank_account: "",
    check_from: "",
    amount: "",
    status: "on_hand",
    remarks: ""
  });
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const breadcrumbs = [
    { label: "Home", href: "/admin/home" },
    { label: "PDC" },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pdcRes, bankRes] = await Promise.all([
        api.get("/api/pdc/"),
        api.get("/api/bankaccounts/"),
      ]);
      setPdcs(pdcRes.data.results || pdcRes.data);
      setBanks(bankRes.data.results || bankRes.data);
    } catch (err) {
      console.error("Failed to fetch data", err);
      showToast("Failed to load PDC data", "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredPdcs = pdcs.filter(p => {
    const matchesSearch = !search ||
      p.check_number?.toLowerCase().includes(search.toLowerCase()) ||
      p.check_from?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    const colors = {
      on_hand: "#fef3c7",
      matured: "#dbeafe",
      deposited: "#dcfce7",
      returned: "#fee2e2",
    };
    return colors[status] || "#f1f5f9";
  };

  const getStatusTextColor = (status) => {
    const colors = {
      on_hand: "#92400e",
      matured: "#1e40af",
      deposited: "#166534",
      returned: "#991b1b",
    };
    return colors[status] || "#475569";
  };

  const handleOpenDialog = (pdc = null) => {
    if (pdc) {
      setIsEditing(true);
      setSelectedPdc(pdc);
      setFormData({
        check_number: pdc.check_number,
        date_received: pdc.date_received,
        maturity_date: pdc.maturity_date,
        bank_account: pdc.bank_account || "",
        check_from: pdc.check_from,
        amount: pdc.amount,
        status: pdc.status,
        remarks: pdc.remarks || ""
      });
    } else {
      setIsEditing(false);
      setSelectedPdc(null);
      setFormData({
        check_number: "",
        date_received: new Date().toISOString().split("T")[0],
        maturity_date: "",
        bank_account: "",
        check_from: "",
        amount: "",
        status: "on_hand",
        remarks: ""
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.check_number || !formData.date_received || !formData.amount) {
      showToast("Check number, date received, and amount are required", "error");
      return;
    }

    setSaving(true);
    try {
      if (isEditing) {
        await api.patch(`/api/pdc/${selectedPdc.id}/`, formData);
        showToast("PDC updated successfully", "success");
      } else {
        await api.post("/api/pdc/", formData);
        showToast("PDC created successfully", "success");
      }
      setDialogOpen(false);
      fetchData();
    } catch (err) {
      console.error("Failed to save PDC", err);
      showToast(err.response?.data?.detail || "Failed to save PDC", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/api/pdc/${selectedPdc.id}/`);
      showToast("PDC deleted successfully", "success");
      setDeleteDialogOpen(false);
      fetchData();
    } catch (err) {
      console.error("Failed to delete PDC", err);
      showToast("Failed to delete PDC", "error");
    }
  };

  const openDeleteDialog = (pdc) => {
    setSelectedPdc(pdc);
    setDeleteDialogOpen(true);
  };

  const formatAmount = (amount) => {
    const num = parseFloat(amount);
    return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(num);
  };

  return (
    <AdminLayout title="Post-Dated Checks (PDC)" breadcrumbs={breadcrumbs}>
      <Paper sx={{ width: "100%", overflow: "hidden" }}>
        <Box sx={{ p: 2, borderBottom: "1px solid #e2e8f0" }}>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
            <TextField
              size="small"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ width: 200 }}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: "#64748b", fontSize: 20 }} /></InputAdornment>,
              }}
            />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select value={statusFilter} label="Status" onChange={(e) => setStatusFilter(e.target.value)}>
                {PDC_STATUSES.map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
              </Select>
            </FormControl>
            <Box sx={{ flexGrow: 1 }} />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              sx={{ bgcolor: "#0ea5e9", "&:hover": { bgcolor: "#0284c7" } }}
            >
              Add PDC
            </Button>
          </Box>
        </Box>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}><CircularProgress /></Box>
        ) : (
          <TableContainer sx={{ maxHeight: "calc(100vh - 250px)" }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "#f8fafc" }}>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "#f1f5f9" }}>ID</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "#f1f5f9" }}>Check #</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "#f1f5f9" }}>Check From</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "#f1f5f9" }}>Bank</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "#f1f5f9" }} align="right">Amount</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "#f1f5f9" }}>Date Received</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "#f1f5f9" }}>Maturity Date</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "#f1f5f9" }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "#f1f5f9" }} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredPdcs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4, color: "#64748b" }}>No PDCs found</TableCell>
                  </TableRow>
                ) : (
                  filteredPdcs.map((pdc) => (
                    <TableRow key={pdc.id} hover>
                      <TableCell sx={{ color: "#64748b" }}>{pdc.id}</TableCell>
                      <TableCell sx={{ fontWeight: 500, fontFamily: "monospace" }}>{pdc.check_number}</TableCell>
                      <TableCell>{pdc.check_from || "-"}</TableCell>
                      <TableCell>{banks.find(b => b.id === pdc.bank_account)?.name || "-"}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 500, fontFamily: "monospace" }}>
                        {formatAmount(pdc.amount)}
                      </TableCell>
                      <TableCell>{pdc.date_received}</TableCell>
                      <TableCell>{pdc.maturity_date || "-"}</TableCell>
                      <TableCell>
                        <Chip 
                          label={pdc.status?.replace(/_/g, " ").toUpperCase()} 
                          size="small"
                          sx={{ bgcolor: getStatusColor(pdc.status), color: getStatusTextColor(pdc.status), fontWeight: 500, fontSize: 11 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => handleOpenDialog(pdc)} sx={{ color: "#64748b" }}><EditIcon fontSize="small" /></IconButton>
                        <IconButton size="small" onClick={() => openDeleteDialog(pdc)} sx={{ color: "#ef4444" }}><DeleteIcon fontSize="small" /></IconButton>
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
          {isEditing ? "Edit PDC" : "Add PDC"}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField
              label="Check Number"
              value={formData.check_number}
              onChange={(e) => setFormData({ ...formData, check_number: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Check From (Payer)"
              value={formData.check_from}
              onChange={(e) => setFormData({ ...formData, check_from: e.target.value })}
              fullWidth
            />
            <TextField
              label="Amount"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              fullWidth
              required
              inputProps={{ step: "0.01" }}
            />
            <FormControl fullWidth>
              <InputLabel>Bank</InputLabel>
              <Select value={formData.bank_account} label="Bank" onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}>
                <MenuItem value="">Select Bank</MenuItem>
                {banks.map(b => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField
              label="Date Received"
              type="date"
              value={formData.date_received}
              onChange={(e) => setFormData({ ...formData, date_received: e.target.value })}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Maturity Date"
              type="date"
              value={formData.maturity_date}
              onChange={(e) => setFormData({ ...formData, maturity_date: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select value={formData.status} label="Status" onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                <MenuItem value="on_hand">On Hand</MenuItem>
                <MenuItem value="matured">Matured</MenuItem>
                <MenuItem value="deposited">Deposited</MenuItem>
                <MenuItem value="returned">Returned</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Remarks"
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: "1px solid #e2e8f0" }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ color: "#64748b" }}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving} sx={{ bgcolor: "#0ea5e9", "&:hover": { bgcolor: "#0284c7" } }}>
            {saving ? "Saving..." : isEditing ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle sx={{ fontWeight: 600 }}>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this PDC?</Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} sx={{ color: "#64748b" }}>Cancel</Button>
          <Button onClick={handleDelete} variant="contained" color="error">Delete</Button>
        </DialogActions>
      </Dialog>
    </AdminLayout>
  );
}
