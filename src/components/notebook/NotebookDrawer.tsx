import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Book, Highlight, ReadingSession, HighlightColor } from '../../types';
import {
  FileText,
  Download,
  Trash2,
  Edit3,
  Check,
  X,
  Search,
  Calendar,
  ExternalLink,
  BookMarked,
  MessageSquare,
  MapPin,
} from 'lucide-react';

interface NotebookDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  book: Book;
  highlights: Highlight[];
  sessions: ReadingSession[];
  onJumpToPage: (page: number, chapterIndex?: number, highlightId?: string) => void;
  onUpdateHighlightNote: (id: string, note: string) => void;
  onDeleteHighlight: (id: string) => void;
  selectedHighlightId?: string | null;
}

export const NotebookDrawer: React.FC<NotebookDrawerProps> = ({
  isOpen,
  onClose,
  book,
  highlights,
  sessions,
  onJumpToPage,
  onUpdateHighlightNote,
  onDeleteHighlight,
  selectedHighlightId,
}) => {
  const [activeTab, setActiveTab] = useState<'highlights' | 'reflections'>('highlights');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedColorFilter, setSelectedColorFilter] = useState<HighlightColor | 'all'>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNoteText, setEditNoteText] = useState('');

  // Auto-switch to highlights tab & scroll to selected item if selectedHighlightId passed
  React.useEffect(() => {
    if (isOpen && selectedHighlightId) {
      setActiveTab('highlights');
      const timer = window.setTimeout(() => {
        const el = document.getElementById(`notebook-item-${selectedHighlightId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen, selectedHighlightId]);

  const colorConfig: Record<
    HighlightColor,
    { label: string; dot: string; border: string; bg: string; text: string }
  > = {
    amber: {
      label: 'Amber',
      dot: 'bg-amber-400',
      border: 'border-l-amber-500',
      bg: 'bg-amber-500/10',
      text: 'text-amber-700 dark:text-amber-300',
    },
    sage: {
      label: 'Sage',
      dot: 'bg-emerald-400',
      border: 'border-l-emerald-500',
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-700 dark:text-emerald-300',
    },
    sky: {
      label: 'Sky',
      dot: 'bg-sky-400',
      border: 'border-l-sky-500',
      bg: 'bg-sky-500/10',
      text: 'text-sky-700 dark:text-sky-300',
    },
    rose: {
      label: 'Rose',
      dot: 'bg-rose-400',
      border: 'border-l-rose-500',
      bg: 'bg-rose-500/10',
      text: 'text-rose-700 dark:text-rose-300',
    },
  };

  const filteredHighlights = highlights.filter((h) => {
    const matchesColor = selectedColorFilter === 'all' || h.color === selectedColorFilter;
    const matchesSearch =
      searchQuery === '' ||
      h.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (h.note && h.note.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesColor && matchesSearch;
  });

  const reflectionsWithText = sessions.filter((s) => s.reflection && s.reflection.trim().length > 0);

  // Markdown Export Generator
  const exportToMarkdown = () => {
    const dateStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    let md = `# Reading Notes & Reflections\n\n`;
    md += `**Book**: ${book.title}\n`;
    md += `**Author**: ${book.author}\n`;
    md += `**Exported**: ${dateStr}\n`;
    md += `**Total Highlights**: ${highlights.length}\n\n`;
    md += `---\n\n`;

    if (highlights.length > 0) {
      md += `## Highlights & Annotations\n\n`;
      highlights.forEach((h, idx) => {
        md += `### ${idx + 1}. Page ${h.pageNumber} (${h.color.toUpperCase()})\n\n`;
        md += `> ${h.text}\n\n`;
        if (h.note) {
          md += `*Note: ${h.note}*\n\n`;
        }
        md += `*Created on ${new Date(h.createdAt).toLocaleDateString()}*\n\n`;
      });
    }

    if (reflectionsWithText.length > 0) {
      md += `## Deep Focus Session Reflections\n\n`;
      reflectionsWithText.forEach((s) => {
        md += `### Session on ${s.date} (${s.durationMinutes} min • +${s.pagesRead} pages)\n\n`;
        md += `> "${s.reflection}"\n\n`;
      });
    }

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${book.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_notes.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const startEditNote = (h: Highlight) => {
    setEditingId(h.id);
    setEditNoteText(h.note || '');
  };

  const saveEditNote = (id: string) => {
    onUpdateHighlightNote(id, editNoteText.trim());
    setEditingId(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs"
        />

        {/* Drawer Panel */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 32, stiffness: 350 }}
          className="relative w-full max-w-md sm:max-w-lg h-full bg-[var(--bg-primary)] border-l border-[var(--border-color)] shadow-2xl flex flex-col z-10 text-[var(--text-primary)] select-none no-scrollbar"
        >
          {/* Header */}
          <div className="p-5 border-b border-[var(--border-color)] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#0071E3]/10 dark:bg-[#2997FF]/15 border border-[#0071E3]/20 flex items-center justify-center text-[#0071E3] dark:text-[#2997FF]">
                  <BookMarked className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-[14px] font-semibold text-[var(--text-primary)] tracking-tight">
                    Book Notebook
                  </h3>
                  <p className="text-[11px] text-[var(--text-muted)] truncate max-w-[200px]">
                    {book.title}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={exportToMarkdown}
                  title="Export all notes to Markdown (.md)"
                  className="btn-secondary !h-8 !px-3 text-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded-full transition cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Segmented Tab Switcher */}
            <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
              <button
                type="button"
                onClick={() => setActiveTab('highlights')}
                className={`py-1.5 text-xs font-medium rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'highlights'
                    ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span>Highlights</span>
                <span className="font-num text-[11px] px-1.5 py-0.2 rounded-full bg-[var(--bg-surface)] text-[var(--text-muted)]">
                  {highlights.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('reflections')}
                className={`py-1.5 text-xs font-medium rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'reflections'
                    ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span>Reflections</span>
                <span className="font-num text-[11px] px-1.5 py-0.2 rounded-full bg-[var(--bg-surface)] text-[var(--text-muted)]">
                  {reflectionsWithText.length}
                </span>
              </button>
            </div>
          </div>

          {/* TAB 1: Highlights */}
          {activeTab === 'highlights' && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Search & Color Filter Bar */}
              <div className="p-3 border-b border-[var(--border-color)] flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search quotes or notes..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[#0071E3]"
                  />
                </div>

                {/* Color Pills */}
                <div className="flex items-center gap-1 shrink-0 bg-[var(--bg-surface)] p-1 rounded-xl border border-[var(--border-color)]">
                  <button
                    type="button"
                    onClick={() => setSelectedColorFilter('all')}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-medium transition cursor-pointer ${
                      selectedColorFilter === 'all'
                        ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-2xs'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    All
                  </button>
                  {(['amber', 'sage', 'sky', 'rose'] as HighlightColor[]).map((col) => {
                    const cfg = colorConfig[col];
                    return (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setSelectedColorFilter(col)}
                        className={`w-4 h-4 rounded-full ${cfg.dot} transition cursor-pointer ${
                          selectedColorFilter === col
                            ? 'ring-2 ring-[var(--accent)] scale-110'
                            : 'opacity-60 hover:opacity-100'
                        }`}
                        title={`Filter by ${cfg.label}`}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Highlights List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
                {filteredHighlights.length === 0 ? (
                  <div className="py-16 text-center text-[var(--text-muted)]">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-xs font-medium">No highlights match your search</p>
                    <p className="text-[11px] mt-1 max-w-xs mx-auto">
                      Select any passage while reading to create an annotation.
                    </p>
                  </div>
                ) : (
                  filteredHighlights.map((h) => {
                    const cfg = colorConfig[h.color];
                    const isSelected = selectedHighlightId === h.id;
                    const isMark = h.type === 'mark';

                    return (
                      <div
                        key={h.id}
                        id={`notebook-item-${h.id}`}
                        className={`p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] border-l-4 ${
                          cfg.border
                        } space-y-2.5 transition shadow-2xs group ${
                          isSelected ? 'ring-2 ring-[#0071E3] shadow-md' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => onJumpToPage(h.pageNumber, h.chapterIndex, h.id)}
                              className="inline-flex items-center gap-1 font-num font-semibold text-[#0071E3] dark:text-[#2997FF] hover:underline cursor-pointer"
                            >
                              <span>Page {h.pageNumber}</span>
                              <ExternalLink className="w-3 h-3 opacity-70" />
                            </button>

                            {isMark && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#0071E3]/10 text-[#0071E3] dark:text-[#2997FF] border border-[#0071E3]/20">
                                <MapPin className="w-2.5 h-2.5" />
                                <span>Mark</span>
                              </span>
                            )}
                          </div>

                          <span className="font-num text-[11px] text-[var(--text-muted)]">
                            {new Date(h.createdAt).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Mark Note or Quote Text */}
                        {isMark ? (
                          <div
                            onClick={() => onJumpToPage(h.pageNumber, h.chapterIndex, h.id)}
                            className="cursor-pointer hover:opacity-90 space-y-1"
                          >
                            <p className="font-medium text-[12.5px] leading-relaxed text-[var(--text-primary)]">
                              {h.note || h.text}
                            </p>
                            {h.text && h.text !== h.note && (
                              <p className="text-[11px] text-[var(--text-muted)] italic">
                                Label: {h.text}
                              </p>
                            )}
                          </div>
                        ) : (
                          <blockquote
                            onClick={() => onJumpToPage(h.pageNumber, h.chapterIndex, h.id)}
                            className="font-normal text-xs leading-relaxed text-[var(--text-primary)] cursor-pointer hover:opacity-90 italic select-text"
                          >
                            "{h.text}"
                          </blockquote>
                        )}

                        {/* Margin Note Editing for standard highlights */}
                        {!isMark && (
                          editingId === h.id ? (
                            <div className="mt-2 space-y-2">
                              <textarea
                                rows={2}
                                value={editNoteText}
                                onChange={(e) => setEditNoteText(e.target.value)}
                                placeholder="Add personal thoughts or reflection..."
                                className="w-full text-xs p-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[#0071E3]"
                              />
                              <div className="flex justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setEditingId(null)}
                                  className="px-2.5 py-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => saveEditNote(h.id)}
                                  className="btn-primary !h-7 !px-3 text-xs flex items-center gap-1"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Save</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            h.note && (
                              <div className="mt-1 p-2.5 rounded-xl bg-[var(--bg-surface)]/70 text-xs text-[var(--text-muted)] flex items-start gap-2">
                                <MessageSquare className="w-3.5 h-3.5 text-[#0071E3] dark:text-[#2997FF] shrink-0 mt-0.5" />
                                <span className="italic leading-relaxed text-[var(--text-primary)]">
                                  {h.note}
                                </span>
                              </div>
                            )
                          )
                        )}

                        {/* Card Actions */}
                        <div className="pt-1 flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition">
                          {editingId !== h.id && (
                            <button
                              type="button"
                              onClick={() => startEditNote(h)}
                              className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-surface)] transition cursor-pointer"
                              title="Edit annotation note"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => onDeleteHighlight(h.id)}
                            className="p-1.5 text-[var(--text-muted)] hover:text-rose-600 rounded-lg hover:bg-[var(--bg-surface)] transition cursor-pointer"
                            title="Delete highlight"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Session Reflections */}
          {activeTab === 'reflections' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
              {reflectionsWithText.length === 0 ? (
                <div className="py-16 text-center text-[var(--text-muted)]">
                  <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-medium">No session reflections yet</p>
                  <p className="text-[11px] mt-1 max-w-xs mx-auto">
                    Complete a Focus Session and jot down your reflections at the end ritual.
                  </p>
                </div>
              ) : (
                reflectionsWithText.map((s) => (
                  <div
                    key={s.id}
                    className="p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] space-y-2.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
                        <Calendar className="w-3.5 h-3.5" />
                        <span className="font-num font-medium text-[var(--text-primary)]">
                          {s.date}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="apple-chip !py-0.5 !px-2 text-[10px]">
                          {s.durationMinutes}m read
                        </span>
                        <span className="apple-chip !py-0.5 !px-2 text-[10px]">
                          +{s.pagesRead} pages
                        </span>
                      </div>
                    </div>

                    <blockquote className="text-xs text-[var(--text-primary)] leading-relaxed italic border-l-2 border-[#0071E3] pl-2.5">
                      "{s.reflection}"
                    </blockquote>
                  </div>
                ))
              )}
            </div>
          )}
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
};
