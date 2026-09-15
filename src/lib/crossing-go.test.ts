import { describe, expect, it } from "vitest"
import type { MetricLine } from "@/lib/plugin-types"
import { FIVE_HOUR_PERIOD_MS, WEEKLY_PERIOD_MS } from "@/lib/quota-timeline/axis"
import {
  crossingBudgetRange,
  crossingHeadroom,
  formatCrossingHeadroom,
  isCrossingGo,
} from "./crossing-go"

const NOW = Date.parse("2026-09-15T12:00:00.000Z")
const HOUR = 3_600_000
const DAY = 24 * HOUR

function fiveHour(used: number, resetsInMs: number): MetricLine {
  return {
    type: "progress",
    label: "Session",
    used,
    limit: 100,
    format: { kind: "percent" },
    resetsAt: new Date(NOW + resetsInMs).toISOString(),
    periodDurationMs: FIVE_HOUR_PERIOD_MS,
  }
}

function weekly(used: number, resetsInMs: number): MetricLine {
  return {
    type: "progress",
    label: "Weekly",
    used,
    limit: 100,
    format: { kind: "percent" },
    resetsAt: new Date(NOW + resetsInMs).toISOString(),
    periodDurationMs: WEEKLY_PERIOD_MS,
  }
}

describe("isCrossingGo", () => {
  it("is true in the last hour with unused session and no weekly", () => {
    const line = fiveHour(10, 40 * 60_000)
    expect(isCrossingGo(line, [line], NOW)).toBe(true)
  })

  it("is false early in the window even when unused", () => {
    const line = fiveHour(0, 4 * HOUR)
    expect(isCrossingGo(line, [line], NOW)).toBe(false)
  })

  it("is false when used equals linear expected usage", () => {
    const remainingMs = 40 * 60_000
    const elapsedMs = FIVE_HOUR_PERIOD_MS - remainingMs
    const used = (elapsedMs / FIVE_HOUR_PERIOD_MS) * 100
    const line = fiveHour(used, remainingMs)
    expect(isCrossingGo(line, [line], NOW)).toBe(false)
  })

  it("is false when a weekly line on the provider is behind", () => {
    const session = fiveHour(10, 40 * 60_000)
    const week = weekly(80, 6 * DAY)
    expect(isCrossingGo(session, [session, week], NOW)).toBe(false)
  })

  it("is true when weekly exists but is not behind", () => {
    const session = fiveHour(10, 40 * 60_000)
    const week = weekly(5, 6 * DAY)
    expect(isCrossingGo(session, [session, week], NOW)).toBe(true)
  })

  it("is false when the 5-hour line has no reset", () => {
    const line: MetricLine = {
      type: "progress",
      label: "Session",
      used: 0,
      limit: 100,
      format: { kind: "percent" },
      periodDurationMs: FIVE_HOUR_PERIOD_MS,
    }
    expect(isCrossingGo(line, [line], NOW)).toBe(false)
  })

  it("is never true for a weekly line", () => {
    const week = weekly(10, 40 * 60_000)
    expect(isCrossingGo(week, [week], NOW)).toBe(false)
  })

  it("treats 80 minutes remaining as go at 90 minutes and not at 60", () => {
    const line = fiveHour(10, 80 * 60_000)
    expect(isCrossingGo(line, [line], NOW, 90 * 60_000)).toBe(true)
    expect(isCrossingGo(line, [line], NOW)).toBe(false)
  })

  it("treats 100 minutes remaining as not go when the band is 90 minutes", () => {
    const line = fiveHour(10, 100 * 60_000)
    expect(isCrossingGo(line, [line], NOW, 90 * 60_000)).toBe(false)
  })

  it("treats 40 minutes remaining as not go when the band is 30 minutes", () => {
    const line = fiveHour(10, 40 * 60_000)
    expect(isCrossingGo(line, [line], NOW, 30 * 60_000)).toBe(false)
    expect(isCrossingGo(line, [line], NOW)).toBe(true)
  })
})

describe("crossingHeadroom", () => {
  it("measures unused vs the pace tick, not leftover vs linear room", () => {
    const unused = fiveHour(0, HOUR)
    const headroom = crossingHeadroom(unused, NOW)
    expect(headroom).toMatchObject({
      usedPct: 0,
      elapsedPct: 80,
      leftoverPct: 100,
      remainingPct: 20,
      headroomPct: 80,
    })
    expect(formatCrossingHeadroom(headroom!.headroomPct, true)).toBe(
      "80% ahead of pace · melts at reset",
    )
    expect(crossingBudgetRange(headroom!, "used", true)).toEqual({ start: 0, end: 100 })
    expect(crossingBudgetRange(headroom!, "left", true)).toEqual({ start: 0, end: 100 })
  })

  it("shades only fill to tick when ahead and reset is not imminent", () => {
    const unused = fiveHour(0, 4 * HOUR)
    const headroom = crossingHeadroom(unused, NOW)!
    expect(headroom.headroomPct).toBe(20)
    expect(formatCrossingHeadroom(headroom.headroomPct, false)).toBe("20% ahead of pace")
    expect(crossingBudgetRange(headroom, "used", false)).toEqual({ start: 0, end: 20 })
    expect(crossingBudgetRange(headroom, "left", false)).toEqual({ start: 80, end: 100 })
  })

  it("is null when usage is at or past the pace tick", () => {
    expect(crossingHeadroom(fiveHour(90, HOUR), NOW)).toBeNull()
  })

  it("measures leftover vs the pace tick on weekly lines", () => {
    const headroom = crossingHeadroom(weekly(0, 3.5 * DAY), NOW)!
    expect(headroom).toMatchObject({
      usedPct: 0,
      elapsedPct: 50,
      leftoverPct: 100,
      remainingPct: 50,
      headroomPct: 50,
    })
    expect(crossingBudgetRange(headroom, "used", false)).toEqual({ start: 0, end: 50 })
    expect(crossingBudgetRange(headroom, "left", false)).toEqual({ start: 50, end: 100 })
  })

  it("is null without a period or reset", () => {
    expect(
      crossingHeadroom(
        {
          type: "progress",
          used: 0,
          limit: 100,
          resetsAt: new Date(NOW + HOUR).toISOString(),
        },
        NOW,
      ),
    ).toBeNull()
    expect(crossingHeadroom(fiveHour(0, HOUR), NOW)?.headroomPct).toBe(80)
    expect(
      crossingHeadroom(
        { type: "progress", used: 0, limit: 100, periodDurationMs: FIVE_HOUR_PERIOD_MS },
        NOW,
      ),
    ).toBeNull()
  })
})
