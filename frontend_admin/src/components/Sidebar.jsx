import { Drawer, List, ListItemButton, ListItemText, Toolbar, Typography, Button } from "@mui/material";

export default function Sidebar({ setCurrentPage, setIsAuthenticated }) {
  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsAuthenticated(false);
  };

  const menuItems = [
    { label: "Dashboard", page: "Dashboard" },
    { label: "Transactions", page: "Transactions" },
    { label: "Add Transaction", page: "AddTransaction" },
    { label: "Add Bank Account", page: "AddBankAccount" },
    { label: "Add Daily Cash Position", page: "AddDailyCashPosition" },
    { label: "Monthly Report", page: "MonthlyReport" },
  ];

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 240,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { width: 240, boxSizing: "border-box", bgcolor: "#1e293b", color: "#fff" },
      }}
    >
      <Toolbar>
        <Typography variant="h6" sx={{ fontWeight: "bold" }}>
          Banking DCPR
        </Typography>
      </Toolbar>
      <List>
        {menuItems.map((item) => (
          <ListItemButton
            key={item.page}
            onClick={() => setCurrentPage(item.page)}
            sx={{ "&:hover": { bgcolor: "#334155" } }}
          >
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
      <Button
        onClick={handleLogout}
        variant="contained"
        sx={{ bgcolor: "#ef4444", "&:hover": { bgcolor: "#dc2626" }, m: 2 }}
      >
        Logout
      </Button>
    </Drawer>
  );
}
