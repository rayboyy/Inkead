import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Ban, X, Check } from 'lucide-react';
import { ReadingTheme, ThemeMode, UserPreferences } from '../../types';
import { THEME_PALETTES, normalizeTheme } from '../../lib/themePalettes';

export interface ThemeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: UserPreferences;
  onUpdatePreferences: (updated: Partial<UserPreferences>) => void;
  initialScope?: 'library' | 'reader';
}

export const ThemeSettingsModal: React.FC<ThemeSettingsModalProps> = ({
  isOpen,
  onClose,
  preferences,
  onUpdatePreferences,
  initialScope = 'library',
}) => {
  const [scope, setScope] = useState<'library' | 'reader'>(initialScope);

  const currentThemeMode: ThemeMode = preferences.themeMode || (preferences.theme === 'oled' ? 'dark' : 'light');
  const isDarkMode =
    currentThemeMode === 'dark' ||
    (currentThemeMode === 'auto' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const activeTheme = scope === 'library'
    ? (preferences.libraryTheme || preferences.theme)
    : (preferences.readerTheme || preferences.theme);

  const selectedPaletteId = normalizeTheme(activeTheme);

  const handleSelectPalette = (paletteId: string) => {
    const nextTheme = paletteId as ReadingTheme;
    if (scope === 'library') {
      onUpdatePreferences({
        libraryTheme: nextTheme,
        theme: nextTheme,
      });
    } else {
      onUpdatePreferences({
        readerTheme: nextTheme,
        theme: nextTheme,
      });
    }
  };

  const handleSelectMode = (mode: ThemeMode) => {
    onUpdatePreferences({
      themeMode: mode,
      // If switching to oled dark explicitly
      ...(mode === 'dark' && selectedPaletteId === 'default' ? { theme: 'oled' } : {}),
      ...(mode === 'light' && preferences.theme === 'oled' ? { theme: 'default' } : {}),
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none">
          {/* Backdrop */}
          <motion.div
            key="theme-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 dark:bg-black/65"
          />

          {/* Modal Container - Solid, Zero-Scale, Zero-Jitter Pure Fade */}
          <motion.div
            key="theme-modal-dialog"
            data-theme={activeTheme}
            data-theme-mode={isDarkMode ? 'dark' : 'light'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-color)',
            }}
            className={`relative w-full max-w-[460px] rounded-3xl border shadow-2xl p-6 sm:p-7 text-[var(--text-primary)] z-10 overflow-hidden [background-clip:padding-box] [outline:none] space-y-6 ${
              isDarkMode ? 'dark' : ''
            }`}
          >
            {/* Header: Theme Title & Scope Switcher (Library | Reader) */}
            <div className="flex items-center justify-between pb-1">
              <span className="text-[15px] font-medium text-[var(--text-primary)]">
                Theme
              </span>

              <div className="flex items-center gap-3">
                {/* Scope Capsule Pill */}
                <div className="flex items-center p-1 rounded-full bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs">
                  <button
                    type="button"
                    onClick={() => setScope('library')}
                    className={`px-3 py-1 rounded-full font-medium transition cursor-pointer ${
                      scope === 'library'
                        ? 'bg-[#0071E3] text-white shadow-2xs font-semibold'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Library
                  </button>
                  <button
                    type="button"
                    onClick={() => setScope('reader')}
                    className={`px-3 py-1 rounded-full font-medium transition cursor-pointer ${
                      scope === 'reader'
                        ? 'bg-[#0071E3] text-white shadow-2xs font-semibold'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Reader
                  </button>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Section: Theme Mode (Auto, Light, Dark) */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[13.5px] font-medium text-[var(--text-primary)]">
                Theme Mode
              </span>

              <div className="flex items-center gap-2">
                {/* Auto / System Mode */}
                <button
                  type="button"
                  onClick={() => handleSelectMode('auto')}
                  className="relative w-9 h-9 rounded-full flex items-center justify-center cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                  title="Auto (System mode)"
                >
                  {currentThemeMode === 'auto' && (
                    <motion.div
                      layoutId="activeModalThemeModePill"
                      className="absolute inset-0 rounded-full bg-[#0071E3] shadow-xs"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  <span className={`relative z-10 transition-colors ${currentThemeMode === 'auto' ? 'text-white' : ''}`}>
                    <Ban className="w-4 h-4" />
                  </span>
                </button>

                {/* Light Mode */}
                <button
                  type="button"
                  onClick={() => handleSelectMode('light')}
                  className="relative w-9 h-9 rounded-full flex items-center justify-center cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                  title="Light Mode"
                >
                  {currentThemeMode === 'light' && (
                    <motion.div
                      layoutId="activeModalThemeModePill"
                      className="absolute inset-0 rounded-full bg-[#0071E3] shadow-xs"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  <span className={`relative z-10 transition-colors ${currentThemeMode === 'light' ? 'text-white' : ''}`}>
                    <Sun className="w-4 h-4" />
                  </span>
                </button>

                {/* Dark Mode */}
                <button
                  type="button"
                  onClick={() => handleSelectMode('dark')}
                  className="relative w-9 h-9 rounded-full flex items-center justify-center cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                  title="Dark Mode"
                >
                  {currentThemeMode === 'dark' && (
                    <motion.div
                      layoutId="activeModalThemeModePill"
                      className="absolute inset-0 rounded-full bg-[#0071E3] shadow-xs"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  <span className={`relative z-10 transition-colors ${currentThemeMode === 'dark' ? 'text-white' : ''}`}>
                    <Moon className="w-4 h-4" />
                  </span>
                </button>
              </div>
            </div>

            {/* Section: Theme Color (3x3 Grid) */}
            <div className="space-y-2.5 pt-1">
              <span className="text-[13px] font-medium text-[var(--text-muted)]">
                Theme Color
              </span>

              <div className="grid grid-cols-3 gap-2.5">
                {THEME_PALETTES.map((palette) => {
                  const isSelected = selectedPaletteId === palette.id;
                  const bg = isDarkMode ? palette.darkBg : palette.lightBg;
                  const textColor = isDarkMode ? palette.darkText : palette.lightText;
                  const border = isDarkMode ? palette.darkBorder : palette.lightBorder;

                  return (
                    <button
                      key={palette.id}
                      type="button"
                      onClick={() => {
                        React.startTransition(() => {
                          handleSelectPalette(palette.id);
                        });
                      }}
                      style={{
                        backgroundColor: bg,
                        color: textColor,
                        borderColor: border,
                      }}
                      className="h-20 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-colors duration-150 cursor-pointer shadow-2xs relative hover:brightness-98 dark:hover:brightness-110"
                    >
                      {isSelected && (
                        <motion.div
                          layoutId="activeModalThemeColorRing"
                          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                          className="absolute -inset-[1px] rounded-2xl border-2 border-[#0071E3] dark:border-[#2997FF] pointer-events-none"
                        />
                      )}
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0.6, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.14, ease: 'easeOut' }}
                          className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#0071E3] dark:bg-[#2997FF] text-white dark:text-black flex items-center justify-center shadow-xs pointer-events-none"
                        >
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </motion.div>
                      )}
                      <span className="text-[17px] font-bold tracking-tight">
                        Aa
                      </span>
                      <span className="text-[12px] font-medium opacity-90">
                        {palette.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
