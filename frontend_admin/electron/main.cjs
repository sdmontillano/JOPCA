const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

// Keep references to prevent garbage collection
let mainWindow = null;
let djangoServer = null;
let viteServer = null;

// Check if running in development or production
const isDev = !app.isPackaged;

// Paths - different for dev vs production
const APP_DIR = app.getAppPath();
let BACKEND_DIR;
let FRONTEND_DIR;
const USER_DATA_BACKEND = path.join(app.getPath('userData'), 'banking_dcpr');

if (isDev) {
  // Development: frontend_admin is at the same level as banking_dcpr
  BACKEND_DIR = path.join(APP_DIR, '..', 'banking_dcpr');
  FRONTEND_DIR = APP_DIR;
} else {
  // Production: copy backend from resources to userData (writable location)
  FRONTEND_DIR = APP_DIR;
  
  const RESOURCES_BACKEND = path.join(process.resourcesPath, 'banking_dcpr');
  
  // Copy backend to userData if not already there or if resources are newer
  if (fs.existsSync(RESOURCES_BACKEND)) {
    if (!fs.existsSync(USER_DATA_BACKEND)) {
      console.log('[JOPCA] Copying backend to writable location:', USER_DATA_BACKEND);
      copyDirRecursive(RESOURCES_BACKEND, USER_DATA_BACKEND);
    }
  }
  
  BACKEND_DIR = USER_DATA_BACKEND;
}

// Helper function to recursively copy directory
function copyDirRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('[JOPCA] Starting application...');
console.log('[JOPCA] App path:', APP_DIR);
console.log('[JOPCA] Backend path:', BACKEND_DIR);
console.log('[JOPCA] Is development:', isDev);

function createWindow() {
  console.log('[JOPCA] Creating main window...');
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'JOPCA',
    icon: path.join(__dirname, '..', 'public', 'jopca-logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
    show: false,
    backgroundColor: '#1E293B',
  });

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    console.log('[JOPCA] Window ready to show');
    mainWindow.show();
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Load the app
  if (isDev) {
    console.log('[JOPCA] Loading development server...');
    mainWindow.loadURL('http://localhost:5173').catch(err => {
      console.error('[JOPCA] Failed to load dev server:', err);
    });
    mainWindow.webContents.openDevTools();
  } else {
    console.log('[JOPCA] Loading production build...');
    
    // In production with asar, the app path is the asar file
    // We need to construct the path to index.html inside the asar
    let indexPath;
    
    if (APP_DIR.endsWith('.asar')) {
      // Running from asar archive
      indexPath = path.join(APP_DIR, 'dist', 'index.html');
    } else {
      // Running from unpacked directory
      indexPath = path.join(APP_DIR, 'dist', 'index.html');
    }
    
    console.log('[JOPCA] Looking for index.html at:', indexPath);
    
    if (!fs.existsSync(indexPath)) {
      const errorMsg = 'Frontend build not found at:\n' + indexPath +
        '\n\nApp path: ' + APP_DIR +
        '\n\nPlease reinstall JOPCA.';
      console.error('[JOPCA] ERROR:', errorMsg);
      const { dialog } = require('electron');
      dialog.showErrorBox('JOPCA Error', errorMsg);
      return;
    }
    
    mainWindow.loadFile(indexPath).catch(err => {
      console.error('[JOPCA] Failed to load production build:', err);
      const { dialog } = require('electron');
      dialog.showErrorBox('JOPCA Error', 'Failed to load frontend:\n' + err.message);
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startViteServer() {
  if (!isDev) return;
  
  console.log('[JOPCA] Starting Vite dev server...');
  
  viteServer = spawn('npm', ['run', 'dev'], {
    cwd: FRONTEND_DIR,
    shell: true,
    windowsHide: true,
  });
  
  viteServer.stdout.on('data', (data) => {
    const output = data.toString().trim();
    if (output.includes('Local:') || output.includes('ready in')) {
      console.log('[Vite]:', output);
    }
  });
  
  viteServer.stderr.on('data', (data) => {
    console.error('[Vite error]:', data.toString().trim());
  });
  
  viteServer.on('error', (err) => {
    console.error('[JOPCA] Vite server error:', err);
  });
}

// IPC handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-platform', () => {
  return process.platform;
});

function cleanup() {
  console.log('[JOPCA] Cleaning up...');
  
  if (djangoServer) {
    djangoServer.kill();
  }
  
  if (viteServer) {
    viteServer.kill();
  }
}

app.whenReady().then(() => {
  console.log('[JOPCA] App ready');
  
  startDjangoServer();
  
  if (isDev) {
    startViteServer();
  }
  
  setTimeout(createWindow, 2000);
});

app.on('window-all-closed', () => {
  console.log('[JOPCA] All windows closed');
  cleanup();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  console.log('[JOPCA] App quitting...');
  cleanup();
});

process.on('uncaughtException', (error) => {
  console.error('[JOPCA] Uncaught exception:', error);
  const { dialog } = require('electron');
  dialog.showErrorBox('JOPCA Error', 'Uncaught Exception:\n' + error.message);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[JOPCA] Unhandled rejection at:', promise, 'reason:', reason);
});

// ===== Missing IPC Handlers =====

ipcMain.handle('minimize-window', () => {
  mainWindow?.minimize();
});

ipcMain.handle('maximize-window', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.handle('close-window', () => {
  mainWindow?.close();
});

// Database handlers (optional - for future use)
ipcMain.handle('export-database', (event, data) => {
  console.log('[JOPCA] Export database requested');
  const { dialog } = require('electron');
  const fs = require('fs');
  try {
    const dbPath = path.join(BACKEND_DIR, 'db.sqlite3');
    if (fs.existsSync(dbPath)) {
      const savePath = dialog.showSaveDialogSync(mainWindow, {
        title: 'Export Database',
        defaultPath: 'jopca-backup.sqlite3',
        filters: [{ name: 'SQLite Database', extensions: ['sqlite3', 'db'] }]
      });
      if (savePath) {
        fs.copyFileSync(dbPath, savePath);
        return { success: true, path: savePath };
      }
    }
    return { success: false, error: 'Database not found' };
  } catch (err) {
    console.error('[JOPCA] Export failed:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('import-database', (event) => {
  console.log('[JOPCA] Import database requested');
  const { dialog } = require('electron');
  const fs = require('fs');
  try {
    const result = dialog.showOpenDialogSync(mainWindow, {
      title: 'Import Database',
      filters: [{ name: 'SQLite Database', extensions: ['sqlite3', 'db'] }],
      properties: ['openFile']
    });
    if (result && result[0]) {
      const dbPath = path.join(BACKEND_DIR, 'db.sqlite3');
      fs.copyFileSync(result[0], dbPath);
      return { success: true, path: result[0] };
    }
    return { success: false, error: 'No file selected' };
  } catch (err) {
    console.error('[JOPCA] Import failed:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('backup-database', () => {
  console.log('[JOPCA] Backup database requested');
  const fs = require('fs');
  try {
    const dbPath = path.join(BACKEND_DIR, 'db.sqlite3');
    if (fs.existsSync(dbPath)) {
      const backupDir = path.join(app.getPath('userData'), 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(backupDir, `backup-${timestamp}.sqlite3`);
      fs.copyFileSync(dbPath, backupPath);
      return { success: true, path: backupPath };
    }
    return { success: false, error: 'Database not found' };
  } catch (err) {
    console.error('[JOPCA] Backup failed:', err);
    return { success: false, error: err.message };
  }
});

// ===== Backend Configuration =====

const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json');

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    }
  } catch (e) {
    console.error('[JOPCA] Failed to load config:', e);
  }
  return { backendMode: 'local', apiUrl: 'http://localhost:8000' };
}

function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  } catch (e) {
    console.error('[JOPCA] Failed to save config:', e);
  }
}

// Make config available globally
global.sharedConfig = loadConfig();

ipcMain.handle('set-backend-config', (event, mode, url) => {
  global.sharedConfig.backendMode = mode;
  if (url) global.sharedConfig.apiUrl = url;
  saveConfig(global.sharedConfig);
  return true;
});

ipcMain.handle('get-backend-config', () => {
  return global.sharedConfig;
});

// Update startDjangoServer to use config and proper path handling
function startDjangoServer() {
  if (global.sharedConfig.backendMode === 'remote') {
    console.log('[JOPCA] Using remote backend:', global.sharedConfig.apiUrl);
    return null;
  }
  
  console.log('[JOPCA] Starting Django backend...');
  console.log('[JOPCA] Looking for backend at:', BACKEND_DIR);
  
  // Check if backend directory exists
  if (!fs.existsSync(BACKEND_DIR)) {
    const errorMsg = 'Backend directory not found at:\n' + BACKEND_DIR + 
      '\n\nPlease ensure JOPCA was installed correctly.';
    console.error('[JOPCA] ERROR:', errorMsg);
    const { dialog } = require('electron');
    dialog.showErrorBox('JOPCA Startup Error', errorMsg);
    return null;
  }
  
  const dbPath = path.join(BACKEND_DIR, 'db.sqlite3');
  const managePyPath = path.join(BACKEND_DIR, 'manage.py');
  
  if (!fs.existsSync(managePyPath)) {
    const errorMsg = 'manage.py not found at:\n' + managePyPath + 
      '\n\nPlease ensure JOPCA was installed correctly.';
    console.error('[JOPCA] ERROR:', errorMsg);
    const { dialog } = require('electron');
    dialog.showErrorBox('JOPCA Startup Error', errorMsg);
    return null;
  }
  
  // Check if Python is available
  const pythonCheck = spawn('python', ['--version'], {
    shell: true,
    windowsHide: true,
  });
  
  pythonCheck.on('error', (err) => {
    const errorMsg = 'Python is not installed or not found in PATH.\n' +
      'Please install Python 3.13 or later from https://python.org';
    console.error('[JOPCA] Python not found:', err);
    const { dialog } = require('electron');
    dialog.showErrorBox('JOPCA - Python Required', errorMsg);
  });
  
  if (!fs.existsSync(dbPath)) {
    console.log('[JOPCA] Database not found, running migrations...');
    
    const migrateProcess = spawn('python', ['manage.py', 'migrate'], {
      cwd: BACKEND_DIR,
      shell: true,
      windowsHide: true,
    });
    
    migrateProcess.stdout.on('data', (data) => {
      console.log('[Django migrate]:', data.toString().trim());
    });
    
    migrateProcess.stderr.on('data', (data) => {
      console.error('[Django migrate error]:', data.toString().trim());
    });
    
    migrateProcess.on('close', (code) => {
      if (code === 0) {
        console.log('[JOPCA] Migrations completed successfully');
        startDjangoRunServer();
      } else {
        console.error('[JOPCA] Migration failed with code:', code);
      }
    });
  } else {
    startDjangoRunServer();
  }
  return null;
}

function startDjangoRunServer() {
  console.log('[JOPCA] Starting Django runserver...');
  
  djangoServer = spawn('python', ['manage.py', 'runserver', '8000', '--noreload'], {
    cwd: BACKEND_DIR,
    shell: true,
    windowsHide: false,
    env: { ...process.env, DJANGO_SETTINGS_MODULE: 'banking_dcpr.settings' }
  });
  
  djangoServer.stdout.on('data', (data) => {
    const output = data.toString().trim();
    console.log('[Django]:', output);
    if (output.includes('Starting development server') || 
        output.includes('Quit the server with') ||
        output.includes('Starting')) {
      console.log('[JOPCA] Django server started successfully!');
    }
  });
  
  djangoServer.stderr.on('data', (data) => {
    const error = data.toString().trim();
    console.error('[Django error]:', error);
    if (error.includes('Error') || error.includes('Exception')) {
      const { dialog } = require('electron');
      dialog.showErrorBox('Django Error', 'Backend Error:\n' + error);
    }
  });
  
  djangoServer.on('error', (err) => {
    console.error('[JOPCA] Django server error:', err);
    const { dialog } = require('electron');
    dialog.showErrorBox('JOPCA Error', 'Failed to start Django server:\n' + err.message);
  });
  
  djangoServer.on('close', (code) => {
    console.log('[JOPCA] Django server closed with code:', code);
  });
}
