// Tide Board — every reference state from the design, phone (390×844) and
// desktop (1440×900), rendered with the real Screen component. Served at /board.

import { useEffect } from 'react';
import { Screen, type Device, type View } from '../Screen';
import { chipsFor, toolById, type Tool } from '../tools';
import './board.css';

const NAME = 'IMG_4021.MOV';

const STATES: { label: string; view: View; tool?: Tool }[] = [
  { label: '1 · Open', view: { step: 'idle' } },
  {
    label: '2 · Working',
    view: { step: 'working', name: NAME, pct: 62, line: 'Compressed MP4 · ~9 MB', changeOpen: false, chips: chipsFor('video', 'smaller'), out: 'smaller' }
  },
  {
    label: '3 · Change tapped',
    view: { step: 'working', name: NAME, pct: 8, line: 'Compressed MP4 · ~9 MB', changeOpen: true, chips: chipsFor('video', 'smaller'), out: 'smaller' }
  },
  { label: '4 · Done', view: { step: 'done', outName: 'IMG_4021.mp4', sizeLine: '48 MB → 9 MB', canShare: true } },
  {
    label: '5 · Several files',
    view: {
      step: 'multi',
      rows: [
        { name: 'IMG_4021.MOV', status: 'Done', pct: 100 },
        { name: 'IMG_4022.MOV', status: '40%', pct: 40 },
        { name: 'IMG_4030.MOV', status: 'Waiting', pct: 0 }
      ],
      line: 'Compressed MP4s · ~21 MB total',
      changeOpen: false,
      chips: chipsFor('video', 'smaller'),
      out: 'smaller'
    }
  },
  {
    label: '6 · Several done',
    view: {
      step: 'multidone',
      rows: [
        { name: 'IMG_4021.mp4', status: '9 MB', pct: 100 },
        { name: 'IMG_4022.mp4', status: '7 MB', pct: 100 },
        { name: 'IMG_4030.mp4', status: '5 MB', pct: 100 }
      ],
      totalLine: '112 MB → 21 MB',
      canShare: true
    }
  },
  { label: '7 · Failed', view: { step: 'failed', name: NAME, pct: 74, message: 'Stopped at 74%. Ran out of memory.' } },
  { label: '8 · Wrong file', view: { step: 'wrongtype', message: 'report.pdf isn’t video or audio' } },
  { label: '9 · /mov-to-mp4', view: { step: 'idle' }, tool: toolById('mov-to-mp4') }
];

function Section({ device }: { device: Device }) {
  return (
    <section className="board-section">
      <h1 className="board-h1">{device === 'phone' ? 'Phone' : 'Desktop'}</h1>
      <div className={`board-list board-list--${device}`}>
        {STATES.map((s) => (
          <div key={s.label} className="board-item">
            <h2 className="board-h2">{s.label}</h2>
            <div className={`board-frame board-frame--${device}`}>
              <Screen framed device={device} view={s.view} tool={s.tool} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Board() {
  useEffect(() => {
    document.title = 'Tide Board';
    const robots = document.createElement('meta');
    robots.name = 'robots';
    robots.content = 'noindex';
    document.head.appendChild(robots);
    return () => robots.remove();
  }, []);
  return (
    <div className="board">
      <Section device="phone" />
      <Section device="desktop" />
    </div>
  );
}
