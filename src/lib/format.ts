export function formatSeconds(totalSeconds: number): string {
  if (!isFinite(totalSeconds) || totalSeconds < 0) return '0:00';
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatMs(ms: number): string {
  if (!ms) return '--:--';
  return formatSeconds(ms / 1000);
}
