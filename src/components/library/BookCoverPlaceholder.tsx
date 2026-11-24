import React from 'react';
import { Book } from '../../types';

export interface CoverPalette {
  id: string;
  name: string;
  bg: string;
  border: string;
  crease: string;
  text: string;
  tag: string;
}

export const BOOK_COVER_PALETTES: CoverPalette[] = [
  // 1. Nordic Teal / Deep Sea (User's reference screenshot color)
  {
    id: 'nordic-teal',
    name: 'Nordic Teal',
    bg: '#2C5E65',
    border: 'rgba(235, 245, 245, 0.40)',
    crease: 'rgba(0, 0, 0, 0.28)',
    text: '#FAF7F0',
    tag: '#FFFFFF',
  },
  // 2. Oxblood / Burgundy Crimson
  {
    id: 'oxblood-crimson',
    name: 'Oxblood Crimson',
    bg: '#66222D',
    border: 'rgba(255, 235, 235, 0.40)',
    crease: 'rgba(0, 0, 0, 0.30)',
    text: '#FAF5EE',
    tag: '#FFFFFF',
  },
  // 3. Midnight Navy / Deep Indigo
  {
    id: 'midnight-navy',
    name: 'Midnight Navy',
    bg: '#1D3450',
    border: 'rgba(225, 240, 255, 0.40)',
    crease: 'rgba(0, 0, 0, 0.30)',
    text: '#FAF8F4',
    tag: '#FFFFFF',
  },
  // 4. Forest Pine / British Racing Green
  {
    id: 'forest-pine',
    name: 'Forest Pine',
    bg: '#264835',
    border: 'rgba(230, 250, 235, 0.40)',
    crease: 'rgba(0, 0, 0, 0.30)',
    text: '#FAF7EE',
    tag: '#FFFFFF',
  },
  // 5. Tuscan Terracotta / Burnt Clay
  {
    id: 'tuscan-terracotta',
    name: 'Tuscan Terracotta',
    bg: '#843C28',
    border: 'rgba(255, 235, 220, 0.40)',
    crease: 'rgba(0, 0, 0, 0.28)',
    text: '#FAF5EE',
    tag: '#FFFFFF',
  },
  // 6. Royal Plum / Aubergine
  {
    id: 'royal-plum',
    name: 'Royal Plum',
    bg: '#4A2A52',
    border: 'rgba(245, 225, 250, 0.40)',
    crease: 'rgba(0, 0, 0, 0.30)',
    text: '#FAF7F2',
    tag: '#FFFFFF',
  },
  // 7. Storm Slate / Dusk Blue
  {
    id: 'storm-slate',
    name: 'Storm Slate',
    bg: '#33485E',
    border: 'rgba(225, 240, 255, 0.40)',
    crease: 'rgba(0, 0, 0, 0.28)',
    text: '#FAF8F4',
    tag: '#FFFFFF',
  },
  // 8. Havana Cocoa / Tobacco Brown
  {
    id: 'havana-cocoa',
    name: 'Havana Cocoa',
    bg: '#533928',
    border: 'rgba(250, 235, 215, 0.40)',
    crease: 'rgba(0, 0, 0, 0.30)',
    text: '#FAF6EE',
    tag: '#FFFFFF',
  },
  // 9. Sage Moss / Olive Canvas
  {
    id: 'sage-moss',
    name: 'Sage Moss',
    bg: '#3D533C',
    border: 'rgba(235, 245, 230, 0.40)',
    crease: 'rgba(0, 0, 0, 0.28)',
    text: '#FAF7F0',
    tag: '#FFFFFF',
  },
  // 10. Vintage Ochre / Amber Canvas
  {
    id: 'vintage-ochre',
    name: 'Vintage Ochre',
    bg: '#7E551B',
    border: 'rgba(255, 245, 220, 0.40)',
    crease: 'rgba(0, 0, 0, 0.28)',
    text: '#FAF6ED',
    tag: '#FFFFFF',
  },
  // 11. Dark Basalt / Mineral Charcoal
  {
    id: 'dark-basalt',
    name: 'Dark Basalt',
    bg: '#252C34',
    border: 'rgba(235, 240, 245, 0.38)',
    crease: 'rgba(0, 0, 0, 0.35)',
    text: '#FAF7F2',
    tag: '#FFFFFF',
  },
  // 12. Aegean Azure / Mediterranean Blue
  {
    id: 'aegean-azure',
    name: 'Aegean Azure',
    bg: '#204A6E',
    border: 'rgba(220, 240, 255, 0.40)',
    crease: 'rgba(0, 0, 0, 0.28)',
    text: '#FAF8F4',
    tag: '#FFFFFF',
  },
  // 13. Deep Boysenberry / Crimson Wine
  {
    id: 'crimson-wine',
    name: 'Crimson Wine',
    bg: '#59202D',
    border: 'rgba(255, 230, 235, 0.40)',
    crease: 'rgba(0, 0, 0, 0.30)',
    text: '#FAF5EE',
    tag: '#FFFFFF',
  },
  // 14. Eucalyptus Spruce / Nordic Pine
  {
    id: 'eucalyptus-spruce',
    name: 'Eucalyptus Spruce',
    bg: '#2B544E',
    border: 'rgba(230, 250, 245, 0.40)',
    crease: 'rgba(0, 0, 0, 0.28)',
    text: '#FAF7F2',
    tag: '#FFFFFF',
  },
  // 15. Rich Mulberry / Royal Damson
  {
    id: 'royal-damson',
    name: 'Royal Damson',
    bg: '#542442',
    border: 'rgba(250, 225, 245, 0.40)',
    crease: 'rgba(0, 0, 0, 0.30)',
    text: '#FAF6F2',
    tag: '#FFFFFF',
  },
  // 16. Canyon Rust / Sienna Leather
  {
    id: 'canyon-rust',
    name: 'Canyon Rust',
    bg: '#793F30',
    border: 'rgba(255, 235, 225, 0.40)',
    crease: 'rgba(0, 0, 0, 0.28)',
    text: '#FAF5EE',
    tag: '#FFFFFF',
  },
];

/**
 * Returns a distinct, random/hashed clothbound palette for each book.
 * If book.coverColor is set, matches that id/hex.
 * Otherwise, derives deterministically from book ID and title so it stays distinct and consistent per book.
 */
export function getBookCoverPalette(book: Book): CoverPalette {
  if (book.coverColor) {
    const found = BOOK_COVER_PALETTES.find(
      (p) => p.id === book.coverColor || p.bg.toLowerCase() === book.coverColor?.toLowerCase()
    );
    if (found) return found;
  }

  const seed = `${book.id}__${book.title || ''}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % BOOK_COVER_PALETTES.length;
  return BOOK_COVER_PALETTES[index];
}

interface BookCoverPlaceholderProps {
  book: Book;
  size?: 'card' | 'thumb';
  className?: string;
}

export const BookCoverPlaceholder: React.FC<BookCoverPlaceholderProps> = ({
  book,
  size = 'card',
  className = '',
}) => {
  const palette = getBookCoverPalette(book);
  const isThumb = size === 'thumb';

  const formatTag = (book.fileType || 'MD').toUpperCase();

  if (isThumb) {
    return (
      <div
        style={{ backgroundColor: palette.bg }}
        className={`w-full h-full relative flex flex-col items-center justify-between p-1 overflow-hidden select-none ${className}`}
      >
        {/* Left Book Spine Crease Line */}
        <div
          style={{ backgroundColor: palette.crease }}
          className="absolute left-1 top-0 bottom-0 w-px pointer-events-none opacity-50"
        />

        {/* Inset Border Frame */}
        <div
          style={{ borderColor: palette.border }}
          className="w-full h-full rounded-md border flex flex-col items-center justify-between py-1 px-0.5 text-center"
        >
          <span
            style={{ color: palette.tag }}
            className="text-[7.5px] font-bold font-mono tracking-widest uppercase leading-none"
          >
            {formatTag}
          </span>
          <span
            style={{ color: palette.text }}
            className="text-[8.5px] font-serif font-medium line-clamp-2 leading-tight px-0.5 break-words"
          >
            {book.title}
          </span>
          <span className="w-1 h-px bg-white/30" />
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ backgroundColor: palette.bg }}
      className={`w-full h-full relative flex flex-col p-2.5 sm:p-3 overflow-hidden select-none transition-colors duration-300 ${className}`}
    >
      {/* Subtle Hardcover Lighting Sheen */}
      <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-white/10 pointer-events-none" />

      {/* Real Hardcover Spine Crease Line along left edge */}
      <div
        style={{ backgroundColor: palette.crease }}
        className="absolute left-2.5 sm:left-3 top-0 bottom-0 w-[1.5px] pointer-events-none opacity-60 shadow-xs"
      />

      {/* Elegant Inset Rounded Frame (matching user screenshot) */}
      <div
        style={{ borderColor: palette.border }}
        className="relative z-10 w-full h-full rounded-xl sm:rounded-2xl border flex flex-col items-center justify-between py-4 sm:py-5 px-2.5 sm:px-3 text-center overflow-hidden"
      >
        {/* Format Badge at Top Center (e.g. MD, EPUB, PDF, TXT) */}
        <div>
          <span
            style={{ color: palette.tag }}
            className="text-[11px] sm:text-[12px] font-semibold tracking-[0.2em] font-mono uppercase"
          >
            {formatTag}
          </span>
        </div>

        {/* Center Title in Editorial Literary Serif */}
        <div className="my-auto px-1 max-w-full flex items-center justify-center">
          <h2
            style={{
              color: palette.text,
              textShadow: '0 1px 3px rgba(0,0,0,0.3)',
            }}
            className="font-serif text-[17px] sm:text-[19px] md:text-[21px] font-normal leading-[1.3] tracking-tight line-clamp-4 break-words"
          >
            {book.title}
          </h2>
        </div>

        {/* Subtle Bottom Accent (Author strictly contained inside frame) */}
        <div className="w-full max-w-[85%] px-2 min-h-[16px] mb-1 flex items-center justify-center overflow-hidden">
          {book.author && book.author !== 'Unknown' && book.author !== 'Unknown Author' ? (
            <p
              style={{ color: palette.border }}
              title={book.author}
              className="text-[8px] sm:text-[9px] font-medium tracking-[0.04em] uppercase truncate max-w-full text-center leading-none"
            >
              {book.author}
            </p>
          ) : (
            <span style={{ color: palette.border }} className="text-[9px] tracking-widest opacity-60">
              ◆
            </span>
          )}
        </div>
      </div>
    </div>
  );
};