import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: {
      main: "#0ea5e9", // Twitter/X blue
      dark: "#0284c7",
      light: "#38bdf8",
    },
    secondary: {
      main: "#22c55e", // green for success totals
    },
    error: {
      main: "#ef4444", // red for errors
    },
    background: {
      default: "#f9fafb", // light background
    },
  },
  typography: {
    fontFamily: "Inter, Roboto, Helvetica, Arial, sans-serif",
    h4: {
      fontWeight: "bold",
    },
    h5: {
      fontWeight: "bold",
    },
    button: {
      textTransform: "none", // keep button text normal case
      fontWeight: "bold",
    },
  },
  shape: {
    borderRadius: 12, // rounded corners everywhere
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          paddingTop: "10px",
          paddingBottom: "10px",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
  },
});

export default theme;
