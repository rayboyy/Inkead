import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Highlight, HighlightColor } from '../../types';
import { Trash2, Copy, Check, X, MessageSquare } from 'lucide-react';

interface ExistingHighlightPopoverProps {
  highlight: Highlight | null;
  rect: DOMRect | null;
  onClose: () => void;
  onUpdateColor: (id: string, color: HighlightColor) => void;
  onUpdateNote: (id: string, note: string) => void;
  onDelete: (id: string) => void;
  onCopy: (text: string) => void;
}

export const ExistingHighlightPopover: React.FC<ExistingHighlightPopoverProps> = ({
  highlight,
  rect,
  onClose,
  onUpdateColor,
  onUpdateNote,
  onDelete,
  onCopy,
}) => {
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteText, setNoteText] = useState(highlight?.note || '');

  if (!highlight || !rect) return null;

  const width = 280;
  let left = rect.left + rect.width / 2 - width / 2;
  if (left < 16) left = 16;
  if (left + width > window.innerWidth - 16) {
    left = window.innerWidth - width - 16;
  }

  let top = rect.bottom + 8;
  if (top + 160 > window.innerHeight) {
    top = rect.top - 160;
  }

  const colors: { key: HighlightColor; name: string; bgClass: string }[] = [
    { key: 'amber', name: 'Warm Amber', bgClass: 'bg-amber-400' },
    { key: 'sage', name: 'Sage Green', bgClass: 'bg-emerald-400' },
    { key: 'sky', name: 'Soft Sky', bgClass: 'bg-sky-400' },
    { key: 'rose', name: 'Dusty Rose', bgClass: 'bg-rose-400' },
  ];

  const handleSaveNote = () => {
    onUpdateNote(highlight.id, noteText.trim());
    setIsEditingNote(false);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: `${top}px`,
            left: `${left}px`,
            width: `${width}px`,
          }}
          className="rounded-2xl bg-[var(--bg-card)]/95 backdrop-blur-2xl border border-[var(--border-color)] shadow-2xl p-3.5 text-[var(--text-primary)] space-y-3 z-50 select-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between text-xs pb-2 border-b border-[var(--border-color)]">
            <div className="flex items-center gap-1.5">
              {colors.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => onUpdateColor(highlight.id, c.key)}
                  className={`w-4 h-4 rounded-full ${c.bgClass} transition-transform cursor-pointer ${
                    highlight.color === c.key ? 'ring-2 ring-[var(--text-primary)] scale-110' : 'opacity-70 hover:opacity-100'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onCopy(highlight.text)}
                title="Copy quote"
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition rounded-full cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  onDelete(highlight.id);
                  onClose();
                }}
                title="Delete highlight"
                className="p-1 text-[var(--text-muted)] hover:text-[#D92D20] hover:bg-rose-50 dark:hover:bg-rose-950/30 transition rounded-full cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition rounded-full cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quote preview */}
          <p className="text-xs italic text-[var(--text-primary)] line-clamp-2 leading-relaxed border-l-2 pl-2 border-[#0071E3] dark:border-[#2997FF]">
            "{highlight.text}"
          </p>

          {/* Note section */}
          {isEditingNote ? (
            <div className="space-y-1.5">
              <textarea
                autoFocus
                rows={2}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Edit margin note..."
                className="w-full text-xs p-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[#0071E3] resize-none font-sans"
              />
              <div className="flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsEditingNote(false)}
                  className="btn-secondary !h-7 !px-2.5 text-[11px] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveNote}
                  className="btn-primary !h-7 !px-3 text-[11px] cursor-pointer"
                >
                  <Check className="w-3 h-3" /> Save
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-2 pt-1">
              <span className="text-[11px] text-[var(--text-muted)] italic font-sans flex-1">
                {highlight.note || 'No note added.'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setNoteText(highlight.note || '');
                  setIsEditingNote(true);
                }}
                className="text-[11px] font-medium text-[#0071E3] dark:text-[#2997FF] hover:underline shrink-0 flex items-center gap-1 cursor-pointer"
              >
                <MessageSquare className="w-3 h-3" />
                {highlight.note ? 'Edit' : 'Add Note'}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
