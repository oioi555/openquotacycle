import type {
  MetricLine,
  PluginDisplayState,
  PluginOutput,
} from "@/lib/plugin-types"
import {
  FIVE_HOUR_PERIOD_MS,
  WEEKLY_PERIOD_MS,
} from "@/lib/quota-timeline/axis"

export type ProgressLine = Extract<MetricLine, { type: "progress" }>
export type QuotaTimelineKind = "five-hour" | "weekly"

export const TIMELINE_CADENCE_ORDER: QuotaTimelineKind[] = ["five-hour", "weekly"]

export const TIMELINE_CADENCE_LABEL: Record<QuotaTimelineKind, string> = {
  "five-hour": "5-hour",
  weekly: "Weekly",
}

export function timelineSectionTitle(kind: QuotaTimelineKind): string {
  return `${TIMELINE_CADENCE_LABEL[kind]} resets`
}

export type DefinedProgressLine = ProgressLine & {
  resetsAt: string
  periodDurationMs: number
}

export type QuotaTimelineRow = {
  plugin: PluginDisplayState
  line: DefinedProgressLine
  kind: QuotaTimelineKind
}

function isDefinedQuotaLine(
  line: MetricLine,
  kind: QuotaTimelineKind,
): line is DefinedProgressLine {
  const expectedPeriod =
    kind === "five-hour" ? FIVE_HOUR_PERIOD_MS : WEEKLY_PERIOD_MS
  return (
    line.type === "progress" &&
    typeof line.resetsAt === "string" &&
    line.resetsAt.trim().length > 0 &&
    Number.isFinite(Date.parse(line.resetsAt)) &&
    line.periodDurationMs === expectedPeriod
  )
}

/**
 * Returns every progress quota line whose explicit period definition matches
 * the requested timeline and whose reset timestamp is parseable.
 *
 * Labels are display metadata only. Cadence comes from `periodDurationMs` so
 * provider-specific labels cannot put a quota on the wrong axis.
 */
export function selectQuotaLines(
  output: PluginOutput | null,
  kind: QuotaTimelineKind,
): DefinedProgressLine[] {
  return output?.lines.filter((line) => isDefinedQuotaLine(line, kind)) ?? []
}

/**
 * Flattens the selected quota definitions while preserving plugin order and
 * each plugin's source-line order. A provider can therefore have multiple
 * rows in one timeline when it exposes multiple quotas of that cadence.
 */
export function selectQuotaTimelineRows(
  plugins: PluginDisplayState[],
  kind: QuotaTimelineKind,
): QuotaTimelineRow[] {
  const rows: QuotaTimelineRow[] = []
  for (const plugin of plugins) {
    for (const line of selectQuotaLines(plugin.data, kind)) {
      rows.push({ plugin, line, kind })
    }
  }
  return rows
}
