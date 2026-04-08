import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { AppThemeProvider } from "./ThemeContext.jsx";
import { ToastProvider } from "./ToastContext.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";

// Global error handler for uncaught errors
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

console.log('Starting JOPCA app...');

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
