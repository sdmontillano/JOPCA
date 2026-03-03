import { Box, Button, Typography, Divider } from "@mui/material";
import { useNavigate } from "react-router-dom";

export default function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <Box
      sx={{
        width: 240,
        minHeight: "100vh",
        bgcolor: "background.default",
        borderRight: "1px solid #e5e7eb",
        display: "flex",
        flexDirection: "column",
        p: 2,
      }}
    >
      <Typography
        variant="h5"
        sx={{ mb: 3, fontWeight: "bold", color: "primary.main", textAlign: "center" }}
      >
        Banking Admin
      </Typography>

      <Button
        variant="text"
        sx={{ mb: 1, justifyContent: "flex-start", fontWeight: "bold" }}
        onClick={() => navigate("/dashboard")}
      >
        🏠 Home
      </Button>

      {/* Banks / Bank Info button */}
      <Button
        variant="text"
        sx={{ mb: 1, justifyContent: "flex-start", fontWeight: "bold" }}
        onClick={() => navigate("/banks")}
      >
        🏦 Banks
      </Button>

      <Button
        variant="text"
        sx={{ mb: 1, justifyContent: "flex-start", fontWeight: "bold" }}
        onClick={() => navigate("/add-bank")}
      >
        ➕ Add Bank
      </Button>
      <Button
        variant="text"
        sx={{ mb: 1, justifyContent: "flex-start", fontWeight: "bold" }}
        onClick={() => navigate("/add-transaction")}
      >
        ➕ Add Transaction
      </Button>
      <Button
        variant="text"
        sx={{ mb: 1, justifyContent: "flex-start", fontWeight: "bold" }}
        onClick={() => navigate("/transactions")}
      >
        📜 Transactions
      </Button>
      <Button
        variant="text"
        sx={{ mb: 1, justifyContent: "flex-start", fontWeight: "bold" }}
        onClick={() => navigate("/monthly-report")}
      >
        📊 Monthly Report
      </Button>

      <Divider sx={{ my: 2 }} />

      <Button
        variant="contained"
        sx={{
          bgcolor: "error.main",
          "&:hover": { bgcolor: "#dc2626" },
          borderRadius: 2,
          fontWeight: "bold",
        }}
        onClick={handleLogout}
      >
        🚪 Logout
      </Button>
    </Box>
  );
}