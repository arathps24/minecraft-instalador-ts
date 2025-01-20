import{ app, BrowserWindow, ipcMain } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { downloadMods, syncMods, downloadedFiles, updatedFiles } from './modManager';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;

process.env.APP_ROOT = path.join(__dirname, '..');

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron');
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST;

function createWindow() {
  mainWindow = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  });
// Ocultar la barra de menú
mainWindow.setMenuBarVisibility(false);
  // Test active push message to Renderer-process.
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow?.webContents.send('main-process-message', (new Date).toLocaleString());
  });

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
  } else {
    // win.loadFile('dist/index.html')
    mainWindow.loadFile(path.join(RENDERER_DIST, 'index.html'));
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    mainWindow = null;
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(createWindow);

// Handling downloadMods
ipcMain.handle('download-mods', async () => {
  if (!mainWindow) {
    console.error("mainWindow is null");
    return; // No podemos proceder si no hay ventana
  }

  await downloadMods((progress) => {
    // Envía el progreso al renderer
    mainWindow?.webContents.send('progress-update', progress);
  });

  // Envía los archivos descargados al renderer
  mainWindow?.webContents.send('downloaded-files', downloadedFiles);
});

// Handling syncMods
ipcMain.handle('sync-mods', async () => {
  if (!mainWindow) {
    console.error("mainWindow is null");
    return; // No podemos proceder si no hay ventana
  }

  await syncMods((progress) => {
    // Envía el progreso al renderer
    mainWindow?.webContents.send('progress-update', progress);
  });

  // Envía los archivos actualizados al renderer
  mainWindow?.webContents.send('updated-files', updatedFiles);
});

// Handling installMods (Nueva función agregada)
ipcMain.handle('install-mods', async () => {
  if (!mainWindow) {
    console.error("mainWindow is null");
    return; // No podemos proceder si no hay ventana
  }

  try {
    // Llamamos a la función para descargar mods (simulando la instalación)
    await downloadMods((progress) => {
      // Envía el progreso al renderer durante la instalación
      mainWindow?.webContents.send('progress-update', progress);
    });

    // Después de la descarga, enviamos los archivos descargados
    mainWindow?.webContents.send('downloaded-files', downloadedFiles); 
  } catch (error) {
    console.error('Error al instalar los mods:', error);
    mainWindow?.webContents.send('error', 'Hubo un error al instalar los mods.');
  }
}); 

// Handling updateMods
ipcMain.handle('update-mods', async () => {
  if (!mainWindow) {
    console.error("mainWindow is null");
    return; // No podemos proceder si no hay ventana
  }

  try {
    // Llama a la función para actualizar mods
    await syncMods((progress) => {
      // Envía el progreso al renderer
      mainWindow?.webContents.send('progress-update', progress);
    });

    if (updatedFiles.length > 0) {
     // Después de la actualización, envía los archivos actualizados
     mainWindow?.webContents.send('updated-files', updatedFiles);
    } else {
      // Enviar el mensaje si solo se borraron archivos y no hubo actualizaciones
      mainWindow?.webContents.send("updated-files", "Actualización exitosa");
    }
  } catch (error) {
    console.error('Error al actualizar los mods:', error);
    mainWindow?.webContents.send('error', 'Hubo un error al actualizar los mods.');
  }
});