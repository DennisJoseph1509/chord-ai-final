import { useEffect, useRef, useState } from 'react';
import { NOTES } from '../lib/chords';
import { detectPitch } from '../lib/audio';

export default function Tuner() {
  const [running, setRunning] = useState(false);
  const [note, setNote] = useState('—');
  const [status, setStatus] = useState('Play a note');
  const [needlePct, setNeedlePct] = useState(50);

  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const stop = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current = null;
    setRunning(false);
    setStatus('Play a note');
  };

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      src.connect(analyser);
      setRunning(true);
      setStatus('listening…');
      const buf = new Float32Array(analyser.fftSize);
      const loop = () => {
        analyser.getFloatTimeDomainData(buf);
        const freq = detectPitch(buf, ctx.sampleRate);
        if (freq > 0) {
          const noteNum = 12 * Math.log2(freq / 440) + 69;
          const rounded = Math.round(noteNum);
          const cents = Math.round((noteNum - rounded) * 100);
          setNote(NOTES[((rounded % 12) + 12) % 12] + (Math.floor(rounded / 12) - 1));
          setStatus((cents > 0 ? '+' : '') + cents + ' cents');
          setNeedlePct(50 + Math.max(-45, Math.min(45, (cents / 50) * 45)));
        }
        rafRef.current = requestAnimationFrame(loop);
      };
      loop();
    } catch {
      setStatus('Microphone access was blocked.');
    }
  };

  const toggle = () => (running ? stop() : start());

  useEffect(() => () => stop(), []);

  return (
    <>
      <h1 className="h1">Tuner</h1>
      <p className="sub">Chromatic, accurate to a few cents.</p>
      <div className="panel">
        <div className="notebig">{note}</div>
        <div className="centsline">{status}</div>
        <div className="gauge">
          <div className="mid" />
          <div className="needle" style={{ left: needlePct + '%' }} />
        </div>
        <button className="btn block" onClick={toggle}>
          {running ? '⏹ Stop tuner' : '🎙️ Start tuner'}
        </button>
      </div>
      <div className="panel">
        <h3>Standard tuning</h3>
        <div className="chips">
          {['E2', 'A2', 'D3', 'G3', 'B3', 'E4'].map(c => (
            <span className="chip" key={c}>
              {c}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
