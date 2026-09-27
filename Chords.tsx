import { useState } from 'react';
import { NOTES, CHORD_TYPES } from '../lib/chords';
import ChordDiagram from './ChordDiagram';

export default function Chords() {
  const [chordRoot, setChordRoot] = useState(0);
  const [chordType, setChordType] = useState('Major');

  const name = NOTES[chordRoot] + (chordType === 'Major' ? '' : ' ' + chordType);

  return (
    <>
      <h1 className="h1">Chord library</h1>
      <p className="sub">Guitar (standard) voicings, found automatically for any root and type.</p>
      <div className="panel">
        <div className="field" style={{ marginTop: 0 }}>
          <label>Instrument</label>
          <select>
            <option>Guitar (standard)</option>
          </select>
        </div>
        <div className="field">
          <label>Root</label>
          <div className="grid12">
            {NOTES.map((n, i) => (
              <button key={n} className={i === chordRoot ? 'active' : ''} onClick={() => setChordRoot(i)}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label>Type</label>
          <div className="typegrid">
            {Object.keys(CHORD_TYPES).map(t => (
              <button key={t} className={t === chordType ? 'active' : ''} onClick={() => setChordType(t)}>
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="panel">
        <h3>{name}</h3>
        <div className="diagramgrid">
          <ChordDiagram name={name} rootIdx={chordRoot} intervals={CHORD_TYPES[chordType]} />
        </div>
      </div>
      <div className="panel">
        <h3>All {chordType.toLowerCase()} chords</h3>
        <div className="diagramgrid">
          {NOTES.map((n, i) => (
            <ChordDiagram
              key={n}
              name={n + (chordType === 'Major' ? '' : ' ' + chordType)}
              rootIdx={i}
              intervals={CHORD_TYPES[chordType]}
            />
          ))}
        </div>
      </div>
    </>
  );
}
