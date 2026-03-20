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
import { toCsv } from "../utils/csvUtils";

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
    const rows = [
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
    ];

    const csvContent = toCsv(rows);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
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
        borderRadius: 3,
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
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
          color: "white",
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <WalletIcon sx={{ fontSize: 28 }} />
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1.1rem", color: "white" }}>
                CASH ON HAND (PCF)
              </Typography>
              {hasUnreplenished && (
                <Tooltip title="There are unreplenished funds">
                  <WarningIcon fontSize="small" sx={{ color: "warning.contrastText" }} />
                </Tooltip>
              )}
            </Stack>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>
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
              bgcolor: "rgba(255,255,255,0.2)",
              color: "white",
              fontWeight: 700,
              backdropFilter: "blur(4px)",
            }}
          />
          {showExport && (
            <Tooltip title="Export CSV">
              <IconButton size="small" onClick={handleExport} sx={{ color: "white" }}>
                <DownloadIcon />
              </IconButton>
            </Tooltip>
          )}
          <IconButton size="small" onClick={() => setExpanded(!expanded)} sx={{ color: "white" }}>
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Stack>
      </Box>

      {/* Table */}
      <Collapse in={expanded}>
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: "white", fontWeight: 700, whiteSpace: "nowrap", minWidth: 150 }}>
                  Particulars
                </TableCell>
                <TableCell sx={{ color: "white", fontWeight: 700, whiteSpace: "nowrap" }}>
                  Location
                </TableCell>
                <TableCell align="right" sx={{ color: "white", fontWeight: 700, whiteSpace: "nowrap" }}>
                  Beginning
                </TableCell>
                <TableCell align="right" sx={{ color: "white", fontWeight: 700, whiteSpace: "nowrap" }}>
                  Disbursements
                </TableCell>
                <TableCell align="right" sx={{ color: "white", fontWeight: 700, whiteSpace: "nowrap" }}>
                  Replenishments
                </TableCell>
                <TableCell align="right" sx={{ color: "white", fontWeight: 700, whiteSpace: "nowrap" }}>
                  Ending
                </TableCell>
                <TableCell align="right" sx={{ color: "white", fontWeight: 700, whiteSpace: "nowrap", bgcolor: "warning.dark" }}>
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
                      <TableRow sx={{ bgcolor: "secondary.dark" }}>
                        <TableCell
                          colSpan={7}
                          sx={{
                            fontWeight: 700,
                            fontSize: "0.75rem",
                            color: "white",
                            py: 0.75,
                            letterSpacing: "0.5px",
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
                          <TableCell sx={{ fontWeight: 600, whiteSpace: "nowrap", pl: 3 }}>
                            {pcf.particulars || pcf.name || `PCF ${index + 1}`}
                          </TableCell>
                          <TableCell sx={{ whiteSpace: "nowrap", color: "text.secondary" }}>
                            {pcf.location_display || pcf.location || "-"}
                          </TableCell>
                          <TableCell align="right" sx={{ color: "text.secondary" }}>
                            {formatCurrency(pcf.beginning ?? 0)}
                          </TableCell>
                          <TableCell align="right" sx={{ color: "error.main", fontWeight: 500 }}>
                            {formatCurrency(pcf.disbursements ?? 0)}
                          </TableCell>
                          <TableCell align="right" sx={{ color: "success.dark", fontWeight: 500 }}>
                            {formatCurrency(pcf.replenishments ?? 0)}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700, color: "secondary.dark" }}>
                            {formatCurrency(pcf.ending ?? 0)}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              fontWeight: 700,
                              bgcolor: (pcf.unreplenished ?? 0) > 0 ? "warning.light" : "grey.100",
                              color: (pcf.unreplenished ?? 0) > 0 ? "warning.dark" : "text.disabled",
                            }}
                          >
                            {(pcf.unreplenished ?? 0) > 0 ? formatCurrency(pcf.unreplenished) : "-"}
                          </TableCell>
                        </TableRow>
                      ))}

                      {/* Location Subtotal */}
                      <TableRow sx={{ bgcolor: "secondary.light" }}>
                        <TableCell sx={{ fontWeight: 700, color: "white", pl: 3, fontSize: "0.8rem" }}>
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
                            color: groupTotals.unreplenished > 0 ? "white" : "rgba(255,255,255,0.5)",
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
                <TableRow sx={{ bgcolor: "#0D47A1" }}>
                  <TableCell sx={{ fontWeight: 900, color: "#FFD54A", fontSize: "1rem", letterSpacing: "0.5px" }} colSpan={2}>
                    GRAND TOTAL
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: "white" }}>
                    {formatCurrency(totals.beginning)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: "white" }}>
                    {formatCurrency(totals.disbursements)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: "white" }}>
                    {formatCurrency(totals.replenishments)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 900, color: "#FFD54A", fontSize: "1.1rem", bgcolor: "rgba(255,213,74,0.2)" }}>
                    {formatCurrency(totals.ending)}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      fontWeight: 900,
                      color: totals.unreplenished > 0 ? "#FF7043" : "rgba(255,255,255,0.5)",
                      fontSize: "1rem",
                      bgcolor: totals.unreplenished > 0 ? "rgba(255,112,67,0.2)" : "transparent",
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
            p: 2,
            bgcolor: "grey.50",
            borderTop: "1px solid",
            borderColor: "divider",
            display: "flex",
            justifyContent: "flex-start",
          }}
        >
          <Stack direction="row" spacing={4}>
            <Box>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Total Disbursements
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 700, color: "error.main" }}>
                -{formatCurrency(totals.disbursements)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Total Replenishments
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 700, color: "success.dark" }}>
                +{formatCurrency(totals.replenishments)}
              </Typography>
            </Box>
            {hasUnreplenished && (
              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Pending Replenishment
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 700, color: "warning.dark" }}>
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
