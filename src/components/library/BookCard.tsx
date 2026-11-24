import React from 'react';
import { motion } from 'framer-motion';
import { Book } from '../../types';
import { MoreVertical, CheckCircle2 } from 'lucide-react';
import { BookCoverPlaceholder } from './BookCoverPlaceholder';

interface BookCardProps {
  book: Book;
  onOpen: (book: Book) => void;
  onContextMenu: (e: React.MouseEvent, book: Book) => void;
}

export const BookCard: React.FC<BookCardProps> = ({ book, onOpen, onContextMenu }) => {
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

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="group relative flex flex-col cursor-pointer select-none"
      onClick={() => onOpen(book)}
    >
      {/* Book Cover Container with Spine Shadow & Hairline Frame */}
      <div className="relative aspect-[1/1.45] w-full rounded-2xl overflow-hidden bg-[var(--bg-surface)] shadow-md group-hover:shadow-xl group-hover:shadow-black/20 transition-all duration-300 border border-[var(--border-color)]">
        {/* Cover Image or Aesthetic Fallback */}
        {book.coverDataUrl &&
        book.fileType !== 'md' &&
        book.fileType !== 'txt' &&
        !book.coverDataUrl.includes('FOLIO EDITORIAL') ? (
          <img
            src={book.coverDataUrl}
            alt={book.title}
            className="w-full h-full object-cover object-center transform group-hover:scale-102 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <BookCoverPlaceholder book={book} size="card" />
        )}

        {/* Realistic Book Spine Shadow effect along the left edge */}
        <div className="absolute top-0 bottom-0 left-0 w-3.5 bg-gradient-to-r from-black/35 via-black/15 to-transparent pointer-events-none" />

        {/* Format Badge (Shown on uploaded cover images) */}
        {book.coverDataUrl &&
        book.fileType !== 'md' &&
        book.fileType !== 'txt' &&
        !book.coverDataUrl.includes('FOLIO EDITORIAL') && (
          <div className="absolute top-2.5 left-3">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-black/50 text-white/95 backdrop-blur-md border border-white/15 shadow-xs">
              {book.fileType}
            </span>
          </div>
        )}

        {/* Context Menu Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onContextMenu(e, book);
          }}
          className="absolute top-2.5 right-2.5 z-30 p-1.5 rounded-full bg-black/50 hover:bg-black/75 text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity shadow-sm cursor-pointer"
          title="Book options"
        >
          <MoreVertical className="w-3.5 h-3.5" />
        </button>

        {/* Completed Checkmark Stamp */}
        {isComplete && (
          <div className="absolute top-2.5 right-2.5 z-20 p-1 rounded-full bg-[#0071E3] text-white shadow-md group-hover:opacity-0 transition-opacity pointer-events-none">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
        )}

        {/* Progress Bar inside cover bottom */}
        {percent > 0 && !isComplete && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/20 backdrop-blur-xs">
            <div
              className="h-full bg-[#0071E3] dark:bg-[#2997FF] transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
        )}
      </div>

      {/* Book Metadata Below Cover */}
      <div className="mt-3 px-0.5 flex flex-col">
        <h3 className="text-[14px] font-semibold text-[var(--text-primary)] group-hover:text-[#0071E3] dark:group-hover:text-[#2997FF] transition-colors line-clamp-1 leading-snug tracking-[-0.01em]">
          {book.title}
        </h3>
        <p className="text-[13px] font-normal text-[var(--text-muted)] line-clamp-1 mt-0.5">
          {book.author}
        </p>

        {/* Reading Progress Pill with Crisp Number Font */}
        <div className="mt-1.5 flex items-center justify-between text-[12px] text-[var(--text-primary)] font-num font-medium">
          <span>
            {isComplete ? (
              <span className="text-[#0071E3] dark:text-[#2997FF] font-medium">Finished</span>
            ) : percent > 0 ? (
              `${percent}% read`
            ) : (
              'Unopened'
            )}
          </span>
          {book.pageCount > 0 && (
            <span className="text-[var(--text-muted)]">
              {book.currentPage || 1}/{book.pageCount} p.
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};
