import { useState } from 'react';
import { useSongs } from '../context/SongContext';
import type { Song, ViewName } from '../types';

interface Props {
  go: (view: ViewName) => void;
}

export default function Library({ go }: Props) {
  const { songs, setCurrentSongIndex } = useSongs();
  const [query, setQuery] = useState('');

  const filtered = songs.filter(s => !query || s.title.toLowerCase().includes(query.toLowerCase()));

  const openSong = (song: Song) => {
    setCurrentSongIndex(songs.indexOf(song));
    go('song');
  };

  return (
    <>
      <div className="eyebrow">CHORDLAB</div>
      <h1 className="h1">Your song library</h1>
      <p className="sub">Chords, key, tempo, lyrics and printable sheets — all on your device.</p>
      <div className="quickrow">
        <div className="quick" onClick={() => go('analyze')}>
          <div className="ic">🎚️</div>
          <div className="lb">Analyze</div>
        </div>
        <div className="quick" onClick={() => go('live')}>
          <div className="ic">🎙️</div>
          <div className="lb">Live</div>
        </div>
        <div className="quick" onClick={() => go('tuner')}>
          <div className="ic">🎸</div>
          <div className="lb">Tuner</div>
        </div>
      </div>
      <div className="field" style={{ marginTop: 16 }}>
        <input type="text" placeholder="Search your songs" value={query} onChange={e => setQuery(e.target.value)} />
      </div>
      <div>
        {filtered.map(s => (
          <div className="songrow" key={s.id} onClick={() => openSong(s)}>
            <div className="badge">{s.key || '—'}</div>
            <div>
              <div className="t">{s.title}</div>
              <div className="s">
                {s.artist || 'Unknown artist'} · {s.bpm} BPM · {s.rows.length} changes
              </div>
            </div>
          </div>
        ))}
      </div>
      {filtered.length === 0 && <div className="empty">No songs yet — analyze one to build your library.</div>}
    </>
  );
}
