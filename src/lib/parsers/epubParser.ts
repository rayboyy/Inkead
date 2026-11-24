import JSZip from 'jszip';
import { Book, TableOfContentsItem } from '../../types';
import { generateTypographicCover, ReflowableChapter } from './txtParser';
import { createThumbnailDataUrl } from './imageUtils';

export interface ParsedEpubResult {
  title: string;
  author: string;
  coverDataUrl: string;
  chapters: ReflowableChapter[];
  toc: TableOfContentsItem[];
  wordCount: number;
}

// Helper to resolve relative path inside zip
function resolveZipPath(basePath: string, relativePath: string): string {
  const stack = basePath.split('/');
  stack.pop(); // Remove file name, keep directory
  const parts = relativePath.split('/');
  for (const part of parts) {
    if (part === '.' || part === '') continue;
    if (part === '..') {
      stack.pop();
    } else {
      stack.push(part);
    }
  }
  return stack.join('/');
}

export async function parseEpub(fileData: ArrayBuffer, fileName: string): Promise<ParsedEpubResult> {
  const zip = await JSZip.loadAsync(fileData);

  // 1. Find container.xml
  const containerXmlStr = await zip.file('META-INF/container.xml')?.async('text');
  if (!containerXmlStr) {
    throw new Error('Invalid EPUB: META-INF/container.xml not found.');
  }

  const parser = new DOMParser();
  const containerDoc = parser.parseFromString(containerXmlStr, 'application/xml');
  const rootfileEl = containerDoc.getElementsByTagName('rootfile')[0] || containerDoc.querySelector('rootfile');
  const opfPath = rootfileEl?.getAttribute('full-path');

  if (!opfPath) {
    throw new Error('Invalid EPUB: Rootfile not defined in container.xml.');
  }

  // 2. Read OPF
  const opfStr = await zip.file(opfPath)?.async('text');
  if (!opfStr) {
    throw new Error(`Invalid EPUB: Cannot find OPF file at ${opfPath}.`);
  }

  const opfDoc = parser.parseFromString(opfStr, 'application/xml');

  // Metadata
  let title = opfDoc.querySelector('title')?.textContent?.trim() ||
    fileName.replace(/\.epub$/i, '').replace(/[-_]/g, ' ');
  let author = opfDoc.querySelector('creator')?.textContent?.trim() || 'Unknown Author';

  // Manifest items
  const manifestItems = new Map<string, { href: string; mediaType: string; properties?: string }>();
  opfDoc.querySelectorAll('manifest > item').forEach((item) => {
    const id = item.getAttribute('id');
    const href = item.getAttribute('href');
    const mediaType = item.getAttribute('media-type');
    const properties = item.getAttribute('properties') || '';
    if (id && href && mediaType) {
      manifestItems.set(id, { href, mediaType, properties });
    }
  });

  // 3. Cover Image Extraction
  let coverDataUrl = '';
  let coverItemId: string | null = null;

  // Check EPUB 3 cover-image property
  for (const [id, item] of manifestItems.entries()) {
    if (item.properties?.includes('cover-image')) {
      coverItemId = id;
      break;
    }
  }

  // Check EPUB 2 meta name="cover"
  if (!coverItemId) {
    const metaCover = opfDoc.querySelector('metadata > meta[name="cover"]');
    if (metaCover) {
      coverItemId = metaCover.getAttribute('content');
    }
  }

  // Check manifest ids for "cover"
  if (!coverItemId) {
    for (const [id] of manifestItems.entries()) {
      if (id.toLowerCase().includes('cover') && manifestItems.get(id)?.mediaType.startsWith('image/')) {
        coverItemId = id;
        break;
      }
    }
  }

  if (coverItemId && manifestItems.has(coverItemId)) {
    const coverItem = manifestItems.get(coverItemId)!;
    const coverPath = resolveZipPath(opfPath, coverItem.href);
    const coverFile = zip.file(coverPath) || zip.file(coverItem.href);
    if (coverFile) {
      try {
        const blob = await coverFile.async('blob');
        coverDataUrl = await createThumbnailDataUrl(blob, 360, 0.84);
      } catch {
        // fallback
      }
      if (!coverDataUrl) {
        const base64 = await coverFile.async('base64');
        coverDataUrl = `data:${coverItem.mediaType};base64,${base64}`;
      }
    }
  }

  // If no embedded cover image found in EPUB manifest, leave empty so dynamic clothbound cover is used
  if (!coverDataUrl) {
    coverDataUrl = '';
  }

  // 4. TOC Extraction (Nav or NCX)
  const toc: TableOfContentsItem[] = [];
  try {
    // Try EPUB 3 Nav
    let navItem: { href: string; mediaType: string } | undefined;
    for (const item of manifestItems.values()) {
      if (item.properties?.includes('nav')) {
        navItem = item;
        break;
      }
    }

    if (navItem) {
      const navPath = resolveZipPath(opfPath, navItem.href);
      const navStr = await (zip.file(navPath) || zip.file(navItem.href))?.async('text');
      if (navStr) {
        const navDoc = parser.parseFromString(navStr, 'text/html');
        const navLinks = navDoc.querySelectorAll('nav[epub\\:type="toc"] a, nav#toc a, nav a');
        navLinks.forEach((a, idx) => {
          const text = a.textContent?.trim();
          const href = a.getAttribute('href');
          if (text) {
            toc.push({
              id: `toc-${idx}`,
              title: text,
              href: href || undefined,
              chapterIndex: idx,
              pageNumber: idx + 1,
            });
          }
        });
      }
    }

    // Fallback to EPUB 2 NCX
    if (toc.length === 0) {
      let ncxItem: { href: string; mediaType: string } | undefined;
      for (const item of manifestItems.values()) {
        if (item.mediaType === 'application/x-dtbncx+xml') {
          ncxItem = item;
          break;
        }
      }
      if (ncxItem) {
        const ncxPath = resolveZipPath(opfPath, ncxItem.href);
        const ncxStr = await (zip.file(ncxPath) || zip.file(ncxItem.href))?.async('text');
        if (ncxStr) {
          const ncxDoc = parser.parseFromString(ncxStr, 'application/xml');
          const navPoints = ncxDoc.querySelectorAll('navPoint');
          navPoints.forEach((np, idx) => {
            const label = np.querySelector('navLabel > text')?.textContent?.trim();
            const src = np.querySelector('content')?.getAttribute('src');
            if (label) {
              toc.push({
                id: `toc-${idx}`,
                title: label,
                href: src || undefined,
                chapterIndex: idx,
                pageNumber: idx + 1,
              });
            }
          });
        }
      }
    }
  } catch (err) {
    console.warn('EPUB TOC parsing warning:', err);
  }

  // 5. Spine Reading Order & Chapter Extraction
  const spineItemRefs = Array.from(opfDoc.querySelectorAll('spine > itemref'))
    .map((el) => el.getAttribute('idref'))
    .filter(Boolean) as string[];

  const chapters: ReflowableChapter[] = [];

  for (let idx = 0; idx < spineItemRefs.length; idx++) {
    const idref = spineItemRefs[idx];
    const manifestItem = manifestItems.get(idref);
    if (!manifestItem) continue;

    const chapterPath = resolveZipPath(opfPath, manifestItem.href);
    const chapterFile = zip.file(chapterPath) || zip.file(manifestItem.href);
    if (!chapterFile) continue;

    const chapterHtml = await chapterFile.async('text');
    const doc = parser.parseFromString(chapterHtml, 'text/html');

    // Extract title
    let chapterTitle = doc.querySelector('h1, h2, h3, title')?.textContent?.trim();
    if (!chapterTitle || chapterTitle.length > 80) {
      // Find in TOC
      const matchedToc = toc.find((t) => t.href && manifestItem.href.includes(t.href.split('#')[0]));
      chapterTitle = matchedToc?.title || `Section ${idx + 1}`;
    }

    // Replace images with base64 data URLs so they display offline
    const images = Array.from(doc.querySelectorAll('img, image'));
    for (const img of images) {
      const src = img.getAttribute('src') || img.getAttribute('xlink:href');
      if (src && !src.startsWith('data:') && !src.startsWith('http')) {
        const imgPath = resolveZipPath(chapterPath, src);
        const imgFile = zip.file(imgPath) || zip.file(src);
        if (imgFile) {
          try {
            const base64 = await imgFile.async('base64');
            const ext = imgPath.split('.').pop()?.toLowerCase() || 'jpg';
            const mime = ext === 'png' ? 'image/png' : ext === 'svg' ? 'image/svg+xml' : 'image/jpeg';
            img.setAttribute('src', `data:${mime};base64,${base64}`);
            if (img.hasAttribute('xlink:href')) {
              img.setAttribute('xlink:href', `data:${mime};base64,${base64}`);
            }
          } catch {
            // ignore
          }
        }
      }
    }

    // Clean body HTML
    const bodyEl = doc.body;
    let cleanContent = '';
    let textContent = '';

    if (bodyEl) {
      // Remove scripts and style tags to prevent style leakage
      bodyEl.querySelectorAll('script, style').forEach((el) => el.remove());
      cleanContent = bodyEl.innerHTML;
      textContent = bodyEl.textContent || '';
    } else {
      cleanContent = chapterHtml;
      textContent = doc.textContent || '';
    }

    const wordCount = textContent.split(/\s+/).filter(Boolean).length;

    // Only skip truly empty pages (like cover wrappers if wordCount is 0 and no images)
    if (wordCount > 5 || cleanContent.includes('<img')) {
      chapters.push({
        id: `chap-${idx}`,
        title: chapterTitle,
        content: cleanContent,
        wordCount,
      });
    }
  }

  // Ensure TOC exists
  if (toc.length === 0) {
    chapters.forEach((c, i) => {
      toc.push({
        id: c.id,
        title: c.title,
        chapterIndex: i,
        pageNumber: i + 1,
      });
    });
  }

  const totalWords = chapters.reduce((acc, c) => acc + c.wordCount, 0);

  return {
    title,
    author,
    coverDataUrl,
    chapters,
    toc,
    wordCount: totalWords,
  };
}

export function createEpubBook(
  id: string,
  fileName: string,
  fileData: ArrayBuffer,
  parsed: ParsedEpubResult
): Book {
  return {
    id,
    title: parsed.title,
    author: parsed.author,
    fileType: 'epub',
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
