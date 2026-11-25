import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, RotateCcw, Download, Trash2, X, Palette } from 'lucide-react';
import { Book } from '../../types';

interface BookContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number } | null;
  book: Book | null;
  onClose: () => void;
  onToggleStatus: (book: Book) => void;
  onResetProgress: (book: Book) => void;
  onExportNotes: (book: Book) => void;
  onDelete: (book: Book) => void;
  onChangeCoverColor?: (book: Book) => void;
}

export const BookContextMenu: React.FC<BookContextMenuProps> = ({
  isOpen,
  position,
  book,
  onClose,
  onToggleStatus,
  onResetProgress,
  onExportNotes,
  onDelete,
  onChangeCoverColor,
}) => {
  if (!isOpen || !position || !book) return null;

  // Position adjustments to prevent overflowing window
  const menuWidth = 224;
  let left = position.x;
  if (left + menuWidth > window.innerWidth - 16) {
    left = window.innerWidth - menuWidth - 16;
  }
  let top = position.y;
  if (top + 250 > window.innerHeight) {
    top = position.y - 250;
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -4 }}
          transition={{ duration: 0.14, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: `${top}px`,
            left: `${left}px`,
            width: `${menuWidth}px`,
            borderColor: 'var(--border-color)',
          }}
          className="rounded-2xl border bg-[var(--bg-card)]/95 backdrop-blur-2xl shadow-[0_20px_48px_-12px_rgba(0,0,0,0.22)] p-1.5 text-[var(--text-primary)] z-50 select-none space-y-0.5 text-[13px] [background-clip:padding-box] [outline:none] [transform:translateZ(0)]"
        >
          {/* Header */}
          <div className="px-2.5 py-2 mb-0.5 border-b border-[var(--border-color)]/70 flex items-center justify-between gap-2">
            <span className="font-semibold text-[11px] uppercase tracking-wider text-[var(--text-muted)] truncate max-w-[162px]">
              {book.title}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] p-1 rounded-full transition cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Change Cover Color (For books using aesthetic cover) */}
          {(!book.coverDataUrl || book.fileType === 'md' || book.fileType === 'txt') && onChangeCoverColor && (
            <button
              type="button"
              onClick={() => {
                onChangeCoverColor(book);
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors text-left cursor-pointer"
            >
              <Palette className="w-4 h-4 text-[#0071E3] dark:text-[#2997FF] shrink-0" />
              <span>Change Cover Color</span>
            </button>
          )}

          {/* Toggle Completed */}
          <button
            type="button"
            onClick={() => {
              onToggleStatus(book);
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors text-left cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 text-[#0071E3] dark:text-[#2997FF] shrink-0" />
            <span>{book.status === 'completed' ? 'Mark as Unread' : 'Mark as Finished'}</span>
          </button>

          {/* Reset Progress */}
          <button
            type="button"
            onClick={() => {
              onResetProgress(book);
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors text-left cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-[#0071E3] dark:text-[#2997FF] shrink-0" />
            <span>Reset Progress</span>
          </button>

          {/* Export Notes */}
          <button
            type="button"
            onClick={() => {
              onExportNotes(book);
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors text-left cursor-pointer"
          >
            <Download className="w-4 h-4 text-[#0071E3] dark:text-[#2997FF] shrink-0" />
            <span>Export Notes (.md)</span>
          </button>

          <div className="my-1 border-t border-[var(--border-color)]/70" />

          {/* Delete Book */}
          <button
            type="button"
            onClick={() => {
              onDelete(book);
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl font-medium text-[#D92D20] dark:text-[#FF453A] hover:bg-rose-500/10 transition-colors text-left cursor-pointer"
          >
            <Trash2 className="w-4 h-4 shrink-0" />
            <span>Delete Book</span>
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
