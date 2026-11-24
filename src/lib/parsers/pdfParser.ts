import * as pdfjsLib from 'pdfjs-dist';
import { Book, TableOfContentsItem } from '../../types';

// Configure PDF worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export interface ParsedPdfResult {
  title: string;
  author: string;
  pageCount: number;
  coverDataUrl: string;
  chapters: TableOfContentsItem[];
  wordCount: number;
}

export async function parsePdf(fileData: ArrayBuffer, fileName: string): Promise<ParsedPdfResult> {
  // Pass a sliced copy so PDF.js worker transfer does NOT detach original fileData
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(fileData.slice(0)),
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/cmaps/',
    cMapPacked: true,
  });

  const pdf = await loadingTask.promise;
  const pageCount = pdf.numPages;

  // Metadata extraction
  let title = fileName.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ');
  let author = 'Unknown Author';

  try {
    const metadata = await pdf.getMetadata();
    const info = metadata?.info as Record<string, unknown> | undefined;
    if (info?.Title && typeof info.Title === 'string' && info.Title.trim().length > 0) {
      title = info.Title.trim();
    }
    if (info?.Author && typeof info.Author === 'string' && info.Author.trim().length > 0) {
      author = info.Author.trim();
    }
  } catch (err) {
    console.warn('PDF metadata read error:', err);
  }

  // Outline / TOC extraction
  const chapters: TableOfContentsItem[] = [];
  try {
    const outline = await pdf.getOutline();
    if (outline && outline.length > 0) {
      for (let i = 0; i < outline.length; i++) {
        const item = outline[i];
        let pageNumber = 1;
        if (item.dest) {
          try {
            let destRef = item.dest;
            if (typeof item.dest === 'string') {
              const explicit = await pdf.getDestination(item.dest);
              if (explicit && explicit.length > 0) destRef = explicit;
            }
            if (Array.isArray(destRef) && destRef.length > 0) {
              const pageIndex = await pdf.getPageIndex(destRef[0] as never);
              pageNumber = pageIndex + 1;
            } else if (typeof destRef === 'object' && destRef !== null) {
              const pageIndex = await pdf.getPageIndex(destRef as never);
              pageNumber = pageIndex + 1;
            }
          } catch {
            // ignore
          }
        }
        chapters.push({
          id: `toc-${i}`,
          title: item.title || `Chapter ${i + 1}`,
          pageNumber,
        });
      }
    }
  } catch (err) {
    console.warn('PDF outline read error:', err);
  }

  // Fallback TOC if no outline
  if (chapters.length === 0) {
    chapters.push({
      id: 'toc-start',
      title: 'Beginning',
      pageNumber: 1,
    });
    if (pageCount > 10) {
      const step = Math.max(10, Math.floor(pageCount / 5));
      for (let p = step; p < pageCount; p += step) {
        chapters.push({
          id: `toc-p${p}`,
          title: `Page ${p}`,
          pageNumber: p,
        });
      }
    }
  }

  // Render Page 1 to high-DPI offscreen canvas for crisp thumbnail
  let coverDataUrl = '';
  try {
    const page1 = await pdf.getPage(1);
    const viewport = page1.getViewport({ scale: 1 });
    
    // Target thumbnail width around 360px
    const targetWidth = 360;
    const scale = targetWidth / viewport.width;
    const scaledViewport = page1.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = scaledViewport.width;
    canvas.height = scaledViewport.height;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      // White paper background first
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const renderContext = {
        canvasContext: ctx,
        viewport: scaledViewport,
      };
      // @ts-expect-error PDF.js render options
      await page1.render(renderContext).promise;
      coverDataUrl = canvas.toDataURL('image/jpeg', 0.88);
    }
  } catch (err) {
    console.warn('Could not generate PDF cover thumbnail:', err);
  }

  const wordCount = pageCount * 250; // estimated standard book page words

  // Clean up PDF.js memory immediately so worker doesn't retain large buffers
  try {
    await pdf.cleanup();
    await loadingTask.destroy();
  } catch {
    // ignore cleanup errors
  }

  return {
    title,
    author,
    pageCount,
    coverDataUrl,
    chapters,
    wordCount,
  };
}

export function createPdfBook(
  id: string,
  fileName: string,
  fileData: ArrayBuffer,
  parsed: ParsedPdfResult
): Book {
  return {
    id,
    title: parsed.title,
    author: parsed.author,
    fileType: 'pdf',
    fileData,
    fileSize: fileData.byteLength,
    coverDataUrl: parsed.coverDataUrl,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    lastReadAt: Date.now(),
    status: 'unread',
    pageCount: parsed.pageCount,
    currentPage: 1,
    progressPercent: 0,
    wordCount: parsed.wordCount,
    estimatedMinutes: Math.ceil(parsed.wordCount / 230),
    chapters: parsed.chapters,
  };
}
