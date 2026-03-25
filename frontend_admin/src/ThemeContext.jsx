import { createContext, useContext, useState, useMemo, useEffect } from "react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import createAppTheme, { COLOR_SCHEMES, DARK_COLOR_SCHEMES } from "./theme";

const ThemeContext = createContext();

export const useThemeColor = () => useContext(ThemeContext);

export function AppThemeProvider({ children }) {
  const [colorScheme, setColorScheme] = useState(() => {
    const saved = localStorage.getItem("colorScheme");
    return saved && COLOR_SCHEMES[saved] ? saved : "blue";
  });

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved === "true";
  });

  useEffect(() => {
    localStorage.setItem("colorScheme", colorScheme);
  }, [colorScheme]);

  useEffect(() => {
    localStorage.setItem("darkMode", darkMode);
  }, [darkMode]);

  const theme = useMemo(() => createAppTheme(colorScheme, darkMode ? "dark" : "light"), [colorScheme, darkMode]);

  const value = useMemo(
    () => ({
      colorScheme,
      setColorScheme,
      darkMode,
      setDarkMode,
      colorSchemes: darkMode ? DARK_COLOR_SCHEMES : COLOR_SCHEMES,
    }),
    [colorScheme, darkMode]
  );

  return (
    <ThemeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
}
