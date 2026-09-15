import {
  crossingHeadroom,
  isCrossingGo,
  type CrossingGoLine,
} from "@/lib/crossing-go"
import type { MetricLine } from "@/lib/plugin-types"
import { formatResetRelativeFace } from "@/lib/reset-tooltip"

export type MeltingLeftoverPlugin = {
  meta: { id: string; name: string }
  data: { lines: MetricLine[] } | null
  loading?: boolean
  error?: string | null
}

export type MeltingLeftoverLine = {
  pluginId: string
  pluginName: string
  label: string
  resetsAt: string
  leftoverPct: number
  remainingFace: string | null
}

export type MeltingLeftoverNotification = {
  title: string
  body: string
}

/** Snapshot is ready to seed or edge-detect once every enabled plugin has data, an error, or finished loading. */
export function meltingLeftoverSnapshotReady(
  plugins: readonly MeltingLeftoverPlugin[],
): boolean {
  if (plugins.length === 0) return false
  return plugins.every(
    (plugin) => plugin.data != null || plugin.error != null || plugin.loading === false,
  )
}

export function meltingLeftoverKey(line: {
  pluginId: string
  label: string
  resetsAt: string
}): string {
  return `${line.pluginId}\0${line.label}\0${line.resetsAt}`
}

export function collectMeltingLeftoverLines(
  plugins: readonly MeltingLeftoverPlugin[],
  nowMs: number,
  remainingBandMs: number,
): MeltingLeftoverLine[] {
  const out: MeltingLeftoverLine[] = []
  for (const plugin of plugins) {
    const lines = plugin.data?.lines ?? []
    for (const line of lines) {
      if (line.type !== "progress") continue
      const goLine: CrossingGoLine = line
      if (!isCrossingGo(goLine, lines, nowMs, remainingBandMs)) continue
      if (typeof line.resetsAt !== "string" || line.resetsAt.trim().length === 0) continue
      const headroom = crossingHeadroom(goLine, nowMs)
      const leftoverPct =
        headroom?.leftoverPct ??
        (line.limit > 0
          ? Math.min(100, Math.max(0, 100 - (line.used / line.limit) * 100))
          : 0)
      out.push({
        pluginId: plugin.meta.id,
        pluginName: plugin.meta.name,
        label: line.label,
        resetsAt: line.resetsAt,
        leftoverPct,
        remainingFace: formatResetRelativeFace(nowMs, line.resetsAt),
      })
    }
  }
  return out
}

export function formatMeltingLeftoverNotification(
  line: MeltingLeftoverLine,
): MeltingLeftoverNotification {
  const left = `${Math.round(line.leftoverPct)}% left`
  const gone = gonePhrase(line.remainingFace)
  return {
    title: "Leftover melting",
    body: `${line.pluginName} ${line.label} · ${left} · ${gone}`,
  }
}

export function nextMeltingLeftoverNotifications(
  previousKeys: ReadonlySet<string>,
  current: readonly MeltingLeftoverLine[],
  options: { notifyEnabled: boolean; seeded: boolean },
): { nextKeys: Set<string>; notifications: MeltingLeftoverLine[] } {
  const nextKeys = new Set(previousKeys)
  const entered: MeltingLeftoverLine[] = []
  for (const line of current) {
    const key = meltingLeftoverKey(line)
    if (!nextKeys.has(key)) {
      nextKeys.add(key)
      entered.push(line)
    }
  }
  if (!options.seeded || !options.notifyEnabled) {
    return { nextKeys, notifications: [] }
  }
  return { nextKeys, notifications: entered }
}

function gonePhrase(face: string | null): string {
  if (!face) return "gone at reset"
  if (face === "soon") return "gone soon"
  return `gone in ${face}`
}
