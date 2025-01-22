
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
      q: "'17sPqxHCa5maRP9fwQn8uVOniie1Gy8l5' in parents", // Asegúrate de usar tu ID de carpeta
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
async function syncMods(progressCallback?: (progress: number) => void): Promise<string[]> {
  const drive = await authorize();

  // Obtener lista de archivos en Google Drive
  const res = await drive.files.list({
    q: "'17sPqxHCa5maRP9fwQn8uVOniie1Gy8l5' in parents",
    fields: "files(id, name)",
  });

  const driveFiles = res.data.files || [];
  const driveFileNames = driveFiles.map((file) => file.name?.toLowerCase() || "");

  // Obtener lista de archivos locales
  const localFiles = fs.readdirSync(MODS_DIR).map((file) => file.toLowerCase());

  // Filtrar los archivos que están en local pero no en Google Drive
  const orphanedFiles = localFiles.filter((localFile) => !driveFileNames.includes(localFile));

  // Filtrar los archivos que están en Google Drive pero no en local (archivos nuevos)
  const newFiles = driveFiles.filter(
    (file) => !localFiles.includes(file.name?.toLowerCase() || "")
  );

 
  // Descargar archivos nuevos
  if (newFiles.length > 0) {
    let progress = 0;
    const totalNewFiles = newFiles.length;
    
    for (const file of newFiles) {
      const destPath = path.join(MODS_DIR, file.name || "");
      //console.log(`Descargando archivo nuevo: ${file.name}`);
      
      // Llamar a la función `downloadFile` para descargar el archivo
      await downloadFile(drive, file.id!, destPath, (fileProgress) => {
        progress += (1 / totalNewFiles) * fileProgress;
        progressCallback?.(Math.min(progress, 100));
      });
       // Añadir el archivo a la lista de `downloadedFiles` (solo archivos nuevos descargados)
       updatedFiles.push(file.name || "");
    }
  }
  //console.log("lista de mods descargados: "+ updatedFiles);
  
   // Eliminar archivos huérfanos
   if (orphanedFiles.length > 0) {
    for (const orphan of orphanedFiles) {
      const orphanPath = path.join(MODS_DIR, orphan);
      try {
        fs.unlinkSync(orphanPath);
        console.log(`Archivo huérfano eliminado: ${orphanPath}`);
      } catch (err) {
        console.error(`Error eliminando archivo ${orphan}:`, err);
      }
    }
  }

  // Sincronización terminada
  if (progressCallback) {
    progressCallback(100);
  }

  //console.log("Sincronización de mods completada.");
  return updatedFiles;
}


// Exportar las listas de mods descargados y actualizados
export { downloadMods, syncMods, downloadedFiles, updatedFiles };

