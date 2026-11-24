import JSZip from 'jszip';
import { Book, TableOfContentsItem } from '../../types';
import { ReflowableChapter } from './txtParser';
import { createThumbnailDataUrl } from './imageUtils';

export interface ParsedCbzResult {
  title: string;
  author: string;
  coverDataUrl: string;
  chapters: ReflowableChapter[];
  toc: TableOfContentsItem[];
  wordCount: number;
}

export async function parseCbz(fileData: ArrayBuffer, fileName: string): Promise<ParsedCbzResult> {
  const zip = await JSZip.loadAsync(fileData);

  // Find all real image files, filtering out Mac resource forks (__MACOSX, ._*)
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'];
  const imageEntries = Object.values(zip.files).filter(
    (f) =>
      !f.dir &&
      !f.name.startsWith('__MACOSX/') &&
      !f.name.includes('/._') &&
      !f.name.startsWith('._') &&
      imageExtensions.some((ext) => f.name.toLowerCase().endsWith(ext))
  );

  // Alphanumeric natural sort
  imageEntries.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

  if (imageEntries.length === 0) {
    throw new Error('No readable plates or illustrations found in this archive.');
  }

  const title = fileName.replace(/\.(cbz|cbr|zip)$/i, '').replace(/[-_]/g, ' ');
  const author = 'Illustrated Edition';

  // Extract cover image and downsample to lightweight thumbnail (~35KB)
  let coverDataUrl = '';
  try {
    const firstImage = imageEntries[0];
    const firstBlob = await firstImage.async('blob');
    coverDataUrl = await createThumbnailDataUrl(firstBlob, 360, 0.84);
  } catch {
    // fallback if canvas error
  }
  if (!coverDataUrl) {
    const firstImage = imageEntries[0];
    const firstBase64 = await firstImage.async('base64');
    const firstExt = firstImage.name.split('.').pop()?.toLowerCase() || 'jpeg';
    const firstMime = firstExt === 'png' ? 'image/png' : firstExt === 'webp' ? 'image/webp' : 'image/jpeg';
    coverDataUrl = `data:${firstMime};base64,${firstBase64}`;
  }

  // Build lightweight chapter descriptors (storing entry names, NOT giant base64 strings!)
  const chapters: ReflowableChapter[] = [];
  const toc: TableOfContentsItem[] = [];

  for (let idx = 0; idx < imageEntries.length; idx++) {
    const entry = imageEntries[idx];
    const id = `cbz-p-${idx + 1}`;
    const pageTitle = `Plate ${idx + 1}`;

    chapters.push({
      id,
      title: pageTitle,
      content: entry.name, // Store entry name so it loads on-demand via Blob URL!
      wordCount: 50,
    });

    // Milestone TOC items every 10 pages
    if (idx === 0 || (idx + 1) % 10 === 0 || idx === imageEntries.length - 1) {
      toc.push({
        id,
        title: pageTitle,
        chapterIndex: idx,
        pageNumber: idx + 1,
      });
    }
  }

  return {
    title,
    author,
    coverDataUrl,
    chapters,
    toc,
    wordCount: imageEntries.length * 50,
  };
}

export function createCbzBook(
  id: string,
  fileName: string,
  fileData: ArrayBuffer,
  parsed: ParsedCbzResult
): Book {
  return {
    id,
    title: parsed.title,
    author: parsed.author,
    fileType: 'cbz',
    fileData,
    fileSize: fileData.byteLength,
    coverDataUrl: parsed.coverDataUrl,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    lastReadAt: Date.now(),
    status: 'unread',
    pageCount: parsed.chapters.length,
    currentPage: 1,
    progressPercent: 0,
    wordCount: parsed.wordCount,
    estimatedMinutes: Math.ceil(parsed.chapters.length * 0.75), // ~45s per illustrated page
    chapters: parsed.toc,
  };
}
