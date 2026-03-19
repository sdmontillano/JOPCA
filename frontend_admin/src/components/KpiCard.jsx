// src/components/KpiCard.jsx
import React from "react";
import { Paper, Typography, Box, Stack } from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingFlatIcon from "@mui/icons-material/TrendingFlat";

function formatCurrency(value) {
  return `₱${Number(value ?? 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function KpiCard({
  title,
  value,
  previousValue,
  icon,
  color = "primary.main",
  bgColor = "background.paper",
  warning = false,
  danger = false,
}) {
  const numericValue = Number(value ?? 0);
  const numericPrev = Number(previousValue ?? 0);
  
  // Calculate percentage change
  let percentChange = 0;
  let trendIcon = <TrendingFlatIcon fontSize="small" />;
  let trendColor = "text.secondary";
  
  if (numericPrev !== 0) {
    percentChange = ((numericValue - numericPrev) / Math.abs(numericPrev)) * 100;
    
    if (percentChange > 0) {
      trendIcon = <TrendingUpIcon fontSize="small" />;
      trendColor = "success.main";
    } else if (percentChange < 0) {
      trendIcon = <TrendingDownIcon fontSize="small" />;
      trendColor = danger ? "error.main" : "text.secondary";
    }
  }

  const displayColor = danger 
    ? "error.main" 
    : warning 
      ? "warning.main" 
      : color;

  return (
    <Paper
      sx={{
        p: 2.5,
        borderRadius: 2,
        boxShadow: 2,
        height: "100%",
        minWidth: 180,
        background: bgColor,
        border: danger ? "2px solid" : warning ? "2px solid" : "none",
        borderColor: danger ? "error.main" : warning ? "warning.main" : "transparent",
        transition: "transform 0.2s, box-shadow 0.2s",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: 4,
        },
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box sx={{ flex: 1 }}>
          <Typography 
            variant="caption" 
            sx={{ 
              color: "text.secondary", 
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              fontSize: "0.7rem",
            }}
          >
            {title}
          </Typography>
          
          <Typography
            variant="h5"
            sx={{
              fontWeight: 800,
              color: displayColor,
              mt: 0.5,
              mb: 0.5,
              fontSize: "1.4rem",
            }}
          >
            {formatCurrency(value)}
          </Typography>
          
          {previousValue !== undefined && previousValue !== null && (
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Box sx={{ color: trendColor, display: "flex", alignItems: "center" }}>
                {trendIcon}
              </Box>
              <Typography 
                variant="caption" 
                sx={{ color: trendColor, fontWeight: 500 }}
              >
                {Math.abs(percentChange).toFixed(1)}% vs prev
              </Typography>
            </Stack>
          )}
        </Box>
        
        {icon && (
          <Box
            sx={{
              p: 1,
              borderRadius: 2,
              bgcolor: `${color}15`,
              color: displayColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {icon}
          </Box>
        )}
      </Stack>
    </Paper>
  );
}
