import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Book, Highlight, UserPreferences, HighlightColor } from '../../types';
import { parseTextOrMarkdown, ReflowableChapter, markdownToHtml } from '../../lib/parsers/txtParser';
import { parseEpub } from '../../lib/parsers/epubParser';
import { parseFb2 } from '../../lib/parsers/fb2Parser';
import { parseMobi } from '../../lib/parsers/mobiParser';
import { parseRtf, parseHtml } from '../../lib/parsers/rtfParser';
import { getBookFile } from '../../lib/db';
import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { LoadingScreen } from '../ui/LoadingState';
import { MarkPin } from './MarkPin';

// In-memory chapter cache across active session so reopening books is instant (0ms)
const parsedChaptersCache = new Map<string, ReflowableChapter[]>();

interface ReflowableReaderProps {
  book: Book;
  currentPage: number;
  preferences: UserPreferences;
  highlights: Highlight[];
  onPageChange: (newPage: number) => void;
  onTextSelected: (text: string, rect: DOMRect) => void;
  onHighlightClick: (highlight: Highlight, rect: DOMRect) => void;
  onToggleChrome?: () => void;
  isMarkMode?: boolean;
  onPlaceMarkPosition?: (pos: { x: number; y: number }) => void;
  onMarkClick?: (mark: Highlight) => void;
  focusedMarkId?: string | null;
}

export const ReflowableReader: React.FC<ReflowableReaderProps> = ({
  book,
  currentPage,
  preferences,
  highlights,
  onPageChange,
  onTextSelected,
  onHighlightClick,
  onToggleChrome,
  isMarkMode = false,
  onPlaceMarkPosition,
  onMarkClick,
  focusedMarkId,
}) => {
  const [chapters, setChapters] = useState<ReflowableChapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Touch swipe handling
  const touchStartXRef = useRef<number | null>(null);

  // Parse book content into chapters - ONCE per book.id with in-memory caching
  useEffect(() => {
    let active = true;

    // Check instant in-memory cache
    if (parsedChaptersCache.has(book.id)) {
      setChapters(parsedChaptersCache.get(book.id)!);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const loadContent = async () => {
      try {
        const fileData = book.fileData || (await getBookFile(book.id));
        if (!fileData) {
          throw new Error('Book binary content could not be located in local storage.');
        }

        let parsedChapters: ReflowableChapter[] = [];

        if (book.fileType === 'epub') {
          const parsed = await parseEpub(fileData, book.title);
          parsedChapters = parsed.chapters;
        } else if (book.fileType === 'fb2') {
          const parsed = await parseFb2(fileData, book.title);
          parsedChapters = parsed.chapters;
        } else if (book.fileType === 'mobi' || book.fileType === 'azw3') {
          const parsed = parseMobi(fileData, book.title);
          parsedChapters = parsed.chapters;
        } else if (book.fileType === 'rtf') {
          const parsed = parseRtf(fileData, book.title);
          parsedChapters = parsed.chapters;
        } else if (book.fileType === 'html') {
          const parsed = parseHtml(fileData, book.title);
          parsedChapters = parsed.chapters;
        } else {
          // txt or md
          const parsed = parseTextOrMarkdown(
            fileData,
            book.title,
            book.fileType as 'txt' | 'md'
          );
          parsedChapters = parsed.chapters;
        }

        if (!active) return;
        parsedChaptersCache.set(book.id, parsedChapters);
        setChapters(parsedChapters);
        setLoading(false);
      } catch (err) {
        if (!active) return;
        console.error('Reflowable content error:', err);
        setError('Could not parse this book format. File may be corrupted or protected.');
        setLoading(false);
      }
    };

    loadContent();
    return () => {
      active = false;
    };
  }, [book.id, book.fileData, book.fileType, book.title]);

  // Current chapter calculation (currentPage is 1-indexed)
  const currentChapterIndex = Math.max(0, Math.min(currentPage - 1, Math.max(0, chapters.length - 1)));
  const currentChapter = chapters[currentChapterIndex];

  // Reset scroll to top instantly on page change without jump or lag
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [currentPage]);

  // Compute rich rendered HTML for current chapter (supports epubs, html, wiki Parsoid, and rich markdown)
  const renderedHtml = useMemo(() => {
    if (!currentChapter) return '';
    const content = currentChapter.content;
    if (
      book.fileType === 'epub' ||
      book.fileType === 'html' ||
      content.includes('<p') ||
      content.includes('<div') ||
      content.includes('<section') ||
      content.includes('<figure') ||
      content.includes('<article')
    ) {
      return content;
    }
    return markdownToHtml(content);
  }, [currentChapter, book.fileType]);

  // Text selection handler
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

  // Touch swipe support
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchEndX - touchStartXRef.current;

    // Minimum swipe threshold 50px
    if (diff > 50 && currentPage > 1) {
      onPageChange(currentPage - 1);
    } else if (diff < -50 && currentPage < chapters.length) {
      onPageChange(currentPage + 1);
    }
    touchStartXRef.current = null;
  };

  // Click zone handler (left edge = prev, right edge = next, center = toggle HUD)
  const handleContainerClick = (e: React.MouseEvent) => {
    // If in Mark mode, suppress edge flips and HUD toggle
    if (isMarkMode) {
      return;
    }

    // If text was selected, do not trigger page turns
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) return;

    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('input')) return;

    const width = window.innerWidth;
    const clickX = e.clientX;

    // Left 18% edge
    if (clickX < width * 0.18) {
      if (currentPage > 1) onPageChange(currentPage - 1);
    }
    // Right 18% edge
    else if (clickX > width * 0.82) {
      if (currentPage < chapters.length) onPageChange(currentPage + 1);
    }
    // Center 64% triggers Zen mode HUD toggle
    else {
      onToggleChrome?.();
    }
  };

  const handleArticleClick = (e: React.MouseEvent) => {
    if (isMarkMode && onPlaceMarkPosition && contentRef.current) {
      e.stopPropagation();
      const rect = contentRef.current.getBoundingClientRect();
      const xPct = Math.max(2, Math.min(98, ((e.clientX - rect.left) / rect.width) * 100));
      const totalHeight = contentRef.current.offsetHeight || rect.height;
      const yPct = Math.max(2, Math.min(98, ((e.clientY - rect.top) / totalHeight) * 100));
      onPlaceMarkPosition({
        x: Number(xPct.toFixed(2)),
        y: Number(yPct.toFixed(2)),
      });
    }
  };

  // Typography font mapping supporting Google Sans, Editorial Serif (Literata), Classic Book (Newsreader) & Monospace
  const FONT_FAMILY_MAP: Record<string, string> = {
    jakarta: "'Google Sans Flex', 'Google Sans', 'Google Sans Text', -apple-system, BlinkMacSystemFont, sans-serif",
    literata: "'Literata', Charter, Georgia, serif",
    newsreader: "'Newsreader', 'Times New Roman', Garamond, serif",
    mono: "'JetBrains Mono', 'Space Grotesk', ui-monospace, monospace",
  };

  const widthClassMap = {
    narrow: 'max-w-[620px]',
    balanced: 'max-w-[760px]',
    wide: 'max-w-[940px]',
  };

  const highlightStyles: Record<HighlightColor, string> = {
    amber: 'bg-amber-300/40 text-stone-900 border-b-2 border-amber-500 rounded-xs px-0.5',
    sage: 'bg-emerald-300/40 text-stone-900 border-b-2 border-emerald-500 rounded-xs px-0.5',
    sky: 'bg-sky-300/40 text-stone-900 border-b-2 border-sky-500 rounded-xs px-0.5',
    rose: 'bg-rose-300/40 text-stone-900 border-b-2 border-rose-500 rounded-xs px-0.5',
  };

  // Highlights for the current chapter
  const currentChapterHighlights = highlights.filter(
    (h) => h.pageNumber === currentPage || h.chapterIndex === currentChapterIndex
  );
  const currentChapterMarks = currentChapterHighlights.filter((h) => h.type === 'mark');

  return (
    <div
      ref={containerRef}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleContainerClick}
      className="w-full min-h-screen flex flex-col items-center justify-start px-4 sm:px-8 py-16 sm:py-24 relative select-text"
    >
      {/* Edge Click Zones (Subtle Visual cues on hover) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (currentPage > 1) onPageChange(currentPage - 1);
        }}
        disabled={currentPage <= 1}
        className={`fixed left-0 top-0 bottom-0 w-16 sm:w-24 z-20 flex items-center justify-start pl-3 opacity-0 hover:opacity-100 transition-opacity cursor-pointer group ${
          currentPage <= 1 ? 'pointer-events-none' : ''
        }`}
        title="Previous Section (Left Arrow)"
      >
        <div className="p-2 rounded-full bg-stone-900/10 dark:bg-white/10 backdrop-blur-md text-stone-600 dark:text-stone-300 group-hover:scale-110 transition-transform shadow-xs">
          <ChevronLeft className="w-5 h-5" />
        </div>
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (currentPage < chapters.length) onPageChange(currentPage + 1);
        }}
        disabled={currentPage >= chapters.length}
        className={`fixed right-0 top-0 bottom-0 w-16 sm:w-24 z-20 flex items-center justify-end pr-3 opacity-0 hover:opacity-100 transition-opacity cursor-pointer group ${
          currentPage >= chapters.length ? 'pointer-events-none' : ''
        }`}
        title="Next Section (Right Arrow)"
      >
        <div className="p-2 rounded-full bg-stone-900/10 dark:bg-white/10 backdrop-blur-md text-stone-600 dark:text-stone-300 group-hover:scale-110 transition-transform shadow-xs">
          <ChevronRight className="w-5 h-5" />
        </div>
      </button>

      {loading && (
        <LoadingScreen
          title="Preparing Typography"
          subtitle="Reflowing chapters and composing layout"
        />
      )}

      {error && (
        <div className="max-w-md p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-[#D92D20] dark:text-[#FF453A] text-center text-xs leading-relaxed mt-12">
          {error}
        </div>
      )}

      {!loading && !error && currentChapter && (
        <motion.article
          key={currentPage}
          ref={contentRef}
          onClick={handleArticleClick}
          initial={{ opacity: 0.88 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.12, ease: 'easeOut' }}
          style={{
            fontFamily: FONT_FAMILY_MAP[preferences.fontFamily] || FONT_FAMILY_MAP.jakarta,
            fontSize: `${preferences.fontSize}px`,
            lineHeight: preferences.lineHeight,
            textAlign: preferences.textAlign,
            position: 'relative',
          }}
          className={`w-full ${widthClassMap[preferences.contentWidth]} select-text relative ${
            isMarkMode ? 'cursor-crosshair' : ''
          }`}
        >
          {/* Mark Pins on Canvas */}
          {currentChapterMarks.map((mark) => (
            <MarkPin
              key={mark.id}
              mark={mark}
              isFocused={focusedMarkId === mark.id}
              onClick={(m) => onMarkClick?.(m)}
            />
          ))}

          {/* Chapter Heading */}
          <header className="mb-8 pb-4 border-b border-[var(--border-color)] select-none">
            <span className="text-xs font-num font-semibold uppercase tracking-widest text-[#0071E3] dark:text-[#2997FF]">
              Section {currentPage} of {chapters.length}
            </span>
            <h1
              style={{ fontFamily: 'inherit' }}
              className="text-2xl sm:text-3xl font-semibold tracking-tight mt-1 text-[var(--text-primary)]"
            >
              {currentChapter.title}
            </h1>
          </header>

          {/* Chapter Content Body with Rich Typography & Rendered Markdown / HTML */}
          <div
            className="prose dark:prose-invert max-w-none reflow-body text-[var(--text-primary)]"
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />

          {/* Margin Notes & Highlights Pill Card on Chapter Bottom */}
          {currentChapterHighlights.length > 0 && (
            <aside className="mt-12 pt-6 border-t border-stone-300 dark:border-stone-800 space-y-2 select-none">
              <span className="text-[11px] uppercase font-bold tracking-wider text-stone-700 dark:text-stone-300">
                Annotations in this Section ({currentChapterHighlights.length})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                {currentChapterHighlights.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={(e) => {
                      if (h.type === 'mark') {
                        onMarkClick?.(h);
                      } else {
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        onHighlightClick(h, rect);
                      }
                    }}
                    className={`p-2.5 rounded-xl text-left border transition hover:scale-101 cursor-pointer flex flex-col gap-1 ${
                      highlightStyles[h.color]
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {h.type === 'mark' && <MapPin className="w-3 h-3 shrink-0 text-[#0071E3] dark:text-[#2997FF]" />}
                      <span className="text-xs italic truncate font-medium">
                        "{h.text}"
                      </span>
                    </div>
                    {h.note && (
                      <span className="text-[11px] font-medium text-stone-800 dark:text-stone-200">
                        ↳ {h.note}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </aside>
          )}

          {/* Chapter End Navigation Link */}
          <div className="mt-16 pt-8 border-t border-stone-300 dark:border-stone-800 flex items-center justify-between text-xs text-stone-700 dark:text-stone-300 font-medium select-none">
            {currentPage > 1 ? (
              <button
                type="button"
                onClick={() => onPageChange(currentPage - 1)}
                className="hover:text-stone-950 dark:hover:text-white transition flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous Section
              </button>
            ) : <span />}

            <span className="font-num font-bold text-xs text-stone-800 dark:text-stone-200">
              {currentPage} / {chapters.length}
            </span>

            {currentPage < chapters.length ? (
              <button
                type="button"
                onClick={() => onPageChange(currentPage + 1)}
                className="hover:text-stone-950 dark:hover:text-white transition flex items-center gap-1 cursor-pointer"
              >
                Next Section
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : <span />}
          </div>
        </motion.article>
      )}
    </div>
  );
};
