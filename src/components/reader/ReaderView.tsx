import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Book,
  Highlight,
  ReadingSession,
  UserPreferences,
  HighlightColor,
} from '../../types';
import {
  getHighlights,
  saveHighlight,
  updateHighlight,
  deleteHighlight,
  saveSession,
  getSessions,
  updateBookProgress,
} from '../../lib/db';
import { useToast } from '../ui/Toast';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ReaderHeader } from './ReaderHeader';
import { ReaderFooter } from './ReaderFooter';
import { PdfViewer } from './PdfViewer';
import { CbzViewer } from './CbzViewer';
import { ReflowableReader } from './ReflowableReader';
import { FloatingSelectionPill } from './FloatingSelectionPill';
import { ExistingHighlightPopover } from './ExistingHighlightPopover';
import { AppearancePopover } from './AppearancePopover';
import { SoundscapesPopover } from '../audio/SoundscapesPopover';
import { TimerSetupPopover } from '../timer/TimerSetupPopover';
import { ReadingSessionCompleteModal } from '../timer/ReadingSessionCompleteModal';
import { TocDrawer } from './TocDrawer';
import { NotebookDrawer } from '../notebook/NotebookDrawer';
import { DictionaryCard } from '../ui/DictionaryCard';
import { FocusRuler } from './FocusRuler';
import { CreateMarkModal } from './CreateMarkModal';

interface ReaderViewProps {
  book: Book;
  preferences: UserPreferences;
  onUpdatePreferences: (updated: Partial<UserPreferences>) => void;
  onBackToLibrary: () => void;
  onUpdateBook: (updated: Book) => void;
  onOpenSpotify?: () => void;
  isSpotifyActive?: boolean;
}

export const ReaderView: React.FC<ReaderViewProps> = ({
  book,
  preferences,
  onUpdatePreferences,
  onBackToLibrary,
  onUpdateBook,
  onOpenSpotify,
  isSpotifyActive = false,
}) => {
  const { success, error: toastError, info } = useToast();

  // Navigation state
  const [currentPage, setCurrentPage] = useState(book.currentPage || 1);
  const totalPages = book.pageCount || 1;

  // Zen Mode HUD Visibility
  const [chromeVisible, setChromeVisible] = useState(true);
  const inactivityTimerRef = useRef<number | null>(null);

  // Modals & Popovers
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [isAppearanceOpen, setIsAppearanceOpen] = useState(false);
  const [isSoundscapesOpen, setIsSoundscapesOpen] = useState(false);
  const [isNotebookOpen, setIsNotebookOpen] = useState(false);
  const [isTimerSetupOpen, setIsTimerSetupOpen] = useState(false);
  const [isSessionCompleteOpen, setIsSessionCompleteOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Highlighting & Dictionary State
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [activeExistingHighlight, setActiveExistingHighlight] = useState<Highlight | null>(null);
  const [existingHighlightRect, setExistingHighlightRect] = useState<DOMRect | null>(null);
  const [dictionaryWord, setDictionaryWord] = useState('');
  const [isDictionaryOpen, setIsDictionaryOpen] = useState(false);

  // Mark & Page Annotation State
  const [isMarkMode, setIsMarkMode] = useState(false);
  const [pendingMarkPosition, setPendingMarkPosition] = useState<{ x: number; y: number } | null>(null);
  const [pendingMarkPage, setPendingMarkPage] = useState<number>(book.currentPage || 1);
  const [isCreateMarkOpen, setIsCreateMarkOpen] = useState(false);
  const [focusedMarkId, setFocusedMarkId] = useState<string | null>(null);
  const [selectedHighlightId, setSelectedHighlightId] = useState<string | null>(null);
  const focusedMarkTimerRef = useRef<number | null>(null);

  // Deep Focus Timer State
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [timerRemaining, setTimerRemaining] = useState(30 * 60);
  const [timerTotal, setTimerTotal] = useState(30 * 60);
  const [timerPaused, setTimerPaused] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);
  const [pagesGainedInSession, setPagesGainedInSession] = useState(0);
  const startPageRef = useRef(currentPage);
  const isExitingRef = useRef(false);
  const saveProgressTimerRef = useRef<number | null>(null);

  // Sessions list for notebook & streaks
  const [bookSessions, setBookSessions] = useState<ReadingSession[]>([]);

  // Safe back navigation preventing background save resurrection
  const handleSafeBackToLibrary = useCallback(() => {
    isExitingRef.current = true;
    if (saveProgressTimerRef.current) {
      clearTimeout(saveProgressTimerRef.current);
    }
    onBackToLibrary();
  }, [onBackToLibrary]);

  useEffect(() => {
    isExitingRef.current = false;
    return () => {
      isExitingRef.current = true;
      if (saveProgressTimerRef.current) {
        clearTimeout(saveProgressTimerRef.current);
      }
    };
  }, []);

  // Load highlights & sessions
  const loadBookData = useCallback(async () => {
    try {
      const hl = await getHighlights(book.id);
      setHighlights(hl);
      const sess = await getSessions(book.id);
      setBookSessions(sess);
    } catch (err) {
      console.warn('Could not load highlights/sessions:', err);
    }
  }, [book.id]);

  useEffect(() => {
    loadBookData();
  }, [loadBookData]);

  // Debounced progress persistence to avoid IDB and main-thread lock during rapid page turns / scrolls
  const handlePageChange = useCallback(
    (newPage: number) => {
      if (isExitingRef.current) return;
      const clamped = Math.max(1, Math.min(totalPages, newPage));
      setCurrentPage(clamped);

      // Track pages gained during session
      if (isTimerActive) {
        const gained = Math.max(0, clamped - startPageRef.current);
        setPagesGainedInSession(gained);
      }

      if (saveProgressTimerRef.current) {
        clearTimeout(saveProgressTimerRef.current);
      }

      saveProgressTimerRef.current = window.setTimeout(async () => {
        if (isExitingRef.current) return;
        const pct = Math.round((clamped / totalPages) * 100);
        const isComplete = clamped >= totalPages;
        const status = isComplete ? 'completed' : 'reading';

        try {
          await updateBookProgress(book.id, {
            currentPage: clamped,
            progressPercent: pct,
            status,
            lastReadAt: Date.now(),
          });
          if (!isExitingRef.current) {
            onUpdateBook({
              ...book,
              currentPage: clamped,
              progressPercent: pct,
              status,
              lastReadAt: Date.now(),
            });
          }
        } catch (err) {
          console.warn('Failed to update progress in DB:', err);
        }
      }, 300);
    },
    [book, totalPages, isTimerActive, onUpdateBook]
  );

  // --- ZEN MODE HUD AUTOHIDE ---
  const resetInactivityTimer = useCallback(() => {
    setChromeVisible(true);
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    // Only auto-hide if preference is on and no modal/popover is currently open
    if (
      preferences.autoHideUI &&
      !isTocOpen &&
      !isAppearanceOpen &&
      !isSoundscapesOpen &&
      !isNotebookOpen &&
      !isTimerSetupOpen &&
      !isSessionCompleteOpen &&
      !isDictionaryOpen &&
      !selectionRect &&
      !activeExistingHighlight
    ) {
      inactivityTimerRef.current = window.setTimeout(() => {
        setChromeVisible(false);
      }, 3000);
    }
  }, [
    preferences.autoHideUI,
    isTocOpen,
    isAppearanceOpen,
    isSoundscapesOpen,
    isNotebookOpen,
    isTimerSetupOpen,
    isSessionCompleteOpen,
    isDictionaryOpen,
    selectionRect,
    activeExistingHighlight,
  ]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Reveal HUD when near top or bottom edges
      if (e.clientY < 80 || e.clientY > window.innerHeight - 80) {
        setChromeVisible(true);
      }
      resetInactivityTimer();
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [resetInactivityTimer]);

  // --- KEYBOARD SHORTCUTS ---
  const isSpreadMode =
    preferences.pdfViewMode === 'spread' &&
    (book.fileType === 'pdf' || book.fileType === 'cbz');
  const navStep = isSpreadMode ? 2 : 1;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA'
      ) {
        return;
      }

      if (e.key === 'ArrowRight' || e.key === 'PageDown' || (e.key === ' ' && !e.shiftKey)) {
        e.preventDefault();
        handlePageChange(Math.min(totalPages, currentPage + navStep));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp' || (e.key === ' ' && e.shiftKey)) {
        e.preventDefault();
        handlePageChange(Math.max(1, currentPage - navStep));
      } else if (e.key === 'Escape') {
        if (isCreateMarkOpen) setIsCreateMarkOpen(false);
        else if (isMarkMode) setIsMarkMode(false);
        else if (isTocOpen) setIsTocOpen(false);
        else if (isAppearanceOpen) setIsAppearanceOpen(false);
        else if (isSoundscapesOpen) setIsSoundscapesOpen(false);
        else if (isNotebookOpen) setIsNotebookOpen(false);
        else if (isTimerSetupOpen) setIsTimerSetupOpen(false);
        else if (isDictionaryOpen) setIsDictionaryOpen(false);
        else if (selectionRect) setSelectionRect(null);
        else if (activeExistingHighlight) setActiveExistingHighlight(null);
        else handleSafeBackToLibrary();
      } else if (e.key === 'f' || e.key === 'F') {
        handleToggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    currentPage,
    totalPages,
    navStep,
    isMarkMode,
    isCreateMarkOpen,
    isTocOpen,
    isAppearanceOpen,
    isSoundscapesOpen,
    isNotebookOpen,
    isTimerSetupOpen,
    isDictionaryOpen,
    selectionRect,
    activeExistingHighlight,
    handlePageChange,
    handleSafeBackToLibrary,
  ]);

  // Fullscreen Toggle
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // --- DEEP FOCUS TIMER TICKER ---
  useEffect(() => {
    if (!isTimerActive || timerPaused) return;

    const interval = window.setInterval(() => {
      setTimerRemaining((prev) => {
        if (prev <= 1) {
          // Timer reached 00:00!
          clearInterval(interval);
          setIsTimerActive(false);
          setIsSessionCompleteOpen(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerActive, timerPaused]);

  // Start Focus Ritual
  const handleStartTimer = (minutes: number, autoHide: boolean) => {
    const totalSecs = minutes * 60;
    setTimerTotal(totalSecs);
    setTimerRemaining(totalSecs);
    setIsTimerActive(true);
    setTimerPaused(false);
    setSessionStartTime(Date.now());
    startPageRef.current = currentPage;
    setPagesGainedInSession(0);

    if (autoHide !== preferences.autoHideUI) {
      onUpdatePreferences({ autoHideUI: autoHide });
    }

    success('Deep Focus Ritual Initiated', `${minutes} minutes of distraction-free reading.`);
  };

  // End Focus Session (early or completed)
  const handleEndTimerEarly = () => {
    setIsTimerActive(false);
    setIsSessionCompleteOpen(true);
  };

  // Session complete handler (save to IndexedDB + reflection)
  const handleCompleteSession = async (reflection: string, returnToLib = false) => {
    const elapsedSeconds = timerTotal - timerRemaining;
    const completedMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
    const todayStr = new Date().toISOString().split('T')[0];

    const sessionRecord: ReadingSession = {
      id: `session-${Date.now()}`,
      bookId: book.id,
      bookTitle: book.title,
      startTime: sessionStartTime || (Date.now() - completedMinutes * 60000),
      endTime: Date.now(),
      durationMinutes: completedMinutes,
      pagesRead: Math.max(1, pagesGainedInSession),
      reflection: reflection.trim() || undefined,
      date: todayStr,
    };

    try {
      await saveSession(sessionRecord);
      await loadBookData();
      success('Reading Session Saved', `${completedMinutes} minutes recorded to your reading logs.`);
    } catch (err) {
      toastError('Could not save session record');
    }

    setIsSessionCompleteOpen(false);
    if (returnToLib) {
      onBackToLibrary();
    }
  };

  // --- HIGHLIGHTING & ANNOTATIONS ---
  const handleTextSelected = (text: string, rect: DOMRect) => {
    setSelectedText(text);
    setSelectionRect(rect);
    setActiveExistingHighlight(null);
  };

  const handleCreateHighlight = async (color: HighlightColor, note?: string) => {
    const newHighlight: Highlight = {
      id: `hl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      bookId: book.id,
      text: selectedText,
      color,
      pageNumber: currentPage,
      note,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    try {
      await saveHighlight(newHighlight);
      setHighlights((prev) => [...prev, newHighlight]);
      success('Highlight Created', note ? 'Quote and margin note saved.' : 'Quote highlighted.');
    } catch {
      toastError('Failed to save highlight');
    }

    setSelectionRect(null);
    setSelectedText('');
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    success('Copied to Clipboard', text.slice(0, 40) + '...');
    setSelectionRect(null);
  };

  const handleDefineWord = (word: string) => {
    setDictionaryWord(word);
    setIsDictionaryOpen(true);
    setSelectionRect(null);
  };

  const handleHighlightClick = (hl: Highlight, rect: DOMRect) => {
    setActiveExistingHighlight(hl);
    setExistingHighlightRect(rect);
    setSelectionRect(null);
  };

  const handleUpdateHighlightColor = async (id: string, color: HighlightColor) => {
    await updateHighlight(id, { color });
    setHighlights((prev) => prev.map((h) => (h.id === id ? { ...h, color } : h)));
  };

  const handleUpdateHighlightNote = async (id: string, note: string) => {
    await updateHighlight(id, { note });
    setHighlights((prev) => prev.map((h) => (h.id === id ? { ...h, note } : h)));
    success('Note Updated');
  };

  const handleDeleteHighlight = async (id: string) => {
    await deleteHighlight(id);
    setHighlights((prev) => prev.filter((h) => h.id !== id));
    setActiveExistingHighlight(null);
    info('Highlight Removed');
  };

  // --- MARK & PAGE ANNOTATIONS HANDLERS ---
  const handleToggleMarkMode = useCallback(() => {
    setIsMarkMode((prev) => !prev);
    setSelectionRect(null);
    setActiveExistingHighlight(null);
  }, []);

  const handlePlaceMarkPosition = useCallback(
    (pos: { x: number; y: number }, pageNum?: number) => {
      setPendingMarkPosition(pos);
      setPendingMarkPage(pageNum || currentPage);
      setIsCreateMarkOpen(true);
    },
    [currentPage]
  );

  const handleSaveMark = useCallback(
    async (data: { color: HighlightColor; note: string; text: string }) => {
      if (!pendingMarkPosition) return;
      const newMark: Highlight = {
        id: `mark-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        bookId: book.id,
        type: 'mark',
        text: data.text,
        note: data.note,
        color: data.color,
        pageNumber: pendingMarkPage,
        position: pendingMarkPosition,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      try {
        await saveHighlight(newMark);
        setHighlights((prev) => [...prev, newMark]);
        success(
          'Mark Placed',
          data.note ? 'Annotation saved on page.' : 'Mark pin placed on page.'
        );
      } catch (err) {
        toastError('Failed to save mark');
      }

      setIsCreateMarkOpen(false);
      setPendingMarkPosition(null);
      setIsMarkMode(false);
    },
    [pendingMarkPosition, pendingMarkPage, book.id, success, toastError]
  );

  const handleMarkPinClick = useCallback((mark: Highlight) => {
    setSelectedHighlightId(mark.id);
    setIsNotebookOpen(true);
  }, []);

  const handleJumpToPageFromNotebook = useCallback(
    (page: number, _chapterIndex?: number, highlightId?: string) => {
      handlePageChange(page);
      setIsNotebookOpen(false);
      if (highlightId) {
        setFocusedMarkId(highlightId);
        if (focusedMarkTimerRef.current) {
          clearTimeout(focusedMarkTimerRef.current);
        }
        focusedMarkTimerRef.current = window.setTimeout(() => {
          setFocusedMarkId(null);
        }, 3500);
      }
    },
    [handlePageChange]
  );

  const isDark =
    preferences.theme === 'oled' ||
    preferences.themeMode === 'dark' ||
    (preferences.themeMode === 'auto' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
  const activeTheme = preferences.readerTheme || preferences.theme;

  return (
    <div
      data-theme={activeTheme}
      data-theme-mode={isDark ? 'dark' : 'light'}
      className={`relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden transition-colors duration-300 bg-[var(--bg-primary)] text-[var(--text-primary)] ${
        isDark ? 'dark' : ''
      }`}
    >
      {/* Focus Line Ruler (Reading Aid) */}
      <FocusRuler
        isActive={preferences.focusRulerActive}
        height={preferences.focusRulerHeight}
      />

      {/* Floating Header HUD */}
      <ReaderHeader
        book={book}
        visible={chromeVisible}
        onBackToLibrary={handleSafeBackToLibrary}
        onOpenToc={() => setIsTocOpen(true)}
        onOpenAppearance={() => setIsAppearanceOpen(true)}
        onOpenSoundscapes={() => setIsSoundscapesOpen(true)}
        onOpenNotebook={() => setIsNotebookOpen(true)}
        onOpenTimerSetup={() => setIsTimerSetupOpen(true)}
        isTimerActive={isTimerActive}
        timerRemaining={timerRemaining}
        timerTotal={timerTotal}
        timerPaused={timerPaused}
        onToggleTimerPause={() => setTimerPaused(!timerPaused)}
        onAddFiveMinutes={() => {
          setTimerRemaining((prev) => prev + 5 * 60);
          setTimerTotal((prev) => prev + 5 * 60);
          info('Added +5 Minutes');
        }}
        onEndTimerEarly={handleEndTimerEarly}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        preferences={preferences}
        highlightsCount={highlights.length}
        isMarkMode={isMarkMode}
        onToggleMarkMode={handleToggleMarkMode}
        onOpenSpotify={onOpenSpotify}
        isSpotifyActive={isSpotifyActive}
      />

      {/* Mark Mode Active Banner */}
      {isMarkMode && (
        <div className="fixed top-18 sm:top-20 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-full bg-[var(--bg-card)]/95 backdrop-blur-xl border border-[var(--border-color)] shadow-xl flex items-center gap-2.5 text-xs text-[var(--text-primary)]">
          <span className="w-2 h-2 rounded-full bg-[#0071E3] animate-ping" />
          <span className="font-semibold text-[#0071E3] dark:text-[#2997FF]">Mark Mode Active</span>
          <span className="text-[var(--text-muted)]">·</span>
          <span>Click anywhere on the page to place an annotation pin</span>
          <button
            type="button"
            onClick={() => setIsMarkMode(false)}
            className="ml-2 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--bg-surface)] hover:bg-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition cursor-pointer"
          >
            Exit (Esc)
          </button>
        </div>
      )}

      {/* Main Canvas: Tri-Mode Engine (PDF, Graphic Novel/CBZ, or Reflowable Text) */}
      <main className="flex-1 w-full flex justify-center items-start">
        {book.fileType === 'pdf' ? (
          <PdfViewer
            book={book}
            currentPage={currentPage}
            viewMode={preferences.pdfViewMode}
            zoom={preferences.pdfZoom}
            highlights={highlights}
            isDark={isDark}
            activeTheme={activeTheme}
            onPageChange={handlePageChange}
            onToggleChrome={() => setChromeVisible(!chromeVisible)}
            onTextSelected={handleTextSelected}
            onHighlightClick={handleHighlightClick}
            isMarkMode={isMarkMode}
            onPlaceMarkPosition={handlePlaceMarkPosition}
            onMarkClick={handleMarkPinClick}
            focusedMarkId={focusedMarkId}
          />
        ) : book.fileType === 'cbz' ? (
          <CbzViewer
            book={book}
            currentPage={currentPage}
            preferences={preferences}
            onPageChange={handlePageChange}
            onToggleChrome={() => setChromeVisible(!chromeVisible)}
          />
        ) : (
          <ReflowableReader
            book={book}
            currentPage={currentPage}
            preferences={preferences}
            highlights={highlights}
            onPageChange={handlePageChange}
            onTextSelected={handleTextSelected}
            onHighlightClick={handleHighlightClick}
            onToggleChrome={() => setChromeVisible(!chromeVisible)}
            isMarkMode={isMarkMode}
            onPlaceMarkPosition={handlePlaceMarkPosition}
            onMarkClick={handleMarkPinClick}
            focusedMarkId={focusedMarkId}
          />
        )}
      </main>

      {/* Floating Canvas Navigation Arrows (Universal for all book files) */}
      <button
        type="button"
        onClick={() => handlePageChange(Math.max(1, currentPage - navStep))}
        disabled={currentPage <= 1}
        title={`Previous ${isSpreadMode ? 'Spread' : 'Page'} (Left Arrow)`}
        aria-label="Previous Page"
        className={`fixed left-3 sm:left-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[var(--bg-card)]/85 hover:bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border-color)] shadow-xl flex items-center justify-center text-[var(--text-primary)] transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ${
          currentPage <= 1
            ? 'opacity-0 pointer-events-none'
            : chromeVisible
            ? 'opacity-100'
            : 'opacity-35 hover:opacity-100'
        }`}
      >
        <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      <button
        type="button"
        onClick={() => handlePageChange(Math.min(totalPages, currentPage + navStep))}
        disabled={currentPage >= totalPages}
        title={`Next ${isSpreadMode ? 'Spread' : 'Page'} (Right Arrow)`}
        aria-label="Next Page"
        className={`fixed right-3 sm:right-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[var(--bg-card)]/85 hover:bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border-color)] shadow-xl flex items-center justify-center text-[var(--text-primary)] transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer ${
          currentPage >= totalPages
            ? 'opacity-0 pointer-events-none'
            : chromeVisible
            ? 'opacity-100'
            : 'opacity-35 hover:opacity-100'
        }`}
      >
        <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      {/* Floating Footer Scrubber */}
      <ReaderFooter
        book={book}
        visible={chromeVisible}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        preferences={preferences}
        onUpdatePreferences={onUpdatePreferences}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
      />

      {/* Floating Selection Pill */}
      <FloatingSelectionPill
        rect={selectionRect}
        selectedText={selectedText}
        onHighlight={handleCreateHighlight}
        onCopy={() => handleCopyText(selectedText)}
        onDefine={handleDefineWord}
        onClose={() => setSelectionRect(null)}
      />

      {/* Existing Highlight Popover */}
      <ExistingHighlightPopover
        highlight={activeExistingHighlight}
        rect={existingHighlightRect}
        onClose={() => setActiveExistingHighlight(null)}
        onUpdateColor={handleUpdateHighlightColor}
        onUpdateNote={handleUpdateHighlightNote}
        onDelete={handleDeleteHighlight}
        onCopy={handleCopyText}
      />

      {/* Appearance Popover */}
      <AppearancePopover
        isOpen={isAppearanceOpen}
        onClose={() => setIsAppearanceOpen(false)}
        preferences={preferences}
        onChange={onUpdatePreferences}
        book={book}
      />

      {/* Procedural Soundscapes Popover */}
      <SoundscapesPopover
        isOpen={isSoundscapesOpen}
        onClose={() => setIsSoundscapesOpen(false)}
        state={preferences.soundscape}
        onChange={(soundscape: UserPreferences['soundscape']) => onUpdatePreferences({ soundscape })}
      />

      {/* Deep Focus Timer Setup Popover */}
      <TimerSetupPopover
        isOpen={isTimerSetupOpen}
        onClose={() => setIsTimerSetupOpen(false)}
        onStart={handleStartTimer}
        autoHideUI={preferences.autoHideUI}
      />

      {/* Reading Session Complete Ritual Modal */}
      <ReadingSessionCompleteModal
        isOpen={isSessionCompleteOpen}
        durationMinutes={Math.max(1, Math.round((timerTotal - timerRemaining) / 60))}
        pagesGained={pagesGainedInSession}
        bookTitle={book.title}
        currentStreak={Math.max(1, new Set(bookSessions.map((s) => s.date)).size)}
        chimeMuted={preferences.chimeMuted}
        onSaveAndContinue={(reflec) => handleCompleteSession(reflec, false)}
        onReturnToLibrary={(reflec) => handleCompleteSession(reflec, true)}
      />

      {/* Table of Contents Drawer */}
      <TocDrawer
        isOpen={isTocOpen}
        onClose={() => setIsTocOpen(false)}
        book={book}
        currentPage={currentPage}
        onSelectChapter={handlePageChange}
      />

      {/* Notebook & Highlights Drawer */}
      <NotebookDrawer
        isOpen={isNotebookOpen}
        onClose={() => {
          setIsNotebookOpen(false);
          setSelectedHighlightId(null);
        }}
        book={book}
        highlights={highlights}
        sessions={bookSessions}
        onJumpToPage={handleJumpToPageFromNotebook}
        onUpdateHighlightNote={handleUpdateHighlightNote}
        onDeleteHighlight={handleDeleteHighlight}
        selectedHighlightId={selectedHighlightId}
      />

      {/* Instant Dictionary Lexicon Card */}
      <DictionaryCard
        word={dictionaryWord}
        isOpen={isDictionaryOpen}
        onClose={() => {
          setIsDictionaryOpen(false);
          setDictionaryWord('');
        }}
      />

      {/* Mark Creation Dialog */}
      {pendingMarkPosition && (
        <CreateMarkModal
          isOpen={isCreateMarkOpen}
          onClose={() => {
            setIsCreateMarkOpen(false);
            setPendingMarkPosition(null);
          }}
          pageNumber={pendingMarkPage}
          position={pendingMarkPosition}
          onSaveMark={handleSaveMark}
        />
      )}
    </div>
  );
};
