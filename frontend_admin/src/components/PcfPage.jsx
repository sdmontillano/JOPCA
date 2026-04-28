// src/components/PcfPage.jsx
import React, { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  CircularProgress,
  Alert,
  Divider,
  Tabs,
  Tab,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import WalletIcon from "@mui/icons-material/Wallet";
import AssessmentIcon from "@mui/icons-material/Assessment";
import EventNoteIcon from "@mui/icons-material/EventNote";
import HistoryIcon from "@mui/icons-material/History";
import api, { unwrapResponse } from "../services/tokenService";
import PcfTable from "./PcfTable";
import PcfReports from "./PcfReports";
import CashCountPage from "./CashCountPage";
import AddPcfModal from "./AddPcfModal";
import QuickActionFAB from "./QuickActionFAB";
import AddTransaction from "./AddTransaction";
import AddBankAccount from "./AddBankAccount";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";

export default function PcfPage() {
  const [pcfs, setPcfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addTransactionOpen, setAddTransactionOpen] = useState(false);
  const [addBankOpen, setAddBankOpen] = useState(false);
  const [recentTxns, setRecentTxns] = useState([]);
  const [recentLoading, setRecentLoading] = useState(false);

  const fetchPcfs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/api/pcf/");
      const data = unwrapResponse(res?.data);
      setPcfs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch PCFs", err);
      setError("Failed to load PCF data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPcfs();
  }, []);

  const handlePcfCreated = () => {
    fetchPcfs();
  };

  const fetchRecentTxns = async () => {
    setRecentLoading(true);
    try {
      const res = await api.get("/api/pcf-transactions/?page_size=15");
      const data = unwrapResponse(res?.data);
      setRecentTxns(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch recent transactions", err);
      setRecentTxns([]);
    } finally {
      setRecentLoading(false);
    }
  };

  useEffect(() => {
    fetchPcfs();
    if (activeTab === 3) {
      fetchRecentTxns();
    }
  }, [activeTab]);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <WalletIcon color="primary" sx={{ fontSize: 32 }} />
          <Typography variant="h4" fontWeight="bold">
            Petty Cash Fund (PCF)
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<EventNoteIcon />}
            onClick={() => setShowAddModal(true)}
          >
            Add Transaction
          </Button>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => window.history.back()}
            sx={{
              borderColor: "#E5E7EB",
              color: "#475569",
              "&:hover": { bgcolor: "#F3F4F6", borderColor: "#D1D5DB" },
            }}
          >
            Back
          </Button>
        </Box>
      </Box>

      <Tabs
        value={activeTab}
        onChange={(e, v) => setActiveTab(v)}
        sx={{ mb: 3 }}
      >
        <Tab
          icon={<WalletIcon />}
          iconPosition="start"
          label="PCF Summary"
        />
        <Tab
          icon={<AssessmentIcon />}
          iconPosition="start"
          label="Reports"
        />
        <Tab
          icon={<HistoryIcon />}
          iconPosition="start"
          label="Recent"
        />
        <Tab
          icon={<EventNoteIcon />}
          iconPosition="start"
          label="Cash Count"
        />
      </Tabs>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <>
          {activeTab === 0 && (
            <Box>
              <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <Chip
                  label={`${pcfs.length} PCF Fund${pcfs.length !== 1 ? "s" : ""}`}
                  color="primary"
                  variant="outlined"
                />
                <Chip
                  label={`Total: ₱${pcfs.reduce((sum, p) => sum + (p.current_balance || p.available_balance || p.ending || 0), 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`}
                  color="success"
                />
              </Stack>
              <PcfTable pcfs={pcfs} showExport={true} defaultExpanded={true} />
            </Box>
          )}

          {activeTab === 1 && <PcfReports />}

          {activeTab === 2 && <CashCountPage />}

          {activeTab === 3 && (
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                Recent PCF Transactions (Last 15)
              </Typography>
              {recentLoading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : recentTxns.length === 0 ? (
                <Typography color="text.secondary">No recent transactions found.</Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: "#F3F4F6" }}>
                        <TableCell sx={{ fontWeight: "bold" }}>Date</TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>PCF Name</TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>Location</TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>Type</TableCell>
                        <TableCell sx={{ fontWeight: "bold" }} align="right">Amount</TableCell>
                        <TableCell sx={{ fontWeight: "bold" }}>Description</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recentTxns.map((txn) => (
                        <TableRow key={txn.id} hover>
                          <TableCell>{txn.date}</TableCell>
                          <TableCell>{txn.pcf_name}</TableCell>
                          <TableCell>{txn.location}</TableCell>
                          <TableCell>
                            <Chip 
                              size="small" 
                              label={txn.type}
                              color={txn.type === "replenishment" ? "success" : txn.type === "unreplenished" ? "warning" : "error"}
                            />
                          </TableCell>
                          <TableCell align="right" sx={{ color: txn.type === "replenishment" ? "green" : "red", fontWeight: "bold" }}>
                            {txn.type === "replenishment" ? "+" : "-"}₱{Number(txn.amount).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>{txn.description || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          )}
        </>
      )}

      <AddPcfModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onCreated={handlePcfCreated}
      />

      <QuickActionFAB
        customActions={[
          { label: "Add Transaction", icon: <AddCircleOutlineIcon />, onClick: () => setAddTransactionOpen(true) },
          { label: "Add Bank Account", icon: <AccountBalanceIcon />, onClick: () => setAddBankOpen(true) },
          { label: "Add PCF", icon: <WalletIcon />, onClick: () => setShowAddModal(true) },
        ]}
      />

      <AddTransaction open={addTransactionOpen} onClose={() => setAddTransactionOpen(false)} refreshData={fetchPcfs} />
      <AddBankAccount open={addBankOpen} onClose={() => setAddBankOpen(false)} refreshData={fetchPcfs} />
    </Box>
  );
}
