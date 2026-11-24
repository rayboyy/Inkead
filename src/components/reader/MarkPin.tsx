import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Highlight, HighlightColor } from '../../types';
import { MapPin, ExternalLink, Calendar } from 'lucide-react';

interface MarkPinProps {
  mark: Highlight;
  isFocused?: boolean;
  onClick: (mark: Highlight) => void;
}

const COLOR_CONFIG: Record<
  HighlightColor,
  {
    pinBg: string;
    pinText: string;
    pinRing: string;
    badgeBg: string;
    dotBg: string;
  }
> = {
  amber: {
    pinBg: 'bg-amber-500',
    pinText: 'text-stone-950',
    pinRing: 'ring-amber-400/60',
    badgeBg: 'bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300',
    dotBg: 'bg-amber-500',
  },
  sage: {
    pinBg: 'bg-emerald-500',
    pinText: 'text-white',
    pinRing: 'ring-emerald-400/60',
    badgeBg: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300',
    dotBg: 'bg-emerald-500',
  },
  sky: {
    pinBg: 'bg-sky-500',
    pinText: 'text-white',
    pinRing: 'ring-sky-400/60',
    badgeBg: 'bg-sky-500/15 border-sky-500/30 text-sky-700 dark:text-sky-300',
    dotBg: 'bg-sky-500',
  },
  rose: {
    pinBg: 'bg-rose-500',
    pinText: 'text-white',
    pinRing: 'ring-rose-400/60',
    badgeBg: 'bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-300',
    dotBg: 'bg-rose-500',
  },
};

export const MarkPin: React.FC<MarkPinProps> = ({ mark, isFocused, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  if (!mark.position) return null;

  const cfg = COLOR_CONFIG[mark.color] || COLOR_CONFIG.amber;
  const isNearTop = mark.position.y < 20;

  return (
    <div
      style={{
        position: 'absolute',
        left: `${mark.position.x}%`,
        top: `${mark.position.y}%`,
        transform: 'translate(-50%, -50%)',
        zIndex: isHovered ? 45 : 30,
      }}
      className="pointer-events-auto select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Pin Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClick(mark);
        }}
        className={`w-7 h-7 rounded-full flex items-center justify-center shadow-lg transition-transform cursor-pointer relative ${
          cfg.pinBg
        } ${cfg.pinText} ${
          isFocused
            ? 'ring-4 ring-[#0071E3] scale-125 animate-pulse'
            : isHovered
            ? 'scale-115 ring-2 ring-white/80 dark:ring-black/60'
            : 'hover:scale-110 ring-1 ring-black/15 dark:ring-white/20'
        }`}
        title={`Mark on Page ${mark.pageNumber}: ${mark.note || 'Annotation'}`}
        aria-label={`Mark on Page ${mark.pageNumber}`}
      >
        <MapPin className="w-3.5 h-3.5 stroke-[2.5]" />
        {/* Subtle indicator beacon */}
        <span
          className={`absolute -inset-1 rounded-full opacity-40 animate-ping pointer-events-none ${cfg.dotBg}`}
          style={{ animationDuration: '3s' }}
        />
      </button>

      {/* Hover Annotation Tooltip Card */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: isNearTop ? -6 : 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: isNearTop ? -6 : 6 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              left: '50%',
              ...(isNearTop
                ? { top: '100%', marginTop: '10px' }
                : { bottom: '100%', marginBottom: '10px' }),
              transform: 'translateX(-50%)',
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-color)',
            }}
            onClick={(e) => {
              e.stopPropagation();
              onClick(mark);
            }}
            className="w-64 max-w-[calc(100vw-32px)] p-3.5 rounded-2xl border shadow-2xl text-[var(--text-primary)] cursor-pointer group space-y-2 pointer-events-auto"
          >
            {/* Tooltip Header */}
            <div className="flex items-center justify-between text-[11px] pb-1.5 border-b border-[var(--border-color)]/70">
              <div className="flex items-center gap-1.5 font-medium">
                <span className={`w-2 h-2 rounded-full ${cfg.dotBg}`} />
                <span className="font-num font-semibold text-[var(--text-primary)]">
                  Page {mark.pageNumber}
                </span>
                <span className="text-[var(--text-muted)]">· Mark</span>
              </div>
              <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                <Calendar className="w-2.5 h-2.5" />
                <span>{new Date(mark.createdAt).toLocaleDateString()}</span>
              </span>
            </div>

            {/* Annotation Text */}
            <div className="text-[12.5px] leading-relaxed text-[var(--text-primary)] font-normal max-h-36 overflow-y-auto no-scrollbar">
              {mark.note ? (
                <p className="whitespace-pre-wrap">{mark.note}</p>
              ) : (
                <p className="italic text-[var(--text-muted)]">No annotation note attached</p>
              )}
            </div>

            {/* Tooltip Footer Action */}
            <div className="pt-1.5 border-t border-[var(--border-color)]/70 flex items-center justify-between text-[10.5px] font-medium text-[#0071E3] dark:text-[#2997FF] group-hover:underline">
              <span>Open in Notebook</span>
              <ExternalLink className="w-3 h-3" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
