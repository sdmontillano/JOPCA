// src/components/TrendChart.jsx
import React, { useState } from "react";
import { Paper, Typography, Box, ToggleButton, ToggleButtonGroup, CircularProgress } from "@mui/material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";

function formatCurrency(value) {
  if (value >= 1000000) {
    return `₱${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `₱${(value / 1000).toFixed(0)}K`;
  }
  return `₱${value.toFixed(0)}`;
}

function formatFullCurrency(value) {
  return `₱${Number(value ?? 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <Paper
        sx={{
          p: 1.5,
          bgcolor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
          boxShadow: 3,
        }}
      >
        <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
          {label}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 700, color: "primary.main" }}>
          {formatFullCurrency(payload[0].value)}
        </Typography>
      </Paper>
    );
  }
  return null;
};

export default function TrendChart({ data = [], loading = false, title = "Cash Position Trend" }) {
  const [period, setPeriod] = useState("7d");

  const handlePeriodChange = (event, newPeriod) => {
    if (newPeriod !== null) {
      setPeriod(newPeriod);
    }
  };

  // Filter data based on period
  const getFilteredData = () => {
    if (!data || data.length === 0) return [];
    
    const sortedData = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    if (period === "7d") {
      return sortedData.slice(-7);
    } else if (period === "14d") {
      return sortedData.slice(-14);
    } else if (period === "30d") {
      return sortedData.slice(-30);
    }
    return sortedData;
  };

  const filteredData = getFilteredData();

  // Calculate stats
  const values = filteredData.map((d) => d.ending ?? d.value ?? 0);
  const maxValue = Math.max(...values, 0);
  const minValue = Math.min(...values, 0);
  const latestValue = values[values.length - 1] || 0;
  const firstValue = values[0] || 0;
  const change = latestValue - firstValue;
  const changePercent = firstValue !== 0 ? ((change / firstValue) * 100).toFixed(1) : 0;

  return (
    <Paper
      sx={{
        p: 3,
        borderRadius: 2,
        boxShadow: 2,
        height: "100%",
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Cash position over time
          </Typography>
        </Box>

        <ToggleButtonGroup
          value={period}
          exclusive
          onChange={handlePeriodChange}
          size="small"
        >
          <ToggleButton value="7d" sx={{ px: 2 }}>
            7D
          </ToggleButton>
          <ToggleButton value="14d" sx={{ px: 2 }}>
            14D
          </ToggleButton>
          <ToggleButton value="30d" sx={{ px: 2 }}>
            30D
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {loading ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: 280,
          }}
        >
          <CircularProgress />
        </Box>
      ) : filteredData.length === 0 ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: 280,
            color: "text.secondary",
          }}
        >
          <Typography variant="body2">No data available for chart</Typography>
        </Box>
      ) : (
        <>
          <Box sx={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={filteredData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEnding" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1976d2" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#1976d2" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#666" }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                  }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#666" }}
                  tickFormatter={formatCurrency}
                  domain={[minValue * 0.9, maxValue * 1.1]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="ending"
                  stroke="#1976d2"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorEnding)"
                  dot={{ r: 3, fill: "#1976d2" }}
                  activeDot={{ r: 6, fill: "#1976d2" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Box>

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              mt: 2,
              pt: 2,
              borderTop: "1px solid",
              borderColor: "divider",
            }}
          >
            <Box>
              <Typography variant="caption" color="text.secondary">
                Current
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {formatFullCurrency(latestValue)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Change
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 700,
                  color: change >= 0 ? "success.main" : "error.main",
                }}
              >
                {change >= 0 ? "+" : ""}
                {formatFullCurrency(change)} ({changePercent}%)
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Range
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {formatCurrency(minValue)} - {formatCurrency(maxValue)}
              </Typography>
            </Box>
          </Box>
        </>
      )}
    </Paper>
  );
}
