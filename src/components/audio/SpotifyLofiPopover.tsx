import React, { useState, useEffect } from 'react';
import { X, Link2, Power, Radio } from 'lucide-react';
import { BlinkingDots } from '../ui/LoadingState';

export const SpotifyIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
  </svg>
);

export const AudioEqualizer: React.FC<{ className?: string }> = ({ className = 'text-[#1DB954]' }) => (
  <span className={`inline-flex items-end gap-[2px] h-3 ${className}`} aria-hidden="true">
    <span className="w-[2px] h-full rounded-full bg-current animate-eq-1" />
    <span className="w-[2px] h-full rounded-full bg-current animate-eq-2" />
    <span className="w-[2px] h-full rounded-full bg-current animate-eq-3" />
  </span>
);

export interface LofiPlaylist {
  id: string;
  name: string;
  subtitle: string;
  spotifyType: 'playlist' | 'album' | 'track';
  spotifyId: string;
}

const PRELOADED_PLAYLISTS: LofiPlaylist[] = [
  {
    id: 'lofi-beats',
    name: 'Lofi Beats',
    subtitle: 'Chill beats to read & study',
    spotifyType: 'playlist',
    spotifyId: '37i9dQZF1DWWQRwui0ExPn',
  },
  {
    id: 'jazz-vibes',
    name: 'Jazz Vibes',
    subtitle: 'Warm chillhop & mellow jazz',
    spotifyType: 'playlist',
    spotifyId: '37i9dQZF1DX0SM0LYsmbMT',
  },
  {
    id: 'lofi-cafe',
    name: 'Lo-Fi Cafe',
    subtitle: 'Cozy rainy coffeehouse',
    spotifyType: 'playlist',
    spotifyId: '37i9dQZF1DX6VdMW310YC7',
  },
  {
    id: 'deep-focus',
    name: 'Deep Focus',
    subtitle: 'Ambient concentration',
    spotifyType: 'playlist',
    spotifyId: '37i9dQZF1DWZeKCadgRdKQ',
  },
  {
    id: 'peaceful-piano',
    name: 'Peaceful Piano',
    subtitle: 'Soft acoustic piano pages',
    spotifyType: 'playlist',
    spotifyId: '37i9dQZF1DX4sWSpwq3LiO',
  },
];

function parseSpotifyUrl(rawUrl: string): { type: 'playlist' | 'album' | 'track'; id: string } | null {
  const match = rawUrl
    .trim()
    .match(/open\.spotify\.com\/(playlist|album|track)\/([a-zA-Z0-9]+)/i);
  if (!match) return null;
  return {
    type: match[1].toLowerCase() as 'playlist' | 'album' | 'track',
    id: match[2],
  };
}

interface SpotifyLofiPopoverProps {
  isOpen: boolean;
  isActive: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
  onClose: () => void;
}

export const SpotifyLofiPopover: React.FC<SpotifyLofiPopoverProps> = ({
  isOpen,
  isActive,
  onActivate,
  onDeactivate,
  onClose,
}) => {
  const [selectedPlaylist, setSelectedPlaylist] = useState<LofiPlaylist>(PRELOADED_PLAYLISTS[0]);
  const [customUrl, setCustomUrl] = useState('');
  const [customError, setCustomError] = useState('');
  const [isIframeLoading, setIsIframeLoading] = useState(true);

  const shouldMountIframe = isOpen || isActive;
  const embedSrc = `https://open.spotify.com/embed/${selectedPlaylist.spotifyType}/${selectedPlaylist.spotifyId}?utm_source=generator&theme=0`;

  useEffect(() => {
    if (!shouldMountIframe) return;
    setIsIframeLoading(true);
    const fallback = window.setTimeout(() => setIsIframeLoading(false), 3500);
    return () => window.clearTimeout(fallback);
  }, [embedSrc, shouldMountIframe]);

  const handleSelectPlaylist = (pl: LofiPlaylist) => {
    if (pl.id !== selectedPlaylist.id) {
      setIsIframeLoading(true);
      setSelectedPlaylist(pl);
    }
    setCustomError('');
    if (!isActive) onActivate();
  };

  const handleLoadCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseSpotifyUrl(customUrl);
    if (!parsed) {
      setCustomError('Enter a valid open.spotify.com link.');
      return;
    }
    setCustomError('');
    setIsIframeLoading(true);
    setSelectedPlaylist({
      id: `custom-${parsed.id}`,
      name: 'Custom Selection',
      subtitle: `Spotify ${parsed.type}`,
      spotifyType: parsed.type,
      spotifyId: parsed.id,
    });
    setCustomUrl('');
    if (!isActive) onActivate();
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 dark:bg-black/50 backdrop-blur-xs"
          onClick={onClose}
        />
      )}

      {/* Horizontal Landscape Studio Panel — solid card & pure opacity transition for razor-sharp fonts */}
      {shouldMountIframe && (
        <div
          aria-hidden={!isOpen}
          className={`fixed top-16 sm:top-18 right-4 sm:right-6 z-50 w-[680px] lg:w-[740px] max-w-[calc(100vw-2rem)] rounded-3xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-2xl p-4 sm:p-5 text-[var(--text-primary)] select-none antialiased transition-opacity duration-150 ${
            isOpen
              ? 'opacity-100 pointer-events-auto visible'
              : 'opacity-0 pointer-events-none invisible'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Compact Top Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] flex items-center justify-center text-[#1DB954] shrink-0">
                <SpotifyIcon className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-2.5 min-w-0">
                <h3 className="text-[14px] font-semibold tracking-tight text-[var(--text-primary)] truncate">
                  Reading Radio
                </h3>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[var(--bg-surface)] border border-[var(--border-color)] text-[11px] font-medium text-[var(--text-muted)]">
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1DB954] animate-pulse" />
                  )}
                  <span>{isActive ? 'Playing in background when closed' : 'Curated Lofi'}</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {isActive && (
                <button
                  type="button"
                  onClick={() => {
                    onDeactivate();
                    onClose();
                  }}
                  title="Stop & unload player"
                  className="h-7 px-2.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-surface)] text-[11px] font-medium text-[var(--text-muted)] hover:text-[#D92D20] hover:border-[#D92D20]/30 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Power className="w-3 h-3" />
                  <span className="hidden sm:inline">Stop</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                title="Minimize & keep playing in background"
                className="p-1.5 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 2-Column Horizontal Studio Body (compact height, zero vertical bloat) */}
          <div className="mt-3.5 grid grid-cols-1 md:grid-cols-[248px_1fr] gap-4 items-stretch">
            {/* Left Column: Curated Stations + Custom URL */}
            <div className="flex flex-col justify-between gap-2.5">
              <div className="space-y-1.5">
                {PRELOADED_PLAYLISTS.map((pl) => {
                  const selected = selectedPlaylist.id === pl.id;
                  return (
                    <button
                      key={pl.id}
                      type="button"
                      onClick={() => handleSelectPlaylist(pl)}
                      className={`w-full px-3 py-2 rounded-xl border text-left transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                        selected
                          ? 'bg-[#0071E3] dark:bg-[#2997FF] border-transparent text-white shadow-2xs'
                          : 'bg-[var(--bg-surface)] hover:bg-[var(--bg-card)] border-[var(--border-color)] hover:border-[var(--border-hover)] text-[var(--text-primary)]'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-[12.5px] font-semibold leading-tight truncate">
                          {pl.name}
                        </div>
                        <div
                          className={`text-[10.5px] mt-0.5 truncate ${
                            selected ? 'text-white/80' : 'text-[var(--text-muted)]'
                          }`}
                        >
                          {pl.subtitle}
                        </div>
                      </div>
                      {selected && <Radio className="w-3.5 h-3.5 shrink-0 opacity-90" />}
                    </button>
                  );
                })}
              </div>

              {/* Custom Spotify URL */}
              <div>
                <form onSubmit={handleLoadCustom} className="flex items-center gap-1.5">
                  <div className="relative flex-1 min-w-0">
                    <Link2 className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="url"
                      value={customUrl}
                      onChange={(e) => {
                        setCustomUrl(e.target.value);
                        if (customError) setCustomError('');
                      }}
                      placeholder="Spotify URL..."
                      className="w-full h-8 pl-8 pr-2.5 text-[11.5px] rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/60 focus:outline-none focus:border-[#0071E3] transition-colors"
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn-secondary !h-8 !px-3 !rounded-xl text-[11.5px] font-medium cursor-pointer shrink-0"
                  >
                    Load
                  </button>
                </form>
                {customError && (
                  <p className="mt-1 text-[10.5px] text-[#D92D20] dark:text-[#FF453A]">
                    {customError}
                  </p>
                )}
              </div>
            </div>

            {/* Right Column: Full-Height Non-Minimized Spotify Embed (352px is Spotify's full-tracklist breakpoint) */}
            <div className="relative h-[352px] rounded-2xl overflow-hidden border border-[var(--border-color)] bg-[#121212]">
              <div
                className={`absolute inset-0 z-10 flex flex-col items-center justify-center gap-2.5 bg-[var(--bg-surface)] transition-opacity duration-250 ease-out ${
                  isIframeLoading ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                }`}
              >
                <BlinkingDots size="md" />
                <span className="text-[12px] font-medium text-[var(--text-muted)]">
                  Tuning {selectedPlaylist.name}...
                </span>
              </div>

              <iframe
                key={embedSrc}
                title={`Spotify Player - ${selectedPlaylist.name}`}
                src={embedSrc}
                width="100%"
                height="100%"
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                onLoad={() => setIsIframeLoading(false)}
                className={`block w-full h-full transition-opacity duration-300 ease-out ${
                  isIframeLoading ? 'opacity-0' : 'opacity-100'
                }`}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
