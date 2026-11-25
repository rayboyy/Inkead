import { TableOfContentsItem } from '../../types';
import { ReflowableChapter } from './txtParser';
import { WikipediaParsedBook } from './wikipediaParser';

export type RichWebBook = WikipediaParsedBook;

export type RichWebImportResult =
  | { kind: 'rich-book'; book: RichWebBook; sourceLabel: string }
  | { kind: 'binary-url'; url: string; suggestedName?: string };

/**
 * Checks whether text/HTML is an anti-bot challenge or CAPTCHA page.
 */
export function isBotChallengeText(text: string): boolean {
  const lower = text.toLowerCase();
  const head = lower.slice(0, 1500);
  const challengeSignals = [
    'are you a robot?',
    'please confirm you are a human',
    'completing the captcha challenge',
    'verify you are human',
    'enable javascript and cookies to continue',
    'checking your browser before accessing',
    'please enable js',
    'cf-browser-verification',
    'datadome',
    'attention required! | cloudflare',
    "you've been blocked by network security",
    'blocked by network security',
    'log in to your reddit account or use your developer token',
  ];
  if (head.includes('just a moment...') && text.length < 4000) return true;
  if (challengeSignals.some((sig) => head.includes(sig)) && text.length < 6000) return true;
  if (text.length < 2500 && (lower.includes('access denied') || lower.includes('captcha'))) return true;
  return false;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function resolveUrl(raw: string, baseUrl: string): string {
  try {
    if (!raw) return '';
    if (raw.startsWith('data:') || raw.startsWith('blob:')) return raw;
    if (raw.startsWith('//')) return `https:${raw}`;
    return new URL(raw, baseUrl).toString();
  } catch {
    return raw;
  }
}

/**
 * Fetches text/HTML from a URL using local proxy -> direct -> allorigins fallbacks.
 */
async function fetchTextWithFallbacks(
  targetUrl: string,
  timeoutMs = 20000
): Promise<{ text: string; status: number; blocked: boolean }> {
  const attempts = [
    `/api/proxy?url=${encodeURIComponent(targetUrl)}`,
    targetUrl,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
  ];

  let blocked = false;
  let lastStatus = 0;

  for (const url of attempts) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
      lastStatus = res.status;
      if (res.status === 401 || res.status === 403 || res.status === 429) {
        blocked = true;
        continue;
      }
      if (!res.ok) continue;
      const text = await res.text();
      if (!text || text.trim().length < 40) continue;
      if (isBotChallengeText(text)) {
        blocked = true;
        continue;
      }
      return { text, status: res.status, blocked: false };
    } catch {
      // Try next fallback
    }
  }

  return { text: '', status: lastStatus, blocked };
}

/**
 * Sanitizes and styles an HTML element tree for Inkead's reader, preserving images, figures, tables, code, and links.
 */
export function sanitizeAndStyleHtmlFragment(container: HTMLElement, baseUrl: string): string {
  // Strip unsafe/noisy elements
  container
    .querySelectorAll(
      'script, style, noscript, iframe, object, embed, form, button, input, select, textarea, nav, footer, aside, [role="navigation"], [role="banner"], .ad, .advertisement, .social-share, .share-buttons, .newsletter-signup, .cookie-banner'
    )
    .forEach((el) => el.remove());

  // Strip inline event handlers & restrictive inline widths
  container.querySelectorAll('*').forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      if (attr.name.startsWith('on')) {
        el.removeAttribute(attr.name);
      }
    }
  });

  // Resolve and style images
  container.querySelectorAll('img').forEach((img) => {
    const lazySrc =
      img.getAttribute('data-src') ||
      img.getAttribute('data-original') ||
      img.getAttribute('data-lazy-src') ||
      img.getAttribute('src') ||
      '';
    const resolved = resolveUrl(lazySrc, baseUrl);
    if (!resolved) {
      img.remove();
      return;
    }
    img.setAttribute('src', resolved);
    const srcset = img.getAttribute('srcset');
    if (srcset) {
      const fixedSrcset = srcset
        .split(',')
        .map((part) => {
          const pieces = part.trim().split(/\s+/);
          if (!pieces[0]) return '';
          return `${resolveUrl(pieces[0], baseUrl)}${pieces[1] ? ` ${pieces[1]}` : ''}`;
        })
        .filter(Boolean)
        .join(', ');
      if (fixedSrcset) img.setAttribute('srcset', fixedSrcset);
    }
    img.setAttribute('loading', 'lazy');
    img.setAttribute('decoding', 'async');
    img.className =
      'rounded-xl max-h-[520px] w-auto max-w-full object-contain mx-auto shadow-xs select-none my-4';
  });

  // Style figures & captions
  container.querySelectorAll('figure').forEach((fig) => {
    fig.className =
      'my-6 p-3 sm:p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xs flex flex-col items-center max-w-2xl mx-auto space-y-2 select-text';
  });

  container.querySelectorAll('figcaption').forEach((cap) => {
    cap.className =
      'text-xs text-[var(--text-muted)] italic text-center font-normal leading-relaxed mt-2 max-w-lg';
  });

  // Resolve and style links
  container.querySelectorAll('a').forEach((a) => {
    const href = a.getAttribute('href') || '';
    if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
      a.setAttribute('href', resolveUrl(href, baseUrl));
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

  // Style blockquotes
  container.querySelectorAll('blockquote').forEach((bq) => {
    bq.className =
      'border-l-3 border-[#0071E3] pl-4 italic text-[var(--text-muted)] my-4 text-sm leading-relaxed';
  });

  // Style code blocks
  container.querySelectorAll('pre').forEach((pre) => {
    pre.className =
      'my-4 p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] overflow-x-auto text-xs font-mono leading-relaxed';
  });

  // Style tables
  container.querySelectorAll('table').forEach((table) => {
    table.className =
      'w-full my-5 text-xs border-collapse rounded-xl overflow-hidden border border-[var(--border-color)]';
  });

  return container.innerHTML;
}

/**
 * Splits a sanitized root element into chapters by H2 headings (or single chapter if short).
 */
function buildChaptersFromDom(
  root: HTMLElement,
  articleTitle: string,
  baseUrl: string
): { chapters: ReflowableChapter[]; toc: TableOfContentsItem[]; wordCount: number } {
  sanitizeAndStyleHtmlFragment(root, baseUrl);

  const children = Array.from(root.children);
  const h2Count = children.filter((el) => el.tagName === 'H2' || el.querySelector(':scope > h2')).length;

  const chapters: ReflowableChapter[] = [];
  const toc: TableOfContentsItem[] = [];
  let totalWords = 0;

  if (h2Count >= 2 && children.length > 4) {
    let currentTitle = articleTitle;
    let currentHtmlParts: string[] = [];
    let currentTextParts: string[] = [];

    const flushChapter = () => {
      const html = currentHtmlParts.join('\n').trim();
      const words = countWords(currentTextParts.join(' '));
      if (!html || (words < 5 && !html.includes('<img'))) return;
      const idx = chapters.length;
      const id = `sec-${idx}`;
      chapters.push({
        id,
        title: currentTitle,
        content: `<div class="rich-article-section">${html}</div>`,
        wordCount: words,
      });
      toc.push({ id, title: currentTitle, chapterIndex: idx, pageNumber: idx + 1 });
      totalWords += words;
    };

    for (const child of children) {
      if (child.tagName === 'H2') {
        flushChapter();
        currentTitle = child.textContent?.trim() || `Section ${chapters.length + 1}`;
        currentHtmlParts = [`<h2>${escapeHtml(currentTitle)}</h2>`];
        currentTextParts = [currentTitle];
      } else {
        currentHtmlParts.push(child.outerHTML);
        currentTextParts.push(child.textContent || '');
      }
    }
    flushChapter();
  }

  if (chapters.length === 0) {
    const html = root.innerHTML.trim();
    const words = countWords(root.textContent || '');
    chapters.push({
      id: 'sec-0',
      title: articleTitle,
      content: `<div class="rich-article-section">${html}</div>`,
      wordCount: words,
    });
    toc.push({ id: 'sec-0', title: articleTitle, chapterIndex: 0, pageNumber: 1 });
    totalWords = words;
  }

  return { chapters, toc, wordCount: totalWords };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Converts Markdown (including images, headings, code fences, blockquotes, lists) into clean styled HTML.
 */
function markdownToRichHtml(md: string, baseUrl: string): string {
  const lines = md.split('\n');
  const out: string[] = [];
  let inCode = false;
  let codeLines: string[] = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      out.push('</ul>');
      inList = false;
    }
  };

  const formatInline = (line: string) => {
    let s = escapeHtml(line);
    // Images ![alt](url)
    s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (_m, alt, rawSrc) => {
      const src = resolveUrl(rawSrc, baseUrl);
      return `<figure class="my-6 p-3 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] flex flex-col items-center max-w-2xl mx-auto"><img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy" class="rounded-xl max-h-[520px] w-auto max-w-full object-contain mx-auto" />${alt ? `<figcaption class="text-xs text-[var(--text-muted)] italic mt-2 text-center">${escapeHtml(alt)}</figcaption>` : ''}</figure>`;
    });
    // Links [text](url)
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label, href) => {
      const resolved = resolveUrl(href, baseUrl);
      return `<a href="${escapeHtml(resolved)}" target="_blank" rel="noopener noreferrer" class="text-[#0071E3] dark:text-[#2997FF] hover:underline">${label}</a>`;
    });
    // Bold & italic & inline code
    s = s.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-[var(--bg-surface)] text-xs font-mono">$1</code>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    return s;
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    if (trimmed.startsWith('```')) {
      closeList();
      if (!inCode) {
        inCode = true;
        codeLines = [];
      } else {
        inCode = false;
        out.push(
          `<pre class="my-4 p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] overflow-x-auto text-xs font-mono leading-relaxed"><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`
        );
      }
      continue;
    }

    if (inCode) {
      codeLines.push(rawLine);
      continue;
    }

    if (!trimmed) {
      closeList();
      continue;
    }

    if (trimmed.startsWith('# ')) {
      closeList();
      out.push(`<h1>${formatInline(trimmed.slice(2))}</h1>`);
    } else if (trimmed.startsWith('## ')) {
      closeList();
      out.push(`<h2>${formatInline(trimmed.slice(3))}</h2>`);
    } else if (trimmed.startsWith('### ')) {
      closeList();
      out.push(`<h3>${formatInline(trimmed.slice(4))}</h3>`);
    } else if (trimmed.startsWith('> ')) {
      closeList();
      out.push(
        `<blockquote class="border-l-3 border-[#0071E3] pl-4 italic text-[var(--text-muted)] my-4 text-sm leading-relaxed">${formatInline(trimmed.slice(2))}</blockquote>`
      );
    } else if (/^[-*+]\s+/.test(trimmed)) {
      if (!inList) {
        out.push('<ul class="list-disc pl-6 my-3 space-y-1">');
        inList = true;
      }
      out.push(`<li>${formatInline(trimmed.replace(/^[-*+]\s+/, ''))}</li>`);
    } else {
      closeList();
      out.push(`<p>${formatInline(trimmed)}</p>`);
    }
  }
  closeList();
  return out.join('\n');
}

// ============================================================================
// 1. arXiv Integration (HTML5 Paper -> Fallback to Native PDF)
// ============================================================================
async function tryArxivIntegration(url: URL): Promise<RichWebImportResult | null> {
  if (!url.hostname.includes('arxiv.org')) return null;

  const pdfMatch = url.pathname.match(/^\/pdf\/([^/]+?)(?:\.pdf)?$/i);
  if (pdfMatch) {
    return {
      kind: 'binary-url',
      url: `https://arxiv.org/pdf/${pdfMatch[1]}.pdf`,
      suggestedName: `arxiv-${pdfMatch[1]}.pdf`,
    };
  }

  const absOrHtmlMatch = url.pathname.match(/^\/(?:abs|html)\/([^/]+)/i);
  if (!absOrHtmlMatch) return null;
  const arxivId = absOrHtmlMatch[1].replace(/v\d+$/, '');

  // Try official arXiv HTML5 paper first (preserves figures, equations, sections, and layout)
  const htmlUrl = `https://arxiv.org/html/${arxivId}`;
  const htmlRes = await fetchTextWithFallbacks(htmlUrl, 20000);
  if (htmlRes.text && htmlRes.text.includes('ltx_page_main')) {
    const doc = new DOMParser().parseFromString(htmlRes.text, 'text/html');
    const title =
      doc.querySelector('h1.ltx_title')?.textContent?.replace(/\s+/g, ' ').trim() ||
      `arXiv:${arxivId}`;
    const author =
      doc.querySelector('.ltx_authors')?.textContent?.replace(/\s+/g, ' ').trim() || 'arXiv';
    const main = doc.querySelector('.ltx_page_main') as HTMLElement | null;
    if (main) {
      const firstImg = main.querySelector('img');
      const coverDataUrl = firstImg ? resolveUrl(firstImg.getAttribute('src') || '', htmlUrl) : '';
      const { chapters, toc, wordCount } = buildChaptersFromDom(main, title, htmlUrl);
      return {
        kind: 'rich-book',
        sourceLabel: 'arXiv HTML5',
        book: {
          title,
          author,
          description: `arXiv Paper ${arxivId}`,
          coverDataUrl,
          chapters,
          toc,
          wordCount,
        },
      };
    }
  }

  // Fallback to native PDF download for papers without HTML5 rendering
  return {
    kind: 'binary-url',
    url: `https://arxiv.org/pdf/${arxivId}.pdf`,
    suggestedName: `arxiv-${arxivId}.pdf`,
  };
}

// ============================================================================
// 2. GitHub Repository / Markdown File Integration
// ============================================================================
async function tryGitHubIntegration(url: URL): Promise<RichWebImportResult | null> {
  if (url.hostname !== 'github.com' && url.hostname !== 'www.github.com') return null;

  const parts = url.pathname.split('/').filter(Boolean);
  if (parts.length < 2) return null;
  const [owner, repo, mode, branch, ...rest] = parts;

  let rawUrl = '';
  let baseRawUrl = '';
  let docTitle = `${owner}/${repo}`;

  if (!mode) {
    // Repo root -> fetch README.md from HEAD
    rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/README.md`;
    baseRawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/`;
  } else if (mode === 'blob' && branch && rest.length > 0) {
    const filePath = rest.join('/');
    rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
    const dir = rest.slice(0, -1).join('/');
    baseRawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${dir ? `${dir}/` : ''}`;
    docTitle = `${rest[rest.length - 1]} (${owner}/${repo})`;
  } else {
    return null;
  }

  const res = await fetchTextWithFallbacks(rawUrl, 15000);
  if (!res.text) return null;

  const html = markdownToRichHtml(res.text, baseRawUrl);
  const container = document.createElement('div');
  container.innerHTML = html;
  const firstImg = container.querySelector('img')?.getAttribute('src') || '';
  const { chapters, toc, wordCount } = buildChaptersFromDom(container, docTitle, baseRawUrl);

  return {
    kind: 'rich-book',
    sourceLabel: 'GitHub',
    book: {
      title: docTitle,
      author: owner,
      description: `GitHub: ${owner}/${repo}`,
      coverDataUrl: firstImg,
      chapters,
      toc,
      wordCount,
    },
  };
}

// ============================================================================
// 3. Dev.to Article Integration (Official Public API)
// ============================================================================
async function tryDevToIntegration(url: URL): Promise<RichWebImportResult | null> {
  if (url.hostname !== 'dev.to' && url.hostname !== 'www.dev.to') return null;
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts.length < 2) return null;

  const apiUrl = `https://dev.to/api/articles/${parts[0]}/${parts[1]}`;
  const res = await fetchTextWithFallbacks(apiUrl, 15000);
  if (!res.text) return null;

  try {
    const data = JSON.parse(res.text);
    if (!data?.body_html) return null;
    const container = document.createElement('div');
    container.innerHTML = data.body_html;
    const title = data.title || 'Dev.to Article';
    const author = data.user?.name || data.user?.username || 'Dev.to';
    const coverDataUrl = data.cover_image || data.social_image || '';
    const { chapters, toc, wordCount } = buildChaptersFromDom(container, title, url.toString());

    return {
      kind: 'rich-book',
      sourceLabel: 'Dev.to',
      book: {
        title,
        author,
        description: data.description || 'Dev.to Article',
        coverDataUrl,
        chapters,
        toc,
        wordCount,
      },
    };
  } catch {
    return null;
  }
}

// ============================================================================
// 4. Reddit Post & Discussion Integration (Official .json API)
// ============================================================================
async function tryRedditIntegration(url: URL): Promise<RichWebImportResult | null> {
  if (!url.hostname.endsWith('reddit.com') || !url.pathname.includes('/comments/')) return null;

  const jsonUrl = `${url.origin}${url.pathname.replace(/\/$/, '')}.json?raw_json=1`;
  const res = await fetchTextWithFallbacks(jsonUrl, 15000);
  if (res.blocked) {
    throw new Error(
      'Reddit blocked unauthenticated automated access ("blocked by network security"). Open the post in your browser, save the page as PDF or HTML, and import it directly.'
    );
  }
  if (!res.text) return null;

  try {
    const listings = JSON.parse(res.text);
    const post = listings?.[0]?.data?.children?.[0]?.data;
    if (!post) return null;

    const title = post.title || 'Reddit Post';
    const author = post.author ? `u/${post.author} · r/${post.subreddit}` : 'Reddit';
    const parts: string[] = [];

    if (post.url && /\.(png|jpe?g|webp|gif)$/i.test(post.url)) {
      parts.push(
        `<figure><img src="${escapeHtml(post.url)}" alt="${escapeHtml(title)}" /></figure>`
      );
    } else if (post.preview?.images?.[0]?.source?.url) {
      parts.push(
        `<figure><img src="${escapeHtml(post.preview.images[0].source.url)}" alt="${escapeHtml(title)}" /></figure>`
      );
    }

    if (post.selftext) {
      parts.push(markdownToRichHtml(post.selftext, url.toString()));
    }

    const comments = listings?.[1]?.data?.children || [];
    const topComments = comments
      .filter((c: any) => c.kind === 't1' && c.data?.body)
      .slice(0, 15);

    if (topComments.length > 0) {
      parts.push('<h2>Top Discussion</h2>');
      for (const c of topComments) {
        const d = c.data;
        parts.push(
          `<blockquote><strong>u/${escapeHtml(d.author || 'anon')}</strong> (${d.score ?? 0} pts)<br/>${markdownToRichHtml(d.body, url.toString())}</blockquote>`
        );
      }
    }

    const container = document.createElement('div');
    container.innerHTML = parts.join('\n');
    const coverDataUrl = container.querySelector('img')?.getAttribute('src') || '';
    const { chapters, toc, wordCount } = buildChaptersFromDom(container, title, url.toString());

    return {
      kind: 'rich-book',
      sourceLabel: 'Reddit',
      book: {
        title,
        author,
        description: `r/${post.subreddit || 'reddit'}`,
        coverDataUrl,
        chapters,
        toc,
        wordCount,
      },
    };
  } catch {
    return null;
  }
}

// ============================================================================
// 5. ScienceDirect / DOI Open-Access Lookup Integration (OpenAlex)
// ============================================================================
async function tryAcademicIntegration(url: URL): Promise<RichWebImportResult | null> {
  const isScienceDirect = url.hostname.includes('sciencedirect.com');
  const isDoi = url.hostname === 'doi.org' || url.hostname === 'dx.doi.org';
  if (!isScienceDirect && !isDoi) return null;

  let oaQuery = '';
  if (isDoi) {
    const doi = url.pathname.replace(/^\//, '');
    oaQuery = `https://api.openalex.org/works/https://doi.org/${encodeURIComponent(doi)}`;
  } else {
    const piiMatch = url.pathname.match(/\/pii\/([A-Z0-9]+)/i);
    if (!piiMatch) return null;
    oaQuery = `https://api.openalex.org/works?search=${encodeURIComponent(piiMatch[1])}&per-page=1`;
  }

  try {
    const res = await fetch(oaQuery, { signal: AbortSignal.timeout(10000) });
    if (res.ok) {
      const json = await res.json();
      const work = json?.results ? json.results[0] : json;
      const oaPdf = work?.best_oa_location?.pdf_url || work?.open_access?.oa_url;
      if (oaPdf && /\.pdf($|\?)/i.test(oaPdf)) {
        return { kind: 'binary-url', url: oaPdf, suggestedName: `${work.title || 'paper'}.pdf` };
      }
    }
  } catch {
    // Continue to standard check (which will surface ScienceDirect CAPTCHA notice if blocked)
  }

  return null;
}

// ============================================================================
// 6. General Rich Web Article Extractor (Preserves Images, Layout, Tables, Code)
// ============================================================================
export async function fetchRichWebArticle(
  targetUrl: string,
  customTitle?: string
): Promise<RichWebImportResult> {
  const parsedUrl = new URL(targetUrl);

  // Try site-specific integrations in order
  const siteHandlers = [
    tryArxivIntegration,
    tryGitHubIntegration,
    tryDevToIntegration,
    tryRedditIntegration,
    tryAcademicIntegration,
  ];

  for (const handler of siteHandlers) {
    const result = await handler(parsedUrl);
    if (result) {
      if (result.kind === 'rich-book' && customTitle?.trim()) {
        result.book.title = customTitle.trim();
      }
      return result;
    }
  }

  // General Rich HTML Fetch (preserves images, figures, tables, code blocks, and headings)
  const htmlFetch = await fetchTextWithFallbacks(targetUrl, 20000);
  if (htmlFetch.text && htmlFetch.text.trim().startsWith('<')) {
    const doc = new DOMParser().parseFromString(htmlFetch.text, 'text/html');

    const title =
      customTitle?.trim() ||
      doc.querySelector('meta[property="og:title"]')?.getAttribute('content')?.trim() ||
      doc.querySelector('h1')?.textContent?.trim() ||
      doc.title?.trim() ||
      parsedUrl.hostname;

    const author =
      doc.querySelector('meta[name="author"]')?.getAttribute('content')?.trim() ||
      doc.querySelector('meta[property="article:author"]')?.getAttribute('content')?.trim() ||
      parsedUrl.hostname.replace(/^www\./, '');

    const ogImage =
      doc.querySelector('meta[property="og:image"]')?.getAttribute('content')?.trim() || '';
    const coverDataUrl = ogImage ? resolveUrl(ogImage, targetUrl) : '';

    const articleRoot =
      (doc.querySelector(
        'article, main, [role="main"], .post-content, .article-content, .entry-content, .markdown-body, .available-content'
      ) as HTMLElement | null) || doc.body;

    if (articleRoot) {
      const clone = articleRoot.cloneNode(true) as HTMLElement;
      const { chapters, toc, wordCount } = buildChaptersFromDom(clone, title, targetUrl);
      const hasMedia = clone.querySelector('img') !== null;

      if (wordCount >= 40 || hasMedia) {
        return {
          kind: 'rich-book',
          sourceLabel: parsedUrl.hostname.replace(/^www\./, ''),
          book: {
            title,
            author,
            description:
              doc.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() || '',
            coverDataUrl:
              coverDataUrl || clone.querySelector('img')?.getAttribute('src') || '',
            chapters,
            toc,
            wordCount,
          },
        };
      }
    }
  }

  // Fallback to Jina Reader API -> convert Markdown (including images!) to rich HTML chapters
  let jinaBlocked = htmlFetch.blocked;
  try {
    const jinaRes = await fetch(`https://r.jina.ai/${encodeURIComponent(targetUrl)}`, {
      headers: { Accept: 'text/plain' },
      signal: AbortSignal.timeout(15000),
    });
    if (jinaRes.status === 401 || jinaRes.status === 403 || jinaRes.status === 422) {
      jinaBlocked = true;
    } else if (jinaRes.ok) {
      const rawText = await jinaRes.text();
      if (isBotChallengeText(rawText)) {
        jinaBlocked = true;
      } else if (rawText && rawText.length > 80 && !rawText.includes('Markdown Content:\n\n')) {
        const titleMatch = rawText.match(/^Title:\s*(.+)$/m);
        const title = customTitle?.trim() || titleMatch?.[1]?.trim() || parsedUrl.hostname;
        const marker = rawText.indexOf('Markdown Content:');
        const md =
          marker !== -1
            ? rawText.substring(marker + 'Markdown Content:'.length).trim()
            : rawText;

        const container = document.createElement('div');
        container.innerHTML = markdownToRichHtml(md, targetUrl);
        const firstImg = container.querySelector('img')?.getAttribute('src') || '';
        const { chapters, toc, wordCount } = buildChaptersFromDom(container, title, targetUrl);

        return {
          kind: 'rich-book',
          sourceLabel: parsedUrl.hostname.replace(/^www\./, ''),
          book: {
            title,
            author: parsedUrl.hostname.replace(/^www\./, ''),
            description: '',
            coverDataUrl: firstImg,
            chapters,
            toc,
            wordCount,
          },
        };
      }
    }
  } catch {
    // Jina timed out or failed
  }

  if (jinaBlocked) {
    throw new Error(
      `${parsedUrl.hostname} requires a CAPTCHA / human verification check and blocks automated readers. Open it in your browser, save the page as PDF or HTML (Ctrl+P / Ctrl+S), and import that file directly.`
    );
  }

  throw new Error(
    'Could not fetch article or document. The source might be private, behind a paywall, or blocking automated readers.'
  );
}
