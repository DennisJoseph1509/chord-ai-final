import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import type { Song } from '../types';
import { loadSongs, saveSongs } from '../lib/storage';

interface SongContextValue {
  songs: Song[];
  addSong: (song: Song) => void;
  deleteSong: (song: Song) => void;
  currentSongIndex: number | null;
  setCurrentSongIndex: (i: number | null) => void;
  currentSong: Song | null;
}

const SongContext = createContext<SongContextValue | undefined>(undefined);

export function SongProvider({ children }: { children: ReactNode }) {
  const [songs, setSongs] = useState<Song[]>(() => loadSongs());
  const [currentSongIndex, setCurrentSongIndex] = useState<number | null>(null);

  const addSong = useCallback((song: Song) => {
    setSongs(prev => {
      const next = [song, ...prev];
      saveSongs(next);
      return next;
    });
  }, []);

  const deleteSong = useCallback((song: Song) => {
    setSongs(prev => {
      const next = prev.filter(s => s !== song);
      saveSongs(next);
      return next;
    });
  }, []);

  const currentSong = currentSongIndex !== null ? songs[currentSongIndex] ?? null : null;

  return (
    <SongContext.Provider
      value={{ songs, addSong, deleteSong, currentSongIndex, setCurrentSongIndex, currentSong }}
    >
      {children}
    </SongContext.Provider>
  );
}

export function useSongs(): SongContextValue {
  const ctx = useContext(SongContext);
  if (!ctx) throw new Error('useSongs must be used within a SongProvider');
  return ctx;
}
