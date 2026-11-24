import React from 'react';
import { Book } from '../../types';
import { MoreVertical, Clock } from 'lucide-react';
import { BookCoverPlaceholder } from './BookCoverPlaceholder';

interface BookListItemProps {
  book: Book;
  onOpen: (book: Book) => void;
  onContextMenu: (e: React.MouseEvent, book: Book) => void;
}

export const BookListItem: React.FC<BookListItemProps> = ({
  book,
  onOpen,
  onContextMenu,
}) => {
  const percent = book.progressPercent || 0;
  const isComplete = book.status === 'completed';

  const formatBadgeColors: Record<string, string> = {
    pdf: 'bg-rose-600/15 text-rose-900 dark:text-rose-300 border-rose-600/30',
    epub: 'bg-amber-600/15 text-amber-900 dark:text-amber-300 border-amber-600/30',
    mobi: 'bg-orange-600/15 text-orange-900 dark:text-orange-300 border-orange-600/30',
    azw3: 'bg-yellow-600/15 text-yellow-900 dark:text-yellow-300 border-yellow-600/30',
    fb2: 'bg-teal-600/15 text-teal-900 dark:text-teal-300 border-teal-600/30',
    cbz: 'bg-purple-600/15 text-purple-900 dark:text-purple-300 border-purple-600/30',
    rtf: 'bg-indigo-600/15 text-indigo-900 dark:text-indigo-300 border-indigo-600/30',
    html: 'bg-sky-600/15 text-sky-900 dark:text-sky-300 border-sky-600/30',
    md: 'bg-emerald-600/15 text-emerald-900 dark:text-emerald-300 border-emerald-600/30',
    txt: 'bg-stone-600/15 text-stone-900 dark:text-stone-300 border-stone-600/30',
  };

  const lastReadDateStr = book.lastReadAt
    ? new Date(book.lastReadAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : 'Not started';

  return (
    <div
      onClick={() => onOpen(book)}
      className="p-3.5 sm:p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[#0071E3]/50 dark:hover:border-[#2997FF]/50 shadow-xs hover:shadow-md transition-all duration-200 flex items-center justify-between gap-4 cursor-pointer select-none group"
    >
      {/* Thumbnail + Spine */}
      <div className="relative w-12 sm:w-14 aspect-[1/1.4] rounded-xl overflow-hidden bg-[var(--bg-surface)] shrink-0 shadow-xs border border-[var(--border-color)]">
        {book.coverDataUrl &&
        book.fileType !== 'md' &&
        book.fileType !== 'txt' &&
        !book.coverDataUrl.includes('FOLIO EDITORIAL') ? (
          <img
            src={book.coverDataUrl}
            alt={book.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <BookCoverPlaceholder book={book} size="thumb" />
        )}
        <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-gradient-to-r from-black/25 to-transparent pointer-events-none" />
      </div>

      {/* Title & Author Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-[var(--chip-bg)] text-[var(--chip-text)] border border-[var(--border-color)] shadow-2xs">
            {book.fileType}
          </span>
          <h3 className="text-[14px] font-semibold text-[var(--text-primary)] group-hover:text-[#0071E3] dark:group-hover:text-[#2997FF] transition-colors truncate tracking-[-0.01em]">
            {book.title}
          </h3>
        </div>
        <p className="text-[13px] font-normal text-[var(--text-muted)] truncate mt-0.5">
          {book.author}
        </p>

        {/* Progress Bar & Indicators */}
        <div className="flex items-center gap-3 mt-2">
          <div className="w-24 sm:w-36 h-1.5 bg-[var(--bg-surface)] rounded-full overflow-hidden border border-[var(--border-color)]/40">
            <div
              className="h-full bg-[#0071E3] dark:bg-[#2997FF] transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="text-[12px] font-num font-medium text-[var(--text-primary)]">
            {isComplete ? 'Finished' : `${percent}%`}
          </span>
        </div>
      </div>

      {/* Right: Last read + Context menu */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden sm:flex flex-col items-end text-right">
          <div className="flex items-center gap-1 text-[12px] font-medium text-[var(--text-muted)]">
            <Clock className="w-3.5 h-3.5 text-[#0071E3] dark:text-[#2997FF]" />
            <span className="font-num">{lastReadDateStr}</span>
          </div>
          <span className="text-[12px] font-num font-medium text-[var(--text-primary)] mt-0.5">
            {book.currentPage || 1} / {book.pageCount} p.
          </span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onContextMenu(e, book);
          }}
          className="p-2 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition cursor-pointer"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
