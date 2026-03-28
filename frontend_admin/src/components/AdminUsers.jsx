import { useState, useEffect } from "react";
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  Typography, Chip, InputAdornment, CircularProgress, Switch, FormControlLabel
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AdminLayout from "./AdminLayout";
import api from "../services/tokenService";
import { useToast } from "../ToastContext";

export default function AdminUsers() {
  const { showToast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({ username: "", email: "", password: "", is_staff: false, is_superuser: false });
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const breadcrumbs = [
    { label: "Home", href: "/admin/home" },
    { label: "Users" },
  ];

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/users/");
      setUsers(res.data.results || res.data);
    } catch (err) {
      console.error("Failed to fetch users", err);
      showToast("Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenDialog = (user = null) => {
    if (user) {
      setIsEditing(true);
      setSelectedUser(user);
      setFormData({ 
        username: user.username, 
        email: user.email || "", 
        password: "", 
        is_staff: user.is_staff,
        is_superuser: user.is_superuser 
      });
    } else {
      setIsEditing(false);
      setSelectedUser(null);
      setFormData({ username: "", email: "", password: "", is_staff: false, is_superuser: false });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.username) {
      showToast("Username is required", "error");
      return;
    }
    if (!isEditing && !formData.password) {
      showToast("Password is required for new users", "error");
      return;
    }

    setSaving(true);
    try {
      if (isEditing) {
        const updateData = { 
          username: formData.username, 
          email: formData.email,
          is_staff: formData.is_staff,
          is_superuser: formData.is_superuser
        };
        if (formData.password) {
          updateData.password = formData.password;
        }
        await api.patch(`/api/users/${selectedUser.id}/`, updateData);
        showToast("User updated successfully", "success");
      } else {
        await api.post("/api/users/", formData);
        showToast("User created successfully", "success");
      }
      setDialogOpen(false);
      fetchUsers();
    } catch (err) {
      console.error("Failed to save user", err);
      showToast(err.response?.data?.detail || "Failed to save user", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/api/users/${selectedUser.id}/`);
      showToast("User deleted successfully", "success");
      setDeleteDialogOpen(false);
      fetchUsers();
    } catch (err) {
      console.error("Failed to delete user", err);
      showToast("Failed to delete user", "error");
    }
  };

  const openDeleteDialog = (user) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  return (
    <AdminLayout title="Users" breadcrumbs={breadcrumbs}>
      <Paper sx={{ width: "100%", overflow: "hidden" }}>
        <Box sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0" }}>
          <TextField
            size="small"
            placeholder="Search users..."
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
            Add User
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
                  <TableCell sx={{ fontWeight: 600, bgcolor: "#f1f5f9" }}>Username</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "#f1f5f9" }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "#f1f5f9" }}>Staff</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "#f1f5f9" }}>Superuser</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "#f1f5f9" }}>Date Joined</TableCell>
                  <TableCell sx={{ fontWeight: 600, bgcolor: "#f1f5f9" }} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4, color: "#64748b" }}>
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id} hover>
                      <TableCell sx={{ fontWeight: 500 }}>{user.username}</TableCell>
                      <TableCell>{user.email || "-"}</TableCell>
                      <TableCell>
                        <Chip 
                          label={user.is_staff ? "Yes" : "No"} 
                          size="small" 
                          sx={{ 
                            bgcolor: user.is_staff ? "#dbeafe" : "#f1f5f9",
                            color: user.is_staff ? "#1d4ed8" : "#64748b",
                            fontWeight: 500
                          }} 
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={user.is_superuser ? "Yes" : "No"} 
                          size="small" 
                          sx={{ 
                            bgcolor: user.is_superuser ? "#fef3c7" : "#f1f5f9",
                            color: user.is_superuser ? "#b45309" : "#64748b",
                            fontWeight: 500
                          }} 
                        />
                      </TableCell>
                      <TableCell sx={{ color: "#64748b" }}>
                        {user.date_joined ? new Date(user.date_joined).toLocaleDateString() : "-"}
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => handleOpenDialog(user)} sx={{ color: "#64748b" }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={() => openDeleteDialog(user)} sx={{ color: "#ef4444" }}>
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
          {isEditing ? "Edit User" : "Add User"}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField
              label="Username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              fullWidth
            />
            <TextField
              label={isEditing ? "Password (leave blank to keep current)" : "Password"}
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              fullWidth
              required={!isEditing}
            />
            <Box sx={{ display: "flex", gap: 3 }}>
              <FormControlLabel
                control={
                  <Switch 
                    checked={formData.is_staff} 
                    onChange={(e) => setFormData({ ...formData, is_staff: e.target.checked })}
                  />
                }
                label="Staff"
              />
              <FormControlLabel
                control={
                  <Switch 
                    checked={formData.is_superuser} 
                    onChange={(e) => setFormData({ ...formData, is_superuser: e.target.checked })}
                  />
                }
                label="Superuser"
              />
            </Box>
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
            Are you sure you want to delete user "<strong>{selectedUser?.username}</strong>"?
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
