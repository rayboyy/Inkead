import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Book, UserPreferences, ReadingSession } from './types';
import {
  getAllBooks,
  getBookFile,
  getPreferences,
  savePreferences,
  getSessions,
  saveBook,
  DEFAULT_PREFERENCES,
} from './lib/db';
import { getSampleBook } from './lib/sampleBook';
import { ToastProvider } from './components/ui/Toast';
import { LibraryView } from './components/library/LibraryView';
import { ReaderView } from './components/reader/ReaderView';
import { LoadingScreen } from './components/ui/LoadingState';
import { SpotifyLofiPopover } from './components/audio/SpotifyLofiPopover';

export const InkeadApp: React.FC = () => {
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [books, setBooks] = useState<Book[]>([]);
  const [sessions, setSessions] = useState<ReadingSession[]>([]);
  const [activeBook, setActiveBook] = useState<Book | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isSpotifyOpen, setIsSpotifyOpen] = useState(false);
  const [isSpotifyActive, setIsSpotifyActive] = useState(false);

  // Initialize DB and Seed Sample Book if Empty
  const loadInitialData = useCallback(async () => {
    try {
      const prefs = await getPreferences();
      setPreferences(prefs);

      let bookList = await getAllBooks();
      // If zero books, seed sample essay for instant delight
      if (bookList.length === 0) {
        const sample = getSampleBook();
        await saveBook(sample);
        bookList = [sample];
      }
      setBooks(bookList);

      const sessList = await getSessions();
      setSessions(sessList);

      // Handle App Shortcut launches (from Windows Taskbar, macOS Dock, or Android Shortcuts)
      const params = new URLSearchParams(window.location.search);
      const shortcut = params.get('shortcut');
      if (shortcut === 'continue' && bookList.length > 0) {
        // Sort by lastReadAt to resume the most recent book
        const recent = [...bookList].sort((a, b) => (b.lastReadAt || 0) - (a.lastReadAt || 0))[0];
        let fileData = recent.fileData;
        if (!fileData) {
          fileData = await getBookFile(recent.id);
        }
        setActiveBook({ ...recent, fileData });
      }
    } catch (err) {
      console.error('Initialization error:', err);
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Apply theme and dark mode class to document element with butter-smooth GPU transitions
  const isInitialThemeMount = useRef(true);

  useEffect(() => {
    const isDark =
      preferences.theme === 'oled' ||
      preferences.themeMode === 'dark' ||
      (preferences.themeMode === 'auto' &&
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);

    const activeTheme = activeBook
      ? (preferences.readerTheme || preferences.theme)
      : (preferences.libraryTheme || preferences.theme);

    const applyTheme = () => {
      document.documentElement.setAttribute('data-theme', activeTheme);
      document.documentElement.setAttribute('data-theme-mode', isDark ? 'dark' : 'light');
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    if (isInitialThemeMount.current) {
      isInitialThemeMount.current = false;
      applyTheme();
      return;
    }

    // Enable temporary smooth transition class on structural layout surfaces
    document.documentElement.classList.add('theme-transition');
    applyTheme();

    const timer = setTimeout(() => {
      document.documentElement.classList.remove('theme-transition');
    }, 260);

    return () => clearTimeout(timer);
  }, [preferences.theme, preferences.themeMode, preferences.libraryTheme, preferences.readerTheme, activeBook]);

  const handleUpdatePreferences = async (updated: Partial<UserPreferences>) => {
    const nextPrefs = { ...preferences, ...updated };
    setPreferences(nextPrefs);
    try {
      await savePreferences(nextPrefs);
    } catch (err) {
      console.warn('Failed to save preferences:', err);
    }
  };

  const handleRefreshBooks = async () => {
    const bookList = await getAllBooks();
    setBooks(bookList);
    const sessList = await getSessions();
    setSessions(sessList);
  };

  const handleOpenBook = async (book: Book) => {
    let fileData = book.fileData;
    if (!fileData) {
      fileData = await getBookFile(book.id);
    }
    setActiveBook({ ...book, fileData });
  };

  const handleBackToLibrary = async () => {
    setActiveBook(null);
    await handleRefreshBooks();
  };

  const handleUpdateBook = (updated: Book) => {
    // Only update activeBook if the user is currently inside that exact book
    setActiveBook((current) => (current && current.id === updated.id ? updated : null));
    setBooks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
  };

  if (initialLoading) {
    return (
      <div
        data-theme={preferences.theme}
        className="min-h-screen w-full flex flex-col items-center justify-center bg-[var(--bg-primary)] text-[var(--text-primary)]"
      >
        <LoadingScreen fullScreen title="Entering Inkead" subtitle="Restoring your personal reading sanctuary" />
      </div>
    );
  }

  const handleToggleSpotify = () => {
    setIsSpotifyOpen((prev) => !prev);
    if (!isSpotifyActive) {
      setIsSpotifyActive(true);
    }
  };

  return (
    <div className="w-full min-h-screen">
      {activeBook ? (
        <ReaderView
          book={activeBook}
          preferences={preferences}
          onUpdatePreferences={handleUpdatePreferences}
          onBackToLibrary={handleBackToLibrary}
          onUpdateBook={handleUpdateBook}
          onOpenSpotify={handleToggleSpotify}
          isSpotifyActive={isSpotifyActive}
        />
      ) : (
        <LibraryView
          books={books}
          sessions={sessions}
          preferences={preferences}
          onUpdatePreferences={handleUpdatePreferences}
          onOpenBook={handleOpenBook}
          onRefreshBooks={handleRefreshBooks}
          onOpenSpotify={handleToggleSpotify}
          isSpotifyActive={isSpotifyActive}
        />
      )}

      {/* Persistent Spotify Lofi Radio (stays mounted so music plays in background) */}
      <SpotifyLofiPopover
        isOpen={isSpotifyOpen}
        isActive={isSpotifyActive}
        onActivate={() => setIsSpotifyActive(true)}
        onDeactivate={() => setIsSpotifyActive(false)}
        onClose={() => setIsSpotifyOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <InkeadApp />
    </ToastProvider>
  );
}
