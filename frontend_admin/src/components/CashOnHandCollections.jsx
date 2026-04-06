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
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import RefreshIcon from "@mui/icons-material/Refresh";
import api from "../services/tokenService";

function formatCurrency(value) {
  return `₱${Number(value ?? 0).toLocaleString("en-PH", {
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
    const prev = isoDateOffset(centerIso, -1);
    return { dates: [prev, centerIso] };
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
            Collections History — Yesterday & Previous Day
          </Typography>
          <Typography variant="caption" sx={{ color: "#6B7280" }}>
            Center (yesterday): <strong>{centerDate}</strong>
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Stack direction="row" spacing={1} alignItems="center" sx={{ ml: 1 }}>
            <Chip label={dates[0]} size="small" variant="outlined" sx={{ borderColor: "#E5E7EB", color: "#6B7280" }} />
            <Chip 
              label={dates[1]} 
              size="small" 
              sx={{ 
                borderColor: "#1E293B", 
                color: "#1E293B", 
                bgcolor: "#F1F5F9",
                fontWeight: 600
              }} 
            />
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
          <Button 
            variant="outlined" 
            size="small" 
            onClick={() => setExpanded(false)} 
            sx={{ textTransform: "none", px: 2, borderColor: "#D1D5DB", color: "#475569" }}
          >
            Close
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
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ color: "white", fontWeight: 700, fontSize: "0.7rem", bgcolor: "#1E293B" }}>Particulars</TableCell>
                        <TableCell sx={{ color: "white", fontWeight: 700, fontSize: "0.7rem", bgcolor: "#1E293B" }}>Location</TableCell>
                        <TableCell align="right" sx={{ color: "white", fontWeight: 700, fontSize: "0.7rem", bgcolor: "#1E293B" }}>Beginning</TableCell>
                        <TableCell align="right" sx={{ color: "white", fontWeight: 700, fontSize: "0.7rem", bgcolor: "#1E293B" }}>Collections</TableCell>
                        <TableCell align="right" sx={{ color: "white", fontWeight: 700, fontSize: "0.7rem", bgcolor: "#1E293B" }}>Local Deposits</TableCell>
                        <TableCell align="right" sx={{ color: "white", fontWeight: 700, fontSize: "0.7rem", bgcolor: "#1E293B" }}>Ending</TableCell>
                        <TableCell sx={{ color: "white", fontWeight: 700, fontSize: "0.7rem", bgcolor: "#1E293B" }}>Transactions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} align="center" sx={{ py: 3, color: "text.secondary" }}>
                            No collections data
                          </TableCell>
                        </TableRow>
                      ) : (
                        rows.map((r, idx) => (
                          <TableRow key={r.bank_id ?? `${r.name}-${r.account_number}-${idx}`} sx={{ "&:hover": { bgcolor: "#F9FAFB" } }}>
                            <TableCell sx={{ fontWeight: 500, fontSize: "0.8rem", color: "#374151" }}>
                              {r.name}
                              <Typography variant="caption" display="block" sx={{ color: "#9CA3AF", fontSize: "0.7rem" }}>
                                {r.account_number ?? ""}
                              </Typography>
                            </TableCell>
                            <TableCell sx={{ fontWeight: 500, fontSize: "0.8rem", color: "#374151" }}>{r.location}</TableCell>
                            <TableCell align="right" sx={{ fontSize: "0.8rem", color: "#6B7280" }}>{formatCurrency(r.beginning ?? 0)}</TableCell>
                            <TableCell align="right" sx={{ fontSize: "0.8rem", color: "#166534" }}>{formatCurrency(r.collections ?? 0)}</TableCell>
                            <TableCell align="right" sx={{ fontSize: "0.8rem", color: "#991B1B" }}>{formatCurrency(r.local_deposits ?? 0)}</TableCell>
                            <TableCell align="right" sx={{ fontSize: "0.8rem", fontWeight: 700, color: "#1E293B" }}>{formatCurrency(r.ending ?? 0)}</TableCell>
                            <TableCell sx={{ fontSize: "0.8rem", color: "#6B7280" }}>
                              {r.transactions && r.transactions.length > 0 ? `${r.transactions.length} txns` : "No txns"}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                      <TableRow sx={{ bgcolor: "#F1F5F9", borderTop: "2px solid #E5E7EB" }}>
                        <TableCell sx={{ fontWeight: 700, fontSize: "0.8rem", color: "#1E293B" }}>TOTALS</TableCell>
                        <TableCell></TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, color: "#6B7280", fontSize: "0.8rem" }}>{formatCurrency(totals.beginning)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, color: "#166534", fontSize: "0.8rem" }}>{formatCurrency(totals.collections)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, color: "#991B1B", fontSize: "0.8rem" }}>{formatCurrency(totals.local_deposits)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: "#1E293B", fontSize: "0.9rem" }}>{formatCurrency(totals.ending)}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </Paper>
              );
            })}
          </Stack>
        </>
      )}
    </Paper>
  );
}

// Transaction Row Component
function CollectionTransactionRow({ transaction }) {
  const isCollection = transaction.type === "collections";
  const isLocalDeposit = transaction.type === "local_deposits";

  let color = "#6B7280";
  let label = transaction.type;

  if (isCollection) {
    color = "#166534";
    label = "Collection";
  } else if (isLocalDeposit) {
    color = "#991B1B";
    label = "Local Deposit";
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
      <TableCell />
      <TableCell
        align="right"
        sx={{
          color: color,
          fontWeight: 600,
          fontSize: "0.8rem",
        }}
      >
        {isCollection && "+"}
        {isLocalDeposit && "-"}
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

export default function CashOnHandCollections({ 
  showExport = false, 
  defaultExpanded = true,
  selectedDate = null 
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [loading, setLoading] = useState(true);
  const [collections, setCollections] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [summary, setSummary] = useState({
    totalBeginning: 0,
    totalCollections: 0,
    totalLocalDeposits: 0,
    totalEnding: 0
  });

  const today = selectedDate || new Date().toISOString().slice(0, 10);

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
    <Paper elevation={0} sx={{ borderRadius: 1, border: "1px solid", borderColor: "#E5E7EB", overflow: "hidden" }}>
      {/* Header */}
      <Box
        onClick={() => setExpanded(!expanded)}
        sx={{
          px: 2,
          py: 1.5,
          bgcolor: "#FEF3C7",
          borderBottom: expanded ? "1px solid #E5E7EB" : "none",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
          "&:hover": { bgcolor: "#FDE68A" }
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <ReceiptLongIcon sx={{ color: "#92400E", fontSize: 20 }} />
          <Typography variant="body2" sx={{ fontWeight: 700, color: "#92400E", textTransform: "uppercase", letterSpacing: "0.03em" }}>
            Cash on Hand - Collections
          </Typography>
          {collections.length > 0 && (
            <Chip 
              label={`${collections.length} ${collections.length === 1 ? 'bank' : 'banks'}`} 
              size="small" 
              sx={{ bgcolor: "#92400E", color: "white", height: 20, fontSize: "0.65rem" }} 
            />
          )}
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Stack direction="row" spacing={2} sx={{ display: { xs: "none", md: "flex" } }}>
            <Typography variant="body2" sx={{ color: "#166534", fontWeight: 600 }}>
              Collections: {formatCurrency(summary.totalCollections)}
            </Typography>
            <Typography variant="body2" sx={{ color: "#991B1B", fontWeight: 600 }}>
              Local Deposits: {formatCurrency(summary.totalLocalDeposits)}
            </Typography>
            <Typography variant="body2" sx={{ color: "#1E293B", fontWeight: 700 }}>
              Ending: {formatCurrency(summary.totalEnding)}
            </Typography>
          </Stack>
          <IconButton size="small">
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>
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
              <TableRow sx={{ bgcolor: "#F9FAFB" }}>
                <TableCell sx={{ fontWeight: 600, color: "#374151" }}>Particulars</TableCell>
                <TableCell sx={{ fontWeight: 600, color: "#374151" }}>Location</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, color: "#374151" }}>Beginning</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, color: "#374151" }}>Collections</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, color: "#374151" }}>Local Deposits</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, color: "#374151" }}>Ending</TableCell>
                <TableCell sx={{ fontWeight: 600, color: "#374151" }}>Transactions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {collections.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: "#9CA3AF" }}>
                    No collections data for this date
                  </TableCell>
                </TableRow>
              ) : (
                collections.map((col, idx) => (
                  <React.Fragment key={col.bank_id || idx}>
                    <TableRow sx={{ "&:hover": { bgcolor: "#F3F4F6" } }}>
                      <TableCell sx={{ fontWeight: 500, color: "#374151" }}>
                        {col.name}
                        <Typography variant="caption" display="block" sx={{ color: "#9CA3AF", fontSize: "0.7rem" }}>
                          {col.account_number}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ color: "#6B7280" }}>{col.location}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 500, color: "#6B7280" }}>{formatCurrency(col.beginning)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 500, color: "#166534" }}>{formatCurrency(col.collections)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 500, color: "#991B1B" }}>{formatCurrency(col.local_deposits)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: "#1E293B" }}>{formatCurrency(col.ending)}</TableCell>
                      <TableCell sx={{ color: "#6B7280" }}>
                        {col.transactions && col.transactions.length > 0 
                          ? `${col.transactions.length} ${col.transactions.length === 1 ? 'txn' : 'txns'}` 
                          : "No txns"}
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
                <TableCell colSpan={2} sx={{ fontWeight: 700, fontSize: "0.85rem", color: "#FFFFFF" }}>
                  GRAND TOTAL
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, color: "#FFFFFF" }}>{formatCurrency(summary.totalBeginning)}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, color: "#FFFFFF" }}>{formatCurrency(summary.totalCollections)}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600, color: "#FFFFFF" }}>{formatCurrency(summary.totalLocalDeposits)}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: "1rem", p: 1, color: "#F59E0B" }}>{formatCurrency(summary.totalEnding)}</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </Collapse>
    </Paper>
  );
}
