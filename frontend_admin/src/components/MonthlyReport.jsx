import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import api from "../services/tokenService";

export default function MonthlyReport() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/summary/detailed-monthly/")
      .then((res) => {
        setReport(res.data || res);
        setLoading(false);
      })
      .catch((err) => {
        setError(err?.response?.data?.detail || err.message || "Failed to fetch report");
        setLoading(false);
      });
  }, []);

  if (loading) return <CircularProgress sx={{ m: 3 }} />;
  if (error) return <Alert severity="error">{error}</Alert>;

  return (
    <Card sx={{ m: 3 }}>
      <CardContent>
        <Typography variant="h5" sx={{ mb: 2, fontWeight: "bold" }}>
          Monthly Report
        </Typography>
        <Typography sx={{ mb: 2 }}>Month: {report?.month || 'N/A'}</Typography>
        <Typography sx={{ mb: 2 }}>
          Grand Total: ₱{new Intl.NumberFormat("en-PH").format(report?.grand_total || 0)}
        </Typography>

        {report?.line_items && report.line_items.length > 0 && (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Particulars</TableCell>
                <TableCell>Account</TableCell>
                <TableCell align="right">Amount (₱)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {report.line_items.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell>{item.bank_account__name || 'N/A'}</TableCell>
                  <TableCell>{item.bank_account__account_number || 'N/A'}</TableCell>
                  <TableCell align="right">
                    ₱{new Intl.NumberFormat("en-PH").format(item.total || 0)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Button
          variant="contained"
          sx={{ mt: 3, bgcolor: "#0ea5e9", "&:hover": { bgcolor: "#0284c7" } }}
          onClick={() => navigate("/dashboard")}
        >
          Back to Dashboard
        </Button>
      </CardContent>
    </Card>
  );
}
