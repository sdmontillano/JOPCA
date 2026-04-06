import { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableHead, TableBody, TableRow, TableCell, TextField, Alert,
  CircularProgress, Chip, IconButton
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../services/tokenService';
import { useToast } from '../ToastContext';

const formatPeso = (amount) => {
  return `₱${Number(amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const CashCountPage = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPcf, setSelectedPcf] = useState(null);
  const [actualCount, setActualCount] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const fetchSummary = useCallback(() => {
    setLoading(true);
    api.get('/summary/cash-counts/')
      .then((res) => {
        const data = res.data || res;
        setSummary(data.summary || []);
      })
      .catch((err) => {
        const msg = err?.response?.data?.detail || err?.message || "Failed to load summary";
        setError(String(msg));
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const handleOpenDialog = (pcf) => {
    setSelectedPcf(pcf);
    setActualCount('');
    setNotes('');
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedPcf(null);
  };

  const handleSubmit = () => {
    if (!actualCount || isNaN(parseFloat(actualCount))) {
      return;
    }

    setSaving(true);
    api.post('/cash-counts/', {
      pcf: selectedPcf.pcf_id,
      count_date: new Date().toISOString().split('T')[0],
      actual_count: parseFloat(actualCount),
      notes: notes
    })
      .then(() => {
        showToast("Cash count submitted successfully!", "success");
        handleCloseDialog();
        fetchSummary();
      })
      .catch((err) => {
        const msg = err?.response?.data?.detail || err?.message || "Failed to save cash count";
        showToast(msg, "error");
        setError(String(msg));
        setSaving(false);
      });
  };

  if (loading) {
    return <CircularProgress sx={{ m: 3 }} />;
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h4" fontWeight="bold">
            Cash Count Verification
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button startIcon={<RefreshIcon />} onClick={fetchSummary} variant="outlined">
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/dashboard')}
            sx={{
              borderColor: "#E5E7EB",
              color: "#475569",
              "&:hover": { bgcolor: "#F3F4F6", borderColor: "#D1D5DB" },
            }}
          >
            Back
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ mb: 3, p: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Record physical cash counts to verify system balances. Variance indicates difference between actual count and system balance.
        </Typography>
      </Paper>

      <Table>
        <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold' }}>PCF Name</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>Location</TableCell>
            <TableCell align="right" sx={{ fontWeight: 'bold' }}>System Balance</TableCell>
            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Last Count</TableCell>
            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actual Count</TableCell>
            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Variance</TableCell>
            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Status</TableCell>
            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Action</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {summary.map((pcf) => (
            <TableRow key={pcf.pcf_id}>
              <TableCell>{pcf.pcf_name}</TableCell>
              <TableCell>{pcf.location_display}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                {formatPeso(pcf.system_balance)}
              </TableCell>
              <TableCell align="right">
                {pcf.last_count_date 
                  ? new Date(pcf.last_count_date).toLocaleDateString('en-PH')
                  : 'Never'}
              </TableCell>
              <TableCell align="right">
                {pcf.last_actual_count !== null 
                  ? formatPeso(pcf.last_actual_count)
                  : '-'}
              </TableCell>
              <TableCell align="right">
                {pcf.last_variance !== null && pcf.last_variance !== 0 ? (
                  <Typography 
                    component="span"
                    sx={{ 
                      color: pcf.last_variance > 0 ? 'green' : 'red',
                      fontWeight: 'bold'
                    }}
                  >
                    {pcf.last_variance > 0 ? '+' : ''}{formatPeso(pcf.last_variance)}
                  </Typography>
                ) : '-'}
              </TableCell>
              <TableCell align="center">
                {pcf.last_variance === null ? (
                  <Chip label="Not Verified" size="small" />
                ) : pcf.last_variance === 0 ? (
                  <Chip 
                    icon={<CheckIcon />} 
                    label="Matched" 
                    color="success" 
                    size="small" 
                  />
                ) : (
                  <Chip 
                    icon={<WarningIcon />} 
                    label="Variance" 
                    color="warning" 
                    size="small" 
                  />
                )}
              </TableCell>
              <TableCell align="center">
                <Button 
                  variant="outlined" 
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenDialog(pcf)}
                >
                  Count
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Add Cash Count Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          Record Cash Count - {selectedPcf?.pcf_name}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Location: {selectedPcf?.location_display}
            </Typography>
            
            <Paper sx={{ p: 2, mb: 3, bgcolor: '#f5f5f5' }}>
              <Typography variant="body2">System Balance</Typography>
              <Typography variant="h5" fontWeight="bold">
                {formatPeso(selectedPcf?.system_balance)}
              </Typography>
            </Paper>

            <TextField
              label="Actual Physical Count"
              type="number"
              value={actualCount}
              onChange={(e) => setActualCount(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
              autoFocus
            />

            {actualCount && !isNaN(parseFloat(actualCount)) && (
              <Paper sx={{ 
                p: 2, 
                mb: 2, 
                bgcolor: (parseFloat(actualCount) - selectedPcf?.system_balance) === 0 ? '#e8f5e9' : '#fff3e0'
              }}>
                <Typography variant="body2">
                  Variance: 
                  <Typography 
                    component="span"
                    sx={{ 
                      fontWeight: 'bold',
                      color: (parseFloat(actualCount) - selectedPcf?.system_balance) === 0 ? 'green' : 'orange'
                    }}
                  >
                    {parseFloat(actualCount) - selectedPcf?.system_balance > 0 ? '+' : ''}
                    {formatPeso(parseFloat(actualCount) - selectedPcf?.system_balance)}
                  </Typography>
                </Typography>
              </Paper>
            )}

            <TextField
              label="Notes (optional)"
              multiline
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleSubmit}
            disabled={!actualCount || isNaN(parseFloat(actualCount)) || saving}
          >
            {saving ? 'Saving...' : 'Save Count'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CashCountPage;
