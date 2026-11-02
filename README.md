# converters

A minimal tool to compress and convert video and audio in your browser. This is **Tide**, built from the Claude Design handoff (`Tide Board`). Conversions run on the user's device with [ffmpeg.wasm](https://ffmpegwasm.netlify.app/), and files are never uploaded.

## Run

```sh
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in dist/
npm run preview    # serve dist/
```

To deploy under a sub-path (for example GitHub Pages at `/converters/`), build with `BASE_PATH=/converters/ npm run build`.

## Routes

| Route | Tool |
|---|---|
| `/` | Home: any video or audio, all tools listed |
| `/compress-video` | Compress MP4 |
| `/mov-to-mp4` · `/mp4-to-mov` | MOV ↔ MP4 |
| `/mp4-to-mp3` · `/mp3-to-mp4` | MP4 ↔ MP3 |
| `/mp4-to-gif` · `/gif-to-mp4` | MP4 ↔ GIF |
| `/m4a-to-mp3` · `/mp3-to-m4a` | M4A ↔ MP3 |
| `/wav-to-mp3` · `/mp3-to-wav` | WAV ↔ MP3 |
| `/board` | Design board: all 9 states, phone and desktop (not indexed) |

The build writes a static `index.html` for each tool route, with its own `<title>` and meta description. Those pages are the SEO landing pages, and each one works on any static host.

## Code map

- `src/Screen.tsx` — the one screen, purely presentational: idle, working, change, done, multi, multi-done, failed, wrong file.
- `src/App.tsx` — routing, the state machine, file picking and drag-and-drop, download (zip for several files), and Web Share.
- `src/convert.ts` — ffmpeg.wasm wrapper. It loads lazily on the first pick, takes progress from ffmpeg, cancels by terminating the worker, and detects out-of-memory.
- `src/tools.ts` — tool catalogue, copy, input validation, output formats and size estimates.
- `src/board/` — the reference board, rendered with the real `Screen`.
- `src/styles.css` — design tokens and styles, matching the handoff values.

## Presets

| Output | ffmpeg |
|---|---|
| Compress | H.264 CRF 28 `veryfast`, max 1920 px, AAC 128k |
| MP4 / MOV from video | stream copy when possible, else H.264 CRF 23 + AAC 160k |
| MP4 from audio | still black frame + AAC 192k |
| MP3 | libmp3lame 192k |
| M4A | AAC 160k |
| WAV | PCM 16-bit |
| GIF | 12 fps, max 480 px wide, palettegen/paletteuse |
| “Try smaller” | half resolution, higher CRF, `ultrafast`, lower audio bitrate |

## License note

`@ffmpeg/core` is GPL-2.0-or-later, so keep that in mind when you distribute the built site.
