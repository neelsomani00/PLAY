import { Preferences } from '@capacitor/preferences';

export type PlayCounts = Record<string, number>;

const STORAGE_KEY = 'local_player_play_counts_v1';

export async function loadPlayCounts(): Promise<PlayCounts> {
  const res = await Preferences.get({ key: STORAGE_KEY });
  if (!res.value) return {};
  try {
    const parsed = JSON.parse(res.value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export async function savePlayCounts(counts: PlayCounts): Promise<void> {
  await Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(counts) });
}
