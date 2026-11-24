import React, { useEffect, useState, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Book } from '../../types';
import { cbzService } from '../../services/cbzService';
import { getBookFile } from '../../lib/db';
import { BlinkingDots } from '../ui/LoadingState';
import { BookOpen } from 'lucide-react';

// In-memory cache for PDF rendered thumbnail data URLs so they only render once
const pdfThumbCache = new Map<string, Map<number, string>>();

interface PageGridViewProps {
  book: Book;
  currentPage: number;
  onSelectPage: (pageNumber: number) => void;
  onClose: () => void;
  isVisible?: boolean;
}

export const PageGridView: React.FC<PageGridViewProps> = ({
  book,
  currentPage,
  onSelectPage,
  onClose,
  isVisible = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [totalPages, setTotalPages] = useState<number>(() => Math.max(1, book.pageCount || 1));
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [jumpInput, setJumpInput] = useState('');
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<number | null>(null);

  // 1. Initialize book plate data off the main thread
  useEffect(() => {
    let active = true;

    if (book.fileType === 'cbz') {
      const cached = cbzService.getCachedPages(book.id);
      if (cached && cached.length > 0) {
        setTotalPages(cached.length);
      } else {
        cbzService.init(book.id, book.fileData).then((pages) => {
          if (active && pages.length > 0) {
            setTotalPages(pages.length);
          }
        }).catch((err) => {
          console.warn('Failed to load CBZ pages:', err);
        });
      }
    } else if (book.fileType === 'pdf') {
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      }
      const loadPdf = async () => {
        try {
          const fileData = book.fileData || (await getBookFile(book.id));
          if (!fileData || !active) return;
          const doc = await pdfjsLib.getDocument({
            data: new Uint8Array(fileData.slice(0)),
            cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/cmaps/',
            cMapPacked: true,
          }).promise;
          if (active) {
            setPdfDoc(doc);
            if (doc.numPages > 0) setTotalPages(doc.numPages);
          }
        } catch (err) {
          console.warn('Failed to load PDF doc for grid:', err);
        }
      };
      loadPdf();
    }

    return () => {
      active = false;
    };
  }, [book.id, book.fileType, book.fileData]);

  // 2. High-performance scroll listener to pause decompression while actively scrolling
  const handleScroll = useCallback(() => {
    if (!isScrolling) {
      setIsScrolling(true);
    }
    if (scrollTimeoutRef.current) {
      window.clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = window.setTimeout(() => {
      setIsScrolling(false);
    }, 120);
  }, [isScrolling]);

  // 3. Smooth auto-scroll to current page when drawer opens or page changes
  useEffect(() => {
    if (!isVisible) return;
    const timer = setTimeout(() => {
      const targetEl = document.getElementById(`grid-page-card-${currentPage}`);
      if (targetEl && containerRef.current) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [currentPage, isVisible]);

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseInt(jumpInput, 10);
    if (!isNaN(target) && target >= 1 && target <= totalPages) {
      React.startTransition(() => {
        onSelectPage(target);
      });
      onClose();
    }
  };

  // Generate page numbers array (1..totalPages)
  const pageNumbers = React.useMemo(() => {
    const arr: number[] = new Array(totalPages);
    for (let i = 0; i < totalPages; i++) {
      arr[i] = i + 1;
    }
    return arr;
  }, [totalPages]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[var(--bg-primary)]">
      {/* Quick Jump & Metrics Header */}
      <div className="px-4 py-2.5 border-b border-[var(--border-color)]/70 flex items-center justify-between gap-3 text-xs bg-[var(--bg-surface)]/40 shrink-0">
        <span className="text-[var(--text-muted)] font-medium shrink-0">
          {totalPages} {totalPages === 1 ? 'Page' : 'Pages'}
        </span>

        {/* Clean Quick Jump Input - Generous width, no stepper arrows, no text cutoff */}
        <form onSubmit={handleJumpSubmit} className="flex items-center gap-1.5 shrink-0">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder={`Go to (1-${totalPages})`}
            value={jumpInput}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9]/g, '');
              setJumpInput(val);
            }}
            className="w-36 sm:w-40 px-3 py-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#0071E3] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none shadow-2xs font-num"
          />
          <button
            type="submit"
            disabled={!jumpInput}
            className="px-3 py-1 rounded-lg bg-[#0071E3] text-white text-xs font-medium disabled:opacity-40 cursor-pointer shadow-2xs hover:bg-[#0066CC] transition-colors"
          >
            Go
          </button>
        </form>
      </div>

      {/* Butter-Smooth 120 FPS 3-Column Visual Grid */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 select-none no-scrollbar will-change-scroll"
      >
        <div className="grid grid-cols-3 gap-3.5 sm:gap-4">
          {pageNumbers.map((pageNum) => (
            <GridPageCard
              key={pageNum}
              id={`grid-page-card-${pageNum}`}
              pageNum={pageNum}
              isCurrent={pageNum === currentPage}
              bookId={book.id}
              fileType={book.fileType}
              pdfDoc={pdfDoc}
              isScrolling={isScrolling}
              containerEl={containerRef.current}
              onSelect={() => {
                React.startTransition(() => {
                  onSelectPage(pageNum);
                });
                onClose();
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

interface GridPageCardProps {
  id: string;
  pageNum: number;
  isCurrent: boolean;
  bookId: string;
  fileType: string;
  pdfDoc: pdfjsLib.PDFDocumentProxy | null;
  isScrolling: boolean;
  containerEl: HTMLElement | null;
  onSelect: () => void;
}

const GridPageCard: React.FC<GridPageCardProps> = React.memo(
  ({
    id,
    pageNum,
    isCurrent,
    bookId,
    fileType,
    pdfDoc,
    isScrolling,
    containerEl,
    onSelect,
  }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [inView, setInView] = useState(false);
    const [imageUrl, setImageUrl] = useState<string | null>(() => {
      if (fileType === 'cbz') {
        return cbzService.getCachedPlateUrl(bookId, pageNum);
      }
      if (fileType === 'pdf') {
        return pdfThumbCache.get(bookId)?.get(pageNum) || null;
      }
      return null;
    });
    const [loading, setLoading] = useState(false);

    // 1. Intersection Observer with 250px margin for natural preloading before entering viewport
    useEffect(() => {
      const el = cardRef.current;
      if (!el) return;

      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            setInView(true);
          }
        },
        {
          root: containerEl,
          rootMargin: '250px 0px 250px 0px',
        }
      );

      observer.observe(el);
      return () => observer.disconnect();
    }, [containerEl]);

    // 2. Fetch image when in view and scroll is at rest (or immediate if cached)
    useEffect(() => {
      if (!inView) return;

      // 0ms instant display if already in cache
      if (fileType === 'cbz') {
        const cached = cbzService.getCachedPlateUrl(bookId, pageNum);
        if (cached) {
          setImageUrl(cached);
          setLoading(false);
          return;
        }

        // Only request worker decompression when scroll is idle
        if (isScrolling) return;

        let active = true;
        setLoading(true);
        cbzService.getPlateBlobUrl(bookId, pageNum).then((url) => {
          if (!active) return;
          if (url) {
            setImageUrl(url);
          }
          setLoading(false);
        });

        return () => {
          active = false;
        };
      }

      if (fileType === 'pdf' && pdfDoc) {
        let bookPdfs = pdfThumbCache.get(bookId);
        if (!bookPdfs) {
          bookPdfs = new Map();
          pdfThumbCache.set(bookId, bookPdfs);
        }

        if (bookPdfs.has(pageNum)) {
          setImageUrl(bookPdfs.get(pageNum)!);
          setLoading(false);
          return;
        }

        if (isScrolling) return;

        let active = true;
        setLoading(true);

        const renderPdfThumb = async () => {
          try {
            const page = await pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: 0.22 });
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');
            if (ctx && active) {
              await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
              const url = canvas.toDataURL('image/jpeg', 0.75);
              bookPdfs!.set(pageNum, url);
              if (active) {
                setImageUrl(url);
                setLoading(false);
              }
            }
          } catch (err) {
            console.warn(`PDF thumb ${pageNum} failed:`, err);
            if (active) setLoading(false);
          }
        };

        renderPdfThumb();

        return () => {
          active = false;
        };
      }
    }, [inView, isScrolling, fileType, bookId, pageNum, pdfDoc]);

    return (
      <div
        id={id}
        ref={cardRef}
        onClick={onSelect}
        className="page-grid-item p-0.5 flex flex-col items-center gap-1.5 group cursor-pointer"
      >
        {/* Premium Apple Calm Thumbnail Card Frame - Real CSS Border Fully Visible on All 4 Sides */}
        <div
          className={`relative w-full aspect-[3/4] rounded-xl overflow-hidden transition-colors duration-150 bg-[var(--bg-card)] ${
            isCurrent
              ? 'border-2 border-[#0071E3] dark:border-[#2997FF] shadow-sm'
              : 'border border-[var(--border-color)]/80 hover:border-[#0071E3]/50 shadow-2xs hover:shadow-xs'
          }`}
        >
          {fileType !== 'cbz' && fileType !== 'pdf' ? (
            /* Clean Minimalist Reflowable Page Card */
            <div className="w-full h-full p-2.5 flex flex-col justify-between bg-transparent select-none">
              <div className="flex items-center justify-between border-b border-[var(--border-color)]/50 pb-1.5">
                <span className="text-[9px] font-semibold text-[var(--text-muted)] tracking-wider">
                  PAGE {pageNum}
                </span>
                <BookOpen
                  className={`w-3 h-3 ${
                    isCurrent ? 'text-[#0071E3] dark:text-[#2997FF]' : 'text-[var(--text-muted)]'
                  }`}
                />
              </div>

              <div className="space-y-1.5 py-1.5">
                <div
                  className={`h-1 rounded-full w-4/5 ${
                    isCurrent
                      ? 'bg-[#0071E3]/40 dark:bg-[#2997FF]/40'
                      : 'bg-[var(--text-muted)]/25'
                  }`}
                />
                <div className="h-1 bg-[var(--text-muted)]/15 rounded-full w-full" />
                <div className="h-1 bg-[var(--text-muted)]/15 rounded-full w-11/12" />
                <div className="h-1 bg-[var(--text-muted)]/15 rounded-full w-full" />
                <div className="h-1 bg-[var(--text-muted)]/20 rounded-full w-3/4" />
              </div>

              <div className="h-1" />
            </div>
          ) : imageUrl ? (
            <img
              src={imageUrl}
              alt={`Page ${pageNum}`}
              className="w-full h-full object-cover object-top"
              loading="lazy"
              decoding="async"
            />
          ) : loading ? (
            <div className="flex items-center justify-center w-full h-full bg-[var(--bg-card)]">
              <BlinkingDots size="sm" color="bg-[#0071E3]" />
            </div>
          ) : (
            <div className="flex items-center justify-center w-full h-full text-[10px] text-[var(--text-muted)] font-num">
              p. {pageNum}
            </div>
          )}
        </div>

        {/* Page Number Label */}
        <span
          className={`text-[12px] font-medium font-num tracking-tight transition-colors ${
            isCurrent
              ? 'text-[#0071E3] dark:text-[#2997FF] font-semibold'
              : 'text-[var(--text-muted)] group-hover:text-[var(--text-primary)]'
          }`}
        >
          {pageNum}
        </span>
      </div>
    );
  }
);

GridPageCard.displayName = 'GridPageCard';
