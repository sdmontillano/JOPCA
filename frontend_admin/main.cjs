// main.cjs (diagnostic and production-safe)
const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

function getIndexPath() {
  if (!app.isPackaged) {
    return 'http://localhost:5173';
  }
  // Typical packaged location: resources/app/dist/index.html
  const candidate = path.join(process.resourcesPath, 'app', 'dist', 'index.html');
  if (fs.existsSync(candidate)) return `file://${candidate}`;
  // Fallback if not asar-packed: __dirname may contain the app folder
  const alt = path.join(__dirname, 'dist', 'index.html');
  if (fs.existsSync(alt)) return `file://${alt}`;
  return null;
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });

  const indexPath = getIndexPath();
  if (!indexPath) {
    console.error('ERROR: index.html not found. Checked process.resourcesPath and __dirname.');
    mainWindow.loadURL('data:text/html,<h1>Missing index.html</h1><p>Open DevTools for details.</p>');
    mainWindow.webContents.openDevTools();
    return;
  }

  mainWindow.loadURL(indexPath);
  mainWindow.webContents.openDevTools();
  mainWindow.webContents.on('console-message', (e, level, message, line, sourceId) => {
    console.log(`Renderer console [${level}] ${sourceId}:${line} - ${message}`);
  });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });