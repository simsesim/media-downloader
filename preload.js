const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('myAPI', {
  testMessage: () => {
    return "Hello from the main process!";
  },
  
  selectFolder: () => {
    return ipcRenderer.invoke('select-folder');
  },
  
  downloadVideo: (url, type, outputPath) => {
    return ipcRenderer.invoke('download-video', url, type, outputPath);
  }
});