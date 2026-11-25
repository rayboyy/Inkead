import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, BookOpen, MessageSquare, Check, X } from 'lucide-react';
import { HighlightColor } from '../../types';

interface FloatingSelectionPillProps {
  rect: DOMRect | null;
  selectedText: string;
  onHighlight: (color: HighlightColor, note?: string) => void;
  onCopy: () => void;
  onDefine: (word: string) => void;
  onClose: () => void;
}

export const FloatingSelectionPill: React.FC<FloatingSelectionPillProps> = ({
  rect,
  selectedText,
  onHighlight,
  onCopy,
  onDefine,
  onClose,
}) => {
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [selectedColor, setSelectedColor] = useState<HighlightColor>('amber');

  if (!rect || !selectedText) return null;

  // Calculate position: above selection, centered
  const pillWidth = isAddingNote ? 296 : 260;
  const pillHeight = isAddingNote ? 160 : 42;

  let left = rect.left + rect.width / 2 - pillWidth / 2;
  // Viewport clamp
  if (left < 16) left = 16;
  if (left + pillWidth > window.innerWidth - 16) {
    left = window.innerWidth - pillWidth - 16;
  }

  let top = rect.top - pillHeight - 12;
  // If too close to top of viewport, position below selection instead
  if (top < 60) {
    top = rect.bottom + 12;
  }

  const colors: { key: HighlightColor; name: string; bgClass: string; hex: string }[] = [
    { key: 'amber', name: 'Warm Amber', bgClass: 'bg-amber-400', hex: '#FBBF24' },
    { key: 'sage', name: 'Sage Green', bgClass: 'bg-emerald-400', hex: '#34D399' },
    { key: 'sky', name: 'Soft Sky', bgClass: 'bg-sky-400', hex: '#38BDF8' },
    { key: 'rose', name: 'Dusty Rose', bgClass: 'bg-rose-400', hex: '#FB7185' },
  ];

  const handleColorClick = (color: HighlightColor) => {
    setSelectedColor(color);
    if (!isAddingNote) {
      onHighlight(color);
    }
  };

  const handleSaveNote = () => {
    onHighlight(selectedColor, noteText.trim() || undefined);
    setIsAddingNote(false);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 6, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 6, scale: 0.95 }}
        style={{
          position: 'fixed',
          top: `${top}px`,
          left: `${left}px`,
          zIndex: 60,
        }}
        onClick={(e) => e.stopPropagation()}
        className={`${
          isAddingNote ? 'rounded-2xl p-2' : 'rounded-full p-1.5'
        } bg-[var(--bg-card)]/95 backdrop-blur-2xl border border-[var(--border-color)] shadow-2xl text-[var(--text-primary)] flex flex-col gap-2 select-none`}
      >
        {!isAddingNote ? (
          <div className="flex items-center gap-1.5 px-1">
            {/* Color swatches */}
            <div className="flex items-center gap-1.5 pr-1.5 border-r border-[var(--border-color)]">
              {colors.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => handleColorClick(c.key)}
                  title={`Highlight in ${c.name}`}
                  className={`w-5 h-5 rounded-full ${c.bgClass} hover:scale-115 active:scale-95 transition-transform shadow-sm cursor-pointer`}
                />
              ))}
            </div>

            {/* Add Note Button */}
            <button
              type="button"
              onClick={() => setIsAddingNote(true)}
              title="Add margin note"
              className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded-full transition cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </button>

            {/* Copy Button */}
            <button
              type="button"
              onClick={onCopy}
              title="Copy text"
              className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded-full transition cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>

            {/* Define Button */}
            <button
              type="button"
              onClick={() => onDefine(selectedText)}
              title="Define in dictionary"
              className="px-2.5 py-1 text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded-full transition flex items-center gap-1 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#0071E3] dark:text-[#2997FF]" />
              <span>Define</span>
            </button>

            {/* Dismiss */}
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-full transition ml-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="p-1.5 w-72 space-y-2.5">
            <div className="flex items-center justify-between text-xs text-[var(--text-muted)] px-0.5">
              <span className="font-semibold text-xs text-[var(--text-primary)]">Add Margin Note</span>
              <div className="flex items-center gap-1.5">
                {colors.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setSelectedColor(c.key)}
                    className={`w-3.5 h-3.5 rounded-full ${c.bgClass} ${
                      selectedColor === c.key ? 'ring-2 ring-[var(--text-primary)] scale-110' : 'opacity-70'
                    } transition-all cursor-pointer`}
                  />
                ))}
              </div>
            </div>

            <textarea
              autoFocus
              rows={2}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Jot down a thought or note..."
              className="w-full text-xs p-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[#0071E3] resize-none font-sans"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSaveNote();
                }
              }}
            />

            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setIsAddingNote(false)}
                className="btn-secondary !h-7 !px-2.5 text-[11px] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNote}
                className="btn-primary !h-7 !px-3 text-[11px] cursor-pointer"
              >
                <Check className="w-3 h-3" />
                Save Note
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
