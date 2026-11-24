import React from 'react';
import { motion } from 'framer-motion';
import { Book, UserPreferences } from '../../types';
import {
  ArrowLeft,
  ListOrdered,
  Type,
  Headphones,
  BookMarked,
  Maximize2,
  Minimize2,
  Timer,
  MapPin,
} from 'lucide-react';
import { TimerHudPill } from '../timer/TimerHudPill';

interface ReaderHeaderProps {
  book: Book;
  visible: boolean;
  onBackToLibrary: () => void;
  onOpenToc: () => void;
  onOpenAppearance: () => void;
  onOpenSoundscapes: () => void;
  onOpenNotebook: () => void;
  onOpenTimerSetup: () => void;
  isTimerActive: boolean;
  timerRemaining: number;
  timerTotal: number;
  timerPaused: boolean;
  onToggleTimerPause: () => void;
  onAddFiveMinutes: () => void;
  onEndTimerEarly: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  preferences: UserPreferences;
  highlightsCount: number;
  isMarkMode?: boolean;
  onToggleMarkMode?: () => void;
}

export const ReaderHeader: React.FC<ReaderHeaderProps> = ({
  book,
  visible,
  onBackToLibrary,
  onOpenToc,
  onOpenAppearance,
  onOpenSoundscapes,
  onOpenNotebook,
  onOpenTimerSetup,
  isTimerActive,
  timerRemaining,
  timerTotal,
  timerPaused,
  onToggleTimerPause,
  onAddFiveMinutes,
  onEndTimerEarly,
  isFullscreen,
  onToggleFullscreen,
  preferences,
  highlightsCount,
  isMarkMode = false,
  onToggleMarkMode,
}) => {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{
        opacity: visible ? 1 : 0,
        y: visible ? 0 : -20,
        pointerEvents: visible ? 'auto' : 'none',
      }}
      transition={{ duration: 0.25 }}
      className="fixed top-0 left-0 right-0 z-40 p-3 sm:p-4 flex items-center justify-between"
    >
      {/* Floating Glassmorphic Pill */}
      <div className="w-full max-w-7xl mx-auto flex items-center justify-between px-4 py-2 rounded-full bg-[var(--bg-card)]/90 backdrop-blur-2xl border border-[var(--border-color)] shadow-lg text-[var(--text-primary)]">
        {/* Left Side: Back & TOC */}
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            type="button"
            onClick={onBackToLibrary}
            className="p-2 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition cursor-pointer"
            title="Return to Library (Esc)"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onOpenToc}
            className="px-2.5 py-1.5 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition flex items-center gap-1.5 text-[13px] font-medium cursor-pointer"
            title="Table of Contents"
          >
            <ListOrdered className="w-4 h-4" />
            <span className="hidden sm:inline">Contents</span>
          </button>

          <div className="h-4 w-px bg-[var(--border-color)] mx-1 hidden sm:block" />

          {/* Book Title & Author */}
          <div className="min-w-0 pl-1 hidden md:block max-w-[280px]">
            <h1 className="text-[13px] font-semibold truncate tracking-[-0.01em] text-[var(--text-primary)]">
              {book.title}
            </h1>
            <p className="text-[11px] font-normal text-[var(--text-muted)] truncate">
              {book.author}
            </p>
          </div>
        </div>

        {/* Right Side: Tools & Timer */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Active Timer Pill or Timer Setup Trigger */}
          {isTimerActive ? (
            <TimerHudPill
              remainingSeconds={timerRemaining}
              totalSeconds={timerTotal}
              isPaused={timerPaused}
              onTogglePause={onToggleTimerPause}
              onAddFiveMinutes={onAddFiveMinutes}
              onEndEarly={onEndTimerEarly}
            />
          ) : (
            <button
              type="button"
              onClick={onOpenTimerSetup}
              className="px-2.5 py-1.5 rounded-full text-[12px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition flex items-center gap-1.5 cursor-pointer"
              title="Start Deep Focus Reading Session"
            >
              <Timer className="w-4 h-4 text-[#0071E3] dark:text-[#2997FF]" />
              <span className="hidden sm:inline font-medium">Focus</span>
            </button>
          )}

          {/* Soundscapes Web Audio Generator */}
          <button
            type="button"
            onClick={onOpenSoundscapes}
            className={`p-2 rounded-full transition cursor-pointer relative ${
              !preferences.soundscape.isMuted &&
              (preferences.soundscape.rainVolume > 0 ||
                preferences.soundscape.brownNoiseVolume > 0 ||
                preferences.soundscape.fireVolume > 0)
                ? 'text-[#0071E3] dark:text-[#2997FF] bg-[#0071E3]/10 dark:bg-[#2997FF]/15'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
            }`}
            title="Procedural Soundscapes (Rain, Fire, Brown Noise)"
            aria-label="Soundscapes"
          >
            <Headphones className="w-4 h-4" />
            {!preferences.soundscape.isMuted &&
              (preferences.soundscape.rainVolume > 0 ||
                preferences.soundscape.brownNoiseVolume > 0 ||
                preferences.soundscape.fireVolume > 0) && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#0071E3] dark:bg-[#2997FF] animate-pulse" />
              )}
          </button>

          {/* Mark & Annotate Tool */}
          <button
            type="button"
            onClick={onToggleMarkMode}
            className={`px-2.5 py-1.5 rounded-full text-[12px] font-medium transition flex items-center gap-1.5 cursor-pointer ${
              isMarkMode
                ? 'bg-[#0071E3] text-white shadow-xs ring-2 ring-[#0071E3]/25'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
            }`}
            title={isMarkMode ? 'Exit Mark Mode (Esc)' : 'Mark & Annotate on Page'}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span className="hidden sm:inline font-medium">Mark</span>
          </button>

          {/* Typography & Appearance */}
          <button
            type="button"
            onClick={onOpenAppearance}
            className="p-2 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition cursor-pointer"
            title="Appearance & Typography"
          >
            <Type className="w-4 h-4" />
          </button>

          {/* Notebook & Highlights */}
          <button
            type="button"
            onClick={onOpenNotebook}
            className="p-2 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition flex items-center gap-1 text-[13px] cursor-pointer relative"
            title="Notebook & Highlights"
          >
            <BookMarked className="w-4 h-4" />
            {highlightsCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#0071E3] text-white text-[9px] font-semibold font-num flex items-center justify-center">
                {highlightsCount}
              </span>
            )}
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={onToggleFullscreen}
            className="p-2 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition cursor-pointer hidden sm:block"
            title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </motion.header>
  );
};
