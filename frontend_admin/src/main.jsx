import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { AppThemeProvider } from "./ThemeContext.jsx";
import { ToastProvider } from "./ToastContext.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppThemeProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </AppThemeProvider>
  </React.StrictMode>
);
