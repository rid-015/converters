// The single Tide screen, purely presentational. App.tsx drives it with real
// conversions; board/Board.tsx renders it in every reference state.

import type { CSSProperties } from 'react';
import { Alert, ChevronLeft, Close, ToolIcon } from './icons';
import { HOME, OUTS, TOOLS, type OutKey, type Tool } from './tools';

export type Device = 'phone' | 'desktop';

export interface Row {
  name: string;
  /** "Waiting" · "62%" · "Done" · "9 MB" · "Failed" */
  status: string;
  pct: number;
  failed?: boolean;
}

export type View =
  | { step: 'idle' }
  | { step: 'wrongtype'; message: string }
  | { step: 'working'; name: string; pct: number; line: string; changeOpen: boolean; chips: OutKey[]; out: OutKey }
  | { step: 'failed'; name: string; pct: number; message: string }
  | { step: 'done'; outName: string; sizeLine: string; canShare: boolean }
  | { step: 'multi'; rows: Row[]; line: string; changeOpen: boolean; chips: OutKey[]; out: OutKey }
  | { step: 'multidone'; rows: Row[]; totalLine: string; canShare: boolean };

export interface Handlers {
  onChoose?: () => void;
  onCancel?: () => void;
  onToggleChange?: () => void;
  onPick?: (out: OutKey) => void;
  onTrySmaller?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  onNew?: () => void;
  onHome?: () => void;
  onTool?: (tool: Tool) => void;
}

interface Props extends Handlers {
  tool?: Tool;
  device: Device;
  view: View;
  accent?: string;
  /** Fill a fixed-size frame (board) instead of the viewport. */
  framed?: boolean;
}

export function Screen(props: Props) {
  const { tool, device, view, accent, framed } = props;
  const isIdle = view.step === 'idle' || view.step === 'wrongtype';
  const style = accent ? ({ '--accent': accent } as CSSProperties) : undefined;

  return (
    <div className={'tide' + (framed ? ' tide--framed' : '')} style={style}>
      <header className="tide-header">
        {tool ? (
          <button type="button" className="tide-back" onClick={props.onHome}>
            <ChevronLeft />
            All tools
          </button>
        ) : (
          <span className="tide-logo">
            <span className="tide-dot" />
            tide
          </span>
        )}
      </header>

      <main className="tide-main">
        <div className="tide-col">
          {isIdle && <Idle {...props} />}
          {(view.step === 'working' || view.step === 'failed') && <Job {...props} />}
          {view.step === 'done' && <Done {...props} />}
          {(view.step === 'multi' || view.step === 'multidone') && <Multi {...props} />}
        </div>
      </main>

      {isIdle && !tool && <Grid device={device} onTool={props.onTool} />}
    </div>
  );
}

function Idle({ tool, device, view, onChoose }: Props) {
  const wrong = view.step === 'wrongtype' ? view.message : null;
  return (
    <div className="tide-idle">
      <h1 className="tide-h1">{tool ? tool.name : HOME.heading}</h1>
      <button type="button" className="tide-primary tide-primary--choose" onClick={onChoose}>
        {wrong ? 'Choose another' : tool ? tool.choose : HOME.choose}
      </button>
      {wrong ? (
        <div role="alert" className="tide-wrong">
          <Alert />
          {wrong}
        </div>
      ) : (
        <span className="tide-caption">
          {device === 'desktop' ? 'Drop a file anywhere. It stays on your device.' : 'Stays on your device'}
        </span>
      )}
    </div>
  );
}

const Bar = ({ pct, failed }: { pct: number; failed?: boolean }) => (
  <div className="tide-track">
    <div className={'tide-fill' + (failed ? ' tide-fill--failed' : '')} style={{ width: `${Math.round(pct)}%` }} />
  </div>
);

function Chips({ chips, out, onPick }: { chips: OutKey[]; out: OutKey; onPick?: (o: OutKey) => void }) {
  return (
    <div className="tide-chips">
      {chips.map((k) => (
        <button key={k} type="button" className="tide-chip" aria-pressed={k === out} onClick={() => onPick?.(k)}>
          {OUTS[k].chip}
        </button>
      ))}
    </div>
  );
}

function OutRow({ line, open, onToggle }: { line: string; open: boolean; onToggle?: () => void }) {
  return (
    <div className="tide-outrow">
      <span className="tide-muted">{line}</span>
      <button type="button" className="tide-link" aria-expanded={open} onClick={onToggle}>
        Change
      </button>
    </div>
  );
}

function Job({ view, onCancel, onToggleChange, onPick, onTrySmaller }: Props) {
  if (view.step !== 'working' && view.step !== 'failed') return null;
  const working = view.step === 'working';
  return (
    <div className="tide-job">
      <div className="tide-namerow">
        <span className="tide-filename">{view.name}</span>
        {working && <span className="tide-muted">{Math.round(view.pct)}%</span>}
        <button type="button" className="tide-cancel" aria-label="Cancel" onClick={onCancel}>
          <Close />
        </button>
      </div>
      <Bar pct={view.pct} failed={!working} />
      {working ? (
        <>
          <OutRow line={view.line} open={view.changeOpen} onToggle={onToggleChange} />
          {view.changeOpen && <Chips chips={view.chips} out={view.out} onPick={onPick} />}
        </>
      ) : (
        <div role="alert" className="tide-outrow">
          <span className="tide-error">
            <Alert />
            {view.message}
          </span>
          <button type="button" className="tide-link" onClick={onTrySmaller}>
            Try smaller
          </button>
        </div>
      )}
    </div>
  );
}

function Done({ view, onDownload, onShare, onNew }: Props) {
  if (view.step !== 'done') return null;
  return (
    <div className="tide-done">
      <span className="tide-outname">{view.outName}</span>
      <span className="tide-muted">{view.sizeLine}</span>
      <button type="button" className="tide-primary tide-primary--wide" onClick={onDownload}>
        Download
      </button>
      <div className="tide-secondary">
        {view.canShare && (
          <button type="button" className="tide-text" onClick={onShare}>
            Share
          </button>
        )}
        <button type="button" className="tide-text" onClick={onNew}>
          New file
        </button>
      </div>
    </div>
  );
}

function Multi({ view, onToggleChange, onPick, onDownload, onShare, onNew }: Props) {
  if (view.step !== 'multi' && view.step !== 'multidone') return null;
  return (
    <div className="tide-multi">
      {view.rows.map((r, i) => (
        <div key={i} className="tide-row">
          <div className="tide-rowhead">
            <span className="tide-filename">{r.name}</span>
            <span className={'tide-status' + (r.failed ? ' tide-status--failed' : '')}>{r.status}</span>
          </div>
          <Bar pct={r.pct} failed={r.failed} />
        </div>
      ))}
      {view.step === 'multi' ? (
        <>
          <OutRow line={view.line} open={view.changeOpen} onToggle={onToggleChange} />
          {view.changeOpen && <Chips chips={view.chips} out={view.out} onPick={onPick} />}
        </>
      ) : (
        <div className="tide-multidone">
          <span className="tide-muted tide-total">{view.totalLine}</span>
          <button type="button" className="tide-primary tide-primary--wide" onClick={onDownload}>
            Download all
          </button>
          <div className="tide-secondary">
            {view.canShare && (
              <button type="button" className="tide-text" onClick={onShare}>
                Share
              </button>
            )}
            <button type="button" className="tide-text" onClick={onNew}>
              New files
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Grid({ device, onTool }: { device: Device; onTool?: (t: Tool) => void }) {
  const group = (kind: 'video' | 'audio') => (
    <div className={`tide-group tide-group--${kind}`}>
      <h2 className="tide-h2">{kind === 'video' ? 'Video' : 'Audio'}</h2>
      <div className="tide-grid">
        {TOOLS.filter((t) => t.group === kind).map((t) => (
          <a
            key={t.id}
            href={`${import.meta.env.BASE_URL}${t.id}`}
            className="tide-tool"
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
              e.preventDefault();
              onTool?.(t);
            }}
          >
            <ToolIcon name={t.icon} />
            {t.short}
          </a>
        ))}
      </div>
    </div>
  );
  return (
    <nav aria-label="Tools" className={`tide-nav tide-nav--${device}`}>
      {group('video')}
      {group('audio')}
    </nav>
  );
}
