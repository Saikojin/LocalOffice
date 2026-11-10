import React, { useState, useEffect, useRef } from 'react';
import {
  Download, Trash2, ChevronLeft, ChevronRight, Type,
  PenTool, ZoomIn, ZoomOut, CheckCircle2, Loader2
} from 'lucide-react';
import { createSamplePdf, inspectPdf, applyAnnotations, removePage, PdfAnnotation, PdfPageInfo } from './pdfEngine';
import { renderPdfPageToCanvas } from './pdfRenderer';
import { saveLocalFile, OpenedFile } from '../../core/fs/fileSystemBus';

interface LocalPdfStudioProps {
  initialFile?: OpenedFile | null;
  onSaveStatus?: (message: string) => void;
}

// Subcomponent for thumbnail rendering
const PdfThumbnail: React.FC<{ buffer: ArrayBuffer; pageNumber: number }> = ({ buffer, pageNumber }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    if (canvasRef.current && buffer) {
      renderPdfPageToCanvas(buffer, pageNumber, canvasRef.current, 0.22)
        .then(() => {
          if (!isCancelled) setLoaded(true);
        })
        .catch((err) => {
          if (!isCancelled) console.warn(`Thumbnail render error (page ${pageNumber}):`, err);
        });
    }
    return () => {
      isCancelled = true;
    };
  }, [buffer, pageNumber]);

  return (
    <div className="w-full aspect-[3/4] bg-stone-100 dark:bg-stone-800 rounded border border-stone-200 dark:border-stone-700/60 mb-1 flex items-center justify-center overflow-hidden relative">
      <canvas ref={canvasRef} className={`w-full h-auto max-h-full object-contain ${loaded ? 'block' : 'hidden'}`} />
      {!loaded && (
        <span className="text-xs text-stone-400">Page {pageNumber}</span>
      )}
    </div>
  );
};

export const LocalPdfStudio: React.FC<LocalPdfStudioProps> = ({ initialFile, onSaveStatus }) => {
  const [pdfBuffer, setPdfBuffer] = useState<ArrayBuffer | null>(null);
  const [pages, setPages] = useState<PdfPageInfo[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [docTitle, setDocTitle] = useState<string>('Document');
  const [annotations, setAnnotations] = useState<PdfAnnotation[]>([]);
  const [activeTool, setActiveTool] = useState<'select' | 'text' | 'sign'>('select');
  const [inputText, setInputText] = useState<string>('Approved by LocalOffice');
  const [zoom, setZoom] = useState<number>(1.1);
  const [isRendering, setIsRendering] = useState<boolean>(false);

  const mainCanvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize or load file
  useEffect(() => {
    const init = async () => {
      try {
        if (initialFile && initialFile.name.toLowerCase().endsWith('.pdf')) {
          setPdfBuffer(initialFile.data);
          setDocTitle(initialFile.name.replace(/\.[^/.]+$/, ''));
          const info = await inspectPdf(initialFile.data);
          setPages(info.pages);
          setCurrentPage(0);
          onSaveStatus?.(`Loaded ${initialFile.name}`);
        } else {
          const sampleBytes = await createSamplePdf();
          const buffer = sampleBytes.buffer as ArrayBuffer;
          setPdfBuffer(buffer);
          const info = await inspectPdf(buffer);
          setPages(info.pages);
          setCurrentPage(0);
        }
      } catch (err) {
        console.error('Failed to initialize PDF:', err);
        onSaveStatus?.('Failed to load PDF');
      }
    };

    init();
  }, [initialFile, onSaveStatus]);

  // Render active PDF page onto canvas when pdfBuffer, currentPage, or zoom changes
  useEffect(() => {
    let isCancelled = false;
    if (!pdfBuffer || !mainCanvasRef.current || pages.length === 0) return;

    setIsRendering(true);
    renderPdfPageToCanvas(pdfBuffer, currentPage + 1, mainCanvasRef.current, zoom)
      .then(() => {
        if (!isCancelled) setIsRendering(false);
      })
      .catch((err) => {
        console.error('PDF page render error:', err);
        if (!isCancelled) setIsRendering(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [pdfBuffer, currentPage, zoom, pages.length]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool === 'select' || !pdfBuffer) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Convert display coordinates to PDF coordinate space (PDF y-axis goes upwards from bottom)
    const activePageInfo = pages[currentPage] || { width: 600, height: 800 };
    const scaleX = activePageInfo.width / rect.width;
    const scaleY = activePageInfo.height / rect.height;

    const pdfX = clickX * scaleX;
    const pdfY = activePageInfo.height - (clickY * scaleY);

    const newAnnotation: PdfAnnotation = {
      id: Math.random().toString(36).substring(7),
      pageIndex: currentPage,
      text: activeTool === 'sign' ? '✍ Signed via LocalOffice' : inputText,
      x: Math.round(pdfX),
      y: Math.round(pdfY),
      size: activeTool === 'sign' ? 14 : 12,
      color: activeTool === 'sign' ? { r: 0.1, g: 0.2, b: 0.8 } : { r: 0.8, g: 0.1, b: 0.1 },
    };

    setAnnotations((prev) => [...prev, newAnnotation]);
    setActiveTool('select');
    onSaveStatus?.('Annotation placed. Click "Save .pdf" to commit.');
  };

  const handleDeleteCurrentPage = async () => {
    if (!pdfBuffer || pages.length <= 1) return;
    try {
      const updated = await removePage(pdfBuffer, currentPage);
      const newBuffer = updated.buffer as ArrayBuffer;
      setPdfBuffer(newBuffer);
      const info = await inspectPdf(newBuffer);
      setPages(info.pages);
      setCurrentPage((prev) => Math.max(0, Math.min(prev, info.pageCount - 1)));
      setAnnotations((prev) =>
        prev
          .filter((a) => a.pageIndex !== currentPage)
          .map((a) => (a.pageIndex > currentPage ? { ...a, pageIndex: a.pageIndex - 1 } : a))
      );
      onSaveStatus?.('Page removed');
    } catch (err) {
      console.error('Delete page failed:', err);
    }
  };

  const handleSavePdf = async () => {
    if (!pdfBuffer) return;
    try {
      const outputBytes = await applyAnnotations(pdfBuffer, annotations);
      await saveLocalFile(outputBytes.buffer as ArrayBuffer, {
        suggestedName: `${docTitle}.pdf`,
        existingHandle: initialFile?.handle,
      });
      onSaveStatus?.(`Saved ${docTitle}.pdf`);
    } catch (err) {
      console.error('Save PDF failed:', err);
      onSaveStatus?.('Save PDF failed');
    }
  };

  const activePageInfo = pages[currentPage] || { width: 600, height: 800 };
  const currentAnnotations = annotations.filter((a) => a.pageIndex === currentPage);

  return (
    <div className="flex-1 flex flex-col h-full bg-stone-100 dark:bg-stone-950 select-none overflow-hidden">
      {/* Top Controls Bar */}
      <div className="h-11 border-b border-stone-200 dark:border-stone-800 px-4 flex items-center justify-between bg-white dark:bg-stone-900 text-xs shadow-xs">
        {/* Document Title */}
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={docTitle}
            onChange={(e) => setDocTitle(e.target.value)}
            className="font-medium bg-transparent border-b border-transparent hover:border-stone-300 dark:hover:border-stone-700 focus:border-blue-500 focus:outline-hidden px-1 py-0.5 max-w-[180px]"
            title="PDF Title"
          />
        </div>

        {/* Tools Palette */}
        <div className="flex items-center space-x-1 bg-stone-100 dark:bg-stone-800 p-0.5 rounded-lg">
          <button
            onClick={() => setActiveTool(activeTool === 'text' ? 'select' : 'text')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded transition-colors ${
              activeTool === 'text'
                ? 'bg-blue-600 text-white font-medium shadow-xs'
                : 'text-stone-700 dark:text-stone-300 hover:text-stone-900'
            }`}
            title="Insert Text Note"
          >
            <Type className="w-3.5 h-3.5" />
            <span>Add Text</span>
          </button>

          {activeTool === 'text' && (
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Annotation text"
              className="bg-stone-200 dark:bg-stone-700 px-2 py-0.5 rounded text-xs w-36 focus:outline-hidden"
            />
          )}

          <button
            onClick={() => setActiveTool(activeTool === 'sign' ? 'select' : 'sign')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded transition-colors ${
              activeTool === 'sign'
                ? 'bg-blue-600 text-white font-medium shadow-xs'
                : 'text-stone-700 dark:text-stone-300 hover:text-stone-900'
            }`}
            title="Insert Signature Stamp"
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Sign</span>
          </button>

          <div className="h-4 w-px bg-stone-300 dark:bg-stone-700 mx-1" />

          {/* Page Navigation */}
          <button
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className="p-1 rounded text-stone-600 dark:text-stone-400 disabled:opacity-30 hover:bg-stone-200 dark:hover:bg-stone-700"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="font-mono text-xs px-1 text-stone-600 dark:text-stone-400">
            {pages.length > 0 ? `${currentPage + 1} / ${pages.length}` : '0 / 0'}
          </span>

          <button
            onClick={() => setCurrentPage((p) => Math.min(pages.length - 1, p + 1))}
            disabled={currentPage >= pages.length - 1}
            className="p-1 rounded text-stone-600 dark:text-stone-400 disabled:opacity-30 hover:bg-stone-200 dark:hover:bg-stone-700"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-stone-300 dark:bg-stone-700 mx-1" />

          <button
            onClick={handleDeleteCurrentPage}
            disabled={pages.length <= 1}
            className="p-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded disabled:opacity-30 transition-colors"
            title="Delete Current Page"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Zoom & Export */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-0.5 text-stone-500">
            <button
              onClick={() => setZoom((z) => Math.max(0.6, Math.round((z - 0.1) * 10) / 10))}
              className="p-1 hover:text-stone-800 dark:hover:text-stone-200"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[11px] w-9 text-center">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(2.5, Math.round((z + 0.1) * 10) / 10))}
              className="p-1 hover:text-stone-800 dark:hover:text-stone-200"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={handleSavePdf}
            className="flex items-center space-x-1.5 px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
            title="Save as Flattened PDF"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Save .pdf</span>
          </button>
        </div>
      </div>

      {/* Main Workspace (Thumbnails + Page Viewport) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Thumbnails Sidebar */}
        <aside className="w-44 border-r border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-y-auto p-3 space-y-3">
          <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-2">
            Pages ({pages.length})
          </div>
          {pdfBuffer && pages.map((p, idx) => (
            <div
              key={idx}
              onClick={() => setCurrentPage(idx)}
              className={`p-2 rounded-lg cursor-pointer transition-all border text-center ${
                currentPage === idx
                  ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 font-medium'
                  : 'border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700'
              }`}
            >
              <PdfThumbnail buffer={pdfBuffer} pageNumber={idx + 1} />
              <span className="text-[10px] text-stone-500">
                Page {p.pageNumber} ({Math.round(p.width)} × {Math.round(p.height)})
              </span>
            </div>
          ))}
        </aside>

        {/* PDF Page Canvas Viewport */}
        <div className="flex-1 overflow-auto p-8 flex items-center justify-center relative">
          {/* Main Document Box */}
          <div
            onClick={handleCanvasClick}
            style={{
              width: `${activePageInfo.width * zoom}px`,
              height: `${activePageInfo.height * zoom}px`,
              cursor: activeTool !== 'select' ? 'crosshair' : 'default',
            }}
            className="bg-white shadow-lg border border-stone-300 dark:border-stone-700 rounded-sm relative overflow-hidden transition-all duration-150 flex items-center justify-center"
          >
            {/* Active tool indicator helper */}
            {activeTool !== 'select' && (
              <div className="absolute top-3 left-3 bg-blue-600/90 text-white px-2.5 py-1 rounded text-xs z-30 shadow-xs pointer-events-none flex items-center space-x-1.5">
                <CheckCircle2 className="w-3 h-3" />
                <span>Click anywhere on the document to place {activeTool === 'sign' ? 'signature' : 'text'}</span>
              </div>
            )}

            {/* Rendering Spinner */}
            {isRendering && (
              <div className="absolute inset-0 bg-white/70 dark:bg-stone-900/70 z-20 flex items-center justify-center backdrop-blur-xs">
                <div className="flex items-center space-x-2 text-xs text-stone-600 dark:text-stone-300 font-medium">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Rendering PDF...</span>
                </div>
              </div>
            )}

            {/* Real PDF.js Canvas */}
            <canvas ref={mainCanvasRef} className="block w-full h-full object-contain pointer-events-none" />

            {/* Live Interactive Annotations Overlay */}
            {currentAnnotations.map((annot) => {
              const scale = zoom;
              const displayX = (annot.x / activePageInfo.width) * (activePageInfo.width * scale);
              const displayY = ((activePageInfo.height - annot.y) / activePageInfo.height) * (activePageInfo.height * scale);

              return (
                <div
                  key={annot.id}
                  style={{
                    left: `${displayX}px`,
                    top: `${displayY}px`,
                    fontSize: `${(annot.size || 12) * zoom}px`,
                    color: annot.color ? `rgb(${annot.color.r * 255}, ${annot.color.g * 255}, ${annot.color.b * 255})` : '#dc2626',
                  }}
                  className="absolute font-semibold pointer-events-auto transform -translate-y-full px-1.5 py-0.5 rounded border border-dashed border-red-400/60 bg-red-50/30"
                >
                  {annot.text}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="h-6 bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 px-4 flex items-center justify-between text-[11px] text-stone-400 select-none">
        <div>
          <span>{annotations.length} annotations placed</span>
        </div>
        <div>
          <span>LocalPDF Studio • Mozilla PDF.js Vector Engine</span>
        </div>
      </footer>
    </div>
  );
};
