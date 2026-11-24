import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Flame, Award, BookOpen, PenLine, ArrowRight, Library } from 'lucide-react';
import { soundEngine } from '../../lib/audio';

interface ReadingSessionCompleteModalProps {
  isOpen: boolean;
  durationMinutes: number;
  pagesGained: number;
  bookTitle: string;
  currentStreak: number;
  chimeMuted: boolean;
  onSaveAndContinue: (reflection: string) => void;
  onReturnToLibrary: (reflection: string) => void;
}

export const ReadingSessionCompleteModal: React.FC<ReadingSessionCompleteModalProps> = ({
  isOpen,
  durationMinutes,
  pagesGained,
  bookTitle,
  currentStreak,
  chimeMuted,
  onSaveAndContinue,
  onReturnToLibrary,
}) => {
  const [reflection, setReflection] = useState('');

  useEffect(() => {
    if (isOpen) {
      // 1. Play warm Tibetan singing bowl chime
      soundEngine.playSingingBowl(chimeMuted);

      // 2. Fire celebratory blue & neutral confetti burst
      try {
        confetti({
          particleCount: 65,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#0071E3', '#2997FF', '#0066CC', '#86868B', '#1D1D1F'],
          disableForReducedMotion: true,
        });
      } catch {
        // ignore
      }
    }
  }, [isOpen, chimeMuted]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-3xl shadow-2xl overflow-hidden z-10 text-[var(--text-primary)] p-6 sm:p-8"
        >
          {/* Subtle blue glow background gradient */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-36 bg-[#0071E3]/10 blur-3xl pointer-events-none rounded-full" />

          {/* Header Badge */}
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#0071E3]/10 border border-[#0071E3]/25 flex items-center justify-center text-[#0071E3] dark:text-[#2997FF] mb-4 shadow-sm">
              <Award className="w-7 h-7" />
            </div>

            <span className="text-[12px] uppercase tracking-widest font-semibold text-[#0071E3] dark:text-[#2997FF]">
              Session Complete
            </span>
            <h2 className="text-2xl sm:text-3xl font-semibold text-[var(--text-primary)] mt-1 tracking-tight">
              <span className="font-num font-semibold">{durationMinutes}</span> Minutes of Focus
            </h2>
            <p className="text-xs font-normal text-[var(--text-muted)] mt-1 max-w-xs truncate">
              {bookTitle}
            </p>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 gap-3 mt-6">
            <div className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center gap-3 shadow-xs">
              <div className="p-2.5 rounded-xl bg-[#0071E3]/10 text-[#0071E3] dark:text-[#2997FF]">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)]">
                  Daily Streak
                </span>
                <p className="text-sm font-semibold text-[var(--text-primary)] font-num">
                  {currentStreak} {currentStreak === 1 ? 'Day' : 'Days'}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center gap-3 shadow-xs">
              <div className="p-2.5 rounded-xl bg-[#0071E3]/10 text-[#0071E3] dark:text-[#2997FF]">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)]">
                  Pages Explored
                </span>
                <p className="text-sm font-semibold text-[var(--text-primary)] font-num">
                  +{Math.max(1, pagesGained)} {pagesGained === 1 ? 'page' : 'pages'}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Session Reflection Input */}
          <div className="mt-6">
            <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-primary)]">
              <PenLine className="w-3.5 h-3.5 text-[#0071E3] dark:text-[#2997FF]" />
              <span>Quick Session Reflection (Optional)</span>
            </label>
            <div className="mt-2 relative">
              <textarea
                rows={3}
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                placeholder="What single insight, sentence, or feeling stayed with you from this session?"
                className="w-full p-3.5 text-xs sm:text-sm rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-[#0071E3] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-none leading-relaxed"
              />
            </div>
            <p className="text-[11px] text-[var(--text-muted)] mt-1.5 font-normal">
              Saved automatically to this book's Notebook reflections.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
            <button
              type="button"
              onClick={() => onReturnToLibrary(reflection)}
              className="btn-secondary w-full !h-11 cursor-pointer"
            >
              <Library className="w-4 h-4" />
              <span>Return to Library</span>
            </button>

            <button
              type="button"
              onClick={() => onSaveAndContinue(reflection)}
              className="btn-primary w-full !h-11 cursor-pointer"
            >
              <span>Save & Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
