import { describe, expect, it } from "vitest"
import type { PluginDisplayState, PluginOutput } from "@/lib/plugin-types"
import { FIVE_HOUR_PERIOD_MS, WEEKLY_PERIOD_MS } from "./axis"
import { selectTimelineCardItems } from "./card"

const NOW = Date.parse("2026-09-06T12:00:00.000Z")
const HOUR = 3_600_000
const DAY = 24 * HOUR

function progress(label: string, resetsAt: string, periodDurationMs: number) {
  return {
    type: "progress" as const,
    label,
    used: 1,
    limit: 10,
    format: { kind: "percent" as const },
    resetsAt,
    periodDurationMs,
  }
}

function plugin(
  id: string,
  name: string,
  lines: PluginOutput["lines"],
): PluginDisplayState {
  return {
    meta: { id, name, iconUrl: `${id}.svg`, brandColor: "#10a37f", lines: [] },
    data: {
      providerId: id,
      displayName: name,
      iconUrl: `${id}.svg`,
      lines,
    },
    loading: false,
    error: null,
    lastManualRefreshAt: null,
  }
}

describe("selectTimelineCardItems", () => {
  it("returns the next in-axis reset per quota, soonest first", () => {
    const items = selectTimelineCardItems(
      [
        plugin("zai", "Z.ai", [
          progress("Session", new Date(NOW + 3 * HOUR).toISOString(), FIVE_HOUR_PERIOD_MS),
        ]),
        plugin("claude", "Claude", [
          progress("Session", new Date(NOW + HOUR).toISOString(), FIVE_HOUR_PERIOD_MS),
          progress("Weekly", new Date(NOW + 2 * DAY).toISOString(), WEEKLY_PERIOD_MS),
        ]),
      ],
      "five-hour",
      NOW,
    )
    expect(items.map((item) => item.pluginId)).toEqual(["claude", "zai"])
    expect(items[0]?.quotaLabel).toBe("Session")
    expect(items[0]?.atMs).toBe(NOW + HOUR)
    expect(items[0]?.crossingGo).toBe(true)
    expect(items[0]?.headroomText).toBe("70% ahead of pace · melts at reset")
    expect(items[1]?.crossingGo).toBe(false)
    expect(items[1]?.headroomText).toBe("30% ahead of pace")
  })

  it("keeps two quotas from the same provider as separate items", () => {
    const items = selectTimelineCardItems(
      [
        plugin("codex", "Codex", [
          progress("Weekly", new Date(NOW + DAY).toISOString(), WEEKLY_PERIOD_MS),
          progress("Luna Reserve", new Date(NOW + 3 * DAY).toISOString(), WEEKLY_PERIOD_MS),
        ]),
      ],
      "weekly",
      NOW,
    )
    expect(items.map((item) => item.quotaLabel)).toEqual(["Weekly", "Luna Reserve"])
    expect(items.every((item) => item.headroomText === null)).toBe(true)
  })

  it("advances a past reset by its period", () => {
    const items = selectTimelineCardItems(
      [
        plugin("claude", "Claude", [
          progress("Session", new Date(NOW - HOUR).toISOString(), FIVE_HOUR_PERIOD_MS),
        ]),
      ],
      "five-hour",
      NOW,
    )
    expect(items).toHaveLength(1)
    expect(items[0]?.atMs).toBe(NOW + 4 * HOUR)
  })

  it("omits a five-hour reset beyond the 12h axis", () => {
    const items = selectTimelineCardItems(
      [
        plugin("claude", "Claude", [
          progress("Session", new Date(NOW + 13 * HOUR).toISOString(), FIVE_HOUR_PERIOD_MS),
        ]),
      ],
      "five-hour",
      NOW,
    )
    expect(items).toEqual([])
  })

  it("omits unsupported periods", () => {
    const items = selectTimelineCardItems(
      [
        plugin("grok", "Grok", [
          progress("Monthly", new Date(NOW + HOUR).toISOString(), 30 * DAY),
        ]),
      ],
      "five-hour",
      NOW,
    )
    expect(items).toEqual([])
  })

  it("lists crossing-go 5-hour items before sooner non-go items", () => {
    const items = selectTimelineCardItems(
      [
        plugin("claude", "Claude", [
          {
            type: "progress",
            label: "Session",
            used: 10,
            limit: 10,
            format: { kind: "percent" },
            resetsAt: new Date(NOW + 30 * 60_000).toISOString(),
            periodDurationMs: FIVE_HOUR_PERIOD_MS,
          },
        ]),
        plugin("zai", "Z.ai", [
          progress("Session", new Date(NOW + 50 * 60_000).toISOString(), FIVE_HOUR_PERIOD_MS),
        ]),
      ],
      "five-hour",
      NOW,
    )
    expect(items.map((item) => `${item.pluginId}:${item.crossingGo}`)).toEqual([
      "zai:true",
      "claude:false",
    ])
  })

  it("uses the remaining band when marking crossing-go", () => {
    const zai = plugin("zai", "Z.ai", [
      progress("Session", new Date(NOW + 4 * HOUR).toISOString(), FIVE_HOUR_PERIOD_MS),
    ])
    const defaultBand = selectTimelineCardItems([zai], "five-hour", NOW)
    const wholeWindow = selectTimelineCardItems([zai], "five-hour", NOW, 5 * HOUR)
    expect(defaultBand.map((item) => item.crossingGo)).toEqual([false])
    expect(wholeWindow.map((item) => item.crossingGo)).toEqual([true])
  })
})
