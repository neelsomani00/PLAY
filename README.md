# PLAY

A local-only Android music app. No accounts, no internet dependency. It
scans the music already on your phone, plays it, and can pull audio out
of any video file on your device too.

## Pages

- **Home** — a "Most listened" row (based on your actual play counts) and
  the full library below it, with search.
- **Playlist** — create playlists, tap into one to see/play its songs. Any
  song can be in any number of playlists.
- **Extractor** — pick a video file and it extracts just the audio track
  and drops it straight into your library, fully offline (runs ffmpeg
  compiled to WebAssembly, bundled into the app — no server, no upload).

Tap the mini player (or the album art) anywhere to open the full Now
Playing screen: shuffle, repeat (off/all/one), volume, seek, a live
level-bar visualizer, and "add to playlist" from there too.

## How playback works

- First launch asks for one permission, then scans automatically every
  time you open the app after that. Tap **↻** on Home to rescan (e.g.
  after downloading new songs).
- Scanning uses Android's MediaStore (`@odion-cloud/capacitor-mediastore`)
  — the same index every Android music app reads from.
- Next/previous stay within whatever you're actually playing from: play
  a song from a playlist and next/previous walk through that playlist;
  play from Home/search and they walk through your whole library.

## The one non-obvious fix in this codebase

`src/lib/mediaStore.ts` deliberately **ignores** the `uri` field the
MediaStore plugin returns for each track. That field is built from the
legacy `file://<path>` pattern, which fails to load under Android's scoped
storage on API 29+ for files the app didn't create itself.

Instead, it rebuilds a proper `content://media/external/audio/media/<id>`
URI from the track's row id, and hands that to `Capacitor.convertFileSrc()`.
That routes the read through Android's ContentResolver instead of the raw
filesystem, which works regardless of scoped storage. If you ever swap
out the MediaStore plugin, keep this part.

## The second non-obvious fix — the extractor hanging on load

If audio extraction ever goes back to hanging forever on "Loading
extractor" with no error: check `vite.config.ts` still has

```ts
optimizeDeps: { exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'] }
```

`@ffmpeg/ffmpeg` spawns its work in a Web Worker using a URL that's only
known at runtime, not a string literal Vite can see at build time. Vite's
dependency pre-bundler rewrites/relocates the package in a way that
breaks that worker's URL resolution — the worker fails to load, silently,
and `ffmpeg.load()` never resolves or rejects. This is a confirmed,
widely-reported bug in `@ffmpeg/ffmpeg` + Vite generally (not specific to
Capacitor) — see ffmpegwasm/ffmpeg.wasm#815 on GitHub. `src/lib/audioExtractor.ts`
also does two more defensive things worth keeping if you touch it:
a `fetch(..., {method:'HEAD'})` pre-check on the wasm file so a broken
build gives a clear error instead of a hang, and a 45-second timeout
around the whole load so *any* future failure mode surfaces as an error
message instead of an infinite spinner.

## Running it

```bash
npm install    # also copies the ffmpeg WASM core into public/ffmpeg
                # (see scripts/copy-ffmpeg-core.mjs — this runs automatically
                # via postinstall, including in CI)
npm run dev    # quick local check in a regular browser — MediaStore and
                # file-extraction calls are Android-only and no-op here
```

## Building the APK

### Option A — GitHub Actions (no local Android Studio needed)
Push to `main` (or use **Run workflow** in the Actions tab). The workflow
in `.github/workflows/build-apk.yml`:
1. Builds the web app
2. Adds the Android platform
3. Generates the app icon + splash screen from `resources/icon.png`
   (your neon "P" logo) via `@capacitor/assets`
4. Builds a debug APK and uploads it as an artifact

### Option B — locally
```bash
npx cap add android      # first time only
npm run build
npm run generate:icons   # writes the app icon into android/
npx cap sync android
npx cap open android     # then hit Run in Android Studio
```

## Known limitations (v1)

- Debug build only — not signed for the Play Store yet.
- No background playback / lock-screen notification controls yet — this
  needs real native Android work (a foreground service + media session)
  that can't be verified without an actual Android build, so it's being
  done as its own focused step rather than folded in here.
- Album art comes from Android's legacy `audio/albumart` provider, which
  not every device populates for every track. Missing art falls back to a
  simple note-glyph tile rather than a broken image.
- Tracks under 30 seconds are filtered out of the library scan to keep
  voice notes and notification tones out. Adjust `MIN_DURATION_MS` in
  `src/lib/mediaStore.ts` if that's too aggressive for your library.
- Video extraction runs single-threaded ffmpeg.wasm (not the multi-thread
  build) — this avoids needing special cross-origin headers that a
  Capacitor WebView can't easily be configured with, at the cost of being
  slower than desktop ffmpeg. Fine for occasional personal use; a long
  video will take a while.
- The bundled ffmpeg core adds roughly 30MB to the APK size, since it's
  shipped locally for genuine offline use rather than fetched from a CDN
  on first use.
