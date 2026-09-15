/** Supported quota periods, in ms. */
export const FIVE_HOUR_PERIOD_MS = 5 * 60 * 60 * 1000
export const WEEKLY_PERIOD_MS = 7 * 24 * 60 * 60 * 1000

/** Visible spans for the five-hour and weekly timeline sections, in ms. */
export const FIVE_HOUR_AXIS_SPAN_MS = 12 * 60 * 60 * 1000
export const WEEKLY_AXIS_SPAN_MS = 14 * 24 * 60 * 60 * 1000

/**
 * Default span retained for short-axis helpers. Callers rendering the weekly
 * section pass `WEEKLY_AXIS_SPAN_MS` explicitly.
 */
export const AXIS_SPAN_MS = FIVE_HOUR_AXIS_SPAN_MS

/**
 * Offset of `tMs` on an axis starting at `nowMs`, as a percentage (0..100)
 * clamped to the requested span. Returns 0 on non-finite input.
 */
export function axisOffsetPercent(
  tMs: number,
  nowMs: number,
  axisSpanMs = FIVE_HOUR_AXIS_SPAN_MS,
): number {
  if (!Number.isFinite(axisSpanMs) || axisSpanMs <= 0) return 0
  const raw = ((tMs - nowMs) / axisSpanMs) * 100
  if (!Number.isFinite(raw)) return 0
  if (raw < 0) return 0
  if (raw > 100) return 100
  return raw
}

export interface WindowRange {
  startMs: number
  endMs: number
}

/**
 * Returns the `[start, end]` ms range of the provider's current window, where
 * `start = resetsAt - periodDurationMs` and `end = resetsAt`. Returns null
 * when `periodDurationMs` is missing/non-positive or `resetsAt` is unparseable.
 */
export function windowRangeMs(
  resetsAtIso: string,
  periodDurationMs?: number,
): WindowRange | null {
  if (
    typeof periodDurationMs !== "number" ||
    !Number.isFinite(periodDurationMs) ||
    periodDurationMs <= 0
  ) {
    return null
  }
  const endMs = Date.parse(resetsAtIso)
  if (Number.isNaN(endMs)) return null
  return { startMs: endMs - periodDurationMs, endMs }
}

/**
 * True when `resetsAtMs` falls after the visible axis. Past resets are NOT
 * overflow; they are advanced by the caller when a period is available.
 */
export function isOverflow(
  resetsAtMs: number,
  nowMs: number,
  axisSpanMs = FIVE_HOUR_AXIS_SPAN_MS,
): boolean {
  return (
    Number.isFinite(axisSpanMs) &&
    axisSpanMs > 0 &&
    resetsAtMs - nowMs > axisSpanMs
  )
}

/**
 * Formats an epoch-ms timestamp as `HH:MM` (24-hour, zero-padded) in the
 * user's local timezone. Returns an empty string on non-finite input.
 */
export function formatLocalHHMMFromMs(ms: number): string {
  if (!Number.isFinite(ms)) return ""
  const d = new Date(ms)
  const hh = String(d.getHours()).padStart(2, "0")
  const mm = String(d.getMinutes()).padStart(2, "0")
  return `${hh}:${mm}`
}

/**
 * Formats an ISO 8601 timestamp as `HH:MM` (24-hour, zero-padded) in the
 * user's local timezone. Returns an empty string when unparseable.
 */
export function formatLocalHHMM(iso: string): string {
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) return ""
  return formatLocalHHMMFromMs(ms)
}

/** Formats an epoch-ms timestamp as compact local `M/D`. */
export function formatLocalMonthDayFromMs(ms: number): string {
  if (!Number.isFinite(ms)) return ""
  const d = new Date(ms)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

/** Formats an ISO 8601 timestamp as compact local `M/D`. */
export function formatLocalMonthDay(iso: string): string {
  const ms = Date.parse(iso)
  if (Number.isNaN(ms)) return ""
  return formatLocalMonthDayFromMs(ms)
}

/**
 * Formats the remaining time until `resetsAtIso` as a short human string:
 *   - already past or due: "Resets soon"
 *   - under 1h: "Resets in Xm"
 *   - 1d or more: "Resets in Xd Yh" (omitting zero-valued units)
 *   - 1h or more: "Resets in Xh Ym"
 * Returns an empty string when unparseable.
 */
export function formatRemainingLabel(nowMs: number, resetsAtIso: string): string {
  const resetsAtMs = Date.parse(resetsAtIso)
  if (Number.isNaN(resetsAtMs)) return ""
  const diffMs = resetsAtMs - nowMs
  if (diffMs <= 0) return "Resets soon"
  const totalMinutes = Math.floor(diffMs / 60_000)
  const days = Math.floor(totalMinutes / (24 * 60))
  const dayHours = Math.floor((totalMinutes % (24 * 60)) / 60)
  if (days > 0) {
    return dayHours > 0
      ? `Resets in ${days}d ${dayHours}h`
      : `Resets in ${days}d`
  }
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours <= 0) return `Resets in ${minutes}m`
  return `Resets in ${hours}h ${minutes}m`
}

/**
 * Returns the epoch ms of the next top-of-the-hour boundary strictly after
 * `nowMs`, in the user's local timezone. When `nowMs` already falls on an
 * exact hour (HH:00:00.000), the following hour is returned (so the "now"
 * instant itself is never a tick). Returns `NaN` on non-finite input.
 */
export function nextHourStartMs(nowMs: number): number {
  if (!Number.isFinite(nowMs)) return Number.NaN
  const d = new Date(nowMs)
  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    d.getHours() + 1,
    0,
    0,
    0,
  ).getTime()
}

/**
 * On-the-hour tick positions for the short axis, spaced every 2 hours and
 * starting from the next top-of-the-hour strictly after `nowMs`. Each entry
 * carries the tick's epoch `ms` (for positioning) and raw local `hour`
 * (0..23; callers may render `0` as `24` to match Japanese 24-hour notation).
 * Ticks strictly inside the axis span are returned,
 * so the right-edge boundary (offset 100%) is never included. Returns `[]`
 * on non-finite input.
 */
export function hourTickMsList(
  nowMs: number,
  axisSpanMs = FIVE_HOUR_AXIS_SPAN_MS,
): { ms: number; hour: number }[] {
  if (!Number.isFinite(nowMs)) return []
  const start = nextHourStartMs(nowMs)
  const endMs = nowMs + axisSpanMs
  const STEP_MS = 2 * 60 * 60 * 1000
  const out: { ms: number; hour: number }[] = []
  for (let t = start; t < endMs; t += STEP_MS) {
    out.push({ ms: t, hour: new Date(t).getHours() })
  }
  return out
}

/** Returns the next local midnight strictly after `nowMs`. */
export function nextDayStartMs(nowMs: number): number {
  if (!Number.isFinite(nowMs)) return Number.NaN
  const d = new Date(nowMs)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime()
}

/**
 * Returns local-midnight ticks every two days for the weekly axis. Two-day
 * spacing keeps month/day labels legible in the app's narrow window.
 */
export function dayTickMsList(
  nowMs: number,
  axisSpanMs = WEEKLY_AXIS_SPAN_MS,
): { ms: number; month: number; day: number }[] {
  if (
    !Number.isFinite(nowMs) ||
    !Number.isFinite(axisSpanMs) ||
    axisSpanMs <= 0
  ) {
    return []
  }
  const endMs = nowMs + axisSpanMs
  let cursorMs = nextDayStartMs(nowMs)
  const out: { ms: number; month: number; day: number }[] = []
  while (cursorMs < endMs) {
    const d = new Date(cursorMs)
    out.push({ ms: cursorMs, month: d.getMonth() + 1, day: d.getDate() })
    d.setDate(d.getDate() + 2)
    cursorMs = d.getTime()
  }
  return out
}

/** Maximum number of reset instants to render per row (next + next-next). */
export const MAX_RESETS_PER_ROW = 2

export interface UpcomingReset {
  ms: number
  iso: string
}

/**
 * Returns up to `MAX_RESETS_PER_ROW` upcoming reset instants that fall inside
 * the requested visible axis, in chronological order.
 *
 * The first reset is derived from `resetsAtIso`. When `periodDurationMs` is
 * supplied, instants keep stepping by that period; past instants (≤ `nowMs`)
 * are skipped and instants beyond the requested axis span stop the loop.
 *
 * Examples (now=T, periodDurationMs=5h):
 *   resetsAt = T+1h  → [T+1h, T+6h]   (both within T+12h)
 *   resetsAt = T+8h  → [T+8h]         (T+13h is past the axis)
 *   resetsAt = T-1h  → [T+4h, T+9h]   (skip the past instant, step twice)
 *   periodDurationMs absent → at most [resetsAtIso] (when in-axis)
 *
 * Returns `[]` on unparseable input, non-finite `nowMs`, or when no instant
 * falls in-axis.
 */
export function computeUpcomingResets(
  resetsAtIso: string,
  periodDurationMs: number | undefined,
  nowMs: number,
  axisSpanMs = FIVE_HOUR_AXIS_SPAN_MS,
): UpcomingReset[] {
  const startMs = Date.parse(resetsAtIso)
  if (Number.isNaN(startMs)) return []
  if (
    !Number.isFinite(nowMs) ||
    !Number.isFinite(axisSpanMs) ||
    axisSpanMs <= 0
  ) {
    return []
  }

  const spanEndMs = nowMs + axisSpanMs
  const stepMs =
    typeof periodDurationMs === "number" &&
    Number.isFinite(periodDurationMs) &&
    periodDurationMs > 0
      ? periodDurationMs
      : null

  // Locate the first in-axis reset. With a step we advance past `nowMs`;
  // without a step a past `resetsAt` yields nothing.
  let cursorMs = startMs
  if (stepMs !== null) {
    let guard = 0
    while (cursorMs <= nowMs && guard < 1000) {
      cursorMs += stepMs
      guard += 1
    }
  } else if (cursorMs <= nowMs) {
    return []
  }

  const out: UpcomingReset[] = []
  for (let i = 0; i < MAX_RESETS_PER_ROW; i++) {
    if (cursorMs > spanEndMs) break
    out.push({ ms: cursorMs, iso: new Date(cursorMs).toISOString() })
    if (stepMs === null) break
    cursorMs += stepMs
  }
  return out
}

/**
 * Accepts a hex color (`#rgb` or `#rrggbb`) and returns an `rgba(...)` string
 * with the given alpha. Falls back to the input string unchanged when parsing
 * fails, so callers can pass CSS variable references (e.g. `var(--primary)`)
 * through untouched.
 */
export function withAlpha(hex: string, alpha: number): string {
  const trimmed = hex.trim()
  const m = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(trimmed)
  if (!m) return hex
  let r: number
  let g: number
  let b: number
  if (m[1].length === 3) {
    r = parseInt(m[1][0] + m[1][0], 16)
    g = parseInt(m[1][1] + m[1][1], 16)
    b = parseInt(m[1][2] + m[1][2], 16)
  } else {
    r = parseInt(m[1].slice(0, 2), 16)
    g = parseInt(m[1].slice(2, 4), 16)
    b = parseInt(m[1].slice(4, 6), 16)
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
