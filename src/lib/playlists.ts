import { Preferences } from '@capacitor/preferences';

export type Playlist = {
  id: string;
  name: string;
  trackIds: string[];
  createdAt: number;
};

const STORAGE_KEY = 'local_player_playlists_v1';

export async function loadPlaylists(): Promise<Playlist[]> {
  const res = await Preferences.get({ key: STORAGE_KEY });
  if (!res.value) return [];
  try {
    const parsed = JSON.parse(res.value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function savePlaylists(playlists: Playlist[]): Promise<void> {
  await Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(playlists) });
}

export function createPlaylist(name: string): Playlist {
  return {
    id: `pl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim() || 'Untitled playlist',
    trackIds: [],
    createdAt: Date.now()
  };
}
