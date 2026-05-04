import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  RadioGroup,
  Radio,
  FormControlLabel,
  TextField,
  Alert,
  CircularProgress,
} from "@mui/material";

export default function SettingsModal({ open, onClose }) {
  const [mode, setMode] = useState("local");
  const [url, setUrl] = useState("http://localhost:8000");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && window.electronAPI?.getBackendConfig) {
      setLoading(true);
      try {
        const config = window.electronAPI.getBackendConfig();
        if (config) {
          setMode(config.backendMode || "local");
          setUrl(config.apiUrl || "http://localhost:8000");
        }
      } catch (e) {
        console.error("[Settings] Failed to load config:", e);
      }
      setLoading(false);
    }
  }, [open]);

  const handleSave = () => {
    if (window.electronAPI?.setBackendConfig) {
      setSaving(true);
      try {
        window.electronAPI.setBackendConfig(mode, url);
        onClose();
      } catch (e) {
        console.error("[Settings] Failed to save config:", e);
      }
      setSaving(false);
    }
  };

  const isElectron = typeof window !== "undefined" && window.electronAPI;

  if (!isElectron) {
    return null; // Don't show in browser
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Backend Configuration
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ mt: 2 }}>
            <Alert severity="info" sx={{ mb: 3 }}>
              Choose how JOPCA connects to the backend server.
            </Alert>

            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              Connection Mode
            </Typography>

            <RadioGroup
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              <FormControlLabel
                value="local"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Local Backend (Automatic)
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#6B7280" }}>
                      Starts Django server automatically on your computer
                    </Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="remote"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      Remote Backend
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#6B7280" }}>
                      Connect to a remote JOPCA server
                    </Typography>
                  </Box>
                }
              />
            </RadioGroup>

            {mode === "remote" && (
              <TextField
                fullWidth
                label="Backend URL"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://your-server.com"
                sx={{ mt: 2 }}
                InputLabelProps={{ shrink: true }}
              />
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || (mode === "remote" && !url)}
          sx={{ bgcolor: "#1E293B", "&:hover": { bgcolor: "#334155" } }}
        >
          {saving ? <CircularProgress size={20} /> : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
