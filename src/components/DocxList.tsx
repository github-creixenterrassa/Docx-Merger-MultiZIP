import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { FileText, ChevronUp, ChevronDown, CheckSquare, Square, Eye, GripVertical } from "lucide-react";
import { DocxFile } from "../types";

interface DocxListProps {
  files: DocxFile[];
  onToggleFile: (id: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onSelectPreview: (file: DocxFile) => void;
  selectedPreviewId: string | null;
  onToggleAll: (checked: boolean) => void;
}

export default function DocxList({
  files,
  onToggleFile,
  onMoveUp,
  onMoveDown,
  onSelectPreview,
  selectedPreviewId,
  onToggleAll
}: DocxListProps) {
  
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const enabledCount = files.filter(f => f.enabled).length;
  const allEnabled = enabledCount === files.length;

  return (
    <div className="bg-neutral-900/50 border border-neutral-800 p-6 flex flex-col h-full rounded-3xl shadow-soft">
      <div className="flex items-center justify-between pb-4 border-b border-neutral-850 mb-4 shrink-0">
        <div>
          <h2 className="text-base font-bold text-white font-display">Archivos Word ({files.length})</h2>
          <p className="text-xs text-neutral-400 mt-0.5">Establece el orden de fusión.</p>
        </div>
        <button
          onClick={() => onToggleAll(!allEnabled)}
          className="text-xs font-semibold px-2.5 py-1.5 rounded-lg text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition-colors cursor-pointer"
        >
          {allEnabled ? "Desmarcar todos" : "Seleccionar todos"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 max-h-[500px]">
        <AnimatePresence initial={false}>
          {files.map((file, index) => {
            const isSelectedForPreview = selectedPreviewId === file.id;
            return (
              <motion.div
                key={file.id}
                layoutId={`file-item-${file.id}`}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className={`group flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                  isSelectedForPreview
                    ? "border-indigo-500/60 bg-indigo-950/20 ring-1 ring-indigo-500/20"
                    : file.enabled
                    ? "border-neutral-800 hover:border-neutral-700 bg-neutral-900/40"
                    : "border-neutral-900/60 bg-neutral-950/30 opacity-50"
                }`}
              >
                {/* Left controls */}
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  {/* Enabled selector */}
                  <button
                    onClick={() => onToggleFile(file.id)}
                    className="text-neutral-400 hover:text-indigo-400 transition-colors shrink-0 cursor-pointer"
                    title={file.enabled ? "Excluir de la fusión" : "Incluir en la fusión"}
                  >
                    {file.enabled ? (
                      <CheckSquare className="w-5 h-5 text-indigo-400" />
                    ) : (
                      <Square className="w-5 h-5 text-neutral-600" />
                    )}
                  </button>

                  {/* Icon */}
                  <div className={`p-2 rounded-xl shrink-0 border transition-all ${file.enabled ? "bg-indigo-505/10 border-indigo-500/20 text-indigo-400" : "bg-neutral-950 border-neutral-800 text-neutral-600"}`}>
                    <FileText className="w-4.5 h-4.5" />
                  </div>

                  {/* Details */}
                  <div className="min-w-0 pr-2">
                    <p className="text-sm font-semibold text-neutral-200 truncate" title={file.name}>
                      {file.name}
                    </p>
                    <p className="text-xs text-neutral-500 truncate mt-0.5" title={file.path}>
                      {file.path.includes("/") ? file.path : `Raíz • ${formatBytes(file.size)}`}
                      {file.path.includes("/") && ` • ${formatBytes(file.size)}`}
                    </p>
                  </div>
                </div>

                {/* Right controls */}
                <div className="flex items-center space-x-1 shrink-0">
                  {/* Preview button */}
                  <button
                    onClick={() => onSelectPreview(file)}
                    className={`p-2 rounded-lg transition-colors leading-none cursor-pointer ${
                      isSelectedForPreview
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                    }`}
                    title="Vista previa del contenido"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  <div className="h-6 w-px bg-neutral-800 mx-1"></div>

                  {/* Ordering arrows */}
                  <button
                    disabled={index === 0}
                    onClick={() => onMoveUp(index)}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      index === 0
                        ? "text-neutral-700 cursor-not-allowed"
                        : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
                    }`}
                    title="Mover arriba"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    disabled={index === files.length - 1}
                    onClick={() => onMoveDown(index)}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      index === files.length - 1
                        ? "text-neutral-700 cursor-not-allowed"
                        : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
                    }`}
                    title="Mover abajo"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <div className="mt-4 pt-4 border-t border-neutral-850 shrink-0 flex items-center justify-between text-xs text-neutral-500 font-medium">
        <span>{enabledCount} de {files.length} seleccionados</span>
        <span>Reordena si es necesario</span>
      </div>
    </div>
  );
}
