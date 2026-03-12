// src/theme/jopcaTheme.js
import { createTheme } from "@mui/material/styles";

const jopcaTheme = createTheme({
  palette: {
    primary: { main: "#D7262F", contrastText: "#ffffff" },
    secondary: { main: "#F4C542", contrastText: "#0b0b0b" },
    info: { main: "#0B3D91" },
    background: { default: "#f6f8fa", paper: "#ffffff" },
    text: { primary: "#0f172a", secondary: "#475569" },
  },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: "#ffffff",
          color: "#0f172a",
          borderBottom: "1px solid rgba(11,61,145,0.06)",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        containedPrimary: {
          background: "linear-gradient(90deg,#D7262F,#B21B24)",
          color: "#fff",
        },
        outlinedPrimary: {
          borderColor: "#D7262F",
          color: "#D7262F",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 700 },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: { fontWeight: 800 },
    h6: { fontWeight: 700 },
  },
});

export default jopcaTheme;