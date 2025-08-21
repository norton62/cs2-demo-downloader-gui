// preload.js - Secure bridge between main and renderer processes

const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Main Actions
  selectFolder: () => ipcRenderer.invoke('dialog:openDirectory'),
  downloadDemo: (args) => ipcRenderer.send('download-demo', args),
  findDemos: (codes) => ipcRenderer.invoke('find-demos', codes),
  downloadAllDemos: (urls, path, workers) => ipcRenderer.send('download-all-demos', { urls, path, workers }),
  retryDownload: (url, path) => ipcRenderer.send('retry-download', { url, path }),
  
  // Listeners
  onDownloadStatus: (callback) => ipcRenderer.on('download-status', (_event, value) => callback(value)),
  onProgressUpdate: (callback) => ipcRenderer.on('progress-update', (_event, value) => callback(value)),

  // External Link
  openExternalLink: (url) => ipcRenderer.send('open-external-link', url),

  // Store
  store: {
    get(key) {
      return ipcRenderer.invoke('electron-store', 'get', key);
    },
    set(key, val) {
      ipcRenderer.invoke('electron-store', 'set', key, val);
    },
  },
});
