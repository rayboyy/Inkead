import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CloudRain, Radio, Flame, Volume2, VolumeX, X } from 'lucide-react';
import { SoundscapeState } from '../../types';
import { soundEngine } from '../../lib/audio';

interface SoundscapesPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  state: SoundscapeState;
  onChange: (newState: SoundscapeState) => void;
}

export const SoundscapesPopover: React.FC<SoundscapesPopoverProps> = ({
  isOpen,
  onClose,
  state,
  onChange,
}) => {
  const handleMasterToggle = () => {
    const nextState = { ...state, isMuted: !state.isMuted };
    onChange(nextState);
    soundEngine.updateVolumes(nextState);
  };

  const handleSliderChange = (key: keyof Omit<SoundscapeState, 'isMuted'>, value: number) => {
    const nextState = {
      ...state,
      [key]: value,
      // Automatically unmute if user raises a slider
      isMuted: state.isMuted && value > 0 ? false : state.isMuted,
    };
    onChange(nextState);
    soundEngine.updateVolumes(nextState);
  };

  const applyScene = (rain: number, brown: number, fire: number) => {
    const nextState: SoundscapeState = {
      rainVolume: rain,
      brownNoiseVolume: brown,
      fireVolume: fire,
      isMuted: false,
    };
    onChange(nextState);
    soundEngine.updateVolumes(nextState);
  };

  const muteAll = () => {
    const nextState: SoundscapeState = {
      ...state,
      isMuted: true,
    };
    onChange(nextState);
    soundEngine.updateVolumes(nextState);
  };

  const isAudioActive =
    !state.isMuted &&
    (state.rainVolume > 0 || state.brownNoiseVolume > 0 || state.fireVolume > 0);

  const channels: {
    key: keyof Omit<SoundscapeState, 'isMuted'>;
    label: string;
    icon: typeof CloudRain;
    value: number;
  }[] = [
    { key: 'rainVolume', label: 'Soft Rain', icon: CloudRain, value: state.rainVolume },
    { key: 'brownNoiseVolume', label: 'Deep Brown Noise', icon: Radio, value: state.brownNoiseVolume },
    { key: 'fireVolume', label: 'Cozy Fireplace', icon: Flame, value: state.fireVolume },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          {/* Smooth Backdrop Scrim */}
          <motion.div
            key="soundscapes-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-xs pointer-events-auto"
          />

          {/* Fixed Layout Anchor */}
          <div className="fixed inset-0 flex items-start justify-end p-4 sm:pr-24 pt-16 pointer-events-none z-50">
            {/* Popover Card - Solid Theme Background, Zero-Scale, Zero-Jitter Pure Fade */}
            <motion.div
              key="soundscapes-card"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-color)',
              }}
              className="w-[360px] sm:w-[376px] max-w-[calc(100vw-32px)] p-4 sm:p-5 rounded-3xl border shadow-2xl text-[var(--text-primary)] select-none space-y-4 no-scrollbar pointer-events-auto antialiased [background-clip:padding-box] [outline:none]"
            >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-colors ${
                  isAudioActive
                    ? 'bg-[#0071E3]/10 dark:bg-[#2997FF]/15 border-[#0071E3]/25 text-[#0071E3] dark:text-[#2997FF]'
                    : 'bg-[var(--bg-surface)] border-[var(--border-color)] text-[var(--text-muted)]'
                }`}
              >
                {isAudioActive ? (
                  <Volume2 className="w-4 h-4 animate-pulse" />
                ) : (
                  <VolumeX className="w-4 h-4" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-[13.5px] font-semibold text-[var(--text-primary)] tracking-tight">
                    Soundscapes
                  </h3>
                  {isAudioActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0071E3] dark:bg-[#2997FF] animate-ping" />
                  )}
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Procedural ambient synthesis
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleMasterToggle}
                className={`h-7 px-2.5 rounded-full text-[11.5px] font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                  state.isMuted
                    ? 'bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-color)]'
                    : 'bg-[#0071E3] dark:bg-[#2997FF] text-white shadow-2xs'
                }`}
                title={state.isMuted ? 'Unmute audio' : 'Mute audio'}
              >
                {state.isMuted ? (
                  <>
                    <VolumeX className="w-3 h-3" />
                    <span>Muted</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3 h-3" />
                    <span>Active</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1.5 rounded-full hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Sound Channels */}
          <div className="space-y-2.5">
            {channels.map((ch) => {
              const Icon = ch.icon;
              const pct = Math.round(ch.value * 100);
              const isActive = !state.isMuted && ch.value > 0;
              const trackColor = state.isMuted ? 'var(--text-muted)' : 'var(--accent)';

              return (
                <div
                  key={ch.key}
                  className={`p-3 rounded-2xl border space-y-2.5 transition-colors ${
                    isActive
                      ? 'bg-[var(--bg-surface)] border-[var(--border-color)]'
                      : 'bg-[var(--bg-surface)]/55 border-[var(--border-color)]/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleSliderChange(ch.key, ch.value > 0 ? 0 : 0.4)}
                      className="flex items-center gap-2.5 font-medium text-[var(--text-primary)] hover:opacity-85 transition-opacity cursor-pointer"
                      title={ch.value > 0 ? 'Mute channel' : 'Set to 40%'}
                    >
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center transition-colors ${
                          isActive
                            ? 'bg-[#0071E3] dark:bg-[#2997FF] text-white shadow-2xs'
                            : 'bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border-color)]'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[12.5px] font-medium">{ch.label}</span>
                    </button>

                    <span
                      className={`font-num text-[11px] font-semibold tabular-nums px-2 py-0.5 rounded-full border ${
                        isActive
                          ? 'bg-[#0071E3]/10 dark:bg-[#2997FF]/15 border-[#0071E3]/20 text-[#0071E3] dark:text-[#2997FF]'
                          : 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-muted)]'
                      }`}
                    >
                      {pct}%
                    </span>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={ch.value}
                    style={{
                      background: `linear-gradient(to right, ${trackColor} 0%, ${trackColor} ${pct}%, var(--border-color) ${pct}%, var(--border-color) 100%)`,
                      opacity: state.isMuted ? 0.55 : 1,
                    }}
                    onChange={(e) => handleSliderChange(ch.key, parseFloat(e.target.value))}
                    className="reader-scrubber"
                    aria-label={ch.label}
                  />
                </div>
              );
            })}
          </div>

          {/* Curated Ambient Mixes */}
          <div className="pt-3 border-t border-[var(--border-color)]">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)] block mb-2">
              Curated Presets
            </span>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { label: 'Rainy Study', r: 0.4, b: 0.15, f: 0 },
                  { label: 'Campfire', r: 0.15, b: 0, f: 0.55 },
                  { label: 'Deep Focus', r: 0, b: 0.5, f: 0 },
                ] as const
              ).map((preset) => {
                const isSelected =
                  !state.isMuted &&
                  Math.abs(state.rainVolume - preset.r) < 0.02 &&
                  Math.abs(state.brownNoiseVolume - preset.b) < 0.02 &&
                  Math.abs(state.fireVolume - preset.f) < 0.02;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => applyScene(preset.r, preset.b, preset.f)}
                    className={`py-2 px-2 rounded-xl border text-[11.5px] font-medium transition-all cursor-pointer text-center ${
                      isSelected
                        ? 'bg-[#0071E3] dark:bg-[#2997FF] border-transparent text-white shadow-xs'
                        : 'bg-[var(--bg-surface)] hover:bg-[var(--bg-card)] border-[var(--border-color)] hover:border-[var(--border-hover)] text-[var(--text-primary)]'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
