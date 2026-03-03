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

export default function MonthlyReport() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate(); // ✅ hook for navigation

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch("http://localhost:8000/api/monthly-report/", {
      headers: { Authorization: `Token ${token}` }, // ✅ fixed header
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch report");
        return res.json();
      })
      .then((data) => {
        setReport(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
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
        <Typography sx={{ mb: 2 }}>Month: {report.month}</Typography>
        <Typography sx={{ mb: 2 }}>
          Total Cash Flow: ₱{new Intl.NumberFormat("en-PH").format(report.total)}
        </Typography>

        {report.breakdown && (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Type</TableCell>
                <TableCell align="right">Amount (₱)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {report.breakdown.map((item) => (
                <TableRow key={item.type}>
                  <TableCell>{item.type}</TableCell>
                  <TableCell align="right">
                    ₱{new Intl.NumberFormat("en-PH").format(item.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* ✅ Back to Dashboard button */}
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
