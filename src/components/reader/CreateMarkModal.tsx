import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HighlightColor } from '../../types';
import { MapPin, X, Check } from 'lucide-react';

interface CreateMarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  pageNumber: number;
  chapterIndex?: number;
  position: { x: number; y: number };
  onSaveMark: (data: { color: HighlightColor; note: string; text: string }) => void;
}

const COLORS: { key: HighlightColor; label: string; bg: string; border: string; text: string }[] = [
  { key: 'amber', label: 'Amber', bg: 'bg-amber-400', border: 'border-amber-400', text: 'text-amber-900' },
  { key: 'sage', label: 'Sage', bg: 'bg-emerald-400', border: 'border-emerald-400', text: 'text-emerald-950' },
  { key: 'sky', label: 'Sky', bg: 'bg-sky-400', border: 'border-sky-400', text: 'text-sky-950' },
  { key: 'rose', label: 'Rose', bg: 'bg-rose-400', border: 'border-rose-400', text: 'text-rose-950' },
];

export const CreateMarkModal: React.FC<CreateMarkModalProps> = ({
  isOpen,
  onClose,
  pageNumber,
  position,
  onSaveMark,
}) => {
  const [selectedColor, setSelectedColor] = useState<HighlightColor>('amber');
  const [note, setNote] = useState('');
  const [label, setLabel] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalNote = note.trim();
    const finalLabel = label.trim() || (finalNote ? finalNote.slice(0, 36) : `Mark on Page ${pageNumber}`);

    onSaveMark({
      color: selectedColor,
      note: finalNote,
      text: finalLabel,
    });
    setNote('');
    setLabel('');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none">
        {/* Backdrop Scrim */}
        <motion.div
          key="create-mark-scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.14 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/25 dark:bg-black/60 backdrop-blur-xs"
        />

        {/* Modal Dialog */}
        <motion.div
          key="create-mark-dialog"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-color)',
          }}
          className="relative w-full max-w-md rounded-3xl border shadow-2xl p-6 text-[var(--text-primary)] z-10 space-y-4 [background-clip:padding-box]"
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-3 border-b border-[var(--border-color)]">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#0071E3]/10 dark:bg-[#2997FF]/15 border border-[#0071E3]/20 flex items-center justify-center text-[#0071E3] dark:text-[#2997FF] shadow-2xs">
                <MapPin className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold tracking-tight text-[var(--text-primary)]">
                  Add Page Mark
                </h3>
                <p className="text-[11px] text-[var(--text-muted)] font-normal">
                  Page {pageNumber} · Pin an annotation or reflection
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

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Color Selection */}
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                Mark Color
              </label>
              <div className="grid grid-cols-4 gap-2">
                {COLORS.map((c) => {
                  const isSelected = selectedColor === c.key;
                  return (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setSelectedColor(c.key)}
                      className={`py-2 px-2.5 rounded-xl border flex items-center justify-center gap-1.5 transition cursor-pointer text-xs font-medium ${
                        isSelected
                          ? 'border-[#0071E3] bg-[#0071E3]/10 text-[var(--text-primary)] ring-1 ring-[#0071E3]'
                          : 'border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <span className={`w-3 h-3 rounded-full ${c.bg} shrink-0`} />
                      <span>{c.label}</span>
                      {isSelected && <Check className="w-3 h-3 text-[#0071E3] ml-auto shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Annotation Textarea */}
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                Annotation & Reflection
              </label>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Write your personal thoughts, key question, or reflection here..."
                className="w-full p-3 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)]/60 focus:outline-none focus:border-[#0071E3] transition resize-none"
                autoFocus
              />
            </div>

            {/* Optional Short Label */}
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                Label / Title (Optional)
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Core Principle, Exam Concept, Question"
                className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-[13px] text-[var(--text-primary)] placeholder-[var(--text-muted)]/60 focus:outline-none focus:border-[#0071E3] transition"
              />
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-color)]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-surface)] hover:bg-[var(--bg-card)] text-[12.5px] font-medium text-[var(--text-primary)] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary !py-2 !px-5 text-[12.5px] cursor-pointer flex items-center gap-1.5"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Place Mark</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
