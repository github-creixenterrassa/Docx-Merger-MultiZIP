import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import { FileText, Loader2, AlertCircle, Sparkles, BookOpen } from "lucide-react";
import * as mammoth from "mammoth";
import { DocxFile } from "../types";

interface DocxPreviewProps {
  file: DocxFile | null;
  onHtmlConverted: (id: string, html: string) => void;
}

export default function DocxPreview({ file, onHtmlConverted }: DocxPreviewProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [showWarnings, setShowWarnings] = useState(false);

  useEffect(() => {
    if (!file) return;

    // Is it already converted?
    if (file.html !== null) {
      setError(null);
      setWarnings([]);
      return;
    }

    const convertWordToHtml = async () => {
      setLoading(true);
      setError(null);
      setWarnings([]);
      try {
        // Convert arrayBuffer to html with mammoth
        const result = await mammoth.convertToHtml({ arrayBuffer: file.arrayBuffer });
        onHtmlConverted(file.id, result.value);
        if (result.messages && result.messages.length > 0) {
          setWarnings(result.messages.map(m => m.message));
        }
      } catch (err: any) {
        console.error("Error with Mammoth conversion:", err);
        setError("No se pudo convertir este documento a vista previa de HTML. El archivo podría estar corrupto o usar un formato no soportado.");
      } finally {
        setLoading(false);
      }
    };

    convertWordToHtml();
  }, [file?.id, file?.html]);

  if (!file) {
    return (
      <div className="bg-neutral-900/30 rounded-3xl border border-dashed border-neutral-800 p-8 text-center flex flex-col items-center justify-center h-full min-h-[400px]">
        <div className="p-4 bg-neutral-900 border border-neutral-850 rounded-2xl text-neutral-500 mb-4 transition-all">
          <BookOpen className="w-8 h-8" />
        </div>
        <h3 className="text-sm font-bold text-white font-display">No hay vista previa activa</h3>
        <p className="text-xs text-neutral-500 max-w-[280px] mt-1.5 mx-auto leading-relaxed">
          Haz clic en el icono del ojo en la lista de archivos para visualizar su contenido estructurado.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-neutral-900/50 border border-neutral-800 p-6 flex flex-col h-full rounded-3xl shadow-soft">
      <div className="flex items-center justify-between pb-3 border-b border-neutral-850 mb-4 shrink-0">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="p-2 bg-neutral-800 border border-neutral-750 text-indigo-400 rounded-xl shrink-0">
            <FileText className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-extrabold text-neutral-200 truncate font-display" title={file.name}>
              {file.name}
            </h3>
            <p className="text-[11px] text-neutral-500 truncate mt-0.5">Ruta: {file.path}</p>
          </div>
        </div>
        <div className="flex items-center space-x-1.5 shrink-0">
          <span className="text-[10px] font-bold tracking-widest bg-neutral-800 border border-neutral-750 text-neutral-400 px-3 py-1 rounded-full uppercase font-mono">
            VISTA PREVIA
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-3" />
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 font-mono animate-pulse">Procesando estructura de Word...</p>
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
          <p className="text-sm font-bold text-white font-display">Error de Conversión</p>
          <p className="text-xs text-neutral-400 mt-1 max-w-sm">{error}</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Main A4 sheet style container wrapper */}
          <div className="flex-1 overflow-y-auto bg-neutral-950/80 rounded-2xl p-4 md:p-6 border border-neutral-850">
            <div 
              id="docx-preview-content"
              className="bg-white rounded-xl shadow-paper border border-neutral-200 p-6 md:p-10 mx-auto max-w-[680px] word-document-content min-h-[500px] text-zinc-900"
              dangerouslySetInnerHTML={{ __html: file.html || "" }}
            />
          </div>

          {/* Collapsible warnings panel */}
          {warnings.length > 0 && (
            <div className="mt-3 bg-amber-950/20 rounded-2xl border border-amber-900/30 p-3 shrink-0">
              <button
                onClick={() => setShowWarnings(!showWarnings)}
                className="flex items-center justify-between w-full text-[11px] font-bold text-amber-500"
              >
                <span className="flex items-center space-x-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Se omitieron {warnings.length} elementos avanzados no nativos.</span>
                </span>
                <span className="underline select-none">{showWarnings ? "Ocultar" : "Mostrar"}</span>
              </button>

              {showWarnings && (
                <motion.ul 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-2 text-[10px] text-amber-400 space-y-1 pl-4 list-disc max-h-[100px] overflow-y-auto scrollbar-thin font-medium"
                >
                  {warnings.slice(0, 10).map((msg, idx) => (
                    <li key={idx}>{msg}</li>
                  ))}
                  {warnings.length > 10 && <li>... y {warnings.length - 10} avisos más.</li>}
                </motion.ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EyeIcon() {
  return (
    <svg className="w-3.5 h-3.5 inline text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}
