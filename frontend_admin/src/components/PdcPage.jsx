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
import pdcService from "../services/pdcService";   // <-- use the service
import { useNavigate } from "react-router-dom";

export default function PdcPage() {
  const [pdcList, setPdcList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const navigate = useNavigate();

  const fetchPdcs = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await pdcService.listPdcs();
      const raw = Array.isArray(res.data) ? res.data : res.data?.results ?? [];
      const normalized = raw.map((p) => ({
        id: p.id,
        client_name: p.customer ?? "-",
        check_number: p.check_number ?? "-",
        bank: p.deposit_bank?.name ?? "-",
        deposit_bank_id: p.deposit_bank?.id ?? null,
        amount: p.amount ?? 0,
        issue_date: p.issue_date ?? null,
        maturity_date: p.maturity_date ?? null,
        status: (p.status || "outstanding").toLowerCase(),
      }));

      // apply filters
      let filtered = normalized;
      if (filterStatus) filtered = filtered.filter((x) => x.status === filterStatus.toLowerCase());
      if (fromDate) filtered = filtered.filter((x) => (x.maturity_date ? new Date(x.maturity_date) >= new Date(fromDate) : false));
      if (toDate) filtered = filtered.filter((x) => (x.maturity_date ? new Date(x.maturity_date) <= new Date(toDate) : false));

      setPdcList(filtered);
    } catch (err) {
      console.error("Error fetching PDCs", err);
      setError(err?.response?.data || err?.message || "Failed to load PDCs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPdcs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatPeso = (value) =>
    `₱${Number(value ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handleMarkMatured = async (id) => {
    try {
      await pdcService.markPdcMatured(id);
      fetchPdcs();
    } catch (err) {
      console.error(err);
      alert("Failed to mark matured");
    }
  };

  const handleDeposit = async (id, bankId) => {
    try {
      await pdcService.depositPdc(id, bankId, new Date().toISOString().slice(0, 10), "WEB-DEPOSIT");
      fetchPdcs();
    } catch (err) {
      console.error(err);
      alert("Failed to deposit PDC");
    }
  };

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
          <TextField size="small" label="From (YYYY-MM-DD)" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <TextField size="small" label="To (YYYY-MM-DD)" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          <TextField size="small" label="Status" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} placeholder="outstanding|matured|returned" />
          <Button variant="contained" onClick={fetchPdcs}>Filter</Button>
          <Button variant="outlined" onClick={() => navigate(-1)}>Back</Button>
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
                  <TableCell>{p.client_name}</TableCell>
                  <TableCell>{p.check_number}</TableCell>
                  <TableCell>{p.bank}</TableCell>
                  <TableCell align="right">{formatPeso(p.amount)}</TableCell>
                  <TableCell>{p.issue_date ?? "-"}</TableCell>
                  <TableCell>{p.maturity_date ?? "-"}</TableCell>
                  <TableCell>
                    <Chip
                      label={p.status}
                      size="small"
                      color={p.status === "outstanding" ? "warning" : p.status === "matured" ? "success" : "default"}
                    />
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      {p.status === "outstanding" && (
                        <Button size="small" variant="contained" onClick={() => handleMarkMatured(p.id)}>
                          Mark Matured
                        </Button>
                      )}
                      {p.status === "matured" && (
                        <Button size="small" variant="contained" onClick={() => handleDeposit(p.id, p.deposit_bank_id)}>
                          Deposit
                        </Button>
                      )}
                      <Button size="small" variant="outlined" onClick={() => navigate(`/pdc/${p.id}`)}>
                        View
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} align="center">No PDC records</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}