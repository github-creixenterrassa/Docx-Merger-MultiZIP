import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/**
 * Generates a high-quality PDF blob from a given HTML element.
 * It uses a canvas-clipping horizontal-vertical pagination method.
 */
/**
 * Safe conversion of oklch color values to standard rgb/rgba.
 * html2canvas fails to compile styles with unsupported color functions like oklch.
 */
function sanitizeOklch(cssText: string): string {
  if (!cssText) return "";
  return cssText.replace(/oklch\s*\(([^)]+)\)/gi, (match, content) => {
    try {
      const parts = content.trim().split(/[\s/]+/);
      if (parts.length > 0) {
        let lStr = parts[0];
        let lVal = parseFloat(lStr);
        if (lStr.includes("%")) {
          lVal = parseFloat(lStr) / 100;
        }

        let alpha = "1";
        if (parts.length > 3) {
          const possibleAlpha = parts[3];
          if (!possibleAlpha.includes("var")) {
            alpha = possibleAlpha;
          }
        } else if (parts.length === 2) {
          alpha = parts[1];
        }

        if (!isNaN(lVal)) {
          if (lVal > 0.9) {
            return `rgba(245, 245, 245, ${alpha})`;
          } else if (lVal > 0.8) {
            return `rgba(229, 229, 229, ${alpha})`;
          } else if (lVal < 0.15) {
            return `rgba(10, 10, 10, ${alpha})`;
          } else if (lVal < 0.25) {
            return `rgba(23, 23, 23, ${alpha})`;
          } else if (lVal < 0.4) {
            return `rgba(64, 64, 64, ${alpha})`;
          } else if (lVal < 0.6) {
            const chroma = parseFloat(parts[1] || "0");
            if (chroma > 0.05) {
              return `rgba(99, 102, 241, ${alpha})`;
            }
            return `rgba(115, 115, 115, ${alpha})`;
          } else {
            const chroma = parseFloat(parts[1] || "0");
            if (chroma > 0.05) {
              return `rgba(129, 140, 248, ${alpha})`;
            }
            return `rgba(163, 163, 163, ${alpha})`;
          }
        }
      }
    } catch {
      // ignore
    }
    return "rgba(99, 102, 241, 1)";
  });
}

export async function generatePdfFromHtml(
  element: HTMLElement,
  fileName: string,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  onProgress?.(10);

  // Parse all <style> elements and sanitize oklch color references
  // to avoid html2canvas crash during stylesheet parsing.
  const styleTags = Array.from(document.querySelectorAll("style"));
  const originalStyles = new Map<HTMLStyleElement, string>();

  try {
    for (const tag of styleTags) {
      if (tag.innerHTML && tag.innerHTML.includes("oklch")) {
        originalStyles.set(tag, tag.innerHTML);
        tag.innerHTML = sanitizeOklch(tag.innerHTML);
      }
    }
  } catch (err) {
    console.warn("Unable to sanitize style tags", err);
  }

  let canvas;
  try {
    // We capture the canvas with scale: 2 for sharp, printable resolution.
    canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      allowTaint: true,
      backgroundColor: "#ffffff",
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight
    });
  } finally {
    // Restore original styles
    for (const [tag, originalText] of originalStyles.entries()) {
      try {
        tag.innerHTML = originalText;
      } catch (err) {
        console.warn("Unable to restore style tag", err);
      }
    }
  }

  onProgress?.(50);

  const imgWidth = 210; // A4 standard width in mm
  const pageHeight = 297; // A4 standard height in mm
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;

  // Compute the proportion of height relative to the page width
  const imgHeight = (canvasHeight * imgWidth) / canvasWidth;

  // Initialize PDF (a4, portraits, millimeters)
  const pdf = new jsPDF("p", "mm", "a4");
  let heightLeft = imgHeight;
  let position = 0;

  // Export A4 scale image
  const imgData = canvas.toDataURL("image/jpeg", 0.95);

  onProgress?.(80);

  // Add the first page
  pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight, undefined, "FAST");
  heightLeft -= pageHeight;

  // Slice the image into subsequent pages
  while (heightLeft > 0) {
    position = heightLeft - imgHeight; // Move the viewport upwards
    pdf.addPage();
    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight, undefined, "FAST");
    heightLeft -= pageHeight;
  }

  onProgress?.(100);
  return pdf.output("blob");
}

/**
 * Returns a nicely CSS-styled container string with standard Word doc values.
 */
export const wordProcessorStyles = `
  .word-document-content {
    font-family: "Georgia", "Aptos", "Calibri", "Arial", serif;
    color: #1a1a1a;
    line-height: 1.6;
    font-size: 15px;
    text-align: justify;
  }
  .word-document-content p {
    margin-bottom: 1.15em;
  }
  .word-document-content h1, 
  .word-document-content h2, 
  .word-document-content h3, 
  .word-document-content h4 {
    font-family: "Inter", "Segoe UI", "Arial", sans-serif;
    color: #0f172a;
    font-weight: 700;
    margin-top: 1.5em;
    margin-bottom: 0.5em;
    line-height: 1.25;
  }
  .word-document-content h1 { font-size: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.3em; }
  .word-document-content h2 { font-size: 20px; }
  .word-document-content h3 { font-size: 16px; }
  
  .word-document-content ul, 
  .word-document-content ol {
    margin-bottom: 1.15em;
    padding-left: 2em;
  }
  .word-document-content ul {
    list-style-type: disc;
  }
  .word-document-content ol {
    list-style-type: decimal;
  }
  .word-document-content li {
    margin-bottom: 0.5em;
  }
  .word-document-content table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 1.5em;
    margin-bottom: 1.5em;
    font-size: 14px;
  }
  .word-document-content th, 
  .word-document-content td {
    border: 1px solid #cbd5e1;
    padding: 0.75em 1em;
    text-align: left;
  }
  .word-document-content th {
    background-color: #f8fafc;
    font-weight: 600;
    color: #334155;
  }
  .word-document-content tr:nth-child(even) {
    background-color: #f8fafc;
  }
  .word-document-content img {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 1.5em auto;
    border-radius: 4px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }
  .word-document-content blockquote {
    border-left: 4px solid #94a3b8;
    background-color: #f1f5f9;
    padding: 0.75em 1.5em;
    margin: 1.5em 0;
    font-style: italic;
    color: #475569;
  }
  .word-document-content pre, 
  .word-document-content code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    background-color: #f1f5f9;
    border-radius: 4px;
    font-size: 13px;
  }
  .word-document-content code {
    padding: 0.2em 0.4em;
  }
  .word-document-content pre {
    padding: 1em;
    overflow-x: auto;
    margin-bottom: 1.15em;
  }
  .document-divider {
    page-break-before: always;
    break-before: page;
    position: relative;
    margin-top: 3em;
    margin-bottom: 3em;
    border-top: 2px dashed #94a3b8;
  }
  @media print {
    .document-divider {
      border: none;
      margin: 0;
      padding: 0;
    }
  }
`;
