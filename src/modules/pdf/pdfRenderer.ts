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
 * Renders a specific page of a PDF buffer onto an HTML5 canvas
 */
export async function renderPdfPageToCanvas(
  buffer: ArrayBuffer,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale: number = 1.0
): Promise<RenderResult> {
  // Make a clone so pdfjs doesn't detach or mutate the original buffer
  const clone = buffer.slice(0);
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(clone) });
  const pdfDoc = await loadingTask.promise;
  const page = await pdfDoc.getPage(pageNumber);

  const viewport = page.getViewport({ scale });
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);

  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not get 2d context for PDF rendering');

  context.clearRect(0, 0, canvas.width, canvas.height);

  await page.render({
    canvasContext: context,
    viewport,
  }).promise;

  return { width: viewport.width, height: viewport.height };
}
