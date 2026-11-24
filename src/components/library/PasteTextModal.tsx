import React, { useState, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  X,
  ClipboardPaste,
  BookOpen,
  RotateCcw,
  Clock,
  Hash,
} from 'lucide-react';
import { BlinkingDots } from '../ui/LoadingState';

export interface PasteTextModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveBook: (title: string, author: string, content: string, format: 'txt' | 'md') => Promise<void>;
}

export const PasteTextModal: React.FC<PasteTextModalProps> = ({
  isOpen,
  onClose,
  onSaveBook,
}) => {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [content, setContent] = useState('');
  const [format, setFormat] = useState<'md' | 'txt'>('md');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derive stats
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const estimatedMins = Math.max(1, Math.ceil(wordCount / 220));
  const chapterCount = (content.match(/^(?:#+\s+|Chapter\s+\d+|Part\s+\d+)/gim) || []).length;

  const handlePasteClipboard = async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      if (clipText) {
        setContent(clipText);
        // If title is blank, detect from first markdown heading or first line
        if (!title) {
          const match = clipText.match(/^#\s+(.+)$/m);
          if (match && match[1]) {
            setTitle(match[1].trim());
          } else {
            const firstLine = clipText.split('\n')[0].replace(/[#*_]/g, '').trim();
            if (firstLine && firstLine.length < 60) {
              setTitle(firstLine);
            }
          }
        }
      }
    } catch (err) {
      console.warn('Clipboard read error:', err);
    }
  };

  const handleClear = () => {
    setContent('');
    setTitle('');
    setAuthor('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      // Auto-fallback title if left blank
      let resolvedTitle = title.trim();
      if (!resolvedTitle) {
        const match = content.match(/^#\s+(.+)$/m);
        resolvedTitle = match && match[1] ? match[1].trim() : 'Pasted Document';
      }

      const resolvedAuthor = author.trim() || 'Notes & Excerpts';
      await onSaveBook(resolvedTitle, resolvedAuthor, content, format);
      onClose();
      handleClear();
    } catch (err) {
      console.error('Failed to save pasted text:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none">
          {/* Backdrop */}
          <motion.div
            key="paste-text-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur-xs"
          />

          {/* Modal Container - Solid, Zero-Scale, Zero-Jitter Pure Fade */}
          <motion.div
            key="paste-text-dialog"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-color)',
            }}
            className="relative w-full max-w-2xl rounded-3xl border shadow-2xl p-6 sm:p-7 text-[var(--text-primary)] z-10 overflow-hidden [background-clip:padding-box] [outline:none] flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-[var(--border-color)]/70">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 dark:bg-emerald-400/15 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-2xs">
                  <ClipboardPaste className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold tracking-tight text-[var(--text-primary)]">
                    Create from Pasted Text
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] font-normal mt-0.5">
                    Turn notes, essays, or copied markdown into a reflowable book with full typography.
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
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 pt-4 space-y-4">
              {/* Title & Author Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11.5px] font-medium uppercase tracking-wider text-[var(--text-muted)] mb-1">
                    Document Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Meditations on Stillness"
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-[13.5px] text-[var(--text-primary)] placeholder-[var(--text-muted)]/60 focus:outline-none focus:border-[#0071E3] transition"
                  />
                </div>

                <div>
                  <label className="block text-[11.5px] font-medium uppercase tracking-wider text-[var(--text-muted)] mb-1">
                    Author / Source
                  </label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="e.g., Personal Notes or Marcus Aurelius"
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-[13.5px] text-[var(--text-primary)] placeholder-[var(--text-muted)]/60 focus:outline-none focus:border-[#0071E3] transition"
                  />
                </div>
              </div>

              {/* Text Area Toolbar */}
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 p-0.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] text-[12px]">
                  <button
                    type="button"
                    onClick={() => setFormat('md')}
                    className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                      format === 'md'
                        ? 'bg-[var(--bg-card)] text-[#0071E3] dark:text-[#2997FF] shadow-2xs'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Markdown
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormat('txt')}
                    className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                      format === 'txt'
                        ? 'bg-[var(--bg-card)] text-[#0071E3] dark:text-[#2997FF] shadow-2xs'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Plain Text
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePasteClipboard}
                    className="px-2.5 py-1 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-card)] border border-[var(--border-color)] text-[12px] font-medium text-[var(--text-primary)] transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <ClipboardPaste className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Paste Clipboard</span>
                  </button>
                  {content && (
                    <button
                      type="button"
                      onClick={handleClear}
                      className="px-2 py-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] text-[12px] transition cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Content Textarea */}
              <div className="flex-1 min-h-[180px] sm:min-h-[220px] relative flex flex-col">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Paste or write your text or markdown here...&#10;&#10;# Chapter 1: The First Thought&#10;Everything you paste is formatted into comfortable pages with full ambient themes, adjustable font size, and audio soundscapes."
                  className="w-full flex-1 p-3.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-[13.5px] leading-relaxed text-[var(--text-primary)] placeholder-[var(--text-muted)]/50 focus:outline-none focus:border-[#0071E3] transition resize-none font-mono"
                />
              </div>

              {/* Live Document Stats Bar */}
              <div className="flex items-center justify-between text-[11.5px] text-[var(--text-muted)] px-1 pt-1">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Hash className="w-3 h-3" />
                    <span>{wordCount.toLocaleString()} words</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>~{estimatedMins} min read</span>
                  </span>
                  {chapterCount > 0 && (
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                      <span>{chapterCount} chapters</span>
                    </span>
                  )}
                </div>

                <span className="text-[11px] text-[var(--text-muted)] opacity-70">
                  Reflowable reader format
                </span>
              </div>

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
                  disabled={!content.trim() || isSubmitting}
                  className="btn-primary cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-[13px] !py-2 !px-5"
                >
                  {isSubmitting ? (
                    <>
                      <BlinkingDots size="sm" color="bg-white" className="mr-1" />
                      <span>Creating Book...</span>
                    </>
                  ) : (
                    <>
                      <BookOpen className="w-4 h-4" />
                      <span>Create & Read</span>
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
