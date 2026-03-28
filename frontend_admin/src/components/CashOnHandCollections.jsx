// src/components/CashOnHandCollections.jsx
import React, { useState, useEffect } from "react";
import {
  Paper,
  Typography,
  Box,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Stack,
  IconButton,
  Collapse,
  Button,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import api from "../services/tokenService";

function formatCurrency(value) {
  return `₱${Number(value ?? 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function CashOnHandCollections({ 
  showExport = false, 
  defaultExpanded = true,
  selectedDate = null 
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [loading, setLoading] = useState(true);
  const [collections, setCollections] = useState([]);
  const [localDeposits, setLocalDeposits] = useState([]);
  const [summary, setSummary] = useState({
    totalCollections: 0,
    totalLocalDeposits: 0,
    endingBalance: 0
  });

  const today = selectedDate || new Date().toISOString().slice(0, 10);

  useEffect(() => {
    fetchData();
  }, [today]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch transactions for the selected date
      const response = await api.get("/api/transactions-crud/", {
        params: { date: today }
      });
      
      const allTransactions = response.data.results || response.data;
      
      // Filter for collections and local_deposits
      const collectionsData = allTransactions.filter(t => 
        t.type === "collections" || t.type === "collection"
      );
      const localDepositsData = allTransactions.filter(t => 
        t.type === "local_deposits" || t.type === "local_deposit"
      );

      setCollections(collectionsData);
      setLocalDeposits(localDepositsData);

      // Calculate totals
      const totalCollections = collectionsData.reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const totalLocalDeposits = localDepositsData.reduce((sum, t) => sum + Number(t.amount || 0), 0);
      
      setSummary({
        totalCollections,
        totalLocalDeposits,
        endingBalance: totalCollections - totalLocalDeposits
      });
    } catch (error) {
      console.error("Error fetching collections data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Paper elevation={0} sx={{ borderRadius: 1, border: "1px solid", borderColor: "#E5E7EB", p: 2 }}>
        <Typography>Loading collections data...</Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={0} sx={{ borderRadius: 1, border: "1px solid", borderColor: "#E5E7EB", overflow: "hidden" }}>
      {/* Header */}
      <Box
        onClick={() => setExpanded(!expanded)}
        sx={{
          px: 2,
          py: 1.5,
          bgcolor: "#FEF3C7",
          borderBottom: expanded ? "1px solid #E5E7EB" : "none",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
          "&:hover": { bgcolor: "#FDE68A" }
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <ReceiptLongIcon sx={{ color: "#92400E", fontSize: 20 }} />
          <Typography variant="body2" sx={{ fontWeight: 700, color: "#92400E", textTransform: "uppercase", letterSpacing: "0.03em" }}>
            Cash on Hand - Collections
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Stack direction="row" spacing={2}>
            <Typography variant="body2" sx={{ color: "#166534", fontWeight: 600 }}>
              Collections: {formatCurrency(summary.totalCollections)}
            </Typography>
            <Typography variant="body2" sx={{ color: "#991B1B", fontWeight: 600 }}>
              Local Deposits: {formatCurrency(summary.totalLocalDeposits)}
            </Typography>
            <Typography variant="body2" sx={{ color: "#1E293B", fontWeight: 700 }}>
              Ending: {formatCurrency(summary.endingBalance)}
            </Typography>
          </Stack>
          <IconButton size="small">
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>
      </Box>

      <Collapse in={expanded}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "#F9FAFB" }}>
              <TableCell sx={{ fontWeight: 600, color: "#374151", width: "20%" }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 600, color: "#374151" }}>Bank Account</TableCell>
              <TableCell sx={{ fontWeight: 600, color: "#374151" }}>Description</TableCell>
              <TableCell sx={{ fontWeight: 600, color: "#374151" }}>Date</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, color: "#374151" }}>Amount</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {/* Collections Section */}
            <TableRow>
              <TableCell colSpan={5} sx={{ bgcolor: "#ECFDF5", fontWeight: 600, color: "#166534" }}>
                COLLECTIONS
              </TableCell>
            </TableRow>
            {collections.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ color: "#9CA3AF" }}>
                  No collections for this date
                </TableCell>
              </TableRow>
            ) : (
              collections.map((item, index) => (
                <TableRow key={`col-${index}`} sx={{ "&:hover": { bgcolor: "#F3F4F6" } }}>
                  <TableCell sx={{ color: "#166534", fontWeight: 500 }}>Collections</TableCell>
                  <TableCell>{item.bank_account?.name || item.bank_account || "-"}</TableCell>
                  <TableCell>{item.description || "-"}</TableCell>
                  <TableCell>{item.date}</TableCell>
                  <TableCell align="right" sx={{ color: "#166534", fontWeight: 500 }}>
                    {formatCurrency(item.amount)}
                  </TableCell>
                </TableRow>
              ))
            )}

            {/* Local Deposits Section */}
            <TableRow>
              <TableCell colSpan={5} sx={{ bgcolor: "#FEF2F2", fontWeight: 600, color: "#991B1B" }}>
                LOCAL DEPOSITS
              </TableCell>
            </TableRow>
            {localDeposits.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ color: "#9CA3AF" }}>
                  No local deposits for this date
                </TableCell>
              </TableRow>
            ) : (
              localDeposits.map((item, index) => (
                <TableRow key={`ld-${index}`} sx={{ "&:hover": { bgcolor: "#F3F4F6" } }}>
                  <TableCell sx={{ color: "#991B1B", fontWeight: 500 }}>Local Deposits</TableCell>
                  <TableCell>{item.bank_account?.name || item.bank_account || "-"}</TableCell>
                  <TableCell>{item.description || "-"}</TableCell>
                  <TableCell>{item.date}</TableCell>
                  <TableCell align="right" sx={{ color: "#991B1B", fontWeight: 500 }}>
                    {formatCurrency(item.amount)}
                  </TableCell>
                </TableRow>
              ))
            )}

            {/* Summary Row */}
            <TableRow sx={{ bgcolor: "#F1F5F9" }}>
              <TableCell colSpan={4} sx={{ fontWeight: 700, color: "#1E293B" }}>ENDING BALANCE</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, color: "#1E293B", fontSize: "1.1rem" }}>
                {formatCurrency(summary.endingBalance)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Collapse>
    </Paper>
  );
}
