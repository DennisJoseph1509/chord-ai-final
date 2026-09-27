import { useState } from 'react';
import { SongProvider } from './context/SongContext';
import Library from './components/Library';
import Analyze from './components/Analyze';
import Live from './components/Live';
import Chords from './components/Chords';
import Tuner from './components/Tuner';
import SongDetail from './components/SongDetail';
import BottomNav from './components/BottomNav';
import type { ViewName } from './types';

function viewClass(active: boolean): string {
  return active ? 'view active' : 'view';
}

export default function App() {
  const [activeView, setActiveView] = useState<ViewName>('library');

  const go = (view: ViewName) => {
    setActiveView(view);
    window.scrollTo(0, 0);
  };

  return (
    <SongProvider>
      <div className="shell" id="shell">
        <section className={viewClass(activeView === 'library')} id="v-library">
          <Library go={go} />
        </section>
        <section className={viewClass(activeView === 'analyze')} id="v-analyze">
          <Analyze go={go} />
        </section>
        <section className={viewClass(activeView === 'live')} id="v-live">
          <Live />
        </section>
        <section className={viewClass(activeView === 'chords')} id="v-chords">
          <Chords />
        </section>
        <section className={viewClass(activeView === 'tuner')} id="v-tuner">
          <Tuner />
        </section>
        <section className={viewClass(activeView === 'song')} id="v-song">
          <SongDetail go={go} />
        </section>
      </div>
      <BottomNav activeView={activeView} go={go} />
    </SongProvider>
  );
}
