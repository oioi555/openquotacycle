import type { PluginMeta } from "@/lib/plugin-types"
import {
  DEFAULT_DISPLAY_MODE,
  getEnabledPluginIds,
  type DisplayMode,
  type PluginSettings,
} from "@/lib/settings"
import { clamp01 } from "@/lib/utils"

type PluginState = {
  data: {
    lines: Array<
      | { type: "progress"; label: string; used: number; limit: number }
      | { type: "text"; label: string; value: string }
    >
  } | null
}

/**
 * Formats a fraction (0.0 - 1.0) into a percentage string (0% - 100%).
 */
export function formatTrayPercentText(fraction: number | undefined): string {
  if (typeof fraction !== "number" || !Number.isFinite(fraction)) return "--%"
  const clampedFraction = Math.max(0, Math.min(1, fraction))
  return `${Math.round(clampedFraction * 100)}%`
}

export type TrayTooltipEntry = {
  name: string
  percentText: string
}

/**
 * Builds one tooltip entry per enabled plugin in settings order, using the
 * first available progress line in runtime data ("--%" when unknown).
 */
export function buildTrayTooltipEntries(args: {
  pluginsMeta: PluginMeta[]
  pluginSettings: PluginSettings | null
  pluginStates: Record<string, PluginState | undefined>
  displayMode?: DisplayMode
}): TrayTooltipEntry[] {
  const { pluginsMeta, pluginSettings, pluginStates, displayMode = DEFAULT_DISPLAY_MODE } = args
  if (!pluginSettings) return []

  const metaById = new Map(pluginsMeta.map((plugin) => [plugin.id, plugin]))
  const entries: TrayTooltipEntry[] = []
  for (const id of getEnabledPluginIds(pluginSettings)) {
    const meta = metaById.get(id)
    if (!meta) continue
    const data = pluginStates[id]?.data ?? null
    const primaryLine = data?.lines.find(
      (line): line is Extract<(typeof data.lines)[number], { type: "progress" }> =>
        line.type === "progress" && line.limit > 0,
    )
    const fraction =
      primaryLine === undefined
        ? undefined
        : clamp01(
            (displayMode === "used"
              ? primaryLine.used
              : primaryLine.limit - primaryLine.used) / primaryLine.limit,
          )
    entries.push({ name: meta.name, percentText: formatTrayPercentText(fraction) })
  }
  return entries
}

/**
 * Creates a multi-line tooltip string for the tray icon.
 * Lists the app name followed by enabled plugins and their usage percentages.
 */
export function formatTrayTooltip(entries: TrayTooltipEntry[]): string {
  const lines = ["Quotracker"]
  for (const entry of entries) {
    lines.push(`${entry.name}: ${entry.percentText}`)
  }
  return lines.join("\n")
}
