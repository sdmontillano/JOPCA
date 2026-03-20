// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import Login from "./components/Login.jsx";
import Dashboard from "./components/Dashboard.jsx";
import AddBankAccount from "./components/AddBankAccount.jsx";
import AddTransaction from "./components/AddTransaction.jsx";
import Transactions from "./components/Transactions.jsx";
import MonthlyReport from "./components/MonthlyReport.jsx";
import Banks from "./components/Banks.jsx";
import BankDetail from "./components/BankDetail.jsx";

import DebugPage from "./components/DebugPage.jsx";
import PdcPage from "./components/PdcPage.jsx";
import PdcDetail from "./components/PdcDetail.jsx";
import PcfPage from "./components/PcfPage.jsx";
import ChangePassword from "./components/ChangePassword.jsx";
import DashboardSettings from "./components/DashboardSettings.jsx";

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
          element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/add-bank"
          element={isAuthenticated ? <AddBankAccount /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/add-transaction"
          element={isAuthenticated ? <AddTransaction /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/transactions"
          element={isAuthenticated ? <Transactions /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/monthly-report"
          element={isAuthenticated ? <MonthlyReport /> : <Navigate to="/login" replace />}
        />

        {/* Banks list and bank detail */}
        <Route
          path="/banks"
          element={isAuthenticated ? <Banks /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/banks/:id"
          element={isAuthenticated ? <BankDetail /> : <Navigate to="/login" replace />}
        />

        {/* PDC management (protected) */}
        <Route
          path="/pdc"
          element={isAuthenticated ? <PdcPage /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/pdc/:id"
          element={isAuthenticated ? <PdcDetail /> : <Navigate to="/login" replace />}
        />

        {/* PCF management (protected) */}
        <Route
          path="/pcf"
          element={isAuthenticated ? <PcfPage /> : <Navigate to="/login" replace />}
        />

        {/* User management */}
        <Route
          path="/change-password"
          element={isAuthenticated ? <ChangePassword /> : <Navigate to="/login" replace />}
        />

        {/* Settings */}
        <Route
          path="/settings"
          element={isAuthenticated ? <DashboardSettings /> : <Navigate to="/login" replace />}
        />

        {/* Debug (protected) */}
        <Route
          path="/debug"
          element={isAuthenticated ? <DebugPage /> : <Navigate to="/login" replace />}
        />

        {/* Default redirect */}
        <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </Router>
  );
}