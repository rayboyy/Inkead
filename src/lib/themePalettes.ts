import { ReadingTheme, ThemeMode, ThemePalette } from '../types';

export interface PaletteDefinition {
  id: ThemePalette;
  name: string;
  lightBg: string;
  lightText: string;
  lightBorder: string;
  darkBg: string;
  darkText: string;
  darkBorder: string;
}

export const THEME_PALETTES: PaletteDefinition[] = [
  {
    id: 'default',
    name: 'Default',
    lightBg: '#FFFFFF',
    lightText: '#1D1D1F',
    lightBorder: '#E5E7EB',
    darkBg: '#0B0C0E',
    darkText: '#F5F5F7',
    darkBorder: '#27272A',
  },
  {
    id: 'gray',
    name: 'Gray',
    lightBg: '#E5E7EB',
    lightText: '#1F2937',
    lightBorder: '#D1D5DB',
    darkBg: '#18181B',
    darkText: '#F4F4F5',
    darkBorder: '#3F3F46',
  },
  {
    id: 'sepia',
    name: 'Sepia',
    lightBg: '#F4ECD8',
    lightText: '#3B2F23',
    lightBorder: '#E2D6BB',
    darkBg: '#1C1814',
    darkText: '#EFE3D3',
    darkBorder: '#383027',
  },
  {
    id: 'grass',
    name: 'Grass',
    lightBg: '#D9E4D3',
    lightText: '#223820',
    lightBorder: '#C4D4BD',
    darkBg: '#121A13',
    darkText: '#D6EAD8',
    darkBorder: '#263828',
  },
  {
    id: 'cherry',
    name: 'Cherry',
    lightBg: '#F7D6DE',
    lightText: '#5C1D2E',
    lightBorder: '#EBB9C5',
    darkBg: '#1A1014',
    darkText: '#F7D6DE',
    darkBorder: '#3A202D',
  },
  {
    id: 'sky',
    name: 'Sky',
    lightBg: '#D3E4FD',
    lightText: '#1E3A8A',
    lightBorder: '#B9D5FC',
    darkBg: '#0F172A',
    darkText: '#E0EDFD',
    darkBorder: '#283B56',
  },
  {
    id: 'solarized',
    name: 'Solarized',
    lightBg: '#FDF6E3',
    lightText: '#073642',
    lightBorder: '#EEE8D5',
    darkBg: '#002B36',
    darkText: '#93A1A1',
    darkBorder: '#0E4856',
  },
  {
    id: 'gruvbox',
    name: 'Gruvbox',
    lightBg: '#FBF1C7',
    lightText: '#3C3836',
    lightBorder: '#D5C4A1',
    darkBg: '#282828',
    darkText: '#EBDBB2',
    darkBorder: '#504945',
  },
  {
    id: 'nord',
    name: 'Nord',
    lightBg: '#E5E9F0',
    lightText: '#2E3440',
    lightBorder: '#D8DEE9',
    darkBg: '#2E3440',
    darkText: '#ECEFF4',
    darkBorder: '#434C5E',
  },
];

// Helper to normalize legacy theme names
export function normalizeTheme(theme: ReadingTheme): ThemePalette {
  if (theme === 'alabaster') return 'default';
  if (theme === 'parchment') return 'sepia';
  if (theme === 'eink') return 'gray';
  if (theme === 'oled') return 'default';
  return (theme as ThemePalette) || 'default';
}
