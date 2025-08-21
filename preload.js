// preload.js - Secure bridge between main and renderer processes

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: () => ipcRenderer.invoke('dialog:openDirectory'),
  downloadDemo: (args) => ipcRenderer.send('download-demo', args),
  onDownloadStatus: (callback) => ipcRenderer.on('download-status', (_event, value) => callback(value)),
  // Expose a generic way to interact with electron-store
  store: {
    get(key) {
      return ipcRenderer.invoke('electron-store', 'get', key);
    },
    set(key, val) {
      ipcRenderer.invoke('electron-store', 'set', key, val);
    },
  },
});
