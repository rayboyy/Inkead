import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileUp,
  FolderOpen,
  ClipboardPaste,
  Globe,
  HardDriveDownload,
  FolderInput,
  X,
} from 'lucide-react';

export interface ImportMenuPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLocalFile: () => void;
  onSelectDirectory: () => void;
  onSelectPastedText: () => void;
  onSelectWebBrowser: () => void;
  className?: string;
}

export const ImportMenuPopover: React.FC<ImportMenuPopoverProps> = ({
  isOpen,
  onClose,
  onSelectLocalFile,
  onSelectDirectory,
  onSelectPastedText,
  onSelectWebBrowser,
  className = '',
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const menuItems = [
    {
      id: 'local-file',
      title: 'From Local File',
      description: 'PDF, EPUB, MOBI, CBZ, FB2, TXT, MD',
      icon: (
        <svg
          className="w-5 h-5 text-[#0071E3] dark:text-[#2997FF]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Inbox / Local file tray style matching design */}
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <path d="M2 13.5h4.5a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2H22" />
          <polyline points="12 6 12 11" />
          <polyline points="9 8.5 12 11 15 8.5" />
        </svg>
      ),
      action: onSelectLocalFile,
    },
    {
      id: 'directory',
      title: 'From Directory',
      description: 'Scan & ingest an entire folder of books',
      icon: (
        <svg
          className="w-5 h-5 text-amber-500 dark:text-amber-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Directory folder with tray slot matching design */}
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v2H3V7z" />
          <path d="M3 11h18v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7z" />
          <path d="M3 15h4.5a2 2 0 0 0 2 2h5a2 2 0 0 0 2-2H21" />
        </svg>
      ),
      action: onSelectDirectory,
    },
    {
      id: 'pasted-text',
      title: 'From Pasted Text',
      description: 'Create a reflowable book from notes & markdown',
      icon: (
        <svg
          className="w-5 h-5 text-emerald-500 dark:text-emerald-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Clipboard matching design */}
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
          <line x1="9" y1="12" x2="15" y2="12" />
          <line x1="9" y1="16" x2="13" y2="16" />
        </svg>
      ),
      action: onSelectPastedText,
    },
    {
      id: 'web-browser',
      title: 'From Web Browser',
      description: 'Clean distraction-free reader from any web URL',
      icon: (
        <svg
          className="w-5 h-5 text-indigo-500 dark:text-indigo-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Globe wireframe matching design */}
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      ),
      action: onSelectWebBrowser,
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Transparent click-catcher backdrop to close on outside click */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="fixed inset-0 z-40 bg-transparent cursor-default"
          />

          <motion.div
            ref={popoverRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-color)',
            }}
            className={`absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-2xl border shadow-2xl p-1.5 z-50 overflow-hidden [background-clip:padding-box] [outline:none] ${className}`}
            role="menu"
          >
            {/* Header with Title and Close X Button */}
            <div className="px-3 py-2 border-b border-[var(--border-color)]/60 mb-1 flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-wider uppercase text-[var(--text-muted)]">
                Add Content to Inkead
              </span>
              <button
                type="button"
                onClick={onClose}
                className="w-5 h-5 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors duration-150 cursor-pointer"
                aria-label="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

          <div className="space-y-0.5">
            {menuItems.map((item) => (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                onClick={() => {
                  item.action();
                  onClose();
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--bg-surface)] active:bg-[var(--bg-surface)]/80 transition-colors duration-150 text-left group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-[var(--bg-surface)] group-hover:bg-[var(--bg-card)] border border-[var(--border-color)]/70 flex items-center justify-center shrink-0 transition-colors duration-150 shadow-2xs">
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13.5px] font-medium tracking-tight text-[var(--text-primary)]">
                    {item.title}
                  </div>
                  <div className="text-[11.5px] text-[var(--text-muted)] truncate font-normal mt-0.5">
                    {item.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
