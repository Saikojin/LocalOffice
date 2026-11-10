import React, { useState, useEffect, useRef } from 'react';
import {
  Download, Trash2, ChevronLeft, ChevronRight, Type,
  PenTool, ZoomIn, ZoomOut, Check, Loader2, FileText,
  Square
} from 'lucide-react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import {
  createSamplePdf, inspectPdf, applyAnnotations, removePage,
  PdfAnnotation, PdfPageInfo
} from './pdfEngine';
import { loadPdfDocument, renderPageToCanvas, extractPdfText } from './pdfRenderer';
import { saveLocalFile, OpenedFile } from '../../core/fs/fileSystemBus';

interface LocalPdfStudioProps {
  initialFile?: OpenedFile | null;
  onSaveStatus?: (message: string) => void;
  onOpenInWriter?: (htmlContent: string, title: string) => void;
}

const COLOR_PRESETS = [
  { name: 'Black', r: 0.1, g: 0.1, b: 0.1, hex: '#1c1917' },
  { name: 'Blue', r: 0.1, g: 0.35, b: 0.85, hex: '#1d4ed8' },
  { name: 'Red', r: 0.85, g: 0.15, b: 0.15, hex: '#dc2626' },
  { name: 'Green', r: 0.1, g: 0.6, b: 0.25, hex: '#16a34a' },
];

const FONT_SIZES = [11, 14, 18, 24];

/**
 * High-performance thumbnail subcomponent utilizing the shared PDFDocumentProxy
 */
const PdfThumbnail: React.FC<{
  pdfDoc: PDFDocumentProxy;
  pageNumber: number;
}> = ({ pdfDoc, pageNumber }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    let cancelFn: (() => void) | null = null;

    const render = async () => {
      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (isCancelled || !canvasRef.current) return;

        const { promise, cancel } = renderPageToCanvas(page, canvasRef.current, 0.22);
        cancelFn = cancel;
        await promise;
        if (!isCancelled) setLoaded(true);
      } catch (err: unknown) {
        const error = err as { name?: string };
        if (error?.name !== 'RenderingCancelledException' && !isCancelled) {
          console.warn(`Thumbnail render error for page ${pageNumber}:`, err);
        }
      }
    };

    render();

    return () => {
      isCancelled = true;
      if (cancelFn) cancelFn();
    };
  }, [pdfDoc, pageNumber]);

  return (
    <div className="w-full aspect-[3/4] bg-stone-100 dark:bg-stone-800 rounded border border-stone-200 dark:border-stone-700/60 mb-1 flex items-center justify-center overflow-hidden relative shadow-xs">
      <canvas ref={canvasRef} className="w-full h-auto max-h-full object-contain block" />
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-stone-100 dark:bg-stone-800 text-[10px] text-stone-400">
          Page {pageNumber}
        </div>
      )}
    </div>
  );
};

export const LocalPdfStudio: React.FC<LocalPdfStudioProps> = ({
  initialFile,
  onSaveStatus,
  onOpenInWriter,
}) => {
  const [pdfBuffer, setPdfBuffer] = useState<ArrayBuffer | null>(null);
  const [pdfDocProxy, setPdfDocProxy] = useState<PDFDocumentProxy | null>(null);
  const [pages, setPages] = useState<PdfPageInfo[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [docTitle, setDocTitle] = useState<string>('Document');
  const [annotations, setAnnotations] = useState<PdfAnnotation[]>([]);
  const [activeTool, setActiveTool] = useState<'select' | 'text' | 'sign'>('select');
  const [zoom, setZoom] = useState<number>(1.15);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);

  // Active annotation edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const activeRenderCancelRef = useRef<(() => void) | null>(null);

  // Initialize or load file
  useEffect(() => {
    let isCancelled = false;

    const init = async () => {
      try {
        let bufferToLoad: ArrayBuffer;
        if (initialFile && initialFile.name.toLowerCase().endsWith('.pdf')) {
          bufferToLoad = initialFile.data;
          setDocTitle(initialFile.name.replace(/\.[^/.]+$/, ''));
        } else {
          const sampleBytes = await createSamplePdf();
          bufferToLoad = sampleBytes.buffer as ArrayBuffer;
        }

        if (isCancelled) return;
        setPdfBuffer(bufferToLoad);

        // Inspect metadata via pdf-lib
        const info = await inspectPdf(bufferToLoad);
        if (isCancelled) return;
        setPages(info.pages);
        setCurrentPage(0);

        // Load document proxy once via PDF.js
        const proxy = await loadPdfDocument(bufferToLoad);
        if (isCancelled) return;
        setPdfDocProxy(proxy);

        onSaveStatus?.(`Loaded ${initialFile ? initialFile.name : 'Starter PDF'}`);
      } catch (err) {
        console.error('Failed to initialize PDF:', err);
        onSaveStatus?.('Failed to load PDF');
      }
    };

    init();

    return () => {
      isCancelled = true;
    };
  }, [initialFile, onSaveStatus]);

  // Render main canvas when page, proxy, or zoom changes
  useEffect(() => {
    let isCancelled = false;
    if (!pdfDocProxy || !mainCanvasRef.current || pages.length === 0) return;

    if (activeRenderCancelRef.current) {
      activeRenderCancelRef.current();
      activeRenderCancelRef.current = null;
    }

    setIsRendering(true);

    pdfDocProxy
      .getPage(currentPage + 1)
      .then((page) => {
        if (isCancelled || !mainCanvasRef.current) return;
        const { promise, cancel } = renderPageToCanvas(page, mainCanvasRef.current, zoom);
        activeRenderCancelRef.current = cancel;
        return promise;
      })
      .then(() => {
        if (!isCancelled) setIsRendering(false);
      })
      .catch((err: unknown) => {
        const error = err as { name?: string };
        if (error?.name !== 'RenderingCancelledException' && !isCancelled) {
          console.error('PDF page render error:', err);
          setIsRendering(false);
        }
      });

    return () => {
      isCancelled = true;
      if (activeRenderCancelRef.current) {
        activeRenderCancelRef.current();
        activeRenderCancelRef.current = null;
      }
    };
  }, [pdfDocProxy, currentPage, zoom, pages.length]);

  // Click on PDF Canvas: add text or select
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!pdfBuffer || activeTool === 'select') {
      setSelectedId(null);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const activePageInfo = pages[currentPage] || { width: 600, height: 800 };
    const scaleX = activePageInfo.width / rect.width;
    const scaleY = activePageInfo.height / rect.height;

    const pdfX = Math.round(clickX * scaleX);
    const pdfY = Math.round(activePageInfo.height - clickY * scaleY);

    const isSign = activeTool === 'sign';
    const newAnnot: PdfAnnotation = {
      id: Math.random().toString(36).substring(7),
      pageIndex: currentPage,
      text: isSign ? '✍ Signed' : 'Click to edit text',
      x: pdfX,
      y: pdfY,
      size: isSign ? 16 : 14,
      color: isSign ? { r: 0.1, g: 0.35, b: 0.85 } : { r: 0.1, g: 0.1, b: 0.1 },
      whiteout: false,
    };

    setAnnotations((prev) => [...prev, newAnnot]);
    setSelectedId(newAnnot.id);
    setEditingId(newAnnot.id);
    setActiveTool('select');
    onSaveStatus?.('Text box placed. Type your text directly.');
  };

  const updateAnnotation = (id: string, updates: Partial<PdfAnnotation>) => {
    setAnnotations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
  };

  const deleteAnnotation = (id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
    if (selectedId === id) setSelectedId(null);
    if (editingId === id) setEditingId(null);
  };

  const handleDeleteCurrentPage = async () => {
    if (!pdfBuffer || pages.length <= 1) return;
    try {
      const updated = await removePage(pdfBuffer, currentPage);
      const newBuffer = updated.buffer as ArrayBuffer;
      setPdfBuffer(newBuffer);

      const info = await inspectPdf(newBuffer);
      setPages(info.pages);
      const newPageIdx = Math.max(0, Math.min(currentPage, info.pageCount - 1));
      setCurrentPage(newPageIdx);

      const proxy = await loadPdfDocument(newBuffer);
      setPdfDocProxy(proxy);

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

  // Extract full document text and open in LocalWriter
  const handleEditInWriter = async () => {
    if (!pdfDocProxy) return;
    setIsExtracting(true);
    try {
      const extractedHtml = await extractPdfText(pdfDocProxy);
      onOpenInWriter?.(extractedHtml, docTitle);
      onSaveStatus?.('Document extracted to LocalWriter.');
    } catch (err) {
      console.error('Text extraction failed:', err);
      onSaveStatus?.('Failed to extract text from PDF');
    } finally {
      setIsExtracting(false);
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
            onClick={() => {
              setActiveTool(activeTool === 'text' ? 'select' : 'text');
              setSelectedId(null);
            }}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded transition-colors ${
              activeTool === 'text'
                ? 'bg-blue-600 text-white font-medium shadow-xs'
                : 'text-stone-700 dark:text-stone-300 hover:text-stone-900'
            }`}
            title="Click on the page to insert an editable text box"
          >
            <Type className="w-3.5 h-3.5" />
            <span>Add Text</span>
          </button>

          <button
            onClick={() => {
              setActiveTool(activeTool === 'sign' ? 'select' : 'sign');
              setSelectedId(null);
            }}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded transition-colors ${
              activeTool === 'sign'
                ? 'bg-blue-600 text-white font-medium shadow-xs'
                : 'text-stone-700 dark:text-stone-300 hover:text-stone-900'
            }`}
            title="Click to stamp a signature"
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

        {/* Reflow & Zoom & Export */}
        <div className="flex items-center space-x-2">
          {/* Reflow Button */}
          {onOpenInWriter && (
            <button
              onClick={handleEditInWriter}
              disabled={isExtracting || !pdfDocProxy}
              className="flex items-center space-x-1 px-2.5 py-1 rounded bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-colors font-medium text-[11px]"
              title="Convert PDF text into LocalWriter for full document reflow editing"
            >
              <FileText className="w-3.5 h-3.5 text-blue-500" />
              <span>{isExtracting ? 'Extracting...' : 'Edit in Writer'}</span>
            </button>
          )}

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
          {pdfDocProxy &&
            pages.map((p, idx) => (
              <div
                key={idx}
                onClick={() => setCurrentPage(idx)}
                className={`p-2 rounded-lg cursor-pointer transition-all border text-center ${
                  currentPage === idx
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 font-medium'
                    : 'border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700'
                }`}
              >
                <PdfThumbnail pdfDoc={pdfDocProxy} pageNumber={idx + 1} />
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
            className="bg-white shadow-xl border border-stone-300 dark:border-stone-700 rounded-xs relative overflow-hidden transition-all duration-150 flex items-center justify-center"
          >
            {/* Active tool banner */}
            {activeTool !== 'select' && (
              <div className="absolute top-3 left-3 bg-blue-600/90 text-white px-2.5 py-1 rounded text-xs z-30 shadow-xs pointer-events-none flex items-center space-x-1.5">
                <span>Click anywhere on the document to place {activeTool === 'sign' ? 'signature' : 'text box'}</span>
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

            {/* Interactive Annotations & Direct In-Place Text Editing Overlay */}
            {currentAnnotations.map((annot) => {
              const scale = zoom;
              const displayX = (annot.x / activePageInfo.width) * (activePageInfo.width * scale);
              const displayY = ((activePageInfo.height - annot.y) / activePageInfo.height) * (activePageInfo.height * scale);

              const isEditing = editingId === annot.id;
              const isSelected = selectedId === annot.id;

              return (
                <div
                  key={annot.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedId(annot.id);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingId(annot.id);
                  }}
                  style={{
                    left: `${displayX}px`,
                    top: `${displayY}px`,
                  }}
                  className={`absolute transform -translate-y-full z-20 group transition-all ${
                    isSelected ? 'ring-2 ring-blue-500 rounded-sm' : ''
                  }`}
                >
                  {/* Floating Action Bar when selected or editing */}
                  {(isSelected || isEditing) && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute bottom-full left-0 mb-1 bg-stone-900 text-white rounded shadow-lg px-2 py-1 flex items-center space-x-1.5 text-[11px] whitespace-nowrap z-40"
                    >
                      {/* Font Size buttons */}
                      <div className="flex items-center space-x-1 border-r border-stone-700 pr-1.5">
                        {FONT_SIZES.map((sz) => (
                          <button
                            key={sz}
                            onClick={() => updateAnnotation(annot.id, { size: sz })}
                            className={`px-1 rounded ${
                              (annot.size || 14) === sz ? 'bg-blue-600 font-bold' : 'hover:bg-stone-800 text-stone-300'
                            }`}
                          >
                            {sz}
                          </button>
                        ))}
                      </div>

                      {/* Color circles */}
                      <div className="flex items-center space-x-1 border-r border-stone-700 pr-1.5">
                        {COLOR_PRESETS.map((col) => (
                          <button
                            key={col.name}
                            onClick={() => updateAnnotation(annot.id, { color: { r: col.r, g: col.g, b: col.b } })}
                            style={{ backgroundColor: col.hex }}
                            className="w-3.5 h-3.5 rounded-full border border-white/40 hover:scale-110 transition-transform"
                            title={col.name}
                          />
                        ))}
                      </div>

                      {/* Whiteout / Mask toggle */}
                      <button
                        onClick={() => updateAnnotation(annot.id, { whiteout: !annot.whiteout })}
                        className={`flex items-center space-x-1 px-1.5 py-0.5 rounded transition-colors ${
                          annot.whiteout ? 'bg-amber-600 text-white' : 'hover:bg-stone-800 text-stone-300'
                        }`}
                        title="Fill white background behind text to mask underlying PDF text"
                      >
                        <Square className="w-3 h-3" />
                        <span>Whiteout</span>
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => deleteAnnotation(annot.id)}
                        className="p-1 hover:text-red-400 rounded"
                        title="Delete text box"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>

                      {/* Done Editing */}
                      {isEditing && (
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1 bg-blue-600 hover:bg-blue-500 rounded text-white"
                          title="Finish editing"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Text Content: Inline Editable Input or Styled Display */}
                  {isEditing ? (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        backgroundColor: annot.whiteout ? '#ffffff' : 'rgba(255, 255, 255, 0.95)',
                      }}
                      className="p-1 border border-blue-500 rounded shadow-md"
                    >
                      <input
                        type="text"
                        autoFocus
                        value={annot.text}
                        onChange={(e) => updateAnnotation(annot.id, { text: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') setEditingId(null);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        style={{
                          fontSize: `${(annot.size || 14) * zoom}px`,
                          color: annot.color
                            ? `rgb(${annot.color.r * 255}, ${annot.color.g * 255}, ${annot.color.b * 255})`
                            : '#1c1917',
                        }}
                        className="bg-transparent focus:outline-hidden min-w-[120px] font-sans"
                        placeholder="Type text here..."
                      />
                    </div>
                  ) : (
                    <div
                      style={{
                        fontSize: `${(annot.size || 14) * zoom}px`,
                        color: annot.color
                          ? `rgb(${annot.color.r * 255}, ${annot.color.g * 255}, ${annot.color.b * 255})`
                          : '#1c1917',
                        backgroundColor: annot.whiteout ? '#ffffff' : 'transparent',
                      }}
                      className={`px-1 py-0.5 rounded cursor-pointer ${
                        annot.whiteout ? 'shadow-xs border border-stone-200' : 'hover:bg-blue-50/30'
                      }`}
                    >
                      {annot.text || <span className="text-stone-300 italic">Empty text box</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="h-6 bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 px-4 flex items-center justify-between text-[11px] text-stone-400 select-none">
        <div>
          <span>{annotations.length} annotations placed • Double-click any text box to edit</span>
        </div>
        <div>
          <span>LocalPDF Studio • Mozilla PDF.js Vector Engine</span>
        </div>
      </footer>
    </div>
  );
};
