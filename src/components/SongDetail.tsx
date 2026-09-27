import { useEffect, useRef, useState } from 'react';
import { useSongs } from '../context/SongContext';
import { NOTES, CHORD_TYPES, transposeChord } from '../lib/chords';
import { transliterate, DEV, TAM } from '../lib/transliterate';
import ChordDiagram from './ChordDiagram';
import type { ViewName } from '../types';

interface Props {
  go: (view: ViewName) => void;
}

function fmt(t: number): string {
  if (!isFinite(t)) return '0:00';
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function SongDetail({ go }: Props) {
  const { currentSong, deleteSong } = useSongs();

  const [transpose, setTranspose] = useState(0);
  const [capoIdx, setCapoIdx] = useState(0);
  const [textSize, setTextSize] = useState(15);
  const [translitOn, setTranslitOn] = useState(true);
  const [flatsOn, setFlatsOn] = useState(false);
  const [autoscroll, setAutoscroll] = useState(0);

  const [speed, setSpeed] = useState(100);
  const [pitch, setPitch] = useState(0);
  const [metroOn, setMetroOn] = useState(false);
  const [countinOn, setCountinOn] = useState(true);
  const [loopStage, setLoopStage] = useState<'idle' | 'a-set' | 'looping'>('idle');
  const [loopA, setLoopA] = useState<number | null>(null);
  const [loopB, setLoopB] = useState<number | null>(null);
  const [volume, setVolume] = useState(100);
  const [separating, setSeparating] = useState(false);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const metroTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const metroCtxRef = useRef<AudioContext | null>(null);
  const loopStageRef = useRef(loopStage);
  const loopARef = useRef(loopA);
  const loopBRef = useRef(loopB);

  loopStageRef.current = loopStage;
  loopARef.current = loopA;
  loopBRef.current = loopB;

  // Reset per-song controls and load the audio source whenever the open song changes,
  // matching the original openSong()'s transpose=0 / capoIdx=0 reset.
  useEffect(() => {
    setTranspose(0);
    setCapoIdx(0);
    setLoopStage('idle');
    setLoopA(null);
    setLoopB(null);
    setPlaying(false);
    if (audioRef.current) {
      audioRef.current.src = currentSong?.audioUrl || '';
    }
  }, [currentSong]);

  useEffect(() => {
    return () => {
      if (metroTimerRef.current) clearInterval(metroTimerRef.current);
    };
  }, []);

  if (!currentSong) {
    return (
      <div className="detailhead">
        <button className="backbtn" onClick={() => go('library')}>
          ← Library
        </button>
      </div>
    );
  }

  const handleDelete = () => {
    deleteSong(currentSong);
    go('library');
  };

  const barCount = Math.max(4, Math.round(currentSong.duration / ((4 * 60) / currentSong.bpm)));
  const barButtons: { label: string; time: number }[] = [];
  for (let b = 1; b <= Math.min(barCount, 24); b += 8) {
    const t = ((b - 1) * 4 * 60) / currentSong.bpm;
    barButtons.push({ label: `Bar ${b} · ${fmt(t)}`, time: t });
  }

  const usedChords = currentSong.chords.map(c => {
    const m = c.match(/^([A-G]#?)(.*)$/);
    const rootIdx = m ? NOTES.indexOf(m[1]) : 0;
    const intervals = m && m[2] === 'm' ? CHORD_TYPES['Minor'] : CHORD_TYPES['Major'];
    return { chord: c, rootIdx, intervals };
  });

  const handlePlayPause = () => {
    const audio = audioRef.current;
    if (!audio || !audio.src) return;
    if (audio.paused) {
      audio.play();
      setPlaying(true);
    } else {
      audio.pause();
      setPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrentTime(audio.currentTime);
    setDuration(audio.duration || 0);
    if (loopStageRef.current === 'looping' && loopBRef.current != null && audio.currentTime >= loopBRef.current) {
      audio.currentTime = loopARef.current || 0;
    }
  };

  const handleSeek = (v: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = v;
    setCurrentTime(v);
  };

  const handleSpeed = (v: number) => {
    setSpeed(v);
    if (audioRef.current) audioRef.current.playbackRate = v / 100;
  };

  const handleLoopClick = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (loopStage === 'idle') {
      setLoopA(audio.currentTime);
      setLoopStage('a-set');
    } else if (loopStage === 'a-set') {
      setLoopB(audio.currentTime);
      setLoopStage('looping');
    } else {
      setLoopA(null);
      setLoopB(null);
      setLoopStage('idle');
    }
  };

  const loopLabel = loopStage === 'idle' ? 'Set A' : loopStage === 'a-set' ? 'Set B' : 'Clear loop';

  const handleSeparate = () => {
    setSeparating(true);
    setTimeout(() => setSeparating(false), 1200);
  };

  const handleMetroToggle = () => {
    const next = !metroOn;
    setMetroOn(next);
    if (next) {
      const bpm = currentSong.bpm;
      metroTimerRef.current = setInterval(() => {
        const AudioCtx =
          window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = metroCtxRef.current || (metroCtxRef.current = new AudioCtx());
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.value = 1000;
        g.gain.value = 0.25;
        o.connect(g);
        g.connect(ctx.destination);
        o.start();
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        o.stop(ctx.currentTime + 0.06);
      }, 60000 / bpm);
    } else if (metroTimerRef.current) {
      clearInterval(metroTimerRef.current);
      metroTimerRef.current = null;
    }
  };

  const handleExportPdf = () => window.print();

  const handleExportImg = () => {
    const container = document.getElementById('sheetBody');
    if (!container) return;
    const rows = [...container.querySelectorAll<HTMLElement>('.sheetline, h4')];
    const w = 800,
      pad = 36;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = pad * 2 + 70 + rows.length * 26;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#fbf2df';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#241c38';
    ctx.font = 'bold 26px Georgia';
    ctx.fillText(currentSong.title, pad, pad);
    ctx.font = '13px Georgia';
    ctx.fillStyle = '#6b5f7a';
    ctx.fillText(`Key: ${currentSong.key} · ${currentSong.bpm} BPM · Capo: ${currentSong.capo}`, pad, pad + 20);
    let y = pad + 60;
    rows.forEach(el => {
      if (el.tagName === 'H4') {
        ctx.fillStyle = '#c0392b';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(el.textContent || '', pad, y);
      } else if (el.classList.contains('sheetlyric')) {
        ctx.fillStyle = '#241c38';
        ctx.font = '15px Georgia';
        ctx.fillText(el.textContent || '', pad, y);
      } else {
        ctx.fillStyle = '#c0392b';
        ctx.font = 'bold 14px monospace';
        ctx.fillText(el.textContent || '', pad, y);
      }
      y += 26;
    });
    const a = document.createElement('a');
    a.download = 'chord-sheet.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
  };

  return (
    <>
      <div className="detailhead">
        <button className="backbtn" onClick={() => go('library')}>
          ← Library
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="iconbtn" title="Export PDF" onClick={handleExportPdf}>
            ⬇ PDF
          </button>
          <button className="iconbtn" title="Export image" onClick={handleExportImg}>
            ⬇ PNG
          </button>
          <button className="iconbtn" title="Delete" onClick={handleDelete}>
            🗑
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="row2">
          <div>
            <label className="hint">TRANSPOSE</label>
            <div className="stepper">
              <button onClick={() => setTranspose(t => t - 1)}>−</button>
              <span className="mono">{transpose}</span>
              <button onClick={() => setTranspose(t => t + 1)}>+</button>
            </div>
          </div>
          <div>
            <label className="hint">CAPO</label>
            <div className="stepper">
              <button onClick={() => setCapoIdx(c => Math.max(0, c - 1))}>−</button>
              <span className="mono">{capoIdx === 0 ? 'None' : capoIdx}</span>
              <button onClick={() => setCapoIdx(c => Math.min(11, c + 1))}>+</button>
            </div>
          </div>
        </div>
        <div className="sliderow">
          <div className="lab">
            <span>Text size</span>
          </div>
          <input type="range" min={12} max={22} value={textSize} onChange={e => setTextSize(Number(e.target.value))} />
        </div>
        <div className="togrow">
          <span>Show transliteration</span>
          <button className={`switch${translitOn ? ' on' : ''}`} onClick={() => setTranslitOn(v => !v)} />
        </div>
        <div className="togrow">
          <span>Use flats (♭)</span>
          <button className={`switch${flatsOn ? ' on' : ''}`} onClick={() => setFlatsOn(v => !v)} />
        </div>
        <div className="sliderow">
          <div className="lab">
            <span>Autoscroll</span>
          </div>
          <input type="range" min={0} max={100} value={autoscroll} onChange={e => setAutoscroll(Number(e.target.value))} />
        </div>
      </div>

      <div className="panel">
        <div className="seekrow">
          <button
            className="btn"
            style={{ borderRadius: '50%', width: 44, height: 44, padding: 0 }}
            onClick={handlePlayPause}
          >
            {playing ? '⏸' : '▶'}
          </button>
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={e => handleSeek(Number(e.target.value))}
          />
          <span className="mini">
            {fmt(currentTime)} / {fmt(duration)}
          </span>
        </div>
      </div>

      <div className="panel">
        <h3>🎛️ Practice studio</h3>
        <p className="hint">
          {currentSong.audioUrl
            ? 'Audio for this song is available on this device.'
            : "The audio for this song isn't available on this device."}
        </p>
        <div className="sliderow">
          <div className="lab">
            <span>Speed</span>
            <span>{speed}%</span>
          </div>
          <input type="range" min={50} max={150} value={speed} onChange={e => handleSpeed(Number(e.target.value))} />
        </div>
        <div className="sliderow">
          <div className="lab">
            <span>Pitch</span>
            <span>
              {pitch > 0 ? '+' : ''}
              {pitch}
            </span>
          </div>
          <input type="range" min={-6} max={6} value={pitch} onChange={e => setPitch(Number(e.target.value))} />
        </div>
        <p className="hint">
          Speed is fully real (with pitch kept steady). True pitch-shift needs a DSP library this offline build doesn't
          load, so the pitch slider is a preview control only.
        </p>
        <div className="togrow">
          <span>Metronome</span>
          <button className={`switch${metroOn ? ' on' : ''}`} onClick={handleMetroToggle} />
        </div>
        <div className="togrow">
          <span>One bar count-in</span>
          <button className={`switch${countinOn ? ' on' : ''}`} onClick={() => setCountinOn(v => !v)} />
        </div>
        <div className="togrow">
          <span>Loop section</span>
          <button className="btn secondary small" onClick={handleLoopClick}>
            {loopLabel}
          </button>
        </div>
        <label className="hint" style={{ display: 'block', marginTop: 10 }}>
          Sections
        </label>
        <div className="barlist">
          {barButtons.map(b => (
            <button key={b.label} onClick={() => handleSeek(b.time)}>
              {b.label}
            </button>
          ))}
        </div>
        <div className="togrow" style={{ marginTop: 12 }}>
          <span>Tracks</span>
          <button className="btn secondary small" onClick={handleSeparate}>
            {separating ? 'Separating…' : 'Separate vocals & instruments'}
          </button>
        </div>
        <div className="sliderow">
          <div className="lab">
            <span>Original</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={volume}
            onChange={e => {
              const v = Number(e.target.value);
              setVolume(v);
              if (audioRef.current) audioRef.current.volume = v / 100;
            }}
          />
        </div>
      </div>

      <div className="panel">
        <h3>Chords used</h3>
        <div className="field" style={{ marginTop: 0 }}>
          <label>Instrument</label>
          <select>
            <option>Guitar (standard)</option>
          </select>
        </div>
        <div className="diagramgrid">
          {usedChords.map(c => (
            <ChordDiagram key={c.chord} name={c.chord} rootIdx={c.rootIdx} intervals={c.intervals} />
          ))}
        </div>
      </div>

      <div className="sheet" id="printArea">
        <div id="sheetBody" style={{ fontSize: textSize }}>
          {currentSong.rows.map((r, i) => {
            if (r.tag) return <h4 key={i}>[{r.tag}]</h4>;
            let text = r.text || '';
            if (translitOn && r.script === 'devanagari') text = transliterate(r.text || '', DEV);
            else if (translitOn && r.script === 'tamil') text = transliterate(r.text || '', TAM);
            const chord = transposeChord(r.chord || '', transpose, flatsOn);
            return (
              <div key={i}>
                <div className="sheetline">
                  <span className="sheetchord">{chord}</span>
                </div>
                <div className="sheetline sheetlyric">{text}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="footerCard">
        <div style={{ fontWeight: 700 }}>{currentSong.title}</div>
        <div className="k">
          Key: {currentSong.key} · {currentSong.bpm} BPM · Capo: {currentSong.capo}
        </div>
      </div>

      <audio ref={audioRef} style={{ display: 'none' }} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleTimeUpdate} />
    </>
  );
}
