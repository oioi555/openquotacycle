import type { PaceResult } from "@/lib/pace-status"

export type ProgressTone = "normal" | "warning" | "critical"

export const PROGRESS_TONE_FILL: Record<ProgressTone, string> = {
  normal: "var(--meter-fill)",
  warning: "var(--meter-warning)",
  critical: "var(--meter-critical)",
}

/**
 * Overview meter verdict: exhausted or projected to run out is red, under
 * 10% spare is yellow, everything else is brand green. Shared with Timeline
 * plots so both surfaces encode the same pace.
 */
export function progressTone(
  used: number,
  limit: number,
  paceResult: PaceResult | null | undefined,
): ProgressTone {
  if (used >= limit) return "critical"
  const projected = paceResult?.projectedUsage
  if (projected == null || !Number.isFinite(projected)) return "normal"
  if (projected > limit) return "critical"
  if (projected > limit * 0.9) return "warning"
  return "normal"
}
