import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface PdfAnnotation {
  id: string;
  pageIndex: number;
  text: string;
  x: number;
  y: number;
  size?: number;
  color?: { r: number; g: number; b: number };
}

export interface PdfPageInfo {
  pageNumber: number;
  width: number;
  height: number;
}

/**
 * Creates a clean starter PDF with sample formatting
 */
export async function createSamplePdf(): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 800]);
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  page.drawText('LocalPDF Studio', {
    x: 50,
    y: 730,
    size: 26,
    font,
    color: rgb(0.1, 0.4, 0.8),
  });

  page.drawText('Modern, client-side PDF editing and annotation.', {
    x: 50,
    y: 700,
    size: 13,
    font: regularFont,
    color: rgb(0.3, 0.3, 0.3),
  });

  page.drawText('• Add text notes and signatures anywhere on the document.', {
    x: 50,
    y: 650,
    size: 11,
    font: regularFont,
    color: rgb(0.2, 0.2, 0.2),
  });

  page.drawText('• Rearrange, rotate, or delete pages with immediate visual feedback.', {
    x: 50,
    y: 630,
    size: 11,
    font: regularFont,
    color: rgb(0.2, 0.2, 0.2),
  });

  page.drawText('• Save directly to your disk via File System Access API without uploading anywhere.', {
    x: 50,
    y: 610,
    size: 11,
    font: regularFont,
    color: rgb(0.2, 0.2, 0.2),
  });

  return pdfDoc.save();
}

/**
 * Inspects a PDF and returns page dimensions and count
 */
export async function inspectPdf(buffer: ArrayBuffer): Promise<{
  pageCount: number;
  pages: PdfPageInfo[];
}> {
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const count = pdfDoc.getPageCount();
  const pages: PdfPageInfo[] = [];

  for (let i = 0; i < count; i++) {
    const page = pdfDoc.getPage(i);
    const { width, height } = page.getSize();
    pages.push({
      pageNumber: i + 1,
      width,
      height,
    });
  }

  return { pageCount: count, pages };
}

/**
 * Adds text annotations and renders a modified PDF buffer
 */
export async function applyAnnotations(
  buffer: ArrayBuffer,
  annotations: PdfAnnotation[]
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (const annot of annotations) {
    if (annot.pageIndex >= 0 && annot.pageIndex < pdfDoc.getPageCount()) {
      const page = pdfDoc.getPage(annot.pageIndex);
      const c = annot.color || { r: 0.1, g: 0.1, b: 0.1 };

      page.drawText(annot.text, {
        x: annot.x,
        y: annot.y,
        size: annot.size || 12,
        font,
        color: rgb(c.r, c.g, c.b),
      });
    }
  }

  return pdfDoc.save();
}

/**
 * Deletes a page from the PDF
 */
export async function removePage(buffer: ArrayBuffer, pageIndex: number): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
  if (pdfDoc.getPageCount() > 1 && pageIndex >= 0 && pageIndex < pdfDoc.getPageCount()) {
    pdfDoc.removePage(pageIndex);
  }
  return pdfDoc.save();
}
