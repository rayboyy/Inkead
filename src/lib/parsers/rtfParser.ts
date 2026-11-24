import { Book, TableOfContentsItem } from '../../types';
import { generateTypographicCover, ReflowableChapter } from './txtParser';

export interface ParsedRtfHtmlResult {
  title: string;
  author: string;
  coverDataUrl: string;
  chapters: ReflowableChapter[];
  toc: TableOfContentsItem[];
  wordCount: number;
}

// Simple robust RTF to Text converter
export function convertRtfToText(rtf: string): string {
  let text = rtf;

  // Remove font table, color table, stylesheet, etc.
  text = text.replace(/\{\\fonttbl[\s\S]*?\}/g, '');
  text = text.replace(/\{\\colortbl[\s\S]*?\}/g, '');
  text = text.replace(/\{\\stylesheet[\s\S]*?\}/g, '');
  text = text.replace(/\{\\info[\s\S]*?\}/g, '');

  // Hex encoded characters \'xx
  text = text.replace(/\\'([0-9a-fA-F]{2})/g, (_, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });

  // Unicode characters \u1234?
  text = text.replace(/\\u(-?\d+)\??/g, (_, code) => {
    const num = parseInt(code, 10);
    return String.fromCharCode(num < 0 ? num + 65536 : num);
  });

  // Line breaks
  text = text.replace(/\\line\b/g, '\n');
  text = text.replace(/\\par\b/g, '\n\n');

  // Strip remaining RTF control words
  text = text.replace(/\\[a-zA-Z]+-?\d*\s?/g, '');

  // Strip braces
  text = text.replace(/[{}]/g, '');

  return text.trim();
}

export function parseRtf(fileData: ArrayBuffer, fileName: string): ParsedRtfHtmlResult {
  const decoder = new TextDecoder('utf-8');
  const rawRtf = decoder.decode(fileData);
  const plainText = convertRtfToText(rawRtf);

  const title = fileName.replace(/\.rtf$/i, '').replace(/[-_]/g, ' ');
  const author = 'Legal & Academic Archive';

  // Split into chapters / sections
  const paragraphs = plainText.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  const chapters: ReflowableChapter[] = [];
  const toc: TableOfContentsItem[] = [];

  let curSection = 1;
  let curLines: string[] = [];

  for (let i = 0; i < paragraphs.length; i++) {
    curLines.push(paragraphs[i]);
    if (curLines.length >= 8 || i === paragraphs.length - 1) {
      const content = curLines.join('\n\n');
      const wordCount = content.split(/\s+/).filter(Boolean).length;
      const chTitle = `Section ${curSection}`;
      const id = `rtf-sec-${curSection}`;

      chapters.push({
        id,
        title: chTitle,
        content,
        wordCount,
      });
      toc.push({
        id,
        title: chTitle,
        chapterIndex: curSection - 1,
        pageNumber: curSection,
      });

      curLines = [];
      curSection++;
    }
  }

  const totalWords = chapters.reduce((acc, c) => acc + c.wordCount, 0);
  const coverDataUrl = '';

  return {
    title,
    author,
    coverDataUrl,
    chapters,
    toc,
    wordCount: totalWords,
  };
}

export function parseHtml(fileData: ArrayBuffer, fileName: string): ParsedRtfHtmlResult {
  const decoder = new TextDecoder('utf-8');
  const rawHtml = decoder.decode(fileData);

  // Check if it's a serialized Folio article bundle (e.g. from Wikipedia parser)
  if (rawHtml.startsWith('{"folioArticle":true')) {
    try {
      const data = JSON.parse(rawHtml);
      return {
        title: data.title || fileName,
        author: data.author || 'Wikipedia',
        coverDataUrl: data.coverDataUrl || '',
        chapters: data.chapters || [],
        toc: data.toc || [],
        wordCount: data.wordCount || 0,
      };
    } catch (err) {
      console.warn('Failed to parse folio article JSON, falling back to HTML DOM parse:', err);
    }
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, 'text/html');

  // Strip scripts and styles
  doc.querySelectorAll('script, style').forEach((el) => el.remove());

  let title = doc.querySelector('title, h1')?.textContent?.trim() ||
    fileName.replace(/\.(html|htm|xhtml)$/i, '').replace(/[-_]/g, ' ');
  let author = doc.querySelector('meta[name="author"]')?.getAttribute('content')?.trim() || 'Web Document';

  const headings = Array.from(doc.querySelectorAll('h1, h2, h3'));
  const chapters: ReflowableChapter[] = [];
  const toc: TableOfContentsItem[] = [];

  if (headings.length > 1) {
    headings.forEach((h, idx) => {
      const hTitle = h.textContent?.trim() || `Chapter ${idx + 1}`;
      let contentHtml = '';
      let sibling = h.nextElementSibling;
      while (sibling && !['H1', 'H2', 'H3'].includes(sibling.tagName)) {
        contentHtml += sibling.outerHTML || '';
        sibling = sibling.nextElementSibling;
      }

      const textOnly = contentHtml.replace(/<[^>]+>/g, ' ').trim();
      const wordCount = textOnly.split(/\s+/).filter(Boolean).length;

      if (wordCount > 5) {
        const id = `html-sec-${idx}`;
        chapters.push({
          id,
          title: hTitle,
          content: contentHtml,
          wordCount,
        });
        toc.push({
          id,
          title: hTitle,
          chapterIndex: idx,
          pageNumber: idx + 1,
        });
      }
    });
  }

  if (chapters.length === 0) {
    const cleanContent = doc.body ? doc.body.innerHTML : rawHtml;
    const textOnly = (doc.body?.textContent || rawHtml).trim();
    const wordCount = textOnly.split(/\s+/).filter(Boolean).length;
    chapters.push({
      id: 'html-full',
      title: title || 'Full Document',
      content: cleanContent,
      wordCount,
    });
    toc.push({
      id: 'html-full',
      title: title || 'Full Document',
      chapterIndex: 0,
      pageNumber: 1,
    });
  }

  const totalWords = chapters.reduce((acc, c) => acc + c.wordCount, 0);
  const coverDataUrl = '';

  return {
    title,
    author,
    coverDataUrl,
    chapters,
    toc,
    wordCount: totalWords,
  };
}

export function createRtfHtmlBook(
  id: string,
  fileName: string,
  fileData: ArrayBuffer,
  fileType: 'rtf' | 'html',
  parsed: ParsedRtfHtmlResult
): Book {
  return {
    id,
    title: parsed.title,
    author: parsed.author,
    fileType,
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
