const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  
  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  
  // Database operations
  exportDatabase: () => ipcRenderer.invoke('export-database'),
  importDatabase: () => ipcRenderer.invoke('import-database'),
  backupDatabase: () => ipcRenderer.invoke('backup-database'),
  
  // Backend configuration
  setBackendConfig: (mode, url) => 
    ipcRenderer.invoke('set-backend-config', mode, url),
  getBackendConfig: () => 
    ipcRenderer.invoke('get-backend-config'),
  
  // Utilities
  log: (message) => console.log('[Renderer]:', message),
  isElectron: true,
  platform: process.platform,
});

console.log('[JOPCA] Preload script loaded successfully');
