import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Book } from '../../types';
import { BookOpen, ListOrdered, LayoutGrid, X, ChevronRight } from 'lucide-react';
import { PageGridView } from './PageGridView';

interface TocDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  book: Book;
  currentPage: number;
  onSelectChapter: (pageNumber: number, chapterIndex?: number) => void;
}

export const TocDrawer: React.FC<TocDrawerProps> = ({
  isOpen,
  onClose,
  book,
  currentPage,
  onSelectChapter,
}) => {
  const chapters = book.chapters || [];
  const hasChapters = chapters.length > 0;
  // If book has chapters, default to chapters outline; if no chapters (e.g. graphic novel), default to pages
  const [activeTab, setActiveTab] = useState<'chapters' | 'pages'>(() =>
    hasChapters ? 'chapters' : 'pages'
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-start">
          {/* Backdrop Scrim - Lightweight GPU composited dark overlay without expensive live blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40"
          />

          {/* Drawer Window - GPU Composited 120 FPS Butter-Smooth Slide */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{ willChange: 'transform', transform: 'translate3d(0, 0, 0)' }}
            className="relative w-full max-w-[420px] h-full bg-[var(--bg-primary)] border-r border-[var(--border-color)] shadow-2xl flex flex-col z-10 text-[var(--text-primary)]"
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-[var(--border-color)] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#0071E3]/10 text-[#0071E3] dark:text-[#2997FF]">
                  {activeTab === 'pages' ? (
                    <LayoutGrid className="w-4 h-4" />
                  ) : (
                    <ListOrdered className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                    {activeTab === 'pages' ? 'Page Navigation' : 'Contents & Chapters'}
                  </h3>
                  <p className="text-[11px] text-[var(--text-muted)] truncate max-w-[190px]">
                    {book.title}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1.5 rounded-full hover:bg-[var(--bg-surface)] transition cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Segmented View Selector: Chapters vs Pages */}
            <div className="px-4 py-2.5 border-b border-[var(--border-color)]/70 bg-[var(--bg-surface)]/50 shrink-0">
              <div className="flex items-center p-1 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('chapters')}
                  className={`flex-1 py-1.5 rounded-lg font-medium transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'chapters'
                      ? 'bg-[var(--bg-card)] text-[#0071E3] dark:text-[#2997FF] shadow-2xs'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                  <span>Chapters</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('pages')}
                  className={`flex-1 py-1.5 rounded-lg font-medium transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'pages'
                      ? 'bg-[var(--bg-card)] text-[#0071E3] dark:text-[#2997FF] shadow-2xs'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Pages</span>
                </button>
              </div>
            </div>

            {/* Main Content: Both Chapters and Pages kept mounted in DOM for 0ms instant switching */}
            <div className={`flex-1 flex flex-col min-h-0 ${activeTab === 'chapters' ? '' : 'hidden'}`}>
              {/* Chapters Outline List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-1 no-scrollbar">
                {chapters.length === 0 ? (
                  <div className="py-12 text-center text-[var(--text-muted)]">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-xs">No explicit chapters found.</p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('pages')}
                      className="mt-3 text-xs text-[#0071E3] dark:text-[#2997FF] font-medium hover:underline cursor-pointer"
                    >
                      Switch to Pages Grid View →
                    </button>
                  </div>
                ) : (
                  chapters.map((ch, idx) => {
                    const targetPage = ch.pageNumber || idx + 1;
                    const isCurrent = targetPage === currentPage;

                    return (
                      <button
                        key={ch.id || idx}
                        type="button"
                        onClick={() => {
                          React.startTransition(() => {
                            onSelectChapter(targetPage, ch.chapterIndex ?? idx);
                          });
                          onClose();
                        }}
                        className={`w-full text-left p-3 rounded-xl transition flex items-center justify-between group cursor-pointer ${
                          isCurrent
                            ? 'bg-[#0071E3]/10 text-[#0071E3] dark:text-[#2997FF] font-medium border border-[#0071E3]/20'
                            : 'text-[var(--text-primary)] hover:bg-[var(--bg-surface)] border border-transparent'
                        }`}
                      >
                        <div className="flex items-baseline gap-2.5 min-w-0 pr-2">
                          <span className="text-xs font-num font-medium text-[var(--text-muted)] shrink-0">
                            {(idx + 1).toString().padStart(2, '0')}
                          </span>
                          <span className="text-xs truncate font-medium text-[var(--text-primary)]">
                            {ch.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-xs font-num font-medium text-[var(--text-muted)]">
                            p. {targetPage}
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] group-hover:translate-x-0.5 transition" />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className={`flex-1 flex flex-col min-h-0 ${activeTab === 'pages' ? '' : 'hidden'}`}>
              <PageGridView
                book={book}
                currentPage={currentPage}
                onSelectPage={(pageNum) => {
                  React.startTransition(() => {
                    onSelectChapter(pageNum);
                  });
                }}
                onClose={onClose}
                isVisible={activeTab === 'pages'}
              />
            </div>

            {/* Bottom Progress Footer */}
            <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-surface)] text-xs text-[var(--text-muted)] font-normal flex items-center justify-between shrink-0">
              <span>Reading Position</span>
              <span className="font-num font-semibold text-xs text-[var(--text-primary)]">
                Page {currentPage} of {book.pageCount}
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
