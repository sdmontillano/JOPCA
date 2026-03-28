import { Box, Typography, Paper, Grid, Card, CardContent } from "@mui/material";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const username = localStorage.getItem("username") || "Admin";

  const adminItems = [
    { title: "Transactions", desc: "View, edit, delete all transactions", path: "/admin/transactions", color: "#0ea5e9" },
    { title: "Banks", desc: "Manage bank accounts", path: "/admin/banks", color: "#22c55e" },
    { title: "PDC", desc: "Manage post-dated checks", path: "/admin/pdc", color: "#8b5cf6" },
    { title: "PCF", desc: "Manage petty cash funds", path: "/admin/pcf", color: "#f97316" },
    { title: "Users", desc: "Manage user accounts", path: "/admin/users", color: "#ef4444" },
  ];

  return (
    <Box sx={{ p: 3, bgcolor: "#f9fafb", minHeight: "100vh" }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          JOPCA Admin Panel
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Welcome, {username}. You have full administrative access.
        </Typography>
      </Paper>

      <Grid container spacing={3}>
        {adminItems.map((item) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={item.title}>
            <Card 
              sx={{ cursor: "pointer", transition: "transform 0.2s", "&:hover": { transform: "translateY(-4px)" } }}
              onClick={() => navigate(item.path)}
            >
              <CardContent>
                <Typography variant="h6" fontWeight="bold" sx={{ color: item.color }}>
                  {item.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {item.desc}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
