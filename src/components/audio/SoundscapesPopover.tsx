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
            className="fixed inset-0 bg-black/15 dark:bg-black/40 backdrop-blur-[2px] pointer-events-auto"
          />

          {/* Fixed Layout Anchor */}
          <div className="fixed inset-0 flex items-start justify-end p-4 sm:pr-28 pt-16 pointer-events-none z-50">
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
              className="w-[420px] max-w-[calc(100vw-32px)] p-6 rounded-3xl border shadow-2xl text-[var(--text-primary)] select-none space-y-5 no-scrollbar pointer-events-auto [background-clip:padding-box] [outline:none]"
            >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#0071E3]/10 dark:bg-[#2997FF]/15 border border-[#0071E3]/20 flex items-center justify-center text-[#0071E3] dark:text-[#2997FF]">
                {isAudioActive ? (
                  <Volume2 className="w-4 h-4 animate-pulse" />
                ) : (
                  <VolumeX className="w-4 h-4 text-[var(--text-muted)]" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-[13px] font-semibold text-[var(--text-primary)] tracking-tight">
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

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleMasterToggle}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
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
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1.5 rounded-full hover:bg-[var(--bg-surface)] transition cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Sound Channels */}
          <div className="space-y-3">
            {channels.map((ch) => {
              const Icon = ch.icon;
              const pct = Math.round(ch.value * 100);
              const isActive = !state.isMuted && ch.value > 0;

              return (
                <div
                  key={ch.key}
                  className="p-3 rounded-2xl bg-[var(--bg-surface)]/70 border border-[var(--border-color)] space-y-2 transition-colors"
                >
                  <div className="flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => handleSliderChange(ch.key, ch.value > 0 ? 0 : 0.4)}
                      className="flex items-center gap-2 font-medium text-[var(--text-primary)] hover:opacity-80 transition cursor-pointer"
                      title={ch.value > 0 ? 'Mute channel' : 'Set to 40%'}
                    >
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                          isActive
                            ? 'bg-[#0071E3] dark:bg-[#2997FF] text-white shadow-2xs'
                            : 'bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border-color)]'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[12px]">{ch.label}</span>
                    </button>

                    <span className="font-num text-xs font-medium text-[var(--text-muted)] tabular-nums">
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
                      background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${pct}%, var(--border-color) ${pct}%, var(--border-color) 100%)`,
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
          <div className="pt-2 border-t border-[var(--border-color)]">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)] block mb-2">
              Curated Presets
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => applyScene(0.4, 0.15, 0)}
                className="py-1.5 px-2 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-card)] border border-[var(--border-color)] text-[11px] font-medium text-[var(--text-primary)] transition cursor-pointer text-center"
              >
                Rainy Study
              </button>
              <button
                type="button"
                onClick={() => applyScene(0.15, 0, 0.55)}
                className="py-1.5 px-2 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-card)] border border-[var(--border-color)] text-[11px] font-medium text-[var(--text-primary)] transition cursor-pointer text-center"
              >
                Campfire
              </button>
              <button
                type="button"
                onClick={() => applyScene(0, 0.5, 0)}
                className="py-1.5 px-2 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-card)] border border-[var(--border-color)] text-[11px] font-medium text-[var(--text-primary)] transition cursor-pointer text-center"
              >
                Deep Focus
              </button>
            </div>
          </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
