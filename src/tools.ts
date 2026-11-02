// Tool catalogue, output formats, input validation and size estimates.
// Copy and defaults come from the design handoff (Main.dc.html → toolInfo/outs).

export type OutKey = 'smaller' | 'mp4' | 'mov' | 'mp3' | 'gif' | 'm4a' | 'wav';
export type Kind = 'video' | 'audio';

export type ToolId =
  | 'compress-video'
  | 'mov-to-mp4'
  | 'mp4-to-mov'
  | 'mp4-to-mp3'
  | 'mp3-to-mp4'
  | 'mp4-to-gif'
  | 'gif-to-mp4'
  | 'm4a-to-mp3'
  | 'mp3-to-m4a'
  | 'wav-to-mp3'
  | 'mp3-to-wav';

export interface Tool {
  id: ToolId;
  /** Page heading, e.g. "MOV to MP4" */
  name: string;
  /** Grid label, e.g. "MOV → MP4" */
  short: string;
  choose: string;
  out: OutKey;
  /** Input formats accepted on this tool's page */
  input: { label: string; exts: string[]; mimes: string[] };
  group: Kind;
  icon: IconName;
  title: string;
  description: string;
}

export type IconName = 'compress' | 'film' | 'music' | 'repeat' | 'wave';

const MP4 = { label: 'an MP4', exts: ['mp4', 'm4v'], mimes: ['video/mp4', 'video/x-m4v'] };
const MOV = { label: 'a MOV', exts: ['mov', 'qt'], mimes: ['video/quicktime'] };
const MP3 = { label: 'an MP3', exts: ['mp3'], mimes: ['audio/mpeg', 'audio/mp3'] };
const GIF = { label: 'a GIF', exts: ['gif'], mimes: ['image/gif'] };
const M4A = { label: 'an M4A', exts: ['m4a'], mimes: ['audio/mp4', 'audio/x-m4a', 'audio/m4a'] };
const WAV = { label: 'a WAV', exts: ['wav'], mimes: ['audio/wav', 'audio/x-wav', 'audio/wave', 'audio/vnd.wave'] };

const t = (
  id: ToolId,
  name: string,
  short: string,
  choose: string,
  out: OutKey,
  input: Tool['input'],
  group: Kind,
  icon: IconName,
  description: string
): Tool => ({ id, name, short, choose, out, input, group, icon, title: `${name} — free, on your device · Tide`, description });

export const TOOLS: Tool[] = [
  t('compress-video', 'Compress MP4', 'Compress MP4', 'Choose an MP4', 'smaller', MP4, 'video', 'compress',
    'Make MP4 videos smaller right in your browser. Nothing is uploaded — files stay on your device.'),
  t('mov-to-mp4', 'MOV to MP4', 'MOV → MP4', 'Choose a MOV', 'mp4', MOV, 'video', 'film',
    'Convert MOV videos to MP4 in your browser. Free, fast, and your files never leave your device.'),
  t('mp4-to-mov', 'MP4 to MOV', 'MP4 → MOV', 'Choose an MP4', 'mov', MP4, 'video', 'film',
    'Convert MP4 videos to MOV in your browser. Free, and your files never leave your device.'),
  t('mp4-to-mp3', 'MP4 to MP3', 'MP4 → MP3', 'Choose an MP4', 'mp3', MP4, 'video', 'music',
    'Extract the audio from an MP4 as an MP3, right in your browser. Nothing is uploaded.'),
  t('mp3-to-mp4', 'MP3 to MP4', 'MP3 → MP4', 'Choose an MP3', 'mp4', MP3, 'video', 'film',
    'Turn an MP3 into an MP4 video in your browser. Your files never leave your device.'),
  t('mp4-to-gif', 'MP4 to GIF', 'MP4 → GIF', 'Choose an MP4', 'gif', MP4, 'video', 'repeat',
    'Turn an MP4 clip into a GIF in your browser. Free, and nothing is uploaded.'),
  t('gif-to-mp4', 'GIF to MP4', 'GIF → MP4', 'Choose a GIF', 'mp4', GIF, 'video', 'film',
    'Convert a GIF to a much smaller MP4 in your browser. Your files stay on your device.'),
  t('m4a-to-mp3', 'M4A to MP3', 'M4A → MP3', 'Choose an M4A', 'mp3', M4A, 'audio', 'music',
    'Convert M4A audio to MP3 in your browser. Free, and nothing is uploaded.'),
  t('mp3-to-m4a', 'MP3 to M4A', 'MP3 → M4A', 'Choose an MP3', 'm4a', MP3, 'audio', 'music',
    'Convert MP3 audio to M4A in your browser. Free, and nothing is uploaded.'),
  t('wav-to-mp3', 'WAV to MP3', 'WAV → MP3', 'Choose a WAV', 'mp3', WAV, 'audio', 'music',
    'Convert WAV audio to a much smaller MP3 in your browser. Your files stay on your device.'),
  t('mp3-to-wav', 'MP3 to WAV', 'MP3 → WAV', 'Choose an MP3', 'wav', MP3, 'audio', 'wave',
    'Convert MP3 audio to WAV in your browser. Free, and nothing is uploaded.')
];

export const HOME = {
  heading: 'Compress or convert any video or audio',
  choose: 'Choose a file',
  title: 'Tide — compress or convert video and audio on your device',
  description:
    'Compress or convert video and audio in your browser: MP4, MOV, MP3, GIF, M4A, WAV. Free, and your files never leave your device.'
};

export const toolById = (id: string | null | undefined): Tool | undefined => TOOLS.find((x) => x.id === id);

export interface OutInfo {
  /** Chip label */
  chip: string;
  /** Working line prefix, e.g. "Compressed MP4" */
  line: string;
  ext: string;
  mime: string;
}

export const OUTS: Record<OutKey, OutInfo> = {
  smaller: { chip: 'Compress', line: 'Compressed MP4', ext: 'mp4', mime: 'video/mp4' },
  mp4: { chip: 'MP4', line: 'MP4', ext: 'mp4', mime: 'video/mp4' },
  mov: { chip: 'MOV', line: 'MOV', ext: 'mov', mime: 'video/quicktime' },
  mp3: { chip: 'MP3', line: 'MP3', ext: 'mp3', mime: 'audio/mpeg' },
  gif: { chip: 'GIF', line: 'GIF', ext: 'gif', mime: 'image/gif' },
  m4a: { chip: 'M4A', line: 'M4A', ext: 'm4a', mime: 'audio/mp4' },
  wav: { chip: 'WAV', line: 'WAV', ext: 'wav', mime: 'audio/wav' }
};

const VIDEO_EXTS = ['mp4', 'm4v', 'mov', 'qt', 'webm', 'mkv', 'avi', 'gif', '3gp', 'mpg', 'mpeg', 'wmv', 'flv', 'ts', 'mts'];
const AUDIO_EXTS = ['mp3', 'm4a', 'aac', 'wav', 'ogg', 'oga', 'opus', 'flac', 'aif', 'aiff', 'wma'];

export const extOf = (name: string) => {
  const i = name.lastIndexOf('.');
  return i > 0 ? name.slice(i + 1).toLowerCase() : '';
};
export const baseOf = (name: string) => {
  const i = name.lastIndexOf('.');
  return i > 0 ? name.slice(0, i) : name;
};

/** Video or audio, or null when the file isn't media we can handle. */
export function kindOf(file: { name: string; type: string }): Kind | null {
  const ext = extOf(file.name);
  if (file.type === 'image/gif' || ext === 'gif') return 'video';
  if (file.type.startsWith('video/') || VIDEO_EXTS.includes(ext)) return 'video';
  if (file.type.startsWith('audio/') || AUDIO_EXTS.includes(ext)) return 'audio';
  return null;
}

/** Whether a file can be used on the given page. */
export function accepts(tool: Tool | undefined, file: { name: string; type: string }): boolean {
  if (!tool) return kindOf(file) !== null;
  const ext = extOf(file.name);
  return tool.input.exts.includes(ext) || (!!file.type && tool.input.mimes.includes(file.type));
}

/** Value for the file input's `accept` attribute. */
export function acceptAttr(tool: Tool | undefined): string {
  if (!tool) return 'video/*,audio/*,image/gif';
  return [...tool.input.exts.map((e) => '.' + e), ...tool.input.mimes].join(',');
}

/** Copy for the Wrong file alert. */
export function wrongCopy(tool: Tool | undefined, name: string): string {
  return tool ? `${name} isn’t ${tool.input.label}` : `${name} isn’t video or audio`;
}

/** Output used when a file is first picked. */
export function defaultOut(tool: Tool | undefined, kind: Kind): OutKey {
  if (tool) return tool.out;
  return kind === 'audio' ? 'mp3' : 'smaller';
}

/** Output chips shown under "Change". The design shows Compress · MP4 · MP3 · GIF for video. */
export function chipsFor(kind: Kind, current: OutKey): OutKey[] {
  const base: OutKey[] = kind === 'audio' ? ['mp3', 'm4a', 'wav', 'mp4'] : ['smaller', 'mp4', 'mp3', 'gif'];
  return base.includes(current) ? base : [current, ...base];
}

/** Output filename: IMG_4021.MOV → IMG_4021.mp4 (never identical to the input name). */
export function outName(inputName: string, out: OutKey): string {
  const base = baseOf(inputName);
  const name = `${base}.${OUTS[out].ext}`;
  if (name === inputName) return `${base}-${out === 'smaller' ? 'small' : 'tide'}.${OUTS[out].ext}`;
  return name;
}

const MB = 1024 * 1024;

/** Rough output size estimate, used while working ("~9 MB"). */
export function estimate(out: OutKey, size: number, kind: Kind, duration?: number): number {
  const d = duration && isFinite(duration) && duration > 0 ? duration : undefined;
  const audioBytes = (kbps: number) => (d ? (d * kbps * 1000) / 8 : undefined);
  switch (out) {
    case 'smaller':
      return d ? Math.min(size * 0.6, (d * 2_600_000) / 8) : size * 0.2;
    case 'mp4':
      if (kind === 'audio') return audioBytes(222) ?? size * 1.15;
      return size * 0.85;
    case 'mov':
      return size * 0.95;
    case 'mp3':
      return audioBytes(192) ?? (kind === 'audio' ? size : size * 0.03);
    case 'm4a':
      return audioBytes(160) ?? (kind === 'audio' ? size * 0.85 : size * 0.03);
    case 'wav':
      return audioBytes(1411) ?? (kind === 'audio' ? size * 7 : size * 0.15);
    case 'gif':
      return d ? Math.min(size * 2, d * 0.6 * MB) : size * 0.12;
  }
}

/** 48 MB, 9 MB, 640 KB. */
export function formatSize(bytes: number): string {
  if (bytes >= 10 * MB) return Math.round(bytes / MB) + ' MB';
  if (bytes >= MB) {
    const v = Math.round((bytes / MB) * 10) / 10;
    return (Number.isInteger(v) ? v : v.toFixed(1)) + ' MB';
  }
  return Math.max(1, Math.round(bytes / 1024)) + ' KB';
}

/** "Compressed MP4 · ~9 MB" */
export const outLine = (out: OutKey, est: number) => `${OUTS[out].line} · ~${formatSize(est)}`;
/** "Compressed MP4s · ~21 MB total" */
export const multiLine = (out: OutKey, est: number) => `${OUTS[out].line}s · ~${formatSize(est)} total`;
