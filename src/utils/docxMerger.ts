import JSZip from "jszip";

/**
 * Merges multiple .docx files into a single consolidated .docx file client-side.
 * It combines the XML document bodies, handles relationship maps to copy pictures/assets safely,
 * and maintains continuous page layout separators (page breaks).
 */
export async function mergeDocxFiles(
  files: ArrayBuffer[],
  onProgress?: (progress: number) => void
): Promise<Blob> {
  if (files.length === 0) {
    throw new Error("No hay archivos para unir.");
  }
  if (files.length === 1) {
    return new Blob([files[0]], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  }

  onProgress?.(10);

  // 1. Load the first docx as the base JSZip instance
  const baseZip = await JSZip.loadAsync(files[0]);
  const parser = new DOMParser();
  const serializer = new XMLSerializer();

  // 2. Load the base document.xml
  const baseDocXmlText = await baseZip.file("word/document.xml")?.async("string");
  if (!baseDocXmlText) {
    throw new Error("El archivo base no tiene word/document.xml válido.");
  }
  const baseDocXml = parser.parseFromString(baseDocXmlText, "application/xml");
  const baseBody = baseDocXml.getElementsByTagName("w:body")[0];
  if (!baseBody) {
    throw new Error("El archivo base no tiene un cuerpo <w:body> válido.");
  }

  // Find the final section properties of the base document
  // It is the last child of <w:body>, e.g., <w:sectPr>
  const baseFinalSectPr = baseBody.getElementsByTagName("w:sectPr")[0] ||
                          baseBody.getElementsByTagNameNS("*", "sectPr")[0] ||
                          baseBody.lastElementChild;

  // 3. Load base relationship file to avoid relationship ID clashes
  let baseRelsText = await baseZip.file("word/_rels/document.xml.rels")?.async("string");
  if (!baseRelsText) {
    baseRelsText = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
  }
  const baseRelsXml = parser.parseFromString(baseRelsText, "application/xml");
  const baseRelsRoot = baseRelsXml.getElementsByTagName("Relationships")[0];

  // Helper to find the maximum existing rId number in base relationships
  const getNextRelId = () => {
    const rels = baseRelsRoot.getElementsByTagName("Relationship");
    let maxId = 0;
    for (let j = 0; j < rels.length; j++) {
      const idAttr = rels[j].getAttribute("Id") || "";
      const match = idAttr.match(/^rId(\d+)$/);
      if (match) {
        const val = parseInt(match[1], 10);
        if (val > maxId) maxId = val;
      }
    }
    return `rId${maxId + 1}`;
  };

  onProgress?.(25);

  const stepsCount = files.length - 1;

  // 4. Merge subsequent documents
  for (let i = 1; i < files.length; i++) {
    const subZip = await JSZip.loadAsync(files[i]);
    const subDocXmlText = await subZip.file("word/document.xml")?.async("string");
    if (!subDocXmlText) continue;

    const subDocXml = parser.parseFromString(subDocXmlText, "application/xml");
    const subBody = subDocXml.getElementsByTagName("w:body")[0];
    if (!subBody) continue;

    // Load sub relationships if any
    const subRelsText = await subZip.file("word/_rels/document.xml.rels")?.async("string");
    const subRelsMap = new Map<string, string>(); // Original rId -> New rId in Base

    if (subRelsText) {
      const subRelsXml = parser.parseFromString(subRelsText, "application/xml");
      const subRels = subRelsXml.getElementsByTagName("Relationship");
      
      for (let j = 0; j < subRels.length; j++) {
        const rel = subRels[j];
        const oldId = rel.getAttribute("Id");
        const type = rel.getAttribute("Type") || "";
        let target = rel.getAttribute("Target") || "";

        if (!oldId) continue;

        // If the target is a media/image resource, let's copy and rename the media file to avoid clash
        if (type.includes("relationships/image") || target.startsWith("media/")) {
          const originalMediaName = target.split("/").pop() || `image_${Date.now()}`;
          const newMediaName = `merged_${i}_${originalMediaName}`;
          const sourcePath = `word/${target}`;
          const destPath = `word/media/${newMediaName}`;

          // Copy the media from subZip to baseZip
          const mediaFile = subZip.file(sourcePath);
          if (mediaFile) {
            const mediaBuffer = await mediaFile.async("arraybuffer");
            baseZip.file(destPath, mediaBuffer);
          }
          target = `media/${newMediaName}`;
        }

        // Generate a new relation Id inside base
        const newId = getNextRelId();
        subRelsMap.set(oldId, newId);

        // Add the Relationship to the base rels XML
        const newRelNode = baseRelsXml.createElementNS("http://schemas.openxmlformats.org/package/2006/relationships", "Relationship");
        newRelNode.setAttribute("Id", newId);
        newRelNode.setAttribute("Type", type);
        newRelNode.setAttribute("Target", target);
        if (rel.hasAttribute("TargetMode")) {
          newRelNode.setAttribute("TargetMode", rel.getAttribute("TargetMode") || "");
        }
        baseRelsRoot.appendChild(newRelNode);
      }
    }

    // Update relationship references inside the subDocXml body before merging.
    // We traverse elements looking for any attributes that reference relationship IDs.
    const elementsToUpdate = subBody.getElementsByTagName("*");
    for (let e = 0; e < elementsToUpdate.length; e++) {
      const elem = elementsToUpdate[e];
      const attrs = Array.from(elem.attributes);
      for (const attr of attrs) {
        if (attr.name.includes("id") || attr.name.includes("embed") || attr.name.includes("link")) {
          const oldRelVal = attr.value;
          if (subRelsMap.has(oldRelVal)) {
            elem.setAttribute(attr.name, subRelsMap.get(oldRelVal)!);
          }
        }
      }
    }

    // Add a clean Page Break paragraph in baseBody before appending subsequent document elements
    const pageBreakP = baseDocXml.createElementNS("http://schemas.openxmlformats.org/wordprocessingml/2006/main", "w:p");
    const pageBreakR = baseDocXml.createElementNS("http://schemas.openxmlformats.org/wordprocessingml/2006/main", "w:r");
    const brElem = baseDocXml.createElementNS("http://schemas.openxmlformats.org/wordprocessingml/2006/main", "w:br");
    brElem.setAttributeNS("http://schemas.openxmlformats.org/wordprocessingml/2006/main", "w:type", "page");
    pageBreakR.appendChild(brElem);
    pageBreakP.appendChild(pageBreakR);

    // Insert page break paragraph before base document's final sectPr/end of body
    if (baseFinalSectPr && baseFinalSectPr.parentNode === baseBody) {
      baseBody.insertBefore(pageBreakP, baseFinalSectPr);
    } else {
      baseBody.appendChild(pageBreakP);
    }

    // Append child elements from subBody (excluding its last <w:sectPr> if inside)
    const childNodes = Array.from(subBody.childNodes);
    // Remove the trailing sectPr element from childNodes so we don't duplicate multiple page size definitions on the root level
    const lastNode = childNodes[childNodes.length - 1] as Element;
    if (lastNode && lastNode.nodeType === 1 && lastNode.localName === "sectPr") {
      childNodes.pop();
    }

    for (const childNode of childNodes) {
      const imported = baseDocXml.importNode(childNode, true);
      if (baseFinalSectPr && baseFinalSectPr.parentNode === baseBody) {
        baseBody.insertBefore(imported, baseFinalSectPr);
      } else {
        baseBody.appendChild(imported);
      }
    }

    onProgress?.(25 + Math.floor((i / stepsCount) * 55));
  }

  // 5. Serialize the base XML documents and write back to JSZip
  const baseDocXmlString = serializer.serializeToString(baseDocXml);
  baseZip.file("word/document.xml", baseDocXmlString);

  const baseRelsXmlString = serializer.serializeToString(baseRelsXml);
  baseZip.file("word/_rels/document.xml.rels", baseRelsXmlString);

  onProgress?.(85);

  // 6. Output the compiled ZIP as a file blob
  const mergedBlob = await baseZip.generateAsync({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  });

  onProgress?.(100);
  return mergedBlob;
}
