// src/components/CashOnHandCollections.jsx
import React, { useState, useEffect, useCallback } from "react";
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
  Button,
  CircularProgress,
  Alert,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import RefreshIcon from "@mui/icons-material/Refresh";
import LocalAtmIcon from "@mui/icons-material/LocalAtm";
import api from "../services/tokenService";

function formatCurrency(value) {
  const num = Number(value ?? 0);
  if (isNaN(num)) return "₱0.00";
  return `₱${num.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function isoDateOffset(baseIso, offsetDays) {
  const d = new Date(baseIso);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function CollectionsHistory({ defaultExpanded = false }) {
  const todayIso = new Date().toISOString().slice(0, 10);
  const defaultCenter = isoDateOffset(todayIso, -1);
  const [centerDate, setCenterDate] = useState(defaultCenter);
  const [dataMap, setDataMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [expanded, setExpanded] = useState(defaultExpanded);

  const computeRange = (centerIso) => {
    const dates = [];
    // Show 7 days: 3 days before, current day, 3 days after
    for (let i = -3; i <= 3; i++) {
      dates.push(isoDateOffset(centerIso, i));
    }
    return { dates };
  };

  const fetchRange = useCallback(async (centerIso) => {
    setLoading(true);
    setMessage(null);
    const { dates } = computeRange(centerIso);
    try {
      const results = [];
      const errors = [];

      for (const d of dates) {
        try {
          const res = await api.get("/summary/detailed-daily/", { params: { date: d } });
          results.push(res.data ?? res);
        } catch (err) {
          errors.push({ date: d, error: err });
          results.push({ cash_collections: [] });
        }
      }

      if (errors.length > 0) {
        const errorMsg = errors.map(e => `${e.date}: ${e.error?.response?.data?.detail || e.error?.message || 'Failed'}`).join('; ');
        setMessage({ type: "error", text: `Failed to load some data: ${errorMsg}` });
      }

      const out = {};
      dates.forEach((d, i) => {
        const payload = results[i] || { cash_collections: [] };
        const collectionRows = Array.isArray(payload.cash_collections) && payload.cash_collections.length > 0
          ? payload.cash_collections
          : [];
        out[d] = { collections: collectionRows, date: d };
      });
      setDataMap(out);
    } catch (err) {
      console.error("Failed to fetch collections history", err);
      setMessage({ type: "error", text: "Failed to load collections history data." });
      setDataMap({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (expanded) {
      fetchRange(centerDate);
    }
  }, [centerDate, fetchRange, expanded]);

  const goPrev = () => setCenterDate((d) => isoDateOffset(d, -1));
  const goNext = () => setCenterDate((d) => isoDateOffset(d, 1));
  const refresh = () => fetchRange(centerDate);

  const { dates } = computeRange(centerDate);

  const totalsFor = (dateIso) => {
    const dayData = dataMap[dateIso] || { collections: [] };
    const rows = Array.isArray(dayData.collections) ? dayData.collections : [];
    return rows.reduce(
      (acc, r) => {
        acc.beginning += Number(r.beginning ?? 0);
        acc.collections += Number(r.collections ?? 0);
        acc.local_deposits += Number(r.local_deposits ?? 0);
        acc.ending += Number(r.ending ?? 0);
        return acc;
      },
      { beginning: 0, collections: 0, local_deposits: 0, ending: 0 }
    );
  };

  return (
    <Paper sx={{ p: 2, mt: 2, borderRadius: 1, border: "1px solid", borderColor: "#E5E7EB", bgcolor: "#FFFFFF" }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#1E293B" }}>
            Collections History - 7 Day Range
          </Typography>
          <Typography variant="caption" sx={{ color: "#6B7280" }}>
            Center date: <strong>{centerDate}</strong>
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Stack direction="row" spacing={1} alignItems="center" sx={{ ml: 1 }}>
            {dates.map((date, index) => (
              <Chip 
                key={date}
                label={date} 
                size="small" 
                variant={date === centerDate ? "filled" : "outlined"}
                sx={{ 
                  borderColor: date === centerDate ? "#1E293B" : "#E5E7EB", 
                  color: date === centerDate ? "#1E293B" : "#6B7280",
                  bgcolor: date === centerDate ? "#F1F5F9" : "transparent",
                  fontWeight: date === centerDate ? 600 : 400
                }} 
              />
            ))}
          </Stack>
          <IconButton size="small" onClick={goPrev} aria-label="previous day" sx={{ color: "#475569" }}>
            <ArrowBackIosNewIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={goNext} aria-label="next day" sx={{ color: "#475569" }}>
            <ArrowForwardIosIcon fontSize="small" />
          </IconButton>
          <Button size="small" onClick={refresh} disabled={loading} variant="contained" sx={{ bgcolor: "#1E293B" }}>
            Refresh
          </Button>
        </Stack>
      </Stack>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress /></Box>
      ) : (
        <>
          {message && <Alert severity={message.type} sx={{ mb: 2 }}>{message.text}</Alert>}
          <Stack spacing={2}>
            {dates.map((dateIso) => {
              const dayData = dataMap[dateIso] || { collections: [] };
              const rows = Array.isArray(dayData.collections) ? dayData.collections : [];
              const totals = totalsFor(dateIso);
              const isToday = dateIso === centerDate;
              return (
                <Paper 
                  key={dateIso}
                  variant="outlined" 
                  sx={{ 
                    p: 2, 
                    height: "100%", 
                    borderRadius: 1,
                    border: "1px solid",
                    borderColor: isToday ? "#1E293B" : "#E5E7EB",
                    bgcolor: isToday ? "#F8FAFB" : "white"
                  }}
                >
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700, color: isToday ? "#1E293B" : "#374151" }}>
                        {dateIso}
                      </Typography>
                      {isToday && <Chip label="TODAY" size="small" sx={{ height: 18, fontSize: "0.65rem", bgcolor: "#1E293B", color: "white" }} />}
                    </Box>
                  </Box>
                  <Box sx={{ width: "100%", overflowX: "auto" }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ color: "white", fontWeight: 700, whiteSpace: "nowrap", minWidth: 180, bgcolor: "#1E293B", py: 0.75 }}>Particulars</TableCell>
                        <TableCell align="right" sx={{ color: "white", fontWeight: 700, whiteSpace: "nowrap", bgcolor: "#1E293B", py: 0.75 }}>Beginning</TableCell>
                        <TableCell align="right" sx={{ color: "white", fontWeight: 700, whiteSpace: "nowrap", bgcolor: "#1E293B", py: 0.75 }}>Collections</TableCell>
                        <TableCell align="right" sx={{ color: "white", fontWeight: 700, whiteSpace: "nowrap", bgcolor: "#1E293B", py: 0.75 }}>Local Deposits</TableCell>
                        <TableCell align="right" sx={{ color: "white", fontWeight: 700, whiteSpace: "nowrap", bgcolor: "#1E293B", py: 0.75 }}>Ending</TableCell>
                        <TableCell sx={{ color: "white", fontWeight: 700, bgcolor: "#1E293B", py: 0.75, minWidth: 280 }}>Transactions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ py: 3, color: "text.secondary" }}>
                            No collections data
                          </TableCell>
                        </TableRow>
                      ) : (
                        rows.map((r, idx) => (
                          <TableRow key={r.bank_id ?? `${r.name}-${r.account_number}-${idx}`} sx={{ "&:hover": { bgcolor: "#F9FAFB" }, "&:nth-of-type(even)": { bgcolor: "#F9FAFB" } }}>
                            <TableCell sx={{ fontWeight: 600, whiteSpace: "nowrap", pl: 3, color: "#374151" }}>
                              {r.name}
                              <Typography variant="caption" display="block" sx={{ color: "#9CA3AF", fontSize: "0.7rem" }}>
                                {r.account_number ?? ""}
                              </Typography>
                            </TableCell>
                            <TableCell align="right" sx={{ color: "#6B7280" }}>{formatCurrency(r.beginning ?? 0)}</TableCell>
                            <TableCell align="right" sx={{ color: "#166534", fontWeight: 500 }}>{formatCurrency(r.collections ?? 0)}</TableCell>
                            <TableCell align="right" sx={{ color: "#991B1B", fontWeight: 500 }}>{formatCurrency(r.local_deposits ?? 0)}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700, color: "#1E293B" }}>{formatCurrency(r.ending ?? 0)}</TableCell>
                            <TableCell sx={{ color: "#6B7280" }}>
                              {(r.transactions || []).map((t, i) => (
                                <Chip 
                                  key={i}
                                  label={t.collection_type === "cash" ? "Cash" : t.collection_type === "bank_transfer" ? "Bank Transfer" : t.collection_type === "check" ? "Check/PDC" : "-"}
                                  size="small"
                                  sx={{ 
                                    mr: 0.25, 
                                    mb: 0.25,
                                    height: 18, 
                                    fontSize: "0.6rem",
                                    bgcolor: t.collection_type === "cash" ? "#DCFCE7" : t.collection_type === "bank_transfer" ? "#DBEAFE" : t.collection_type === "check" ? "#FEF3C7" : "#F3F4F6",
                                    color: t.collection_type === "cash" ? "#166534" : t.collection_type === "bank_transfer" ? "#1D4ED8" : t.collection_type === "check" ? "#92400E" : "#6B7280",
                                  }}
                                />
                              ))}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                      <TableRow sx={{ bgcolor: "#F1F5F9", borderTop: "2px solid #E5E7EB" }}>
                        <TableCell sx={{ fontWeight: 700, fontSize: "0.8rem", color: "#1E293B" }}>TOTALS</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, color: "#6B7280", fontSize: "0.8rem" }}>{formatCurrency(totals.beginning)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, color: "#166534", fontSize: "0.8rem" }}>{formatCurrency(totals.collections)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, color: "#991B1B", fontSize: "0.8rem" }}>{formatCurrency(totals.local_deposits)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: "#1E293B", fontSize: "0.9rem" }}>{formatCurrency(totals.ending)}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                  </Box>
                </Paper>
              );
            })}
          </Stack>
        </>
      )}
    </Paper>
  );
}

// Transaction Row Component - strictly maps to 6 columns
function CollectionTransactionRow({ transaction }) {
  const isCollection = transaction.type === "collections";
  const isLocalDeposit = transaction.type === "local_deposits";
  const hasUnfundedWarning = transaction.unfunded_warning != null;
  const collectionType = transaction.collection_type;

  let color = "#6B7280";
  let label = transaction.type;

  if (isCollection) {
    color = "#166534";
    label = "Collection";
  } else if (isLocalDeposit) {
    color = "#991B1B";
    label = "Local Deposit";
  }

  if (hasUnfundedWarning) {
    color = "#D97706";
  }

  const destLabel = collectionType === "cash" ? "Cash" : collectionType === "bank_transfer" ? "Bank" : collectionType === "check" ? "Check/PDC" : "-";
  const destColor = collectionType === "cash" ? "#166534" : collectionType === "bank_transfer" ? "#1D4ED8" : collectionType === "check" ? "#92400E" : "#6B7280";

  const amountPrefix = isCollection ? "+" : isLocalDeposit ? "-" : "";

  return (
    <TableRow
      sx={{
        bgcolor: "#FFFFFF",
        "&:hover": { bgcolor: "#F3F4F6" },
      }}
    >
      {/* Column 1: Particulars */}
      <TableCell sx={{ pl: 6, color: "#6B7280", fontSize: "0.75rem" }}>
        {transaction.date}
      </TableCell>
      {/* Column 2: Beginning - empty placeholder */}
      <TableCell />
      {/* Column 3: Collections - show amount here */}
      <TableCell
        align="right"
        sx={{
          color: color,
          fontWeight: 600,
          fontSize: "0.8rem",
        }}
      >
        {amountPrefix}{formatCurrency(transaction.amount)}
      </TableCell>
      {/* Column 4: Local Deposits - empty placeholder */}
      <TableCell />
      {/* Column 5: Ending - empty placeholder */}
      <TableCell />
      {/* Column 6: Transactions - far right, always */}
      <TableCell sx={{ fontSize: "0.75rem", color: "#374151" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
          <Chip
            label={destLabel}
            size="small"
            sx={{
              height: 18,
              fontSize: "0.65rem",
              fontWeight: 600,
              bgcolor: collectionType === "cash" ? "#DCFCE7" : collectionType === "bank_transfer" ? "#DBEAFE" : collectionType === "check" ? "#FEF3C7" : "#F3F4F6",
              color: destColor,
            }}
          />
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
          {hasUnfundedWarning && (
            <Typography
              variant="caption"
              sx={{
                color: "#D97706",
                fontWeight: 700,
                bgcolor: "#FEF3C7",
                px: 0.5,
                py: 0.25,
                borderRadius: 0.5,
                display: "inline-flex",
                alignItems: "center",
                gap: 0.25,
              }}
            >
              ⚠️ UNFUNDED
            </Typography>
          )}
        </Box>
      </TableCell>
    </TableRow>
  );
}

export default function CashOnHandCollections({ 
  showExport = false, 
  defaultExpanded = true,
  selectedDate = null 
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [loading, setLoading] = useState(true);
  const [collections, setCollections] = useState([]);
  const [banks, setBanks] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [summary, setSummary] = useState({
    totalBeginning: 0,
    totalCollections: 0,
    totalLocalDeposits: 0,
    totalEnding: 0
  });

  // New collections from API
  const [apiCollections, setApiCollections] = useState([]);
  const [apiLoading, setApiLoading] = useState(true);

  const fetchApiCollections = useCallback(async () => {
    setApiLoading(true);
    try {
      const res = await api.get("/api/collections/");
      const data = res.data || res;
      setApiCollections(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.error("Failed to fetch collections", err);
      setApiCollections([]);
    } finally {
      setApiLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApiCollections();
  }, [fetchApiCollections]);

  const today = selectedDate || new Date().toISOString().slice(0, 10);

  // Fetch banks for deposit dialog
  const fetchBanks = useCallback(async () => {
    try {
      const res = await api.get("/api/bankaccounts/");
      const data = res.data || res;
      setBanks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch banks", err);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/summary/detailed-daily/", {
        params: { date: today }
      });
      
      const data = response.data || response;
      const collectionsData = data.cash_collections || [];
      
      setCollections(collectionsData);

      // Calculate totals
      const totals = collectionsData.reduce(
        (acc, col) => ({
          totalBeginning: acc.totalBeginning + (col.beginning ?? 0),
          totalCollections: acc.totalCollections + (col.collections ?? 0),
          totalLocalDeposits: acc.totalLocalDeposits + (col.local_deposits ?? 0),
          totalEnding: acc.totalEnding + (col.ending ?? 0),
        }),
        { totalBeginning: 0, totalCollections: 0, totalLocalDeposits: 0, totalEnding: 0 }
      );
      
      setSummary(totals);
    } catch (error) {
      console.error("Error fetching collections data:", error);
      setCollections([]);
      setSummary({ totalBeginning: 0, totalCollections: 0, totalLocalDeposits: 0, totalEnding: 0 });
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <Paper elevation={0} sx={{ borderRadius: 1, border: "1px solid", borderColor: "#E5E7EB", p: 2 }}>
        <Typography>Loading collections data...</Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={0} sx={{ borderRadius: 1, border: "1px solid", borderColor: "#E5E7EB", overflow: "hidden", maxWidth: "100%" }}>
      {/* Header */}
      <Box
        onClick={() => setExpanded(!expanded)}
        sx={{
          p: 2,
          bgcolor: "#1E293B",
          borderBottom: expanded ? "1px solid #E5E7EB" : "none",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
          color: "white",
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          <ReceiptLongIcon sx={{ fontSize: 28, color: "white" }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1.1rem", color: "white" }}>
              Collections
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9, color: "rgba(255,255,255,0.8)" }}>
              {collections.length} bank{collections.length !== 1 ? "s" : ""} • {formatCurrency(summary.totalEnding)} total
            </Typography>
          </Box>
</Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            label={`Total: ${formatCurrency(summary.totalEnding)}`}
            size="small"
            sx={{
              bgcolor: "rgba(255,255,255,0.2)",
              color: "white",
              fontWeight: 700,
              backdropFilter: "blur(4px)",
            }}
          />
          <IconButton size="small" onClick={() => setExpanded(!expanded)} sx={{ color: "white" }}>
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Stack>
    </Box>

    <Collapse in={expanded}>
        {/* View History Button */}
        <Box sx={{ px: 2, py: 1, display: "flex", justifyContent: "flex-end", borderBottom: "1px solid #E5E7EB" }}>
          <Button 
            variant="outlined" 
            size="small" 
            onClick={() => setShowHistory(!showHistory)}
            sx={{ 
              borderColor: "#D1D5DB", 
              color: "#475569",
              textTransform: "none",
              "&:hover": { bgcolor: "#F3F4F6", borderColor: "#9CA3AF" }
            }}
          >
            {showHistory ? "Hide History" : "View History"}
          </Button>
        </Box>

        {showHistory && (
          <CollectionsHistory defaultExpanded={true} />
        )}

        {!showHistory && (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: "white", fontWeight: 700, whiteSpace: "nowrap", minWidth: 180, bgcolor: "#1E293B" }}>Particulars</TableCell>
                <TableCell align="right" sx={{ color: "white", fontWeight: 700, whiteSpace: "nowrap", bgcolor: "#1E293B" }}>Beginning</TableCell>
                <TableCell align="right" sx={{ color: "white", fontWeight: 700, whiteSpace: "nowrap", bgcolor: "#1E293B" }}>Collections</TableCell>
                <TableCell align="right" sx={{ color: "white", fontWeight: 700, whiteSpace: "nowrap", bgcolor: "#1E293B" }}>Local Deposits</TableCell>
                <TableCell align="right" sx={{ color: "white", fontWeight: 700, whiteSpace: "nowrap", bgcolor: "#1E293B" }}>Ending</TableCell>
                <TableCell sx={{ color: "white", fontWeight: 700, bgcolor: "#1E293B", minWidth: 250 }}>Transactions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {collections.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4, color: "#9CA3AF" }}>
                    No collections data for this date
                  </TableCell>
                </TableRow>
              ) : (
                collections.map((col, idx) => (
                  <React.Fragment key={col.bank_id || idx}>
                    <TableRow sx={{ "&:hover": { bgcolor: "#F9FAFB" }, "&:nth-of-type(even)": { bgcolor: "#F9FAFB" } }}>
                      <TableCell sx={{ fontWeight: 600, whiteSpace: "nowrap", pl: 3, color: "#374151" }}>
                        {col.name}
                        <Typography variant="caption" display="block" sx={{ color: "#9CA3AF", fontSize: "0.7rem" }}>
                          {col.account_number}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ color: "#6B7280" }}>{formatCurrency(col.beginning)}</TableCell>
                      <TableCell align="right" sx={{ color: "#166534", fontWeight: 500 }}>{formatCurrency(col.collections)}</TableCell>
                      <TableCell align="right" sx={{ color: "#991B1B", fontWeight: 500 }}>{formatCurrency(col.local_deposits)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: "#1E293B" }}>{formatCurrency(col.ending)}</TableCell>
                      <TableCell sx={{ fontSize: "0.75rem", color: "#6B7280" }}>
                        {col.transactions && col.transactions.length > 0 
                          ? `${col.transactions.length} ${col.transactions.length === 1 ? 'txn' : 'txns'}` 
                          : <Typography variant="caption" sx={{ color: "#9CA3AF", fontStyle: "italic" }}>No transactions</Typography>}
                      </TableCell>
                    </TableRow>
                    {/* Transaction rows */}
                    {col.transactions && col.transactions.length > 0 && (
                      col.transactions.map((txn, txnIdx) => (
                        <CollectionTransactionRow key={txn.id || txnIdx} transaction={txn} />
                      ))
                    )}
                  </React.Fragment>
                ))
              )}

              {/* Summary Row */}
              <TableRow sx={{ bgcolor: "#1E293B" }}>
                <TableCell sx={{ fontWeight: 800, color: "#FFFFFF", fontSize: "0.85rem", letterSpacing: "0.03em", pl: 3 }}>
                  GRAND TOTAL
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: "#FFFFFF" }}>{formatCurrency(summary.totalBeginning)}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: "#FFFFFF" }}>{formatCurrency(summary.totalCollections)}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: "#FFFFFF" }}>{formatCurrency(summary.totalLocalDeposits)}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, color: "#F59E0B", fontSize: "0.9rem" }}>{formatCurrency(summary.totalEnding)}</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </Collapse>

      
          </Paper>
  );
}
