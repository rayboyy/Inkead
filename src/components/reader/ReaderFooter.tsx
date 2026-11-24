import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Book, UserPreferences } from '../../types';
import {
  BookOpen,
  Columns,
  Scroll,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Clock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface ReaderFooterProps {
  book: Book;
  visible: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  preferences: UserPreferences;
  onUpdatePreferences: (updated: Partial<UserPreferences>) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export const ReaderFooter: React.FC<ReaderFooterProps> = ({
  book,
  visible,
  currentPage,
  totalPages,
  onPageChange,
  preferences,
  onUpdatePreferences,
  isFullscreen,
  onToggleFullscreen,
}) => {
  const percent = totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0;

  // Local state for immediate, zero-lag slider response
  const [localPage, setLocalPage] = useState(currentPage);

  useEffect(() => {
    setLocalPage(currentPage);
  }, [currentPage]);

  // Spread mode detection: in spread mode, stepping is by 2
  const isSpread = preferences.pdfViewMode === 'spread' && (book.fileType === 'pdf' || book.fileType === 'cbz');
  const step = isSpread ? 2 : 1;

  const handlePrevPage = () => {
    const target = Math.max(1, currentPage - step);
    setLocalPage(target);
    onPageChange(target);
  };

  const handleNextPage = () => {
    const target = Math.min(totalPages, currentPage + step);
    setLocalPage(target);
    onPageChange(target);
  };

  // Calculate estimated reading time remaining (at ~230 WPM standard reading speed)
  const remainingPages = Math.max(0, totalPages - currentPage);
  const remainingWords = book.wordCount
    ? Math.round(book.wordCount * (1 - currentPage / totalPages))
    : remainingPages * 250;
  const estimatedMinsLeft = Math.ceil(remainingWords / 230);

  const handleZoom = (delta: number) => {
    const current = preferences.pdfZoom;
    const next = Math.max(0.5, Math.min(2.0, Number((current + delta).toFixed(1))));
    onUpdatePreferences({ pdfZoom: next });
  };

  const isVisualDoc = book.fileType === 'pdf' || book.fileType === 'cbz';

  return (
    <motion.footer
      initial={{ opacity: 0, y: 16 }}
      animate={{
        opacity: visible ? 1 : 0,
        y: visible ? 0 : 16,
        pointerEvents: visible ? 'auto' : 'none',
      }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="fixed bottom-0 left-0 right-0 z-40 p-3 sm:p-5 pointer-events-none"
    >
      <div className="w-full max-w-4xl mx-auto h-12 px-3.5 sm:px-4 rounded-full bg-[var(--bg-card)]/90 backdrop-blur-2xl border border-[var(--border-color)] shadow-2xl text-[var(--text-primary)] flex items-center justify-between gap-2.5 sm:gap-4 select-none pointer-events-auto">
        {/* Left: Clean Tabular Page Counter & Remaining Time */}
        <div className="flex items-center gap-2.5 shrink-0 text-xs">
          <div className="flex items-baseline gap-1 font-num font-medium text-[13px] text-[var(--text-primary)] tracking-tight">
            <span>
              {isSpread && currentPage < totalPages ? `${currentPage}–${currentPage + 1}` : currentPage}
            </span>
            <span className="text-[var(--text-muted)] font-normal text-xs">/</span>
            <span className="text-[var(--text-muted)] font-normal">{totalPages}</span>
            <span className="text-[11px] text-[var(--text-muted)] font-normal ml-0.5 opacity-80">
              ({percent}%)
            </span>
          </div>

          <div className="h-3.5 w-px bg-[var(--border-color)] hidden md:block" />

          <div className="hidden md:flex items-center gap-1.5 text-[12px] text-[var(--text-muted)] font-normal">
            <Clock className="w-3.5 h-3.5 opacity-60" />
            <span className="font-num">
              {estimatedMinsLeft <= 1 ? '1m left' : `${estimatedMinsLeft}m left`}
            </span>
          </div>
        </div>

        {/* Center: Fluid Scrubber Slider with Smooth Steppers */}
        <div className="flex-1 max-w-md flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            title={`Previous ${isSpread ? 'Spread' : 'Page'} (←)`}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] active:scale-95 disabled:opacity-20 disabled:pointer-events-none transition cursor-pointer shrink-0"
            aria-label="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <input
            type="range"
            min="1"
            max={Math.max(1, totalPages)}
            value={localPage}
            style={{
              background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${percent}%, var(--border-color) ${percent}%, var(--border-color) 100%)`,
            }}
            onInput={(e) => {
              const val = parseInt((e.target as HTMLInputElement).value, 10);
              setLocalPage(val);
            }}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              setLocalPage(val);
              onPageChange(val);
            }}
            onPointerUp={() => {
              onPageChange(localPage);
            }}
            className="reader-scrubber"
            title={`Jump to Page ${localPage}`}
            aria-label="Book page scrubber"
          />

          <button
            type="button"
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
            title={`Next ${isSpread ? 'Spread' : 'Page'} (→)`}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] active:scale-95 disabled:opacity-20 disabled:pointer-events-none transition cursor-pointer shrink-0"
            aria-label="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Unified Controls (View Modes, Zoom Stepper, Fullscreen) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {isVisualDoc && (
            <>
              {/* Segmented View Mode Control */}
              <div className="flex items-center p-0.5 rounded-full bg-[var(--bg-surface)] border border-[var(--border-color)]/70 relative select-none">
                {[
                  { id: 'single' as const, label: 'Single Page', icon: BookOpen },
                  { id: 'spread' as const, label: 'Two-Page Spread', icon: Columns, hideOnMobile: true },
                  { id: 'scroll' as const, label: 'Continuous Scroll', icon: Scroll },
                ].map((mode) => {
                  const isActive = preferences.pdfViewMode === mode.id;
                  const Icon = mode.icon;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => onUpdatePreferences({ pdfViewMode: mode.id })}
                      title={mode.label}
                      className={`relative p-1.5 rounded-full transition-colors duration-150 cursor-pointer ${
                        mode.hideOnMobile ? 'hidden sm:block' : ''
                      } ${
                        isActive
                          ? 'text-[var(--text-primary)] font-medium'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                      aria-label={mode.label}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeViewModeIndicator"
                          className="absolute inset-0 rounded-full bg-[var(--bg-card)] shadow-xs border border-black/5 dark:border-white/10"
                          transition={{ type: 'spring', stiffness: 500, damping: 36 }}
                        />
                      )}
                      <span className="relative z-10 flex items-center justify-center">
                        <Icon className="w-3.5 h-3.5" />
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Hairline Divider */}
              <div className="h-3.5 w-px bg-[var(--border-color)]" />

              {/* Minimal Zoom Stepper */}
              <div className="flex items-center gap-0.5 text-xs text-[var(--text-muted)]">
                <button
                  type="button"
                  onClick={() => handleZoom(-0.1)}
                  disabled={preferences.pdfZoom <= 0.5}
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] active:scale-95 disabled:opacity-25 disabled:pointer-events-none transition cursor-pointer"
                  title="Zoom Out (−)"
                  aria-label="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => onUpdatePreferences({ pdfZoom: 1.0 })}
                  className="px-1.5 py-0.5 rounded-md font-num font-medium text-xs text-[var(--text-primary)] hover:bg-[var(--bg-surface)] hover:text-[var(--accent)] transition cursor-pointer"
                  title="Click to reset zoom to 100%"
                  aria-label="Reset zoom to 100%"
                >
                  {Math.round(preferences.pdfZoom * 100)}%
                </button>

                <button
                  type="button"
                  onClick={() => handleZoom(0.1)}
                  disabled={preferences.pdfZoom >= 2.0}
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] active:scale-95 disabled:opacity-25 disabled:pointer-events-none transition cursor-pointer"
                  title="Zoom In (+)"
                  aria-label="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Hairline Divider */}
              <div className="h-3.5 w-px bg-[var(--border-color)]" />
            </>
          )}

          {/* Fullscreen Toggle (Available across all document types) */}
          <button
            type="button"
            onClick={onToggleFullscreen}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] active:scale-95 transition cursor-pointer shrink-0"
            title={isFullscreen ? 'Exit Fullscreen (Esc or F)' : 'Enter Fullscreen (F)'}
            aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </motion.footer>
  );
};
