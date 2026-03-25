// src/components/DashboardSettings.jsx
import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Divider,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { useNavigate } from 'react-router-dom';
import { useThemeColor } from '../ThemeContext';

export default function DashboardSettings() {
  const navigate = useNavigate();
  const { colorScheme, setColorScheme, darkMode, setDarkMode, colorSchemes } = useThemeColor();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);

  const handleSave = () => {
    setLoading(true);
    setSuccess(null);
    setTimeout(() => {
      setSuccess('Settings saved successfully!');
      setLoading(false);
      setTimeout(() => navigate('/dashboard'), 1500);
    }, 300);
  };

  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom fontWeight="bold">
          Settings
        </Typography>
        <Divider sx={{ mb: 3 }} />

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
          Appearance
        </Typography>

        <FormControlLabel
          control={
            <Switch
              checked={darkMode}
              onChange={(e) => setDarkMode(e.target.checked)}
            />
          }
          label="Dark Mode"
          sx={{ display: 'block', mb: 2 }}
        />

        <Divider sx={{ my: 3 }} />

        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
          Color Scheme
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Choose a color that will apply to the entire application including navbar, buttons, and all pages.
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: 4 }}>
          {Object.entries(colorSchemes).map(([key, scheme]) => (
            <Box
              key={key}
              onClick={() => setColorScheme(key)}
              sx={{
                cursor: 'pointer',
                borderRadius: 2,
                overflow: 'hidden',
                border: colorScheme === key ? '3px solid' : '2px solid',
                borderColor: colorScheme === key ? 'primary.main' : '#e5e7eb',
                transition: 'all 0.2s ease',
                transform: colorScheme === key ? 'scale(1.05)' : 'scale(1)',
                '&:hover': {
                  transform: 'scale(1.05)',
                  borderColor: 'primary.main',
                },
              }}
            >
              <Box
                sx={{
                  height: 50,
                  bgcolor: scheme.primary.main,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography variant="caption" sx={{ color: '#fff', fontWeight: 'bold' }}>
                  {scheme.name}
                </Typography>
              </Box>
              <Box sx={{ bgcolor: darkMode ? '#1e293b' : '#fff', p: 1, display: 'flex', justifyContent: 'center' }}>
                {colorScheme === key && (
                  <Typography variant="body2" color="primary" fontWeight="bold">
                    ✓ Selected
                  </Typography>
                )}
              </Box>
            </Box>
          ))}
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
          <Button
            variant="outlined"
            onClick={() => navigate('/dashboard')}
            sx={{ flex: 1 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={18} /> : <SaveIcon />}
            onClick={handleSave}
            disabled={loading}
            sx={{ flex: 1 }}
          >
            Save Changes
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}
