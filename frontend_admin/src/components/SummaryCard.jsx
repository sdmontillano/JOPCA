// src/components/SummaryCard.jsx
import React, { useState } from "react";
import {
  Paper,
  Typography,
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Button,
  Stack,
  Divider,
  Chip,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import WalletIcon from "@mui/icons-material/Wallet";
import ReceiptIcon from "@mui/icons-material/Receipt";
import LocalAtmIcon from "@mui/icons-material/LocalAtm";

function formatCurrency(value) {
  return `₱${Number(value ?? 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function SummaryCard({
  title,
  subtitle,
  icon,
  items = [],
  total,
  totalLabel = "Total",
  onViewAll,
  viewAllLabel = "View Details",
  defaultExpanded = true,
  color = "primary.main",
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const handleChange = (event, isExpanded) => {
    setExpanded(isExpanded);
  };

  return (
    <Paper
      sx={{
        borderRadius: 2,
        boxShadow: 2,
        overflow: "hidden",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{
          p: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          bgcolor: `${color}10`,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          {icon && (
            <Box
              sx={{
                p: 1,
                borderRadius: 1.5,
                bgcolor: `${color}20`,
                color: color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {icon}
            </Box>
          )}
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1rem" }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
        </Stack>

        {onViewAll && (
          <Button
            size="small"
            endIcon={<ArrowForwardIcon fontSize="small" />}
            onClick={onViewAll}
            sx={{ textTransform: "none" }}
          >
            {viewAllLabel}
          </Button>
        )}
      </Box>

      <Accordion
        expanded={expanded}
        onChange={handleChange}
        disableGutters
        sx={{
          boxShadow: "none",
          "&:before": { display: "none" },
          flex: 1,
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          sx={{
            minHeight: 48,
            "& .MuiAccordionSummary-content": { my: 1 },
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              label={expanded ? "Hide Details" : "Show Details"}
              size="small"
              variant="outlined"
            />
          </Stack>
        </AccordionSummary>

        <AccordionDetails sx={{ pt: 0 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, fontSize: "0.75rem" }}>Name</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, fontSize: "0.75rem" }}>
                  Balance
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} align="center">
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                      No data available
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item, index) => (
                  <TableRow
                    key={item.id || index}
                    sx={{
                      "&:hover": { bgcolor: "action.hover" },
                      cursor: item.onClick ? "pointer" : "default",
                    }}
                    onClick={item.onClick}
                  >
                    <TableCell>
                      <Stack direction="column" spacing={0}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {item.name}
                        </Typography>
                        {item.subtitle && (
                          <Typography variant="caption" color="text.secondary">
                            {item.subtitle}
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell align="right">
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: item.highlight ? 700 : 500,
                          color: item.color || "text.primary",
                        }}
                      >
                        {formatCurrency(item.value)}
                      </Typography>
                      {item.change && (
                        <Typography
                          variant="caption"
                          sx={{
                            color: item.change >= 0 ? "success.main" : "error.main",
                          }}
                        >
                          {item.change >= 0 ? "+" : ""}
                          {item.change.toFixed(1)}%
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {total !== undefined && total !== null && (
            <>
              <Divider sx={{ my: 1.5 }} />
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  px: 1,
                  pb: 1,
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {totalLabel}
                </Typography>
                <Typography
                  variant="body1"
                  sx={{ fontWeight: 800, color: color }}
                >
                  {formatCurrency(total)}
                </Typography>
              </Box>
            </>
          )}
        </AccordionDetails>
      </Accordion>
    </Paper>
  );
}

// Preset components for common use cases
export function BankSummaryCard({ banks = [], onViewAll }) {
  const total = banks.reduce((sum, b) => sum + (b.balance ?? 0), 0);

  return (
    <SummaryCard
      title="Cash in Bank"
      subtitle="All bank accounts"
      icon={<AccountBalanceIcon fontSize="small" />}
      items={banks.map((bank) => ({
        id: bank.id,
        name: bank.name || "Unnamed Bank",
        subtitle: bank.account_number,
        value: bank.balance,
      }))}
      total={total}
      totalLabel="Total Cash in Bank"
      onViewAll={onViewAll}
      viewAllLabel="View All"
      color="primary.main"
    />
  );
}

export function PcfSummaryCard({ pcfs = [], onViewAll }) {
  const total = pcfs.reduce((sum, p) => sum + (p.ending ?? 0), 0);
  const totalUnrep = pcfs.reduce((sum, p) => sum + (p.unreplenished ?? 0), 0);

  return (
    <SummaryCard
      title="Petty Cash Fund"
      subtitle="PCF balances"
      icon={<WalletIcon fontSize="small" />}
      items={pcfs.map((pcf) => ({
        id: pcf.id,
        name: pcf.name || pcf.particulars || "Unnamed PCF",
        subtitle: pcf.location_display || pcf.location,
        value: pcf.ending,
        color: (pcf.unreplenished ?? 0) > 0 ? "warning.main" : undefined,
      }))}
      total={total}
      totalLabel="Total PCF"
      onViewAll={onViewAll}
      viewAllLabel="Manage PCF"
      color="secondary.main"
    />
  );
}

export function PdcSummaryCard({ pdc = {}, onViewAll }) {
  const items = [
    { id: 1, name: "This Month", value: pdc.this_month || 0 },
    { id: 2, name: "Next Month", value: pdc.next_month || 0 },
    { id: 3, name: "Total Outstanding", value: pdc.total || 0 },
  ];

  return (
    <SummaryCard
      title="Post-Dated Checks"
      subtitle="PDC Summary"
      icon={<ReceiptIcon fontSize="small" />}
      items={items}
      total={pdc.total || 0}
      totalLabel="Total PDC"
      onViewAll={onViewAll}
      viewAllLabel="View PDC"
      color="info.main"
    />
  );
}
