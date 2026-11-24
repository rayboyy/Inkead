import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Book, UserPreferences } from '../../types';
import { CbzPageItem } from '../../workers/cbzWorker';
import { cbzService } from '../../services/cbzService';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { LoadingScreen, PlateLoadingSkeleton, BlinkingDots } from '../ui/LoadingState';

interface CbzViewerProps {
  book: Book;
  currentPage: number;
  preferences: UserPreferences;
  onPageChange: (newPage: number) => void;
  onToggleChrome?: () => void;
}

export const CbzViewer: React.FC<CbzViewerProps> = ({
  book,
  currentPage,
  preferences,
  onPageChange,
  onToggleChrome,
}) => {
  const [pages, setPages] = useState<CbzPageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Active plate URLs for Single & Spread modes
  const [singlePlateUrl, setSinglePlateUrl] = useState<string | null>(null);
  const [leftPlateUrl, setLeftPlateUrl] = useState<string | null>(null);
  const [rightPlateUrl, setRightPlateUrl] = useState<string | null>(null);

  // Track natural scroll vs programmatic jump in continuous scroll mode
  const lastScrolledPageRef = useRef<number>(currentPage);
  const isProgrammaticScrollRef = useRef(false);

  // 1. Off-thread initialization via dedicated CBZ Service (Web Worker off-main-thread)
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    cbzService
      .init(book.id, book.fileData)
      .then((p) => {
        if (!active) return;
        setPages(p);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.message || 'Failed to open graphic novel archive.');
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [book.id, book.fileData]);

  // Helper to load plate URL via cbzService (cached in memory or worker decompression)
  const getPlateBlobUrl = useCallback(
    (pageNum: number): Promise<string | null> => {
      return cbzService.getPlateBlobUrl(book.id, pageNum);
    },
    [book.id]
  );

  // Background predictive preloading trigger
  const triggerPreload = useCallback(
    (targetPages: number[]) => {
      if (pages.length === 0) return;

      const itemsToPreload = targetPages
        .filter((p) => p >= 1 && p <= pages.length && !cbzService.getCachedPlateUrl(book.id, p))
        .map((p) => pages[p - 1])
        .filter(Boolean);

      if (itemsToPreload.length > 0) {
        cbzService.preloadPlates(book.id, itemsToPreload);
      }
    },
    [book.id, pages]
  );

  // 2. Single Page & Two-Page Spread Synchronous & Async Plate Switcher
  useEffect(() => {
    if (loading || pages.length === 0) return;
    if (preferences.pdfViewMode === 'scroll') return; // In continuous scroll mode

    let active = true;
    const viewMode = preferences.pdfViewMode;

    if (viewMode === 'spread') {
      const leftNum = currentPage;
      const rightNum = currentPage + 1 <= pages.length ? currentPage + 1 : null;

      // 0ms instant display if already in cache
      const cachedLeft = cbzService.getCachedPlateUrl(book.id, leftNum);
      if (cachedLeft) {
        setLeftPlateUrl(cachedLeft);
      } else {
        getPlateBlobUrl(leftNum).then((url) => {
          if (active && url) setLeftPlateUrl(url);
        });
      }

      if (rightNum) {
        const cachedRight = cbzService.getCachedPlateUrl(book.id, rightNum);
        if (cachedRight) {
          setRightPlateUrl(cachedRight);
        } else {
          getPlateBlobUrl(rightNum).then((url) => {
            if (active && url) setRightPlateUrl(url);
          });
        }
      } else {
        setRightPlateUrl(null);
      }

      // Proactively pre-fetch next 2 spreads and previous spread in background
      triggerPreload([
        currentPage + 2,
        currentPage + 3,
        currentPage + 4,
        currentPage + 5,
        currentPage - 1,
        currentPage - 2,
      ]);
    } else {
      // Single Page Mode: 0ms instant display if cached
      const cachedSingle = cbzService.getCachedPlateUrl(book.id, currentPage);
      if (cachedSingle) {
        setSinglePlateUrl(cachedSingle);
      } else {
        getPlateBlobUrl(currentPage).then((url) => {
          if (active && url) setSinglePlateUrl(url);
        });
      }

      // Proactively pre-fetch next 4 pages and previous 2 pages in background
      triggerPreload([
        currentPage + 1,
        currentPage + 2,
        currentPage + 3,
        currentPage + 4,
        currentPage - 1,
        currentPage - 2,
      ]);
    }

    return () => {
      active = false;
    };
  }, [book.id, currentPage, preferences.pdfViewMode, loading, pages, getPlateBlobUrl, triggerPreload]);

  // Continuous Scroll: Plate entering view callback from shared observer
  const handlePlateInView = useCallback(
    (pageNum: number) => {
      if (isProgrammaticScrollRef.current) return;
      lastScrolledPageRef.current = pageNum;
      onPageChange(pageNum);
    },
    [onPageChange]
  );

  // Programmatic scroll to page in Continuous Scroll Mode (Only when NOT caused by manual scrolling!)
  useEffect(() => {
    if (preferences.pdfViewMode !== 'scroll' || pages.length === 0) return;

    // If the currentPage was updated by natural user scrolling, do NOT yank the scroll position!
    if (currentPage === lastScrolledPageRef.current) return;

    lastScrolledPageRef.current = currentPage;
    const targetEl = document.getElementById(`cbz-plate-${currentPage}`);
    if (targetEl) {
      isProgrammaticScrollRef.current = true;
      targetEl.scrollIntoView({ behavior: 'auto', block: 'start' });
      const timer = setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentPage, preferences.pdfViewMode, pages.length]);

  if (loading) {
    return (
      <LoadingScreen
        title="Unpacking Graphic Novel"
        subtitle="Extracting archive plates off-thread"
      />
    );
  }

  if (error) {
    return (
      <div className="max-w-md p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-[#D92D20] dark:text-[#FF453A] text-center text-xs leading-relaxed mt-16">
        {error}
      </div>
    );
  }

  const viewMode = preferences.pdfViewMode;
  const isContinuous = viewMode === 'scroll';
  const isSpread = viewMode === 'spread';
  const zoomScale = preferences.pdfZoom || 1.0;
  const navStep = isSpread ? 2 : 1;

  // Synchronous cache fallbacks for instant 0ms, zero-flash transitions between view modes
  const activeSingleUrl = singlePlateUrl || cbzService.getCachedPlateUrl(book.id, currentPage) || null;
  const activeLeftUrl = leftPlateUrl || cbzService.getCachedPlateUrl(book.id, currentPage) || null;
  const activeRightUrl =
    rightPlateUrl ||
    (currentPage + 1 <= pages.length ? cbzService.getCachedPlateUrl(book.id, currentPage + 1) : null) ||
    null;

  return (
    <div
      ref={containerRef}
      className="w-full min-h-screen flex flex-col items-center justify-start select-none relative"
    >
      {/* Edge Click Zones (Single & Spread Modes) */}
      {!isContinuous && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (currentPage > 1) onPageChange(Math.max(1, currentPage - navStep));
            }}
            disabled={currentPage <= 1}
            className={`fixed left-0 top-0 bottom-0 w-16 sm:w-24 z-20 flex items-center justify-start pl-3 opacity-0 hover:opacity-100 transition-opacity cursor-pointer group ${
              currentPage <= 1 ? 'pointer-events-none' : ''
            }`}
            title={`Previous ${isSpread ? 'Spread' : 'Plate'} (Left Arrow)`}
            aria-label="Previous Page"
          >
            <div className="p-2 rounded-full bg-stone-900/15 dark:bg-white/15 backdrop-blur-md text-stone-700 dark:text-stone-200 group-hover:scale-110 transition-transform shadow-sm">
              <ChevronLeft className="w-5 h-5" />
            </div>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (currentPage < pages.length) onPageChange(Math.min(pages.length, currentPage + navStep));
            }}
            disabled={currentPage >= pages.length}
            className={`fixed right-0 top-0 bottom-0 w-16 sm:w-24 z-20 flex items-center justify-end pr-3 opacity-0 hover:opacity-100 transition-opacity cursor-pointer group ${
              currentPage >= pages.length ? 'pointer-events-none' : ''
            }`}
            title={`Next ${isSpread ? 'Spread' : 'Plate'} (Right Arrow)`}
            aria-label="Next Page"
          >
            <div className="p-2 rounded-full bg-stone-900/15 dark:bg-white/15 backdrop-blur-md text-stone-700 dark:text-stone-200 group-hover:scale-110 transition-transform shadow-sm">
              <ChevronRight className="w-5 h-5" />
            </div>
          </button>
        </>
      )}

      {/* Butter-Smooth Animated View Mode Container */}
      <AnimatePresence mode="wait">
        <motion.div
          key={viewMode}
          initial={{ opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.985 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-full flex flex-col items-center justify-start"
        >
          {/* 1. CONTINUOUS SCROLL MODE */}
          {isContinuous ? (
            <div
              style={{ maxWidth: `${Math.round(52 * zoomScale)}rem` }}
              className="w-full mx-auto px-4 py-16 sm:py-24 flex flex-col items-center gap-6 sm:gap-8 transition-all duration-200"
            >
              {pages.map((p) => (
                <CbzContinuousPlate
                  key={p.pageNum}
                  page={p}
                  getBlobUrl={getPlateBlobUrl}
                  onInView={handlePlateInView}
                  zoomScale={zoomScale}
                />
              ))}
            </div>
          ) : isSpread ? (
            /* 2. TWO-PAGE SPREAD MODE */
            <div
              onClick={onToggleChrome}
              style={{ maxWidth: `${Math.round(84 * zoomScale)}rem` }}
              className="w-full mx-auto min-h-[calc(100vh-140px)] flex flex-row items-center justify-center gap-3 sm:gap-6 px-4 py-16 sm:py-20 cursor-pointer select-none transition-all duration-200"
            >
              {/* Left Plate */}
              <div className="flex-1 flex justify-end items-center">
                {activeLeftUrl ? (
                  <img
                    src={activeLeftUrl}
                    alt={`Plate ${currentPage}`}
                    style={{
                      maxHeight: `${Math.round(85 * zoomScale)}vh`,
                      maxWidth: '100%',
                    }}
                    className="object-contain rounded-xl shadow-2xl ring-1 ring-black/10 transition-all duration-150"
                    loading="eager"
                  />
                ) : (
                  <PlateLoadingSkeleton pageNumber={currentPage} />
                )}
              </div>

              {/* Right Plate (if exists) */}
              {activeRightUrl ? (
                <div className="flex-1 flex justify-start items-center">
                  <img
                    src={activeRightUrl}
                    alt={`Plate ${currentPage + 1}`}
                    style={{
                      maxHeight: `${Math.round(85 * zoomScale)}vh`,
                      maxWidth: '100%',
                    }}
                    className="object-contain rounded-xl shadow-2xl ring-1 ring-black/10 transition-all duration-150"
                    loading="eager"
                  />
                </div>
              ) : (
                currentPage + 1 <= pages.length && (
                  <div className="flex-1 flex justify-start items-center">
                    <PlateLoadingSkeleton pageNumber={currentPage + 1} />
                  </div>
                )
              )}
            </div>
          ) : (
            /* 3. SINGLE PAGE MODE */
            <div
              onClick={onToggleChrome}
              className="w-full min-h-[calc(100vh-140px)] flex items-center justify-center px-4 py-16 sm:py-20 cursor-pointer select-none"
            >
              {activeSingleUrl ? (
                <img
                  src={activeSingleUrl}
                  alt={`Plate ${currentPage}`}
                  style={{
                    maxHeight: `${Math.round(85 * zoomScale)}vh`,
                    maxWidth: `${Math.round(92 * zoomScale)}vw`,
                  }}
                  className="object-contain rounded-xl shadow-2xl ring-1 ring-black/10 transition-all duration-200"
                  loading="eager"
                />
              ) : (
                <div className="w-full max-w-lg mx-auto py-12 flex items-center justify-center">
                  <PlateLoadingSkeleton pageNumber={currentPage} />
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// Subcomponent for continuous scroll mode with lazy observer
interface CbzContinuousPlateProps {
  page: CbzPageItem;
  getBlobUrl: (pageNum: number) => Promise<string | null>;
  onInView: (pageNum: number) => void;
  zoomScale: number;
}

const CbzContinuousPlate: React.FC<CbzContinuousPlateProps> = ({
  page,
  getBlobUrl,
  onInView,
  zoomScale,
}) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const plateRef = useRef<HTMLDivElement>(null);

  // Lazy loading observer with buffer
  useEffect(() => {
    const el = plateRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            getBlobUrl(page.pageNum).then((url) => {
              if (url) setBlobUrl(url);
            });
          }
        });
      },
      { rootMargin: '800px 0px 800px 0px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [page.pageNum, getBlobUrl]);

  // Active page tracking observer (when page is in primary view)
  useEffect(() => {
    const el = plateRef.current;
    if (!el) return;

    const activeObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            onInView(page.pageNum);
          }
        });
      },
      { threshold: 0.5 }
    );

    activeObserver.observe(el);
    return () => activeObserver.disconnect();
  }, [page.pageNum, onInView]);

  return (
    <div
      id={`cbz-plate-${page.pageNum}`}
      ref={plateRef}
      className="flex flex-col items-center justify-center min-h-[480px] w-full"
    >
      {blobUrl ? (
        <img
          src={blobUrl}
          alt={`Plate ${page.pageNum}`}
          className="w-full h-auto object-contain rounded-xl shadow-xl ring-1 ring-black/10 transition-opacity duration-200"
          loading="lazy"
        />
      ) : (
        <PlateLoadingSkeleton pageNumber={page.pageNum} />
      )}
    </div>
  );
};
