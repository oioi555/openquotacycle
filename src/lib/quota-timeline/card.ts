import {
  FIVE_HOUR_AXIS_SPAN_MS,
  WEEKLY_AXIS_SPAN_MS,
  computeUpcomingResets,
} from "@/lib/quota-timeline/axis"
import {
  selectQuotaTimelineRows,
  type QuotaTimelineKind,
} from "@/lib/quota-timeline/select"
import type { PluginDisplayState } from "@/lib/plugin-types"
import {
  CROSSING_GO_REMAINING_MS,
  crossingHeadroom,
  formatCrossingHeadroom,
  isCrossingGo,
} from "@/lib/crossing-go"

export type TimelineCardItem = {
  pluginId: string
  name: string
  iconUrl: string
  brandColor?: string
  quotaLabel: string
  iso: string
  atMs: number
  crossingGo: boolean
  headroomText: string | null
}

/** Next in-axis reset per quota row, soonest first. Overflow and past-without-period rows are omitted. */
export function selectTimelineCardItems(
  plugins: PluginDisplayState[],
  kind: QuotaTimelineKind,
  nowMs: number,
  remainingBandMs: number = CROSSING_GO_REMAINING_MS,
): TimelineCardItem[] {
  const axisSpanMs = kind === "five-hour" ? FIVE_HOUR_AXIS_SPAN_MS : WEEKLY_AXIS_SPAN_MS
  const items: TimelineCardItem[] = []
  for (const row of selectQuotaTimelineRows(plugins, kind)) {
    const next = computeUpcomingResets(
      row.line.resetsAt,
      row.line.periodDurationMs,
      nowMs,
      axisSpanMs,
    )[0]
    if (!next) continue
    const siblingLines = row.plugin.data?.lines ?? []
    const crossingGo =
      kind === "five-hour" && isCrossingGo(row.line, siblingLines, nowMs, remainingBandMs)
    const headroom = kind === "five-hour" ? crossingHeadroom(row.line, nowMs) : null
    items.push({
      pluginId: row.plugin.meta.id,
      name: row.plugin.meta.name,
      iconUrl: row.plugin.meta.iconUrl,
      brandColor: row.plugin.meta.brandColor,
      quotaLabel: row.line.label,
      iso: next.iso,
      atMs: next.ms,
      crossingGo,
      headroomText: headroom ? formatCrossingHeadroom(headroom.headroomPct, crossingGo) : null,
    })
  }
  items.sort((a, b) => {
    if (kind === "five-hour" && a.crossingGo !== b.crossingGo) {
      return a.crossingGo ? -1 : 1
    }
    return a.atMs - b.atMs
  })
  return items
}
