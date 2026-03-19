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
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import WalletIcon from "@mui/icons-material/Wallet";
import AssessmentIcon from "@mui/icons-material/Assessment";
import EventNoteIcon from "@mui/icons-material/EventNote";
import api from "../services/tokenService";
import PcfTable from "./PcfTable";
import PcfReports from "./PcfReports";
import CashCountPage from "./CashCountPage";
import AddPcfModal from "./AddPcfModal";

export default function PcfPage() {
  const [pcfs, setPcfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchPcfs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/pcf/");
      const data = res?.data?.results ?? res?.data ?? [];
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

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => window.history.back()} variant="text">
            Back
          </Button>
          <WalletIcon color="primary" sx={{ fontSize: 32 }} />
          <Typography variant="h4" fontWeight="bold">
            Petty Cash Fund (PCF)
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<EventNoteIcon />}
          onClick={() => setShowAddModal(true)}
        >
          Add Transaction
        </Button>
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
                  label={`Total: ₱${pcfs.reduce((sum, p) => sum + (p.current_balance || 0), 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`}
                  color="success"
                />
              </Stack>
              <PcfTable pcfs={pcfs} showExport={true} defaultExpanded={true} />
            </Box>
          )}

          {activeTab === 1 && <PcfReports />}

          {activeTab === 2 && <CashCountPage />}
        </>
      )}

      <AddPcfModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onCreated={handlePcfCreated}
      />
    </Box>
  );
}
