// src/components/CashInBankTable.jsx
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
  Button,
  Chip,
  Collapse,
  IconButton,
  Tooltip,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import DownloadIcon from "@mui/icons-material/Download";
import { toCsv } from "../utils/csvUtils";

function formatCurrency(value) {
  return `₱${Number(value ?? 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function CashInBankTable({ 
  banks = [], 
  showExport = true,
  defaultExpanded = true 
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  // Calculate totals
  const totals = banks.reduce(
    (acc, bank) => ({
      beginning: acc.beginning + (bank.beginning ?? 0),
      collections: acc.collections + (bank.collections ?? 0),
      local_deposits: acc.local_deposits + (bank.local_deposits ?? 0),
      disbursements: acc.disbursements + (bank.disbursements ?? 0),
      fund_transfers_out: acc.fund_transfers_out + (bank.fund_transfers_out ?? 0),
      fund_transfers_in: acc.fund_transfers_in + (bank.fund_transfers_in ?? 0),
      adjustments: acc.adjustments + (bank.adjustments ?? 0),
      bank_charges: acc.bank_charges + (bank.bank_charges ?? 0),
      interbank_transfers: acc.interbank_transfers + (bank.interbank_transfers ?? 0),
      ending: acc.ending + (bank.ending ?? 0),
    }),
    {
      beginning: 0,
      collections: 0,
      local_deposits: 0,
      disbursements: 0,
      fund_transfers_out: 0,
      fund_transfers_in: 0,
      adjustments: 0,
      bank_charges: 0,
      interbank_transfers: 0,
      ending: 0,
    }
  );

  const handleExport = () => {
    const rows = [
      ["Particulars", "Account #", "Beginning", "Collections", "Local Deposits", "Disbursements", "Fund Transfer", "Fund Receipt", "Returned Checks", "Bank Charges", "Interbank Transfers", "Adjustments", "Ending"],
      ...banks.map(b => [
        b.particulars || b.name,
        b.account_number || "",
        b.beginning ?? 0,
        b.collections ?? 0,
        b.local_deposits ?? 0,
        b.disbursements ?? 0,
        b.fund_transfers_out ?? 0,
        b.fund_transfers_in ?? 0,
        b.adjustments ?? 0,
        b.bank_charges ?? 0,
        b.interbank_transfers ?? 0,
        b.adjustments ?? 0,
        b.ending ?? 0,
      ]),
      ["GRAND TOTAL", "", totals.beginning, totals.collections, totals.local_deposits, totals.disbursements, totals.fund_transfers_out, totals.fund_transfers_in, totals.adjustments, totals.bank_charges, totals.interbank_transfers, totals.adjustments, totals.ending],
    ];

    const csvContent = toCsv(rows);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cash-in-bank-${new Date().toISOString().slice(0, 10)}.csv`;
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
          <AccountBalanceIcon />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1rem" }}>
              CASH IN BANK
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              {banks.length} account{banks.length !== 1 ? "s" : ""}
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
            }}
          />
          {showExport && (
            <Tooltip title="Export CSV">
              <IconButton size="small" onClick={handleExport} sx={{ color: "white" }}>
                <DownloadIcon />
              </IconButton>
            </Tooltip>
          )}
          <IconButton
            size="small"
            onClick={() => setExpanded(!expanded)}
            sx={{ color: "white" }}
          >
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
                  Account #
                </TableCell>
                <TableCell align="right" sx={{ color: "white", fontWeight: 700, whiteSpace: "nowrap", bgcolor: "#1E293B" }}>
                  Beginning
                </TableCell>
                <TableCell align="right" sx={{ color: "white", fontWeight: 700, whiteSpace: "nowrap", bgcolor: "#1E293B" }}>
                  Collections
                </TableCell>
                <TableCell align="right" sx={{ color: "white", fontWeight: 700, whiteSpace: "nowrap", bgcolor: "#1E293B" }}>
                  Local Dep
                </TableCell>
                <TableCell align="right" sx={{ color: "white", fontWeight: 700, whiteSpace: "nowrap", bgcolor: "#1E293B" }}>
                  Disbursements
                </TableCell>
                <TableCell align="right" sx={{ color: "white", fontWeight: 700, whiteSpace: "nowrap", bgcolor: "#1E293B" }}>
                  Fund Transfer
                </TableCell>
                <TableCell align="right" sx={{ color: "white", fontWeight: 700, whiteSpace: "nowrap", bgcolor: "#1E293B" }}>
                  Fund Receipt
                </TableCell>
                <TableCell align="right" sx={{ color: "white", fontWeight: 700, whiteSpace: "nowrap", bgcolor: "#1E293B" }}>
                  Returned Chks
                </TableCell>
                <TableCell align="right" sx={{ color: "white", fontWeight: 700, whiteSpace: "nowrap", bgcolor: "#1E293B" }}>
                  Bank Charges
                </TableCell>
                <TableCell align="right" sx={{ color: "white", fontWeight: 700, whiteSpace: "nowrap", bgcolor: "#1E293B" }}>
                  Interbank Trans
                </TableCell>
                <TableCell align="right" sx={{ color: "white", fontWeight: 700, whiteSpace: "nowrap", bgcolor: "#1E293B" }}>
                  Adjustments
                </TableCell>
                <TableCell align="right" sx={{ color: "white", fontWeight: 700, whiteSpace: "nowrap", bgcolor: "#1E293B" }}>
                  Ending
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {banks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={13} align="center" sx={{ py: 4, color: "text.secondary" }}>
                    No bank accounts found
                  </TableCell>
                </TableRow>
              ) : (
                banks.map((bank, index) => (
                  <TableRow
                    key={bank.id || bank.bank_id || index}
                    sx={{
                      "&:hover": { bgcolor: "#F9FAFB" },
                      "&:nth-of-type(even)": { bgcolor: "#F9FAFB" },
                    }}
                  >
                    <TableCell sx={{ fontWeight: 500, whiteSpace: "nowrap", color: "#374151" }}>
                      {bank.particulars || bank.name || "Unnamed Bank"}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap", color: "#6B7280" }}>
                      {bank.account_number || "-"}
                    </TableCell>
                    <TableCell align="right" sx={{ color: "#6B7280" }}>{formatCurrency(bank.beginning ?? 0)}</TableCell>
                    <TableCell align="right" sx={{ color: "#166534" }}>
                      {formatCurrency(bank.collections ?? 0)}
                    </TableCell>
                    <TableCell align="right" sx={{ color: "#991B1B" }}>
                      {formatCurrency(bank.local_deposits ?? 0)}
                    </TableCell>
                    <TableCell align="right" sx={{ color: "#991B1B" }}>
                      {formatCurrency(bank.disbursements ?? 0)}
                    </TableCell>
                    <TableCell align="right" sx={{ color: "#991B1B" }}>
                      {formatCurrency(bank.fund_transfers_out ?? 0)}
                    </TableCell>
                    <TableCell align="right" sx={{ color: "#166534" }}>
                      {formatCurrency(bank.fund_transfers_in ?? 0)}
                    </TableCell>
                    <TableCell align="right" sx={{ color: "#B45309" }}>
                      {formatCurrency(bank.adjustments ?? 0)}
                    </TableCell>
                    <TableCell align="right" sx={{ color: "#991B1B" }}>
                      {formatCurrency(bank.bank_charges ?? 0)}
                    </TableCell>
                    <TableCell align="right" sx={{ color: "#6B7280" }}>
                      {formatCurrency(bank.interbank_transfers ?? 0)}
                    </TableCell>
                    <TableCell align="right" sx={{ color: "#6B7280" }}>
                      {formatCurrency(bank.adjustments ?? 0)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: "#1E293B" }}>
                      {formatCurrency(bank.ending ?? 0)}
                    </TableCell>
                  </TableRow>
                ))
              )}

              {/* Grand Total Row */}
              {banks.length > 0 && (
                <TableRow sx={{ bgcolor: "#1E293B" }}>
                  <TableCell sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "0.9rem", letterSpacing: "0.03em" }}>
                    GRAND TOTAL
                  </TableCell>
                  <TableCell sx={{ color: "rgba(255,255,255,0.6)" }} />
                  <TableCell align="right" sx={{ fontWeight: 700, color: "#FFFFFF" }}>
                    {formatCurrency(totals.beginning)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: "#FFFFFF" }}>
                    {formatCurrency(totals.collections)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: "#FFFFFF" }}>
                    {formatCurrency(totals.local_deposits)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: "#FFFFFF" }}>
                    {formatCurrency(totals.disbursements)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: "#FFFFFF" }}>
                    {formatCurrency(totals.fund_transfers_out)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: "#FFFFFF" }}>
                    {formatCurrency(totals.fund_transfers_in)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: "#FFFFFF" }}>
                    {formatCurrency(totals.adjustments)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: "#FFFFFF" }}>
                    {formatCurrency(totals.bank_charges)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: "#FFFFFF" }}>
                    {formatCurrency(totals.interbank_transfers)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: "#FFFFFF" }}>
                    {formatCurrency(totals.adjustments)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: "#F59E0B", fontSize: "1.1rem" }}>
                    {formatCurrency(totals.ending)}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
      </Collapse>

      {/* Footer with quick stats */}
      {expanded && banks.length > 0 && (
        <Box
          sx={{
            p: 1.5,
            bgcolor: "#F9FAFB",
            borderTop: "1px solid",
            borderColor: "divider",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <Stack direction="row" spacing={3}>
            <Box>
              <Typography variant="caption" sx={{ color: "#6B7280" }}>
                Total Inflows
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: "#166534" }}>
                +{formatCurrency(totals.collections + totals.local_deposits)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: "#6B7280" }}>
                Total Outflows
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: "#991B1B" }}>
                -{formatCurrency(totals.disbursements + totals.bank_charges)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: "#6B7280" }}>
                Net Movement
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 700,
                  color:
                    totals.collections + totals.local_deposits - totals.disbursements - totals.bank_charges >= 0
                      ? "#166534"
                      : "#991B1B",
                }}
              >
                {totals.collections + totals.local_deposits - totals.disbursements - totals.bank_charges >= 0 ? "+" : ""}
                {formatCurrency(
                  totals.collections + totals.local_deposits - totals.disbursements - totals.bank_charges
                )}
              </Typography>
            </Box>
          </Stack>
        </Box>
      )}
    </Paper>
  );
}
