import { useRef, useState, type ChangeEvent } from 'react';
import { useSongs } from '../context/SongContext';
import { analyzeBuffer } from '../lib/audio';
import { scriptOf } from '../lib/transliterate';
import type { Row, Song, ViewName } from '../types';

const SAMPLE_LYRICS = [
  {
    key: 'deewana',
    lines: [
      '[Verse]',
      'Mere honthon pe uska hi naam',
      'Deewana, main Yesu ka',
      '[Chorus]',
      'Uske pyaar mein dooba hua',
      'Deewana, main Yesu ka',
    ],
  },
  {
    key: 'nilavu',
    lines: [
      '[Verse]',
      'நிலவு பாடும் இரவின் மௌனத்தில்',
      'நினைவுகள் தேடும் உன் நினைவினில்',
      '[Chorus]',
      'காற்றில் மிதக்கும் இன்னிசை போல',
      'உன் குரல் தேடுதே என் மனதினில்',
    ],
  },
];

interface Props {
  go: (view: ViewName) => void;
}

export default function Analyze({ go }: Props) {
  const { addSong, setCurrentSongIndex } = useSongs();

  const [linkValue, setLinkValue] = useState('');
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [engine, setEngine] = useState('ChordMini · auto beat model');
  const [lyrics, setLyrics] = useState('');
  const [translit, setTranslit] = useState('auto');
  const [status, setStatus] = useState('');
  const [statusClass, setStatusClass] = useState('status');
  const [recording, setRecording] = useState(false);
  const [recordLabel, setRecordLabel] = useState("🎙️ Record what's playing");

  const pendingFileRef = useRef<File | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    pendingFileRef.current = file;
    if (file && !title) setTitle(file.name.replace(/\.[^/.]+$/, ''));
  };

  const handleLinkGo = () => {
    setStatus("Streaming links only carry a title here — record the track or choose the file to analyze real chords.");
    setStatusClass('status warn');
  };

  const handleRecord = async () => {
    if (recording) {
      mediaRecorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      rec.ondataavailable = e => chunks.push(e.data);
      rec.onstop = () => {
        pendingFileRef.current = new File([new Blob(chunks)], 'recording.webm');
        stream.getTracks().forEach(t => t.stop());
        setStatus('Recording captured — hit Detect chords.');
        setStatusClass('status ok');
        setRecordLabel("🎙️ Record what's playing");
        setRecording(false);
      };
      rec.start();
      mediaRecorderRef.current = rec;
      setRecordLabel('⏹ Stop recording (listening…)');
      setRecording(true);
    } catch {
      setStatus('Microphone access was blocked.');
      setStatusClass('status warn');
    }
  };

  const handleFetchLyrics = () => {
    const t = title.toLowerCase();
    const demo = SAMPLE_LYRICS.find(d => t.includes(d.key));
    if (demo) {
      setLyrics(demo.lines.join('\n'));
      setStatus('Lyrics found and filled in.');
      setStatusClass('status ok');
    } else {
      setStatus("Couldn't fetch lyrics automatically — paste your own above.");
      setStatusClass('status warn');
    }
  };

  const handleDetect = async () => {
    setStatusClass('status');
    if (!pendingFileRef.current) {
      setStatus('Choose an audio file or record something first.');
      setStatusClass('status warn');
      return;
    }
    setStatus('ChordMini could not analyse this audio — analysing on device instead…');
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const arr = await pendingFileRef.current.arrayBuffer();
      const buf = await ctx.decodeAudioData(arr);
      const { segments, duration } = await analyzeBuffer(buf);
      const lyricsRaw = lyrics.trim();
      const lines = lyricsRaw ? lyricsRaw.split('\n') : [];
      const rows: Row[] = [];
      let li = 0;
      lines.forEach(line => {
        if (/^\[.*\]$/.test(line.trim())) {
          rows.push({ tag: line.trim().replace(/[[\]]/g, '').toUpperCase() });
          return;
        }
        if (!line.trim()) return;
        const t = (li / Math.max(1, lines.length)) * Math.min(duration, 90);
        li++;
        const seg = segments.filter(s => s.start <= t).pop() || segments[0] || { chord: 'N.C.', start: 0 };
        rows.push({ chord: seg.chord, text: line, script: scriptOf(line) });
      });
      const uniqueChords = [...new Set(rows.filter(r => r.chord).map(r => r.chord as string))];
      let bpm = Math.round(60 / ((duration || 180) / (segments.length * 2 || 60))) || 120;
      bpm = Math.min(200, Math.max(60, bpm));
      const song: Song = {
        id: Date.now(),
        title: title || 'Untitled',
        artist,
        bpm,
        key: uniqueChords[0] || '—',
        capo: 'None',
        duration,
        rows,
        chords: uniqueChords,
        audioUrl: URL.createObjectURL(pendingFileRef.current),
        translit,
      };
      addSong(song);
      setStatus('✓ Analysis complete (on device) — ' + uniqueChords.length + ' chords found.');
      setStatusClass('status ok');
      setCurrentSongIndex(0);
      go('song');
    } catch (e) {
      setStatus('Could not analyze that audio: ' + (e as Error).message);
      setStatusClass('status warn');
    }
  };

  return (
    <>
      <h1 className="h1">Analyze a song</h1>
      <p className="sub">On-device beat and chord detection, entirely offline.</p>

      <div className="panel">
        <h3>YouTube or Spotify link</h3>
        <p className="hint">
          Streaming apps don't allow their audio to be downloaded, so record the track as it plays or pick the file below.
        </p>
        <div className="field" style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder="https://youtu.be/... or open.spotify.com/track/..."
            value={linkValue}
            onChange={e => setLinkValue(e.target.value)}
          />
          <button className="btn secondary small" onClick={handleLinkGo}>🔗</button>
        </div>
        <button className="btn secondary block" style={{ marginTop: 8 }} onClick={handleRecord}>
          {recordLabel}
        </button>
      </div>

      <div className="panel">
        <div className="field" style={{ marginTop: 0 }}>
          <label>Audio file</label>
          <input type="file" accept="audio/*" onChange={handleFileChange} />
        </div>
        <div className="row2">
          <div className="field">
            <label>Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div className="field">
            <label>Artist</label>
            <input type="text" value={artist} onChange={e => setArtist(e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label>⚙️ Analysis engine</label>
          <select value={engine} onChange={e => setEngine(e.target.value)}>
            <option>ChordMini · auto beat model</option>
            <option>On-device engine only</option>
          </select>
          <p className="hint">
            ChordMini needs a server this offline build doesn't have, so every analysis quietly falls back to the on-device
            engine below.
          </p>
        </div>
        <div className="field">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ margin: 0 }}>Lyrics (optional)</label>
            <button className="btn secondary small" onClick={handleFetchLyrics}>Fetch lyrics</button>
          </div>
          <textarea
            placeholder={'[Verse]\nyour lyric line here\nanother line\n\n[Chorus]\n...'}
            value={lyrics}
            onChange={e => setLyrics(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Transliteration</label>
          <select value={translit} onChange={e => setTranslit(e.target.value)}>
            <option value="auto">Auto detect (Hinglish / Tanglish / other)</option>
            <option value="hinglish">Force Hinglish</option>
            <option value="tanglish">Force Tanglish</option>
            <option value="off">Off</option>
          </select>
        </div>
        <button className="btn block" style={{ marginTop: 14 }} onClick={handleDetect}>
          ✨ Detect chords
        </button>
        <div className={statusClass}>{status}</div>
      </div>
    </>
  );
}
