import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as pdfjsLib from 'pdfjs-dist';
import { Book, Highlight, PdfViewMode, HighlightColor, PageFitMode, PdfPaperMode } from '../../types';
import { getBookFile } from '../../lib/db';
import { LoadingScreen } from '../ui/LoadingState';
import { MarkPin } from './MarkPin';
import { PAGE_FLIP_VARIANTS } from '../../lib/pageFlipMotion';

// Guarantee PDF.js always executes off the main thread via dedicated Web Worker
if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

interface PdfViewerProps {
  book: Book;
  currentPage: number;
  viewMode: PdfViewMode;
  zoom: number; // 0.5 to 2.0
  pageFitMode?: PageFitMode;
  paperMode?: PdfPaperMode;
  highlights: Highlight[];
  isDark?: boolean;
  activeTheme?: string;
  onPageChange: (newPage: number) => void;
  onToggleChrome?: () => void;
  onTextSelected: (text: string, rect: DOMRect) => void;
  onHighlightClick: (highlight: Highlight, rect: DOMRect) => void;
  isMarkMode?: boolean;
  onPlaceMarkPosition?: (pos: { x: number; y: number }, pageNum: number) => void;
  onMarkClick?: (mark: Highlight) => void;
  focusedMarkId?: string | null;
}

/**
 * Normalize whitespace for resilient substring matching across PDF text layer spans.
 */
function normalizeText(str: string): string {
  return str.replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * Applies inline highlight classes directly onto matched PDF.js TextLayer spans.
 * Returns IDs of highlights that could not be matched to text spans (e.g. image-only pages).
 */
function applyPdfInlineHighlights(
  textLayerEl: HTMLDivElement,
  textHighlights: Highlight[]
): Set<string> {
  const unmatchedIds = new Set<string>(textHighlights.map((h) => h.id));
  const spans = Array.from(textLayerEl.querySelectorAll('span')) as HTMLSpanElement[];

  // Clear previous highlight classes
  for (const span of spans) {
    span.classList.remove('pdf-hl-amber', 'pdf-hl-sage', 'pdf-hl-sky', 'pdf-hl-rose');
    delete span.dataset.highlightId;
  }

  if (spans.length === 0 || textHighlights.length === 0) {
    return unmatchedIds;
  }

  // Build flat normalized string with span index ranges
  const spanRanges: { span: HTMLSpanElement; start: number; end: number }[] = [];
  let combined = '';

  for (const span of spans) {
    const raw = span.textContent || '';
    const norm = raw.replace(/\s+/g, ' ').toLowerCase();
    if (!norm) continue;

    // Insert a virtual space separator between spans if neither side has whitespace
    if (combined.length > 0 && !combined.endsWith(' ') && !norm.startsWith(' ')) {
      combined += ' ';
    }
    const start = combined.length;
    combined += norm;
    const end = combined.length;
    spanRanges.push({ span, start, end });
  }

  for (const h of textHighlights) {
    const target = normalizeText(h.text);
    if (!target) continue;

    const matchIdx = combined.indexOf(target);
    if (matchIdx === -1) continue;

    const matchEnd = matchIdx + target.length;
    unmatchedIds.delete(h.id);

    for (const range of spanRanges) {
      if (range.end > matchIdx && range.start < matchEnd) {
        range.span.classList.add(`pdf-hl-${h.color}`);
        range.span.dataset.highlightId = h.id;
      }
    }
  }

  return unmatchedIds;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  book,
  currentPage,
  viewMode,
  zoom,
  pageFitMode = 'fit-page',
  paperMode = 'original',
  highlights,
  isDark = false,
  activeTheme = 'default',
  onPageChange,
  onToggleChrome,
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
  const textLayersRef = useRef<Map<number, pdfjsLib.TextLayer>>(new Map());

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

  // Reset scroll cleanly when flipping pages in single/spread mode
  useEffect(() => {
    if (viewMode !== 'scroll') {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [currentPage, viewMode]);

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

  // Edge-click / center-tap navigation (matches Reflowable & CBZ readers)
  const handleContainerClick = (e: React.MouseEvent) => {
    if (isMarkMode) return;
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) return;

    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('a') ||
      target.closest('[data-highlight-id]')
    ) {
      return;
    }

    const width = window.innerWidth;
    const clickX = e.clientX;
    const step = viewMode === 'spread' ? 2 : 1;

    if (clickX < width * 0.14) {
      if (currentPage > 1) onPageChange(Math.max(1, currentPage - step));
    } else if (clickX > width * 0.86) {
      if (currentPage < (book.pageCount || 1)) {
        onPageChange(Math.min(book.pageCount || 1, currentPage + step));
      }
    } else if (!target.closest('.textLayer span')) {
      onToggleChrome?.();
    }
  };

  // Render a specific page onto canvas + official PDF.js TextLayer
  const renderPage = useCallback(
    async (
      pageNum: number,
      canvasEl: HTMLCanvasElement,
      textLayerEl: HTMLDivElement
    ): Promise<boolean> => {
      if (!pdfDoc) return false;

      // Cancel previous render & textLayer tasks for this page if still running
      const existingTask = renderTasksRef.current.get(pageNum);
      if (existingTask) {
        existingTask.cancel();
        renderTasksRef.current.delete(pageNum);
      }
      const existingTextLayer = textLayersRef.current.get(pageNum);
      if (existingTextLayer) {
        existingTextLayer.cancel();
        textLayersRef.current.delete(pageNum);
      }

      try {
        const page = await pdfDoc.getPage(pageNum);
        const containerWidth = containerRef.current?.clientWidth || window.innerWidth || 860;
        const containerHeight = window.innerHeight || 800;

        // Base scale calculation based on pageFitMode (Fit Page, Fit Width, Fit Height, Actual)
        const unscaledViewport = page.getViewport({ scale: 1 });
        const cols = viewMode === 'spread' ? 2 : 1;
        const horizontalPad = viewMode === 'spread' ? 96 : 64;
        const widthScale = (containerWidth - horizontalPad) / (unscaledViewport.width * cols);
        const heightScale = (containerHeight - 150) / unscaledViewport.height;

        let fitScale = widthScale;
        if (pageFitMode === 'fit-page') {
          fitScale = Math.min(widthScale, heightScale);
        } else if (pageFitMode === 'fit-height') {
          fitScale = heightScale;
        } else if (pageFitMode === 'actual') {
          fitScale = 1.35;
        }
        fitScale = Math.max(0.35, Math.min(fitScale, 2.4));

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
        if (!ctx) return false;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Crisp white paper base (theme blending applies cleanly via CSS)
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

        // Official PDF.js TextLayer for exact, native-feeling text selection & highlighting
        textLayerEl.innerHTML = '';
        textLayerEl.style.width = `${viewport.width}px`;
        textLayerEl.style.height = `${viewport.height}px`;
        textLayerEl.style.setProperty('--total-scale-factor', String(viewport.scale));

        const textLayer = new pdfjsLib.TextLayer({
          textContentSource: page.streamTextContent(),
          container: textLayerEl,
          viewport,
        });
        textLayersRef.current.set(pageNum, textLayer);

        await textLayer.render();
        textLayersRef.current.delete(pageNum);
        return true;
      } catch (err: unknown) {
        if (
          err &&
          typeof err === 'object' &&
          'name' in err &&
          (err.name === 'RenderingCancelledException' || err.name === 'AbortException')
        ) {
          return false;
        }
        console.warn(`Render error page ${pageNum}:`, err);
        return false;
      }
    },
    [pdfDoc, viewMode, zoom, pageFitMode]
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

  // Color classes for fallback highlight pills
  const highlightStyles: Record<HighlightColor, string> = {
    amber: 'bg-amber-300/40 border-b-2 border-amber-500',
    sage: 'bg-emerald-300/40 border-b-2 border-emerald-500',
    sky: 'bg-sky-300/40 border-b-2 border-sky-500',
    rose: 'bg-rose-300/40 border-b-2 border-rose-500',
  };

  // Determine theme paper integration style for PDF canvas
  const isTintedLightTheme =
    !isDark && activeTheme !== 'default' && activeTheme !== 'alabaster';

  // Track synchronous page-turn direction for 3D page-flip animation
  const prevPageRef = useRef(currentPage);
  const directionRef = useRef(1);
  if (currentPage !== prevPageRef.current) {
    directionRef.current = currentPage > prevPageRef.current ? 1 : -1;
    prevPageRef.current = currentPage;
  }
  const flipDirection = directionRef.current;
  const pageAnimKey = viewMode === 'scroll' ? `scroll` : `${viewMode}-${currentPage}`;

  return (
    <div
      ref={containerRef}
      onMouseUp={handleMouseUp}
      onClick={handleContainerClick}
      style={{ perspective: '1800px' }}
      className="w-full min-h-full flex flex-col items-center justify-start px-4 sm:px-8 py-20 sm:py-24 select-text relative overflow-x-hidden"
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
        <AnimatePresence mode="popLayout" custom={flipDirection} initial={false}>
          <motion.div
            key={pageAnimKey}
            custom={flipDirection}
            variants={PAGE_FLIP_VARIANTS}
            initial="enter"
            animate="center"
            exit="exit"
            style={{ willChange: 'transform, opacity', transformStyle: 'preserve-3d' }}
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
                paperMode={paperMode}
                isTintedLightTheme={isTintedLightTheme}
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
  ) => Promise<boolean>;
  highlights: Highlight[];
  highlightStyles: Record<HighlightColor, string>;
  onHighlightClick: (h: Highlight, rect: DOMRect) => void;
  isMarkMode?: boolean;
  onPlaceMarkPosition?: (pos: { x: number; y: number }, pageNum: number) => void;
  onMarkClick?: (mark: Highlight) => void;
  focusedMarkId?: string | null;
  paperMode: PdfPaperMode;
  isTintedLightTheme: boolean;
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
  paperMode,
  isTintedLightTheme,
}) => {
  const pageContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const [textReady, setTextReady] = useState(false);
  const [unmatchedHighlightIds, setUnmatchedHighlightIds] = useState<Set<string>>(new Set());

  const markPins = highlights.filter((h) => h.type === 'mark');
  const textHighlights = highlights.filter((h) => h.type !== 'mark');

  useEffect(() => {
    let active = true;
    setTextReady(false);
    if (canvasRef.current && textLayerRef.current) {
      renderPage(pageNum, canvasRef.current, textLayerRef.current).then((ok) => {
        if (active && ok) {
          setTextReady(true);
        }
      });
    }
    return () => {
      active = false;
    };
  }, [pageNum, renderPage]);

  // Apply in-place highlights onto the PDF TextLayer whenever text finishes rendering or highlights change
  useEffect(() => {
    if (!textReady || !textLayerRef.current) return;
    const unmatched = applyPdfInlineHighlights(textLayerRef.current, textHighlights);
    setUnmatchedHighlightIds(unmatched);
  }, [textReady, textHighlights]);

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
      return;
    }

    // Check if user clicked an inline highlighted span (and didn't drag-select text)
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) return;

    const target = e.target as HTMLElement;
    const hlId = target.dataset?.highlightId;
    if (hlId) {
      const matched = textHighlights.find((h) => h.id === hlId);
      if (matched) {
        e.stopPropagation();
        onHighlightClick(matched, target.getBoundingClientRect());
      }
    }
  };

  const fallbackPills = textHighlights.filter((h) => unmatchedHighlightIds.has(h.id));

  const useDarkPaper = paperMode === 'dark';

  // Paper styling stays consistent regardless of Light/Dark UI mode switching
  const canvasThemeClass = useDarkPaper
    ? 'invert-[0.9] hue-rotate-180 contrast-[0.94]'
    : isTintedLightTheme
    ? 'mix-blend-multiply'
    : '';

  return (
    <motion.div
      ref={pageContainerRef}
      onClick={handlePageClick}
      initial={{ opacity: 0.88 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.14, ease: 'easeOut' }}
      style={{
        backgroundColor: useDarkPaper ? '#18191B' : isTintedLightTheme ? 'var(--bg-card)' : '#FFFFFF',
      }}
      className={`relative shadow-xl rounded-2xl overflow-hidden border border-[var(--border-color)] ${
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
      <canvas
        ref={canvasRef}
        className={`block select-none transition-[filter] duration-200 ${canvasThemeClass}`}
      />

      {/* Aligned Official PDF.js Text Layer */}
      <div
        ref={textLayerRef}
        className="textLayer pointer-events-auto select-text"
      />

      {/* Fallback Highlights Pill Bar (only for highlights not matched to text spans) */}
      {fallbackPills.length > 0 && (
        <div className="absolute top-3 right-3 flex flex-col gap-1 z-20 pointer-events-auto">
          {fallbackPills.map((h) => (
            <button
              key={h.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
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

      {/* Subtle Page Number Watermark */}
      <div className="absolute bottom-2 right-3 text-[10px] font-num text-[var(--text-muted)]/60 pointer-events-none select-none z-10">
        {pageNum}
      </div>
    </motion.div>
  );
};
