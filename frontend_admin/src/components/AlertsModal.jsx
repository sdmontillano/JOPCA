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
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchAlerts();
    }
  }, [open]);

  const lowBalanceAlerts = alerts.filter(a => a.type === 'low_balance');
  const highUnrepAlerts = alerts.filter(a => a.type === 'high_unreplenished');

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <NotificationsIcon color="primary" />
        <Typography variant="h6">PCF Alerts</Typography>
        {alerts.length > 0 && (
          <Chip 
            label={alerts.length} 
            color="error" 
            size="small" 
            sx={{ ml: 1 }}
          />
        )}
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : alerts.length === 0 ? (
          <Box sx={{ textAlign: 'center', p: 3 }}>
            <NotificationsIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h6" color="success.main">
              All Clear!
            </Typography>
            <Typography color="text.secondary">
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
                              {alert.location_display}
                            </Typography>
                            <br />
                            <Typography variant="body2" component="span" color="error.main" fontWeight="bold">
                              Current: ₱{alert.current_balance.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </Typography>
                            <Typography variant="body2" component="span" color="text.secondary"> | Threshold: ₱{alert.threshold.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</Typography>
                            <br />
                            <Typography variant="caption" component="span" color="error.main">
                              Deficit: ₱{alert.deficit.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
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
                              {alert.location_display}
                            </Typography>
                            <br />
                            <Typography variant="body2" component="span" sx={{ color: '#ed6c02', fontWeight: 'bold' }}>
                              Unreplenished: ₱{alert.unreplenished.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                            </Typography>
                            <Typography variant="body2" component="span" color="text.secondary"> (threshold: ₱{alert.threshold.toLocaleString('en-PH', { minimumFractionDigits: 2 })})</Typography>
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
