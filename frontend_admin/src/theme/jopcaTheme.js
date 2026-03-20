// src/theme/jopcaTheme.js
import { createTheme } from "@mui/material/styles";

const jopcaTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1565C0",
      light: "#1976D2",
      dark: "#0D47A1",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#00897B",
      light: "#26A69A",
      dark: "#00695C",
      contrastText: "#ffffff",
    },
    success: {
      main: "#2E7D32",
      light: "#4CAF50",
      dark: "#1B5E20",
    },
    warning: {
      main: "#F57C00",
      light: "#FF9800",
      dark: "#E65100",
    },
    error: {
      main: "#C62828",
      light: "#EF5350",
      dark: "#B71C1C",
    },
    info: {
      main: "#0277BD",
      light: "#03A9F4",
      dark: "#01579B",
    },
    background: {
      default: "#F5F7FA",
      paper: "#FFFFFF",
    },
    text: {
      primary: "#1A1A2E",
      secondary: "#546E7A",
    },
    divider: "#E0E0E0",
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarWidth: "thin",
          scrollbarColor: "#BDBDBD #F5F7FA",
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: "#FFFFFF",
          color: "#1A1A2E",
          borderBottom: "2px solid #E0E0E0",
          boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        containedPrimary: {
          background: "linear-gradient(135deg, #1565C0 0%, #0D47A1 100%)",
          color: "#fff",
          fontWeight: 600,
          "&:hover": {
            background: "linear-gradient(135deg, #1976D2 0%, #1565C0 100%)",
          },
        },
        containedSecondary: {
          background: "linear-gradient(135deg, #00897B 0%, #00695C 100%)",
          color: "#fff",
          fontWeight: 600,
          "&:hover": {
            background: "linear-gradient(135deg, #26A69A 0%, #00897B 100%)",
          },
        },
        outlinedPrimary: {
          borderColor: "#1565C0",
          color: "#1565C0",
          "&:hover": {
            backgroundColor: "rgba(21, 101, 192, 0.08)",
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
        elevation1: {
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        },
        elevation2: {
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          "& .MuiTableCell-root": {
            backgroundColor: "#1565C0",
            color: "#FFFFFF",
            fontWeight: 700,
            fontSize: "0.8rem",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: "1px solid #E0E0E0",
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          "&:nth-of-type(even)": {
            backgroundColor: "#F8FAFC",
          },
          "&:hover": {
            backgroundColor: "#EEF2FF !important",
          },
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          "&.Mui-focused": {
            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: "#1565C0",
              borderWidth: 2,
            },
          },
        },
      },
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 800, letterSpacing: "-0.5px" },
    h5: { fontWeight: 700, letterSpacing: "-0.25px" },
    h6: { fontWeight: 700 },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
    body1: { lineHeight: 1.6 },
    body2: { lineHeight: 1.5 },
  },
  shape: {
    borderRadius: 8,
  },
});

export default jopcaTheme;
