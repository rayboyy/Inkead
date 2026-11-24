import { TableOfContentsItem } from '../../types';
import { ReflowableChapter } from './txtParser';

export interface WikipediaParsedBook {
  title: string;
  author: string;
  description: string;
  coverDataUrl: string;
  chapters: ReflowableChapter[];
  toc: TableOfContentsItem[];
  wordCount: number;
}

/**
 * Detects whether a URL belongs to Wikipedia
 */
export function isWikipediaUrl(url: string): boolean {
  try {
    const u = new URL(url.trim());
    return (
      (u.hostname === 'wikipedia.org' || u.hostname.endsWith('.wikipedia.org')) &&
      u.pathname.startsWith('/wiki/')
    );
  } catch {
    return false;
  }
}

/**
 * Extracts language and article title slug from a Wikipedia URL
 */
export function extractWikipediaMeta(url: string): {
  lang: string;
  title: string;
  displayTitle: string;
} {
  const u = new URL(url.trim());
  const hostParts = u.hostname.split('.');
  const lang = hostParts.length >= 3 && hostParts[0] !== 'www' ? hostParts[0] : 'en';
  const slug = u.pathname.replace(/^\/wiki\//, '');
  const decoded = decodeURIComponent(slug);
  const displayTitle = decoded.replace(/_/g, ' ');
  return { lang, title: decoded, displayTitle };
}

/**
 * Helper to fetch JSON from Wikipedia with proxy/direct fallbacks
 */
async function fetchWikiJson(url: string): Promise<any> {
  // 1. Try local proxy
  try {
    const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Proxy fetch failed for wiki json:', err);
  }

  // 2. Try direct fetch
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'FolioReader/1.0 (https://folioreader.app)' },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Direct fetch failed for wiki json:', err);
  }

  // 3. Fallback to AllOrigins
  const allOrigins = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  const res = await fetch(allOrigins);
  if (!res.ok) {
    throw new Error(`Failed to fetch Wikipedia summary: ${res.statusText}`);
  }
  return await res.json();
}

/**
 * Helper to fetch raw HTML from Wikipedia with proxy/direct fallbacks
 */
async function fetchWikiHtml(url: string): Promise<string> {
  // 1. Try local proxy
  try {
    const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl);
    if (res.ok) {
      return await res.text();
    }
  } catch (err) {
    console.warn('Proxy fetch failed for wiki html:', err);
  }

  // 2. Try direct fetch
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'FolioReader/1.0 (https://folioreader.app)' },
    });
    if (res.ok) {
      return await res.text();
    }
  } catch (err) {
    console.warn('Direct fetch failed for wiki html:', err);
  }

  // 3. Fallback to AllOrigins
  const allOrigins = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  const res = await fetch(allOrigins);
  if (!res.ok) {
    throw new Error(`Failed to fetch Wikipedia HTML: ${res.statusText}`);
  }
  return await res.text();
}

/**
 * Sanitizes and formats a Wikipedia HTML fragment for Folio's luxury reader
 */
export function cleanWikiFragment(container: HTMLElement, lang: string): string {
  // 1. Strip junk elements: edit buttons, navboxes, styles, category links, hatnotes
  container
    .querySelectorAll(
      '.mw-editsection, .noprint, .navbox, table.navbox, style, link, .mw-empty-elt, .shortdescription, .hatnote, .metadata'
    )
    .forEach((el) => el.remove());

  // 2. Fix all images & image sources
  container.querySelectorAll('img').forEach((img) => {
    let src = img.getAttribute('src') || '';
    if (src.startsWith('//')) {
      src = 'https:' + src;
      img.setAttribute('src', src);
    }
    const srcset = img.getAttribute('srcset');
    if (srcset) {
      img.setAttribute('srcset', srcset.replace(/(^|\s)\/\//g, '$1https://'));
    }
    img.setAttribute('loading', 'lazy');
    img.setAttribute('decoding', 'async');
    img.className =
      'rounded-xl max-h-[520px] w-auto max-w-full object-contain mx-auto shadow-xs select-none';
  });

  // 3. Fix all links
  container.querySelectorAll('a').forEach((a) => {
    const href = a.getAttribute('href') || '';
    if (href.startsWith('./')) {
      a.setAttribute('href', `https://${lang}.wikipedia.org/wiki/${href.substring(2)}`);
    } else if (href.startsWith('/wiki/')) {
      a.setAttribute('href', `https://${lang}.wikipedia.org${href}`);
    }
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener noreferrer');
    a.classList.add(
      'text-[#0071E3]',
      'dark:text-[#2997FF]',
      'hover:underline',
      'underline-offset-2',
      'transition-colors'
    );
  });

  // 4. Format figures with editorial styling
  container.querySelectorAll('figure').forEach((fig) => {
    fig.className =
      'my-6 p-3 sm:p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs flex flex-col items-center max-w-xl mx-auto space-y-2 select-text';
  });

  container.querySelectorAll('figcaption').forEach((cap) => {
    cap.className =
      'text-xs text-[var(--text-muted)] italic text-center font-normal leading-relaxed mt-2 max-w-lg';
  });

  // 5. Format infoboxes into sleek floating cards
  container.querySelectorAll('table.infobox').forEach((box) => {
    box.className =
      'infobox-card float-none sm:float-right my-4 sm:ml-6 sm:mb-6 w-full sm:max-w-xs p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs text-xs space-y-2 select-text';
  });

  // 6. Format references / superscripts
  container.querySelectorAll('sup.reference').forEach((sup) => {
    sup.className =
      'text-[10px] text-[#0071E3] dark:text-[#2997FF] font-medium ml-0.5 select-none opacity-80 hover:opacity-100';
  });

  // 7. Format blockquotes
  container.querySelectorAll('blockquote').forEach((bq) => {
    bq.className =
      'border-l-3 border-[#0071E3] pl-4 italic text-[var(--text-muted)] my-4 text-sm leading-relaxed';
  });

  return container.innerHTML;
}

/**
 * Downloads and parses a Wikipedia article into Folio chapters with high-res cover and clean typography
 */
export async function fetchWikipediaArticle(articleUrl: string): Promise<WikipediaParsedBook> {
  const { lang, title, displayTitle } = extractWikipediaMeta(articleUrl);

  const summaryApiUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
    title
  )}`;
  const htmlApiUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/html/${encodeURIComponent(
    title
  )}`;

  // Run fetches in parallel
  const [summary, rawHtml] = await Promise.all([
    fetchWikiJson(summaryApiUrl).catch(() => null),
    fetchWikiHtml(htmlApiUrl),
  ]);

  if (!rawHtml || rawHtml.length < 200) {
    throw new Error('Wikipedia returned an empty or invalid article response.');
  }

  const articleTitle = summary?.title || displayTitle;
  const description = summary?.description || 'Wikipedia Encyclopedia Article';
  const coverDataUrl = summary?.originalimage?.source || summary?.thumbnail?.source || '';
  const author = `Wikipedia (${lang.toUpperCase()})`;

  // Parse HTML using browser's DOMParser
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml, 'text/html');

  const chapters: ReflowableChapter[] = [];
  const toc: TableOfContentsItem[] = [];

  // Wikipedia Parsoid output formats sections inside <section data-mw-section-id="...">
  const sectionNodes = Array.from(doc.querySelectorAll('section[data-mw-section-id]'));

  const skipTitles = new Set([
    'References',
    'Further reading',
    'External links',
    'See also',
    'Notes',
    'Bibliography',
    'Sources',
  ]);

  if (sectionNodes.length > 0) {
    interface TempChapter {
      id: string;
      title: string;
      container: HTMLElement;
    }
    const tempChapters: TempChapter[] = [];
    let currentChapter: TempChapter | null = null;

    sectionNodes.forEach((secNode) => {
      const secId = secNode.getAttribute('data-mw-section-id') || '';
      const h2 = secNode.querySelector('h2');
      const h2Text = h2 ? h2.textContent?.trim() || '' : '';

      if (secId === '0') {
        // Section 0 is the Lead / Overview
        const leadContainer = document.createElement('div');
        leadContainer.innerHTML = secNode.innerHTML;

        currentChapter = {
          id: 'wiki-ch-0',
          title: 'Overview',
          container: leadContainer,
        };
        tempChapters.push(currentChapter);
      } else if (h2Text) {
        if (skipTitles.has(h2Text)) {
          currentChapter = null;
          return;
        }

        // Remove the h2 tag inside the chapter body so it doesn't duplicate the chapter heading
        if (h2) h2.remove();

        const chapterContainer = document.createElement('div');
        chapterContainer.innerHTML = secNode.innerHTML;

        const chId = `wiki-ch-${tempChapters.length}`;
        currentChapter = {
          id: chId,
          title: h2Text,
          container: chapterContainer,
        };
        tempChapters.push(currentChapter);
      } else if (currentChapter) {
        // Nested subsection (e.g. h3 or h4 section) - append to current chapter
        const subDiv = document.createElement('div');
        subDiv.innerHTML = secNode.innerHTML;
        currentChapter.container.appendChild(subDiv);
      }
    });

    // Clean and finalize each chapter
    tempChapters.forEach((tc, idx) => {
      let cleanedHtml = cleanWikiFragment(tc.container, lang);

      // Add description banner on Overview
      if (idx === 0 && description) {
        cleanedHtml = `
          <div class="mb-8 p-4 rounded-2xl bg-[#0071E3]/8 dark:bg-[#2997FF]/10 border border-[#0071E3]/20 text-xs text-[var(--text-muted)] flex flex-col sm:flex-row sm:items-center justify-between gap-2 select-none">
            <span class="font-medium text-[var(--text-primary)] leading-relaxed">${description}</span>
            <span class="text-[11px] font-num text-[#0071E3] dark:text-[#2997FF] font-semibold uppercase tracking-wider shrink-0">Wikipedia ${lang.toUpperCase()}</span>
          </div>
          ${cleanedHtml}
        `;
      }

      const textOnly = cleanedHtml.replace(/<[^>]+>/g, ' ').trim();
      const wordCount = textOnly.split(/\s+/).filter(Boolean).length;

      chapters.push({
        id: tc.id,
        title: tc.title,
        content: cleanedHtml,
        wordCount,
      });

      toc.push({
        id: tc.id,
        title: tc.title,
        chapterIndex: idx,
        pageNumber: idx + 1,
      });
    });
  }

  // Fallback if no sections were parsed
  if (chapters.length === 0) {
    const fullContainer = document.createElement('div');
    fullContainer.innerHTML = doc.body ? doc.body.innerHTML : rawHtml;
    const cleaned = cleanWikiFragment(fullContainer, lang);
    const wordCount = cleaned.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;

    chapters.push({
      id: 'wiki-ch-0',
      title: articleTitle,
      content: cleaned,
      wordCount,
    });
    toc.push({
      id: 'wiki-ch-0',
      title: articleTitle,
      chapterIndex: 0,
      pageNumber: 1,
    });
  }

  const totalWords = chapters.reduce((sum, c) => sum + c.wordCount, 0);

  return {
    title: articleTitle,
    author,
    description,
    coverDataUrl,
    chapters,
    toc,
    wordCount: totalWords,
  };
}
