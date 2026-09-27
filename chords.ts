export const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export const CHORD_TYPES: Record<string, number[]> = {
  'Major': [0, 4, 7],
  'Minor': [0, 3, 7],
  'Dominant 7th': [0, 4, 7, 10],
  'Major 7th': [0, 4, 7, 11],
  'Minor 7th': [0, 3, 7, 10],
  'Sus2': [0, 2, 7],
  'Sus4': [0, 5, 7],
  '6th': [0, 4, 7, 9],
  '9th': [0, 4, 7, 10, 2],
  'Diminished': [0, 3, 6],
  'Augmented': [0, 4, 8],
  'Add9': [0, 4, 7, 2],
};

export const OPEN_STRINGS = [40, 45, 50, 55, 59, 64]; // low E..high E, MIDI

export interface Voicing {
  frets: (number | null)[];
  base: number;
}

export function findVoicing(rootIdx: number, intervals: number[]): Voicing {
  const need = new Set(intervals.map(i => (rootIdx + i) % 12));
  for (let base = 0; base <= 9; base++) {
    const frets: (number | null)[] = [];
    let sounding = 0;
    const covered = new Set<number>();
    for (let s = 0; s < 6; s++) {
      let chosen: number | null = null;
      const lo = base === 0 ? 0 : base;
      const hi = base === 0 ? 4 : base + 3;
      for (let f = lo; f <= hi; f++) {
        const pc = (OPEN_STRINGS[s] + f) % 12;
        if (need.has(pc)) {
          chosen = f;
          covered.add(pc);
          break;
        }
      }
      frets.push(chosen);
      if (chosen !== null) sounding++;
    }
    const rootCovered = frets.some((f, s) => f !== null && (OPEN_STRINGS[s] + f) % 12 === rootIdx);
    if (sounding >= Math.min(4, intervals.length + 1) && rootCovered) return { frets, base };
  }
  return { frets: [null, null, null, null, null, null], base: 0 };
}

export function diagramSVG(frets: (number | null)[], base: number): string {
  const w = 110, h = 130, top = 18, stringGap = 18, fretGap = 22;
  let s = `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">`;
  for (let i = 0; i < 6; i++) {
    const x = 8 + i * stringGap;
    s += `<line x1="${x}" y1="${top}" x2="${x}" y2="${top + 4 * fretGap}" stroke="#241c38" stroke-width="1.5"/>`;
  }
  for (let f = 0; f <= 4; f++) {
    const y = top + f * fretGap;
    s += `<line x1="8" y1="${y}" x2="${8 + 5 * stringGap}" y2="${y}" stroke="#241c38" stroke-width="${f === 0 && base === 0 ? 3 : 1.5}"/>`;
  }
  if (base > 0) s += `<text x="${8 + 5 * stringGap + 6}" y="${top + fretGap}" font-size="10" fill="#6b5f7a">${base}fr</text>`;
  frets.forEach((f, i) => {
    const x = 8 + i * stringGap;
    if (f === null) {
      s += `<text x="${x}" y="${top - 6}" font-size="11" fill="#c0392b" text-anchor="middle">x</text>`;
      return;
    }
    if (f === 0) {
      s += `<circle cx="${x}" cy="${top - 9}" r="4" fill="none" stroke="#241c38" stroke-width="1.5"/>`;
      return;
    }
    const rel = base === 0 ? f : f - base + 1;
    const y = top + (rel - 1) * fretGap + fretGap / 2;
    s += `<circle cx="${x}" cy="${y}" r="6.5" fill="#ff9d2e"/>`;
  });
  s += '</svg>';
  return s;
}

export function transposeChord(chord: string, semis: number, useFlats: boolean): string {
  const m = chord.match(/^([A-G]#?)(.*)$/);
  if (!m) return chord;
  const table = useFlats ? FLATS : NOTES;
  const idx = NOTES.indexOf(m[1]) >= 0 ? NOTES.indexOf(m[1]) : FLATS.indexOf(m[1]);
  const ni = ((idx + semis) % 12 + 12) % 12;
  return table[ni] + m[2];
}
