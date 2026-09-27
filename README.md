# ChordLab (React + Vite + TypeScript)

A faithful conversion of the single-file ChordLab HTML app into a
Vite + React + TypeScript project, preserving all functionality and the
original visual design exactly.

## Run it

```bash
npm install
npm run dev
```

Then open the printed local URL. `npm run build` type-checks and produces a
production build in `dist/`.

## Structure

```
src/
  lib/
    chords.ts          NOTES, FLATS, CHORD_TYPES, OPEN_STRINGS,
                        findVoicing, diagramSVG, transposeChord
    audio.ts            fft, chromaOfWindow, bestChord, analyzeBuffer,
                        detectPitch
    transliterate.ts    transliterate, scriptOf, DEV, TAM maps
    storage.ts          localStorage helpers for the song library
  context/
    SongContext.tsx     shared song-library state (songs, current song)
  components/
    Library.tsx         song library + search + quick actions
    Analyze.tsx         file/record input, offline chord detection, lyrics
    Live.tsx            live chord detection via AnalyserNode
    Chords.tsx          chord/root/type picker + diagrams
    Tuner.tsx           autocorrelation pitch detection tuner
    SongDetail.tsx       transpose/capo, playback, practice studio,
                        chord sheet, PDF/PNG export
    ChordDiagram.tsx    renders one SVG guitar-chord diagram
    BottomNav.tsx       fixed tab bar
    Panel.tsx           reusable ".panel" wrapper
  App.tsx               view routing / top-level state
  main.tsx              React entry point
  styles.css            the original app's CSS, unchanged
  types.ts              Song, Row, ViewName types
```

## Notes on the conversion

- All five main views (Library, Analyze, Live, Chords, Tuner) plus the Song
  Detail view stay mounted simultaneously and are shown/hidden with the same
  `.view` / `.view.active` CSS classes as the original — this preserves state
  (recording state, tuner readings, playback position, transpose, etc.) when
  switching tabs, exactly like the original single-page app.
- The FFT, chroma extraction, chord-matching, autocorrelation pitch
  detection, chord-voicing finder, and SVG diagram generator were ported
  statement-for-statement into `src/lib/`.
- `localStorage` (song persistence), `window.print()` (PDF export), and the
  `<canvas>`-based PNG export all work exactly as before.
- Audio nodes (`AudioContext`, `AnalyserNode`, `MediaRecorder`,
  `MediaStream`) are held in `useRef`s so they survive re-renders without
  being recreated.
