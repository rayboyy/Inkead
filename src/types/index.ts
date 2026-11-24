export type FileType =
  | 'pdf'
  | 'epub'
  | 'mobi'
  | 'azw3'
  | 'fb2'
  | 'cbz'
  | 'rtf'
  | 'html'
  | 'txt'
  | 'md';

export type BookStatus = 'unread' | 'reading' | 'completed';

export interface Book {
  id: string;
  title: string;
  author: string;
  fileType: FileType;
  fileData?: ArrayBuffer;
  fileSize: number;
  coverDataUrl?: string;
  coverColor?: string;
  createdAt: number;
  updatedAt: number;
  lastReadAt: number;
  status: BookStatus;
  pageCount: number;
  currentPage: number;
  progressPercent: number;
  location?: string; // CFI for EPUB, or chapter/scroll marker
  wordCount?: number;
  estimatedMinutes?: number;
  chapters?: TableOfContentsItem[];
}

export type HighlightColor = 'amber' | 'sage' | 'sky' | 'rose';
export type HighlightType = 'text' | 'mark';

export interface MarkPosition {
  x: number; // percentage (0 - 100)
  y: number; // percentage (0 - 100)
}

export interface Highlight {
  id: string;
  bookId: string;
  text: string;
  color: HighlightColor;
  pageNumber: number;
  chapterIndex?: number;
  cfiRange?: string;
  note?: string;
  createdAt: number;
  updatedAt: number;
  type?: HighlightType;
  position?: MarkPosition;
}

export interface ReadingSession {
  id: string;
  bookId: string;
  bookTitle: string;
  startTime: number;
  endTime: number;
  durationMinutes: number;
  pagesRead: number;
  reflection?: string;
  date: string; // YYYY-MM-DD
}

export type ThemePalette =
  | 'default'
  | 'gray'
  | 'sepia'
  | 'grass'
  | 'cherry'
  | 'sky'
  | 'solarized'
  | 'gruvbox'
  | 'nord';

export type ReadingTheme =
  | ThemePalette
  | 'alabaster'
  | 'parchment'
  | 'eink'
  | 'oled';

export type ThemeMode = 'auto' | 'light' | 'dark';
export type ReadingFont = 'literata' | 'newsreader' | 'jakarta' | 'mono';
export type ContentWidth = 'narrow' | 'balanced' | 'wide';
export type TextAlign = 'left' | 'justify';
export type PdfViewMode = 'single' | 'spread' | 'scroll';

export interface SoundscapeState {
  rainVolume: number;
  brownNoiseVolume: number;
  fireVolume: number;
  isMuted: boolean;
}

export interface UserPreferences {
  theme: ReadingTheme;
  themeMode?: ThemeMode;
  libraryTheme?: ReadingTheme;
  readerTheme?: ReadingTheme;
  fontFamily: ReadingFont;
  fontSize: number; // 14 to 28
  lineHeight: number; // 1.4 to 2.0
  contentWidth: ContentWidth;
  textAlign: TextAlign;
  pdfViewMode: PdfViewMode;
  pdfZoom: number; // 0.5 to 2.0, or 1 for 100%
  autoHideUI: boolean;
  soundscape: SoundscapeState;
  focusRulerActive: boolean;
  focusRulerHeight: number;
  chimeMuted: boolean;
  libraryView: 'grid' | 'list';
}

export interface TableOfContentsItem {
  id: string;
  title: string;
  href?: string;
  pageNumber?: number;
  chapterIndex?: number;
  children?: TableOfContentsItem[];
}

export interface ToastMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  duration?: number;
}
