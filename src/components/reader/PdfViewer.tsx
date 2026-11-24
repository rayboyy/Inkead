import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as pdfjsLib from 'pdfjs-dist';
import { Book, Highlight, PdfViewMode, HighlightColor } from '../../types';
import { getBookFile } from '../../lib/db';
import { LoadingScreen } from '../ui/LoadingState';
import { MarkPin } from './MarkPin';

// Guarantee PDF.js always executes off the main thread via dedicated Web Worker
if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

interface PdfViewerProps {
  book: Book;
  currentPage: number;
  viewMode: PdfViewMode;
  zoom: number; // 0.5 to 2.0
  highlights: Highlight[];
  onPageChange: (newPage: number) => void;
  onTextSelected: (text: string, rect: DOMRect) => void;
  onHighlightClick: (highlight: Highlight, rect: DOMRect) => void;
  isMarkMode?: boolean;
  onPlaceMarkPosition?: (pos: { x: number; y: number }, pageNum: number) => void;
  onMarkClick?: (mark: Highlight) => void;
  focusedMarkId?: string | null;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  book,
  currentPage,
  viewMode,
  zoom,
  highlights,
  onPageChange,
  onTextSelected,
  onHighlightClick,
  isMarkMode = false,
  onPlaceMarkPosition,
  onMarkClick,
  focusedMarkId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active rendering tasks to cancel if user jumps quickly
  const renderTasksRef = useRef<Map<number, pdfjsLib.RenderTask>>(new Map());

  // Load PDF Document
  useEffect(() => {
    let active = true;
    let loadingTask: pdfjsLib.PDFDocumentLoadingTask | null = null;
    setLoading(true);
    setError(null);

    const initPdf = async () => {
      try {
        const fileData = book.fileData || (await getBookFile(book.id));
        if (!active) return;
        if (!fileData) {
          setError('Could not locate PDF binary content in local storage.');
          setLoading(false);
          return;
        }

        loadingTask = pdfjsLib.getDocument({
          data: new Uint8Array(fileData.slice(0)),
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/cmaps/',
          cMapPacked: true,
        });

        const pdf = await loadingTask.promise;
        if (!active) return;
        setPdfDoc(pdf);
        setLoading(false);
      } catch (err) {
        if (!active) return;
        console.error('Failed to load PDF doc:', err);
        setError('Failed to render PDF. The file may be password protected or corrupted.');
        setLoading(false);
      }
    };

    initPdf();

    return () => {
      active = false;
      if (loadingTask) {
        loadingTask.destroy();
      }
    };
  }, [book.id, book.fileData]);

  // Text selection listener on container
  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const selectedText = selection.toString().trim();
    if (selectedText.length === 0) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      onTextSelected(selectedText, rect);
    }
  }, [onTextSelected]);

  // Render a specific page onto canvas + text layer
  const renderPage = useCallback(
    async (
      pageNum: number,
      canvasEl: HTMLCanvasElement,
      textLayerEl: HTMLDivElement
    ) => {
      if (!pdfDoc) return;

      // Cancel previous task for this page if still rendering
      const existingTask = renderTasksRef.current.get(pageNum);
      if (existingTask) {
        existingTask.cancel();
        renderTasksRef.current.delete(pageNum);
      }

      try {
        const page = await pdfDoc.getPage(pageNum);
        const containerWidth = containerRef.current?.clientWidth || 800;

        // Base scale calculation
        const unscaledViewport = page.getViewport({ scale: 1 });
        let fitScale = (containerWidth - 64) / unscaledViewport.width;
        if (viewMode === 'spread') {
          fitScale = (containerWidth - 96) / (unscaledViewport.width * 2);
        }
        fitScale = Math.min(fitScale, 1.8);

        const actualScale = fitScale * zoom;
        const dpr = window.devicePixelRatio || 1;

        const viewport = page.getViewport({ scale: actualScale });

        // Set display dimensions
        canvasEl.style.width = `${viewport.width}px`;
        canvasEl.style.height = `${viewport.height}px`;

        // High DPI canvas buffer
        canvasEl.width = Math.floor(viewport.width * dpr);
        canvasEl.height = Math.floor(viewport.height * dpr);

        const ctx = canvasEl.getContext('2d');
        if (!ctx) return;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // White paper background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, viewport.width, viewport.height);

        const renderContext = {
          canvasContext: ctx,
          viewport,
        };

        // @ts-expect-error PDF.js render options
        const renderTask = page.render(renderContext);
        renderTasksRef.current.set(pageNum, renderTask);

        await renderTask.promise;
        renderTasksRef.current.delete(pageNum);

        // Render Text Layer for natural selection and highlighting
        textLayerEl.innerHTML = '';
        textLayerEl.style.width = `${viewport.width}px`;
        textLayerEl.style.height = `${viewport.height}px`;

        const textContent = await page.getTextContent();
        
        // Manual simple high-performance text layer mapping
        // We create invisible, perfectly aligned spans matching viewport
        textContent.items.forEach((item) => {
          if ('str' in item && item.str.length > 0) {
            const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
            const span = document.createElement('span');
            span.textContent = item.str;
            span.style.position = 'absolute';
            span.style.left = `${tx[4]}px`;
            span.style.top = `${tx[5] - item.height * actualScale}px`;
            span.style.fontSize = `${item.height * actualScale}px`;
            span.style.fontFamily = 'sans-serif';
            span.style.color = 'transparent';
            span.style.transformOrigin = 'left top';
            span.style.whiteSpace = 'pre';
            span.style.pointerEvents = 'auto';
            span.className = 'pdf-text-char select-text';
            textLayerEl.appendChild(span);
          }
        });
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'name' in err && err.name === 'RenderingCancelledException') {
          // Normal task cancellation when turning pages quickly
          return;
        }
        console.warn(`Render error page ${pageNum}:`, err);
      }
    },
    [pdfDoc, viewMode, zoom]
  );

  // Compute pages to display based on mode
  const pagesToDisplay: number[] = [];
  if (viewMode === 'single') {
    pagesToDisplay.push(currentPage);
  } else if (viewMode === 'spread') {
    pagesToDisplay.push(currentPage);
    if (currentPage + 1 <= (book.pageCount || 1)) {
      pagesToDisplay.push(currentPage + 1);
    }
  } else {
    // Continuous scroll: display current and adjacent pages for smooth memory usage
    const start = Math.max(1, currentPage - 1);
    const end = Math.min(book.pageCount, currentPage + 2);
    for (let p = start; p <= end; p++) {
      pagesToDisplay.push(p);
    }
  }

  // Color classes for highlights
  const highlightStyles: Record<HighlightColor, string> = {
    amber: 'bg-amber-300/40 border-b-2 border-amber-500',
    sage: 'bg-emerald-300/40 border-b-2 border-emerald-500',
    sky: 'bg-sky-300/40 border-b-2 border-sky-500',
    rose: 'bg-rose-300/40 border-b-2 border-rose-500',
  };

  return (
    <div
      ref={containerRef}
      onMouseUp={handleMouseUp}
      className="w-full min-h-full flex flex-col items-center justify-center p-4 sm:p-8 select-text"
    >
      {loading && (
        <LoadingScreen
          title="Rendering Pages"
          subtitle="Preparing high-fidelity vectorized canvas"
        />
      )}

      {error && (
        <div className="max-w-md p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-[#D92D20] dark:text-[#FF453A] text-center text-xs leading-relaxed">
          {error}
        </div>
      )}

      {!loading && !error && (
        <AnimatePresence mode="wait">
          <motion.div
            key={viewMode}
            initial={{ opacity: 0, scale: 0.985 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.985 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={`flex ${
              viewMode === 'spread' ? 'flex-row items-start' : 'flex-col items-center'
            } gap-6 justify-center`}
          >
            {pagesToDisplay.map((pageNum) => (
              <SinglePdfPage
                key={pageNum}
                pageNum={pageNum}
                renderPage={renderPage}
                highlights={highlights.filter((h) => h.pageNumber === pageNum)}
                highlightStyles={highlightStyles}
                onHighlightClick={onHighlightClick}
                isMarkMode={isMarkMode}
                onPlaceMarkPosition={onPlaceMarkPosition}
                onMarkClick={onMarkClick}
                focusedMarkId={focusedMarkId}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
};

interface SinglePdfPageProps {
  pageNum: number;
  renderPage: (
    pageNum: number,
    canvas: HTMLCanvasElement,
    textLayer: HTMLDivElement
  ) => Promise<void>;
  highlights: Highlight[];
  highlightStyles: Record<HighlightColor, string>;
  onHighlightClick: (h: Highlight, rect: DOMRect) => void;
  isMarkMode?: boolean;
  onPlaceMarkPosition?: (pos: { x: number; y: number }, pageNum: number) => void;
  onMarkClick?: (mark: Highlight) => void;
  focusedMarkId?: string | null;
}

const SinglePdfPage: React.FC<SinglePdfPageProps> = ({
  pageNum,
  renderPage,
  highlights,
  highlightStyles,
  onHighlightClick,
  isMarkMode,
  onPlaceMarkPosition,
  onMarkClick,
  focusedMarkId,
}) => {
  const pageContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (canvasRef.current && textLayerRef.current) {
      renderPage(pageNum, canvasRef.current, textLayerRef.current);
    }
  }, [pageNum, renderPage]);

  const handlePageClick = (e: React.MouseEvent) => {
    if (isMarkMode && onPlaceMarkPosition && pageContainerRef.current) {
      e.stopPropagation();
      const rect = pageContainerRef.current.getBoundingClientRect();
      const xPct = Math.max(2, Math.min(98, ((e.clientX - rect.left) / rect.width) * 100));
      const yPct = Math.max(2, Math.min(98, ((e.clientY - rect.top) / rect.height) * 100));
      onPlaceMarkPosition(
        {
          x: Number(xPct.toFixed(2)),
          y: Number(yPct.toFixed(2)),
        },
        pageNum
      );
    }
  };

  const markPins = highlights.filter((h) => h.type === 'mark');
  const textHighlights = highlights.filter((h) => h.type !== 'mark');

  return (
    <div
      ref={pageContainerRef}
      onClick={handlePageClick}
      className={`relative shadow-2xl rounded-sm overflow-hidden bg-white ring-1 ring-black/5 ${
        isMarkMode ? 'cursor-crosshair' : ''
      }`}
    >
      {/* Mark Pins Layer */}
      {markPins.map((m) => (
        <MarkPin
          key={m.id}
          mark={m}
          isFocused={focusedMarkId === m.id}
          onClick={(mark) => onMarkClick?.(mark)}
        />
      ))}

      {/* Canvas Layer */}
      <canvas ref={canvasRef} className="block select-none" />

      {/* Aligned Text Layer */}
      <div
        ref={textLayerRef}
        className="absolute inset-0 pointer-events-auto leading-none overflow-hidden select-text textLayer"
        style={{ opacity: 1 }}
      />

      {/* Persistent Highlights Pill Bar on Page Bottom */}
      {textHighlights.length > 0 && (
        <div className="absolute top-2 right-2 flex flex-col gap-1 z-20 pointer-events-auto">
          {textHighlights.map((h) => (
            <button
              key={h.id}
              type="button"
              onClick={(e) => {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                onHighlightClick(h, rect);
              }}
              className={`px-2 py-0.5 rounded-md text-[10px] font-sans font-medium shadow-xs transition hover:scale-105 cursor-pointer max-w-[140px] truncate ${
                highlightStyles[h.color]
              }`}
              title={h.note ? `${h.text} — Note: ${h.note}` : h.text}
            >
              "{h.text.slice(0, 20)}..."
            </button>
          ))}
        </div>
      )}

      {/* Page Number Watermark */}
      <div className="absolute bottom-1 right-2 text-[9px] font-mono text-stone-300 pointer-events-none select-none">
        {pageNum}
      </div>
    </div>
  );
};
