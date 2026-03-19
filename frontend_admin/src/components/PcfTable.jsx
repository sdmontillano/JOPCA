// src/components/PcfTable.jsx
import React, { useState } from "react";
import {
  Paper,
  Typography,
  Box,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Stack,
  IconButton,
  Collapse,
  Tooltip,
  Chip,
  Divider,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import WalletIcon from "@mui/icons-material/Wallet";
import DownloadIcon from "@mui/icons-material/Download";
import WarningIcon from "@mui/icons-material/Warning";

function formatCurrency(value) {
  return `₱${Number(value ?? 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// Group PCFs by location
function groupByLocation(pcfs) {
  const groups = {};
  pcfs.forEach((pcf) => {
    const location = pcf.location || "other";
    if (!groups[location]) {
      groups[location] = [];
    }
    groups[location].push(pcf);
  });
  return groups;
}

const locationNames = {
  office: "MAIN OFFICE",
  quarry: "QUARRY",
  tagoloan: "TAGOLOAN PARTS",
  midsayap: "MIDSAYAP PARTS",
  valencia: "VALENCIA PARTS",
  other: "OTHER",
};

function getLocationName(loc) {
  return locationNames[loc] || loc?.toUpperCase() || "OTHER";
}

export default function PcfTable({ pcfs = [], showExport = true, defaultExpanded = true }) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  // Calculate totals
  const totals = pcfs.reduce(
    (acc, pcf) => ({
      beginning: acc.beginning + (pcf.beginning ?? 0),
      disbursements: acc.disbursements + (pcf.disbursements ?? 0),
      replenishments: acc.replenishments + (pcf.replenishments ?? 0),
      ending: acc.ending + (pcf.ending ?? 0),
      unreplenished: acc.unreplenished + (pcf.unreplenished ?? 0),
    }),
    { beginning: 0, disbursements: 0, replenishments: 0, ending: 0, unreplenished: 0 }
  );

  const groupedPcfs = groupByLocation(pcfs);
  const hasUnreplenished = totals.unreplenished > 0;

  const handleExport = () => {
    const csvContent = [
      ["Particulars", "Location", "Beginning", "Disbursements", "Replenishments", "Ending", "Unreplenished"],
      ...pcfs.map((p) => [
        p.particulars || p.name,
        p.location_display || p.location,
        p.beginning ?? 0,
        p.disbursements ?? 0,
        p.replenishments ?? 0,
        p.ending ?? 0,
        p.unreplenished ?? 0,
      ]),
      ["GRAND TOTAL", "", totals.beginning, totals.disbursements, totals.replenishments, totals.ending, totals.unreplenished],
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pcf-summary-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Paper
      sx={{
        borderRadius: 2,
        boxShadow: 2,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          bgcolor: hasUnreplenished ? "warning.main" : "secondary.main",
          color: hasUnreplenished ? "white" : "black",
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <WalletIcon />
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1rem" }}>
                CASH ON HAND (PCF)
              </Typography>
              {hasUnreplenished && (
                <Tooltip title="There are unreplenished funds">
                  <WarningIcon fontSize="small" />
                </Tooltip>
              )}
            </Stack>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              {pcfs.length} fund{pcfs.length !== 1 ? "s" : ""}
              {hasUnreplenished && ` • ${formatCurrency(totals.unreplenished)} unreplenished`}
            </Typography>
          </Box>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            label={`Total: ${formatCurrency(totals.ending)}`}
            size="small"
            sx={{
              bgcolor: hasUnreplenished ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)",
              color: "inherit",
              fontWeight: 700,
            }}
          />
          {showExport && (
            <Tooltip title="Export CSV">
              <IconButton size="small" onClick={handleExport} sx={{ color: "inherit" }}>
                <DownloadIcon />
              </IconButton>
            </Tooltip>
          )}
          <IconButton size="small" onClick={() => setExpanded(!expanded)} sx={{ color: "inherit" }}>
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Stack>
      </Box>

      {/* Table */}
      <Collapse in={expanded}>
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "grey.100" }}>
                <TableCell sx={{ fontWeight: 700, whiteSpace: "nowrap", minWidth: 150 }}>
                  Particulars
                </TableCell>
                <TableCell sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                  Location
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                  Beginning
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                  Disbursements
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                  Replenishments
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                  Ending
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, whiteSpace: "nowrap", bgcolor: "warning.light" }}>
                  Unreplenished
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Object.keys(groupedPcfs).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: "text.secondary" }}>
                    No PCF accounts found
                  </TableCell>
                </TableRow>
              ) : (
                Object.entries(groupedPcfs).map(([location, items]) => {
                  const groupTotals = items.reduce(
                    (acc, pcf) => ({
                      beginning: acc.beginning + (pcf.beginning ?? 0),
                      disbursements: acc.disbursements + (pcf.disbursements ?? 0),
                      replenishments: acc.replenishments + (pcf.replenishments ?? 0),
                      ending: acc.ending + (pcf.ending ?? 0),
                      unreplenished: acc.unreplenished + (pcf.unreplenished ?? 0),
                    }),
                    { beginning: 0, disbursements: 0, replenishments: 0, ending: 0, unreplenished: 0 }
                  );

                  return (
                    <React.Fragment key={location}>
                      {/* Location Header */}
                      <TableRow sx={{ bgcolor: "primary.main", color: "white" }}>
                        <TableCell
                          colSpan={7}
                          sx={{
                            fontWeight: 700,
                            fontSize: "0.8rem",
                            color: "white",
                            py: 0.5,
                          }}
                        >
                          {getLocationName(location)}
                        </TableCell>
                      </TableRow>

                      {/* PCF Rows */}
                      {items.map((pcf, index) => (
                        <TableRow
                          key={pcf.id || index}
                          sx={{
                            "&:hover": { bgcolor: "action.hover" },
                            "&:nth-of-type(even)": { bgcolor: "grey.50" },
                          }}
                        >
                          <TableCell sx={{ fontWeight: 500, whiteSpace: "nowrap", pl: 3 }}>
                            {pcf.particulars || pcf.name || `PCF ${index + 1}`}
                          </TableCell>
                          <TableCell sx={{ whiteSpace: "nowrap" }}>
                            {pcf.location_display || pcf.location || "-"}
                          </TableCell>
                          <TableCell align="right">{formatCurrency(pcf.beginning ?? 0)}</TableCell>
                          <TableCell align="right" sx={{ color: "error.main" }}>
                            {formatCurrency(pcf.disbursements ?? 0)}
                          </TableCell>
                          <TableCell align="right" sx={{ color: "success.main" }}>
                            {formatCurrency(pcf.replenishments ?? 0)}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>
                            {formatCurrency(pcf.ending ?? 0)}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              fontWeight: 700,
                              bgcolor: "warning.light",
                              color: (pcf.unreplenished ?? 0) > 0 ? "warning.dark" : "text.secondary",
                            }}
                          >
                            {(pcf.unreplenished ?? 0) > 0 ? formatCurrency(pcf.unreplenished) : "-"}
                          </TableCell>
                        </TableRow>
                      ))}

                      {/* Location Subtotal */}
                      <TableRow sx={{ bgcolor: "primary.light" }}>
                        <TableCell sx={{ fontWeight: 700, color: "white", pl: 3 }}>
                          SUBTOTAL - {getLocationName(location)}
                        </TableCell>
                        <TableCell sx={{ color: "white" }} />
                        <TableCell align="right" sx={{ fontWeight: 700, color: "white" }}>
                          {formatCurrency(groupTotals.beginning)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: "white" }}>
                          {formatCurrency(groupTotals.disbursements)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: "white" }}>
                          {formatCurrency(groupTotals.replenishments)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: "white" }}>
                          {formatCurrency(groupTotals.ending)}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            fontWeight: 700,
                            color: groupTotals.unreplenished > 0 ? "#FFD54F" : "white",
                          }}
                        >
                          {groupTotals.unreplenished > 0 ? formatCurrency(groupTotals.unreplenished) : "-"}
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  );
                })
              )}

              {/* Grand Total Row */}
              {pcfs.length > 0 && (
                <TableRow sx={{ bgcolor: "primary.dark" }}>
                  <TableCell sx={{ fontWeight: 900, color: "white", fontSize: "0.95rem" }} colSpan={2}>
                    GRAND TOTAL
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 900, color: "white" }}>
                    {formatCurrency(totals.beginning)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 900, color: "white" }}>
                    {formatCurrency(totals.disbursements)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 900, color: "white" }}>
                    {formatCurrency(totals.replenishments)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 900, color: "#FFD54A", fontSize: "1rem" }}>
                    {formatCurrency(totals.ending)}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      fontWeight: 900,
                      color: totals.unreplenished > 0 ? "#FFD54F" : "white",
                      fontSize: "1rem",
                    }}
                  >
                    {totals.unreplenished > 0 ? formatCurrency(totals.unreplenished) : "-"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
      </Collapse>

      {/* Footer with quick stats */}
      {expanded && pcfs.length > 0 && (
        <Box
          sx={{
            p: 1.5,
            bgcolor: "grey.50",
            borderTop: "1px solid",
            borderColor: "divider",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <Stack direction="row" spacing={3}>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Total Disbursements
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: "error.main" }}>
                -{formatCurrency(totals.disbursements)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Total Replenishments
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: "success.main" }}>
                +{formatCurrency(totals.replenishments)}
              </Typography>
            </Box>
            {hasUnreplenished && (
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Pending Replenishment
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: "warning.main" }}>
                  {formatCurrency(totals.unreplenished)}
                </Typography>
              </Box>
            )}
          </Stack>
        </Box>
      )}
    </Paper>
  );
}
