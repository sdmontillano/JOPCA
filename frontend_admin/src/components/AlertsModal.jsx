import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, List, ListItem, ListItemIcon, ListItemText,
  Typography, Box, Chip, Divider, CircularProgress, Alert, Stack
} from '@mui/material';
import {
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckIcon,
  Notifications as NotificationsIcon,
  AttachMoney as MoneyIcon,
  EventNote as EventNoteIcon
} from '@mui/icons-material';

import api from '../services/tokenService';

const safeFormatCurrency = (value) => {
  const num = Number(value ?? 0) || 0;
  return `₱${num.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const AlertsModal = ({ open, onClose }) => {
  const [pcfAlerts, setPcfAlerts] = useState([]);
  const [pdcAlerts, setPdcAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAlerts = async () => {
    setLoading(true);
    setError(null);
    try {
      const [pcfRes, pdcRes] = await Promise.all([
        api.get('/summary/pcf-alerts/'),
        api.get('/summary/pdc-alerts/')
      ]);
      setPcfAlerts(pcfRes.data?.alerts || []);
      setPdcAlerts(pdcRes.data?.alerts || []);
    } catch (err) {
      const errorMsg = err?.response?.data?.detail || err?.message || 'Failed to load alerts';
      setError(String(errorMsg));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchAlerts();
    }
  }, [open]);

  const pcfOnly = pcfAlerts.filter(a => a.type === 'low_balance' || a.type === 'unreplenished');
  const pdcMaturing = pdcAlerts.filter(a => a.type === 'pdc_maturing_soon');
  const pdcOverdue = pdcAlerts.filter(a => a.type === 'pdc_overdue');
  const pdcMatured = pdcAlerts.filter(a => a.type === 'pdc_matured_auto');
  
  const totalAlerts = pcfOnly.length + pdcMaturing.length + pdcOverdue.length;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'primary.main', color: 'white' }}>
        <NotificationsIcon sx={{ color: 'white' }} />
        <span style={{ color: 'white', fontWeight: 700, fontSize: '1.25rem' }}>Alerts</span>
        {totalAlerts > 0 && (
          <Chip 
            label={totalAlerts} 
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
        ) : totalAlerts === 0 ? (
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
              <CheckIcon sx={{ fontSize: 48, color: 'success.main' }} />
            </Box>
            <Typography variant="h6" color="success.main" fontWeight={700}>
              All Clear!
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              No alerts at this time. All PCFs and PDCs are healthy.
            </Typography>
          </Box>
        ) : (
          <Box>
            {/* PDC Alerts Section */}
            {(pdcMaturing.length > 0 || pdcOverdue.length > 0 || pdcMatured.length > 0) && (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <EventNoteIcon color="warning" fontSize="small" />
                  <Typography variant="subtitle1" fontWeight="bold" color="warning.main">
                    PDC Alerts ({pdcMaturing.length + pdcOverdue.length + pdcMatured.length})
                  </Typography>
                </Box>
                <List dense>
                  {pdcMatured.map((alert, idx) => (
                    <ListItem key={`pm-${idx}`} sx={{ bgcolor: '#e8f5e9', borderRadius: 1, mb: 1 }}>
                      <ListItemIcon>
                        <CheckIcon sx={{ color: '#2e7d32' }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={`PDC ${alert.check_no} Auto-Matured`}
                        secondary={alert.message}
                      />
                    </ListItem>
                  ))}
                  {pdcMaturing.map((alert, idx) => {
                    const daysUntil = alert.days_until || 0;
                    const warningColor = daysUntil <= 1 ? '#d32f2f' : daysUntil <= 2 ? '#ed6c02' : '#ff9800';
                    return (
                    <ListItem key={`pm-${idx}`} sx={{ bgcolor: '#fff3e0', borderRadius: 1, mb: 1 }}>
                      <ListItemIcon>
                        <EventNoteIcon sx={{ color: '#ed6c02' }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={`PDC ${alert.check_no} Maturing Soon`}
                        secondary={
                          <Box component="span">
                            {alert.message}
                            <Chip 
                              label={daysUntil === 1 ? "1 day warning" : `${daysUntil} days warning`} 
                              size="small" 
                              sx={{ ml: 1, bgcolor: warningColor, color: 'white', fontSize: '0.65rem' }} 
                            />
                          </Box>
                        }
                      />
                    </ListItem>
                    );
                  })}
                  {pdcOverdue.map((alert, idx) => (
                    <ListItem key={`po-${idx}`} sx={{ bgcolor: '#ffebee', borderRadius: 1, mb: 1 }}>
                      <ListItemIcon>
                        <ErrorIcon color="error" />
                      </ListItemIcon>
                      <ListItemText
                        primary={`PDC ${alert.check_no} Overdue`}
                        secondary={alert.message}
                      />
                    </ListItem>
                  ))}
                </List>
                <Divider sx={{ my: 2 }} />
              </>
            )}

            {/* PCF Alerts Section */}
            {pcfOnly.length > 0 && (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <MoneyIcon color="warning" fontSize="small" />
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ color: '#ed6c02' }}>
                    PCF Alerts ({pcfOnly.length})
                  </Typography>
                </Box>
                <List dense>
                  {pcfOnly.map((alert, idx) => (
                    <ListItem key={`pcf-${idx}`} sx={{ 
                      bgcolor: alert.type === 'low_balance' ? '#ffebee' : '#fff3e0', 
                      borderRadius: 1, 
                      mb: 1 
                    }}>
                      <ListItemIcon>
                        {alert.type === 'low_balance' ? <ErrorIcon color="error" /> : <WarningIcon sx={{ color: '#ed6c02' }} />}
                      </ListItemIcon>
                      <ListItemText
                        primary={alert.pcf_name}
                        secondary={alert.message}
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
