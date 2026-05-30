export type Conversion = {
  from: string;
  to: string;
  slug: string;
  icon: string;
  label?: string;
  intent?: "merge";
  priority?: number;
};

export const CONVERSIONS: Conversion[] = [
  { from: "PDF", to: "PDF", slug: "merge-pdfs", icon: "Files", label: "Merge PDFs", intent: "merge", priority: 1.1 },
  { from: "PDF", to: "DOCX", slug: "pdf-to-word", icon: "FileText", priority: 1 },
  { from: "PDF", to: "PPTX", slug: "pdf-to-powerpoint", icon: "Presentation", priority: 0.9 },
  { from: "PDF", to: "XLSX", slug: "pdf-to-excel", icon: "Table", priority: 0.95 },
  { from: "PDF", to: "JPG", slug: "pdf-to-jpg", icon: "Image", priority: 1 },
  { from: "PDF", to: "PNG", slug: "pdf-to-png", icon: "Image", priority: 1 },
  { from: "PDF", to: "TXT", slug: "pdf-to-text", icon: "FileCode", priority: 0.85 },
  { from: "PDF", to: "HTML", slug: "pdf-to-html", icon: "Code", priority: 0.75 },
  { from: "DOCX", to: "PDF", slug: "word-to-pdf", icon: "FilePdf", priority: 1 },
  { from: "DOCX", to: "TXT", slug: "word-to-text", icon: "FileCode", priority: 0.75 },
  { from: "DOCX", to: "HTML", slug: "word-to-html", icon: "Code", priority: 0.75 },
  { from: "PPTX", to: "PDF", slug: "powerpoint-to-pdf", icon: "FilePdf", priority: 1 },
  { from: "PPTX", to: "JPG", slug: "powerpoint-to-jpg", icon: "Image", priority: 0.75 },
  { from: "XLSX", to: "PDF", slug: "excel-to-pdf", icon: "FilePdf", priority: 1 },
  { from: "XLSX", to: "CSV", slug: "excel-to-csv", icon: "FileSpreadsheet", priority: 0.75 },
  { from: "CSV", to: "XLSX", slug: "csv-to-excel", icon: "Table", priority: 0.75 },
  { from: "JPG", to: "PDF", slug: "jpg-to-pdf", icon: "FilePdf", priority: 1 },
  { from: "JPG", to: "PNG", slug: "jpg-to-png", icon: "Image", priority: 0.9 },
  { from: "JPG", to: "WEBP", slug: "jpg-to-webp", icon: "Image", priority: 0.85 },
  { from: "PNG", to: "PDF", slug: "png-to-pdf", icon: "FilePdf", priority: 1 },
  { from: "PNG", to: "JPG", slug: "png-to-jpg", icon: "Image", priority: 0.9 },
  { from: "PNG", to: "WEBP", slug: "png-to-webp", icon: "Image", priority: 0.85 },
  { from: "WEBP", to: "JPG", slug: "webp-to-jpg", icon: "Image", priority: 0.85 },
  { from: "WEBP", to: "PNG", slug: "webp-to-png", icon: "Image", priority: 0.75 },
  { from: "HTML", to: "PDF", slug: "html-to-pdf", icon: "FilePdf", priority: 0.75 },
  { from: "TXT", to: "PDF", slug: "text-to-pdf", icon: "FilePdf", priority: 0.75 },
  { from: "TXT", to: "DOCX", slug: "text-to-word", icon: "FileText", priority: 0.75 },
  { from: "PDF", to: "PDF/A", slug: "pdf-to-pdfa", icon: "FilePdf", priority: 0.7 },
  { from: "ODT", to: "PDF", slug: "odt-to-pdf", icon: "FilePdf", priority: 0.7 },
  { from: "ODP", to: "PDF", slug: "odp-to-pdf", icon: "FilePdf", priority: 0.7 },
  { from: "RTF", to: "PDF", slug: "rtf-to-pdf", icon: "FilePdf", priority: 0.7 },
  { from: "RTF", to: "DOCX", slug: "rtf-to-word", icon: "FileText", priority: 0.7 },
  { from: "BMP", to: "PDF", slug: "bmp-to-pdf", icon: "FilePdf", priority: 0.65 },
  { from: "BMP", to: "JPG", slug: "bmp-to-jpg", icon: "Image", priority: 0.65 },
  { from: "GIF", to: "PDF", slug: "gif-to-pdf", icon: "FilePdf", priority: 0.65 },
  { from: "TIFF", to: "PDF", slug: "tiff-to-pdf", icon: "FilePdf", priority: 0.65 },
  { from: "TIFF", to: "JPG", slug: "tiff-to-jpg", icon: "Image", priority: 0.65 },
  { from: "SVG", to: "PDF", slug: "svg-to-pdf", icon: "FilePdf", priority: 0.6 },
  { from: "SVG", to: "PNG", slug: "svg-to-png", icon: "Image", priority: 0.6 },
  { from: "HEIC", to: "JPG", slug: "heic-to-jpg", icon: "Image", priority: 0.8 },
  { from: "HEIC", to: "PNG", slug: "heic-to-png", icon: "Image", priority: 0.7 }
];

export function getConversion(slug: string) {
  return CONVERSIONS.find((conversion) => conversion.slug === slug);
}

export function labelFor(format: string) {
  const names: Record<string, string> = {
    DOCX: "Word",
    PPTX: "PowerPoint",
    XLSX: "Excel",
    TXT: "Text",
    "PDF/A": "PDF/A"
  };

  return names[format] ?? format;
}

export function targetExtension(format: string) {
  const extensions: Record<string, string> = {
    DOCX: "docx",
    PPTX: "pptx",
    XLSX: "xlsx",
    TXT: "txt",
    "PDF/A": "pdf"
  };

  return extensions[format] ?? format.toLowerCase();
}

export function relatedConversions(conversion: Conversion, limit = 4) {
  return CONVERSIONS.filter(
    (candidate) =>
      candidate.slug !== conversion.slug &&
      (candidate.from === conversion.from || candidate.to === conversion.to)
  ).slice(0, limit);
}
