// src/components/ChangePassword.jsx
import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import api from '../services/tokenService';
import { useToast } from '../ToastContext';

export default function ChangePassword() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (form.new_password !== form.confirm_password) {
      setError('New password and confirmation do not match.');
      return;
    }

    if (form.new_password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/change-password/', form);
      showToast("Password changed successfully!", "success");
      setSuccess('Password changed successfully!');
      setForm({ current_password: '', new_password: '', confirm_password: '' });
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Failed to change password';
      showToast(msg, "error");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 500, mx: 'auto' }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom fontWeight="bold">
          Change Password
        </Typography>
        <Divider sx={{ mb: 3 }} />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Current Password"
            name="current_password"
            type="password"
            value={form.current_password}
            onChange={handleChange}
            required
            sx={{ mb: 2 }}
            autoComplete="current-password"
          />

          <TextField
            fullWidth
            label="New Password"
            name="new_password"
            type="password"
            value={form.new_password}
            onChange={handleChange}
            required
            sx={{ mb: 2 }}
            autoComplete="new-password"
            helperText="Minimum 8 characters"
          />

          <TextField
            fullWidth
            label="Confirm New Password"
            name="confirm_password"
            type="password"
            value={form.confirm_password}
            onChange={handleChange}
            required
            sx={{ mb: 3 }}
            autoComplete="new-password"
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={() => navigate('/dashboard')}
              sx={{ flex: 1 }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              sx={{ flex: 1 }}
            >
              {loading ? <CircularProgress size={24} /> : 'Change Password'}
            </Button>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}
