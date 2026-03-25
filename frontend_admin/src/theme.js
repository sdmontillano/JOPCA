import { createTheme } from "@mui/material/styles";

export const COLOR_SCHEMES = {
  blue: {
    primary: { main: "#0ea5e9", dark: "#0284c7", light: "#38bdf8" },
    name: "Blue",
  },
  green: {
    primary: { main: "#22c55e", dark: "#16a34a", light: "#4ade80" },
    name: "Green",
  },
  purple: {
    primary: { main: "#8b5cf6", dark: "#7c3aed", light: "#a78bfa" },
    name: "Purple",
  },
  orange: {
    primary: { main: "#f97316", dark: "#ea580c", light: "#fb923c" },
    name: "Orange",
  },
  red: {
    primary: { main: "#ef4444", dark: "#dc2626", light: "#f87171" },
    name: "Red",
  },
  teal: {
    primary: { main: "#14b8a6", dark: "#0d9488", light: "#2dd4bf" },
    name: "Teal",
  },
};

export const DARK_COLOR_SCHEMES = {
  blue: {
    primary: { main: "#38bdf8", dark: "#0ea5e9", light: "#7dd3fc" },
    name: "Blue",
  },
  green: {
    primary: { main: "#4ade80", dark: "#22c55e", light: "#86efac" },
    name: "Green",
  },
  purple: {
    primary: { main: "#a78bfa", dark: "#8b5cf6", light: "#c4b5fd" },
    name: "Purple",
  },
  orange: {
    primary: { main: "#fb923c", dark: "#f97316", light: "#fdba74" },
    name: "Orange",
  },
  red: {
    primary: { main: "#f87171", dark: "#ef4444", light: "#fca5a5" },
    name: "Red",
  },
  teal: {
    primary: { main: "#2dd4bf", dark: "#14b8a6", light: "#5eead4" },
    name: "Teal",
  },
};

const createAppTheme = (colorScheme = "blue", mode = "light") => {
  const schemes = mode === "dark" ? DARK_COLOR_SCHEMES : COLOR_SCHEMES;
  const colors = schemes[colorScheme] || schemes.blue;

  return createTheme({
    palette: {
      mode,
      primary: colors.primary,
      secondary: {
        main: mode === "dark" ? "#4ade80" : "#22c55e",
      },
      error: {
        main: "#ef4444",
      },
      background: {
        default: mode === "dark" ? "#0f172a" : "#f9fafb",
        paper: mode === "dark" ? "#1e293b" : "#ffffff",
      },
      text: {
        primary: mode === "dark" ? "#f1f5f9" : "#374151",
        secondary: mode === "dark" ? "#94a3b8" : "#6b7280",
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
        textTransform: "none",
        fontWeight: "bold",
      },
    },
    shape: {
      borderRadius: 12,
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
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: mode === "dark" ? "#1e293b" : "#ffffff",
            color: mode === "dark" ? "#f1f5f9" : "#374151",
          },
        },
      },
    },
  });
};

export default createAppTheme;
