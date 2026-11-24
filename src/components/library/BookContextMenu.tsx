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
  const menuWidth = 200;
  let left = position.x;
  if (left + menuWidth > window.innerWidth - 16) {
    left = window.innerWidth - menuWidth - 16;
  }
  let top = position.y;
  if (top + 220 > window.innerHeight) {
    top = position.y - 220;
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.12 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: `${top}px`,
            left: `${left}px`,
            width: `${menuWidth}px`,
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-color)',
          }}
          className="rounded-2xl border shadow-2xl p-1.5 text-[var(--text-primary)] z-50 select-none space-y-0.5 text-xs [background-clip:padding-box] [outline:none] [transform:translateZ(0)]"
        >
          {/* Header */}
          <div className="px-2.5 py-1.5 border-b border-[var(--border-color)] flex items-center justify-between">
            <span className="font-semibold text-[10px] uppercase tracking-wider text-[var(--text-muted)] truncate max-w-[130px]">
              {book.title}
            </span>
            <button
              onClick={onClose}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition cursor-pointer"
            >
              <X className="w-3 h-3" />
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
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition text-left cursor-pointer"
            >
              <Palette className="w-3.5 h-3.5 text-[#0071E3] dark:text-[#2997FF]" />
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
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition text-left cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-[#0071E3] dark:text-[#2997FF]" />
            <span>{book.status === 'completed' ? 'Mark as Unread' : 'Mark as Finished'}</span>
          </button>

          {/* Reset Progress */}
          <button
            type="button"
            onClick={() => {
              onResetProgress(book);
              onClose();
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition text-left cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#0071E3] dark:text-[#2997FF]" />
            <span>Reset Progress</span>
          </button>

          {/* Export Notes */}
          <button
            type="button"
            onClick={() => {
              onExportNotes(book);
              onClose();
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition text-left cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#0071E3] dark:text-[#2997FF]" />
            <span>Export Notes (.md)</span>
          </button>

          <div className="my-1 border-t border-[var(--border-color)]" />

          {/* Delete Book */}
          <button
            type="button"
            onClick={() => {
              onDelete(book);
              onClose();
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-[#D92D20] dark:text-[#FF453A] hover:bg-rose-50 dark:hover:bg-rose-950/30 transition text-left cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Book</span>
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
