// src/components/PdcPage.jsx
import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  CircularProgress,
  Alert,
  Stack,
  Button,
  TextField,
  Chip,
} from "@mui/material";
import api from "../services/tokenService";
import { useNavigate } from "react-router-dom";

export default function PdcPage() {
  const [pdcList, setPdcList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const navigate = useNavigate();

  /**
   * Fetch transactions from the backend and filter client-side for PDCs.
   * Uses the existing transactions-crud/ endpoint (present in your Django URLconf).
   *
   * If your backend supports server-side filtering (e.g., ?type=post_dated_check),
   * you can replace the GET URL with that query to reduce payload.
   */
  const fetchPdc = async () => {
    setError(null);
    setLoading(true);
    try {
      // Build query params for transactions endpoint if you want server-side filtering
      // const params = "?type=post_dated_check"; // uncomment if backend supports it
      const res = await api.get(`/transactions-crud/`); // use transactions-crud instead of /pdc/
      // backend may return wrapper {results: [...]} or raw array
      const raw = Array.isArray(res.data) ? res.data : res.data?.results ?? res.data?.data ?? [];
      // Filter for post_dated_check type (adjust the type string if your backend uses a different value)
      let pdcs = raw.filter((r) => {
        const t = (r.type || r.txn_type || "").toString().toLowerCase();
        return t === "post_dated_check" || t === "postdated" || t.includes("post");
      });

      // Optional: apply client-side date/status filters
      if (filterStatus) {
        pdcs = pdcs.filter((p) => (p.status || "").toString().toLowerCase() === filterStatus.toLowerCase());
      }
      if (fromDate) {
        pdcs = pdcs.filter((p) => {
          const m = p.maturity_date || p.matured_at || p.mat_date || p.maturity;
          return m ? new Date(m) >= new Date(fromDate) : false;
        });
      }
      if (toDate) {
        pdcs = pdcs.filter((p) => {
          const m = p.maturity_date || p.matured_at || p.mat_date || p.maturity;
          return m ? new Date(m) <= new Date(toDate) : false;
        });
      }

      // Normalize minimal fields used by the UI
      const normalized = pdcs.map((p) => ({
        id: p.id ?? p.pk ?? p.transaction_id,
        client_name: p.client_name ?? p.customer ?? p.company ?? p.payee ?? p.customer_name,
        check_number: p.check_number ?? p.check_no ?? p.check ?? p.reference,
        bank: p.bank_account__name ?? p.bank_name ?? p.bank ?? null,
        amount: p.amount ?? p.total ?? p.value ?? 0,
        maturity_date: p.maturity_date ?? p.matured_at ?? p.mat_date ?? p.maturity ?? null,
        status: (p.status || "").toString().toLowerCase() || "outstanding",
        deposit_bank_id: p.deposit_bank_id ?? p.bank_account_id ?? null,
        raw: p,
      }));

      setPdcList(normalized);
    } catch (err) {
      console.error("Error fetching PDCs (via transactions-crud)", err);
      setError(err?.response?.data || err?.message || "Failed to load PDCs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPdc();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatPeso = (value) =>
    `₱${Number(value ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 6 }}>
        <CircularProgress />
      </Box>
    );
  if (error) return <Alert severity="error">{String(error)}</Alert>;

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            PDC Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage postdated checks: accept, mark matured/deposited, or record returned checks.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            size="small"
            label="From (YYYY-MM-DD)"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
          <TextField
            size="small"
            label="To (YYYY-MM-DD)"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
          <TextField
            size="small"
            label="Status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            placeholder="outstanding|matured|returned"
          />
          <Button variant="contained" onClick={fetchPdc}>
            Filter
          </Button>
          <Button variant="outlined" onClick={() => navigate(-1)}>
            Back
          </Button>
        </Stack>
      </Stack>

      <Paper sx={{ p: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Client</TableCell>
              <TableCell>Check #</TableCell>
              <TableCell>Bank</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell>Issue Date</TableCell>
              <TableCell>Maturity Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pdcList.length > 0 ? (
              pdcList.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.client_name ?? "-"}</TableCell>
                  <TableCell>{p.check_number ?? "-"}</TableCell>
                  <TableCell>{p.bank ?? "-"}</TableCell>
                  <TableCell align="right">{formatPeso(p.amount)}</TableCell>
                  <TableCell>{p.issue_date ?? p.issued_at ?? "-"}</TableCell>
                  <TableCell>{p.maturity_date ?? "-"}</TableCell>
                  <TableCell>
                    <Chip
                      label={p.status ?? "unknown"}
                      size="small"
                      color={
                        p.status === "outstanding" ? "warning" : p.status === "matured" ? "success" : "default"
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      {p.status === "outstanding" && (
                        <Button
                          size="small"
                          variant="contained"
                          onClick={async () => {
                            try {
                              await api.patch(`/transactions-crud/${p.id}/`, { status: "matured" });
                              fetchPdc();
                            } catch (err) {
                              console.error(err);
                              alert("Failed to update PDC status");
                            }
                          }}
                        >
                          Mark Matured
                        </Button>
                      )}

                      {p.status === "matured" && (
                        <Button
                          size="small"
                          variant="contained"
                          onClick={async () => {
                            try {
                              // If your backend exposes a deposit endpoint for transactions, use it.
                              // Otherwise, you may need to create a deposit transaction via transactions-crud.
                              await api.post(`/transactions-crud/${p.id}/deposit/`, { bank_account_id: p.deposit_bank_id ?? null });
                              fetchPdc();
                            } catch (err) {
                              console.error(err);
                              alert("Failed to deposit PDC");
                            }
                          }}
                        >
                          Deposit
                        </Button>
                      )}

                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          navigate(`/pdc/${p.id}`);
                        }}
                      >
                        View
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  No PDC records
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}