import { useState, useEffect } from "react";
import { Box, CssBaseline, Toolbar } from "@mui/material";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import Transactions from "./components/Transactions";
import MonthlyReport from "./components/MonthlyReport";
import Login from "./components/Login";
import AddTransaction from "./components/AddTransaction";
import AddBankAccount from "./components/AddBankAccount";
import AddDailyCashPosition from "./components/AddDailyCashPosition";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentPage, setCurrentPage] = useState("Dashboard");

  // Check token on page load
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  if (!isAuthenticated) {
    return <Login onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <Sidebar setCurrentPage={setCurrentPage} setIsAuthenticated={setIsAuthenticated} />
      <Box component="main" sx={{ flexGrow: 1, bgcolor: "#f4f6f8", minHeight: "100vh" }}>
        <Toolbar />
        {currentPage === "Dashboard" && <Dashboard />}
        {currentPage === "Transactions" && <Transactions />}
        {currentPage === "AddTransaction" && <AddTransaction />}
        {currentPage === "AddBankAccount" && <AddBankAccount />}
        {currentPage === "AddDailyCashPosition" && <AddDailyCashPosition />}
        {currentPage === "MonthlyReport" && <MonthlyReport />}
      </Box>
    </Box>
  );
}

export default App;
