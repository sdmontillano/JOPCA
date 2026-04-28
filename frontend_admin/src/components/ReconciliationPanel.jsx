import { useState, useEffect } from 'react';
import {
  Paper, Typography, Box, Collapse, IconButton,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  CircularProgress, Alert
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  AccountBalance as AccountBalanceIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';

import api from '../services/tokenService';

const formatPeso = (amount) => {
  if (amount === null || amount === undefined) return '₱0.00';
  return `₱${Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const ReconciliationPanel = ({ collapsed, onToggleCollapse }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchReconciliation = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/summary/bank-reconciliation/');
      setData(response.data || response);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!collapsed) {
      fetchReconciliation();
    }
  }, [collapsed]);

  const handleToggle = () => {
    onToggleCollapse(!collapsed);
  };

  return (
    <Paper sx={{ mb: 3, overflow: 'hidden' }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 2,
          cursor: 'pointer',
          bgcolor: 'primary.main',
          color: 'white',
          '&:hover': { bgcolor: 'primary.dark' }
        }}
        onClick={handleToggle}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AccountBalanceIcon />
          <Typography variant="h6" fontWeight="bold">
            Bank Reconciliation
          </Typography>
        </Box>
        <IconButton size="small" sx={{ color: 'white' }}>
          {collapsed ? <ExpandMoreIcon /> : <ExpandLessIcon />}
        </IconButton>
      </Box>

      <Collapse in={!collapsed}>
        <Box sx={{ p: 2 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : data ? (
            <Box>
              {/* Summary Cards */}
              <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                <Paper sx={{ p: 2, flex: 1, minWidth: 150, bgcolor: '#e3f2fd' }}>
                  <Typography variant="caption" color="text.secondary">
                    PCF Available Cash
                  </Typography>
                  <Typography variant="h6" fontWeight="bold" color="primary.main">
                    {formatPeso(data.pcf?.total_available)}
                  </Typography>
                </Paper>
                
                <Paper sx={{ p: 2, flex: 1, minWidth: 150, bgcolor: '#e8f5e9' }}>
                  <Typography variant="caption" color="text.secondary">
                    Cash in Bank
                  </Typography>
                  <Typography variant="h6" fontWeight="bold" color="success.main">
                    {formatPeso(data.bank?.total)}
                  </Typography>
                </Paper>
                
                <Paper sx={{ p: 2, flex: 1, minWidth: 150, bgcolor: '#fff3e0' }}>
                  <Typography variant="caption" color="text.secondary">
                    Unreplenished (Pending)
                  </Typography>
                  <Typography variant="h6" fontWeight="bold" sx={{ color: '#ed6c02' }}>
                    {formatPeso(data.pcf?.total_unreplenished)}
                  </Typography>
                </Paper>
                
                <Paper sx={{ 
                  p: 2, 
                  flex: 1, 
                  minWidth: 150, 
                  bgcolor: data.reconciliation?.is_balanced ? '#e8f5e9' : '#ffebee'
                }}>
                  <Typography variant="caption" color="text.secondary">
                    Variance
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="h6" fontWeight="bold" color={data.reconciliation?.is_balanced ? 'success.main' : 'error.main'}>
                      {formatPeso(data.reconciliation?.variance)}
                    </Typography>
                    {data.reconciliation?.is_balanced ? (
                      <CheckCircleIcon color="success" fontSize="small" />
                    ) : (
                      <WarningIcon color="error" fontSize="small" />
                    )}
                  </Box>
                </Paper>
              </Box>

              {/* Reconciliation Formula */}
              <Box sx={{ 
                p: 2, 
                bgcolor: '#f5f5f5', 
                borderRadius: 1, 
                mb: 3,
                fontFamily: 'monospace'
              }}>
                <Typography variant="body2" component="div">
                  <strong>Expected Bank after Replenishment:</strong><br />
                  Cash in Bank ({formatPeso(data.bank?.total)}) + Unreplenished ({formatPeso(data.pcf?.total_unreplenished)}) = <strong>{formatPeso(data.reconciliation?.expected_bank_after_replenishment)}</strong>
                </Typography>
                <Typography variant="body2" component="div" sx={{ mt: 1 }}>
                  <strong>Total Cash:</strong> PCF ({formatPeso(data.pcf?.total_available)}) + Bank ({formatPeso(data.bank?.total)}) = <strong>{formatPeso(data.reconciliation?.total_cash)}</strong>
                </Typography>
              </Box>

              {/* PCF Breakdown */}
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                PCF Breakdown
              </Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                <Table size="small">
                  <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>PCF Name</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Location</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>Available</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>Unreplenished</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.pcf?.breakdown?.length > 0 ? (
                      data.pcf.breakdown.map((pcf) => (
                        <TableRow key={pcf.pcf_id}>
                          <TableCell>{pcf.pcf_name}</TableCell>
                          <TableCell>{pcf.location_display}</TableCell>
                          <TableCell align="right">{formatPeso(pcf.available_balance)}</TableCell>
                          <TableCell align="right" sx={{ color: (pcf.unreplenished_amount ?? pcf.unreplenished ?? 0) > 0 ? '#ed6c02' : 'inherit' }}>
                            {formatPeso(pcf.unreplenished_amount ?? pcf.unreplenished)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} align="center">No PCF data</TableCell>
                      </TableRow>
                    )}
                    <TableRow sx={{ backgroundColor: '#e3f2fd', fontWeight: 'bold' }}>
                      <TableCell colSpan={2}>TOTAL</TableCell>
                      <TableCell align="right">{formatPeso(data.pcf?.total_available)}</TableCell>
                      <TableCell align="right">{formatPeso(data.pcf?.total_unreplenished)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Bank Breakdown */}
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                Bank Breakdown
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Bank Name</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Account #</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>Balance</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.bank?.breakdown?.length > 0 ? (
                      data.bank.breakdown.map((bank) => (
                        <TableRow key={bank.bank_id}>
                          <TableCell>{bank.bank_name}</TableCell>
                          <TableCell>{bank.account_number}</TableCell>
                          <TableCell align="right">{formatPeso(bank.balance)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} align="center">No bank data</TableCell>
                      </TableRow>
                    )}
                    <TableRow sx={{ backgroundColor: '#e8f5e9', fontWeight: 'bold' }}>
                      <TableCell colSpan={2}>TOTAL</TableCell>
                      <TableCell align="right">{formatPeso(data.bank?.total)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          ) : (
            <Typography align="center" color="text.secondary">No data available</Typography>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
};

export default ReconciliationPanel;
