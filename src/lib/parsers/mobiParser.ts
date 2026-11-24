import { Book, TableOfContentsItem } from '../../types';
import { generateTypographicCover, ReflowableChapter } from './txtParser';

export interface ParsedMobiResult {
  title: string;
  author: string;
  coverDataUrl: string;
  chapters: ReflowableChapter[];
  toc: TableOfContentsItem[];
  wordCount: number;
}

// Split any massive monolithic content into smooth, lightweight chunks
function chunkChapterIfLarge(
  chapterId: string,
  chapterTitle: string,
  content: string,
  maxWordsPerChunk = 2500
): ReflowableChapter[] {
  const isHtml = content.includes('<p') || content.includes('<div') || content.includes('<br');
  const wordCount = content.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;

  if (wordCount <= maxWordsPerChunk) {
    return [
      {
        id: chapterId,
        title: chapterTitle,
        content,
        wordCount,
      },
    ];
  }

  const chunks: ReflowableChapter[] = [];
  const parts = isHtml ? content.split(/(?=<(?:p|div|section)\b)/i) : content.split(/\n\n+/);

  let currentContent = '';
  let currentWords = 0;
  let partIndex = 1;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const partWords = part.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;

    currentContent += part;
    currentWords += partWords;

    if (currentWords >= maxWordsPerChunk || i === parts.length - 1) {
      if (currentContent.trim()) {
        const title = partIndex > 1 ? `${chapterTitle} (Part ${partIndex})` : chapterTitle;
        chunks.push({
          id: `${chapterId}-p${partIndex}`,
          title,
          content: currentContent,
          wordCount: currentWords,
        });
        partIndex++;
        currentContent = '';
        currentWords = 0;
      }
    }
  }

  return chunks.length > 0
    ? chunks
    : [
        {
          id: chapterId,
          title: chapterTitle,
          content,
          wordCount,
        },
      ];
}

// High-performance typed PalmDOC LZ77 decompressor (zero GC pauses)
function decompressPalmDoc(input: Uint8Array): Uint8Array {
  let output = new Uint8Array(Math.max(4096, input.length * 3));
  let outIdx = 0;
  let i = 0;
  const len = input.length;
  const maxOutput = 2000000; // 2MB safety cap per record

  const ensureCapacity = (extra: number) => {
    if (outIdx + extra > output.length) {
      const next = new Uint8Array(Math.max(output.length * 2, outIdx + extra + 1024));
      next.set(output);
      output = next;
    }
  };

  while (i < len && outIdx < maxOutput) {
    const b = input[i++];
    if (b === 0) {
      ensureCapacity(1);
      output[outIdx++] = 0;
    } else if (b >= 1 && b <= 8) {
      ensureCapacity(b);
      for (let j = 0; j < b && i < len; j++) {
        output[outIdx++] = input[i++];
      }
    } else if (b >= 9 && b <= 0x7f) {
      ensureCapacity(1);
      output[outIdx++] = b;
    } else if (b >= 0x80 && b <= 0xbf) {
      if (i < len) {
        const next = input[i++];
        const distance = ((b & 0x3f) << 3) | (next >> 5);
        const length = (next & 0x1f) + 3;
        ensureCapacity(length);
        const start = outIdx - distance;
        for (let j = 0; j < length; j++) {
          if (start + j >= 0 && start + j < outIdx) {
            output[outIdx++] = output[start + j];
          }
        }
      }
    } else {
      // b >= 0xc0: space + character
      ensureCapacity(2);
      output[outIdx++] = 0x20;
      output[outIdx++] = b ^ 0x80;
    }
  }

  return output.subarray(0, outIdx);
}

export function parseMobi(fileData: ArrayBuffer, fileName: string): ParsedMobiResult {
  const view = new DataView(fileData);
  const bytes = new Uint8Array(fileData);

  // Read PalmDB header
  let dbName = '';
  for (let i = 0; i < 32; i++) {
    const c = bytes[i];
    if (c === 0) break;
    dbName += String.fromCharCode(c);
  }

  const numRecords = view.getUint16(76);
  const recordOffsets: number[] = [];

  for (let i = 0; i < numRecords; i++) {
    const offset = view.getUint32(78 + i * 8);
    recordOffsets.push(offset);
  }

  let title = dbName.replace(/[-_]/g, ' ') || fileName.replace(/\.(mobi|azw3?)$/i, '');
  let author = 'Unknown Author';

  // Read Record 0
  let decompressedText = '';
  if (recordOffsets.length > 0) {
    const rec0Offset = recordOffsets[0];
    const compression = view.getUint16(rec0Offset);
    const textRecordCount = view.getUint16(rec0Offset + 8);

    // Check EXTH header for title and author
    try {
      const mobiHeaderLength = view.getUint32(rec0Offset + 20);
      const exthOffset = rec0Offset + 16 + mobiHeaderLength;
      if (
        exthOffset + 12 < fileData.byteLength &&
        String.fromCharCode(bytes[exthOffset], bytes[exthOffset + 1], bytes[exthOffset + 2], bytes[exthOffset + 3]) === 'EXTH'
      ) {
        const exthCount = view.getUint32(exthOffset + 8);
        let cur = exthOffset + 12;
        for (let i = 0; i < exthCount && cur + 8 < fileData.byteLength; i++) {
          const recType = view.getUint32(cur);
          const recLen = view.getUint32(cur + 4);
          if (recLen > 8 && cur + recLen <= fileData.byteLength) {
            const valBytes = bytes.slice(cur + 8, cur + recLen);
            const valStr = new TextDecoder('utf-8').decode(valBytes).trim();
            if (recType === 100 && valStr) author = valStr; // Author
            if (recType === 503 && valStr) title = valStr;  // Updated Title
          }
          cur += recLen;
        }
      }
    } catch {
      // EXTH optional
    }

    // Decompress text records (Record 1 to textRecordCount)
    const textChunks: Uint8Array[] = [];
    const maxRecs = Math.min(recordOffsets.length - 1, textRecordCount || 50);

    for (let r = 1; r <= maxRecs; r++) {
      const start = recordOffsets[r];
      const end = r + 1 < recordOffsets.length ? recordOffsets[r + 1] : fileData.byteLength;
      const recData = bytes.slice(start, end);

      if (compression === 2) {
        // PalmDOC LZ77
        textChunks.push(decompressPalmDoc(recData));
      } else {
        // Uncompressed
        textChunks.push(recData);
      }
    }

    // Combine chunks
    const totalLen = textChunks.reduce((acc, c) => acc + c.length, 0);
    const combined = new Uint8Array(totalLen);
    let pos = 0;
    for (const c of textChunks) {
      combined.set(c, pos);
      pos += c.length;
    }

    decompressedText = new TextDecoder('utf-8').decode(combined);
  }

  // Parse HTML or text into chapters
  const chapters: ReflowableChapter[] = [];
  const toc: TableOfContentsItem[] = [];

  // Parse HTML sections or split on <mbp:pagebreak/> or <h1> / <h2>
  if (decompressedText.includes('<html') || decompressedText.includes('<body') || decompressedText.includes('<p>')) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(decompressedText, 'text/html');

    // Remove scripts and styles
    doc.querySelectorAll('script, style').forEach((el) => el.remove());

    const headings = Array.from(doc.querySelectorAll('h1, h2, h3, h4'));

    if (headings.length > 1) {
      // Split on headings
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
          const subChunks = chunkChapterIfLarge(`mobi-ch-${idx}`, hTitle, contentHtml);
          subChunks.forEach((sc) => {
            chapters.push(sc);
            toc.push({
              id: sc.id,
              title: sc.title,
              chapterIndex: chapters.length - 1,
              pageNumber: chapters.length,
            });
          });
        }
      });
    }

    if (chapters.length === 0) {
      const cleanBody = doc.body ? doc.body.innerHTML : decompressedText;
      const subChunks = chunkChapterIfLarge('mobi-sec', title || 'Section', cleanBody);
      subChunks.forEach((sc) => {
        chapters.push(sc);
        toc.push({
          id: sc.id,
          title: sc.title,
          chapterIndex: chapters.length - 1,
          pageNumber: chapters.length,
        });
      });
    }
  } else {
    // Plain text fallback
    const subChunks = chunkChapterIfLarge('mobi-txt', title || 'Section', decompressedText);
    subChunks.forEach((sc) => {
      chapters.push(sc);
      toc.push({
        id: sc.id,
        title: sc.title,
        chapterIndex: chapters.length - 1,
        pageNumber: chapters.length,
      });
    });
  }

  const coverDataUrl = '';
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

export function createMobiBook(
  id: string,
  fileName: string,
  fileData: ArrayBuffer,
  fileType: 'mobi' | 'azw3',
  parsed: ParsedMobiResult
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
