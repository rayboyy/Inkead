import JSZip from 'jszip';

export interface CbzPageItem {
  pageNum: number;
  entryName: string;
}

interface InitMessage {
  type: 'INIT';
  fileData: ArrayBuffer;
}

interface RequestPlateMessage {
  type: 'GET_PLATE';
  id: number;
  pageNum: number;
  entryName: string;
}

interface PreloadPlatesMessage {
  type: 'PRELOAD_PLATES';
  items: CbzPageItem[];
}

type WorkerMessage = InitMessage | RequestPlateMessage | PreloadPlatesMessage;

let zipInstance: JSZip | null = null;
const plateCache = new Map<number, Uint8Array>();
let isPreloading = false;
let pendingPreload: CbzPageItem[] = [];

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const data = e.data;
  if (!data) return;

  if (data.type === 'INIT') {
    try {
      const zip = await JSZip.loadAsync(data.fileData);
      zipInstance = zip;

      const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'];
      const imageEntries = Object.values(zip.files).filter(
        (f) =>
          !f.dir &&
          !f.name.startsWith('__MACOSX/') &&
          !f.name.includes('/._') &&
          !f.name.startsWith('._') &&
          imageExtensions.some((ext) => f.name.toLowerCase().endsWith(ext))
      );

      imageEntries.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
      );

      if (imageEntries.length === 0) {
        throw new Error('No readable plates or illustrations found in this archive.');
      }

      const pages: CbzPageItem[] = imageEntries.map((entry, idx) => ({
        pageNum: idx + 1,
        entryName: entry.name,
      }));

      self.postMessage({ type: 'INIT_DONE', pages });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to parse CBZ archive';
      self.postMessage({ type: 'INIT_ERROR', error: msg });
    }
  } else if (data.type === 'GET_PLATE') {
    if (!zipInstance) {
      self.postMessage({
        type: 'PLATE_ERROR',
        id: data.id,
        pageNum: data.pageNum,
        error: 'Worker not initialized',
      });
      return;
    }

    try {
      let u8 = plateCache.get(data.pageNum);
      if (!u8) {
        const file = zipInstance.file(data.entryName);
        if (!file) throw new Error(`Plate not found: ${data.entryName}`);
        u8 = await file.async('uint8array');

        if (plateCache.size >= 80) {
          const oldest = plateCache.keys().next().value;
          if (oldest !== undefined) plateCache.delete(oldest);
        }
        plateCache.set(data.pageNum, u8);
      }

      const ext = data.entryName.split('.').pop()?.toLowerCase() || 'jpeg';
      const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
      const blob = new Blob([u8.buffer as ArrayBuffer], { type: mime });

      self.postMessage({
        type: 'PLATE_READY',
        id: data.id,
        pageNum: data.pageNum,
        blob,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error extracting plate';
      self.postMessage({
        type: 'PLATE_ERROR',
        id: data.id,
        pageNum: data.pageNum,
        error: msg,
      });
    }
  } else if (data.type === 'PRELOAD_PLATES') {
    if (!zipInstance) return;
    pendingPreload = data.items.filter((item) => !plateCache.has(item.pageNum));
    if (isPreloading) return;

    isPreloading = true;
    while (pendingPreload.length > 0 && zipInstance) {
      const item = pendingPreload.shift()!;
      if (plateCache.has(item.pageNum)) continue;

      try {
        const file = zipInstance.file(item.entryName);
        if (file) {
          const u8 = await file.async('uint8array');
          if (plateCache.size >= 80) {
            const oldest = plateCache.keys().next().value;
            if (oldest !== undefined) plateCache.delete(oldest);
          }
          plateCache.set(item.pageNum, u8);

          const ext = item.entryName.split('.').pop()?.toLowerCase() || 'jpeg';
          const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
          const blob = new Blob([u8.buffer as ArrayBuffer], { type: mime });

          self.postMessage({
            type: 'PLATE_PRELOADED',
            pageNum: item.pageNum,
            blob,
          });
        }
      } catch {
        // silent fail on background preload
      }
      // Small tick between background preloads to yield execution
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    isPreloading = false;
  }
};
