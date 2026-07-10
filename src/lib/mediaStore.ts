import { CapacitorMediaStore, MediaType } from '@odion-cloud/capacitor-mediastore';

export type Track = {
  id: string;
  title: string;
  artist: string;
  album: string;
  durationMs: number;
  albumArtUri?: string;
};

// Voice notes, notification tones, and other short clips live in the same
// MediaStore audio table as real songs. This trims most of that noise out
// of the library without touching anything that looks like an actual track.
const MIN_DURATION_MS = 30_000;

/**
 * The plugin's own `uri` field is built from the legacy MediaStore.DATA file
 * path and returned as `file://<path>`. That fails to load under scoped
 * storage on Android 10+ for files the app didn't create itself — the exact
 * bug PLAY hit. We never use that field. Instead we rebuild a proper
 * content:// URI from the row id, which routes through the ContentResolver
 * and works regardless of scoped storage. Capacitor.convertFileSrc() can
 * then safely turn this into something the WebView can actually play.
 */
export function trackContentUri(id: string): string {
  return `content://media/external/audio/media/${id}`;
}

// Album art URIs the plugin returns per-track (content://.../audio/albumart/<id>)
// are fine to use as-is — they're already a proper content provider path.

function toTrack(media: any): Track {
  return {
    id: String(media.id),
    title: media.title || media.displayName || 'Unknown title',
    artist: media.artist || 'Unknown artist',
    album: media.album || 'Unknown album',
    durationMs: typeof media.duration === 'number' ? media.duration : 0,
    albumArtUri: media.albumArtUri || undefined
  };
}

export async function requestAudioPermission(): Promise<void> {
  await CapacitorMediaStore.requestPermissions({ types: ['audio'] });
}

export async function scanAudioLibrary(): Promise<Track[]> {
  const res = await CapacitorMediaStore.getMediasByType({
    mediaType: MediaType.AUDIO,
    sortBy: 'DATE_ADDED',
    sortOrder: 'DESC',
    includeExternal: true
  });

  return res.media
    .map(toTrack)
    // Duration 0 usually just means the column wasn't available on that OS
    // version rather than a genuinely 0-length file, so those are kept.
    .filter(t => t.durationMs === 0 || t.durationMs >= MIN_DURATION_MS);
}
