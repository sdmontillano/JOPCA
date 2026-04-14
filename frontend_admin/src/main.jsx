import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { AppThemeProvider } from "./ThemeContext.jsx";
import { ToastProvider } from "./ToastContext.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";

// Global error handler for uncaught errors (production safe)
window.addEventListener('error', (event) => {
  // In production, you might want to send this to an error reporting service
  // console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  // In production, you might want to send this to an error reporting service
  // console.error('Unhandled promise rejection:', event.reason);
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AppThemeProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AppThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
