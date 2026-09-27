export interface Row {
  tag?: string;
  chord?: string;
  text?: string;
  script?: 'devanagari' | 'tamil' | 'latin';
}

export interface Song {
  id: number;
  title: string;
  artist: string;
  bpm: number;
  key: string;
  capo: string;
  duration: number;
  rows: Row[];
  chords: string[];
  audioUrl: string;
  translit: string;
}

export type ViewName = 'library' | 'analyze' | 'live' | 'chords' | 'tuner' | 'song';
