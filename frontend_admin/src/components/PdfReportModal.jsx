import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  CircularProgress,
  Stack,
  Alert,
} from "@mui/material";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import api from "../services/tokenService";
import { generatePdfReport } from "../utils/pdfGenerator";
import { useToast } from "../ToastContext";

export default function PdfReportModal({ open, onClose }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [generating, setGenerating] = useState(false);
  const { showToast } = useToast();

  const handleGenerate = async () => {
    if (!selectedDate) {
      showToast("Please select a date", "warning");
      return;
    }
    setGenerating(true);
    await generatePdfReport(selectedDate, api, showToast);
    setGenerating(false);
    onClose();
  };

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <PictureAsPdfIcon sx={{ color: "#DC2626" }} />
        <span style={{ fontWeight: 700, fontSize: "1.25rem" }}>Generate PDF Report</span>
      </DialogTitle>
      
      <DialogContent>
        <Alert severity="info" sx={{ mb: 3 }}>
          Select a date to generate a comprehensive daily report with collections, disbursements, adjustments, cash in banks, PCF summary, and analysis.
        </Alert>
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: "#374151" }}>
            Select Report Date
          </Typography>
          <TextField
            type="date"
            fullWidth
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            inputProps={{
              max: new Date().toISOString().slice(0, 10),
            }}
            sx={{
              "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: "#1E293B",
              },
              "& .MuiInputLabel-root.Mui-focused": {
                color: "#1E293B",
              },
            }}
          />
          <Typography variant="caption" sx={{ color: "#6B7280", mt: 1, display: "block" }}>
            Report will include data for: {formatDisplayDate(selectedDate)}
          </Typography>
        </Box>
        
        <Box sx={{ bgcolor: "#F9FAFB", p: 2, borderRadius: 1, border: "1px solid #E5E7EB" }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: "#1E293B" }}>
            Report Sections:
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
           {[
               { label: "1. Cash In Banks", color: "#1D4ED8" },
               { label: "2. Total Collection", color: "#166534" },
               { label: "3. Total Disbursement", color: "#991B1B" },
               { label: "4. PCF Transactions", color: "#7C3AED" },
               { label: "5. Total Adjustments", color: "#B45309" },
               { label: "6. Bank Charges", color: "#6B7280" },
               { label: "7. Cash Summary", color: "#10B981" },
             ].map((section, idx) => (
              <Typography
                key={idx}
                variant="body2"
                sx={{
                  color: section.color,
                  fontWeight: 500,
                  mr: 2,
                  mb: 0.5,
                }}
              >
                {section.label}
              </Typography>
            ))}
          </Stack>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ p: 2, pt: 0 }}>
        <Button onClick={onClose} disabled={generating}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleGenerate}
          disabled={generating || !selectedDate}
          startIcon={generating ? <CircularProgress size={16} color="inherit" /> : <PictureAsPdfIcon />}
          sx={{
            bgcolor: "#DC2626",
            "&:hover": { bgcolor: "#B91C1C" },
          }}
        >
          {generating ? "Generating..." : "Generate PDF"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}