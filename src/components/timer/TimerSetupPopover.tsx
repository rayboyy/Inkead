import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, Flame, X, Minus, Plus, EyeOff } from 'lucide-react';

interface TimerSetupPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (minutes: number, autoHideUI: boolean) => void;
  defaultMinutes?: number;
  autoHideUI: boolean;
}

export const TimerSetupPopover: React.FC<TimerSetupPopoverProps> = ({
  isOpen,
  onClose,
  onStart,
  defaultMinutes = 30,
  autoHideUI,
}) => {
  const [minutes, setMinutes] = useState(defaultMinutes);
  const [hideUI, setHideUI] = useState(autoHideUI);

  const presets = [
    { mins: 15, label: 'Sprint' },
    { mins: 25, label: 'Pomodoro' },
    { mins: 45, label: 'Deep' },
    { mins: 60, label: 'Flow' },
  ];

  const adjustMinutes = (delta: number) => {
    setMinutes((prev) => Math.max(5, Math.min(180, prev + delta)));
  };

  const handleStart = () => {
    onStart(minutes, hideUI);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          {/* Smooth Backdrop Scrim */}
          <motion.div
            key="timer-setup-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            onClick={onClose}
            className="fixed inset-0 bg-black/15 dark:bg-black/40 backdrop-blur-[2px] pointer-events-auto"
          />

          {/* Fixed Layout Anchor */}
          <div className="fixed inset-0 flex items-start justify-end p-4 sm:pr-32 pt-16 pointer-events-none z-50">
            {/* Popover Card - Solid Theme Background, Zero-Scale, Zero-Jitter Pure Fade */}
            <motion.div
              key="timer-setup-card"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-color)',
              }}
              className="w-[420px] max-w-[calc(100vw-32px)] p-6 rounded-3xl border shadow-2xl text-[var(--text-primary)] select-none space-y-5 no-scrollbar pointer-events-auto [background-clip:padding-box] [outline:none]"
            >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#0071E3]/10 dark:bg-[#2997FF]/15 border border-[#0071E3]/20 flex items-center justify-center text-[#0071E3] dark:text-[#2997FF]">
                <Timer className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-[13px] font-semibold text-[var(--text-primary)] tracking-tight">
                  Focus Session
                </h3>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Timed reading with gentle chime
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1.5 rounded-full hover:bg-[var(--bg-surface)] transition cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Large Time Stepper Display */}
          <div className="py-2 px-4 rounded-2xl bg-[var(--bg-surface)]/70 border border-[var(--border-color)] flex items-center justify-between">
            <button
              type="button"
              onClick={() => adjustMinutes(-5)}
              disabled={minutes <= 5}
              className="w-8 h-8 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-primary)] hover:border-[var(--border-hover)] active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer shadow-2xs"
              title="Decrease 5 minutes"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            <div className="flex flex-col items-center">
              <span className="font-num text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
                {minutes}
                <span className="text-xs font-normal text-[var(--text-muted)] ml-1">mins</span>
              </span>
            </div>

            <button
              type="button"
              onClick={() => adjustMinutes(5)}
              disabled={minutes >= 180}
              className="w-8 h-8 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-primary)] hover:border-[var(--border-hover)] active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer shadow-2xs"
              title="Increase 5 minutes"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Preset Chips */}
          <div>
            <div className="grid grid-cols-4 gap-1.5">
              {presets.map((p) => {
                const isActive = minutes === p.mins;
                return (
                  <button
                    key={p.mins}
                    type="button"
                    onClick={() => setMinutes(p.mins)}
                    className={`py-2 px-1 rounded-xl transition cursor-pointer flex flex-col items-center justify-center border text-xs ${
                      isActive
                        ? 'bg-[#0071E3] dark:bg-[#2997FF] text-white border-[#0071E3] shadow-xs font-medium'
                        : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-color)] hover:border-[var(--border-hover)]'
                    }`}
                  >
                    <span className="font-num font-semibold text-[13px]">{p.mins}m</span>
                    <span
                      className={`text-[9px] mt-0.5 uppercase tracking-wider font-medium ${
                        isActive ? 'text-white/85' : 'text-[var(--text-muted)]'
                      }`}
                    >
                      {p.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Zen Mode Toggle (Auto-hide Chrome) */}
          <div className="pt-2 border-t border-[var(--border-color)]">
            <label className="flex items-center justify-between cursor-pointer group">
              <div className="flex items-center gap-2">
                <EyeOff className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition" />
                <div>
                  <span className="text-[12px] font-medium text-[var(--text-primary)] block">
                    Distraction-Free Zen Mode
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] block">
                    Automatically hides toolbars while reading
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHideUI(!hideUI)}
                className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                  hideUI ? 'bg-[#0071E3] dark:bg-[#2997FF]' : 'bg-[var(--border-color)]'
                }`}
                aria-label="Toggle Zen Mode"
              >
                <span
                  className={`block w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                    hideUI ? 'translate-x-4.5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </label>
          </div>

          {/* Primary Action Button */}
          <button
            type="button"
            onClick={handleStart}
            className="btn-primary w-full !h-11 text-[13px] font-medium cursor-pointer active:scale-98 shadow-sm flex items-center justify-center gap-2"
          >
            <Timer className="w-4 h-4 text-white/90" />
            <span>Begin Focus Session</span>
          </button>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
