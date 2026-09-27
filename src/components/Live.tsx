import { useEffect, useRef, useState } from 'react';
import { NOTES } from '../lib/chords';
import { bestChord } from '../lib/audio';

export default function Live() {
  const [listening, setListening] = useState(false);
  const [chordRead, setChordRead] = useState('—');
  const [bars, setBars] = useState<number[]>(Array(12).fill(4));
  const [resolution, setResolution] = useState<'beat' | 'half'>('beat');
  const [tempo, setTempo] = useState(98);

  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const tapsRef = useRef<number[]>([]);

  const stopListening = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current = null;
    setListening(false);
  };

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 4096;
      src.connect(analyser);
      setListening(true);
      const data = new Float32Array(analyser.frequencyBinCount);
      const loop = () => {
        analyser.getFloatFrequencyData(data);
        const chroma = new Array(12).fill(0);
        for (let k = 1; k < data.length; k++) {
          const freq = (k * ctx.sampleRate) / analyser.fftSize;
          if (freq < 80 || freq > 1000) continue;
          const mag = Math.pow(10, data[k] / 20);
          const midi = 69 + 12 * Math.log2(freq / 440);
          const pc = ((Math.round(midi) % 12) + 12) % 12;
          chroma[pc] += mag;
        }
        const mx = Math.max(...chroma) || 1;
        setBars(chroma.map(v => Math.max(4, (v / mx) * 100)));
        setChordRead(bestChord(chroma.map(v => v / mx)) || '—');
        rafRef.current = requestAnimationFrame(loop);
      };
      loop();
    } catch {
      setChordRead('mic blocked');
    }
  };

  const toggleListening = () => {
    if (listening) stopListening();
    else startListening();
  };

  useEffect(() => () => stopListening(), []);

  const handleTap = () => {
    const now = performance.now();
    tapsRef.current = tapsRef.current.filter(t => now - t < 2500);
    tapsRef.current.push(now);
    if (tapsRef.current.length > 1) {
      const avg = (tapsRef.current[tapsRef.current.length - 1] - tapsRef.current[0]) / (tapsRef.current.length - 1);
      const bpm = Math.round(60000 / avg);
      setTempo(Math.min(220, Math.max(40, bpm)));
    }
  };

  return (
    <>
      <h1 className="h1">Live chords</h1>
      <p className="sub">One chord is locked in on every beat while you play.</p>
      <div className="panel">
        <div className="chordread">{chordRead}</div>
        <div className="notebars">
          {bars.map((h, i) => (
            <div className="bar" key={i}>
              <i style={{ height: h + '%' }} />
            </div>
          ))}
        </div>
        <div className="notebars lbl">
          {NOTES.map(n => (
            <div key={n}>{n}</div>
          ))}
        </div>
        <button className="btn block" onClick={toggleListening}>
          {listening ? '⏹ Stop listening' : '🎙️ Start listening'}
        </button>
      </div>
      <div className="panel">
        <div className="field" style={{ marginTop: 0 }}>
          <label>Instrument</label>
          <select>
            <option>Guitar (standard)</option>
          </select>
        </div>
        <div className="field">
          <label>Resolution</label>
          <div className="row2">
            <button
              className={`btn secondary small${resolution === 'beat' ? ' active' : ''}`}
              onClick={() => setResolution('beat')}
            >
              1 / beat
            </button>
            <button
              className={`btn secondary small${resolution === 'half' ? ' active' : ''}`}
              onClick={() => setResolution('half')}
            >
              1 / half beat
            </button>
          </div>
        </div>
        <div className="field">
          <label>
            Tempo — <span>{tempo}</span> BPM
          </label>
          <input
            type="range"
            min={40}
            max={220}
            value={tempo}
            style={{ width: '100%', accentColor: 'var(--amber)' }}
            onChange={e => setTempo(Number(e.target.value))}
          />
        </div>
        <button className="btn secondary block" onClick={handleTap}>
          Tap tempo
        </button>
      </div>
    </>
  );
}
