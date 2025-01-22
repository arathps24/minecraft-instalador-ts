"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  // Progreso
  onProgressUpdate: (callback) => {
    electron.ipcRenderer.on("progress-update", (_event, progress) => callback(progress));
  },
  // Archivos descargados
  onDownloadedFiles: (callback) => {
    electron.ipcRenderer.on("downloaded-files", (_event, files) => callback(files));
  },
  // Archivos actualizados
  onUpdatedFiles: (callback) => {
    electron.ipcRenderer.on("updated-files", (_event, files) => callback(files));
  },
  // Métodos para invocar funciones del proceso principal
  installMods: () => electron.ipcRenderer.invoke("install-mods"),
  updateMods: () => electron.ipcRenderer.invoke("update-mods"),
  downloadMods: () => electron.ipcRenderer.invoke("download-mods"),
  syncMods: () => electron.ipcRenderer.invoke("sync-mods"),
  // Enviar y recibir eventos con el proceso principal usando 'send' e 'invoke'
  on(...args) {
    const [channel, listener] = args;
    return electron.ipcRenderer.on(channel, (event, ...args2) => listener(event, ...args2));
  },
  off(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.off(channel, ...omit);
  },
  send(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.send(channel, ...omit);
  },
  invoke(...args) {
    const [channel, ...omit] = args;
    return electron.ipcRenderer.invoke(channel, ...omit);
  }
});
