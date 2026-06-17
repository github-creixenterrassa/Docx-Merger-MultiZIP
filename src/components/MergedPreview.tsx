import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, Download, FileText, CheckCircle, RefreshCw, AlertCircle, FileArchive, Printer } from "lucide-react";
import { DocxFile } from "../types";
import { mergeDocxFiles } from "../utils/docxMerger";
import * as mammoth from "mammoth";
import { wordProcessorStyles } from "../utils/pdfGenerator";

interface MergedPreviewProps {
  files: DocxFile[];
  onBack: () => void;
  zipNames: string[];
}

export default function MergedPreview({ files, onBack, zipNames }: MergedPreviewProps) {
  const [merging, setMerging] = useState(true);
  const [mergeProgress, setMergeProgress] = useState(0);
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [mergedBlob, setMergedBlob] = useState<Blob | null>(null);
  const [mergedHtml, setMergedHtml] = useState<string>("");
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const enabledFiles = files.filter(f => f.enabled);

  useEffect(() => {
    let active = true;

    async function performMerge() {
      setMerging(true);
      setMergeProgress(10);
      setMergeError(null);

      try {
        const buffers = enabledFiles.map(f => f.arrayBuffer);
        
        // Merge DOCX files client-side!
        const blob = await mergeDocxFiles(buffers, (progress) => {
          if (active) setMergeProgress(progress);
        });

        if (!active) return;

        // Perform instant preview compilation!
        // We pass the merged .docx array buffer back to Mammoth to show the exact compiled document
        const arrayBuffer = await blob.arrayBuffer();
        const conversionResult = await mammoth.convertToHtml({ arrayBuffer });

        if (active) {
          setMergedBlob(blob);
          setMergedHtml(conversionResult.value);
          setMerging(false);
        }
      } catch (err: any) {
        console.error("Error during document merging:", err);
        if (active) {
          setMergeError(err.message || "No se ha podido completar la fusión de los archivos de Word.");
          setMerging(false);
        }
      }
    }

    performMerge();

    return () => {
      active = false;
    };
  }, [files]);

  const handleDownloadDocx = () => {
    if (!mergedBlob) {
      setMergeError("El archivo unificado no está preparado todavía.");
      return;
    }

    try {
      // Create a nice file name
      let outputName = "documento_combinado.docx";
      if (zipNames.length > 0) {
        const cleanBase = zipNames[0].replace(/\.[^/.]+$/, "");
        outputName = `${cleanBase}_fusionado.docx`;
      }

      const blobUrl = URL.createObjectURL(mergedBlob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = outputName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
      setMergeError("Error al descargar el archivo DOCX.");
    }
  };

  const handleNativePrint = () => {
    if (!mergedHtml) return;

    try {
      // Create an invisible iframe
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.style.opacity = "0";
      document.body.appendChild(iframe);

      const iframeWindow = iframe.contentWindow;
      const doc = iframeWindow?.document;
      if (!iframeWindow || !doc) {
        window.print();
        return;
      }

      // Write a beautiful clean document inside the iframe!
      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${zipNames.length > 0 ? zipNames[0].replace(/\\.[^/.]+$/, "") : "documento_combinado"}</title>
            <style>
              @media print {
                @page {
                  size: A4;
                  margin: 20mm;
                }
                body {
                  margin: 0;
                  padding: 0;
                  background-color: #ffffff;
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
              }
              body {
                font-family: "Georgia", "Aptos", "Calibri", "Arial", serif;
                padding: 20px;
                color: #1a1a1a;
                background-color: #ffffff;
              }
              ${wordProcessorStyles}
              /* Override class to remove borders and padding inside iframe for print */
              .word-document-content {
                padding: 0 !important;
                margin: 0 !important;
                box-shadow: none !important;
                border: none !important;
                max-width: none !important;
                width: 100% !important;
              }
            </style>
          </head>
          <body>
            <div class="word-document-content">
              ${mergedHtml}
            </div>
            <script>
              window.onload = function() {
                window.focus();
                window.print();
                setTimeout(function() {
                  window.parent.document.body.removeChild(window.frameElement);
                }, 1000);
              };
            </script>
          </body>
        </html>
      `);
      doc.close();
    } catch (err) {
      console.error("Fallback to regular print", err);
      window.print();
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Styles injected directly to format word processor styles inside A4 preview sheets */}
      <style dangerouslySetInnerHTML={{ __html: wordProcessorStyles }} />

      {/* Top Header & Workspace Actions */}
      <div className="bg-neutral-900 border border-neutral-800 text-neutral-200 rounded-3xl p-6 shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <span className="text-[10px] uppercase tracking-widest font-mono font-bold text-emerald-400 bg-neutral-950 border border-neutral-850 px-3 py-1 rounded-full">
            Fusión Final de Word
          </span>
          <h2 className="text-xl font-extrabold tracking-tight text-white font-display">Descarga tu .docx Compilado</h2>
          <p className="text-xs text-neutral-400">
            Se han unificado <span className="font-semibold text-white">{enabledFiles.length} documentos</span> de Word en secuencia continua con saltos de página.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5 shrink-0">
          <button
            onClick={onBack}
            className="flex items-center space-x-1.5 px-4 py-2.5 text-xs font-semibold rounded-xl bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 hover:border-neutral-600 transition-colors cursor-pointer text-neutral-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a Organizar</span>
          </button>

          <button
            onClick={handleNativePrint}
            disabled={merging}
            className="flex items-center space-x-1.5 px-4 py-2.5 text-xs font-semibold rounded-xl bg-neutral-800 hover:bg-neutral-750 border border-neutral-700 hover:border-neutral-600 hover:disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer text-neutral-200"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Vista Previa</span>
          </button>

          <button
            onClick={handleDownloadDocx}
            disabled={merging || !mergedBlob}
            className="flex items-center space-x-1.5 px-4 py-2.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 hover:disabled:bg-indigo-600/40 text-white shadow-soft transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            {merging ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>Descargar Archivo DOCX</span>
          </button>
        </div>
      </div>

      {/* Status Alerts and progress bars */}
      <AnimatePresence mode="wait">
        {merging && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-neutral-900/80 border border-indigo-500/20 rounded-2xl p-5 flex items-center space-x-4 text-neutral-200"
          >
            <div className="p-2.5 bg-indigo-500/10 rounded-full text-indigo-400 shrink-0">
              <RefreshCw className="w-5 h-5 animate-spin" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-400">Compilación en ejecucion</span>
              <h4 className="text-sm font-bold text-white mt-0.5">Fusionando fuentes XML de Word y empaquetando recursos...</h4>
              <p className="text-xs text-neutral-400 mt-1">
                Progreso general: {mergeProgress}%. No cierres la ventana de tu navegador.
              </p>
              <div className="mt-2.5 w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${mergeProgress}%` }}
                />
              </div>
            </div>
          </motion.div>
        )}

        {downloadSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-emerald-950/20 border border-emerald-900/50 rounded-2xl flex items-center space-x-3 text-emerald-400 font-medium text-xs"
          >
            <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-white">¡Archivo DOCX Descargado!</h4>
              <p className="text-xs text-emerald-400">El documento combinando se ha descargado correctamente en tu ordenador.</p>
            </div>
          </motion.div>
        )}

        {mergeError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-red-950/20 border border-red-900/50 rounded-2xl flex items-start space-x-3 text-red-400 text-xs"
          >
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-white">Error al unificar Word</h4>
              <p className="text-xs text-red-400 mt-0.5">{mergeError}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main split display: Navigation list vs document paper layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* Navigation outline panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-4 space-y-3 shadow-soft">
            <h3 className="text-xs font-bold tracking-widest text-neutral-400 uppercase font-mono">Secuencia de Fusión</h3>
            <div className="space-y-2">
              {enabledFiles.map((file, idx) => (
                <div 
                  key={file.id} 
                  className="flex items-center space-x-2.5 p-2.5 bg-neutral-950 rounded-xl border border-neutral-850 text-xs text-neutral-200 hover:border-neutral-700 transition-all font-medium"
                >
                  <span className="w-5 h-5 flex items-center justify-center rounded bg-neutral-900 font-extrabold text-[10px] text-neutral-400 border border-neutral-800 font-mono">
                    {idx + 1}
                  </span>
                  <p className="truncate flex-1" title={file.name}>{file.name}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-emerald-950/15 border border-emerald-900/40 rounded-2xl p-4 space-y-2 text-xs text-emerald-300 font-medium">
            <div className="flex items-center space-x-1.5 text-emerald-400 font-bold">
              <CheckCircle className="w-4 h-4" />
              <span>Compatibilidad Máxima</span>
            </div>
            <p className="text-emerald-300/90 leading-relaxed font-sans mt-1">
              La salida es un archivo <strong>.docx estándar</strong> compatible con:
            </p>
            <ul className="list-disc pl-4 space-y-1 text-emerald-300/80 font-sans">
              <li>Microsoft Word</li>
              <li>Google Docs / Office 365</li>
              <li>LibreOffice / Pages</li>
              <li>Conservando editabilidad total e imágenes incrustadas</li>
            </ul>
          </div>
        </div>

        {/* Paper visual sheet area */}
        <div className="lg:col-span-3">
          <div className="bg-neutral-900/40 rounded-3xl border border-neutral-800 p-4 md:p-8 flex flex-col items-center">
            <div className="w-full flex items-center justify-between mb-4 px-2">
              <span className="text-xs text-neutral-400 font-mono uppercase tracking-wider">
                Previsualización de Word Combinado
              </span>
              <span className="text-xs text-neutral-500 font-mono">
                Páginas dinámicas
              </span>
            </div>
            
            <div 
              id="print-merged-area"
              className="bg-white rounded-xl shadow-paper border border-neutral-200 px-8 py-12 md:px-16 md:py-20 max-w-[816px] w-[100%] min-h-[1154px] word-document-content space-y-4 text-zinc-900"
            >
              {merging ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4 text-neutral-400 h-full">
                  <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
                  <p className="text-xs font-mono font-bold uppercase tracking-widest text-neutral-400">Compilando documento...</p>
                </div>
              ) : (
                <div 
                  className="document-file-segment"
                  dangerouslySetInnerHTML={{ __html: mergedHtml }}
                />
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
