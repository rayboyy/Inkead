import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen } from 'lucide-react';

export interface BlinkingDotsProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string; // Tailwind class, e.g. 'bg-[var(--accent)]' or 'bg-current'
  className?: string;
}

/**
 * Ultra-smooth, organic blinking wave dots (Apple / Linear / Dynamic Island aesthetic)
 */
export const BlinkingDots: React.FC<BlinkingDotsProps> = ({
  size = 'md',
  color = 'bg-[var(--accent)]',
  className = '',
}) => {
  const dotSizeClass =
    size === 'sm' ? 'w-1.5 h-1.5' : size === 'lg' ? 'w-2.5 h-2.5' : 'w-2 h-2';
  const gapClass = size === 'sm' ? 'gap-1' : size === 'lg' ? 'gap-2' : 'gap-1.5';

  return (
    <div className={`inline-flex items-center ${gapClass} ${className}`} aria-label="Loading">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className={`${dotSizeClass} rounded-full ${color}`}
          animate={{
            opacity: [0.25, 1, 0.25],
            scale: [0.8, 1.2, 0.8],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: [0.4, 0, 0.2, 1],
            delay: i * 0.18,
          }}
        />
      ))}
    </div>
  );
};

export interface LoadingScreenProps {
  title?: string;
  subtitle?: string;
  fullScreen?: boolean;
  className?: string;
}

/**
 * Editorial, calm loading screen with minimal folio emblem & smooth blinking wave
 */
export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  title = 'Opening Document',
  subtitle,
  fullScreen = false,
  className = '',
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className={`flex flex-col items-center justify-center text-center select-none ${
        fullScreen
          ? 'fixed inset-0 z-50 bg-[var(--bg-primary)] text-[var(--text-primary)]'
          : 'w-full py-24 sm:py-32'
      } ${className}`}
    >
      {/* Minimal Frosted Folio Icon */}
      <div className="relative mb-5 flex items-center justify-center">
        <motion.div
          className="absolute inset-0 rounded-2xl bg-[var(--accent)]/10 dark:bg-[var(--accent)]/15 blur-lg"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.4, 0.8, 0.4],
          }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <div className="relative w-12 h-12 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm flex items-center justify-center text-[var(--accent)]">
          <BookOpen className="w-5 h-5 stroke-[1.75]" />
        </div>
      </div>

      {/* Smooth Blinking Dots */}
      <BlinkingDots size="md" color="bg-[var(--accent)]" className="mb-3.5" />

      {/* Title */}
      <h3 className="font-sans font-medium text-[13px] tracking-wide text-[var(--text-primary)] uppercase">
        {title}
      </h3>

      {/* Optional Subtitle */}
      {subtitle && (
        <p className="text-xs text-[var(--text-muted)] font-normal mt-1 max-w-xs leading-relaxed">
          {subtitle}
        </p>
      )}
    </motion.div>
  );
};

/**
 * Plate skeleton placeholder for Comic Book / PDF page rendering
 */
export const PlateLoadingSkeleton: React.FC<{ pageNumber?: number; className?: string }> = ({
  pageNumber,
  className = '',
}) => {
  return (
    <div
      className={`w-full aspect-[1/1.4] max-h-[85vh] rounded-2xl bg-[var(--bg-surface)]/70 border border-[var(--border-color)]/70 flex flex-col items-center justify-center gap-3.5 text-[var(--text-muted)] p-6 select-none shadow-xs ${className}`}
    >
      <div className="w-10 h-10 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-muted)]/70">
        <BookOpen className="w-4 h-4" />
      </div>
      <BlinkingDots size="sm" color="bg-[var(--text-muted)]" />
      {pageNumber !== undefined && (
        <span className="font-num text-[11px] font-medium tracking-tight text-[var(--text-muted)]/80">
          Page {pageNumber}
        </span>
      )}
    </div>
  );
};
