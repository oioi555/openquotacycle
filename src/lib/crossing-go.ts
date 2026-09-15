import type { MetricLine } from "@/lib/plugin-types"
import { calculatePaceStatus } from "@/lib/pace-status"
import { FIVE_HOUR_PERIOD_MS, WEEKLY_PERIOD_MS } from "@/lib/quota-timeline/axis"

/** Default remaining band (last hour) where leftover should be used across reset. */
export const CROSSING_GO_REMAINING_MS = 60 * 60 * 1000

export type CrossingGoLine = {
  type: "progress"
  used: number
  limit: number
  resetsAt?: string
  periodDurationMs?: number
}

/** Unused quota relative to the pace tick (`elapsed% - used%`). */
export type CrossingHeadroom = {
  usedPct: number
  elapsedPct: number
  leftoverPct: number
  remainingPct: number
  headroomPct: number
}

export type CrossingBudgetRange = {
  start: number
  end: number
}

/**
 * True when a started 5-hour quota is in the remaining band (default last hour),
 * below linear expected usage, and no weekly line on the same provider is behind pace.
 */
export function isCrossingGo(
  line: CrossingGoLine,
  siblingLines: readonly MetricLine[],
  nowMs: number,
  remainingBandMs: number = CROSSING_GO_REMAINING_MS,
): boolean {
  if (line.periodDurationMs !== FIVE_HOUR_PERIOD_MS) return false
  if (typeof line.resetsAt !== "string" || line.resetsAt.trim().length === 0) return false
  const resetsAtMs = Date.parse(line.resetsAt)
  if (!Number.isFinite(resetsAtMs) || !Number.isFinite(nowMs)) return false
  const remainingMs = resetsAtMs - nowMs
  const bandMs =
    Number.isFinite(remainingBandMs) && remainingBandMs > 0
      ? remainingBandMs
      : CROSSING_GO_REMAINING_MS
  if (remainingMs <= 0 || remainingMs > bandMs) return false
  if (!Number.isFinite(line.used) || !Number.isFinite(line.limit) || line.limit <= 0) {
    return false
  }
  const elapsedMs = nowMs - (resetsAtMs - FIVE_HOUR_PERIOD_MS)
  if (elapsedMs <= 0) return false
  const expected = (elapsedMs / FIVE_HOUR_PERIOD_MS) * line.limit
  if (!(line.used < expected)) return false
  return !providerWeeklyBehind(siblingLines, nowMs)
}

export function crossingHeadroom(line: CrossingGoLine, nowMs: number): CrossingHeadroom | null {
  const period = line.periodDurationMs
  if (typeof period !== "number" || !Number.isFinite(period) || period <= 0) return null
  if (typeof line.resetsAt !== "string" || line.resetsAt.trim().length === 0) return null
  const resetsAtMs = Date.parse(line.resetsAt)
  if (!Number.isFinite(resetsAtMs) || !Number.isFinite(nowMs)) return null
  const remainingMs = resetsAtMs - nowMs
  if (remainingMs <= 0) return null
  if (!Number.isFinite(line.used) || !Number.isFinite(line.limit) || line.limit <= 0) {
    return null
  }
  const elapsedMs = period - remainingMs
  if (elapsedMs <= 0) return null
  const usedPct = Math.min(100, Math.max(0, (line.used / line.limit) * 100))
  const elapsedPct = Math.min(100, (elapsedMs / period) * 100)
  const headroomPct = elapsedPct - usedPct
  if (!(headroomPct > 0)) return null
  return {
    usedPct,
    elapsedPct,
    leftoverPct: 100 - usedPct,
    remainingPct: 100 - elapsedPct,
    headroomPct,
  }
}

export function formatCrossingHeadroom(headroomPct: number, crossReset: boolean): string {
  const ahead = `${Math.round(headroomPct)}% ahead of pace`
  return crossReset ? `${ahead} · melts at reset` : ahead
}

/**
 * Meter slice for unused-vs-tick. 5-hour last hour shades leftover to burn
 * across reset; otherwise only the gap from fill to the pace tick.
 */
export function crossingBudgetRange(
  headroom: CrossingHeadroom,
  displayMode: "used" | "left",
  crossReset: boolean,
): CrossingBudgetRange {
  if (crossReset) {
    if (displayMode === "used") return { start: headroom.usedPct, end: 100 }
    return { start: 0, end: headroom.leftoverPct }
  }
  if (displayMode === "used") return { start: headroom.usedPct, end: headroom.elapsedPct }
  return { start: headroom.remainingPct, end: headroom.leftoverPct }
}

function providerWeeklyBehind(siblingLines: readonly MetricLine[], nowMs: number): boolean {
  for (const sibling of siblingLines) {
    if (sibling.type !== "progress") continue
    if (sibling.periodDurationMs !== WEEKLY_PERIOD_MS) continue
    if (typeof sibling.resetsAt !== "string") continue
    const resetsAtMs = Date.parse(sibling.resetsAt)
    if (!Number.isFinite(resetsAtMs)) continue
    const pace = calculatePaceStatus(
      sibling.used,
      sibling.limit,
      resetsAtMs,
      WEEKLY_PERIOD_MS,
      nowMs,
    )
    if (pace?.status === "behind") return true
  }
  return false
}
