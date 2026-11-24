import React, { useState, useRef, useCallback } from 'react';
import {
  Book,
  BookStatus,
  UserPreferences,
  ReadingSession,
  ReadingTheme,
} from '../../types';
import {
  saveBook,
  deleteBook,
  updateBookProgress,
  getHighlights,
} from '../../lib/db';
import { parsePdf, createPdfBook } from '../../lib/parsers/pdfParser';
import { parseEpub, createEpubBook } from '../../lib/parsers/epubParser';
import { parseTextOrMarkdown, createTextBook } from '../../lib/parsers/txtParser';
import { parseFb2, createFb2Book } from '../../lib/parsers/fb2Parser';
import { parseMobi, createMobiBook } from '../../lib/parsers/mobiParser';
import { parseCbz, createCbzBook } from '../../lib/parsers/cbzParser';
import { parseRtf, parseHtml, createRtfHtmlBook } from '../../lib/parsers/rtfParser';
import { detectFileType } from '../../lib/parsers/sniffer';
import { getSampleBook } from '../../lib/sampleBook';
import { useToast } from '../ui/Toast';
import { BookCard } from './BookCard';
import { BookListItem } from './BookListItem';
import { BookContextMenu } from './BookContextMenu';
import { ConfirmModal } from '../ui/ConfirmModal';
import { ReadingInsightsModal } from '../insights/ReadingInsightsModal';
import { BlinkingDots } from '../ui/LoadingState';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { InstallAppModal } from '../pwa/InstallAppModal';
import { BOOK_COVER_PALETTES, getBookCoverPalette } from './BookCoverPlaceholder';
import { ImportMenuPopover } from './ImportMenuPopover';
import { PasteTextModal } from './PasteTextModal';
import { ImportUrlModal } from './ImportUrlModal';
import { WikipediaParsedBook } from '../../lib/parsers/wikipediaParser';
import { ThemeSettingsModal } from '../settings/ThemeSettingsModal';
import {
  BookOpen,
  Plus,
  Search,
  LayoutGrid,
  List,
  TrendingUp,
  UploadCloud,
  Moon,
  Sun,
  Palette,
  Download,
  Laptop,
  CheckCircle2,
  ArrowRight,
  ChevronDown,
  FolderOpen,
  ClipboardPaste,
  Globe,
  X,
} from 'lucide-react';

interface LibraryViewProps {
  books: Book[];
  sessions: ReadingSession[];
  preferences: UserPreferences;
  onUpdatePreferences: (updated: Partial<UserPreferences>) => void;
  onOpenBook: (book: Book) => void;
  onRefreshBooks: () => Promise<void>;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  books,
  sessions,
  preferences,
  onUpdatePreferences,
  onOpenBook,
  onRefreshBooks,
}) => {
  const { success, error: toastError, info, warning } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | BookStatus>('all');
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isInstallOpen, setIsInstallOpen] = useState(false);

  // Progressive Web App (PWA) Standalone Installation State
  const pwaState = usePWAInstall();

  // Context Menu State
  const [contextMenuBook, setContextMenuBook] = useState<Book | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);

  // Delete Confirmation Modal State
  const [deleteTargetBook, setDeleteTargetBook] = useState<Book | null>(null);

  // Import Popover & Modals State
  const [isImportMenuOpen, setIsImportMenuOpen] = useState(false);
  const [isPasteTextOpen, setIsPasteTextOpen] = useState(false);
  const [isImportUrlOpen, setIsImportUrlOpen] = useState(false);
  const [isThemeSettingsOpen, setIsThemeSettingsOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Handle direct App Shortcut parameter (e.g. from Windows Taskbar / Mac Dock)
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('shortcut') === 'import') {
      fileInputRef.current?.click();
    }
  }, []);

  // File Ingestion Pipeline supporting all shadow-library formats & magic-byte sniffing
  const ingestFile = async (file: File) => {
    try {
      // Extract arrayBuffer for format detection and metadata parsing
      const parserBuffer = await file.arrayBuffer();
      const detected = detectFileType(parserBuffer, file.name);

      if (!detected) {
        toastError(
          'Unrecognized Format',
          `"${file.name}" could not be recognized. Supported: PDF, EPUB, MOBI, AZW/AZW3, FB2, CBZ, RTF, HTML, TXT, MD.`
        );
        return;
      }

      const id = `book-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      let newBook: Book;

      if (detected === 'pdf') {
        const parsed = await parsePdf(parserBuffer, file.name);
        newBook = createPdfBook(id, file.name, parserBuffer, parsed);
      } else if (detected === 'epub') {
        const parsed = await parseEpub(parserBuffer, file.name);
        newBook = createEpubBook(id, file.name, parserBuffer, parsed);
      } else if (detected === 'fb2') {
        const parsed = await parseFb2(parserBuffer, file.name);
        newBook = createFb2Book(id, file.name, parserBuffer, parsed);
      } else if (detected === 'mobi' || detected === 'azw3') {
        const parsed = parseMobi(parserBuffer, file.name);
        newBook = createMobiBook(id, file.name, parserBuffer, detected, parsed);
      } else if (detected === 'cbz') {
        const parsed = await parseCbz(parserBuffer, file.name);
        newBook = createCbzBook(id, file.name, parserBuffer, parsed);
      } else if (detected === 'rtf') {
        const parsed = parseRtf(parserBuffer, file.name);
        newBook = createRtfHtmlBook(id, file.name, parserBuffer, 'rtf', parsed);
      } else if (detected === 'html') {
        const parsed = parseHtml(parserBuffer, file.name);
        newBook = createRtfHtmlBook(id, file.name, parserBuffer, 'html', parsed);
      } else {
        // txt or md
        const parsed = parseTextOrMarkdown(parserBuffer, file.name, detected as 'txt' | 'md');
        newBook = createTextBook(id, file.name, parserBuffer, detected as 'txt' | 'md', parsed);
      }

      // Persist binary content directly as a native File / Blob in IndexedDB:
      // Native Blobs stream directly to browser storage, use 0 duplicate V8 RAM, and CAN NEVER BE DETACHED!
      await saveBook(newBook, file);
      success('Book Ingested', `"${newBook.title}" (${detected.toUpperCase()}) was saved.`);
      return newBook;
    } catch (err: unknown) {
      console.error('Ingestion failure:', err);
      const msg = err instanceof Error ? err.message : 'Corrupted or protected file.';
      toastError('Ingestion Failed', `Could not parse "${file.name}": ${msg}`);
      return undefined;
    }
  };

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsImporting(true);

    for (let i = 0; i < files.length; i++) {
      await ingestFile(files[i]);
    }

    await onRefreshBooks();
    setIsImporting(false);
  };

  // Folder/Directory Batch Ingest
  const handleFolderSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const supportedExtensions = [
      '.pdf',
      '.epub',
      '.mobi',
      '.azw',
      '.azw3',
      '.fb2',
      '.cbz',
      '.cbr',
      '.rtf',
      '.html',
      '.htm',
      '.txt',
      '.md',
    ];

    const matchingFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const lower = file.name.toLowerCase();
      if (file.name.startsWith('.') || file.name.startsWith('~')) continue;
      if (supportedExtensions.some((ext) => lower.endsWith(ext))) {
        matchingFiles.push(file);
      }
    }

    if (matchingFiles.length === 0) {
      warning(
        'No Books Found',
        'The selected folder does not contain supported book files (PDF, EPUB, MOBI, CBZ, FB2, TXT, MD).'
      );
      return;
    }

    info('Scanning Directory', `Found ${matchingFiles.length} book(s) in folder. Ingesting...`);
    setIsImporting(true);

    let importedCount = 0;
    for (const file of matchingFiles) {
      await ingestFile(file);
      importedCount++;
    }

    await onRefreshBooks();
    setIsImporting(false);
    success('Directory Imported', `Successfully added ${importedCount} book(s) from directory.`);
  };

  // Create Book from Pasted Text / Notes
  const handleSavePastedBook = async (
    title: string,
    author: string,
    content: string,
    format: 'txt' | 'md'
  ) => {
    try {
      const buffer = new TextEncoder().encode(content).buffer;
      const filename = `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}.${format}`;
      const parsed = parseTextOrMarkdown(buffer, filename, format);
      const id = `book-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newBook = createTextBook(id, filename, buffer, format, parsed);
      newBook.title = title;
      newBook.author = author;

      await saveBook(newBook);
      await onRefreshBooks();
      success('Document Created', `"${newBook.title}" is ready in your library.`);
      onOpenBook(newBook);
    } catch (err: unknown) {
      console.error('Failed to create book from pasted text:', err);
      const msg = err instanceof Error ? err.message : 'Could not create document.';
      toastError('Creation Failed', msg);
    }
  };

  // Import Article from Web URL
  const handleSaveWebArticle = async (
    title: string,
    author: string,
    content: string
  ) => {
    try {
      const buffer = new TextEncoder().encode(content).buffer;
      const filename = `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}.md`;
      const parsed = parseTextOrMarkdown(buffer, filename, 'md');
      const id = `book-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newBook = createTextBook(id, filename, buffer, 'md', parsed);
      newBook.title = title;
      newBook.author = author;

      await saveBook(newBook);
      await onRefreshBooks();
      success('Article Imported', `"${newBook.title}" is ready to read.`);
      onOpenBook(newBook);
    } catch (err: unknown) {
      console.error('Failed to save web article:', err);
      const msg = err instanceof Error ? err.message : 'Could not import article.';
      toastError('Import Failed', msg);
    }
  };

  // Import Wikipedia Article with Rich Layout, Chapters, and High-Res Images
  const handleSaveWikipediaBook = async (wikiBook: WikipediaParsedBook) => {
    try {
      const id = `book-wiki-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const bundleData = JSON.stringify({
        folioArticle: true,
        title: wikiBook.title,
        author: wikiBook.author,
        coverDataUrl: wikiBook.coverDataUrl,
        chapters: wikiBook.chapters,
        toc: wikiBook.toc,
        wordCount: wikiBook.wordCount,
      });
      const buffer = new TextEncoder().encode(bundleData).buffer;

      const newBook: Book = {
        id,
        title: wikiBook.title,
        author: wikiBook.author,
        fileType: 'html',
        fileData: buffer,
        fileSize: buffer.byteLength,
        coverDataUrl: wikiBook.coverDataUrl || '',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastReadAt: Date.now(),
        status: 'unread',
        pageCount: Math.max(1, wikiBook.chapters.length),
        currentPage: 1,
        progressPercent: 0,
        wordCount: wikiBook.wordCount,
        estimatedMinutes: Math.max(1, Math.ceil(wikiBook.wordCount / 230)),
        chapters: wikiBook.toc,
      };

      await saveBook(newBook);
      await onRefreshBooks();
      success('Wikipedia Article Imported', `"${newBook.title}" with high-res media is ready to read.`);
      onOpenBook(newBook);
    } catch (err: unknown) {
      console.error('Failed to save Wikipedia article:', err);
      const msg = err instanceof Error ? err.message : 'Could not import Wikipedia article.';
      toastError('Import Failed', msg);
    }
  };

  // Import binary document (PDF, EPUB, CBZ, etc.) from Web URL
  const handleSaveBinaryBook = async (file: File) => {
    setIsImporting(true);
    try {
      const newBook = await ingestFile(file);
      await onRefreshBooks();
      if (newBook) {
        onOpenBook(newBook);
      }
    } finally {
      setIsImporting(false);
    }
  };

  // Drag and Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleFilesSelected(e.dataTransfer.files);
    }
  };

  // Load Built-in Sample Classic
  const handleLoadSample = async () => {
    setIsImporting(true);
    try {
      const sample = getSampleBook();
      await saveBook(sample);
      await onRefreshBooks();
      success('Classic Added to Library', 'Ralph Waldo Emerson\'s "Self-Reliance" loaded.');
    } catch (err) {
      toastError('Could not load sample book');
    } finally {
      setIsImporting(false);
    }
  };

  // Context Menu Actions
  const handleOpenContextMenu = (e: React.MouseEvent, book: Book) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuBook(book);
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  };

  const handleToggleStatus = async (book: Book) => {
    const nextStatus: BookStatus = book.status === 'completed' ? 'unread' : 'completed';
    const nextPct = nextStatus === 'completed' ? 100 : 0;
    const nextCurrentPage = nextStatus === 'completed' ? book.pageCount : 1;

    await updateBookProgress(book.id, {
      status: nextStatus,
      progressPercent: nextPct,
      currentPage: nextCurrentPage,
    });
    await onRefreshBooks();
    info(nextStatus === 'completed' ? 'Marked as Finished' : 'Marked as Unread');
  };

  const handleResetProgress = async (book: Book) => {
    await updateBookProgress(book.id, {
      status: 'unread',
      progressPercent: 0,
      currentPage: 1,
    });
    await onRefreshBooks();
    info('Progress Reset to Page 1');
  };

  const handleExportNotes = async (book: Book) => {
    try {
      const hl = await getHighlights(book.id);
      if (hl.length === 0) {
        warning('No Highlights Found', `"${book.title}" has no saved annotations yet.`);
        return;
      }

      let md = `# ${book.title}\n**Author**: ${book.author}\n\n## Highlights\n\n`;
      hl.forEach((h, idx) => {
        md += `### ${idx + 1}. Page ${h.pageNumber}\n> ${h.text}\n\n`;
        if (h.note) md += `*Note: ${h.note}*\n\n`;
      });

      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${book.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_notes.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      success('Notes Exported', 'Downloaded markdown file.');
    } catch {
      toastError('Export failed');
    }
  };

  const handleDeleteBookConfirmed = async () => {
    if (!deleteTargetBook) return;
    try {
      await deleteBook(deleteTargetBook.id);
      await onRefreshBooks();
      success('Book Removed', `"${deleteTargetBook.title}" removed from local storage.`);
    } catch {
      toastError('Could not delete book');
    } finally {
      setDeleteTargetBook(null);
    }
  };

  // Change Book Cover Background Color to a new random aesthetic palette
  const handleChangeCoverColor = async (book: Book) => {
    const current = getBookCoverPalette(book);
    const available = BOOK_COVER_PALETTES.filter((p) => p.id !== current.id);
    const randomNext = available[Math.floor(Math.random() * available.length)];
    const updated: Book = { ...book, coverColor: randomNext.id };
    try {
      await saveBook(updated);
      await onRefreshBooks();
      success('Cover Palette Updated', `Switched "${book.title}" to ${randomNext.name}.`);
    } catch (err) {
      console.warn('Could not update cover color:', err);
    }
  };

  // Filter books
  const filteredBooks = books.filter((b) => {
    const matchesFilter = activeTab === 'all' || b.status === activeTab;
    const matchesQuery =
      searchQuery === '' ||
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.author.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesQuery;
  });

  // Cycle themes
  const cycleTheme = () => {
    const themeList: ReadingTheme[] = [
      'default',
      'gray',
      'sepia',
      'grass',
      'cherry',
      'sky',
      'solarized',
      'gruvbox',
      'nord',
      'oled',
    ];
    const currentIndex = themeList.indexOf(preferences.theme);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % themeList.length;
    onUpdatePreferences({ theme: themeList[nextIndex], libraryTheme: themeList[nextIndex] });
  };

  const isDark =
    preferences.theme === 'oled' ||
    preferences.themeMode === 'dark' ||
    (preferences.themeMode === 'auto' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
  const activeTheme = preferences.libraryTheme || preferences.theme;

  return (
    <div
      data-theme={activeTheme}
      data-theme-mode={isDark ? 'dark' : 'light'}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`min-h-screen w-full transition-colors duration-300 bg-[var(--bg-primary)] text-[var(--text-primary)] relative flex flex-col ${
        isDark ? 'dark' : ''
      }`}
    >
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        multiple
        accept=".pdf,.epub,.mobi,.azw,.azw3,.fb2,.cbz,.cbr,.rtf,.html,.htm,.txt,.md,*/*"
        onChange={(e) => handleFilesSelected(e.target.files)}
        className="hidden"
      />

      {/* Hidden Folder Directory Input */}
      <input
        type="file"
        ref={folderInputRef}
        {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
        multiple
        onChange={(e) => handleFolderSelected(e.target.files)}
        className="hidden"
      />

      {/* Full-Screen Drag-and-Drop Overlay */}
      {isDraggingOver && (
        <div className="fixed inset-0 z-50 bg-black/40 dark:bg-black/70 backdrop-blur-xl flex flex-col items-center justify-center pointer-events-none border-2 border-dashed border-[#0071E3] m-6 rounded-3xl">
          <div className="w-16 h-16 rounded-full bg-[#0071E3]/20 flex items-center justify-center text-[#0071E3] mb-4">
            <UploadCloud className="w-8 h-8 animate-bounce" />
          </div>
          <h2 className="text-2xl font-semibold text-white tracking-tight">
            Drop to Add to Inkead
          </h2>
          <p className="text-sm text-stone-300 mt-1.5 font-normal">
            Supports PDF, EPUB, MOBI, AZW3, FB2, CBZ, RTF, HTML, and Markdown
          </p>
        </div>
      )}

      {/* Navigation Header */}
      <header className="sticky top-0 z-30 px-6 sm:px-10 py-3.5 border-b border-[var(--border-color)] bg-[var(--bg-primary)]/80 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Logo & Product Identity */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0071E3]/10 dark:bg-[#2997FF]/15 border border-[#0071E3]/25 flex items-center justify-center text-[#0071E3] dark:text-[#2997FF] shadow-xs">
              <BookOpen className="w-4.5 h-4.5" />
            </div>
            <div>
              <span className="font-semibold text-lg tracking-[-0.02em] text-[var(--text-primary)]">
                Inkead
              </span>
            </div>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Minimalist Install App Option */}
            <button
              type="button"
              onClick={() => setIsInstallOpen(true)}
              className={`px-3.5 py-1.5 rounded-full border border-[var(--border-color)] transition flex items-center gap-1.5 text-[13px] font-medium cursor-pointer shadow-2xs ${
                pwaState.isInstalled
                  ? 'bg-[var(--bg-surface)] text-[var(--text-muted)]'
                  : 'bg-[var(--bg-surface)] hover:bg-[var(--bg-card)] text-[var(--text-primary)] hover:border-[#0071E3]/40'
              }`}
              title={
                pwaState.isInstalled
                  ? 'Running in Standalone Window Mode'
                  : 'Install Inkead App for Desktop & Mobile'
              }
            >
              {pwaState.isInstalled ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="hidden xl:inline text-xs">Installed</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-[#0071E3] dark:text-[#2997FF]" />
                  <span className="hidden sm:inline">Install App</span>
                </>
              )}
            </button>

            {/* Insights Pill Button */}
            <button
              type="button"
              onClick={() => setIsInsightsOpen(true)}
              className="px-3.5 py-1.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-surface)] hover:bg-[var(--bg-card)] text-[var(--text-primary)] transition flex items-center gap-2 text-[13px] font-medium cursor-pointer shadow-2xs"
              title="Reading Analytics & Streaks"
            >
              <TrendingUp className="w-3.5 h-3.5 text-[#0071E3] dark:text-[#2997FF]" />
              <span className="hidden md:inline">Insights</span>
            </button>

            {/* Theme Settings Pill Button */}
            <button
              type="button"
              onClick={() => setIsThemeSettingsOpen(true)}
              className="px-3.5 py-1.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-surface)] hover:bg-[var(--bg-card)] text-[var(--text-primary)] transition cursor-pointer shadow-2xs flex items-center gap-1.5 text-[13px] font-medium capitalize"
              title={`Theme: ${activeTheme}`}
            >
              <Palette className="w-3.5 h-3.5 text-[#0071E3] dark:text-[#2997FF]" />
              <span className="hidden lg:inline">{activeTheme}</span>
            </button>

            {/* Import Book Primary Dropdown Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsImportMenuOpen((prev) => !prev)}
                disabled={isImporting}
                className="btn-primary cursor-pointer disabled:opacity-75 flex items-center gap-1.5"
                aria-haspopup="true"
                aria-expanded={isImportMenuOpen}
              >
                {isImporting ? (
                  <>
                    <BlinkingDots size="sm" color="bg-white" className="mr-1" />
                    <span>Importing...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Import Book</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 opacity-70 transition-transform duration-200 ${
                        isImportMenuOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </>
                )}
              </button>

              <ImportMenuPopover
                isOpen={isImportMenuOpen}
                onClose={() => setIsImportMenuOpen(false)}
                onSelectLocalFile={() => fileInputRef.current?.click()}
                onSelectDirectory={() => folderInputRef.current?.click()}
                onSelectPastedText={() => setIsPasteTextOpen(true)}
                onSelectWebBrowser={() => setIsImportUrlOpen(true)}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 sm:px-12 py-8 flex flex-col">
        {/* Sub-Header: Search & Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-8">
          {/* Filter Tabs - Apple Segmented Control */}
          <div className="flex items-center gap-1 p-1 rounded-full bg-[var(--bg-surface)] border border-[var(--border-color)] self-start sm:self-auto overflow-x-auto shadow-2xs">
            {(
              [
                { id: 'all', label: 'All Books' },
                { id: 'reading', label: 'Reading' },
                { id: 'unread', label: 'Unread' },
                { id: 'completed', label: 'Finished' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition cursor-pointer shrink-0 ${
                  activeTab === tab.id
                    ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Bar & View Mode Toggle */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search titles or authors..."
                className="w-full pl-9 pr-4 py-2 text-[13px] font-normal rounded-full bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[#0071E3] dark:focus:ring-[#2997FF] focus:bg-[var(--bg-card)] transition shadow-2xs"
              />
            </div>

            {/* Grid vs List View toggle */}
            <div className="flex items-center p-0.5 rounded-full bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-2xs">
              <button
                type="button"
                onClick={() => onUpdatePreferences({ libraryView: 'grid' })}
                className={`p-1.5 rounded-full transition cursor-pointer ${
                  preferences.libraryView === 'grid'
                    ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
                title="Grid Bookshelf"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onUpdatePreferences({ libraryView: 'list' })}
                className={`p-1.5 rounded-full transition cursor-pointer ${
                  preferences.libraryView === 'list'
                    ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
                title="Editorial List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Empty Library State */}
        {books.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="w-20 h-20 rounded-3xl bg-[#0071E3]/10 dark:bg-[#2997FF]/15 border border-[#0071E3]/20 flex items-center justify-center text-[#0071E3] dark:text-[#2997FF] mb-6 shadow-sm">
              <BookOpen className="w-10 h-10" />
            </div>

            <span className="text-[12px] font-semibold tracking-wider uppercase text-[#0071E3] dark:text-[#2997FF]">
              Your Library
            </span>
            <h2 className="text-3xl sm:text-4xl font-semibold text-[var(--text-primary)] mt-2 tracking-tight">
              Read with calm and clarity.
            </h2>
            <p className="text-[15px] text-[var(--text-muted)] max-w-lg mt-3 leading-relaxed font-normal">
              Drop any PDF, EPUB, MOBI, AZW3, FB2, CBZ, RTF, HTML, TXT, or Markdown book onto this screen to begin reading offline, or load our pre-formatted classic.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={handleLoadSample}
                disabled={isImporting}
                className="btn-primary cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-white/90" />
                <span>Load Emerson's "Self-Reliance"</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn-secondary cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Import from Device</span>
              </button>
            </div>
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="py-20 text-center text-[var(--text-muted)]">
            <Search className="w-8 h-8 mx-auto mb-3 opacity-40 text-[var(--text-muted)]" />
            <p className="text-[15px] font-medium text-[var(--text-primary)]">No books found matching "{searchQuery}"</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveTab('all');
              }}
              className="mt-3 text-[13px] font-medium text-[#0071E3] dark:text-[#2997FF] hover:underline cursor-pointer"
            >
              Clear filters
            </button>
          </div>
        ) : preferences.libraryView === 'grid' ? (
          /* Bookshelf Grid View */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 sm:gap-8 pb-16">
            {filteredBooks.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                onOpen={onOpenBook}
                onContextMenu={handleOpenContextMenu}
              />
            ))}
          </div>
        ) : (
          /* Editorial List View */
          <div className="flex flex-col gap-3 pb-16">
            {filteredBooks.map((book) => (
              <BookListItem
                key={book.id}
                book={book}
                onOpen={onOpenBook}
                onContextMenu={handleOpenContextMenu}
              />
            ))}
          </div>
        )}
      </main>

      {/* Book Context Menu Popover */}
      <BookContextMenu
        isOpen={Boolean(contextMenuBook && contextMenuPos)}
        position={contextMenuPos}
        book={contextMenuBook}
        onClose={() => {
          setContextMenuBook(null);
          setContextMenuPos(null);
        }}
        onToggleStatus={handleToggleStatus}
        onResetProgress={handleResetProgress}
        onExportNotes={handleExportNotes}
        onDelete={(book) => setDeleteTargetBook(book)}
        onChangeCoverColor={handleChangeCoverColor}
      />

      {/* Delete Book Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteTargetBook)}
        title="Remove Book from Library?"
        description={`Are you sure you want to delete "${deleteTargetBook?.title}"? This permanently removes the book file and all associated annotations from your device.`}
        confirmLabel="Delete Permanently"
        cancelLabel="Keep Book"
        isDestructive={true}
        onConfirm={handleDeleteBookConfirmed}
        onClose={() => setDeleteTargetBook(null)}
      />

      {/* Reading Insights Modal */}
      <ReadingInsightsModal
        isOpen={isInsightsOpen}
        onClose={() => setIsInsightsOpen(false)}
        books={books}
        sessions={sessions}
      />

      {/* Progressive Web App (PWA) Install Modal */}
      <InstallAppModal
        isOpen={isInstallOpen}
        onClose={() => setIsInstallOpen(false)}
        pwaState={pwaState}
      />

      {/* Create Document from Pasted Text Modal */}
      <PasteTextModal
        isOpen={isPasteTextOpen}
        onClose={() => setIsPasteTextOpen(false)}
        onSaveBook={handleSavePastedBook}
      />

      {/* Import Web Article / Document from URL Modal */}
      <ImportUrlModal
        isOpen={isImportUrlOpen}
        onClose={() => setIsImportUrlOpen(false)}
        onSaveWebArticle={handleSaveWebArticle}
        onSaveBinaryBook={handleSaveBinaryBook}
        onSaveWikipediaBook={handleSaveWikipediaBook}
      />

      {/* Theme Settings Modal (Library & Reader) */}
      <ThemeSettingsModal
        isOpen={isThemeSettingsOpen}
        onClose={() => setIsThemeSettingsOpen(false)}
        preferences={preferences}
        onUpdatePreferences={onUpdatePreferences}
        initialScope="library"
      />
    </div>
  );
};
