import { describe, expect, it } from "vitest"
import type { MetricLine } from "@/lib/plugin-types"
import { FIVE_HOUR_PERIOD_MS, WEEKLY_PERIOD_MS } from "@/lib/quota-timeline/axis"
import {
  collectMeltingLeftoverLines,
  formatMeltingLeftoverNotification,
  meltingLeftoverKey,
  meltingLeftoverSnapshotReady,
  nextMeltingLeftoverNotifications,
  type MeltingLeftoverLine,
  type MeltingLeftoverPlugin,
} from "./leftover-notify"

const NOW = Date.parse("2026-09-15T12:00:00.000Z")
const HOUR = 3_600_000

function fiveHour(used: number, resetsInMs: number, label = "Session"): MetricLine {
  return {
    type: "progress",
    label,
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

function plugin(
  id: string,
  name: string,
  lines: MetricLine[],
  extra: Partial<MeltingLeftoverPlugin> = {},
): MeltingLeftoverPlugin {
  return {
    meta: { id, name },
    data: { lines },
    loading: false,
    error: null,
    ...extra,
  }
}

function line(
  pluginId: string,
  leftoverPct: number,
  remainingFace: string | null,
  resetsAt = "reset-1",
): MeltingLeftoverLine {
  return {
    pluginId,
    pluginName: pluginId === "claude" ? "Claude" : pluginId,
    label: "Session",
    resetsAt,
    leftoverPct,
    remainingFace,
  }
}

describe("meltingLeftoverSnapshotReady", () => {
  it("is false with no plugins", () => {
    expect(meltingLeftoverSnapshotReady([])).toBe(false)
  })

  it("waits while a plugin is still loading without data", () => {
    expect(
      meltingLeftoverSnapshotReady([
        { meta: { id: "claude", name: "Claude" }, data: null, loading: true, error: null },
      ]),
    ).toBe(false)
  })

  it("is ready once every plugin has data or finished loading", () => {
    expect(
      meltingLeftoverSnapshotReady([
        plugin("claude", "Claude", [fiveHour(10, 40 * 60_000)]),
        { meta: { id: "codex", name: "Codex" }, data: null, loading: false, error: "no auth" },
      ]),
    ).toBe(true)
  })
})

describe("collectMeltingLeftoverLines", () => {
  it("collects 5-hour leftover in the remaining band", () => {
    const session = fiveHour(42, 40 * 60_000)
    const collected = collectMeltingLeftoverLines(
      [plugin("claude", "Claude", [session, weekly(10, 3 * 24 * HOUR)])],
      NOW,
      HOUR,
    )
    expect(collected).toHaveLength(1)
    expect(collected[0]).toMatchObject({
      pluginId: "claude",
      pluginName: "Claude",
      label: "Session",
      leftoverPct: 58,
    })
    expect(collected[0]?.resetsAt).toBe(
      (session as Extract<MetricLine, { type: "progress" }>).resetsAt,
    )
  })

  it("omits weekly lines and leftover outside the band", () => {
    const collected = collectMeltingLeftoverLines(
      [
        plugin("claude", "Claude", [
          fiveHour(0, 4 * HOUR),
          weekly(0, 3 * 24 * HOUR),
        ]),
      ],
      NOW,
      HOUR,
    )
    expect(collected).toEqual([])
  })
})

describe("formatMeltingLeftoverNotification", () => {
  it("names leftover that will disappear", () => {
    expect(formatMeltingLeftoverNotification(line("claude", 58, "1h 4m"))).toEqual({
      title: "Leftover melting",
      body: "Claude Session · 58% left · gone in 1h 4m",
    })
  })

  it("uses gone soon when remaining face is soon", () => {
    expect(formatMeltingLeftoverNotification(line("claude", 12, "soon")).body).toBe(
      "Claude Session · 12% left · gone soon",
    )
  })

  it("says gone at reset when the remaining face is missing", () => {
    expect(formatMeltingLeftoverNotification(line("claude", 58, null)).body).toBe(
      "Claude Session · 58% left · gone at reset",
    )
  })
})

describe("nextMeltingLeftoverNotifications", () => {
  it("seeds the first snapshot without notifying", () => {
    const current = [line("claude", 58, "40m")]
    const { nextKeys, notifications } = nextMeltingLeftoverNotifications(new Set(), current, {
      notifyEnabled: true,
      seeded: false,
    })
    expect(notifications).toEqual([])
    expect(nextKeys.has(meltingLeftoverKey(current[0]!))).toBe(true)
  })

  it("notifies once when a line enters the band", () => {
    const current = [line("claude", 58, "40m")]
    const first = nextMeltingLeftoverNotifications(new Set(), [], {
      notifyEnabled: true,
      seeded: true,
    })
    const second = nextMeltingLeftoverNotifications(first.nextKeys, current, {
      notifyEnabled: true,
      seeded: true,
    })
    expect(second.notifications).toEqual(current)
    const third = nextMeltingLeftoverNotifications(second.nextKeys, current, {
      notifyEnabled: true,
      seeded: true,
    })
    expect(third.notifications).toEqual([])
  })

  it("does not notify when Notify is off, but still records the key", () => {
    const current = [line("claude", 58, "40m")]
    const { nextKeys, notifications } = nextMeltingLeftoverNotifications(new Set(), current, {
      notifyEnabled: false,
      seeded: true,
    })
    expect(notifications).toEqual([])
    const afterOn = nextMeltingLeftoverNotifications(nextKeys, current, {
      notifyEnabled: true,
      seeded: true,
    })
    expect(afterOn.notifications).toEqual([])
  })

  it("notifies again only when resetsAt changes", () => {
    const firstLine = line("claude", 58, "40m", "reset-a")
    const rolled = line("claude", 90, "4h", "reset-b")
    const afterFirst = nextMeltingLeftoverNotifications(new Set(), [firstLine], {
      notifyEnabled: true,
      seeded: true,
    })
    const afterRoll = nextMeltingLeftoverNotifications(afterFirst.nextKeys, [rolled], {
      notifyEnabled: true,
      seeded: true,
    })
    expect(afterRoll.notifications).toEqual([rolled])
  })
})
