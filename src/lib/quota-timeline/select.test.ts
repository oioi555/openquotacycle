import { describe, expect, it } from "vitest"
import type { PluginDisplayState, PluginOutput } from "@/lib/plugin-types"
import {
  FIVE_HOUR_PERIOD_MS,
  WEEKLY_PERIOD_MS,
} from "./axis"
import { selectQuotaLines, selectQuotaTimelineRows, timelineSectionTitle } from "./select"

function makeOutput(lines: PluginOutput["lines"]): PluginOutput {
  return {
    providerId: "test",
    displayName: "Test",
    lines,
    iconUrl: "",
  }
}

function progress(
  label: string,
  resetsAt: string,
  periodDurationMs?: number,
) {
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

function makePlugin(id: string, data: PluginOutput | null): PluginDisplayState {
  return {
    meta: {
      id,
      name: id,
      iconUrl: "",
      lines: [],
    },
    data,
    loading: false,
    error: null,
    lastManualRefreshAt: null,
  }
}

const RESET = "2099-01-01T00:00:00.000Z"

describe("selectQuotaLines", () => {
  it("returns no rows for missing output", () => {
    expect(selectQuotaLines(null, "five-hour")).toEqual([])
  })

  it("selects every exact five-hour definition regardless of label", () => {
    const output = makeOutput([
      progress("Weekly", RESET, FIVE_HOUR_PERIOD_MS),
      progress("second session", RESET, FIVE_HOUR_PERIOD_MS),
      progress("weekly", RESET, WEEKLY_PERIOD_MS),
    ])

    expect(selectQuotaLines(output, "five-hour").map((line) => line.label)).toEqual([
      "Weekly",
      "second session",
    ])
  })

  it("selects every exact weekly definition", () => {
    const output = makeOutput([
      progress("Session", RESET, FIVE_HOUR_PERIOD_MS),
      progress("Weekly", RESET, WEEKLY_PERIOD_MS),
      progress("Sonnet", RESET, WEEKLY_PERIOD_MS),
    ])

    expect(selectQuotaLines(output, "weekly").map((line) => line.label)).toEqual([
      "Weekly",
      "Sonnet",
    ])
  })

  it("filters unsupported periods, missing periods, and invalid reset timestamps", () => {
    const output = makeOutput([
      progress("daily", RESET, 24 * 60 * 60 * 1000),
      progress("missing period", RESET),
      progress("invalid reset", "not-a-date", FIVE_HOUR_PERIOD_MS),
      progress("empty reset", "", FIVE_HOUR_PERIOD_MS),
    ])

    expect(selectQuotaLines(output, "five-hour")).toEqual([])
    expect(selectQuotaLines(output, "weekly")).toEqual([])
  })
})

describe("selectQuotaTimelineRows", () => {
  it("preserves plugin order and source-line order", () => {
    const plugins = [
      makePlugin(
        "first",
        makeOutput([
          progress("first weekly", RESET, WEEKLY_PERIOD_MS),
          progress("first five-hour", RESET, FIVE_HOUR_PERIOD_MS),
        ]),
      ),
      makePlugin(
        "second",
        makeOutput([progress("second weekly", RESET, WEEKLY_PERIOD_MS)]),
      ),
    ]

    const rows = selectQuotaTimelineRows(plugins, "weekly")
    expect(rows.map((row) => `${row.plugin.meta.id}:${row.line.label}`)).toEqual([
      "first:first weekly",
      "second:second weekly",
    ])
    expect(rows.every((row) => row.kind === "weekly")).toBe(true)
  })

  it("does not create rows for providers without data", () => {
    expect(selectQuotaTimelineRows([makePlugin("empty", null)], "weekly")).toEqual([])
  })

  it("renders Codex Plus Session and Weekly in their matching timeline sections", () => {
    const codexOutput = makeOutput([
      progress("Session", RESET, FIVE_HOUR_PERIOD_MS),
      progress("Weekly", RESET, WEEKLY_PERIOD_MS),
    ])

    const plugins = [makePlugin("codex", codexOutput)]

    const fiveHourRows = selectQuotaTimelineRows(plugins, "five-hour")
    expect(fiveHourRows.map((row) => `${row.plugin.meta.id}:${row.line.label}`)).toEqual([
      "codex:Session",
    ])
    expect(fiveHourRows.every((row) => row.kind === "five-hour")).toBe(true)

    const weeklyRows = selectQuotaTimelineRows(plugins, "weekly")
    expect(weeklyRows.map((row) => `${row.plugin.meta.id}:${row.line.label}`)).toEqual([
      "codex:Weekly",
    ])
    expect(weeklyRows.every((row) => row.kind === "weekly")).toBe(true)
  })

  it("shows Codex weekly-only in weekly section when Session is absent", () => {
    const weeklyOnly = makeOutput([progress("Weekly", RESET, WEEKLY_PERIOD_MS)])
    const plugins = [makePlugin("codex", weeklyOnly)]

    expect(selectQuotaTimelineRows(plugins, "five-hour")).toEqual([])
    expect(selectQuotaTimelineRows(plugins, "weekly").map((row) => row.line.label)).toEqual([
      "Weekly",
    ])
  })

  it("titles timeline sections 5-hour / Weekly", () => {
    expect(timelineSectionTitle("five-hour")).toBe("5-hour resets")
    expect(timelineSectionTitle("weekly")).toBe("Weekly resets")
  })
})
