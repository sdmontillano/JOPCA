import { useEffect, useState } from "react";
import { Card, CardContent, Typography } from "@mui/material";

export default function MonthlyReport() {
  const [report, setReport] = useState({ month: "", total: 0 });

  useEffect(() => {
    fetch("http://localhost:8000/api/monthly-report/")
      .then((res) => res.json())
      .then((data) => setReport(data));
  }, []);

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h5">Monthly Report</Typography>
        <Typography>Month: {report.month}</Typography>
        <Typography>Total Cash Flow: ${report.total}</Typography>
      </CardContent>
    </Card>
  );
}
