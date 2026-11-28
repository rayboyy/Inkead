import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Book, Highlight, ReadingSession, UserPreferences } from '../types';

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'alabaster',
  fontFamily: 'literata',
  fontSize: 18,
  lineHeight: 1.6,
  contentWidth: 'balanced',
  textAlign: 'left',
  pdfViewMode: 'single',
  pdfZoom: 1.0,
  pageFitMode: 'fit-page',
  pdfPaperMode: 'original',
  autoHideUI: true,
  soundscape: {
    rainVolume: 0.4,
    brownNoiseVolume: 0.3,
    fireVolume: 0.35,
    isMuted: true,
  },
  focusRulerActive: false,
  focusRulerHeight: 48,
  chimeMuted: false,
  libraryView: 'grid',
};

interface FolioDB extends DBSchema {
  books: {
    key: string;
    value: Book;
    indexes: {
      'by-status': string;
      'by-last-read': number;
      'by-created': number;
    };
  };
  book_files: {
    key: string;
    value: ArrayBuffer | Blob;
  };
  highlights: {
    key: string;
    value: Highlight;
    indexes: {
      'by-book': string;
      'by-created': number;
    };
  };
  sessions: {
    key: string;
    value: ReadingSession;
    indexes: {
      'by-book': string;
      'by-date': string;
      'by-start': number;
    };
  };
  preferences: {
    key: string;
    value: UserPreferences;
  };
}

const DB_NAME = 'folio_sanctuary_db';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<FolioDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<FolioDB>> {
  if (!dbPromise) {
    dbPromise = openDB<FolioDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Books Metadata Store
        if (!db.objectStoreNames.contains('books')) {
          const bookStore = db.createObjectStore('books', { keyPath: 'id' });
          bookStore.createIndex('by-status', 'status');
          bookStore.createIndex('by-last-read', 'lastReadAt');
          bookStore.createIndex('by-created', 'createdAt');
        }

        // Heavy Binary File Data Store (Isolated from metadata to prevent memory leaks)
        if (!db.objectStoreNames.contains('book_files')) {
          db.createObjectStore('book_files');
        }

        // Highlights Store
        if (!db.objectStoreNames.contains('highlights')) {
          const highlightStore = db.createObjectStore('highlights', { keyPath: 'id' });
          highlightStore.createIndex('by-book', 'bookId');
          highlightStore.createIndex('by-created', 'createdAt');
        }

        // Reading Sessions Store
        if (!db.objectStoreNames.contains('sessions')) {
          const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' });
          sessionStore.createIndex('by-book', 'bookId');
          sessionStore.createIndex('by-date', 'date');
          sessionStore.createIndex('by-start', 'startTime');
        }

        // User Preferences Store
        if (!db.objectStoreNames.contains('preferences')) {
          db.createObjectStore('preferences');
        }
      },
    });
  }
  return dbPromise;
}

// Book Operations
export async function getAllBooks(): Promise<Book[]> {
  const db = await getDB();
  const books = await db.getAll('books');
  // Strip any legacy embedded fileData so library state remains lightweight (<10KB)
  return books
    .map((b) => {
      if (b.fileData) {
        const { fileData: _discard, ...meta } = b;
        return meta as Book;
      }
      return b;
    })
    .sort((a, b) => b.lastReadAt - a.lastReadAt);
}

export async function getBook(id: string): Promise<Book | undefined> {
  const db = await getDB();
  const book = await db.get('books', id);
  if (!book) return undefined;
  if (!book.fileData) {
    const file = await getBookFile(id);
    if (file) book.fileData = file;
  }
  return book;
}

// Retrieve heavy binary ArrayBuffer on demand for active reader ONLY
export async function getBookFile(id: string): Promise<ArrayBuffer | undefined> {
  const db = await getDB();
  try {
    const binary = await db.get('book_files', id);
    if (binary) {
      if (binary instanceof Blob) {
        return await binary.arrayBuffer();
      }
      if (binary instanceof ArrayBuffer) {
        // Guard against detached buffers
        if ((binary as unknown as { detached?: boolean }).detached || binary.byteLength === 0) {
          console.warn('Retrieved detached ArrayBuffer from book_files');
          return undefined;
        }
        return binary;
      }
      return binary as ArrayBuffer;
    }
  } catch (err) {
    console.warn('Error reading from book_files:', err);
  }

  // Backward compatibility migration: check if legacy record has fileData
  try {
    const book = await db.get('books', id);
    if (book && book.fileData) {
      const data = book.fileData;
      // Migrate to book_files
      await db.put('book_files', data, id);
      const { fileData: _omitted, ...cleanMeta } = book;
      await db.put('books', cleanMeta as Book);
      return data;
    }
  } catch {
    // ignore
  }
  return undefined;
}

// Save Book with binary isolation (Supports native non-detachable Blobs & ArrayBuffers)
export async function saveBook(book: Book, rawFileData?: ArrayBuffer | Blob): Promise<string> {
  const db = await getDB();
  const binaryData = rawFileData || book.fileData;

  if (binaryData) {
    try {
      if (binaryData instanceof Blob) {
        // Native Blob: zero V8 heap duplication, streams directly to disk, CANNOT be detached
        await db.put('book_files', binaryData, book.id);
      } else if (binaryData instanceof ArrayBuffer) {
        const isDetached = (binaryData as unknown as { detached?: boolean }).detached || binaryData.byteLength === 0;
        if (isDetached) {
          console.warn('saveBook: skipped detached ArrayBuffer for', book.id);
        } else {
          await db.put('book_files', binaryData, book.id);
        }
      }
    } catch (err) {
      console.warn('Failed to save to book_files store:', err);
    }
  }

  // Save clean metadata to 'books' without keeping heavy ArrayBuffer in metadata store
  const { fileData: _omitted, ...metadata } = book;
  await db.put('books', metadata as Book);
  return book.id;
}

// Update book progress without touching heavy binary store (Instant 1ms operation!)
export async function updateBookProgress(id: string, updates: Partial<Book>): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('books', 'readwrite');
  const existing = await tx.store.get(id);
  if (existing) {
    const { fileData: _omitted, ...cleanExisting } = existing;
    const { fileData: _updatesOmitted, ...cleanUpdates } = updates;
    const updated = {
      ...cleanExisting,
      ...cleanUpdates,
      updatedAt: Date.now(),
    } as Book;
    await tx.store.put(updated);
  }
  await tx.done;
}

export async function deleteBook(id: string): Promise<void> {
  const db = await getDB();
  const storeNames = ['books', 'highlights', 'sessions'] as ('books' | 'highlights' | 'sessions' | 'book_files')[];
  if (db.objectStoreNames.contains('book_files')) {
    storeNames.push('book_files');
  }

  const tx = db.transaction(storeNames, 'readwrite');
  
  // Delete the book metadata and binary blob
  await tx.objectStore('books').delete(id);
  if (db.objectStoreNames.contains('book_files')) {
    await tx.objectStore('book_files').delete(id);
  }
  
  // Delete associated highlights
  const highlightIndex = tx.objectStore('highlights').index('by-book');
  let hCursor = await highlightIndex.openCursor(id);
  while (hCursor) {
    await hCursor.delete();
    hCursor = await hCursor.continue();
  }

  // Delete associated sessions
  const sessionIndex = tx.objectStore('sessions').index('by-book');
  let sCursor = await sessionIndex.openCursor(id);
  while (sCursor) {
    await sCursor.delete();
    sCursor = await sCursor.continue();
  }

  await tx.done;
}

// Highlight Operations
export async function getHighlights(bookId: string): Promise<Highlight[]> {
  const db = await getDB();
  const list = await db.getAllFromIndex('highlights', 'by-book', bookId);
  return list.sort((a, b) => a.pageNumber - b.pageNumber || a.createdAt - b.createdAt);
}

export async function getAllHighlights(): Promise<Highlight[]> {
  const db = await getDB();
  return db.getAll('highlights');
}

export async function saveHighlight(highlight: Highlight): Promise<string> {
  const db = await getDB();
  await db.put('highlights', highlight);
  return highlight.id;
}

export async function updateHighlight(id: string, updates: Partial<Highlight>): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('highlights', 'readwrite');
  const existing = await tx.store.get(id);
  if (existing) {
    await tx.store.put({
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    });
  }
  await tx.done;
}

export async function deleteHighlight(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('highlights', id);
}

// Session Operations
export async function getSessions(bookId?: string): Promise<ReadingSession[]> {
  const db = await getDB();
  if (bookId) {
    const list = await db.getAllFromIndex('sessions', 'by-book', bookId);
    return list.sort((a, b) => b.startTime - a.startTime);
  }
  const all = await db.getAll('sessions');
  return all.sort((a, b) => b.startTime - a.startTime);
}

export async function saveSession(session: ReadingSession): Promise<string> {
  const db = await getDB();
  await db.put('sessions', session);
  return session.id;
}

// Preferences Operations
export async function getPreferences(): Promise<UserPreferences> {
  const db = await getDB();
  const saved = await db.get('preferences', 'user_prefs');
  if (!saved) {
    await db.put('preferences', DEFAULT_PREFERENCES, 'user_prefs');
    return DEFAULT_PREFERENCES;
  }
  return { ...DEFAULT_PREFERENCES, ...saved };
}

export async function savePreferences(prefs: UserPreferences): Promise<void> {
  const db = await getDB();
  await db.put('preferences', prefs, 'user_prefs');
}
