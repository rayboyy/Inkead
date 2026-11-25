import React, { useState, useEffect } from 'react';
import { X, Link2, Power } from 'lucide-react';
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
    subtitle: 'Chill beats to read',
    spotifyType: 'playlist',
    spotifyId: '37i9dQZF1DWWQRwui0ExPn',
  },
  {
    id: 'jazz-vibes',
    name: 'Jazz Vibes',
    subtitle: 'Mellow chillhop & jazz',
    spotifyType: 'playlist',
    spotifyId: '37i9dQZF1DX0SM0LYsmbMT',
  },
  {
    id: 'lofi-cafe',
    name: 'Lo-Fi Cafe',
    subtitle: 'Rainy coffeehouse vibes',
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
    subtitle: 'Soft acoustic piano',
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
      setCustomError('Enter a valid open.spotify.com playlist, album, or track URL.');
      return;
    }
    setCustomError('');
    setIsIframeLoading(true);
    setSelectedPlaylist({
      id: `custom-${parsed.id}`,
      name: 'Custom Playlist',
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

      {/* Solid, zero-scale, zero-blur-text container so fonts stay razor-sharp while iframe persists */}
      {shouldMountIframe && (
        <div
          aria-hidden={!isOpen}
          className={`fixed top-16 sm:top-18 right-4 sm:right-6 z-50 w-[348px] sm:w-[372px] max-w-[calc(100vw-2rem)] rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-2xl p-4 text-[var(--text-primary)] select-none antialiased transition-opacity duration-150 ${
            isOpen
              ? 'opacity-100 pointer-events-auto visible'
              : 'opacity-0 pointer-events-none invisible'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] flex items-center justify-center text-[#1DB954] shrink-0">
                <SpotifyIcon className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-[13px] font-semibold tracking-tight text-[var(--text-primary)] truncate">
                  Reading Radio
                </h3>
                <p className="text-[11px] text-[var(--text-muted)] truncate">
                  {isActive ? 'Plays in background when closed' : 'Select a lofi playlist'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {isActive && (
                <button
                  type="button"
                  onClick={() => {
                    onDeactivate();
                    onClose();
                  }}
                  title="Stop & unload player"
                  className="p-1.5 rounded-full text-[var(--text-muted)] hover:text-[#D92D20] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
                >
                  <Power className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                title="Close & keep playing"
                className="p-1.5 rounded-full text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Curated Lofi Presets */}
          <div className="mt-3">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)] block mb-2">
              Lofi Playlists
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PRELOADED_PLAYLISTS.map((pl) => {
                const selected = selectedPlaylist.id === pl.id;
                return (
                  <button
                    key={pl.id}
                    type="button"
                    onClick={() => handleSelectPlaylist(pl)}
                    title={pl.subtitle}
                    className={`px-2.5 py-1.5 rounded-xl text-[11.5px] font-medium border transition-colors cursor-pointer ${
                      selected
                        ? 'bg-[#0071E3] dark:bg-[#2997FF] border-transparent text-white shadow-2xs'
                        : 'bg-[var(--bg-surface)] hover:bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-primary)]'
                    }`}
                  >
                    {pl.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Embedded Spotify Player with smooth crossfade loading */}
          <div className="mt-3 relative h-[152px] rounded-xl overflow-hidden border border-[var(--border-color)] bg-[#121212]">
            <div
              className={`absolute inset-0 z-10 flex flex-col items-center justify-center gap-2.5 bg-[var(--bg-surface)] transition-opacity duration-250 ease-out ${
                isIframeLoading ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
              }`}
            >
              <BlinkingDots size="md" />
              <span className="text-[11.5px] font-medium text-[var(--text-muted)]">
                Loading {selectedPlaylist.name}...
              </span>
            </div>

            <iframe
              key={embedSrc}
              title={`Spotify Player - ${selectedPlaylist.name}`}
              src={embedSrc}
              width="100%"
              height="152"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              onLoad={() => setIsIframeLoading(false)}
              className={`block w-full h-full transition-opacity duration-300 ease-out ${
                isIframeLoading ? 'opacity-0' : 'opacity-100'
              }`}
            />
          </div>

          {/* Custom Spotify URL */}
          <form onSubmit={handleLoadCustom} className="mt-3 flex items-center gap-1.5">
            <div className="relative flex-1">
              <Link2 className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="url"
                value={customUrl}
                onChange={(e) => {
                  setCustomUrl(e.target.value);
                  if (customError) setCustomError('');
                }}
                placeholder="Paste Spotify playlist URL..."
                className="w-full pl-8 pr-2.5 py-1.5 text-[11.5px] rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/60 focus:outline-none focus:border-[#0071E3] transition-colors"
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
            <p className="mt-1.5 text-[11px] text-[#D92D20] dark:text-[#FF453A]">
              {customError}
            </p>
          )}
        </div>
      )}
    </>
  );
};
