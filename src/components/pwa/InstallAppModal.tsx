import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  X,
  CheckCircle2,
  Laptop,
  Smartphone,
} from 'lucide-react';
import { PWAInstallState } from '../../hooks/usePWAInstall';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  pwaState: PWAInstallState;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({
  isOpen,
  onClose,
  pwaState,
}) => {
  const { isInstalled, canPromptDirectly, os, browserName, promptInstall } = pwaState;

  const handleInstallClick = async () => {
    const success = await promptInstall();
    if (success) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 pointer-events-none select-none">
          {/* Backdrop Scrim */}
          <motion.div
            key="install-modal-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-[2px] pointer-events-auto"
          />

          {/* Minimalist Modal Container - Apple Calm & Google Sans */}
          <motion.div
            key="install-modal-card"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-color)',
            }}
            className="relative w-full max-w-[420px] rounded-3xl border shadow-2xl p-6 sm:p-7 text-[var(--text-primary)] z-10 pointer-events-auto overflow-hidden [background-clip:padding-box] [outline:none] space-y-5"
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 w-7 h-7 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition cursor-pointer"
              aria-label="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            {/* Centered Editorial Hero */}
            <div className="flex flex-col items-center text-center pt-1">
              <img
                src="/icon.svg"
                alt="Folio App Icon"
                className="w-16 h-16 rounded-2xl shadow-lg border border-black/5 dark:border-white/10 mb-3.5 object-cover"
              />
              <h3 className="text-[19px] font-semibold tracking-tight text-[var(--text-primary)] g-sans-title">
                Install Folio
              </h3>
              <p className="text-[12.5px] text-[var(--text-muted)] g-sans-body mt-1 max-w-[300px] leading-relaxed">
                A dedicated, distraction-free reading window for your books and documents.
              </p>
            </div>

            {/* Action / Guided Installation */}
            {isInstalled ? (
              <div className="py-3 px-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-1">
                <div className="flex items-center justify-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium text-[13px] g-sans-body-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Folio is Installed</span>
                </div>
                <p className="text-[11.5px] text-[var(--text-muted)] g-sans-caption">
                  Launch anytime from your desktop, dock, or taskbar.
                </p>
              </div>
            ) : canPromptDirectly ? (
              /* Direct 1-Click Install */
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="btn-primary w-full !h-11 text-[14px] font-medium shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Install App</span>
                </button>
                <p className="text-[11px] text-center text-[var(--text-muted)] g-sans-caption">
                  Runs as an independent window with zero browser tabs
                </p>
              </div>
            ) : (
              /* Refined, Minimalist Step Guide without Cluttered Boxes */
              <div className="p-4 rounded-2xl bg-[var(--bg-surface)]/70 space-y-2.5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] g-sans-meta flex items-center gap-1.5">
                  {os === 'ios' || os === 'android' ? (
                    <Smartphone className="w-3.5 h-3.5 text-[#0071E3] dark:text-[#2997FF]" />
                  ) : (
                    <Laptop className="w-3.5 h-3.5 text-[#0071E3] dark:text-[#2997FF]" />
                  )}
                  <span>
                    How to add on{' '}
                    {os === 'windows'
                      ? 'Windows'
                      : os === 'mac'
                      ? 'macOS'
                      : os === 'ios'
                      ? 'iPhone / iPad'
                      : 'your browser'}
                  </span>
                </div>

                {os === 'mac' && browserName === 'safari' ? (
                  <div className="space-y-2 text-[12px] text-[var(--text-primary)] g-sans-body">
                    <div className="flex items-start gap-2.5">
                      <span className="w-4 h-4 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[10px] font-semibold flex items-center justify-center shrink-0 mt-0.5 font-num">
                        1
                      </span>
                      <span>
                        Click <strong className="font-semibold text-[var(--text-primary)]">File</strong> or the <strong className="font-semibold text-[var(--text-primary)]">Share</strong> icon in Safari.
                      </span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="w-4 h-4 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[10px] font-semibold flex items-center justify-center shrink-0 mt-0.5 font-num">
                        2
                      </span>
                      <span>
                        Choose <strong className="font-semibold text-[var(--text-primary)]">"Add to Dock"</strong> to launch as a native app.
                      </span>
                    </div>
                  </div>
                ) : os === 'ios' ? (
                  <div className="space-y-2 text-[12px] text-[var(--text-primary)] g-sans-body">
                    <div className="flex items-start gap-2.5">
                      <span className="w-4 h-4 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[10px] font-semibold flex items-center justify-center shrink-0 mt-0.5 font-num">
                        1
                      </span>
                      <span>
                        Tap the <strong className="font-semibold text-[var(--text-primary)]">Share</strong> icon in the Safari toolbar.
                      </span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="w-4 h-4 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[10px] font-semibold flex items-center justify-center shrink-0 mt-0.5 font-num">
                        2
                      </span>
                      <span>
                        Tap <strong className="font-semibold text-[var(--text-primary)]">"Add to Home Screen"</strong>.
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Windows / Chrome / Edge */
                  <div className="space-y-2 text-[12px] text-[var(--text-primary)] g-sans-body">
                    <div className="flex items-start gap-2.5">
                      <span className="w-4 h-4 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[10px] font-semibold flex items-center justify-center shrink-0 mt-0.5 font-num">
                        1
                      </span>
                      <span>
                        Click the <strong className="font-semibold text-[var(--text-primary)]">Install</strong> icon in the address bar.
                      </span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <span className="w-4 h-4 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[10px] font-semibold flex items-center justify-center shrink-0 mt-0.5 font-num">
                        2
                      </span>
                      <span>
                        Or click <strong className="font-semibold text-[var(--text-primary)]">Menu (⋮)</strong> → <strong className="font-semibold text-[var(--text-primary)]">"Save and share"</strong> → <strong className="font-semibold text-[var(--text-primary)]">"Install Folio"</strong>.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Minimalist 3 Highlights (Horizontal, Borderless, Calm) */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[var(--border-color)]/60 text-center">
              <div className="py-1">
                <span className="text-[12px] font-medium text-[var(--text-primary)] g-sans-body-medium block">
                  100% Offline
                </span>
                <span className="text-[10.5px] text-[var(--text-muted)] g-sans-caption">
                  Zero web required
                </span>
              </div>
              <div className="py-1 border-x border-[var(--border-color)]/60">
                <span className="text-[12px] font-medium text-[var(--text-primary)] g-sans-body-medium block">
                  Zero Clutter
                </span>
                <span className="text-[10.5px] text-[var(--text-muted)] g-sans-caption">
                  No browser tabs
                </span>
              </div>
              <div className="py-1">
                <span className="text-[12px] font-medium text-[var(--text-primary)] g-sans-body-medium block">
                  Quick Launch
                </span>
                <span className="text-[10.5px] text-[var(--text-muted)] g-sans-caption">
                  Pin to taskbar
                </span>
              </div>
            </div>

            {/* Subtle Footer Note */}
            <p className="text-[10.5px] text-center text-[var(--text-muted)]/75 g-sans-caption pt-0.5">
              Right-click the app icon anytime for quick reading shortcuts.
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
