// src/theme/jopcaTheme.js - Modern Minimal Design
import { createTheme } from "@mui/material/styles";

const jopcaTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1E293B",       // Slate dark - clean, minimal
      light: "#334155",
      dark: "#0F172A",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#475569",       // Slate gray - neutral secondary
      light: "#64748B",
      dark: "#334155",
      contrastText: "#ffffff",
    },
    success: {
      main: "#166534",       // Muted green - not bright
      light: "#15803D",
      dark: "#14532D",
      contrastText: "#ffffff",
    },
    error: {
      main: "#991B1B",      // Muted red - not bright
      light: "#B91C1C",
      dark: "#7F1D1D",
      contrastText: "#ffffff",
    },
    warning: {
      main: "#B45309",      // Amber muted
      light: "#D97706",
      dark: "#92400E",
    },
    info: {
      main: "#1E40AF",      // Blue muted
      light: "#2563EB",
      dark: "#1E3A8A",
    },
    background: {
      default: "#FFFFFF",    // Pure white
      paper: "#FFFFFF",
    },
    text: {
      primary: "#374151",    // Gray text
      secondary: "#6B7280",  // Light gray text
    },
    divider: "#E5E7EB",
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
      fontSize: "1.875rem",
      letterSpacing: "-0.02em",
    },
    h5: {
      fontWeight: 600,
      fontSize: "1.5rem",
      letterSpacing: "-0.01em",
    },
    h6: {
      fontWeight: 600,
      fontSize: "1.125rem",
    },
    subtitle1: {
      fontWeight: 500,
      fontSize: "1rem",
    },
    subtitle2: {
      fontWeight: 500,
      fontSize: "0.875rem",
      color: "#6B7280",
    },
    body1: {
      fontSize: "0.9375rem",
      lineHeight: 1.6,
    },
    body2: {
      fontSize: "0.875rem",
      lineHeight: 1.5,
    },
    button: {
      textTransform: "none",
      fontWeight: 500,
    },
    caption: {
      fontSize: "0.75rem",
      color: "#6B7280",
    },
  },
  shape: {
    borderRadius: 6,
  },
  shadows: [
    "none",
    "0 1px 2px 0 rgba(0,0,0,0.05)",
    "0 1px 3px 0 rgba(0,0,0,0.1)",
    "0 1px 5px 0 rgba(0,0,0,0.1)",
    "0 2px 5px 0 rgba(0,0,0,0.1)",
    "0 3px 8px 0 rgba(0,0,0,0.1)",
    "0 4px 10px 0 rgba(0,0,0,0.1)",
    "0 5px 12px 0 rgba(0,0,0,0.1)",
    "0 6px 15px 0 rgba(0,0,0,0.1)",
    "0 7px 18px 0 rgba(0,0,0,0.1)",
    "0 8px 20px 0 rgba(0,0,0,0.1)",
    "0 9px 22px 0 rgba(0,0,0,0.1)",
    "0 10px 25px 0 rgba(0,0,0,0.1)",
    "0 11px 28px 0 rgba(0,0,0,0.1)",
    "0 12px 30px 0 rgba(0,0,0,0.1)",
    "0 13px 32px 0 rgba(0,0,0,0.1)",
    "0 14px 35px 0 rgba(0,0,0,0.1)",
    "0 15px 38px 0 rgba(0,0,0,0.1)",
    "0 16px 40px 0 rgba(0,0,0,0.1)",
    "0 17px 42px 0 rgba(0,0,0,0.1)",
    "0 18px 45px 0 rgba(0,0,0,0.1)",
    "0 19px 48px 0 rgba(0,0,0,0.1)",
    "0 20px 50px 0 rgba(0,0,0,0.1)",
    "0 21px 52px 0 rgba(0,0,0,0.1)",
    "0 22px 55px 0 rgba(0,0,0,0.1)",
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: "thin",
          scrollbarColor: "#D1D5DB transparent",
          "&::-webkit-scrollbar": {
            width: "6px",
            height: "6px",
          },
          "&::-webkit-scrollbar-track": {
            background: "transparent",
          },
          "&::-webkit-scrollbar-thumb": {
            background: "#D1D5DB",
            borderRadius: "3px",
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: "#FFFFFF",
          color: "#374151",
          boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)",
          borderBottom: "1px solid #E5E7EB",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          padding: "8px 16px",
          boxShadow: "none",
          "&:hover": {
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          },
        },
        containedPrimary: {
          backgroundColor: "#1E293B",
          "&:hover": {
            backgroundColor: "#334155",
            boxShadow: "0 2px 4px rgba(30,41,59,0.2)",
          },
        },
        containedSecondary: {
          backgroundColor: "#475569",
          "&:hover": {
            backgroundColor: "#64748B",
          },
        },
        outlined: {
          borderColor: "#D1D5DB",
          "&:hover": {
            backgroundColor: "#F9FAFB",
            borderColor: "#9CA3AF",
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: "0 1px 3px 0 rgba(0,0,0,0.1)",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: "0 1px 3px 0 rgba(0,0,0,0.1)",
          border: "1px solid #E5E7EB",
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          "& .MuiTableCell-head": {
            backgroundColor: "#1E293B",
            color: "#FFFFFF",
            fontWeight: 600,
            fontSize: "0.75rem",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            borderBottom: "none",
            padding: "10px 16px",
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          "&:nth-of-type(even)": {
            backgroundColor: "#F9FAFB",
          },
          "&:hover": {
            backgroundColor: "#F3F4F6 !important",
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: "10px 16px",
          borderBottom: "1px solid #E5E7EB",
          color: "#374151",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
      },
    },
    MuiFab: {
      styleOverrides: {
        root: {
          boxShadow: "0 4px 10px rgba(71,85,105,0.3)",
          "&:hover": {
            boxShadow: "0 6px 14px rgba(71,85,105,0.35)",
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 6,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: "#1E293B",
              borderWidth: 1,
            },
          },
        },
      },
    },
  },
});

export default jopcaTheme;
