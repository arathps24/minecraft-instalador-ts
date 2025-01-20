/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * The built directory structure
     *
     * ```tree
     * ├─┬─┬ dist
     * │ │ └── index.html
     * │ │
     * │ ├─┬ dist-electron
     * │ │ ├── main.js
     * │ │ └── preload.js
     * │
     * ```
     */
    APP_ROOT: string
    /** /dist/ or /public/ */
    VITE_PUBLIC: string
  }
}

// Used in Renderer process, expose in `preload.ts`
interface Window {
  ipcRenderer: import('electron').IpcRenderer;
  electronAPI: {
    onProgressUpdate: (callback: (progress: number) => void) => void;
    onDownloadedFiles: (callback: (files: string) => void) => void;
    onUpdatedFiles: (callback: (files: string) => void) => void;
    installMods: () => void;
    updateMods: () => void;
  };
}
