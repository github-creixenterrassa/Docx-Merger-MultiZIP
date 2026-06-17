import React, { useState, useRef } from "react";
import { motion } from "motion/react";
import { Upload, FileArchive, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import JSZip from "jszip";
import { DocxFile, ProcessingState } from "../types";

interface ZipUploaderProps {
  onFilesExtracted: (files: DocxFile[], zipNames: string[]) => void;
  state: ProcessingState;
  setState: React.Dispatch<React.SetStateAction<ProcessingState>>;
}

export default function ZipUploader({ onFilesExtracted, state, setState }: ZipUploaderProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processZipFiles = async (fileList: FileList | File[]) => {
    const list = Array.from(fileList);
    const zipFiles = list.filter(f => f.name.toLowerCase().endsWith(".zip"));

    if (zipFiles.length === 0) {
      setState({
        loading: false,
        progress: 0,
        message: "",
        error: "Por favor, selecciona archivos ZIP válidos (.zip)"
      });
      return;
    }

    setState({
      loading: true,
      progress: 5,
      message: `Cargando ${zipFiles.length} archivo(s) ZIP...`,
      error: null
    });

    const allExtracted: DocxFile[] = [];
    const processedZipNames: string[] = [];

    try {
      for (let z = 0; z < zipFiles.length; z++) {
        const zipFile = zipFiles[z];
        processedZipNames.push(zipFile.name);

        setState({
          loading: true,
          progress: Math.floor(5 + (z / zipFiles.length) * 90),
          message: `Leyendo ZIP [${z + 1}/${zipFiles.length}]: ${zipFile.name}...`,
          error: null
        });

        const zip = await JSZip.loadAsync(zipFile);
        const fileKeys = Object.keys(zip.files).filter(path => {
          const fileEntry = zip.files[path];
          if (fileEntry.dir) return false;
          const lowerPath = path.toLowerCase();
          const baseName = path.split("/").pop() || "";
          return lowerPath.endsWith(".docx") && !baseName.startsWith("~$");
        });

        const numInZip = fileKeys.length;
        for (let i = 0; i < fileKeys.length; i++) {
          const path = fileKeys[i];
          const zipEntry = zip.files[path];
          
          setState({
            loading: true,
            progress: Math.floor(5 + (z / zipFiles.length) * 90 + ((i / numInZip) * (90 / zipFiles.length))),
            message: `Descomprimiendo: ${path.split("/").pop()} de ${zipFile.name}...`,
            error: null
          });

          const arrayBuffer = await zipEntry.async("arraybuffer");
          
          // Generate unique ID using zipName and internal file index to prevent path conflict
          const uniqueId = `${zipFile.name}_${z}_${path}_${i}`;

          allExtracted.push({
            id: uniqueId,
            name: path.split("/").pop() || path,
            path: path,
            arrayBuffer: arrayBuffer,
            enabled: true,
            html: null,
            size: arrayBuffer.byteLength
          });
        }
      }

      if (allExtracted.length === 0) {
        throw new Error("No se encontraron archivos .docx válidos dentro de los archivos ZIP cargados.");
      }

      setState({
        loading: false,
        progress: 100,
        message: "¡Descompresión exitosa!",
        error: null
      });

      onFilesExtracted(allExtracted, processedZipNames);
    } catch (err: any) {
      setState({
        loading: false,
        progress: 0,
        message: "",
        error: err.message || "Error al procesar los archivos ZIP"
      });
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processZipFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processZipFiles(e.target.files);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInput}
        accept=".zip"
        multiple
        className="hidden"
        id="zip-file-input"
      />

      <motion.div
        id="drag-drop-container"
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={triggerFileSelect}
        className={`relative w-full border border-neutral-800 rounded-3xl p-8 md:p-12 text-center cursor-pointer transition-all duration-250 ${
          isDragActive
            ? "bg-neutral-900 border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.15)]"
            : "bg-neutral-900/40 hover:bg-neutral-900/80 border-neutral-800 hover:border-neutral-700"
        }`}
        whileHover={{ scale: 1.002 }}
        whileTap={{ scale: 0.998 }}
      >
        <div className="absolute inset-0 border border-dashed border-indigo-500/10 rounded-3xl m-2.5 pointer-events-none"></div>
        
        <div className="flex flex-col items-center justify-center space-y-5 relative z-10">
          <div className={`p-4 rounded-full transition-colors ${isDragActive ? "bg-indigo-600/20 text-indigo-400" : "bg-neutral-900 text-indigo-400 border border-neutral-840"}`}>
            <Upload className="w-10 h-10 animate-pulse" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-white font-display">
              Arrastra tus archivos .zip aquí
            </h3>
            <p className="text-sm text-neutral-400">
              Puedes soltar múltiples archivos ZIP al mismo tiempo
            </p>
            <p className="text-xs text-neutral-500">
              O haz clic para seleccionar archivos desde tu equipo
            </p>
          </div>

          <button className="px-5 py-2 bg-neutral-100 hover:bg-white text-neutral-950 text-xs font-bold rounded-xl transition-all shadow-md">
            Seleccionar Archivos ZIP
          </button>

          <div className="inline-flex items-center space-x-2 text-xs text-neutral-400 bg-neutral-900/90 px-3.5 py-1.5 rounded-full border border-neutral-800/80 font-mono tracking-tight">
            <FileArchive className="w-3.5 h-3.5 text-indigo-400" />
            <span>Soporta añadir múltiples ZIPs con sus respectivos .docx</span>
          </div>
        </div>
      </motion.div>

      {/* State Indicators */}
      {state.loading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 rounded-2xl border border-neutral-800 bg-neutral-900/50 flex items-center space-x-4"
        >
          <div className="relative flex items-center justify-center">
            <RefreshCw className="w-5 h-5 text-indigo-400 animate-spin" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-400 font-mono">{state.message}</p>
            <div className="mt-2 w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
               <div 
                 className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                 style={{ width: `${state.progress}%` }}
               />
             </div>
          </div>
          <span className="text-xs font-mono font-bold text-neutral-400">{state.progress}%</span>
        </motion.div>
      )}

      {state.error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 rounded-2xl border border-red-900/50 bg-red-950/10 flex items-start space-x-3 text-red-400"
        >
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-white">Error al procesar archivo</h4>
            <p className="text-xs mt-1 text-red-400 font-medium">{state.error}</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
