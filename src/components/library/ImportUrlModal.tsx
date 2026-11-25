import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe,
  X,
  Link,
  ClipboardPaste,
  Compass,
  BookOpen,
  AlertCircle,
} from 'lucide-react';
import { BlinkingDots } from '../ui/LoadingState';
import { detectFileType } from '../../lib/parsers/sniffer';
import { isWikipediaUrl, fetchWikipediaArticle, WikipediaParsedBook } from '../../lib/parsers/wikipediaParser';

export interface ImportUrlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveWebArticle: (title: string, author: string, content: string) => Promise<void>;
  onSaveBinaryBook?: (file: File) => Promise<void>;
  onSaveWikipediaBook?: (wikiBook: WikipediaParsedBook) => Promise<void>;
}

export const ImportUrlModal: React.FC<ImportUrlModalProps> = ({
  isOpen,
  onClose,
  onSaveWebArticle,
  onSaveBinaryBook,
  onSaveWikipediaBook,
}) => {
  const [url, setUrl] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const sampleLinks = [
    {
      label: 'NCERT Science (PDF)',
      url: 'https://ncert.nic.in/textbook/pdf/iesc107.pdf',
    },
    {
      label: 'Typography (Wikipedia)',
      url: 'https://en.wikipedia.org/wiki/Typography',
    },
    {
      label: 'Self-Reliance (Emerson)',
      url: 'https://en.wikipedia.org/wiki/Self-Reliance',
    },
  ];

  const handlePasteClipboard = async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      if (clipText && (clipText.startsWith('http://') || clipText.startsWith('https://'))) {
        setUrl(clipText.trim());
        setErrorMessage('');
      }
    } catch (err) {
      console.warn('Could not read clipboard:', err);
    }
  };

  const cleanArticleContent = (rawText: string, originalUrl: string) => {
    let title = '';
    let author = '';
    let markdown = rawText;

    const titleMatch = rawText.match(/^Title:\s*(.+)$/m);
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1].trim();
    }

    const domainMatch = originalUrl.match(/^https?:\/\/(?:www\.)?([^/?#]+)/i);
    author = domainMatch ? domainMatch[1] : 'Web Article';

    const contentMarker = rawText.indexOf('Markdown Content:');
    if (contentMarker !== -1) {
      markdown = rawText.substring(contentMarker + 'Markdown Content:'.length).trim();
    }

    // Clean up excessive empty lines
    markdown = markdown.replace(/\n{3,}/g, '\n\n');

    return {
      title: title || 'Web Article',
      author,
      content: markdown,
    };
  };

  const handleFetchAndImport = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetUrl = url.trim();
    if (!targetUrl || isLoading) return;

    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      setErrorMessage('Please enter a valid web URL starting with https:// or http://');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setStatusMessage('Connecting to web source...');

    try {
      // 0. Detect Wikipedia links for rich encyclopedia import (images, full layout, sections)
      if (isWikipediaUrl(targetUrl)) {
        setStatusMessage('Extracting Wikipedia article & media layout...');
        const wikiBook = await fetchWikipediaArticle(targetUrl);
        if (customTitle.trim()) {
          wikiBook.title = customTitle.trim();
        }

        if (onSaveWikipediaBook) {
          await onSaveWikipediaBook(wikiBook);
        } else {
          await onSaveWebArticle(
            wikiBook.title,
            wikiBook.author,
            wikiBook.chapters.map((c) => `# ${c.title}\n\n${c.content}`).join('\n\n')
          );
        }

        onClose();
        setUrl('');
        setCustomTitle('');
        return;
      }

      // 1. Detect if the URL indicates a direct document file
      let urlPath = '';
      let isLikelyDocument = false;
      try {
        const parsed = new URL(targetUrl);
        urlPath = parsed.pathname;
        if (/\.(pdf|epub|cbz|cbr|mobi|azw3?|fb2|rtf)$/i.test(urlPath)) {
          isLikelyDocument = true;
        }
      } catch {
        // Ignore parse error; fetch will validate
      }

      setStatusMessage(isLikelyDocument ? 'Downloading document stream...' : 'Connecting to reader engine...');

      // 2. Fetch via local proxy endpoint (/api/proxy?url=...) which manages CORS, TLS certs, and chunked downloads
      let proxyBuffer: ArrayBuffer | null = null;
      let contentType = '';

      try {
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(targetUrl)}`;
        const res = await fetch(proxyUrl);
        if (res.ok) {
          contentType = res.headers.get('content-type') || '';
          proxyBuffer = await res.arrayBuffer();
        }
      } catch (proxyErr) {
        console.warn('Local proxy fetch failed, falling back:', proxyErr);
      }

      // If this is a direct document URL (e.g., NCERT PDF) and proxy failed, try direct fetch & binary CORS proxy
      if ((!proxyBuffer || proxyBuffer.byteLength === 0) && isLikelyDocument) {
        setStatusMessage('Trying direct document download...');
        try {
          const directRes = await fetch(targetUrl);
          if (directRes.ok) {
            contentType = directRes.headers.get('content-type') || '';
            proxyBuffer = await directRes.arrayBuffer();
          }
        } catch {
          // Ignore direct CORS error
        }

        if (!proxyBuffer || proxyBuffer.byteLength === 0) {
          setStatusMessage('Trying binary proxy fallback...');
          try {
            const binCorsUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
            const corsRes = await fetch(binCorsUrl);
            if (corsRes.ok) {
              contentType = corsRes.headers.get('content-type') || '';
              proxyBuffer = await corsRes.arrayBuffer();
            }
          } catch {
            // Ignore
          }
        }
      }

      // Check if the downloaded payload is an ebook or binary document (PDF, EPUB, CBZ, MOBI, FB2, RTF)
      if (proxyBuffer && proxyBuffer.byteLength > 0) {
        let rawFileName = 'document';
        if (urlPath) {
          const segments = urlPath.split('/').filter(Boolean);
          if (segments.length > 0) {
            rawFileName = decodeURIComponent(segments[segments.length - 1]);
          }
        }

        const detected = detectFileType(proxyBuffer, rawFileName);
        const isBinaryMime = /application\/(pdf|epub\+zip|x-mobipocket-ebook|x-cbz|x-cbr)/i.test(contentType);

        if (
          (detected && ['pdf', 'epub', 'cbz', 'mobi', 'azw3', 'fb2', 'rtf'].includes(detected)) ||
          isBinaryMime
        ) {
          const finalExt =
            detected && ['pdf', 'epub', 'cbz', 'mobi', 'azw3', 'fb2', 'rtf'].includes(detected)
              ? detected
              : 'pdf';

          // Guard against HTML error pages masquerading as .pdf URLs
          if (finalExt === 'pdf') {
            const headBytes = new Uint8Array(proxyBuffer.slice(0, 1024));
            const headStr = Array.from(headBytes).map((b) => String.fromCharCode(b)).join('');
            if (!headStr.includes('%PDF-')) {
              throw new Error(
                'The URL did not return a valid PDF file (the server may have returned an error page or blocked access).'
              );
            }
          }

          setStatusMessage(`Importing ${finalExt.toUpperCase()} document...`);

          let finalFileName = rawFileName;
          if (!finalFileName.toLowerCase().endsWith(`.${finalExt}`)) {
            finalFileName = `${finalFileName}.${finalExt}`;
          }

          if (customTitle.trim()) {
            finalFileName = `${customTitle.trim().replace(/[/\\?%*:|"<>]/g, '-')}.${finalExt}`;
          }

          const file = new File([proxyBuffer], finalFileName, {
            type: contentType || 'application/octet-stream',
          });

          if (onSaveBinaryBook) {
            await onSaveBinaryBook(file);
          }
          onClose();
          setUrl('');
          setCustomTitle('');
          return;
        }
      }

      // Never fall back to Jina Reader text extraction for PDF/binary document URLs
      if (isLikelyDocument) {
        throw new Error(
          'Could not download this PDF/document directly. The host server may be unreachable or blocking downloads.'
        );
      }

      // 3. Fallback or standard Web Article flow: Jina Reader API / AllOrigins
      setStatusMessage('Extracting readable article content...');
      let rawText = '';
      let fetchSuccess = false;

      // Attempt Jina Reader API
      try {
        const jinaUrl = `https://r.jina.ai/${encodeURIComponent(targetUrl)}`;
        const res = await fetch(jinaUrl, {
          headers: { Accept: 'text/plain' },
        });
        if (res.ok) {
          rawText = await res.text();
          if (rawText && rawText.length > 80 && !rawText.includes('Markdown Content:\n\n')) {
            fetchSuccess = true;
          }
        }
      } catch (jinaErr) {
        console.warn('Jina fetch error, trying proxy fallback:', jinaErr);
      }

      // Attempt Proxy Text
      if (!fetchSuccess && proxyBuffer) {
        const decoded = new TextDecoder('utf-8').decode(proxyBuffer);
        if (decoded && decoded.trim().length > 80) {
          rawText = decoded;
          fetchSuccess = true;
        }
      }

      // Fallback: AllOrigins CORS proxy
      if (!fetchSuccess) {
        setStatusMessage('Attempting clean proxy fetch...');
        try {
          const fallbackUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
          const fallbackRes = await fetch(fallbackUrl);
          if (fallbackRes.ok) {
            rawText = await fallbackRes.text();
            if (rawText && rawText.length > 80) {
              fetchSuccess = true;
            }
          }
        } catch (fallbackErr) {
          console.warn('AllOrigins proxy fetch error:', fallbackErr);
        }
      }

      if (!fetchSuccess || !rawText.trim()) {
        throw new Error(
          'Could not fetch article or document. The source might be private, behind a paywall, or blocking automated readers.'
        );
      }

      setStatusMessage('Formatting for Inkead Reader...');
      const cleaned = cleanArticleContent(rawText, targetUrl);

      const finalTitle = customTitle.trim() || cleaned.title;
      const finalAuthor = cleaned.author;

      await onSaveWebArticle(finalTitle, finalAuthor, cleaned.content);
      onClose();
      setUrl('');
      setCustomTitle('');
    } catch (err: unknown) {
      console.error('Import URL failure:', err);
      const msg = err instanceof Error ? err.message : 'Failed to fetch article or document.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none">
          {/* Backdrop */}
          <motion.div
            key="import-url-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-xs"
          />

          {/* Modal Container - Solid, Zero-Scale, Zero-Jitter Pure Fade */}
          <motion.div
            key="import-url-dialog"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-color)',
            }}
            className="relative w-full max-w-xl rounded-3xl border shadow-2xl p-6 sm:p-7 text-[var(--text-primary)] z-10 overflow-hidden [background-clip:padding-box] [outline:none] flex flex-col space-y-5"
          >
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-[var(--border-color)]/70">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 dark:bg-indigo-400/15 border border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-2xs">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
                    Import from Web Browser
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] font-normal mt-0.5">
                    Extract articles, essays, and direct books (PDF, EPUB) into clean offline readable books.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleFetchAndImport} className="space-y-4">
              {/* URL Input */}
              <div>
                <label className="block text-[11.5px] font-medium uppercase tracking-wider text-[var(--text-muted)] mb-1">
                  Article or Document URL
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-[var(--text-muted)] pointer-events-none">
                    <Link className="w-4 h-4" />
                  </div>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => {
                      setUrl(e.target.value);
                      setErrorMessage('');
                    }}
                    placeholder="https://ncert.nic.in/textbook/pdf/iesc107.pdf"
                    className="w-full pl-10 pr-24 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-[13.5px] text-[var(--text-primary)] placeholder-[var(--text-muted)]/60 focus:outline-none focus:border-[#0071E3] transition"
                    autoFocus
                  />
                  <div className="absolute right-2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handlePasteClipboard}
                      className="px-2.5 py-1 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-surface)] border border-[var(--border-color)] text-[11.5px] font-medium text-[var(--text-primary)] transition flex items-center gap-1 shadow-2xs cursor-pointer"
                    >
                      <ClipboardPaste className="w-3 h-3 text-indigo-500" />
                      <span>Paste</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Optional Custom Title Override */}
              <div>
                <label className="block text-[11.5px] font-medium uppercase tracking-wider text-[var(--text-muted)] mb-1">
                  Custom Title (Optional)
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="Leave blank to auto-detect page or document title"
                  className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-[13.5px] text-[var(--text-primary)] placeholder-[var(--text-muted)]/60 focus:outline-none focus:border-[#0071E3] transition"
                />
              </div>

              {/* Sample Quick-Links */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11.5px] text-[var(--text-muted)] flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 text-[#0071E3] dark:text-[#2997FF]" />
                  <span>Try Sample:</span>
                </span>
                {sampleLinks.map((sample) => (
                  <button
                    key={sample.url}
                    type="button"
                    onClick={() => {
                      setUrl(sample.url);
                      setErrorMessage('');
                    }}
                    className="text-[11.5px] px-2.5 py-1 rounded-full bg-[var(--bg-surface)] hover:bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] transition cursor-pointer"
                  >
                    {sample.label}
                  </button>
                ))}
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-start gap-2 leading-relaxed">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Loading Status */}
              {isLoading && (
                <div className="p-3 rounded-xl bg-[#0071E3]/10 border border-[#0071E3]/20 text-[#0071E3] dark:text-[#2997FF] text-xs flex items-center gap-2.5">
                  <BlinkingDots size="sm" color="bg-[#0071E3] dark:bg-[#2997FF]" />
                  <span className="font-medium">{statusMessage}</span>
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border-color)]/70">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-surface)] hover:bg-[var(--bg-card)] text-[13px] font-medium text-[var(--text-primary)] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!url.trim() || isLoading}
                  className="btn-primary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-[13px] !py-2 !px-5"
                >
                  {isLoading ? (
                    <>
                      <BlinkingDots size="sm" color="bg-white" className="mr-1" />
                      <span>Importing...</span>
                    </>
                  ) : (
                    <>
                      <BookOpen className="w-4 h-4" />
                      <span>Fetch & Import</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
