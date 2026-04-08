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
import ExportButtons from "./ExportButtons";

const TRANSACTION_TYPES = [
  { value: "", label: "All Types" },
  { value: "collections", label: "Collections" },
  { value: "deposit", label: "Deposit" },
  { value: "disbursement", label: "Disbursement" },
  { value: "fund_transfer", label: "Fund Transfer" },
  { value: "interbank_transfer", label: "Interbank Transfer" },
  { value: "adjustments", label: "Adjustments" },
  { value: "bank_charges", label: "Bank Charges" },
  { value: "returned_check", label: "Returned Check" },
];

export default function AdminTransactions() {
  const { showToast } = useToast();
  const [transactions, setTransactions] = useState([]);
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [bankFilter, setBankFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [formData, setFormData] = useState({ 
    bank_account: "", 
    date: "", 
    type: "collections", 
    amount: "", 
    description: "" 
  });
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const breadcrumbs = [
    { label: "Home", href: "/admin/home" },
    { label: "Transactions" },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [txRes, bankRes] = await Promise.all([
        api.get("/api/transactions-crud/"),
        api.get("/api/bankaccounts/"),
      ]);
      setTransactions(txRes.data.results || txRes.data);
      setBanks(bankRes.data.results || bankRes.data);
    } catch (err) {
      console.error("Failed to fetch data", err);
      showToast("Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = !search || 
      t.description?.toLowerCase().includes(search.toLowerCase()) ||
      t.type?.toLowerCase().includes(search.toLowerCase()) ||
      String(t.amount).includes(search);
    const matchesType = !typeFilter || t.type === typeFilter;
    const matchesBank = !bankFilter || bankFilter === "" || t.bank_account?.id === parseInt(bankFilter) || t.bank_account === parseInt(bankFilter);
    const matchesDateFrom = !dateFrom || t.date >= dateFrom;
    const matchesDateTo = !dateTo || t.date <= dateTo;
    return matchesSearch && matchesType && matchesBank && matchesDateFrom && matchesDateTo;
  });

  const getTypeColor = (type) => {
    const colors = {
      collections: "#dcfce7",
      deposit: "#dbeafe",
      disbursement: "#fee2e2",
      fund_transfer: "#f3e8ff",
      interbank_transfer: "#f3e8ff",
      adjustments: "#fce7f3",
      bank_charges: "#f1f5f9",
      returned_check: "#fee2e2",
    };
    return colors[type] || "#f1f5f9";
  };

  const getTypeTextColor = (type) => {
    const colors = {
      collections: "#166534",
      deposit: "#1e40af",
      disbursement: "#991b1b",
      fund_transfer: "#6b21a8",
      interbank_transfer: "#6b21a8",
      adjustments: "#9d174d",
      bank_charges: "#475569",
      returned_check: "#991b1b",
    };
    return colors[type] || "#475569";
  };

  const handleOpenDialog = (transaction = null) => {
    if (transaction) {
      setIsEditing(true);
      setSelectedTransaction(transaction);
      const bankId = transaction.bank_account?.id || transaction.bank_account;
      setFormData({
        bank_account: bankId,
        date: transaction.date,
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description || "",
      });
    } else {
      setIsEditing(false);
      setSelectedTransaction(null);
      const today = new Date();
      const localDate = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, "0") + "-" + String(today.getDate()).padStart(2, "0");
      setFormData({ bank_account: "", date: localDate, type: "collections", amount: "", description: "" });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.bank_account || !formData.date || !formData.amount) {
      showToast("Please fill all required fields", "error");
      return;
    }

    setSaving(true);
    try {
      if (isEditing) {
        await api.patch(`/api/transactions-crud/${selectedTransaction.id}/`, formData);
        showToast("Transaction updated successfully", "success");
      } else {
        await api.post("/api/transactions-crud/", formData);
        showToast("Transaction created successfully", "success");
      }
      setDialogOpen(false);
      fetchData();
    } catch (err) {
      console.error("Failed to save transaction", err);
      showToast(err.response?.data?.detail || "Failed to save transaction", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/api/transactions-crud/${selectedTransaction.id}/`);
      showToast("Transaction deleted successfully", "success");
      setDeleteDialogOpen(false);
      fetchData();
    } catch (err) {
      console.error("Failed to delete transaction", err);
      showToast("Failed to delete transaction", "error");
    }
  };

  const openDeleteDialog = (transaction) => {
    setSelectedTransaction(transaction);
    setDeleteDialogOpen(true);
  };

  const formatAmount = (amount) => {
    const num = parseFloat(amount);
    return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(num);
  };

  return (
    <AdminLayout title="Transactions" breadcrumbs={breadcrumbs}>
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
              <InputLabel>Type</InputLabel>
              <Select value={typeFilter} label="Type" onChange={(e) => setTypeFilter(e.target.value)}>
                {TRANSACTION_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Bank</InputLabel>
              <Select value={bankFilter} label="Bank" onChange={(e) => setBankFilter(e.target.value)}>
                <MenuItem value="">All Banks</MenuItem>
                {banks.map(b => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField
              size="small"
              type="date"
              label="From"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              sx={{ width: 140 }}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              size="small"
              type="date"
              label="To"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              sx={{ width: 140 }}
              InputLabelProps={{ shrink: true }}
            />
            <Box sx={{ flexGrow: 1 }} />
            <ExportButtons 
              data={filteredTransactions} 
              filename="transactions" 
              label="Export"
              columns={[
                { label: "ID", key: "id" },
                { label: "Date", key: "date" },
                { label: "Bank", key: "bank_account.name" },
                { label: "Type", key: "type" },
                { label: "Amount", key: "amount" },
                { label: "Description", key: "description" },
              ]}
            />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              sx={{ bgcolor: "#0ea5e9", "&:hover": { bgcolor: "#0284c7" } }}
            >
              Add Transaction
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
                  <TableCell sx={{ fontWeight: 600, bgcolor: "#f1f5f9" }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "#f1f5f9" }}>Bank</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "#f1f5f9" }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "#f1f5f9" }} align="right">Amount</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "#f1f5f9" }}>Description</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "#f1f5f9" }} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4, color: "#64748b" }}>No transactions found</TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((t) => (
                    <TableRow key={t.id} hover>
                      <TableCell sx={{ color: "#64748b" }}>{t.id}</TableCell>
                      <TableCell>{t.date}</TableCell>
                      <TableCell>{t.bank_account?.name || banks.find(b => b.id === t.bank_account)?.name || "-"}</TableCell>
                      <TableCell>
                        <Chip 
                          label={t.type?.replace(/_/g, " ").toUpperCase()} 
                          size="small"
                          sx={{ bgcolor: getTypeColor(t.type), color: getTypeTextColor(t.type), fontWeight: 500, fontSize: 11 }}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 500, fontFamily: "monospace" }}>
                        {formatAmount(t.amount)}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#64748b" }}>
                        {t.description || "-"}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => handleOpenDialog(t)} sx={{ color: "#64748b" }}><EditIcon fontSize="small" /></IconButton>
                        <IconButton size="small" onClick={() => openDeleteDialog(t)} sx={{ color: "#ef4444" }}><DeleteIcon fontSize="small" /></IconButton>
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
          {isEditing ? "Edit Transaction" : "Add Transaction"}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <FormControl fullWidth required>
              <InputLabel>Bank</InputLabel>
              <Select value={formData.bank_account} label="Bank" onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}>
                {banks.map(b => <MenuItem key={b.id} value={b.id}>{b.name} ({b.account_number})</MenuItem>)}
              </Select>
            </FormControl>
            <TextField
              label="Date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
            />
            <FormControl fullWidth required>
              <InputLabel>Type</InputLabel>
              <Select value={formData.type} label="Type" onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                {TRANSACTION_TYPES.filter(t => t.value).map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField
              label="Amount"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              fullWidth
              required
              inputProps={{ step: "0.01" }}
            />
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
          <Typography>Are you sure you want to delete this transaction?</Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} sx={{ color: "#64748b" }}>Cancel</Button>
          <Button onClick={handleDelete} variant="contained" color="error">Delete</Button>
        </DialogActions>
      </Dialog>
    </AdminLayout>
  );
}
