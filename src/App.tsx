import { useState, useEffect } from 'react';
import logo from './assets/logo.png';
import './styles.css';

function App() {
  const [progress, setProgress] = useState(0);
  const [downloadedFiles, setDownloadedFiles] = useState<string[]>([]);
  const [updatedFiles, setUpdatedFiles] = useState<string[]>([]);
  const [showProgress, setShowProgress] = useState(false);
  const [showDownloadedFiles, setShowDownloadedFiles] = useState(false);
  const [showUpdatedFiles, setShowUpdatedFiles] = useState(false);

  useEffect(() => {
    console.log('electronAPI:', window.electronAPI);

    // Actualizar el progreso
    window.electronAPI.onProgressUpdate((progress) => setProgress(progress));

    // Actualizar los archivos descargados
    window.electronAPI.onDownloadedFiles((files) => {
      setDownloadedFiles(Array.isArray(files) ? files : [files]);
      setShowDownloadedFiles(true); // Mostrar solo al recibir datos
    });

    // Actualizar los archivos actualizados
    window.electronAPI.onUpdatedFiles((files) => {
      setUpdatedFiles(Array.isArray(files) ? files : [files]);
      setShowUpdatedFiles(true); // Mostrar solo al recibir datos
    });
  }, []);

  const handleInstallMods = () => {
    window.electronAPI.installMods();
    setShowProgress(true);
    setShowDownloadedFiles(false); // Ocultar mods descargados previos
    setShowUpdatedFiles(false); // Ocultar mods actualizados previos
  };

  const handleUpdateMods = () => {
    window.electronAPI.updateMods();
    setShowProgress(true);
    setShowDownloadedFiles(false); // Ocultar mods descargados previos
    setShowUpdatedFiles(false); // Ocultar mods actualizados previos
  };

  return (
    <div className="App">
      <h1 className="h1">Instalador de Mods de PigBrother</h1>
      <img src={logo} alt="Minecraft Logo" className="minecraft-image" />

      {/* Mostrar la barra de progreso */}
      {showProgress && (
        <div className="progress-container">
          <progress value={progress} max={100}></progress>
          <span>{Math.round(progress)}%</span>
        </div>
      )}

      {/* Mostrar los mods descargados */}
      {showDownloadedFiles && (
        <div className="downloaded-mods">
          <p>Mods descargados: {downloadedFiles.join(', ')}</p>
        </div>
      )}

      {/* Mostrar los mods actualizados */}
      {showUpdatedFiles && (
        <div className="updated-mods">
          <p>Actualizados: {updatedFiles.join(', ')}</p>
        </div>
      )}

      <div className="button-container">
        <button onClick={handleInstallMods}>Instalar Mods</button>
        <button onClick={handleUpdateMods}>Actualizar Mods</button>
      </div>
    </div>
  );
}

export default App;
