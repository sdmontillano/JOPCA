// src/components/PdcPage.jsx
import { useEffect, useState } from "react";
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

  const fetchPdc = async () => {
    setError(null);
    setLoading(true);
    try {
      const params = [];
      if (filterStatus) params.push(`status=${encodeURIComponent(filterStatus)}`);
      if (fromDate) params.push(`from=${encodeURIComponent(fromDate)}`);
      if (toDate) params.push(`to=${encodeURIComponent(toDate)}`);
      const q = params.length ? `?${params.join("&")}` : "";
      const res = await api.get(`/pdc/${q}`);
      setPdcList(res.data || []);
    } catch (err) {
      console.error("Error fetching PDCs", err);
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
                  <TableCell>{p.client_name ?? p.client ?? "-"}</TableCell>
                  <TableCell>{p.check_number ?? p.check_no ?? "-"}</TableCell>
                  <TableCell>{p.bank ?? "-"}</TableCell>
                  <TableCell align="right">{formatPeso(p.amount ?? p.value)}</TableCell>
                  <TableCell>{p.issue_date ?? p.issued_at ?? "-"}</TableCell>
                  <TableCell>{p.maturity_date ?? p.matured_at ?? "-"}</TableCell>
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
                              await api.patch(`/pdc/${p.id}/`, { status: "matured" });
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
                              await api.post(`/pdc/${p.id}/deposit/`, { bank_account_id: p.deposit_bank_id ?? null });
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