import { useState } from "react";
import {
  Fab,
  Paper,
  Typography,
  MenuItem,
  Divider,
  Box,
  Zoom,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import WalletIcon from "@mui/icons-material/Wallet";
import ReceiptIcon from "@mui/icons-material/Receipt";

export default function QuickActionFAB({
  actions = [
    { label: "Add Transaction", icon: <AddCircleOutlineIcon />, onClick: null, color: "primary.main" },
    { label: "Add Bank Account", icon: <AccountBalanceIcon />, onClick: null, color: "primary.main" },
    { label: "Add PDC", icon: <ReceiptLongIcon />, onClick: null, color: "info.main" },
    { label: "Add PCF", icon: <WalletIcon />, onClick: null, color: "secondary.main" },
  ],
  customActions = null,
}) {
  const [fabOpen, setFabOpen] = useState(false);

  const menuItems = customActions || actions.filter(a => a.onClick);

  if (menuItems.length === 0) return null;

  return (
    <>
      {/* Floating Action Button - Quick Add Menu */}
      <Zoom in timeout={300}>
        <Fab
          aria-label="quick-actions"
          sx={{
            position: "fixed",
            bottom: 32,
            right: 32,
            width: 60,
            height: 60,
            bgcolor: "#1E293B",
            color: "white",
            boxShadow: "0 4px 12px rgba(30,41,59,0.3)",
            "&:hover": {
              bgcolor: "#334155",
              boxShadow: "0 6px 16px rgba(30,41,59,0.4)",
              transform: "scale(1.05)",
            },
            transition: "all 0.2s ease-in-out",
          }}
          onClick={() => setFabOpen(!fabOpen)}
        >
          <AddIcon sx={{ fontSize: 28, transform: fabOpen ? "rotate(45deg)" : "none", transition: "transform 0.2s" }} />
        </Fab>
      </Zoom>

      {/* FAB Menu */}
      <Zoom in={fabOpen}>
        <Paper
          sx={{
            position: "fixed",
            bottom: 100,
            right: 32,
            p: 1.5,
            borderRadius: 2,
            minWidth: 200,
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            zIndex: 1000,
          }}
        >
          <Typography 
            variant="caption" 
            sx={{ 
              px: 1, 
              pb: 1, 
              color: "text.secondary", 
              fontWeight: 600, 
              textTransform: "uppercase", 
              letterSpacing: "0.05em", 
              display: "block" 
            }}
          >
            Quick Actions
          </Typography>
          <Divider sx={{ mb: 1 }} />
          
          {menuItems.map((action, index) => (
            <MenuItem 
              key={index}
              onClick={() => { 
                if (action.onClick) action.onClick();
                setFabOpen(false);
              }} 
              sx={{ borderRadius: 1, py: 1.5 }}
            >
              <Box sx={{ mr: 1.5, color: action.color || "primary.main", display: "flex" }}>
                {action.icon}
              </Box>
              <Typography variant="body2" fontWeight={500}>
                {action.label}
              </Typography>
            </MenuItem>
          ))}
        </Paper>
      </Zoom>

      {/* FAB Backdrop */}
      {fabOpen && (
        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: "rgba(0,0,0,0.3)",
            zIndex: 999,
          }}
          onClick={() => setFabOpen(false)}
        />
      )}
    </>
  );
}