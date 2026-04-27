// src/components/Banks.jsx
import { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Button,
  Alert,
  Stack,
  IconButton,
  Divider,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import RefreshIcon from "@mui/icons-material/Refresh";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import api from "../services/tokenService";
import QuickActionFAB from "./QuickActionFAB";
import AddBankAccount from "./AddBankAccount";
import AddTransaction from "./AddTransaction";
import PdcCreateModal from "./PdcCreateModal";
import AddPcfModal from "./AddPcfModal";

export default function Banks() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addTransactionOpen, setAddTransactionOpen] = useState(false);
  const [addBankOpen, setAddBankOpen] = useState(false);
  const [addPdcOpen, setAddPdcOpen] = useState(false);
  const [addPcfOpen, setAddPcfOpen] = useState(false);
  const navigate = useNavigate();

  const fetchAccounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/api/bankaccounts/");
      const data = res.data?.results ?? res.data ?? [];
      setAccounts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching bank accounts", err);
      setError("Failed to load bank accounts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (mounted) await fetchAccounts();
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const formatCurrency = (value) =>
    `₱${Number(value ?? 0).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", bgcolor: "#F9FAFB" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#F9FAFB", p: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Paper
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 1,
          border: "1px solid",
          borderColor: "#E5E7EB",
          bgcolor: "#FFFFFF",
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 1,
                bgcolor: "#F1F5F9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AccountBalanceIcon sx={{ color: "#475569", fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: "#1E293B" }}>
                Bank Accounts
              </Typography>
              <Typography variant="body2" sx={{ color: "#6B7280" }}>
                {accounts.length} account{accounts.length !== 1 ? "s" : ""}
              </Typography>
            </Box>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchAccounts}
              sx={{
                borderColor: "#E5E7EB",
                color: "#475569",
                "&:hover": { bgcolor: "#F3F4F6", borderColor: "#D1D5DB" },
              }}
            >
              Refresh
            </Button>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate("/dashboard")}
              sx={{
                borderColor: "#E5E7EB",
                color: "#475569",
                "&:hover": { bgcolor: "#F3F4F6", borderColor: "#D1D5DB" },
              }}
            >
              Back
            </Button>
          </Stack>
        </Box>
      </Paper>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Bank Accounts List */}
      <Paper
        sx={{
          borderRadius: 1,
          border: "1px solid",
          borderColor: "#E5E7EB",
          bgcolor: "#FFFFFF",
          overflow: "hidden",
        }}
      >
        {accounts.length === 0 ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography variant="body1" sx={{ color: "#9CA3AF" }}>
              No bank accounts found
            </Typography>
          </Box>
        ) : (
          accounts.map((acc, index) => (
            <Box key={acc.id}>
              {index > 0 && <Divider />}
              <Box
                onClick={() => navigate(`/banks/${acc.id}`)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  p: 2,
                  cursor: "pointer",
                  "&:hover": { bgcolor: "#F9FAFB" },
                  transition: "background-color 0.15s ease",
                }}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: "#374151" }}>
                    {acc.name}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#9CA3AF", fontFamily: "monospace", fontSize: "0.85rem" }}>
                    {acc.account_number || "No account number"}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#6B7280", mt: 0.5 }}>
                    Balance: <strong style={{ color: "#1E293B" }}>{formatCurrency(acc.balance)}</strong>
                  </Typography>
                </Box>
                <IconButton size="small" sx={{ color: "#9CA3AF" }}>
                  <ChevronRightIcon />
                </IconButton>
              </Box>
            </Box>
          ))
        )}
      </Paper>

      {/* Quick Action FAB */}
      <QuickActionFAB
        customActions={[
          { label: "Add Transaction", icon: <AddCircleOutlineIcon />, onClick: () => setAddTransactionOpen(true), color: "primary.main" },
          { label: "Add Bank Account", icon: <AccountBalanceIcon />, onClick: () => setAddBankOpen(true), color: "primary.main" },
          { label: "Add PDC", icon: <ReceiptLongIcon />, onClick: () => setAddPdcOpen(true), color: "info.main" },
          { label: "Add PCF", icon: <WalletIcon />, onClick: () => setAddPcfOpen(true), color: "secondary.main" },
        ]}
      />

      {/* Add Transaction Modal */}
      <AddTransaction
        open={addTransactionOpen}
        onClose={() => setAddTransactionOpen(false)}
        onCreated={() => { setAddTransactionOpen(false); fetchAccounts(); }}
      />

      {/* Add Bank Modal */}
      <AddBankAccount
        open={addBankOpen}
        onClose={() => setAddBankOpen(false)}
        onCreated={() => { setAddBankOpen(false); fetchAccounts(); }}
      />

      {/* Add PDC Modal */}
      <PdcCreateModal
        open={addPdcOpen}
        onClose={() => setAddPdcOpen(false)}
        onCreated={() => { setAddPdcOpen(false); }}
      />

      {/* Add PCF Modal */}
      <AddPcfModal
        open={addPcfOpen}
        onClose={() => setAddPcfOpen(false)}
        onCreated={() => { setAddPcfOpen(false); }}
      />
    </Box>
  );
}
