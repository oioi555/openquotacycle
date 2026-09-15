/** Compact face (`4m` / `Off`) plus long tooltip/aria label. */
export function formatAutoRefreshCountdown(
  autoUpdateNextAt: number | null,
  now: number = Date.now(),
): { face: string; label: string } {
  if (autoUpdateNextAt == null) {
    return { face: "Off", label: "Auto refresh paused" };
  }
  const remainingMs = Math.max(0, autoUpdateNextAt - now);
  const totalSeconds = Math.ceil(remainingMs / 1000);
  if (totalSeconds >= 60) {
    const minutes = Math.ceil(totalSeconds / 60);
    return { face: `${minutes}m`, label: `Next update in ${minutes}m` };
  }
  return { face: `${totalSeconds}s`, label: `Next update in ${totalSeconds}s` };
}
