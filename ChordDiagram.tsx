import { findVoicing, diagramSVG } from '../lib/chords';

interface Props {
  name: string;
  rootIdx: number;
  intervals: number[];
}

export default function ChordDiagram({ name, rootIdx, intervals }: Props) {
  const { frets, base } = findVoicing(rootIdx, intervals);
  const svg = diagramSVG(frets, base);
  return (
    <div className="diagram">
      <div dangerouslySetInnerHTML={{ __html: svg }} />
      <div className="nm">{name}</div>
    </div>
  );
}
