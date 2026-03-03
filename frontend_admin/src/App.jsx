import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./components/Login.jsx";
import Dashboard from "./components/Dashboard.jsx";
import AddBankAccount from "./components/AddBankAccount.jsx";
import AddTransaction from "./components/AddTransaction.jsx";
import Transactions from "./components/Transactions.jsx";
import MonthlyReport from "./components/MonthlyReport.jsx";
import Banks from "./components/Banks.jsx";
import BankDetail from "./components/BankDetail.jsx";

export default function App() {
  // ✅ Simple auth check: if token exists, user is logged in
  const isAuthenticated = !!localStorage.getItem("token");

  return (
    <Router>
      <Routes>
        {/* Public route */}
        <Route path="/login" element={<Login />} />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />}
        />
        <Route
          path="/add-bank"
          element={isAuthenticated ? <AddBankAccount /> : <Navigate to="/login" />}
        />
        <Route
          path="/add-transaction"
          element={isAuthenticated ? <AddTransaction /> : <Navigate to="/login" />}
        />
        <Route
          path="/transactions"
          element={isAuthenticated ? <Transactions /> : <Navigate to="/login" />}
        />
        <Route
          path="/monthly-report"
          element={isAuthenticated ? <MonthlyReport /> : <Navigate to="/login" />}
        />

        {/* Banks list and bank detail */}
        <Route
          path="/banks"
          element={isAuthenticated ? <Banks /> : <Navigate to="/login" />}
        />
        <Route
          path="/banks/:id"
          element={isAuthenticated ? <BankDetail /> : <Navigate to="/login" />}
        />

        {/* Default redirect */}
        <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
      </Routes>
    </Router>
  );
}