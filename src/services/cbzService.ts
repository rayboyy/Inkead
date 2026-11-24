import { CbzPageItem } from '../workers/cbzWorker';
import { getBookFile } from '../lib/db';

class CbzService {
  private currentBookId: string | null = null;
  private worker: Worker | null = null;
  private pagesCache = new Map<string, CbzPageItem[]>();
  private blobCache = new Map<string, Map<number, string>>();
  private pendingRequests = new Map<number, (url: string | null) => void>();
  private reqIdCounter = 0;
  private initPromise: Promise<CbzPageItem[]> | null = null;

  private getOrCreateWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(new URL('../workers/cbzWorker.ts', import.meta.url), {
        type: 'module',
      });
      this.setupWorkerListener(this.worker);
    }
    return this.worker;
  }

  private setupWorkerListener(worker: Worker) {
    worker.onmessage = (e: MessageEvent) => {
      const data = e.data;
      if (!data) return;

      if (data.type === 'PLATE_READY') {
        const url = URL.createObjectURL(data.blob);
        if (this.currentBookId) {
          let bookBlobs = this.blobCache.get(this.currentBookId);
          if (!bookBlobs) {
            bookBlobs = new Map();
            this.blobCache.set(this.currentBookId, bookBlobs);
          }
          bookBlobs.set(data.pageNum, url);
        }
        const resolve = this.pendingRequests.get(data.id);
        if (resolve) {
          resolve(url);
          this.pendingRequests.delete(data.id);
        }
      } else if (data.type === 'PLATE_PRELOADED') {
        if (this.currentBookId) {
          let bookBlobs = this.blobCache.get(this.currentBookId);
          if (!bookBlobs) {
            bookBlobs = new Map();
            this.blobCache.set(this.currentBookId, bookBlobs);
          }
          if (!bookBlobs.has(data.pageNum)) {
            const url = URL.createObjectURL(data.blob);
            bookBlobs.set(data.pageNum, url);
          }
        }
      } else if (data.type === 'PLATE_ERROR') {
        const resolve = this.pendingRequests.get(data.id);
        if (resolve) {
          resolve(null);
          this.pendingRequests.delete(data.id);
        }
      }
    };

    worker.onerror = (err) => {
      console.warn('CBZ Worker error:', err);
    };
  }

  async init(bookId: string, fileData?: ArrayBuffer): Promise<CbzPageItem[]> {
    // Return cached immediately if already initialized for this book
    const existing = this.pagesCache.get(bookId);
    if (existing && existing.length > 0) {
      this.currentBookId = bookId;
      return existing;
    }

    if (this.initPromise && this.currentBookId === bookId) {
      return this.initPromise;
    }

    this.currentBookId = bookId;
    if (!this.blobCache.has(bookId)) {
      this.blobCache.set(bookId, new Map());
    }

    const worker = this.getOrCreateWorker();

    this.initPromise = new Promise<CbzPageItem[]>(async (resolve, reject) => {
      try {
        let data = fileData;
        if (!data) {
          data = await getBookFile(bookId);
        }
        if (!data) {
          throw new Error('Book file binary not found');
        }

        const handleInit = (e: MessageEvent) => {
          if (e.data?.type === 'INIT_DONE') {
            worker.removeEventListener('message', handleInit);
            const pages = e.data.pages as CbzPageItem[];
            this.pagesCache.set(bookId, pages);
            this.initPromise = null;
            resolve(pages);
          } else if (e.data?.type === 'INIT_ERROR') {
            worker.removeEventListener('message', handleInit);
            this.initPromise = null;
            reject(new Error(e.data.error || 'Failed to initialize CBZ'));
          }
        };

        worker.addEventListener('message', handleInit);
        worker.postMessage({
          type: 'INIT',
          fileData: data.slice(0),
        });
      } catch (err) {
        this.initPromise = null;
        reject(err);
      }
    });

    return this.initPromise;
  }

  getCachedPlateUrl(bookId: string, pageNum: number): string | null {
    return this.blobCache.get(bookId)?.get(pageNum) || null;
  }

  getCachedPages(bookId: string): CbzPageItem[] | null {
    return this.pagesCache.get(bookId) || null;
  }

  async getPlateBlobUrl(bookId: string, pageNum: number): Promise<string | null> {
    const cached = this.getCachedPlateUrl(bookId, pageNum);
    if (cached) return cached;

    const pages = this.pagesCache.get(bookId);
    if (!pages || !this.worker) return null;

    const pageItem = pages[pageNum - 1];
    if (!pageItem) return null;

    const id = ++this.reqIdCounter;
    return new Promise((resolve) => {
      this.pendingRequests.set(id, resolve);
      this.worker?.postMessage({
        type: 'GET_PLATE',
        id,
        pageNum,
        entryName: pageItem.entryName,
      });
    });
  }

  preloadPlates(bookId: string, items: CbzPageItem[]) {
    if (!this.worker || this.currentBookId !== bookId) return;
    this.worker.postMessage({
      type: 'PRELOAD_PLATES',
      items,
    });
  }
}

export const cbzService = new CbzService();
