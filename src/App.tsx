import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { cancel, convert, ConvertError, preload, probeDuration } from './convert';
import { Screen, type Row, type View } from './Screen';
import {
  accepts, acceptAttr, chipsFor, defaultOut, estimate, formatSize, HOME, kindOf, multiLine, outLine, outName,
  toolById, wrongCopy, type Kind, type OutKey, type Tool
} from './tools';
import { useDevice } from './useDevice';

const Board = lazy(() => import('./board/Board'));

const BASE = import.meta.env.BASE_URL; // always ends with "/"

function routeFromPath(pathname: string): string {
  const rest = pathname.startsWith(BASE) ? pathname.slice(BASE.length) : pathname.replace(/^\//, '');
  return rest.replace(/\/+$/, '').replace(/\.html$/, '').replace(/^index$/, '');
}

function setMeta(tool: Tool | undefined) {
  document.title = tool ? tool.title : HOME.title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', tool ? tool.description : HOME.description);
}

export default function App() {
  const [route, setRoute] = useState(() => routeFromPath(location.pathname));

  useEffect(() => {
    const onPop = () => setRoute(routeFromPath(location.pathname));
    addEventListener('popstate', onPop);
    return () => removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((to: string) => {
    history.pushState(null, '', BASE + to);
    setRoute(to);
    scrollTo(0, 0);
  }, []);

  if (route === 'board') {
    return (
      <Suspense fallback={null}>
        <Board />
      </Suspense>
    );
  }
  const tool = toolById(route);
  return <Converter key={tool?.id ?? 'home'} tool={tool} navigate={navigate} />;
}

interface Job {
  file: File;
  kind: Kind;
  pct: number;
  status: 'waiting' | 'working' | 'done' | 'failed';
  blob?: Blob;
  name?: string;
}

interface State {
  step: 'idle' | 'wrongtype' | 'working' | 'failed' | 'done' | 'multi' | 'multidone';
  jobs: Job[];
  out: OutKey;
  changeOpen: boolean;
  wrong?: string;
  error?: { pct: number; reason: 'memory' | 'failed' };
}

const IDLE: State = { step: 'idle', jobs: [], out: 'smaller', changeOpen: false };

const canShareFiles = (files: File[]) => {
  try {
    return typeof navigator.share === 'function' && !!navigator.canShare?.({ files });
  } catch {
    return false;
  }
};

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function Converter({ tool, navigate }: { tool?: Tool; navigate: (to: string) => void }) {
  const device = useDevice();
  const [state, setState] = useState<State>(IDLE);
  const run = useRef(0);
  const durations = useRef(new WeakMap<File, number>());
  const [, bump] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => setMeta(tool), [tool]);
  useEffect(() => () => {
    run.current++;
    cancel();
  }, []);

  /** Process jobs one after another with the given output. */
  const start = useCallback(async (files: Job[], out: OutKey, lowMemory = false) => {
    cancel();
    const id = ++run.current;
    const jobs: Job[] = files.map((j) => ({ ...j, pct: 0, status: 'waiting', blob: undefined, name: undefined }));
    const multi = jobs.length > 1;
    setState({ step: multi ? 'multi' : 'working', jobs, out, changeOpen: false });

    const update = (i: number, patch: Partial<Job>) => {
      if (run.current !== id) return;
      jobs[i] = { ...jobs[i], ...patch };
      setState((s) => ({ ...s, jobs: [...jobs] }));
    };

    for (let i = 0; i < jobs.length; i++) {
      update(i, { status: 'working' });
      try {
        const blob = await convert({ file: jobs[i].file, kind: jobs[i].kind, out, lowMemory }, (r) =>
          update(i, { pct: r * 100 })
        );
        if (run.current !== id) return;
        update(i, { status: 'done', pct: 100, blob, name: outName(jobs[i].file.name, out) });
      } catch (e) {
        if (run.current !== id) return;
        const reason = e instanceof ConvertError ? e.reason : 'failed';
        if (!multi) {
          setState((s) => ({ ...s, step: 'failed', error: { pct: jobs[i].pct, reason } }));
          return;
        }
        update(i, { status: 'failed' });
      }
    }
    if (run.current === id) setState((s) => ({ ...s, step: multi ? 'multidone' : 'done' }));
  }, []);

  const handleFiles = useCallback(
    async (list: FileList | File[] | null) => {
      const files = Array.from(list ?? []);
      if (!files.length) return;
      const ok = files.filter((f) => accepts(tool, f));
      if (!ok.length) {
        cancel();
        run.current++;
        setState({ ...IDLE, step: 'wrongtype', wrong: wrongCopy(tool, files[0].name) });
        return;
      }
      const jobs: Job[] = ok.map((file) => ({ file, kind: kindOf(file) ?? 'video', pct: 0, status: 'waiting' }));
      const out = defaultOut(tool, jobs[0].kind);
      start(jobs, out);
      // Durations only feed the size estimate; fill them in as they arrive.
      jobs.forEach((j) =>
        probeDuration(j.file).then((d) => {
          if (d == null) return;
          durations.current.set(j.file, d);
          bump((n) => n + 1);
        })
      );
    },
    [tool, start]
  );

  const choose = () => {
    preload();
    input.current?.click();
  };

  const reset = () => {
    run.current++;
    cancel();
    setState(IDLE);
  };

  // Desktop: the whole window is a drop target (while not busy).
  const busy = state.step === 'working' || state.step === 'multi';
  useEffect(() => {
    if (busy) return;
    const over = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes('Files')) e.preventDefault();
    };
    const drop = (e: DragEvent) => {
      if (!e.dataTransfer?.files.length) return;
      e.preventDefault();
      handleFiles(e.dataTransfer.files);
    };
    addEventListener('dragover', over);
    addEventListener('drop', drop);
    return () => {
      removeEventListener('dragover', over);
      removeEventListener('drop', drop);
    };
  }, [busy, handleFiles]);

  const done = state.jobs.filter((j) => j.status === 'done' && j.blob);
  const outFiles = () => done.map((j) => new File([j.blob!], j.name!, { type: j.blob!.type }));

  const download = async () => {
    if (state.step === 'done' && done[0]) return save(done[0].blob!, done[0].name!);
    if (done.length === 1) return save(done[0].blob!, done[0].name!);
    const { downloadZip } = await import('client-zip');
    const zip = await downloadZip(done.map((j) => ({ name: j.name!, input: j.blob!, lastModified: new Date() }))).blob();
    save(zip, 'tide-files.zip');
  };

  const share = async () => {
    try {
      await navigator.share({ files: outFiles() });
    } catch {
      /* dismissed */
    }
  };

  const view = toView(state, canShareFiles(outFiles()), (f) => durations.current.get(f));

  return (
    <>
      <Screen
        tool={tool}
        device={device}
        view={view}
        onChoose={choose}
        onCancel={reset}
        onNew={reset}
        onHome={() => navigate('')}
        onTool={(t) => navigate(t.id)}
        onToggleChange={() => setState((s) => ({ ...s, changeOpen: !s.changeOpen }))}
        onPick={(out) => (out === state.out ? setState((s) => ({ ...s, changeOpen: false })) : start(state.jobs, out))}
        onTrySmaller={() => start(state.jobs, state.out, true)}
        onDownload={download}
        onShare={share}
      />
      <input
        ref={input}
        type="file"
        multiple
        accept={acceptAttr(tool)}
        hidden
        onChange={(e) => {
          handleFiles(e.currentTarget.files);
          e.currentTarget.value = '';
        }}
      />
    </>
  );
}

function toView(s: State, canShare: boolean, duration: (f: File) => number | undefined): View {
  const est = (j: Job) => estimate(s.out, j.file.size, j.kind, duration(j.file));
  const first = s.jobs[0];
  switch (s.step) {
    case 'idle':
      return { step: 'idle' };
    case 'wrongtype':
      return { step: 'wrongtype', message: s.wrong ?? '' };
    case 'working':
      return {
        step: 'working', name: first.file.name, pct: first.pct, line: outLine(s.out, est(first)),
        changeOpen: s.changeOpen, chips: chipsFor(first.kind, s.out), out: s.out
      };
    case 'failed': {
      const pct = Math.round(s.error?.pct ?? 0);
      const why = s.error?.reason === 'memory' ? 'Ran out of memory.' : 'Couldn’t convert this file.';
      return { step: 'failed', name: first.file.name, pct, message: `Stopped at ${pct}%. ${why}` };
    }
    case 'done':
      return {
        step: 'done', outName: first.name ?? '', canShare,
        sizeLine: `${formatSize(first.file.size)} → ${formatSize(first.blob?.size ?? 0)}`
      };
    case 'multi': {
      const rows: Row[] = s.jobs.map((j) => ({
        name: j.file.name,
        pct: j.pct,
        failed: j.status === 'failed',
        status: j.status === 'done' ? 'Done' : j.status === 'failed' ? 'Failed' : j.status === 'working' ? `${Math.round(j.pct)}%` : 'Waiting'
      }));
      const total = s.jobs.reduce((n, j) => n + est(j), 0);
      return {
        step: 'multi', rows, line: multiLine(s.out, total), changeOpen: s.changeOpen,
        chips: chipsFor(first.kind, s.out), out: s.out
      };
    }
    case 'multidone': {
      const rows: Row[] = s.jobs.map((j) =>
        j.status === 'done'
          ? { name: j.name ?? j.file.name, pct: 100, status: formatSize(j.blob?.size ?? 0) }
          : { name: j.file.name, pct: j.pct, status: 'Failed', failed: true }
      );
      const ok = s.jobs.filter((j) => j.status === 'done');
      const before = ok.reduce((n, j) => n + j.file.size, 0);
      const after = ok.reduce((n, j) => n + (j.blob?.size ?? 0), 0);
      return { step: 'multidone', rows, totalLine: `${formatSize(before)} → ${formatSize(after)}`, canShare };
    }
  }
}
