import type { PluginOutput } from "@/lib/plugin-types";

/** Nearest upcoming quota reset across the dashboard's providers, mirroring
 * the quota-timeline rule: past instants advance by their period until strictly
 * after now; past instants without a period are skipped. Returns epoch ms. */
export function findNextReset(
  plugins: Array<{ data: PluginOutput | null }>,
  now: number = Date.now(),
): number | null {
  let min: number | null = null;
  for (const plugin of plugins) {
    for (const line of plugin.data?.lines ?? []) {
      if (line.type !== "progress" || !line.resetsAt) continue;
      let at = Date.parse(line.resetsAt);
      if (!Number.isFinite(at)) continue;
      if (at <= now) {
        const period = line.periodDurationMs;
        if (!period || period <= 0) continue;
        while (at <= now) at += period;
      }
      if (min === null || at < min) min = at;
    }
  }
  return min;
}

/** Compact "in ..." label for a remaining duration, e.g. "2h 14m" / "3d 4m". */
export function formatResetIn(remainingMs: number, now: number = Date.now()): string {
  const totalMinutes = Math.max(0, Math.round((remainingMs - now) / 60_000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
