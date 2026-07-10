// Copies the ffmpeg.wasm core + worker files into public/ffmpeg so the
// Extractor page can load them from the app's own origin at runtime,
// instead of fetching them from a CDN. Runs automatically after npm
// install (see "postinstall" in package.json), so it's always in sync
// with whatever @ffmpeg/core and @ffmpeg/ffmpeg versions are installed.
import { existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const targetDir = join(root, 'public', 'ffmpeg');

const files = [
  {
    from: join(root, 'node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.js'),
    to: join(targetDir, 'ffmpeg-core.js')
  },
  {
    from: join(root, 'node_modules/@ffmpeg/core/dist/esm/ffmpeg-core.wasm'),
    to: join(targetDir, 'ffmpeg-core.wasm')
  },
  {
    from: join(root, 'node_modules/@ffmpeg/ffmpeg/dist/esm/worker.js'),
    to: join(targetDir, 'worker.js')
  }
];

mkdirSync(targetDir, { recursive: true });

let copied = 0;
for (const f of files) {
  if (!existsSync(f.from)) {
    console.warn(`[copy-ffmpeg-core] missing ${f.from} — skipping (this is fine if npm install is still in progress)`);
    continue;
  }
  copyFileSync(f.from, f.to);
  copied += 1;
}

console.log(`[copy-ffmpeg-core] copied ${copied}/${files.length} files into public/ffmpeg`);
