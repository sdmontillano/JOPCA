// src/components/DashboardSettings.jsx
import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControlLabel,
  Switch,
  Button,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { useNavigate } from 'react-router-dom';
import api from '../services/tokenService';

const DEFAULT_SETTINGS = {
  showCashInBank: true,
  showPCF: true,
  showPDC: true,
  showTrends: true,
  showAlerts: true,
  compactMode: false,
  dateFormat: 'en-PH',
};

export default function DashboardSettings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('dashboardSettings');
    if (saved) {
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
      } catch {
        setSettings(DEFAULT_SETTINGS);
      }
    }
    setLoading(false);
  }, []);

  const handleToggle = (key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      localStorage.setItem('dashboardSettings', JSON.stringify(settings));
      setSuccess('Settings saved successfully!');
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem('dashboardSettings');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom fontWeight="bold">
          Dashboard Settings
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

        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
          Components
        </Typography>

        <FormControlLabel
          control={
            <Switch
              checked={settings.showCashInBank}
              onChange={() => handleToggle('showCashInBank')}
            />
          }
          label="Show Cash in Bank"
          sx={{ display: 'block', mb: 1 }}
        />

        <FormControlLabel
          control={
            <Switch
              checked={settings.showPCF}
              onChange={() => handleToggle('showPCF')}
            />
          }
          label="Show Petty Cash Fund (PCF)"
          sx={{ display: 'block', mb: 1 }}
        />

        <FormControlLabel
          control={
            <Switch
              checked={settings.showPDC}
              onChange={() => handleToggle('showPDC')}
            />
          }
          label="Show Post-Dated Checks (PDC)"
          sx={{ display: 'block', mb: 1 }}
        />

        <FormControlLabel
          control={
            <Switch
              checked={settings.showTrends}
              onChange={() => handleToggle('showTrends')}
            />
          }
          label="Show Trend Charts"
          sx={{ display: 'block', mb: 1 }}
        />

        <FormControlLabel
          control={
            <Switch
              checked={settings.showAlerts}
              onChange={() => handleToggle('showAlerts')}
            />
          }
          label="Show Alert Notifications"
          sx={{ display: 'block', mb: 2 }}
        />

        <Divider sx={{ my: 3 }} />

        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
          Display Options
        </Typography>

        <FormControlLabel
          control={
            <Switch
              checked={settings.compactMode}
              onChange={() => handleToggle('compactMode')}
            />
          }
          label="Compact Mode (smaller tables)"
          sx={{ display: 'block', mb: 2 }}
        />

        <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
          <Button variant="outlined" onClick={handleReset}>
            Reset to Defaults
          </Button>
          <Button
            variant="outlined"
            onClick={() => navigate('/dashboard')}
            sx={{ flex: 1 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={18} /> : <SaveIcon />}
            onClick={handleSave}
            disabled={saving}
            sx={{ flex: 1 }}
          >
            Save Settings
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
