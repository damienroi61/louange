// Pont sécurisé entre Electron et l'interface (contextIsolation)
const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('louange', {
  isElectron: true,
  platform: process.platform,
  getDisplays: () => ipcRenderer.invoke('displays'),
  openWindow: (kind, displayId) => ipcRenderer.invoke('open-window', kind, displayId),
  closeWindow: (kind) => ipcRenderer.invoke('close-window', kind),
  isWindowOpen: (kind) => ipcRenderer.invoke('is-window-open', kind),
  identifyDisplays: () => ipcRenderer.invoke('identify-displays'),
  onWindowClosed: (cb) => ipcRenderer.on('window-closed', (_e, kind) => cb(kind)),
  getPathForFile: (file) => {
    try {
      return webUtils.getPathForFile(file);
    } catch {
      return '';
    }
  },
  convertPresentation: (p) => ipcRenderer.invoke('convert-presentation', p),
  readFile: (p) => ipcRenderer.invoke('read-file', p),
  remote: {
    start: (port, pin) => ipcRenderer.invoke('remote-start', port, pin),
    stop: () => ipcRenderer.invoke('remote-stop'),
    pushState: (state) => ipcRenderer.send('remote-state', state),
    onCommand: (cb) => ipcRenderer.on('remote-command', (_e, cmd) => cb(cmd)),
  },
});
