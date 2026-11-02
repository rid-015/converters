// On-device conversion with ffmpeg.wasm (single-threaded core, no COOP/COEP needed).
// The ~30 MB core is loaded lazily on the first file pick, then reused.

import { FFmpeg, FFFSType } from '@ffmpeg/ffmpeg';
import coreURL from '@ffmpeg/core?url';
import wasmURL from '@ffmpeg/core/wasm?url';
import { extOf, OUTS, type Kind, type OutKey } from './tools';

export class CancelledError extends Error {
  constructor() {
    super('Cancelled');
  }
}

export class ConvertError extends Error {
  constructor(public reason: 'memory' | 'failed', message: string) {
    super(message);
  }
}

let instance: FFmpeg | null = null;
let loading: Promise<FFmpeg> | null = null;
let onProgress: ((ratio: number) => void) | null = null;
let lastLogs: string[] = [];

async function getFFmpeg(): Promise<FFmpeg> {
  if (instance) return instance;
  if (!loading) {
    loading = (async () => {
      const ff = new FFmpeg();
      ff.on('progress', ({ progress }) => {
        if (onProgress && isFinite(progress)) onProgress(progress);
      });
      ff.on('log', ({ message }) => {
        lastLogs.push(message);
        if (lastLogs.length > 60) lastLogs.shift();
      });
      await ff.load({ coreURL, wasmURL });
      instance = ff;
      return ff;
    })().catch((e) => {
      loading = null;
      throw e;
    });
  }
  return loading;
}

/** Start downloading the engine early (e.g. when the user opens the file picker). */
export function preload() {
  getFFmpeg().catch(() => {});
}

// Bumped on cancel; a job whose generation is stale was cancelled.
let gen = 0;

/** Stops the running job: terminates the worker; the next job reloads it. */
export function cancel() {
  gen++;
  if (instance) {
    try {
      instance.terminate();
    } catch {
      /* already gone */
    }
  }
  instance = null;
  loading = null;
}

export interface JobInput {
  file: File;
  kind: Kind;
  out: OutKey;
  /** "Try smaller": lower resolution / bitrate to use less memory */
  lowMemory?: boolean;
  /** Seconds; used to bound the still-frame video track for audio → video. */
  duration?: number;
}

const SCALE = (max: number) =>
  `scale=w='min(iw,${max})':h='min(ih,${max})':force_original_aspect_ratio=decrease:force_divisible_by=2`;

function argSets(input: string, output: string, job: JobInput): string[][] {
  const { out, kind, lowMemory } = job;
  const inExt = extOf(job.file.name);
  const i = ['-i', input];
  const h264 = (crf: number, max: number) => [
    '-vf', SCALE(max), '-c:v', 'libx264', '-crf', String(crf), '-preset', lowMemory ? 'ultrafast' : 'veryfast',
    '-pix_fmt', 'yuv420p'
  ];
  const aac = (k: number) => ['-c:a', 'aac', '-b:a', `${k}k`];
  const end = ['-movflags', '+faststart', output];

  switch (out) {
    case 'smaller':
      return [[...i, ...(lowMemory ? h264(32, 960) : h264(28, 1920)), ...aac(lowMemory ? 96 : 128), ...end]];
    case 'mp4':
    case 'mov': {
      if (kind === 'audio') {
        // Still black frame + the audio track.
        const size = lowMemory ? '320x180' : '640x360';
        return [[
          '-f', 'lavfi', '-i', `color=c=black:s=${size}:r=1`, ...i, '-map', '0:v', '-map', '1:a', '-shortest',
          '-fflags', '+shortest', '-max_interleave_delta', '100M',
          ...(job.duration ? ['-t', job.duration.toFixed(3)] : []),
          '-c:v', 'libx264', '-tune', 'stillimage', '-pix_fmt', 'yuv420p', ...aac(192), ...end
        ]];
      }
      const reencode = [...i, ...(lowMemory ? h264(30, 960) : h264(23, 1920)), ...aac(160), ...end];
      // Remux first when the source is already MP4/MOV-family; fall back to re-encoding.
      const canCopy = ['mp4', 'm4v', 'mov', 'qt'].includes(inExt) && !lowMemory;
      return canCopy ? [[...i, '-map', '0', '-c', 'copy', ...end], reencode] : [reencode];
    }
    case 'mp3':
      return [[...i, '-vn', '-c:a', 'libmp3lame', '-b:a', lowMemory ? '128k' : '192k', output]];
    case 'm4a':
      return [[...i, '-vn', ...aac(lowMemory ? 128 : 160), '-movflags', '+faststart', output]];
    case 'wav':
      return [[...i, '-vn', '-c:a', 'pcm_s16le', ...(lowMemory ? ['-ar', '22050'] : []), output]];
    case 'gif': {
      const fps = lowMemory ? 10 : 12;
      const w = lowMemory ? 320 : 480;
      return [[
        ...i, '-vf',
        `fps=${fps},scale='min(${w},iw)':-2:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4`,
        '-loop', '0', output
      ]];
    }
  }
}

const MEMORY = /out of memory|memory access out of bounds|cannot enlarge memory|allocation failed|cannot allocate memory|enomem/i;

/** ffmpeg's own logs, or a wasm abort (which in practice means memory ran out). */
const looksLikeOOM = (e: unknown, logs: string[]) => {
  const err = e == null ? '' : String((e as Error)?.message ?? e);
  return MEMORY.test(err) || MEMORY.test(logs.join('\n')) || /abort/i.test(err);
};

/**
 * Converts one file. `progress` receives 0–1. Throws CancelledError if `cancel()` is called,
 * ConvertError on failure.
 */
export async function convert(job: JobInput, progress: (ratio: number) => void): Promise<Blob> {
  const myGen = gen;
  const cancelled = () => gen !== myGen;
  if (job.kind === 'audio' && (job.out === 'mp4' || job.out === 'mov') && !job.duration) {
    job = { ...job, duration: await probeDuration(job.file) };
  }
  const ff = await getFFmpeg();
  if (cancelled()) throw new CancelledError();

  const id = Math.random().toString(36).slice(2, 8);
  const dir = `/in-${id}`;
  const output = `out-${id}.${OUTS[job.out].ext}`;
  let input: string;
  let mounted = false;

  // WORKERFS reads the File lazily instead of copying it into wasm memory.
  try {
    await ff.createDir(dir);
    await ff.mount(FFFSType.WORKERFS, { files: [job.file] }, dir);
    mounted = true;
    input = `${dir}/${job.file.name}`;
  } catch {
    input = `in-${id}.${extOf(job.file.name) || 'bin'}`;
    await ff.writeFile(input, new Uint8Array(await job.file.arrayBuffer()));
  }

  let best = 0;
  const report = (r: number) => {
    const v = Math.max(0, Math.min(0.99, r));
    if (v > best) {
      best = v;
      progress(v);
    }
  };
  onProgress = report;
  lastLogs = [];

  try {
    let code = -1;
    for (const args of argSets(input, output, job)) {
      code = await ff.exec(args);
      if (cancelled()) throw new CancelledError();
      if (code === 0) break;
      await ff.deleteFile(output).catch(() => {});
    }
    if (code !== 0) {
      throw new ConvertError(looksLikeOOM(null, lastLogs) ? 'memory' : 'failed', lastLogs.slice(-5).join('\n'));
    }
    const data = (await ff.readFile(output)) as Uint8Array;
    progress(1);
    return new Blob([data as BlobPart], { type: OUTS[job.out].mime });
  } catch (e) {
    if (cancelled() || e instanceof CancelledError) throw new CancelledError();
    if (e instanceof ConvertError) throw e;
    // A wasm abort leaves the instance unusable: drop it so the next job starts fresh.
    const oom = looksLikeOOM(e, lastLogs);
    if (instance === ff) {
      instance = null;
      loading = null;
    }
    try {
      ff.terminate();
    } catch {
      /* ignore */
    }
    throw new ConvertError(oom ? 'memory' : 'failed', String((e as Error)?.message ?? e));
  } finally {
    if (onProgress === report) onProgress = null;
    if (instance === ff && !cancelled()) {
      await ff.deleteFile(output).catch(() => {});
      if (mounted) {
        await ff.unmount(dir).catch(() => {});
        await ff.deleteDir(dir).catch(() => {});
      } else {
        await ff.deleteFile(input).catch(() => {});
      }
    }
  }
}

/** Reads media duration (seconds) via a media element, for size estimates. */
export function probeDuration(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    if (file.type === 'image/gif' || extOf(file.name) === 'gif') return resolve(undefined);
    const url = URL.createObjectURL(file);
    const el = document.createElement(file.type.startsWith('audio/') ? 'audio' : 'video');
    const done = (v?: number) => {
      URL.revokeObjectURL(url);
      el.removeAttribute('src');
      resolve(v && isFinite(v) ? v : undefined);
    };
    const timer = setTimeout(() => done(), 3000);
    el.preload = 'metadata';
    el.onloadedmetadata = () => {
      clearTimeout(timer);
      done(el.duration);
    };
    el.onerror = () => {
      clearTimeout(timer);
      done();
    };
    el.src = url;
  });
}
