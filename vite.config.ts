import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // @ffmpeg/ffmpeg spawns its worker via `new Worker(new URL(classWorkerURL,
  // import.meta.url), { type: 'module' })` with a URL that's only known at
  // runtime (not a static literal Vite can analyze). Vite's dependency
  // pre-bundler rewrites/relocates the package in a way that breaks that
  // worker's URL resolution — the worker silently fails to load and
  // ffmpeg.load() never resolves or rejects. This is a confirmed, widely
  // reported issue (ffmpegwasm/ffmpeg.wasm#815) with this exact symptom.
  // Excluding both packages from pre-bundling avoids the rewrite entirely.
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util']
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
