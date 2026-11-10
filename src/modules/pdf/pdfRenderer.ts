import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';

if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
}

export interface RenderResult {
  width: number;
  height: number;
}

/**
 * Loads a PDF document once into a reusable PDFDocumentProxy
 */
export async function loadPdfDocument(buffer: ArrayBuffer): Promise<pdfjsLib.PDFDocumentProxy> {
  const clone = buffer.slice(0);
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(clone) });
  return loadingTask.promise;
}

/**
 * Renders a specific PDF page proxy onto an HTML5 canvas with cancellation support
 */
export function renderPageToCanvas(
  page: pdfjsLib.PDFPageProxy,
  canvas: HTMLCanvasElement,
  scale: number = 1.0
): { promise: Promise<RenderResult>; cancel: () => void } {
  const viewport = page.getViewport({ scale });
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  const context = canvas.getContext('2d');
  if (!context) {
    return {
      promise: Promise.reject(new Error('Could not get 2d context for canvas')),
      cancel: () => {},
    };
  }

  context.clearRect(0, 0, canvas.width, canvas.height);

  const renderTask = page.render({
    canvasContext: context,
    viewport,
  });

  const promise = renderTask.promise.then(() => ({
    width: viewport.width,
    height: viewport.height,
  }));

  return {
    promise,
    cancel: () => renderTask.cancel(),
  };
}

/**
 * Extracts formatted text from all pages of a PDF document
 */
export async function extractPdfText(doc: pdfjsLib.PDFDocumentProxy): Promise<string> {
  const pagesHtml: string[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    let currentY: number | null = null;
    let line = '';
    const lines: string[] = [];

    for (const item of content.items as { str?: string; transform?: number[] }[]) {
      const str = item.str || '';
      if (!str.trim()) continue;

      const y = Math.round(item.transform ? item.transform[5] : 0);
      if (currentY === null || Math.abs(currentY - y) > 5) {
        if (line.trim()) lines.push(line.trim());
        line = str;
        currentY = y;
      } else {
        line += ' ' + str;
      }
    }
    if (line.trim()) lines.push(line.trim());

    if (lines.length > 0) {
      pagesHtml.push(
        `<p><strong>--- Page ${i} ---</strong></p>` +
        lines.map((l) => `<p>${l}</p>`).join('')
      );
    }
  }

  return pagesHtml.join('<hr />');
}
