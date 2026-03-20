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
  Button,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import WalletIcon from "@mui/icons-material/Wallet";
import DownloadIcon from "@mui/icons-material/Download";
import WarningIcon from "@mui/icons-material/Warning";
import { toCsv } from "../utils/csvUtils";
import PcfHistory from "./PcfHistory";

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

// Transaction Row Component
function TransactionRow({ transaction }) {
  const isDisbursement = transaction.type === "disbursement";
  const isReplenishment = transaction.type === "replenishment";
  const isUnreplenished = transaction.type === "unreplenished";

  let color = "#6B7280";
  let label = transaction.type;

  if (isDisbursement) {
    color = "#991B1B";
    label = "Disbursement";
  } else if (isReplenishment) {
    color = "#166534";
    label = "Replenishment";
  } else if (isUnreplenished) {
    color = "#B45309";
    label = "Unreplenished";
  }

  return (
    <TableRow
      sx={{
        bgcolor: "#FFFFFF",
        "&:hover": { bgcolor: "#F3F4F6" },
      }}
    >
      <TableCell sx={{ pl: 6, color: "#6B7280", fontSize: "0.75rem" }}>
        {transaction.date}
      </TableCell>
      <TableCell colSpan={2} />
      <TableCell
        align="right"
        sx={{
          color: color,
          fontWeight: 600,
          fontSize: "0.8rem",
        }}
      >
        {isDisbursement && "-"}
        {isReplenishment && "+"}
        {isUnreplenished && "-"}
        {formatCurrency(transaction.amount)}
      </TableCell>
      <TableCell colSpan={3} />
      <TableCell sx={{ fontSize: "0.75rem", color: "#374151" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              color: color,
              textTransform: "capitalize",
            }}
          >
            {label}
          </Typography>
          {transaction.description && (
            <Typography
              variant="caption"
              sx={{
                color: "#9CA3AF",
                fontStyle: "italic",
              }}
            >
              — {transaction.description}
            </Typography>
          )}
        </Box>
      </TableCell>
    </TableRow>
  );
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
        p.name,
        p.location_display || p.location,
        p.beginning ?? 0,
        p.disbursements ?? 0,
        p.replenishments ?? 0,
        p.ending ?? 0,
        p.unreplenished ?? 0,
      ]),
      ["GRAND TOTAL", "", totals.beginning, totals.disbursements, totals.replenishments, totals.ending, totals.unreplenished],
      [],
      ["Transaction Details"],
      ["Date", "PCF", "Type", "Amount", "Description"],
      ...pcfs.flatMap((p) =>
        (p.transactions || []).map((t) => [
          t.date,
          p.name,
          t.type,
          t.amount,
          t.description || "",
        ])
      ),
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
        borderRadius: 1,
        border: "1px solid",
        borderColor: "#E5E7EB",
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
          bgcolor: "#1E293B",
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
                <TableCell sx={{ color: "white", fontWeight: 700, whiteSpace: "nowrap", minWidth: 150, bgcolor: "#1E293B" }}>
                  Particulars
                </TableCell>
                <TableCell sx={{ color: "white", fontWeight: 700, whiteSpace: "nowrap", bgcolor: "#1E293B" }}>
                  Location
                </TableCell>
                <TableCell align="right" sx={{ color: "white", fontWeight: 700, whiteSpace: "nowrap", bgcolor: "#1E293B" }}>
                  Beginning
                </TableCell>
                <TableCell align="right" sx={{ color: "white", fontWeight: 700, whiteSpace: "nowrap", bgcolor: "#1E293B" }}>
                  Disbursements
                </TableCell>
                <TableCell align="right" sx={{ color: "white", fontWeight: 700, whiteSpace: "nowrap", bgcolor: "#1E293B" }}>
                  Replenishments
                </TableCell>
                <TableCell align="right" sx={{ color: "white", fontWeight: 700, whiteSpace: "nowrap", bgcolor: "#1E293B" }}>
                  Ending
                </TableCell>
                <TableCell align="right" sx={{ color: "white", fontWeight: 700, whiteSpace: "nowrap", bgcolor: "#B45309" }}>
                  Unreplenished
                </TableCell>
                <TableCell sx={{ color: "white", fontWeight: 700, bgcolor: "#1E293B", minWidth: 250 }}>
                  Transactions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* PCF History Row - Show/Hide at top */}
              <TableRow>
                <TableCell colSpan={8} sx={{ p: 0, borderBottom: "none" }}>
                  <PcfHistory />
                </TableCell>
              </TableRow>
              {Object.keys(groupedPcfs).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4, color: "#9CA3AF" }}>
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
                      <TableRow sx={{ bgcolor: "#475569" }}>
                        <TableCell
                          colSpan={8}
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

                      {/* PCF Rows with Transactions */}
                      {items.map((pcf, index) => {
                        const transactions = pcf.transactions || [];
                        const hasTransactions = transactions.length > 0;

                        return (
                          <React.Fragment key={pcf.id || index}>
                            {/* Main PCF Row */}
                            <TableRow
                              sx={{
                                "&:hover": { bgcolor: "#F9FAFB" },
                                "&:nth-of-type(even)": { bgcolor: "#F9FAFB" },
                              }}
                            >
                              <TableCell sx={{ fontWeight: 600, whiteSpace: "nowrap", pl: 3, color: "#374151" }}>
                                {pcf.name || `PCF ${index + 1}`}
                              </TableCell>
                              <TableCell sx={{ whiteSpace: "nowrap", color: "#6B7280" }}>
                                {pcf.location_display || pcf.location || "-"}
                              </TableCell>
                              <TableCell align="right" sx={{ color: "#6B7280" }}>
                                {formatCurrency(pcf.beginning ?? 0)}
                              </TableCell>
                              <TableCell align="right" sx={{ color: "#991B1B", fontWeight: 500 }}>
                                {formatCurrency(pcf.disbursements ?? 0)}
                              </TableCell>
                              <TableCell align="right" sx={{ color: "#166534", fontWeight: 500 }}>
                                {formatCurrency(pcf.replenishments ?? 0)}
                              </TableCell>
                              <TableCell align="right" sx={{ fontWeight: 700, color: "#1E293B" }}>
                                {formatCurrency(pcf.ending ?? 0)}
                              </TableCell>
                              <TableCell
                                align="right"
                                sx={{
                                  fontWeight: 700,
                                  bgcolor: (pcf.unreplenished ?? 0) > 0 ? "#FEF3C7" : "#F3F4F6",
                                  color: (pcf.unreplenished ?? 0) > 0 ? "#B45309" : "#9CA3AF",
                                }}
                              >
                                {(pcf.unreplenished ?? 0) > 0 ? formatCurrency(pcf.unreplenished) : "-"}
                              </TableCell>
                              <TableCell sx={{ fontSize: "0.75rem", color: "#6B7280" }}>
                                {hasTransactions ? (
                                  <Stack spacing={0.5}>
                                    {transactions.map((t, idx) => (
                                      <Box
                                        key={t.id || idx}
                                        sx={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 0.5,
                                          py: 0.25,
                                        }}
                                      >
                                        <Typography
                                          variant="caption"
                                          sx={{
                                            fontWeight: 600,
                                            color: t.type === "disbursement" || t.type === "unreplenished"
                                              ? "#991B1B"
                                              : "#166534",
                                            minWidth: 80,
                                          }}
                                        >
                                          {t.type === "disbursement" && "Disb:"}
                                          {t.type === "replenishment" && "Rep:"}
                                          {t.type === "unreplenished" && "Unrep:"}
                                        </Typography>
                                        <Typography
                                          variant="caption"
                                          sx={{
                                            fontWeight: 600,
                                            color: t.type === "disbursement" || t.type === "unreplenished"
                                              ? "#991B1B"
                                              : "#166534",
                                          }}
                                        >
                                          {t.type === "disbursement" || t.type === "unreplenished" ? "-" : "+"}
                                          {formatCurrency(t.amount)}
                                        </Typography>
                                        {t.description && (
                                          <Typography
                                            variant="caption"
                                            sx={{
                                              color: "#374151",
                                              fontStyle: "italic",
                                              overflow: "hidden",
                                              textOverflow: "ellipsis",
                                              whiteSpace: "nowrap",
                                              maxWidth: 100,
                                            }}
                                          >
                                            ({t.description})
                                          </Typography>
                                        )}
                                      </Box>
                                    ))}
                                  </Stack>
                                ) : (
                                  <Typography variant="caption" sx={{ color: "#9CA3AF", fontStyle: "italic" }}>
                                    No transactions
                                  </Typography>
                                )}
                              </TableCell>
                            </TableRow>

                            {/* PCF Note Row (if note exists) */}
                            {pcf.note && (
                              <TableRow sx={{ bgcolor: "#F8FAFB" }}>
                                <TableCell colSpan={8} sx={{ pl: 6, fontSize: "0.75rem", color: "#6B7280", fontStyle: "italic" }}>
                                  Note: {pcf.note}
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        );
                      })}

                      {/* Location Subtotal */}
                      <TableRow sx={{ bgcolor: "#64748B" }}>
                        <TableCell sx={{ fontWeight: 700, color: "white", pl: 3, fontSize: "0.8rem" }}>
                          SUBTOTAL - {getLocationName(location)}
                        </TableCell>
                        <TableCell sx={{ color: "rgba(255,255,255,0.6)" }} />
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
                            color: groupTotals.unreplenished > 0 ? "#F59E0B" : "rgba(255,255,255,0.5)",
                          }}
                        >
                          {groupTotals.unreplenished > 0 ? formatCurrency(groupTotals.unreplenished) : "-"}
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    </React.Fragment>
                  );
                })
              )}

              {/* Grand Total Row */}
              {pcfs.length > 0 && (
                <TableRow sx={{ bgcolor: "#1E293B" }}>
                  <TableCell sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "0.9rem", letterSpacing: "0.03em" }} colSpan={2}>
                    GRAND TOTAL
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: "#FFFFFF" }}>
                    {formatCurrency(totals.beginning)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: "#FFFFFF" }}>
                    {formatCurrency(totals.disbursements)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: "#FFFFFF" }}>
                    {formatCurrency(totals.replenishments)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: "#F59E0B", fontSize: "1rem" }}>
                    {formatCurrency(totals.ending)}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      fontWeight: 800,
                      color: totals.unreplenished > 0 ? "#F59E0B" : "rgba(255,255,255,0.4)",
                      fontSize: "0.9rem",
                    }}
                  >
                    {totals.unreplenished > 0 ? formatCurrency(totals.unreplenished) : "-"}
                  </TableCell>
                  <TableCell />
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
            bgcolor: "#F9FAFB",
            borderTop: "1px solid",
            borderColor: "divider",
            display: "flex",
            justifyContent: "flex-start",
          }}
        >
          <Stack direction="row" spacing={4}>
            <Box>
              <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Total Disbursements
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 700, color: "#991B1B" }}>
                -{formatCurrency(totals.disbursements)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Total Replenishments
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 700, color: "#166534" }}>
                +{formatCurrency(totals.replenishments)}
              </Typography>
            </Box>
            {hasUnreplenished && (
              <Box>
                <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Pending Replenishment
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 700, color: "#B45309" }}>
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
