import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { CapacitorMediaStore, MediaType } from '@odion-cloud/capacitor-mediastore';

// ffmpeg-core.js / .wasm / worker.js are copied into public/ffmpeg by
// scripts/copy-ffmpeg-core.mjs (runs on npm install). They're served from
// the app's own origin, so this works fully offline — no CDN fetch.
//
// IMPORTANT: these are passed to ffmpeg.load() as plain same-origin URLs,
// NOT converted to blob: URLs first. The blob-URL conversion pattern shown
// in ffmpeg.wasm's docs exists to work around CORS when loading the core
// from a different origin (e.g. a CDN) — it's not needed for same-origin
// files, and on Android WebView it's actually the opposite of safe: it
// forces the worker to load the core via a dynamic import() of a blob:
// URL from inside a module Worker, which is exactly the combination that
// hung indefinitely during testing (no error, no timeout — it just never
// resolved). Plain same-origin URLs go through the far more standard
// importScripts()/import() path and load correctly.
const FFMPEG_BASE_URL = '/ffmpeg';

const LOAD_TIMEOUT_MS = 45_000;

let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      v => { clearTimeout(timer); resolve(v); },
      e => { clearTimeout(timer); reject(e); }
    );
  });
}

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance?.loaded) return ffmpegInstance;
  if (loadPromise) return loadPromise;

  const ffmpeg = new FFmpeg();

  loadPromise = withTimeout(
    (async () => {
      // Confirm the bundled files are actually reachable before handing
      // off to the worker — if this fails, the problem is the build/asset
      // packaging, not the worker mechanism, and that's worth telling
      // apart when something goes wrong.
      const check = await fetch(`${FFMPEG_BASE_URL}/ffmpeg-core.wasm`, { method: 'HEAD' });
      if (!check.ok) {
        throw new Error(`Extractor files missing from the app build (HTTP ${check.status}). Try reinstalling the app.`);
      }

      await ffmpeg.load({
        coreURL: `${FFMPEG_BASE_URL}/ffmpeg-core.js`,
        wasmURL: `${FFMPEG_BASE_URL}/ffmpeg-core.wasm`,
        classWorkerURL: `${FFMPEG_BASE_URL}/worker.js`
      });
      ffmpegInstance = ffmpeg;
      return ffmpeg;
    })(),
    LOAD_TIMEOUT_MS,
    "Extractor took too long to start. Close and reopen the app, then try again — if it keeps happening, the app may need a rebuild."
  ).catch(err => {
    // A failed load must not poison future attempts — clear the cached
    // promise so the next tap starts fresh instead of re-awaiting a
    // promise that's already rejected forever.
    loadPromise = null;
    throw err;
  });

  return loadPromise;
}

function sanitizeFileName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9 _.-]/g, '').trim();
  return cleaned || 'extracted-audio';
}

// btoa(String.fromCharCode(...bytes)) blows the call stack on anything
// more than a few tens of thousands of bytes — this chunks it safely.
function uint8ToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export type ExtractStage = 'loading' | 'extracting' | 'saving' | 'done';

export type ExtractProgress = {
  stage: ExtractStage;
  // 0–1 within the current stage. 'loading' has no real progress signal
  // any more (see note above) — callers should show it as indeterminate.
  progress: number;
};

export type ExtractResult = {
  fileName: string;
  uri?: string;
};

export async function extractAudioFromVideo(
  videoFile: File,
  onProgress?: (p: ExtractProgress) => void
): Promise<ExtractResult> {
  onProgress?.({ stage: 'loading', progress: 0 });
  const ffmpeg = await getFFmpeg();
  onProgress?.({ stage: 'loading', progress: 1 });

  const inputName = 'input_video';
  const baseName = sanitizeFileName(videoFile.name.replace(/\.[^/.]+$/, ''));

  const progressHandler = ({ progress }: { progress: number }) => {
    onProgress?.({ stage: 'extracting', progress: Math.min(Math.max(progress, 0), 1) });
  };
  ffmpeg.on('progress', progressHandler);

  let outputName = `${baseName}.m4a`;
  let usedFallback = false;

  try {
    await ffmpeg.writeFile(inputName, await fetchFile(videoFile));

    // Fast path: copy the AAC stream straight out, no re-encoding.
    const copyExitCode = await ffmpeg.exec(['-i', inputName, '-vn', '-acodec', 'copy', outputName]);

    if (copyExitCode !== 0) {
      // Stream copy failed (e.g. the video's audio track isn't AAC) —
      // fall back to a real transcode.
      usedFallback = true;
      outputName = `${baseName}.mp3`;
      const mp3ExitCode = await ffmpeg.exec(['-i', inputName, '-vn', '-acodec', 'libmp3lame', '-q:a', '2', outputName]);
      if (mp3ExitCode !== 0) {
        throw new Error("This video's audio track could not be extracted.");
      }
    }

    onProgress?.({ stage: 'saving', progress: 0 });

    const data = await ffmpeg.readFile(outputName);
    const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(data);

    const fileName = `Extracted - ${baseName}${usedFallback ? '.mp3' : '.m4a'}`;
    const base64 = uint8ToBase64(bytes);

    const result = await CapacitorMediaStore.saveMedia({
      data: base64,
      fileName,
      mediaType: MediaType.AUDIO,
      relativePath: 'LocalPlayer'
    });

    if (!result.success) {
      throw new Error(result.error || 'Could not save the extracted audio to your device.');
    }

    onProgress?.({ stage: 'done', progress: 1 });
    return { fileName, uri: result.uri };
  } finally {
    ffmpeg.off('progress', progressHandler);
    await ffmpeg.deleteFile(inputName).catch(() => {});
    await ffmpeg.deleteFile(outputName).catch(() => {});
  }
}
