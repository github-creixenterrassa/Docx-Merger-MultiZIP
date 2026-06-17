import React, { useState, useEffect } from "react";
import ZipUploader from "./components/ZipUploader";
import DocxList from "./components/DocxList";
import DocxPreview from "./components/DocxPreview";
import MergedPreview from "./components/MergedPreview";
import { DocxFile, ProcessingState } from "./types";
import { FileArchive, CheckCircle2, ChevronRight, RefreshCw, Layers, AlertCircle, Trash2, Plus, X } from "lucide-react";
import * as mammoth from "mammoth";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [files, setFiles] = useState<DocxFile[]>([]);
  const [zipNames, setZipNames] = useState<string[]>([]);
  const [selectedPreviewId, setSelectedPreviewId] = useState<string | null>(null);
  const [mergeMode, setMergeMode] = useState<boolean>(false);
  const [isPreparingMerge, setIsPreparingMerge] = useState<boolean>(false);
  const [prepareError, setPrepareError] = useState<string | null>(null);
  const [showAddMore, setShowAddMore] = useState<boolean>(false);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  const [state, setState] = useState<ProcessingState>({
    loading: false,
    progress: 0,
    message: "",
    error: null
  });

  const handleFilesExtracted = (extractedFiles: DocxFile[], names: string[]) => {
    // Append newly extracted files
    setFiles(prev => {
      // Map to avoid exact duplicates by checking file name AND original size
      const existingKeys = new Set(prev.map(f => `${f.name}_${f.size}`));
      const nonDuplicates = extractedFiles.filter(f => !existingKeys.has(`${f.name}_${f.size}`));
      return [...prev, ...nonDuplicates];
    });

    // Append newly processed zip names
    setZipNames(prev => {
      const updated = [...prev];
      for (const name of names) {
        if (!updated.includes(name)) {
          updated.push(name);
        }
      }
      return updated;
    });

    setMergeMode(false);
    setPrepareError(null);
    setShowAddMore(false);
    
    // Select the first extracted DOCX automatically for preview to help users start instantly
    if (extractedFiles.length > 0 && !selectedPreviewId) {
      setSelectedPreviewId(extractedFiles[0].id);
    } else if (files.length === 0 && extractedFiles.length > 0) {
      setSelectedPreviewId(extractedFiles[0].id);
    }
  };

  useEffect(() => {
    if (files.length > 0 && !selectedPreviewId) {
      setSelectedPreviewId(files[0].id);
    }
  }, [files, selectedPreviewId]);

  const currentPreviewFile = files.find(f => f.id === selectedPreviewId) || null;

  const handleToggleFile = (id: string) => {
    setFiles(prev =>
      prev.map(f => (f.id === id ? { ...f, enabled: !f.enabled } : f))
    );
  };

  const handleToggleAll = (checked: boolean) => {
    setFiles(prev => prev.map(f => ({ ...f, enabled: checked })));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setFiles(prev => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[index - 1];
      updated[index - 1] = temp;
      return updated;
    });
  };

  const handleMoveDown = (index: number) => {
    if (index === files.length - 1) return;
    setFiles(prev => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[index + 1];
      updated[index + 1] = temp;
      return updated;
    });
  };

  const handleSelectPreview = (file: DocxFile) => {
    setSelectedPreviewId(file.id);
  };

  const handleHtmlConverted = (id: string, html: string) => {
    setFiles(prev =>
      prev.map(f => (f.id === id ? { ...f, html } : f))
    );
  };

  const handleReset = () => {
    setShowResetConfirm(true);
  };

  const confirmReset = () => {
    setFiles([]);
    setZipNames([]);
    setSelectedPreviewId(null);
    setMergeMode(false);
    setPrepareError(null);
    setShowAddMore(false);
    setState({
      loading: false,
      progress: 0,
      message: "",
      error: null
    });
    setShowResetConfirm(false);
  };

  // Triggers final check and lazy conversion of ANY enabled docx element before starting merge preview
  const handleStartMergeMode = async () => {
    const enabledFiles = files.filter(f => f.enabled);
    if (enabledFiles.length === 0) {
      setPrepareError("Debes tener seleccionado al menos un documento para poder realizar la fusión.");
      return;
    }

    setIsPreparingMerge(true);
    setPrepareError(null);

    try {
      const updatedFiles = [...files];
      for (let i = 0; i < updatedFiles.length; i++) {
        const file = updatedFiles[i];
        if (file.enabled && file.html === null) {
          // Lazy convert to HTML for previsualization purposes
          const result = await mammoth.convertToHtml({ arrayBuffer: file.arrayBuffer });
          updatedFiles[i] = { ...file, html: result.value };
        }
      }

      setFiles(updatedFiles);
      setMergeMode(true);
    } catch (err: any) {
      console.error(err);
      setPrepareError("Error al procesar la conversión previa de los archivos Word. Por favor, comprueba tus documentos.");
    } finally {
      setIsPreparingMerge(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 font-sans text-neutral-200" id="main-app-content">
      {/* Absolute Header Ribbon */}
      <header className="sticky top-0 z-40 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-600/20">
              <FileArchive className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-sm font-extrabold text-white tracking-tight flex items-center font-display">
                Docx Merger <span className="ml-1.5 px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] uppercase font-bold tracking-wider">DOCX</span>
              </h1>
              <p className="text-[10px] text-neutral-500 font-medium">Fusión de múltiples ZIPs a un único Word • Bento Suite</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {files.length > 0 && (
              <button
                onClick={handleReset}
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-neutral-400 hover:text-red-400 hover:bg-neutral-900 transition-all cursor-pointer"
                title="Limpiar espacio de trabajo"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reiniciar</span>
              </button>
            )}
            <div className="hidden md:flex items-center space-x-1.5 text-[11px] text-neutral-400 font-mono bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-full uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>100% LOCAL • SEGURO</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Step Progression Ribbon in Edit Mode */}
        {!mergeMode && (
          <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-2xl border flex items-center space-x-4 transition-all ${
              files.length === 0 
                ? "bg-indigo-950/20 border-indigo-500/30 text-indigo-300 shadow-sm" 
                : "bg-neutral-900/30 border-neutral-850 text-neutral-450 opacity-75"
            }`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold ${
                files.length === 0 ? "bg-indigo-600 text-white" : "bg-emerald-950 text-emerald-400 border border-emerald-800"
              }`}>
                {files.length === 0 ? "1" : "✓"}
              </span>
              <div>
                <h3 className="text-xs font-bold leading-none uppercase tracking-wider">Cargar Varios ZIPs</h3>
                <p className="text-[10px] mt-1 text-neutral-500">Arrastra uno o varios comprimidos</p>
              </div>
            </div>

            <div className={`p-4 rounded-2xl border flex items-center space-x-4 transition-all ${
              files.length > 0 && !mergeMode
                ? "bg-indigo-950/20 border-indigo-500/30 text-indigo-300 shadow-sm" 
                : "bg-neutral-900/30 border-neutral-850 text-neutral-500 opacity-60"
            }`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold ${
                files.length > 0 ? "bg-indigo-600 text-white" : "bg-neutral-800 text-neutral-500"
              }`}>
                2
              </span>
              <div>
                <h3 className="text-xs font-bold leading-none uppercase tracking-wider">Organizar y Comprobar</h3>
                <p className="text-[10px] mt-1 text-neutral-500">Reordena o excluye documentos</p>
              </div>
            </div>

            <div className="p-4 bg-neutral-900/30 border border-neutral-850 rounded-2xl flex items-center space-x-3 opacity-60">
              <span className="w-6 h-6 rounded-full bg-neutral-800 text-neutral-500 flex items-center justify-center text-xs font-bold">
                3
              </span>
              <div>
                <h3 className="text-xs font-bold leading-none uppercase tracking-wider">Unificar en Word (.docx)</h3>
                <p className="text-[10px] mt-1 text-neutral-500">Descarga un documento único</p>
              </div>
            </div>
          </div>
        )}

        {/* Workspace Display Area */}
        <AnimatePresence mode="wait">
          {!mergeMode ? (
            <motion.div
              key="uploader-workspace"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
            >
              {files.length === 0 ? (
                /* Initial Upload Pane */
                <div className="max-w-3xl mx-auto space-y-8 py-6 md:py-12">
                  <div className="text-center space-y-3">
                    <div className="inline-flex items-center space-x-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-xs font-semibold text-indigo-400">
                      <span>Práctico y Profesional</span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white font-display">
                      Fusionador de ZIPs a DOCX
                    </h2>
                    <p className="text-sm text-neutral-400 max-w-lg mx-auto leading-relaxed">
                      Sube uno o varios archivos ZIP que contengan documentos Word. Extrae sus contenidos localmente, ordénalos y clona una salida unificada en formato Word (.docx).
                    </p>
                  </div>
                  
                  <ZipUploader 
                    onFilesExtracted={handleFilesExtracted} 
                    state={state} 
                    setState={setState} 
                  />

                  {/* Informative Grid in Bento format */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-4">
                    <div className="p-5 bg-neutral-900/50 border border-neutral-800 rounded-3xl space-y-2 hover:border-neutral-700/50 transition-colors">
                      <div className="text-indigo-400 text-sm font-semibold uppercase tracking-wider">MULTI-ZIP</div>
                      <h4 className="text-base font-bold text-white font-display leading-tight">Múltiples Orígenes</h4>
                      <p className="text-xs text-neutral-400 leading-relaxed">Puedes arrastrar varios ZIP a la vez o cargarlos secuencialmente para acumular sus contenidos.</p>
                    </div>
                    <div className="p-5 bg-neutral-900/50 border border-neutral-800 rounded-3xl space-y-2 hover:border-neutral-700/50 transition-colors">
                      <div className="text-indigo-400 text-sm font-semibold uppercase tracking-wider">FORMATO</div>
                      <h4 className="text-base font-bold text-white font-display leading-tight">Estructura Intacta</h4>
                      <p className="text-xs text-neutral-400 leading-relaxed">Une las fuentes de texto, tablas e imágenes de Word de forma nativa insertando saltos de página continuos.</p>
                    </div>
                    <div className="p-5 bg-neutral-900/50 border border-neutral-800 rounded-3xl space-y-2 hover:border-neutral-700/50 transition-colors">
                      <div className="text-indigo-400 text-sm font-semibold uppercase tracking-wider">EXPORTAR</div>
                      <h4 className="text-base font-bold text-white font-display leading-tight">Word Editable (.docx)</h4>
                      <p className="text-xs text-neutral-400 leading-relaxed">La salida es un documento de Word 100% editable e idéntico para que continúes tu redacción cómodamente.</p>
                    </div>
                  </div>
                </div>
              ) : (
                /* Active Files Organizing Workspace */
                <div className="space-y-6">
                  {/* Top bar with file name and merge button trigger */}
                  <div className="bg-neutral-900/60 border border-neutral-800 rounded-3xl p-5 shadow-soft flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center space-x-3.5 min-w-0 flex-1">
                      <div className="p-2.5 bg-neutral-800 border border-neutral-700 text-indigo-400 rounded-2xl shrink-0">
                        <FileArchive className="w-5.5 h-5.5" />
                      </div>
                      <div className="min-w-0 pr-2">
                        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest font-mono">
                          {zipNames.length} Archivos ZIP Cargados
                        </p>
                        <h2 className="text-sm font-extrabold text-white truncate font-display max-w-sm" title={zipNames.join(", ")}>
                          {zipNames.join(", ")}
                        </h2>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 flex-wrap">
                      <button
                        onClick={() => setShowAddMore(!showAddMore)}
                        className={`flex items-center space-x-1.5 px-4 py-2.5 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
                          showAddMore 
                            ? "bg-red-950/20 text-red-400 border-red-900/40" 
                            : "bg-neutral-800 text-neutral-300 border-neutral-750 hover:bg-neutral-705"
                        }`}
                      >
                        {showAddMore ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        <span>{showAddMore ? "Cancelar Añadir" : "Añadir más ZIPs"}</span>
                      </button>

                      <button
                        onClick={handleReset}
                        className="px-4 py-2.5 text-xs font-bold rounded-xl text-neutral-350 bg-neutral-800 hover:bg-neutral-700 border border-neutral-750 transition-colors cursor-pointer"
                      >
                        Limpiar Todo
                      </button>

                      <button
                        onClick={handleStartMergeMode}
                        disabled={isPreparingMerge}
                        className="flex items-center space-x-1.5 px-5 py-2.5 text-xs font-extrabold rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/40 text-white shadow-soft transition-all cursor-pointer"
                      >
                        {isPreparingMerge ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Layers className="w-4 h-4" />
                        )}
                        <span>Fusionar y Previsualizar Word</span>
                      </button>
                    </div>
                  </div>

                  {/* Add more ZIP collapsible container */}
                  <AnimatePresence>
                    {showAddMore && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden mb-6"
                      >
                        <div className="bg-neutral-900/30 border border-neutral-800 rounded-3xl p-5 space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-355 font-mono">
                              Subir archivos ZIP adicionales
                            </h3>
                            <button onClick={() => setShowAddMore(false)} className="text-neutral-500 hover:text-neutral-400">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <ZipUploader 
                            onFilesExtracted={handleFilesExtracted} 
                            state={state} 
                            setState={setState} 
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Prepare Merge errors */}
                  {prepareError && (
                    <div className="p-4 bg-red-950/20 border border-red-900/50 rounded-2xl flex items-center space-x-3 text-red-400">
                      <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                      <span className="text-xs font-semibold">{prepareError}</span>
                    </div>
                  )}

                  {/* Layout split columns */}
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-stretch">
                    {/* Organize items list (2/5 size) */}
                    <div className="lg:col-span-2">
                      <DocxList
                        files={files}
                        onToggleFile={handleToggleFile}
                        onMoveUp={handleMoveUp}
                        onMoveDown={handleMoveDown}
                        onSelectPreview={handleSelectPreview}
                        selectedPreviewId={selectedPreviewId}
                        onToggleAll={handleToggleAll}
                      />
                    </div>

                    {/* Component item html code view preview (3/5 size) */}
                    <div className="lg:col-span-3">
                      <DocxPreview
                        file={currentPreviewFile}
                        onHtmlConverted={handleHtmlConverted}
                      />
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            /* Immersive Merged Preview Mode with A4 visual paper sheets and download controls */
            <motion.div
              key="merged-view"
              initial={{ opacity: 0, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.99 }}
              transition={{ duration: 0.25 }}
            >
              <MergedPreview
                files={files}
                zipNames={zipNames}
                onBack={() => setMergeMode(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Custom Reset Confirmation Modal */}
      <AnimatePresence>
        {showResetConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl max-w-sm w-full space-y-4 shadow-2xl relative"
            >
              <div className="flex items-center space-x-3 text-red-400">
                <Trash2 className="w-5 h-5 shrink-0" />
                <h3 className="text-base font-bold text-white font-display">¿Reiniciar espacio?</h3>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Se perderá la lista de documentos, su orden actual y cualquier recurso cargado. Esta acción es definitiva y no se puede deshacer.
              </p>
              <div className="flex items-center justify-end space-x-2.5 pt-2">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="px-4 py-2 text-xs font-bold text-neutral-300 hover:text-white bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 hover:border-neutral-600 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmReset}
                  className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-500 rounded-xl transition-colors cursor-pointer shadow-md shadow-red-900/30"
                >
                  Sí, borrar todo
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Deep Footer */}
      <footer className="mt-20 border-t border-neutral-900 py-8 shrink-0 text-neutral-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-2">
          <p className="text-xs text-neutral-500 font-medium tracking-wide">
            Creado para optimización de flujos de trabajo de oficina. Todos los datos permanecen confidenciales en tu máquina.
          </p>
          <div className="flex justify-between items-center text-[9px] uppercase tracking-[0.2em] pt-4 border-t border-neutral-900 max-w-sm mx-auto">
            <span>MULTI-ZIP DOCX MERGER BENTO</span>
            <span>Versión 2.0.0 © 2026</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
