const { app, BrowserWindow } = require('electron');
const path = require('path');
const http = require('http');

require('dotenv').config({ path: path.join(__dirname, '.env') });
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); process.exit(0); }

const PORT = process.env.PORT || 3000;
const URL = `http://localhost:${PORT}`;

function waitForServer(retries = 300) {
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = http.get(URL, (res) => { res.resume(); resolve(); });
      req.on('error', () => {
        if (retries-- <= 0) return reject(new Error('Server did not start'));
        setTimeout(attempt, 200);
      });
    };
    attempt();
  });
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    show: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true }
  });

  win.once('ready-to-show', () => win.show());

  win.loadURL('data:text/html,<body style="margin:0;background:%2312305a;color:white;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh"><h2>Starting Student Records...</h2></body>');

  // start Express + Atlas AFTER the splash is on screen
  setImmediate(() => require('./app'));

  try {
    await waitForServer();
    win.loadURL(URL);
  } catch (e) {
    win.loadURL('data:text/html,<h2 style="font-family:sans-serif;padding:40px">Could not start the server. Check your internet and .env</h2>');
  }
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });