// src/components/AlertBanner.jsx
import React, { useState } from "react";
import {
  Paper,
  Typography,
  Box,
  Alert,
  AlertTitle,
  Collapse,
  IconButton,
  Stack,
  Chip,
  Button,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import InfoIcon from "@mui/icons-material/Info";
import ErrorIcon from "@mui/icons-material/Error";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

function formatCurrency(value) {
  return `₱${Number(value ?? 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function AlertBanner({
  alerts = [],
  onDismiss,
  onViewAll,
  maxVisible = 3,
  loading = false,
}) {
  const [dismissed, setDismissed] = useState([]);

  const handleDismiss = (alertId) => {
    setDismissed((prev) => [...prev, alertId]);
    onDismiss?.(alertId);
  };

  const visibleAlerts = alerts
    .filter((alert) => !dismissed.includes(alert.id || alert.pcf_id || alert.type))
    .slice(0, maxVisible);

  if (visibleAlerts.length === 0) {
    return null;
  }

  return (
    <Paper
      sx={{
        borderRadius: 2,
        boxShadow: 2,
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          p: 2,
          bgcolor: "grey.50",
          borderBottom: "1px solid",
          borderColor: "divider",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <WarningAmberIcon color="warning" fontSize="small" />
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Alerts & Notifications
          </Typography>
          <Chip
            label={visibleAlerts.length}
            size="small"
            color="warning"
            sx={{ ml: 1 }}
          />
        </Stack>

        {alerts.length > maxVisible && onViewAll && (
          <Button size="small" onClick={onViewAll}>
            View All ({alerts.length})
          </Button>
        )}
      </Box>

      <Box sx={{ p: 1 }}>
        {visibleAlerts.map((alert, index) => {
          const severity = getAlertSeverity(alert);
          const Icon = getAlertIcon(severity);

          return (
            <Alert
              key={alert.id || alert.pcf_id || `${alert.type}-${index}`}
              severity={severity}
              icon={Icon}
              sx={{
                mb: index < visibleAlerts.length - 1 ? 1 : 0,
                "& .MuiAlert-message": {
                  flex: 1,
                },
              }}
              action={
                <IconButton
                  size="small"
                  onClick={() =>
                    handleDismiss(alert.id || alert.pcf_id || alert.type)
                  }
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              }
            >
              <AlertTitle sx={{ fontWeight: 600, fontSize: "0.85rem" }}>
                {getAlertTitle(alert)}
              </AlertTitle>
              <Typography variant="body2">{getAlertMessage(alert)}</Typography>
              {alert.action && (
                <Button
                  size="small"
                  variant="outlined"
                  sx={{ mt: 1, textTransform: "none" }}
                  onClick={() => alert.action?.()}
                >
                  {alert.actionLabel || "Take Action"}
                </Button>
              )}
            </Alert>
          );
        })}
      </Box>
    </Paper>
  );
}


function getAlertSeverity(alert) {
  if (alert.type?.includes("critical") || alert.severity === "critical") {
    return "error";
  }
  if (alert.type?.includes("warning") || alert.severity === "warning") {
    return "warning";
  }
  if (alert.type?.includes("info") || alert.severity === "info") {
    return "info";
  }
  if (alert.type?.includes("low_balance")) {
    return "warning";
  }
  if (alert.type?.includes("unreplenished")) {
    return "warning";
  }
  return "info";
}

function getAlertIcon(severity) {
  switch (severity) {
    case "error":
      return <ErrorIcon fontSize="inherit" />;
    case "warning":
      return <WarningAmberIcon fontSize="inherit" />;
    case "info":
      return <InfoIcon fontSize="inherit" />;
    default:
      return <CheckCircleIcon fontSize="inherit" />;
  }
}

function getAlertTitle(alert) {
  if (alert.type === "low_balance") {
    return "Low PCF Balance";
  }
  if (alert.type === "high_unreplenished") {
    return "High Unreplenished Balance";
  }
  if (alert.type === "returned_check") {
    return "Returned Check";
  }
  if (alert.type === "pdc_maturing") {
    return "PDC Maturing Soon";
  }
  if (alert.name) {
    return alert.name;
  }
  return alert.type || "Notification";
}

function getAlertMessage(alert) {
  if (alert.type === "low_balance") {
    return `PCF "${alert.name}" has a low balance of ${formatCurrency(
      alert.balance || alert.available_balance
    )}. Threshold: ${formatCurrency(alert.threshold || 0)}`;
  }
  if (alert.type === "high_unreplenished") {
    return `PCF "${alert.name}" has unreplenished funds of ${formatCurrency(
      alert.unreplenished
    )}.`;
  }
  if (alert.message) {
    return alert.message;
  }
  if (alert.detail) {
    return alert.detail;
  }
  return `${alert.type}: ${JSON.stringify(alert)}`;
}

// Compact inline alerts for dashboard
export function InlineAlert({ alert, onDismiss }) {
  const severity = getAlertSeverity(alert);

  return (
    <Collapse in>
      <Alert
        severity={severity}
        onClose={onDismiss}
        sx={{ mb: 1 }}
      >
        <Typography variant="body2">
          <strong>{getAlertTitle(alert)}:</strong> {getAlertMessage(alert)}
        </Typography>
      </Alert>
    </Collapse>
  );
}
