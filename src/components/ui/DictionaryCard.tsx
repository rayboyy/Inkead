import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Volume2, X, Search } from 'lucide-react';
import { BlinkingDots } from './LoadingState';

interface DictionaryCardProps {
  word: string;
  isOpen: boolean;
  onClose: () => void;
}

interface DefinitionItem {
  definition: string;
  example?: string;
  synonyms?: string[];
}

interface Meaning {
  partOfSpeech: string;
  definitions: DefinitionItem[];
}

interface WordData {
  word: string;
  source: 'dictionary' | 'wiktionary' | 'wikipedia';
  phonetic?: string;
  audio?: string;
  thumbnail?: string;
  meanings: Meaning[];
}

async function fetchJsonSafe(url: string): Promise<any> {
  // 1. Try local proxy
  try {
    const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl);
    if (res.ok) return await res.json();
  } catch {
    // fallback
  }

  // 2. Try direct fetch
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'InkeadReader/1.0 (https://inkead.app)' },
    });
    if (res.ok) return await res.json();
  } catch {
    // fallback
  }

  // 3. Fallback to AllOrigins CORS proxy
  try {
    const allOrigins = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    const res = await fetch(allOrigins);
    if (res.ok) return await res.json();
  } catch {
    // ignore
  }

  return null;
}

/**
 * Multi-tier definition lookup engine
 */
async function lookupTerm(query: string): Promise<WordData | null> {
  const target = query.trim().replace(/^[^\w\s]+|[^\w\s]+$/g, '');
  if (!target) return null;

  // --- TIER 1: Free Dictionary API (for single words and stemmed variants) ---
  if (!target.includes(' ')) {
    const wordsToTry = [target.toLowerCase()];
    const w = target.toLowerCase();
    if (w.endsWith('ies')) wordsToTry.push(w.slice(0, -3) + 'y');
    if (w.endsWith('es')) wordsToTry.push(w.slice(0, -2));
    if (w.endsWith('s') && !w.endsWith('ss')) wordsToTry.push(w.slice(0, -1));
    if (w.endsWith('ing')) {
      wordsToTry.push(w.slice(0, -3) + 'e');
      wordsToTry.push(w.slice(0, -3));
    }
    if (w.endsWith('ed')) {
      wordsToTry.push(w.slice(0, -1));
      wordsToTry.push(w.slice(0, -2));
    }

    for (const testWord of wordsToTry) {
      const dictUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(testWord)}`;
      const json = await fetchJsonSafe(dictUrl);
      if (Array.isArray(json) && json.length > 0) {
        const entry = json[0];
        let audioUrl = '';
        if (entry.phonetics && Array.isArray(entry.phonetics)) {
          for (const p of entry.phonetics) {
            if (p.audio && p.audio.length > 0) {
              audioUrl = p.audio;
              break;
            }
          }
        }

        return {
          word: entry.word || target,
          source: 'dictionary',
          phonetic: entry.phonetic || entry.phonetics?.[0]?.text || '',
          audio: audioUrl,
          meanings: entry.meanings || [],
        };
      }
    }
  }

  // --- TIER 2: Wiktionary API ---
  try {
    const wiktionaryUrl = `https://en.wiktionary.org/api/rest_v1/page/definition/${encodeURIComponent(
      target.replace(/\s+/g, '_')
    )}`;
    const wiktJson = await fetchJsonSafe(wiktionaryUrl);
    if (wiktJson && wiktJson.en && Array.isArray(wiktJson.en) && wiktJson.en.length > 0) {
      const meanings: Meaning[] = wiktJson.en
        .map((item: any) => ({
          partOfSpeech: item.partOfSpeech || 'General',
          definitions: (item.definitions || []).map((d: any) => ({
            definition: d.definition.replace(/<[^>]+>/g, '').trim(),
            example: (d.examples || [])[0]?.replace(/<[^>]+>/g, '').trim(),
          })),
        }))
        .filter((m: Meaning) => m.definitions.length > 0);

      if (meanings.length > 0) {
        return {
          word: target,
          source: 'wiktionary',
          phonetic: '',
          meanings,
        };
      }
    }
  } catch (err) {
    console.warn('Wiktionary error:', err);
  }

  // --- TIER 3: Wikipedia Summary API (for concepts, entities, multi-word terms) ---
  try {
    const wikiUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
      target.replace(/\s+/g, '_')
    )}`;
    const wikiJson = await fetchJsonSafe(wikiUrl);
    if (wikiJson && (wikiJson.extract || wikiJson.description)) {
      return {
        word: wikiJson.title || target,
        source: 'wikipedia',
        phonetic: wikiJson.description || 'Encyclopedic Concept',
        thumbnail: wikiJson.thumbnail?.source || '',
        meanings: [
          {
            partOfSpeech: wikiJson.description || 'Overview',
            definitions: [
              {
                definition: wikiJson.extract || 'No extract available.',
              },
            ],
          },
        ],
      };
    }
  } catch (err) {
    console.warn('Wikipedia summary error:', err);
  }

  return null;
}

export const DictionaryCard: React.FC<DictionaryCardProps> = ({ word, isOpen, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<WordData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const cleanQuery = (raw: string) => {
    return raw
      .trim()
      .replace(/^[^\w\s]+|[^\w\s]+$/g, '')
      .replace(/\s+/g, ' ');
  };

  const executeLookup = useCallback(async (query: string) => {
    const target = cleanQuery(query);
    if (!target) return;

    setLoading(true);
    setErrorMsg(null);
    setData(null);

    // 1. Try looking up the full query
    let result = await lookupTerm(target);

    // 2. If no result and multiple words were selected (e.g. user selected a sentence or phrase),
    // try the most significant word (skip common stop words)
    if (!result && target.includes(' ')) {
      const words = target.split(' ').map((w) => w.replace(/[^\w]/g, '')).filter(Boolean);
      const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
      const significantWord = words.find((w) => !stopWords.has(w.toLowerCase()) && w.length > 2) || words[0];

      if (significantWord && significantWord.toLowerCase() !== target.toLowerCase()) {
        result = await lookupTerm(significantWord);
      }
    }

    if (result) {
      setData(result);
    } else {
      setErrorMsg(
        `No definition located for "${target}". Check spelling or try a simpler root term above.`
      );
    }
    setLoading(false);
  }, []);

  // When card opens or word prop changes
  useEffect(() => {
    if (isOpen && word) {
      const initial = cleanQuery(word);
      setSearchTerm(initial);
      executeLookup(initial);
    }
  }, [isOpen, word, executeLookup]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      executeLookup(searchTerm.trim());
    }
  };

  const playPronunciation = () => {
    if (data?.audio) {
      const audio = new Audio(data.audio);
      audio.play().catch(() => playSpeechFallback());
    } else {
      playSpeechFallback();
    }
  };

  const playSpeechFallback = () => {
    const query = data?.word || searchTerm;
    if ('speechSynthesis' in window && query) {
      const utterance = new SpeechSynthesisUtterance(query);
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const sourceLabels: Record<WordData['source'], { label: string; badgeClass: string }> = {
    dictionary: {
      label: 'Standard Lexicon',
      badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
    },
    wiktionary: {
      label: 'Wiktionary',
      badgeClass: 'bg-[#0071E3]/10 text-[#0071E3] dark:text-[#2997FF] border-[#0071E3]/20',
    },
    wikipedia: {
      label: 'Encyclopedia',
      badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
    },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
          {/* Backdrop Scrim */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/35 dark:bg-black/65 backdrop-blur-xs"
          />

          {/* Lexicon Card Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-color)',
            }}
            className="relative w-full max-w-lg max-h-[85vh] flex flex-col border rounded-3xl shadow-2xl overflow-hidden z-10 text-[var(--text-primary)] [background-clip:padding-box]"
          >
            {/* Header with Search Bar */}
            <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-surface)] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-[#0071E3]/10 dark:bg-[#2997FF]/15 text-[#0071E3] dark:text-[#2997FF] flex items-center justify-center">
                    <BookOpen className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <span className="text-[13px] font-semibold tracking-tight text-[var(--text-primary)]">
                    Lexicon & Dictionary
                  </span>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--border-color)]/50 transition cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Inline Search Input */}
              <form onSubmit={handleSearchSubmit} className="relative w-full">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Look up any word, term, or phrase..."
                  className="w-full pl-8 pr-16 py-2 text-xs rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[#0071E3] select-text"
                />
                <button
                  type="submit"
                  disabled={loading || !searchTerm.trim()}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[11px] font-medium rounded-lg bg-[#0071E3] text-white hover:bg-[#0071E3]/90 disabled:opacity-40 transition cursor-pointer"
                >
                  Lookup
                </button>
              </form>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1 select-text">
              {loading && (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-[var(--text-muted)]">
                  <BlinkingDots size="md" color="bg-[#0071E3]" />
                  <span className="text-xs tracking-wider uppercase font-medium">
                    Consulting Lexicon & Wiktionary...
                  </span>
                </div>
              )}

              {errorMsg && !loading && (
                <div className="py-8 text-center px-4 space-y-3">
                  <p className="text-xs text-[var(--text-primary)] leading-relaxed font-normal max-w-sm mx-auto">
                    {errorMsg}
                  </p>
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={playSpeechFallback}
                      className="px-3 py-1.5 rounded-full text-xs font-medium bg-[var(--bg-surface)] hover:bg-[var(--border-color)] border border-[var(--border-color)] text-[var(--text-primary)] transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Pronounce aloud</span>
                    </button>
                  </div>
                </div>
              )}

              {data && !loading && (
                <div className="space-y-4">
                  {/* Word Header */}
                  <div className="flex items-start justify-between pb-3 border-b border-[var(--border-color)]/70">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)] capitalize">
                          {data.word}
                        </h2>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            sourceLabels[data.source].badgeClass
                          }`}
                        >
                          {sourceLabels[data.source].label}
                        </span>
                      </div>
                      {data.phonetic && (
                        <p className="text-xs font-sans text-[var(--text-muted)] font-normal">
                          {data.phonetic}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={playPronunciation}
                      className="p-2.5 rounded-full bg-[#0071E3]/10 text-[#0071E3] dark:text-[#2997FF] hover:bg-[#0071E3]/20 transition cursor-pointer"
                      title="Listen to pronunciation"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Thumbnail if encyclopedia concept */}
                  {data.thumbnail && (
                    <div className="p-2 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] max-w-xs mx-auto overflow-hidden">
                      <img
                        src={data.thumbnail}
                        alt={data.word}
                        className="rounded-xl max-h-48 w-auto mx-auto object-contain"
                        loading="lazy"
                      />
                    </div>
                  )}

                  {/* Meanings */}
                  <div className="space-y-4">
                    {data.meanings.slice(0, 4).map((m, mIdx) => (
                      <div key={mIdx} className="space-y-2">
                        <span className="inline-block px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider rounded-full bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-color)]">
                          {m.partOfSpeech}
                        </span>
                        <ol className="list-decimal list-inside space-y-2 text-xs text-[var(--text-primary)] pl-1 leading-relaxed">
                          {m.definitions.slice(0, 3).map((def, dIdx) => (
                            <li key={dIdx} className="text-xs leading-relaxed font-normal">
                              <span className="text-[var(--text-primary)] font-medium">
                                {def.definition}
                              </span>
                              {def.example && (
                                <p className="mt-1 text-[11.5px] italic text-[var(--text-muted)] pl-3 border-l-2 border-[#0071E3]/40">
                                  "{def.example}"
                                </p>
                              )}
                            </li>
                          ))}
                        </ol>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
