import type { Song } from '../types';

const KEY = 'chordlab_songs';

export function loadSongs(): Song[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveSongs(songs: Song[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(songs));
  } catch {
    // localStorage unavailable or full — fail silently, matching original behavior
  }
}
