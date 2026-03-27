// src/App.jsx
import React, { useState, useEffect } from "react";
import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { API_URL } from "./services/tokenService";

import Login from "./components/Login.jsx";
import Dashboard from "./components/Dashboard.jsx";
import AdminDashboard from "./components/AdminDashboard.jsx";
import AddBankAccount from "./components/AddBankAccount.jsx";
import AddTransaction from "./components/AddTransaction.jsx";
import Transactions from "./components/Transactions.jsx";
import MonthlyReport from "./components/MonthlyReport.jsx";
import Banks from "./components/Banks.jsx";
import BankDetail from "./components/BankDetail.jsx";
import CashSummary from "./components/CashSummary.jsx";
import Analysis from "./components/Analysis.jsx";

import DebugPage from "./components/DebugPage.jsx";
import PdcPage from "./components/PdcPage.jsx";
import PdcDetail from "./components/PdcDetail.jsx";
import PcfPage from "./components/PcfPage.jsx";
import ChangePassword from "./components/ChangePassword.jsx";
import DashboardSettings from "./components/DashboardSettings.jsx";

export default function App() {
  const [isReady, setIsReady] = useState(false);
  
  // Auth check runs on every render - always check localStorage directly
  const isAuthenticated = !!localStorage.getItem("token");
  const isAdmin = localStorage.getItem("userRole") === "admin";

  // Sync across tabs - reload when token changes in another tab
  useEffect(() => {
    const handleStorage = () => {
      window.location.reload();
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Session timeout - auto logout after 60 minutes of inactivity
  useEffect(() => {
    const SESSION_TIMEOUT = 60 * 60 * 1000; // 60 minutes (1 hour)
    let timeoutId;

    const resetTimeout = () => {
      clearTimeout(timeoutId);
      if (isAuthenticated) {
        timeoutId = setTimeout(() => {
          localStorage.removeItem("token");
          window.location.hash = "#/login";
          window.location.reload();
        }, SESSION_TIMEOUT);
      }
    };

    // Reset on user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, resetTimeout));

    // Initial set
    resetTimeout();

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => window.removeEventListener(event, resetTimeout));
    };
  }, [isAuthenticated]);

  // Check if Django backend is responding before showing app
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const res = await fetch(`${API_URL}/api-token-auth/`);
        if (res.ok || res.status === 405) {
          setIsReady(true);
        }
      } catch {
        setTimeout(checkBackend, 1000);
      }
    };
    checkBackend();
  }, []);

  // Wait for app to fully initialize
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Router>
      {!isReady ? (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          background: '#1E293B',
          color: 'white',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>JOPCA</div>
            <div style={{ fontSize: '14px', opacity: 0.8, marginBottom: '16px' }}>Daily Cash Position System</div>
            <div style={{ fontSize: '12px', opacity: 0.6 }}>Starting up...</div>
          </div>
        </div>
      ) : (
      <Routes>
        {/* Public route */}
        <Route path="/login" element={<Login />} />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" replace />}
        />
        
        {/* Admin routes */}
        <Route
          path="/admin"
          element={isAuthenticated && isAdmin ? <AdminDashboard /> : <Navigate to="/dashboard" replace />}
        />
        <Route
          path="/admin/"
          element={isAuthenticated && isAdmin ? <AdminDashboard /> : <Navigate to="/dashboard" replace />}
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

        {/* Cash Summary */}
        <Route
          path="/cash-summary"
          element={isAuthenticated ? <CashSummary /> : <Navigate to="/login" replace />}
        />

        {/* Analysis */}
        <Route
          path="/analysis"
          element={isAuthenticated ? <Analysis /> : <Navigate to="/login" replace />}
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
        <Route path="*" element={<Navigate to={isAuthenticated ? (isAdmin ? "/admin" : "/dashboard") : "/login"} replace />} />
      </Routes>
      )}
    </Router>
  );
}
