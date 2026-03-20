import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, List, ListItem, ListItemIcon, ListItemText,
  Typography, Box, Chip, Divider, CircularProgress, Alert
} from '@mui/material';
import {
  Warning as WarningIcon,
  Error as ErrorIcon,
  Notifications as NotificationsIcon,
  AttachMoney as MoneyIcon
} from '@mui/icons-material';

import api from '../services/tokenService';

const safeFormatCurrency = (value) => {
  const num = Number(value ?? 0) || 0;
  return `₱${num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const AlertsModal = ({ open, onClose }) => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAlerts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/summary/pcf-alerts/');
      const data = response.data || response;
      setAlerts(data.alerts || []);
    } catch (err) {
      const errorMsg = err?.response?.data?.detail || err?.message || 'Failed to load alerts';
      setError(String(errorMsg));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    if (open) {
      fetchAlerts();
    }
    return () => { cancelled = true; };
  }, [open]);

  const lowBalanceAlerts = alerts.filter(a => a.type === 'low_balance');
  const highUnrepAlerts = alerts.filter(a => a.type === 'high_unreplenished');

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'primary.main', color: 'white' }}>
        <NotificationsIcon sx={{ color: 'white' }} />
        <Typography variant="h6" sx={{ color: 'white', fontWeight: 700 }}>PCF Alerts</Typography>
        {alerts.length > 0 && (
          <Chip 
            label={alerts.length} 
            color="warning" 
            size="small" 
            sx={{ ml: 1 }}
          />
        )}
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4 }}>
            <CircularProgress />
            <Typography sx={{ ml: 2, color: 'text.secondary' }}>Loading alerts...</Typography>
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : alerts.length === 0 ? (
          <Box sx={{ textAlign: 'center', p: 4 }}>
            <Box sx={{ 
              width: 80, 
              height: 80, 
              borderRadius: '50%', 
              bgcolor: 'success.light', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              mx: 'auto',
              mb: 2
            }}>
              <NotificationsIcon sx={{ fontSize: 48, color: 'success.main' }} />
            </Box>
            <Typography variant="h6" color="success.main" fontWeight={700}>
              All Clear!
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              No alerts at this time. All PCFs are healthy.
            </Typography>
          </Box>
        ) : (
          <Box>
            {lowBalanceAlerts.length > 0 && (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <ErrorIcon color="error" fontSize="small" />
                  <Typography variant="subtitle1" fontWeight="bold" color="error">
                    Low Balance Alerts ({lowBalanceAlerts.length})
                  </Typography>
                </Box>
                <List dense>
                  {lowBalanceAlerts.map((alert, idx) => (
                    <ListItem key={`lb-${idx}`} sx={{ bgcolor: 'error.light', borderRadius: 1, mb: 1 }}>
                      <ListItemIcon>
                        <ErrorIcon color="error" />
                      </ListItemIcon>
                      <ListItemText
                        primary={alert.pcf_name}
                        secondary={
                          <Box component="span">
                            <Typography variant="body2" component="span">
                              {alert.location_display || 'N/A'}
                            </Typography>
                            <br />
                            <Typography variant="body2" component="span" color="error.main" fontWeight="bold">
                              Current: {safeFormatCurrency(alert.current_balance)}
                            </Typography>
                            <Typography variant="body2" component="span" color="text.secondary"> | Threshold: {safeFormatCurrency(alert.threshold)}</Typography>
                            <br />
                            <Typography variant="caption" component="span" color="error.main">
                              Deficit: {safeFormatCurrency(alert.deficit)}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
                <Divider sx={{ my: 2 }} />
              </>
            )}

            {highUnrepAlerts.length > 0 && (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <WarningIcon sx={{ color: '#ed6c02' }} fontSize="small" />
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ color: '#ed6c02' }}>
                    High Unreplenished Alerts ({highUnrepAlerts.length})
                  </Typography>
                </Box>
                <List dense>
                  {highUnrepAlerts.map((alert, idx) => (
                    <ListItem key={`ur-${idx}`} sx={{ bgcolor: '#fff3e0', borderRadius: 1, mb: 1 }}>
                      <ListItemIcon>
                        <MoneyIcon sx={{ color: '#ed6c02' }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={alert.pcf_name}
                        secondary={
                          <Box component="span">
                            <Typography variant="body2" component="span">
                              {alert.location_display || 'N/A'}
                            </Typography>
                            <br />
                            <Typography variant="body2" component="span" sx={{ color: '#ed6c02', fontWeight: 'bold' }}>
                              Unreplenished: {safeFormatCurrency(alert.unreplenished)}
                            </Typography>
                            <Typography variant="body2" component="span" color="text.secondary"> (threshold: {safeFormatCurrency(alert.threshold)})</Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default AlertsModal;
