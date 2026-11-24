import JSZip from 'jszip';
import { Book, TableOfContentsItem } from '../../types';
import { generateTypographicCover, ReflowableChapter } from './txtParser';
import { createThumbnailDataUrl } from './imageUtils';

export interface ParsedFb2Result {
  title: string;
  author: string;
  coverDataUrl: string;
  chapters: ReflowableChapter[];
  toc: TableOfContentsItem[];
  wordCount: number;
}

export async function parseFb2(fileData: ArrayBuffer, fileName: string): Promise<ParsedFb2Result> {
  let xmlString = '';

  // Check if it's a zipped FB2 (.fb2.zip)
  const bytes = new Uint8Array(fileData.slice(0, 4));
  if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
    const zip = await JSZip.loadAsync(fileData);
    const fb2File = Object.values(zip.files).find((f) => f.name.endsWith('.fb2'));
    if (fb2File) {
      xmlString = await fb2File.async('text');
    } else {
      const first = Object.values(zip.files).find((f) => !f.dir);
      if (first) xmlString = await first.async('text');
    }
  } else {
    // Detect XML declared encoding (e.g. windows-1251, koi8-r commonly found in shadow libraries)
    let encoding = 'utf-8';
    try {
      const headerSnippet = new TextDecoder('ascii').decode(new Uint8Array(fileData.slice(0, 200)));
      const match = headerSnippet.match(/encoding=["']([^"']+)["']/i);
      if (match && match[1]) {
        const enc = match[1].toLowerCase();
        if (enc.includes('1251')) encoding = 'windows-1251';
        else if (enc.includes('koi8')) encoding = 'koi8-r';
      }
    } catch {
      // fallback to utf-8
    }

    try {
      xmlString = new TextDecoder(encoding).decode(fileData);
    } catch {
      xmlString = new TextDecoder('utf-8').decode(fileData);
    }
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'application/xml');

  // Title
  let title = doc.querySelector('title-info > book-title')?.textContent?.trim() ||
    fileName.replace(/\.fb2(\.zip)?$/i, '').replace(/[-_]/g, ' ');

  // Author
  let author = 'Unknown Author';
  const authorEl = doc.querySelector('title-info > author');
  if (authorEl) {
    const first = authorEl.querySelector('first-name')?.textContent?.trim() || '';
    const last = authorEl.querySelector('last-name')?.textContent?.trim() || '';
    if (first || last) author = `${first} ${last}`.trim();
  }

  // Cover Image from <binary>
  let coverDataUrl = '';
  const coverImgHref = doc.querySelector('title-info > coverpage image')?.getAttribute('l:href') ||
    doc.querySelector('title-info > coverpage image')?.getAttribute('xlink:href');
  
  if (coverImgHref) {
    const binaryId = coverImgHref.replace(/^#/, '');
    const binaryEl = doc.querySelector(`binary[id="${binaryId}"]`);
    if (binaryEl) {
      const contentType = binaryEl.getAttribute('content-type') || 'image/jpeg';
      const base64 = binaryEl.textContent?.replace(/\s+/g, '') || '';
      if (base64) {
        try {
          const byteChars = atob(base64);
          const byteNumbers = new Uint8Array(byteChars.length);
          for (let i = 0; i < byteChars.length; i++) {
            byteNumbers[i] = byteChars.charCodeAt(i);
          }
          const blob = new Blob([byteNumbers], { type: contentType });
          coverDataUrl = await createThumbnailDataUrl(blob, 360, 0.84);
        } catch {
          // fallback
        }
        if (!coverDataUrl) {
          coverDataUrl = `data:${contentType};base64,${base64}`;
        }
      }
    }
  }

  if (!coverDataUrl) {
    coverDataUrl = '';
  }

  // Body and Chapters with maximum chunk safety
  const chapters: ReflowableChapter[] = [];
  const toc: TableOfContentsItem[] = [];

  const addChapterChunk = (id: string, chTitle: string, text: string) => {
    const paragraphs = text.split(/\n\n+/).filter(Boolean);
    let curLines: string[] = [];
    let curWords = 0;
    let partNum = 1;

    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i];
      const pWords = p.split(/\s+/).filter(Boolean).length;
      curLines.push(p);
      curWords += pWords;

      if (curWords >= 2500 || i === paragraphs.length - 1) {
        if (curLines.length > 0) {
          const finalTitle = partNum > 1 ? `${chTitle} (Part ${partNum})` : chTitle;
          const chunkId = `${id}-p${partNum}`;
          chapters.push({
            id: chunkId,
            title: finalTitle,
            content: curLines.join('\n\n'),
            wordCount: curWords,
          });
          toc.push({
            id: chunkId,
            title: finalTitle,
            chapterIndex: chapters.length - 1,
            pageNumber: chapters.length,
          });
          partNum++;
          curLines = [];
          curWords = 0;
        }
      }
    }
  };

  const sections = Array.from(doc.querySelectorAll('body > section'));

  if (sections.length > 0) {
    sections.forEach((sec, idx) => {
      const titleEl = sec.querySelector(':scope > title');
      const chapterTitle = titleEl?.textContent?.replace(/\s+/g, ' ').trim() || `Section ${idx + 1}`;

      const paragraphs = Array.from(sec.querySelectorAll(':scope > p, :scope > v, :scope > subtitle'))
        .map((p) => p.textContent?.trim())
        .filter(Boolean) as string[];

      const content = paragraphs.join('\n\n');
      const wordCount = content.split(/\s+/).filter(Boolean).length;

      if (wordCount > 5) {
        addChapterChunk(`fb2-sec-${idx}`, chapterTitle, content);
      }
    });
  }

  // Fallback if no sections
  if (chapters.length === 0) {
    const fullText = doc.querySelector('body')?.textContent?.trim() || '';
    addChapterChunk('fb2-full', title || 'Section', fullText);
  }

  const totalWords = chapters.reduce((sum, c) => sum + c.wordCount, 0);

  return {
    title,
    author,
    coverDataUrl,
    chapters,
    toc,
    wordCount: totalWords,
  };
}

export function createFb2Book(
  id: string,
  fileName: string,
  fileData: ArrayBuffer,
  parsed: ParsedFb2Result
): Book {
  return {
    id,
    title: parsed.title,
    author: parsed.author,
    fileType: 'fb2',
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
    estimatedMinutes: Math.ceil(parsed.wordCount / 230),
    chapters: parsed.toc,
  };
}
