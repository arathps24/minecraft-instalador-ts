import { ipcRenderer, contextBridge } from 'electron'

// Exponer algunas funciones de IPC al proceso de renderizado
contextBridge.exposeInMainWorld('electronAPI', {
  // Progreso
  onProgressUpdate: (callback: (progress: number) => void) => {
    ipcRenderer.on('progress-update', (_event, progress) => callback(progress));
  },

  // Archivos descargados
  onDownloadedFiles: (callback: (files: string[]) => void) => {
    ipcRenderer.on('downloaded-files', (_event, files) => callback(files)); // Se asume que 'files' es un array de strings
  },

  // Archivos actualizados
  onUpdatedFiles: (callback: (files: string[]) => void) => {
    ipcRenderer.on('updated-files', (_event, files) => callback(files)); // Se asume que 'files' es un array de strings
  },

  // Métodos para invocar funciones del proceso principal
  installMods: () => ipcRenderer.invoke('install-mods'),
  updateMods: () => ipcRenderer.invoke('update-mods'),
  downloadMods: () => ipcRenderer.invoke('download-mods'),
  syncMods: () => ipcRenderer.invoke('sync-mods'),

  // Enviar y recibir eventos con el proceso principal usando 'send' e 'invoke'
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args;
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args));
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args;
    return ipcRenderer.off(channel, ...omit);
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args;
    return ipcRenderer.send(channel, ...omit);
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args;
    return ipcRenderer.invoke(channel, ...omit);
  },
});
