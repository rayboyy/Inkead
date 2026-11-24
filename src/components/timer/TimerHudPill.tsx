import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Plus, StopCircle, ChevronDown } from 'lucide-react';

interface TimerHudPillProps {
  remainingSeconds: number;
  totalSeconds: number;
  isPaused: boolean;
  onTogglePause: () => void;
  onAddFiveMinutes: () => void;
  onEndEarly: () => void;
}

export const TimerHudPill: React.FC<TimerHudPillProps> = ({
  remainingSeconds,
  totalSeconds,
  isPaused,
  onTogglePause,
  onAddFiveMinutes,
  onEndEarly,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const mins = Math.floor(remainingSeconds / 60);
  const secs = remainingSeconds % 60;
  const formattedTime = `${mins}:${secs.toString().padStart(2, '0')}`;

  const progress = totalSeconds > 0 ? (totalSeconds - remainingSeconds) / totalSeconds : 0;
  const radius = 9;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen(!menuOpen)}
        className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--bg-card)]/90 backdrop-blur-md border border-[var(--border-color)] shadow-xs hover:border-[var(--border-hover)] transition-all group cursor-pointer select-none"
      >
        {/* Perfectly Round, Unclipped Circular Progress Ring */}
        <div className="relative w-5 h-5 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 -rotate-90 overflow-visible" viewBox="0 0 24 24">
            {/* Background Track */}
            <circle
              cx="12"
              cy="12"
              r={radius}
              className="text-[var(--border-color)]"
              strokeWidth="2.5"
              stroke="currentColor"
              fill="none"
              opacity="0.8"
            />
            {/* Active Progress Ring */}
            <circle
              cx="12"
              cy="12"
              r={radius}
              className={`${
                isPaused
                  ? 'text-amber-500'
                  : 'text-[#0071E3] dark:text-[#2997FF]'
              } transition-all duration-300 ease-out`}
              strokeWidth="2.5"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              stroke="currentColor"
              fill="none"
            />
          </svg>
          {isPaused && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            </div>
          )}
        </div>

        {/* Time Text with Google Sans Tabular Numbers */}
        <span className="text-[13px] font-num font-semibold tracking-tight text-[var(--text-primary)]">
          {formattedTime}
        </span>

        <ChevronDown className="w-3 h-3 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-transform" />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.96 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-color)',
              }}
              className="absolute right-0 top-10 w-48 p-1.5 rounded-2xl border shadow-xl z-40 space-y-0.5 text-xs [background-clip:padding-box] [outline:none] [transform:translateZ(0)]"
            >
              <button
                type="button"
                onClick={() => {
                  onTogglePause();
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition cursor-pointer"
              >
                {isPaused ? <Play className="w-3.5 h-3.5 text-[#0071E3] dark:text-[#2997FF]" /> : <Pause className="w-3.5 h-3.5 text-amber-500" />}
                <span>{isPaused ? 'Resume Session' : 'Pause Focus'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onAddFiveMinutes();
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#0071E3] dark:text-[#2997FF]" />
                <span>Add +5 Minutes</span>
              </button>

              <div className="my-1 border-t border-[var(--border-color)]" />

              <button
                type="button"
                onClick={() => {
                  onEndEarly();
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-[#D92D20] dark:text-[#FF453A] hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
              >
                <StopCircle className="w-3.5 h-3.5" />
                <span>Complete Session</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
