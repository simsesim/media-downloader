const { app, BrowserWindow, ipcMain, dialog } = require('electron');  // Add dialog
const { spawn } = require('child_process');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 600,
    height: 300,
    resizable: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Add this new handler for folder selection
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']  // Only allow folder selection
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];  // Return the selected folder path
  }
  
  return null;  // User canceled
});

// Update your existing download handler to accept output path
ipcMain.handle('download-video', async (event, url, type, outputPath) => {
  console.log(`Received ${type} download request for:`, url);
  console.log('Output path:', outputPath);
  
  return new Promise((resolve, reject) => {
    // Get the bundled yt-dlp binary path
    const isDev = process.env.NODE_ENV === 'development';
    let ytdlpCmd;
    
    if (isDev) {
      // In development, use system yt-dlp
      ytdlpCmd = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
    } else {
      // In production, use bundled binary
      const resourcesPath = process.resourcesPath;
      if (process.platform === 'win32') {
        ytdlpCmd = path.join(resourcesPath, 'binaries', 'yt-dlp.exe');
      } else if (process.platform === 'darwin') {
        ytdlpCmd = path.join(resourcesPath, 'binaries', 'yt-dlp-macos');
      } else {
        ytdlpCmd = path.join(resourcesPath, 'binaries', 'yt-dlp-linux');
      }
    }
    
    let args = [url, '--no-playlist'];
    
    // Add output path if provided
    if (outputPath) {
      args.push('-o', path.join(outputPath, '%(title)s.%(ext)s'));
    }
    
    if (type === 'audio') {
      args.push('-x');
      args.push('--audio-format', 'mp3');
    }
    
    const ytdlp = spawn(ytdlpCmd, args);
    
    let output = '';
    let error = '';
    
    ytdlp.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    ytdlp.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    ytdlp.on('close', (code) => {
      if (code === 0) {
        resolve(`Success! Downloaded ${type} to ${outputPath || 'current directory'}:\n${output}`);
      } else {
        reject(`Failed with code ${code}:\n${error}`);
      }
    });
  });
});