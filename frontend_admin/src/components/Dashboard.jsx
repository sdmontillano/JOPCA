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
} from "@mui/material";
import api from "../services/tokenService";
import Sidebar from "./Sidebar.jsx";

export default function Dashboard() {
  const [dailyReport, setDailyReport] = useState(null);
  const [monthlyReport, setMonthlyReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const dailyRes = await api.get("/summary/detailed-daily/");
        setDailyReport(dailyRes.data);

        const today = new Date();
        const monthStr = `${today.getFullYear()}-${String(
          today.getMonth() + 1
        ).padStart(2, "0")}`;
        const monthlyRes = await api.get(
          `/summary/detailed-monthly/?month=${monthStr}`
        );
        setMonthlyReport(monthlyRes.data);
      } catch (err) {
        console.error("Error fetching dashboard data", err);
        setError("Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const formatPeso = (value) =>
    `₱${Number(value).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  if (loading) return <CircularProgress sx={{ m: 3 }} />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Box sx={{ display: "flex" }}>
      <Sidebar />
      <Box sx={{ flexGrow: 1, p: 3 }}>
        <Typography
          variant="h4"
          sx={{ mb: 3, fontWeight: "bold", color: "#0ea5e9" }}
        >
          Banking Dashboard
        </Typography>

        {/* Daily Report Section */}
        <Typography variant="h5" sx={{ mb: 2, fontWeight: "bold" }}>
          Daily Cash Position Report ({dailyReport?.date || "No Data"})
        </Typography>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Daily Transaction Breakdown
          </Typography>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Account</TableCell>
                <TableCell>Type</TableCell>
                <TableCell align="right">Total (₱)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dailyReport?.line_items?.length > 0 ? (
                dailyReport.line_items.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      {item.bank_account__name} (
                      {item.bank_account__account_number})
                    </TableCell>
                    <TableCell>{item.type}</TableCell>
                    <TableCell align="right">{formatPeso(item.total)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    No transactions for this date
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Account Ending Balances (Daily)
          </Typography>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Account</TableCell>
                <TableCell align="right">Balance (₱)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {dailyReport?.accounts?.length > 0 ? (
                dailyReport.accounts.map((acc, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      {acc.name} ({acc.account_number})
                    </TableCell>
                    <TableCell align="right">{formatPeso(acc.balance)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={2} align="center">
                    No accounts available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>

        <Paper
          sx={{
            p: 3,
            bgcolor: "#22c55e",
            color: "white",
            textAlign: "center",
            mb: 5,
          }}
        >
          <Typography variant="h6">Daily Grand Total Ending Balance</Typography>
          <Typography variant="h4">
            {formatPeso(dailyReport?.grand_total || 0)}
          </Typography>
        </Paper>

        {/* Monthly Report Section */}
        <Typography variant="h5" sx={{ mb: 2, fontWeight: "bold" }}>
          Monthly Cash Position Report ({monthlyReport?.month || "No Data"})
        </Typography>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Monthly Transaction Breakdown
          </Typography>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Account</TableCell>
                <TableCell>Type</TableCell>
                <TableCell align="right">Total (₱)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {monthlyReport?.line_items?.length > 0 ? (
                monthlyReport.line_items.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      {item.bank_account__name} (
                      {item.bank_account__account_number})
                    </TableCell>
                    <TableCell>{item.type}</TableCell>
                    <TableCell align="right">{formatPeso(item.total)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} align="center">
                    No transactions for this month
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Account Ending Balances (Monthly)
          </Typography>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Account</TableCell>
                <TableCell align="right">Balance (₱)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {monthlyReport?.accounts?.length > 0 ? (
                monthlyReport.accounts.map((acc, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      {acc.name} ({acc.account_number})
                    </TableCell>
                    <TableCell align="right">{formatPeso(acc.balance)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={2} align="center">
                    No accounts available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>

        <Paper
          sx={{
            p: 3,
            bgcolor: "#0ea5e9",
            color: "white",
            textAlign: "center",
          }}
        >
          <Typography variant="h6">Monthly Grand Total Ending Balance</Typography>
          <Typography variant="h4">
            {formatPeso(monthlyReport?.grand_total || 0)}
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
}
