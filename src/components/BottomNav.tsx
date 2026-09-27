import type { ViewName } from '../types';

const TABS: { view: ViewName; icon: string; label: string }[] = [
  { view: 'library', icon: '📚', label: 'Library' },
  { view: 'analyze', icon: '🎚️', label: 'Analyze' },
  { view: 'live', icon: '🎙️', label: 'Live' },
  { view: 'chords', icon: '🎼', label: 'Chords' },
  { view: 'tuner', icon: '🎸', label: 'Tuner' },
];

interface Props {
  activeView: ViewName;
  go: (view: ViewName) => void;
}

export default function BottomNav({ activeView, go }: Props) {
  return (
    <nav className="tabs">
      {TABS.map(t => (
        <button key={t.view} className={activeView === t.view ? 'active' : ''} onClick={() => go(t.view)}>
          <span className="ic">{t.icon}</span>
          {t.label}
        </button>
      ))}
    </nav>
  );
}
