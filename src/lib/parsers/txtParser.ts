import { Book, TableOfContentsItem } from '../../types';

export interface ReflowableChapter {
  id: string;
  title: string;
  content: string; // HTML or Markdown
  wordCount: number;
}

export interface ParsedTextResult {
  title: string;
  author: string;
  coverDataUrl: string;
  chapters: ReflowableChapter[];
  toc: TableOfContentsItem[];
  wordCount: number;
  rawText: string;
}

// Generate luxury typographic cover for text/markdown books
export function generateTypographicCover(title: string, author: string, themeColor = '#1C1B18'): string {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 580;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background - tactile cream / alabaster paper
  ctx.fillStyle = '#FAF7F2';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle paper grain vignette
  const grad = ctx.createRadialGradient(200, 290, 50, 200, 290, 300);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.05)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Outer hairline frame - crisp contrast
  ctx.strokeStyle = 'rgba(18, 17, 15, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(24, 24, canvas.width - 48, canvas.height - 48);

  // Inner hairline Apple Blue accent frame
  ctx.strokeStyle = '#0071E3';
  ctx.lineWidth = 1;
  ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);

  // Top header label: FOLIO EDITORIAL EDITION
  ctx.fillStyle = '#1D1D1F';
  ctx.font = '600 11px "SF Pro Text", "Google Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.letterSpacing = '3px';
  ctx.fillText('FOLIO EDITORIAL EDITION', 200, 68);

  // Ornamental separator
  ctx.strokeStyle = 'rgba(0, 113, 227, 0.4)';
  ctx.beginPath();
  ctx.moveTo(150, 80);
  ctx.lineTo(250, 80);
  ctx.stroke();

  // Book Title - Constant SF Pro / Google Sans with clean fixed weight
  ctx.fillStyle = themeColor === '#1C1B18' || themeColor === '#B45309' ? '#0071E3' : themeColor;
  ctx.font = '700 26px "SF Pro Display", "Google Sans", sans-serif';
  ctx.textAlign = 'center';

  const words = title.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width > 310 && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  const startY = 240 - (lines.length * 18);
  lines.forEach((line, idx) => {
    ctx.fillText(line, 200, startY + (idx * 36));
  });

  // Small diamond ornament
  ctx.fillStyle = '#0071E3';
  ctx.beginPath();
  ctx.arc(200, startY + (lines.length * 36) + 20, 3, 0, Math.PI * 2);
  ctx.fill();

  // Author
  ctx.fillStyle = '#221F1B';
  ctx.font = '600 15px "Google Sans", "Plus Jakarta Sans", sans-serif';
  ctx.fillText(author.toUpperCase(), 200, startY + (lines.length * 36) + 60);

  // Bottom edition insignia
  ctx.fillStyle = '#5A564F';
  ctx.font = '500 11px "Space Grotesk", "Google Sans", sans-serif';
  ctx.fillText('COLLECTED EDITION • UNABRIDGED', 200, 520);

  return canvas.toDataURL('image/jpeg', 0.9);
}

export function markdownToHtml(md: string): string {
  // Normalize line breaks
  const raw = md.replace(/\r\n/g, '\n');
  const blocks = raw.split(/\n\n+/);

  const htmlBlocks = blocks.map((block) => {
    let text = block.trim();
    if (!text) return '';

    // Headings
    if (/^#\s+(.+)$/.test(text)) {
      return `<h1 class="text-2xl sm:text-3xl font-bold mt-8 mb-4 text-[var(--text-primary)]">${text.replace(/^#\s+/, '')}</h1>`;
    }
    if (/^##\s+(.+)$/.test(text)) {
      return `<h2 class="text-xl sm:text-2xl font-bold mt-8 mb-3 text-[var(--text-primary)]">${text.replace(/^##\s+/, '')}</h2>`;
    }
    if (/^###\s+(.+)$/.test(text)) {
      return `<h3 class="text-lg sm:text-xl font-bold mt-6 mb-2 text-[var(--text-primary)]">${text.replace(/^###\s+/, '')}</h3>`;
    }

    // Blockquotes
    if (text.startsWith('> ')) {
      const quoteContent = text.replace(/^>\s*/gm, '');
      return `<blockquote class="border-l-3 border-[#0071E3] pl-4 italic text-[var(--text-muted)] my-4 text-sm leading-relaxed">${quoteContent}</blockquote>`;
    }

    // Linked images: [![Alt](imgUrl)](linkUrl)
    text = text.replace(
      /\[!\[([^\]]*)\]\((https?:\/\/[^\s"]+(?:\([^)]*\)[^\s"]*)*)\)\]\((https?:\/\/[^\s"]+(?:\([^)]*\)[^\s"]*)*)\)/g,
      (_m, alt, imgUrl, linkUrl) => {
        const cleanAlt = alt || 'Illustration';
        return `<figure class="my-6 p-3.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs flex flex-col items-center max-w-xl mx-auto"><a href="${linkUrl}" target="_blank" rel="noopener noreferrer"><img src="${imgUrl}" alt="${cleanAlt}" class="rounded-xl max-h-[480px] w-auto object-contain shadow-xs hover:opacity-95 transition" loading="lazy" /></a><figcaption class="text-xs text-[var(--text-muted)] mt-2 italic text-center font-normal">${cleanAlt}</figcaption></figure>`;
      }
    );

    // Standalone images: ![Alt](imgUrl)
    text = text.replace(
      /!\[([^\]]*)\]\((https?:\/\/[^\s"]+(?:\([^)]*\)[^\s"]*)*)\)/g,
      (_m, alt, imgUrl) => {
        const cleanAlt = alt || 'Illustration';
        return `<figure class="my-6 p-3.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs flex flex-col items-center max-w-xl mx-auto"><img src="${imgUrl}" alt="${cleanAlt}" class="rounded-xl max-h-[480px] w-auto object-contain shadow-xs" loading="lazy" /><figcaption class="text-xs text-[var(--text-muted)] mt-2 italic text-center font-normal">${cleanAlt}</figcaption></figure>`;
      }
    );

    // Markdown links: [Text](url "optional title")
    text = text.replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s"]+(?:\([^)]*\)[^\s"]*)*)(?:\s+"[^"]*")?\)/g,
      (_m, txt, url) => {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-[#0071E3] dark:text-[#2997FF] underline underline-offset-2 hover:opacity-80">${txt}</a>`;
      }
    );

    // Bold: **text**
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Italics: _text_ or *text* (matching word boundaries or punctuation)
    text = text.replace(/(^|[^\w])_([^_]+)_([^\w]|$)/g, '$1<em>$2</em>$3');
    text = text.replace(/(^|[^\w])\*([^*]+)\*([^\w]|$)/g, '$1<em>$2</em>$3');

    // Inline code: `code`
    text = text.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded-md bg-stone-200/60 dark:bg-stone-800 text-xs font-mono">$1</code>');

    // If block is already a figure, don't wrap in <p>
    if (text.startsWith('<figure') && text.endsWith('</figure>')) {
      return text;
    }

    return `<p class="leading-relaxed my-3 text-[var(--text-primary)]">${text}</p>`;
  });

  return htmlBlocks.filter(Boolean).join('\n\n');
}

export function parseTextOrMarkdown(
  fileData: ArrayBuffer,
  fileName: string,
  fileType: 'txt' | 'md'
): ParsedTextResult {
  const decoder = new TextDecoder('utf-8');
  let rawText = decoder.decode(fileData);

  let title = fileName.replace(/\.(txt|md)$/i, '').replace(/[-_]/g, ' ');
  let author = 'Editorial Collection';

  // Extract YAML Frontmatter if present
  if (rawText.startsWith('---')) {
    const endFm = rawText.indexOf('\n---', 3);
    if (endFm !== -1) {
      const fmContent = rawText.substring(3, endFm);
      const titleMatch = fmContent.match(/title:\s*["']?([^"'\n\r]+)["']?/i);
      const authorMatch = fmContent.match(/author:\s*["']?([^"'\n\r]+)["']?/i);
      if (titleMatch?.[1]) title = titleMatch[1].trim();
      if (authorMatch?.[1]) author = authorMatch[1].trim();
      rawText = rawText.substring(endFm + 4).trim();
    }
  }

  // Heading check for title if not yet extracted
  const firstHeadingMatch = rawText.match(/^#\s+([^\n\r]+)/m);
  if (firstHeadingMatch && firstHeadingMatch[1]) {
    title = firstHeadingMatch[1].trim();
  }

  // Author regex check
  const byAuthorMatch = rawText.match(/(?:by|author:)\s+([A-Z][a-zA-Z\s.]+)/i);
  if (byAuthorMatch && byAuthorMatch[1] && author === 'Editorial Collection') {
    author = byAuthorMatch[1].trim();
  }

  // Split into chapters / sections
  const chapters: ReflowableChapter[] = [];
  const toc: TableOfContentsItem[] = [];

  // Patterns for chapter breaks
  // e.g. # Chapter, ## Section, or "Chapter 1", "CHAPTER I"
  const lines = rawText.split(/\r?\n/);
  let currentChapterTitle = 'Prologue';
  let currentChapterLines: string[] = [];
  let chapterIndex = 0;

  const flushChapter = () => {
    if (currentChapterLines.length > 0) {
      let content = currentChapterLines.join('\n').trim();
      const wordCount = content.split(/\s+/).filter(Boolean).length;
      if (wordCount > 10) {
        if (fileType === 'md') {
          content = markdownToHtml(content);
        }
        const id = `ch-${chapterIndex}`;
        chapters.push({
          id,
          title: currentChapterTitle,
          content,
          wordCount,
        });
        toc.push({
          id,
          title: currentChapterTitle,
          chapterIndex,
          pageNumber: chapterIndex + 1,
        });
        chapterIndex++;
      }
      currentChapterLines = [];
    }
  };

  const isHeading = (line: string): string | null => {
    const trimmed = line.trim();
    if (!trimmed) return null;
    
    // Markdown headings
    const mdMatch = trimmed.match(/^#{1,3}\s+(.+)$/);
    if (mdMatch) return mdMatch[1].trim();

    // Plain text chapter patterns
    if (/^(CHAPTER|Chapter|ACT|Act|BOOK|Book|SECTION|Section|PART|Part)\s+([IVXLCDM\d]+|[A-Za-z]+)(?::|\.|\s*-\s*|$)(.*)/i.test(trimmed)) {
      return trimmed;
    }

    return null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const heading = isHeading(line);

    if (heading && currentChapterLines.length > 50) {
      flushChapter();
      currentChapterTitle = heading;
    } else {
      currentChapterLines.push(line);
      // Fallback for long unstructured texts: split roughly every 1500 words
      if (currentChapterLines.length > 180 && !fileType) {
        flushChapter();
        currentChapterTitle = `Section ${chapterIndex + 1}`;
      }
    }
  }
  flushChapter();

  // If text was short and produced zero or 1 chapter
  if (chapters.length === 0) {
    const wordCount = rawText.split(/\s+/).filter(Boolean).length;
    let content = rawText;
    if (fileType === 'md') {
      content = markdownToHtml(content);
    }
    chapters.push({
      id: 'ch-0',
      title: title || 'Full Text',
      content,
      wordCount,
    });
    toc.push({
      id: 'ch-0',
      title: title || 'Full Text',
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
    rawText,
  };
}

export function createTextBook(
  id: string,
  fileName: string,
  fileData: ArrayBuffer,
  fileType: 'txt' | 'md',
  parsed: ParsedTextResult
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
