import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ReadingTheme,
  ReadingFont,
  ContentWidth,
  UserPreferences,
  Book,
  ThemeMode,
} from '../../types';
import {
  Type,
  AlignLeft,
  AlignJustify,
  Check,
  X,
  Eye,
  Minus,
  Plus,
  Layers,
  Sun,
  Moon,
  Ban,
} from 'lucide-react';
import { THEME_PALETTES, normalizeTheme } from '../../lib/themePalettes';

interface AppearancePopoverProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: UserPreferences;
  onChange: (updated: Partial<UserPreferences>) => void;
  book?: Book;
}

export const AppearancePopover: React.FC<AppearancePopoverProps> = ({
  isOpen,
  onClose,
  preferences,
  onChange,
  book,
}) => {
  // Fixed format check: PDFs and CBZ comic archives have pre-rendered text/plates
  const isFixedFormat = book?.fileType === 'pdf' || book?.fileType === 'cbz';

  const activeTheme = preferences.readerTheme || preferences.theme;
  const currentThemeMode: ThemeMode =
    preferences.themeMode || (preferences.theme === 'oled' ? 'dark' : 'light');
  const isDark =
    currentThemeMode === 'dark' ||
    (currentThemeMode === 'auto' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
  const selectedPaletteId = normalizeTheme(activeTheme);

  const fonts: { id: ReadingFont; name: string; subtitle: string; previewClass: string }[] = [
    {
      id: 'jakarta',
      name: 'Google Sans',
      subtitle: 'Modern & crisp',
      previewClass: 'font-google-sans font-semibold',
    },
    {
      id: 'literata',
      name: 'Editorial Serif',
      subtitle: 'Refined literary',
      previewClass: 'font-literata font-medium',
    },
    {
      id: 'newsreader',
      name: 'Classic Book',
      subtitle: 'Traditional print',
      previewClass: 'font-newsreader',
    },
    {
      id: 'mono',
      name: 'Monospace',
      subtitle: 'Technical tabular',
      previewClass: 'font-mono-code text-xs',
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          {/* Subtle dimming backdrop overlay to prevent edge bleed and provide seamless contrast */}
          <motion.div
            key="appearance-popover-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-xs pointer-events-auto"
          />

          {/* Fixed Layout Anchor */}
          <div className="fixed inset-0 flex items-start justify-end p-4 sm:pr-32 pt-16 pointer-events-none z-50">
            {/* Popover Card - Solid, Zero-Scale, Zero-Jitter Pure Fade */}
            <motion.div
              key="appearance-popover-card"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-color)',
              }}
              className="w-[440px] max-w-[calc(100vw-32px)] p-6 rounded-3xl border shadow-2xl text-[var(--text-primary)] select-none space-y-5 max-h-[calc(100vh-80px)] overflow-y-auto no-scrollbar pointer-events-auto [background-clip:padding-box] [outline:none]"
            >
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 border-b border-[var(--border-color)]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#0071E3]/10 dark:bg-[#2997FF]/15 border border-[#0071E3]/20 flex items-center justify-center text-[#0071E3] dark:text-[#2997FF]">
                <Type className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-[14px] font-semibold text-[var(--text-primary)] tracking-tight">
                  Appearance & Typography
                </h3>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Visual theme and layout configuration
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

          {/* Section: Theme Mode (Auto, Light, Dark) */}
          <div className="flex items-center justify-between pb-1">
            <span className="text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Theme Mode
            </span>

            <div className="flex items-center gap-1.5 p-1 rounded-full bg-[var(--bg-surface)] border border-[var(--border-color)]">
              {/* Auto */}
              <button
                type="button"
                onClick={() => onChange({ themeMode: 'auto' })}
                className="relative w-8 h-8 rounded-full flex items-center justify-center cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                title="Auto (System Theme)"
              >
                {currentThemeMode === 'auto' && (
                  <motion.div
                    layoutId="activeReaderThemeModePill"
                    className="absolute inset-0 rounded-full bg-[#0071E3] shadow-xs"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <span className={`relative z-10 transition-colors ${currentThemeMode === 'auto' ? 'text-white' : ''}`}>
                  <Ban className="w-3.5 h-3.5" />
                </span>
              </button>

              {/* Light */}
              <button
                type="button"
                onClick={() =>
                  onChange({
                    themeMode: 'light',
                    ...(selectedPaletteId === 'default' && preferences.theme === 'oled'
                      ? { theme: 'default', readerTheme: 'default' }
                      : {}),
                  })
                }
                className="relative w-8 h-8 rounded-full flex items-center justify-center cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                title="Light Mode"
              >
                {currentThemeMode === 'light' && (
                  <motion.div
                    layoutId="activeReaderThemeModePill"
                    className="absolute inset-0 rounded-full bg-[#0071E3] shadow-xs"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <span className={`relative z-10 transition-colors ${currentThemeMode === 'light' ? 'text-white' : ''}`}>
                  <Sun className="w-3.5 h-3.5" />
                </span>
              </button>

              {/* Dark */}
              <button
                type="button"
                onClick={() =>
                  onChange({
                    themeMode: 'dark',
                    ...(selectedPaletteId === 'default'
                      ? { theme: 'oled', readerTheme: 'oled' }
                      : {}),
                  })
                }
                className="relative w-8 h-8 rounded-full flex items-center justify-center cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                title="Dark Mode"
              >
                {currentThemeMode === 'dark' && (
                  <motion.div
                    layoutId="activeReaderThemeModePill"
                    className="absolute inset-0 rounded-full bg-[#0071E3] shadow-xs"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <span className={`relative z-10 transition-colors ${currentThemeMode === 'dark' ? 'text-white' : ''}`}>
                  <Moon className="w-3.5 h-3.5" />
                </span>
              </button>
            </div>
          </div>

          {/* Section: Theme Color (3x3 Grid from Design File) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Theme Color
              </span>
              <span className="text-[12px] font-medium text-[var(--text-primary)] capitalize">
                {selectedPaletteId}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {THEME_PALETTES.map((palette) => {
                const isSelected = selectedPaletteId === palette.id;
                const bg = isDark ? palette.darkBg : palette.lightBg;
                const textColor = isDark ? palette.darkText : palette.lightText;
                const border = isDark ? palette.darkBorder : palette.lightBorder;

                return (
                  <button
                    key={palette.id}
                    type="button"
                    onClick={() => {
                      React.startTransition(() => {
                        onChange({
                          readerTheme: palette.id as ReadingTheme,
                          theme: palette.id as ReadingTheme,
                        });
                      });
                    }}
                    style={{
                      backgroundColor: bg,
                      color: textColor,
                      borderColor: border,
                    }}
                    className="h-16 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-colors duration-150 cursor-pointer shadow-2xs relative hover:brightness-98 dark:hover:brightness-110"
                  >
                    <span className="text-[15px] font-bold tracking-tight">
                      Aa
                    </span>
                    <span className="text-[11px] font-medium opacity-90">
                      {palette.name}
                    </span>

                    {/* Smooth Sliding Active Border Ring */}
                    {isSelected && (
                      <motion.div
                        layoutId="activeReaderThemeColorRing"
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                        className="absolute -inset-[1px] rounded-xl border-2 border-[#0071E3] dark:border-[#2997FF] pointer-events-none"
                      />
                    )}

                    {/* Selected Checkmark Badge */}
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.14, ease: 'easeOut' }}
                        className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#0071E3] dark:bg-[#2997FF] text-white flex items-center justify-center shadow-xs pointer-events-none"
                      >
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </motion.div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* CONDITIONAL SECTION: Fixed format document vs Reflowable text document */}
          {isFixedFormat ? (
            /* Fixed-Format Notice for PDF and CBZ image archives */
            <div className="p-4 rounded-2xl bg-[var(--bg-surface)]/80 border border-[var(--border-color)] space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#0071E3] dark:text-[#2997FF]" />
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    Pre-Rendered Document
                  </span>
                </div>
                <span className="text-[10px] uppercase tracking-wider font-semibold px-2.5 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-[var(--text-muted)]">
                  {book?.fileType.toUpperCase()}
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                Typography reflow, font substitution, and margin adjustments are disabled because text and illustrations are already embedded directly into the page plates.
              </p>
              <div className="pt-1 text-[11px] text-[var(--text-muted)]/80 italic">
                Tip: Use the footer zoom stepper (− / +) and view modes (Single, Spread, Scroll) to scale pages.
              </div>
            </div>
          ) : (
            /* Reflowable Typography Controls for EPUB, TXT, MOBI, FB2, RTF, MD */
            <>
              {/* Typeface Selection */}
              <div>
                <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block mb-2">
                  Typeface
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {fonts.map((f) => {
                    const isActive = preferences.fontFamily === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => onChange({ fontFamily: f.id })}
                        className={`p-3 rounded-2xl text-left border transition cursor-pointer flex items-center justify-between ${
                          isActive
                            ? 'bg-[#0071E3] dark:bg-[#2997FF] text-white border-transparent shadow-xs'
                            : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-color)] hover:border-[var(--border-hover)]'
                        }`}
                      >
                        <div>
                          <div className={`text-[13px] leading-tight ${f.previewClass}`}>
                            {f.name}
                          </div>
                          <div
                            className={`text-[10px] mt-0.5 ${
                              isActive ? 'text-white/80' : 'text-[var(--text-muted)]'
                            }`}
                          >
                            {f.subtitle}
                          </div>
                        </div>
                        {isActive && <Check className="w-4 h-4 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Side-by-Side Typography Fine-Tuning: Font Size & Line Spacing */}
              <div className="grid grid-cols-2 gap-3">
                {/* Font Size Card */}
                <div className="p-3.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] flex flex-col justify-between h-[84px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                      Size
                    </span>
                    <span className="font-num text-[13px] font-semibold text-[var(--text-primary)]">
                      {preferences.fontSize}px
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-0.5 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => onChange({ fontSize: Math.max(14, preferences.fontSize - 1) })}
                      disabled={preferences.fontSize <= 14}
                      className="w-9 h-7 rounded-lg flex items-center justify-center text-[var(--text-primary)] hover:bg-[var(--bg-surface)] disabled:opacity-25 disabled:pointer-events-none transition cursor-pointer active:scale-95"
                      title="Decrease font size"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]/40" />
                    <button
                      type="button"
                      onClick={() => onChange({ fontSize: Math.min(28, preferences.fontSize + 1) })}
                      disabled={preferences.fontSize >= 28}
                      className="w-9 h-7 rounded-lg flex items-center justify-center text-[var(--text-primary)] hover:bg-[var(--bg-surface)] disabled:opacity-25 disabled:pointer-events-none transition cursor-pointer active:scale-95"
                      title="Increase font size"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Line Spacing (Leading) Card */}
                <div className="p-3.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] flex flex-col justify-between h-[84px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                      Leading
                    </span>
                    <span className="font-num text-[13px] font-semibold text-[var(--text-primary)]">
                      {preferences.lineHeight.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] p-0.5 shadow-2xs">
                    <button
                      type="button"
                      onClick={() =>
                        onChange({
                          lineHeight: Math.max(1.4, Number((preferences.lineHeight - 0.1).toFixed(1))),
                        })
                      }
                      disabled={preferences.lineHeight <= 1.4}
                      className="w-9 h-7 rounded-lg flex items-center justify-center text-[var(--text-primary)] hover:bg-[var(--bg-surface)] disabled:opacity-25 disabled:pointer-events-none transition cursor-pointer active:scale-95"
                      title="Decrease leading"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]/40" />
                    <button
                      type="button"
                      onClick={() =>
                        onChange({
                          lineHeight: Math.min(2.0, Number((preferences.lineHeight + 0.1).toFixed(1))),
                        })
                      }
                      disabled={preferences.lineHeight >= 2.0}
                      className="w-9 h-7 rounded-lg flex items-center justify-center text-[var(--text-primary)] hover:bg-[var(--bg-surface)] disabled:opacity-25 disabled:pointer-events-none transition cursor-pointer active:scale-95"
                      title="Increase leading"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Margins & Alignment */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                {/* Margins Width */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">
                    Margins
                  </span>
                  <div className="grid grid-cols-3 gap-1 bg-[var(--bg-surface)] p-1 rounded-2xl border border-[var(--border-color)]">
                    {(['narrow', 'balanced', 'wide'] as ContentWidth[]).map((w) => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => onChange({ contentWidth: w })}
                        className={`py-2 text-[11px] font-medium capitalize rounded-xl transition cursor-pointer text-center ${
                          preferences.contentWidth === w
                            ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-xs font-semibold'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Alignment */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">
                    Alignment
                  </span>
                  <div className="grid grid-cols-2 gap-1 bg-[var(--bg-surface)] p-1 rounded-2xl border border-[var(--border-color)]">
                    <button
                      type="button"
                      onClick={() => onChange({ textAlign: 'left' })}
                      className={`py-2 flex items-center justify-center gap-1.5 text-[11px] font-medium rounded-xl transition cursor-pointer ${
                        preferences.textAlign === 'left'
                          ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-xs font-semibold'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                      title="Left Align"
                    >
                      <AlignLeft className="w-3.5 h-3.5" />
                      <span>Left</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onChange({ textAlign: 'justify' })}
                      className={`py-2 flex items-center justify-center gap-1.5 text-[11px] font-medium rounded-xl transition cursor-pointer ${
                        preferences.textAlign === 'justify'
                          ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-xs font-semibold'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                      title="Justified Align"
                    >
                      <AlignJustify className="w-3.5 h-3.5" />
                      <span>Justify</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Focus Line Ruler Toggle */}
              <div className="pt-2 border-t border-[var(--border-color)]">
                <label className="flex items-center justify-between cursor-pointer group">
                  <div className="flex items-center gap-2.5">
                    <Eye className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition" />
                    <div>
                      <span className="text-[13px] font-medium text-[var(--text-primary)] block">
                        Focus Line Ruler
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)] block">
                        Guides eye smoothly across lines while reading
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onChange({ focusRulerActive: !preferences.focusRulerActive })}
                    className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                      preferences.focusRulerActive
                        ? 'bg-[#0071E3] dark:bg-[#2997FF]'
                        : 'bg-[var(--border-color)]'
                    }`}
                    aria-label="Toggle focus line ruler"
                  >
                    <span
                      className={`block w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                        preferences.focusRulerActive ? 'translate-x-4.5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </label>
              </div>
            </>
          )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
