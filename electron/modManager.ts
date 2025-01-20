import { google, drive_v3 } from "googleapis";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Ruta al archivo de credenciales JSON
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ruta al archivo de credenciales JSON
//const KEYFILE_PATH = path.join(__dirname, "credentials.json");
const KEYFILE_PATH = path.join(__dirname, "..", "electron", "credentials.json")
console.log(KEYFILE_PATH);
const MODS_DIR =
  process.platform === "win32"
    ? path.join(process.env.APPDATA || "", ".minecraft", "mods") // Windows
    : path.join(process.env.HOME || "", ".minecraft", "mods"); // Linux/macOS

let downloadedFiles: string[] = []; // Almacena los mods descargados por nombre
let updatedFiles: string[] = []; // Almacena los mods actualizados por nombre

// Autenticación con Google Drive utilizando una cuenta de servicio
async function authorize(): Promise<drive_v3.Drive> {
  const auth = new google.auth.GoogleAuth({
    keyFile: KEYFILE_PATH,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  const drive = google.drive({ version: "v3", auth });
  return drive;
}

// Descargar un archivo de Google Drive con barra de progreso
async function downloadFile(
  drive: drive_v3.Drive, // Tipo para el cliente de Google Drive
  fileId: string,
  destPath: string,
  progressCallback: (progress: number) => void,
  // @ts-ignore
totalFiles?: number

): Promise<void> {
  const dest = fs.createWriteStream(destPath);
  const res = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "stream" }
  );

  const totalSize = parseInt(res.headers["content-length"] || "0", 10);
  let downloaded = 0;
  let currentFileProgress = 0;

  res.data.on("data", (chunk: Buffer) => {
    downloaded += chunk.length;
    currentFileProgress = Math.round((downloaded / totalSize) * 100); // Progreso individual del archivo
  });

  return new Promise((resolve, reject) => {
    res.data
      .pipe(dest)
      .on("finish", () => {
        progressCallback(currentFileProgress); // Progreso de este archivo
        resolve();
      })
      .on("error", reject);
  });
}

// Descargar mods
async function downloadMods(progressCallback: (progress: number) => void): Promise<void> {
    const drive = await authorize();
    const res = await drive.files.list({
      q: "'1q0piiSDuNsFbNUNN6KYtn-3DeLB0YI24' in parents", // Asegúrate de usar tu ID de carpeta
      fields: "files(id, name)",
    });
  
    const files = res.data.files || [];
    if (files.length > 0) {
      const totalFiles = files.length;
      let globalProgress = 0; // Variable para el progreso total
  
      const downloadPromises = files.map((file) => {
        const destPath = path.join(MODS_DIR, file.name || ""); // Asegúrate de que `file.name` no sea undefined
        const fileId = file.id;
  
        // Verificar que `fileId` es un string válido antes de usarlo
        if (!fileId) {
          console.warn(`Advertencia: El archivo '${file.name}' no tiene un ID válido y no será descargado.`);
          return Promise.resolve(); // No descargar este archivo si no tiene un ID válido
        }
  
        // Añadir el archivo a la lista de descargados sin renombrar
        downloadedFiles.push(file.name || "");
  
        return downloadFile(
          drive,
          fileId,
          destPath,
          (progress) => {
            // Sumar el progreso individual al total
            globalProgress += progress / totalFiles; // Ajustamos la contribución de cada archivo al total
            const overallProgress = Math.min(globalProgress, 100); // Asegurarnos de no superar el 100%
            progressCallback(overallProgress); // Actualizamos el progreso total
          },
          totalFiles
        );
      });
  
      // Esperar a que todas las promesas de descarga se resuelvan
      await Promise.all(downloadPromises);
      console.log(downloadedFiles);
    }
  }
  

// Función de sincronización de mods (actualizada para manejar el progreso global)
async function syncMods(progressCallback: (progress: number) => void): Promise<void> {
  const drive = await authorize();
  const res = await drive.files.list({
    q: "'1q0piiSDuNsFbNUNN6KYtn-3DeLB0YI24' in parents", // Modifica con tu ID de carpeta
    fields: "files(id, name)",
  });

  const driveFiles = res.data.files?.map((file) => file.name?.toLowerCase() || "") || []; // Archivos de Google Drive (en minúsculas)
  const localFiles = fs.readdirSync(MODS_DIR).map((file) => file.toLowerCase()); // Archivos locales en minúsculas

  // Filtrar archivos nuevos (existen en Drive pero no localmente)
  const newMods = res.data.files?.filter(
    (file) => !localFiles.includes(file.name?.toLowerCase() || "")
  ) || [];

  const totalFiles = newMods.length; // Contamos solo los archivos nuevos

  let globalProgress = 0; // Variable para el progreso total

  // Descargar solo los archivos nuevos
  const downloadPromises = newMods.map((file) => {
    const destPath = path.join(MODS_DIR, file.name || ""); // Ruta completa del archivo local
    const fileId = file.id;

    if (!fileId) {
      console.warn(`Advertencia: El archivo '${file.name}' no tiene un ID válido.`);
      return Promise.resolve(); // Omitimos este archivo si no tiene un ID
    }

    return downloadFile(
      drive,
      fileId,
      destPath,
      (progress) => {
        // Progreso acumulado
        globalProgress += progress / totalFiles;
        progressCallback(Math.min(globalProgress, 100)); // Asegurarnos de no superar el 100%
      },
      totalFiles
    );
  });

  await Promise.all(downloadPromises);

  // Actualizamos la lista de archivos descargados
  updatedFiles = newMods.map((file) => file.name || "");

  // Eliminar los archivos que ya no están en Google Drive
  const removedMods = localFiles.filter((localFile) => !driveFiles.includes(localFile));
  if (removedMods.length > 0) {
    removedMods.forEach((file) => {
      try {
        const filePath = path.join(MODS_DIR, file);
        fs.unlinkSync(filePath); // Eliminar el archivo
        console.log(`Archivo eliminado: ${filePath}`);
      } catch (err) {
        console.error(`Error eliminando el archivo ${file}:`, err);
      }
    });
  }
}

// Exportar las listas de mods descargados y actualizados
export { downloadMods, syncMods, downloadedFiles, updatedFiles };
