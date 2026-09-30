export type ProgressFormat =
  | { kind: "percent" }
  | { kind: "dollars" }
  | { kind: "count"; suffix: string }

export type MetricLine =
  | { type: "text"; label: string; value: string; color?: string; subtitle?: string }
  | {
      type: "progress"
      label: string
      used: number
      limit: number
      format: ProgressFormat
      resetsAt?: string
      periodDurationMs?: number
      color?: string
    }

export type StatusTone = "positive" | "warning" | "danger" | "neutral"

export type StatusChip = {
  text: string
  tone: StatusTone
}

export type ManifestLine = {
  type: "text" | "progress"
  label: string
  scope: "overview" | "detail"
  /** Shown by default; unmarked progress lines default to On Demand. */
  visibleByDefault?: boolean
}

export type PluginLink = {
  label: string
  url: string
}

export type PluginOutput = {
  providerId: string
  displayName: string
  plan?: string
  lines: MetricLine[]
  statuses?: StatusChip[]
  error?: string
  iconUrl: string
}

export type WindowStarterWindowDecl = {
  id: string
  line: string
  weeklyLine: string
  enabledByDefault?: boolean
}

export type WindowStarterCapability = {
  enabledByDefault: boolean
  defaultRunner: string
  allowedRunners: string[]
  windows: WindowStarterWindowDecl[]
}

export type PluginMeta = {
  id: string;
  name: string;
  iconUrl: string;
  brandColor?: string;
  lines: ManifestLine[];
  links?: PluginLink[];
  windowStarter?: WindowStarterCapability;
  /** Plugin this instance derives from (`claude` for `claude@<key>`); equals `id` otherwise. */
  basePluginId?: string;
  /** Claude account instances only: host-resolved config dir (display/copy only; never sent back). */
  claudeConfigDir?: string;
  /** Claude multi-account only: full account email for the card title tooltip. */
  accountEmail?: string;
}

/** Base plugin id: `claude` for Claude account instances, else the plugin id. */
export function pluginBaseId(meta: Pick<PluginMeta, "id" | "basePluginId">): string {
  return meta.basePluginId ?? meta.id
}

export type PluginDisplayState = {
  meta: PluginMeta
  data: PluginOutput | null
  loading: boolean
  error: string | null
  lastManualRefreshAt: number | null
}
