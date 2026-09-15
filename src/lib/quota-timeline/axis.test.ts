import { describe, expect, it } from "vitest"
import {
  AXIS_SPAN_MS,
  axisOffsetPercent,
  computeUpcomingResets,
  dayTickMsList,
  formatLocalHHMM,
  formatLocalHHMMFromMs,
  formatLocalMonthDay,
  formatLocalMonthDayFromMs,
  formatRemainingLabel,
  FIVE_HOUR_AXIS_SPAN_MS,
  hourTickMsList,
  isOverflow,
  MAX_RESETS_PER_ROW,
  nextDayStartMs,
  nextHourStartMs,
  WEEKLY_AXIS_SPAN_MS,
  withAlpha,
  windowRangeMs,
} from "./axis"

const NOW = Date.parse("2026-06-27T12:00:00.000Z")

describe("axisOffsetPercent", () => {
  it("returns 0 at now", () => {
    expect(axisOffsetPercent(NOW, NOW)).toBe(0)
  })

  it("returns 100 at now + 12h", () => {
    expect(axisOffsetPercent(NOW + AXIS_SPAN_MS, NOW)).toBe(100)
  })

  it("returns 50 at now + 6h", () => {
    expect(axisOffsetPercent(NOW + 6 * 60 * 60 * 1000, NOW)).toBe(50)
  })

  it("clamps below 0 when before now", () => {
    expect(axisOffsetPercent(NOW - 1000, NOW)).toBe(0)
  })

  it("clamps above 100 when beyond 12h", () => {
    expect(axisOffsetPercent(NOW + AXIS_SPAN_MS + 1000, NOW)).toBe(100)
  })

  it("returns 0 on NaN input", () => {
    expect(axisOffsetPercent(Number.NaN, NOW)).toBe(0)
  })

  it("supports the weekly 14-day span", () => {
    expect(
      axisOffsetPercent(
        NOW + WEEKLY_AXIS_SPAN_MS,
        NOW,
        WEEKLY_AXIS_SPAN_MS,
      ),
    ).toBe(100)
    expect(
      axisOffsetPercent(
        NOW + 7 * 24 * 60 * 60 * 1000,
        NOW,
        WEEKLY_AXIS_SPAN_MS,
      ),
    ).toBe(50)
  })

  it("uses the five-hour span as the short-axis default", () => {
    expect(AXIS_SPAN_MS).toBe(FIVE_HOUR_AXIS_SPAN_MS)
  })
})

describe("windowRangeMs", () => {
  const RESETS_AT = "2026-06-27T15:00:00.000Z" // NOW + 3h
  const RESETS_MS = Date.parse(RESETS_AT)
  const FIVE_HOURS_MS = 5 * 60 * 60 * 1000

  it("returns null when periodDurationMs is missing", () => {
    expect(windowRangeMs(RESETS_AT)).toBeNull()
  })

  it("returns null when periodDurationMs is zero", () => {
    expect(windowRangeMs(RESETS_AT, 0)).toBeNull()
  })

  it("returns null when periodDurationMs is negative", () => {
    expect(windowRangeMs(RESETS_AT, -1)).toBeNull()
  })

  it("returns null when resetsAt is unparseable", () => {
    expect(windowRangeMs("not-a-date", FIVE_HOURS_MS)).toBeNull()
  })

  it("returns {start, end} with start = end - periodDurationMs", () => {
    const r = windowRangeMs(RESETS_AT, FIVE_HOURS_MS)
    expect(r).not.toBeNull()
    expect(r!.endMs).toBe(RESETS_MS)
    expect(r!.startMs).toBe(RESETS_MS - FIVE_HOURS_MS)
  })
})

describe("isOverflow", () => {
  it("is false when resetsAt is within the 12h span", () => {
    expect(isOverflow(NOW + 1, NOW)).toBe(false)
    expect(isOverflow(NOW + AXIS_SPAN_MS, NOW)).toBe(false)
  })

  it("is true when resetsAt is more than 12h after now", () => {
    expect(isOverflow(NOW + AXIS_SPAN_MS + 1, NOW)).toBe(true)
  })

  it("is false for past resets (past is not overflow)", () => {
    expect(isOverflow(NOW - 1000, NOW)).toBe(false)
  })

  it("accepts a weekly axis span", () => {
    expect(
      isOverflow(NOW + WEEKLY_AXIS_SPAN_MS, NOW, WEEKLY_AXIS_SPAN_MS),
    ).toBe(false)
    expect(
      isOverflow(NOW + WEEKLY_AXIS_SPAN_MS + 1, NOW, WEEKLY_AXIS_SPAN_MS),
    ).toBe(true)
  })
})

describe("formatLocalHHMM", () => {
  it("formats an ISO timestamp as HH:MM in local time", () => {
    const d = new Date(2026, 5, 15, 14, 30, 0)
    expect(formatLocalHHMM(d.toISOString())).toBe("14:30")
  })

  it("zero-pads single-digit hours and minutes", () => {
    const d = new Date(2026, 5, 15, 3, 5, 0)
    expect(formatLocalHHMM(d.toISOString())).toBe("03:05")
  })

  it("returns empty string on unparseable input", () => {
    expect(formatLocalHHMM("not-a-date")).toBe("")
  })
})

describe("formatLocalHHMMFromMs", () => {
  it("formats an epoch-ms timestamp as HH:MM in local time", () => {
    const d = new Date(2026, 5, 15, 14, 30, 0)
    expect(formatLocalHHMMFromMs(d.getTime())).toBe("14:30")
  })

  it("matches formatLocalHHMM for the same instant", () => {
    const d = new Date(2026, 5, 15, 9, 7, 0)
    expect(formatLocalHHMMFromMs(d.getTime())).toBe(formatLocalHHMM(d.toISOString()))
  })

  it("zero-pads single-digit hours and minutes", () => {
    const d = new Date(2026, 5, 15, 3, 5, 0)
    expect(formatLocalHHMMFromMs(d.getTime())).toBe("03:05")
  })

  it("returns empty string on non-finite input", () => {
    expect(formatLocalHHMMFromMs(Number.NaN)).toBe("")
    expect(formatLocalHHMMFromMs(Number.POSITIVE_INFINITY)).toBe("")
  })
})

describe("formatLocalMonthDay", () => {
  it("formats an ISO timestamp as local M/D", () => {
    const d = new Date(2026, 2, 8, 14, 30, 0)
    expect(formatLocalMonthDay(d.toISOString())).toBe("3/8")
  })

  it("matches the epoch-ms formatter", () => {
    const d = new Date(2026, 10, 5, 9, 7, 0)
    expect(formatLocalMonthDayFromMs(d.getTime())).toBe("11/5")
    expect(formatLocalMonthDayFromMs(d.getTime())).toBe(
      formatLocalMonthDay(d.toISOString()),
    )
  })

  it("returns empty string on unparseable input", () => {
    expect(formatLocalMonthDay("not-a-date")).toBe("")
    expect(formatLocalMonthDayFromMs(Number.NaN)).toBe("")
  })
})

describe("formatRemainingLabel", () => {
  it("returns 'Resets soon' for past or current time", () => {
    expect(formatRemainingLabel(NOW, new Date(NOW).toISOString())).toBe("Resets soon")
    expect(formatRemainingLabel(NOW, new Date(NOW - 1).toISOString())).toBe("Resets soon")
  })

  it("returns minutes-only format for under 1h", () => {
    const resets = NOW + 5 * 60_000
    expect(formatRemainingLabel(NOW, new Date(resets).toISOString())).toBe("Resets in 5m")
  })

  it("returns hours and minutes for 1h or more", () => {
    const resets = NOW + (2 * 60 + 14) * 60_000
    expect(formatRemainingLabel(NOW, new Date(resets).toISOString())).toBe("Resets in 2h 14m")
  })

  it("includes days for long reset intervals", () => {
    const resets = NOW + (8 * 24 + 4) * 60 * 60 * 1000
    expect(formatRemainingLabel(NOW, new Date(resets).toISOString())).toBe("Resets in 8d 4h")
    expect(
      formatRemainingLabel(
        NOW,
        new Date(NOW + 2 * 24 * 60 * 60 * 1000).toISOString(),
      ),
    ).toBe("Resets in 2d")
  })

  it("returns empty string on unparseable input", () => {
    expect(formatRemainingLabel(NOW, "not-a-date")).toBe("")
  })
})

describe("nextHourStartMs", () => {
  it("returns the next top-of-the-hour when now has minutes", () => {
    const now = new Date(2026, 5, 15, 13, 45, 30, 250).getTime()
    const expected = new Date(2026, 5, 15, 14, 0, 0, 0).getTime()
    expect(nextHourStartMs(now)).toBe(expected)
  })

  it("returns the following hour even when now is exactly on the hour", () => {
    const now = new Date(2026, 5, 15, 13, 0, 0, 0).getTime()
    const expected = new Date(2026, 5, 15, 14, 0, 0, 0).getTime()
    expect(nextHourStartMs(now)).toBe(expected)
  })

  it("rolls into the next day when now is at 23:xx", () => {
    const now = new Date(2026, 5, 15, 23, 30, 0, 0).getTime()
    const expected = new Date(2026, 5, 16, 0, 0, 0, 0).getTime()
    expect(nextHourStartMs(now)).toBe(expected)
  })

  it("returns NaN for non-finite input", () => {
    expect(Number.isNaN(nextHourStartMs(Number.NaN))).toBe(true)
    expect(Number.isNaN(nextHourStartMs(Number.POSITIVE_INFINITY))).toBe(true)
  })
})

describe("nextDayStartMs", () => {
  it("returns the next local midnight", () => {
    const now = new Date(2026, 5, 15, 13, 45, 30, 250).getTime()
    const expected = new Date(2026, 5, 16, 0, 0, 0, 0).getTime()
    expect(nextDayStartMs(now)).toBe(expected)
  })

  it("returns the following day when now is exactly midnight", () => {
    const now = new Date(2026, 5, 15, 0, 0, 0, 0).getTime()
    const expected = new Date(2026, 5, 16, 0, 0, 0, 0).getTime()
    expect(nextDayStartMs(now)).toBe(expected)
  })

  it("returns NaN for non-finite input", () => {
    expect(Number.isNaN(nextDayStartMs(Number.NaN))).toBe(true)
  })
})

describe("hourTickMsList", () => {
  it("returns 2h-spaced on-the-hour ticks starting from the next hour", () => {
    const now = new Date(2026, 5, 15, 13, 45, 0, 0).getTime()
    const result = hourTickMsList(now)
    expect(result.map((t) => t.hour)).toEqual([14, 16, 18, 20, 22, 0])
    expect(result).toHaveLength(6)
    expect(result[0].ms).toBe(new Date(2026, 5, 15, 14, 0, 0, 0).getTime())
    expect(result[5].ms).toBe(new Date(2026, 5, 16, 0, 0, 0, 0).getTime())
  })

  it("starts at the next hour even when now is exactly on the hour", () => {
    const now = new Date(2026, 5, 15, 12, 0, 0, 0).getTime()
    const result = hourTickMsList(now)
    expect(result.map((t) => t.hour)).toEqual([13, 15, 17, 19, 21, 23])
  })

  it("never includes a tick at the right-edge boundary (now + 12h)", () => {
    // now = 11:59:59 -> next hour = 12:00, then 14, 16, 18, 20, 22.
    // 24:00 would fall at now + 12h + 1s (beyond axis), so it is excluded.
    const now = new Date(2026, 5, 15, 11, 59, 59, 0).getTime()
    const result = hourTickMsList(now)
    expect(result.map((t) => t.hour)).toEqual([12, 14, 16, 18, 20, 22])
    for (const t of result) {
      expect(t.ms).toBeLessThan(now + AXIS_SPAN_MS)
    }
  })

  it("handles day rollover within the visible window", () => {
    const now = new Date(2026, 5, 15, 23, 0, 0, 0).getTime()
    const result = hourTickMsList(now)
    // Next hour is midnight (raw hour 0), then 2, 4, 6, 8, 10.
    expect(result.map((t) => t.hour)).toEqual([0, 2, 4, 6, 8, 10])
  })

  it("returns an empty array for non-finite input", () => {
    expect(hourTickMsList(Number.NaN)).toEqual([])
    expect(hourTickMsList(Number.POSITIVE_INFINITY)).toEqual([])
  })
})

describe("dayTickMsList", () => {
  it("returns two-day-spaced local-midnight ticks within the weekly axis", () => {
    const now = new Date(2026, 5, 15, 13, 45, 0, 0).getTime()
    const result = dayTickMsList(now)
    expect(result.map((tick) => `${tick.month}/${tick.day}`)).toEqual([
      "6/16",
      "6/18",
      "6/20",
      "6/22",
      "6/24",
      "6/26",
      "6/28",
    ])
    expect(result.every((tick) => tick.ms < now + WEEKLY_AXIS_SPAN_MS)).toBe(true)
  })

  it("returns an empty array for non-finite input", () => {
    expect(dayTickMsList(Number.NaN)).toEqual([])
    expect(dayTickMsList(Number.POSITIVE_INFINITY)).toEqual([])
  })
})

describe("withAlpha", () => {
  it("converts a 6-digit hex to rgba()", () => {
    expect(withAlpha("#ff8800", 0.25)).toBe("rgba(255, 136, 0, 0.25)")
  })

  it("converts a 3-digit hex to rgba()", () => {
    expect(withAlpha("#f80", 0.5)).toBe("rgba(255, 136, 0, 0.5)")
  })

  it("passes non-hex input (e.g. CSS variables) through unchanged", () => {
    expect(withAlpha("var(--primary)", 0.5)).toBe("var(--primary)")
  })

  it("is case-insensitive", () => {
    expect(withAlpha("#FF88Aa", 0.5)).toBe("rgba(255, 136, 170, 0.5)")
  })
})

describe("computeUpcomingResets", () => {
  const FIVE_HOURS_MS = 5 * 60 * 60 * 1000
  const ONE_HOUR_MS = 60 * 60 * 1000
  const iso = (ms: number) => new Date(ms).toISOString()

  it("returns [] when resetsAt is unparseable", () => {
    expect(computeUpcomingResets("not-a-date", FIVE_HOURS_MS, NOW)).toEqual([])
  })

  it("returns [] when nowMs is non-finite", () => {
    const resets = NOW + 60_000
    expect(computeUpcomingResets(iso(resets), FIVE_HOURS_MS, Number.NaN)).toEqual([])
  })

  it("returns only [resetsAt] when periodDurationMs is absent and resetsAt is in-axis", () => {
    const resets = NOW + 60_000
    const r = computeUpcomingResets(iso(resets), undefined, NOW)
    expect(r).toHaveLength(1)
    expect(r[0].ms).toBe(resets)
  })

  it("returns [] when periodDurationMs is absent and resetsAt is in the past", () => {
    const resets = NOW - 60_000
    expect(computeUpcomingResets(iso(resets), undefined, NOW)).toEqual([])
  })

  it("returns next + next-next when both fit in the 12h axis", () => {
    // resetsAt = NOW + 1h, period = 5h → [NOW+1h, NOW+6h]
    const resets = NOW + ONE_HOUR_MS
    const r = computeUpcomingResets(iso(resets), FIVE_HOURS_MS, NOW)
    expect(r).toHaveLength(2)
    expect(r[0].ms).toBe(NOW + ONE_HOUR_MS)
    expect(r[1].ms).toBe(NOW + 6 * ONE_HOUR_MS)
  })

  it(`caps at MAX_RESETS_PER_ROW (${MAX_RESETS_PER_ROW}) even when more resets fit`, () => {
    // 1h period: NOW+0.5h, +1.5h, +2.5h, ... all fit in 12h, but only first 2 returned.
    const resets = NOW + 30 * 60 * 1000
    const r = computeUpcomingResets(iso(resets), ONE_HOUR_MS, NOW)
    expect(r).toHaveLength(MAX_RESETS_PER_ROW)
    expect(r[0].ms).toBe(NOW + 30 * 60 * 1000)
    expect(r[1].ms).toBe(NOW + 90 * 60 * 1000)
  })

  it("returns only the first when next-next falls beyond the axis", () => {
    // resetsAt = NOW + 8h, period = 5h → next-next = NOW + 13h (overflow)
    const resets = NOW + 8 * ONE_HOUR_MS
    const r = computeUpcomingResets(iso(resets), FIVE_HOURS_MS, NOW)
    expect(r).toHaveLength(1)
    expect(r[0].ms).toBe(NOW + 8 * ONE_HOUR_MS)
  })

  it("uses the weekly axis span when requested", () => {
    const resets = NOW + 24 * 60 * 60 * 1000
    const r = computeUpcomingResets(
      iso(resets),
      7 * 24 * 60 * 60 * 1000,
      NOW,
      WEEKLY_AXIS_SPAN_MS,
    )
    expect(r).toHaveLength(2)
    expect(r[0].ms).toBe(resets)
    expect(r[1].ms).toBe(NOW + 8 * 24 * 60 * 60 * 1000)
  })

  it("skips past instants and returns the upcoming cycles", () => {
    // resetsAt = NOW - 1h, period = 5h → first future = NOW + 4h, then NOW + 9h
    const resets = NOW - ONE_HOUR_MS
    const r = computeUpcomingResets(iso(resets), FIVE_HOURS_MS, NOW)
    expect(r).toHaveLength(2)
    expect(r[0].ms).toBe(NOW + 4 * ONE_HOUR_MS)
    expect(r[1].ms).toBe(NOW + 9 * ONE_HOUR_MS)
  })

  it("treats non-positive periodDurationMs as absent", () => {
    const resets = NOW + 60_000
    expect(computeUpcomingResets(iso(resets), 0, NOW)).toHaveLength(1)
    expect(computeUpcomingResets(iso(resets), -1, NOW)).toHaveLength(1)
  })

  it("produces ISO strings that re-parse to the same epoch ms", () => {
    const resets = NOW + ONE_HOUR_MS
    const r = computeUpcomingResets(iso(resets), FIVE_HOURS_MS, NOW)
    for (const item of r) {
      expect(Date.parse(item.iso)).toBe(item.ms)
    }
  })
})
