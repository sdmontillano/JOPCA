// src/components/PcfHistory.jsx
import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Paper,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Stack,
  Button,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
} from "@mui/material";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import WalletIcon from "@mui/icons-material/Wallet";
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

export default function PcfHistory({ defaultExpanded = false }) {
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
          results.push({ cash_on_hand: [] });
        }
      }

      if (errors.length > 0) {
        const errorMsg = errors.map(e => `${e.date}: ${e.error?.response?.data?.detail || e.error?.message || 'Failed'}`).join('; ');
        setMessage({ type: "error", text: `Failed to load some data: ${errorMsg}` });
      }

      const out = {};
      dates.forEach((d, i) => {
        const payload = results[i] || { cash_on_hand: [] };
        const pcfRows = Array.isArray(payload.cash_on_hand) && payload.cash_on_hand.length > 0
          ? payload.cash_on_hand
          : [];
        out[d] = { pcfs: pcfRows, date: d };
      });
      setDataMap(out);
    } catch (err) {
      console.error("Failed to fetch PCF history", err);
      setMessage({ type: "error", text: "Failed to load PCF history data." });
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
    const dayData = dataMap[dateIso] || { pcfs: [] };
    const rows = Array.isArray(dayData.pcfs) ? dayData.pcfs : [];
    return rows.reduce(
      (acc, r) => ({
        beginning: acc.beginning + Number(r.beginning ?? 0),
        disbursements: acc.disbursements + Number(r.disbursements ?? 0),
        replenishments: acc.replenishments + Number(r.replenishments ?? 0),
        ending: acc.ending + Number(r.ending ?? 0),
        unreplenished: acc.unreplenished + Number(r.unreplenished ?? 0),
      }),
      { beginning: 0, disbursements: 0, replenishments: 0, ending: 0, unreplenished: 0 }
    );
  };

  if (!expanded) {
    return (
      <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<WalletIcon />}
          onClick={() => setExpanded(true)}
          sx={{ borderColor: "#E5E7EB", color: "#475569" }}
        >
          Show PCF History
        </Button>
      </Box>
    );
  }

  return (
    <Paper sx={{ mt: 2, p: 2, borderRadius: 1, border: "1px solid", borderColor: "#E5E7EB", bgcolor: "#FFFFFF" }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#1E293B", fontSize: "1rem" }}>
            PCF History — Yesterday & Previous Day
          </Typography>
          <Typography variant="caption" sx={{ color: "#6B7280" }}>
            Center (yesterday): <strong>{centerDate}</strong>
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            variant="outlined"
            size="small"
            onClick={() => setExpanded(false)}
            sx={{ borderColor: "#E5E7EB", color: "#475569" }}
          >
            Hide
          </Button>
          <Stack direction="row" spacing={1} alignItems="center">
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
        </Stack>
      </Stack>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}><CircularProgress /></Box>
      ) : (
        <>
          {message && <Alert severity={message.type} sx={{ mb: 2 }}>{message.text}</Alert>}
          {dates.map((dateIso) => {
            const dayData = dataMap[dateIso] || { pcfs: [], date: dateIso };
            const rows = Array.isArray(dayData.pcfs) ? dayData.pcfs : [];
            const totals = totalsFor(dateIso);
            const isToday = dateIso === centerDate;

            return (
              <Box key={dateIso} sx={{ mb: 2 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: isToday ? "#1E293B" : "#374151" }}>
                    {dateIso}
                  </Typography>
                  {isToday && <Chip label="TODAY" size="small" sx={{ height: 18, fontSize: "0.65rem", bgcolor: "#1E293B", color: "white" }} />}
                </Box>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: "white", fontWeight: 700, fontSize: "0.7rem", bgcolor: "#1E293B" }}>Particulars</TableCell>
                      <TableCell sx={{ color: "white", fontWeight: 700, fontSize: "0.7rem", bgcolor: "#1E293B" }}>Location</TableCell>
                      <TableCell align="right" sx={{ color: "white", fontWeight: 700, fontSize: "0.7rem", bgcolor: "#1E293B" }}>Beginning</TableCell>
                      <TableCell align="right" sx={{ color: "white", fontWeight: 700, fontSize: "0.7rem", bgcolor: "#1E293B" }}>Disbursements</TableCell>
                      <TableCell align="right" sx={{ color: "white", fontWeight: 700, fontSize: "0.7rem", bgcolor: "#1E293B" }}>Replenishments</TableCell>
                      <TableCell align="right" sx={{ color: "white", fontWeight: 700, fontSize: "0.7rem", bgcolor: "#1E293B" }}>Ending</TableCell>
                      <TableCell align="right" sx={{ color: "white", fontWeight: 700, fontSize: "0.7rem", bgcolor: "#1E293B" }}>Unreplenished</TableCell>
                      <TableCell sx={{ color: "white", fontWeight: 700, fontSize: "0.7rem", bgcolor: "#1E293B", minWidth: 150 }}>Transactions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} align="center" sx={{ py: 3, color: "#9CA3AF" }}>
                          No PCF data
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((r, idx) => {
                        const txns = r.transactions || [];
                        return (
                          <React.Fragment key={r.id ?? `pcf-${idx}`}>
                            <TableRow sx={{ "&:hover": { bgcolor: "#F9FAFB" } }}>
                              <TableCell sx={{ fontWeight: 500, fontSize: "0.8rem", color: "#374151" }}>
                                {r.name}
                              </TableCell>
                              <TableCell sx={{ fontSize: "0.8rem", color: "#6B7280" }}>
                                {r.location_display || r.location || "-"}
                              </TableCell>
                              <TableCell align="right" sx={{ fontSize: "0.8rem", color: "#6B7280" }}>
                                {formatCurrency(r.beginning ?? 0)}
                              </TableCell>
                              <TableCell align="right" sx={{ fontSize: "0.8rem", color: "#991B1B" }}>
                                {formatCurrency(r.disbursements ?? 0)}
                              </TableCell>
                              <TableCell align="right" sx={{ fontSize: "0.8rem", color: "#166534" }}>
                                {formatCurrency(r.replenishments ?? 0)}
                              </TableCell>
                              <TableCell align="right" sx={{ fontSize: "0.8rem", fontWeight: 700, color: "#1E293B" }}>
                                {formatCurrency(r.ending ?? 0)}
                              </TableCell>
                              <TableCell align="right" sx={{ fontSize: "0.8rem", color: (r.unreplenished ?? 0) > 0 ? "#B45309" : "#9CA3AF" }}>
                                {(r.unreplenished ?? 0) > 0 ? formatCurrency(r.unreplenished) : "-"}
                              </TableCell>
                              <TableCell sx={{ fontSize: "0.75rem" }}>
                                {txns.length > 0 ? (
                                  <Stack spacing={0.25}>
                                    {txns.slice(0, 3).map((t, tidx) => (
                                      <Box key={t.id || tidx} sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
                                        <Typography variant="caption" sx={{ fontWeight: 600, color: t.type === "disbursement" ? "#991B1B" : "#166534", minWidth: 40 }}>
                                          {t.type === "disbursement" && "Disb:"}
                                          {t.type === "replenishment" && "Rep:"}
                                          {t.type === "unreplenished" && "Unrep:"}
                                        </Typography>
                                        <Typography variant="caption" sx={{ fontWeight: 600, color: t.type === "disbursement" ? "#991B1B" : "#166534" }}>
                                          {t.type === "disbursement" || t.type === "unreplenished" ? "-" : "+"}{formatCurrency(t.amount)}
                                        </Typography>
                                        {t.description && (
                                          <Typography variant="caption" sx={{ color: "#6B7280", fontStyle: "italic" }}>
                                            ({t.description})
                                          </Typography>
                                        )}
                                      </Box>
                                    ))}
                                    {txns.length > 3 && (
                                      <Typography variant="caption" sx={{ color: "#9CA3AF" }}>
                                        +{txns.length - 3} more...
                                      </Typography>
                                    )}
                                  </Stack>
                                ) : (
                                  <Typography variant="caption" sx={{ color: "#9CA3AF" }}>No txns</Typography>
                                )}
                              </TableCell>
                            </TableRow>
                          </React.Fragment>
                        );
                      })
                    )}
                    <TableRow sx={{ bgcolor: "#F1F5F9", borderTop: "1px solid #E5E7EB" }}>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.8rem", color: "#1E293B" }}>TOTALS</TableCell>
                      <TableCell />
                      <TableCell align="right" sx={{ fontWeight: 600, color: "#6B7280", fontSize: "0.8rem" }}>{formatCurrency(totals.beginning)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: "#991B1B", fontSize: "0.8rem" }}>{formatCurrency(totals.disbursements)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: "#166534", fontSize: "0.8rem" }}>{formatCurrency(totals.replenishments)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: "#1E293B", fontSize: "0.9rem" }}>{formatCurrency(totals.ending)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: "#B45309", fontSize: "0.8rem" }}>{formatCurrency(totals.unreplenished)}</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              </Box>
            );
          })}
        </>
      )}
    </Paper>
  );
}
