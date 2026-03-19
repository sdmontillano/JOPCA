// src/components/QuickActions.jsx
import React from "react";
import {
  Paper,
  Typography,
  Box,
  Button,
  Stack,
  Divider,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ReceiptIcon from "@mui/icons-material/Receipt";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import WalletIcon from "@mui/icons-material/Wallet";
import PrintIcon from "@mui/icons-material/Print";
import AssessmentIcon from "@mui/icons-material/Assessment";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import EventNoteIcon from "@mui/icons-material/EventNote";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";

export default function QuickActions({
  onAction,
  onReport,
  loading = false,
}) {
  const handleAction = (actionId) => {
    if (onAction && typeof onAction === "function") {
      onAction(actionId);
    }
  };

  const handleReport = (reportId) => {
    if (onReport && typeof onReport === "function") {
      onReport(reportId);
    }
  };

  return (
    <Paper
      sx={{
        p: 2.5,
        borderRadius: 2,
        boxShadow: 2,
      }}
    >
      <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: "text.secondary" }}>
        Quick Actions
      </Typography>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        {/* Main Actions - Add buttons */}
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" sx={{ color: "text.secondary", mb: 1, display: "block" }}>
            Add New
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button
              variant="contained"
              color="primary"
              size="medium"
              startIcon={<ReceiptIcon />}
              onClick={() => handleAction("transaction")}
              disabled={loading}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 600,
                px: 2,
                py: 1,
                minWidth: 130,
              }}
            >
              Transaction
            </Button>
            
            <Button
              variant="contained"
              color="info"
              size="medium"
              startIcon={<EventNoteIcon />}
              onClick={() => handleAction("pdc")}
              disabled={loading}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 600,
                px: 2,
                py: 1,
                minWidth: 130,
              }}
            >
              PDC
            </Button>
            
            <Button
              variant="contained"
              color="secondary"
              size="medium"
              startIcon={<WalletIcon />}
              onClick={() => handleAction("pcf")}
              disabled={loading}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 600,
                px: 2,
                py: 1,
                minWidth: 130,
                color: "black",
              }}
            >
              PCF
            </Button>
            
            <Button
              variant="contained"
              color="success"
              size="medium"
              startIcon={<AccountBalanceIcon />}
              onClick={() => handleAction("bank")}
              disabled={loading}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 600,
                px: 2,
                py: 1,
                minWidth: 130,
              }}
            >
              Bank
            </Button>
          </Stack>
        </Box>

        <Divider orientation="vertical" flexItem sx={{ mx: 1, display: { xs: "none", sm: "block" } }} />

        {/* Reports */}
        <Box>
          <Typography variant="caption" sx={{ color: "text.secondary", mb: 1, display: "block" }}>
            Reports
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button
              variant="outlined"
              size="medium"
              startIcon={<PrintIcon />}
              onClick={() => handleReport("daily-report")}
              disabled={loading}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 500,
                px: 2,
                py: 1,
                minWidth: 120,
              }}
            >
              Print
            </Button>
            
            <Button
              variant="outlined"
              size="medium"
              startIcon={<AssessmentIcon />}
              onClick={() => handleReport("monthly-report")}
              disabled={loading}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 500,
                px: 2,
                py: 1,
                minWidth: 120,
              }}
            >
              Reports
            </Button>
          </Stack>
        </Box>
      </Stack>
    </Paper>
  );
}
