import {
  effectiveWindowStarterEnabled,
  effectiveWindowStarterRunner,
  type PluginSettings,
} from "@/lib/settings"
import type { PluginMeta, PluginOutput, WindowStarterCapability } from "@/lib/plugin-types"
import {
  getWindowLockRemainingMs,
  type WindowStarterAttempt,
  type WindowStarterRunnerId,
} from "@/lib/window-starter"

/** Probe slice this module reads. Extra UI fields are ignored. */
type PluginDataState = {
  data: PluginOutput | null
  loading?: boolean
  error?: string | null
}

export const FIVE_HOUR_MS = 5 * 60 * 60 * 1000

export const WINDOW_STARTER_RUNNER_LABELS: Record<string, string> = {
  claude: "Claude Code",
  codex: "Codex",
  zcode: "zcode",
  agy: "agy",
  opencode: "OpenCode",
  hermes: "Hermes",
  pi: "Pi",
}

export type WindowStarterCliStatus = {
  id: string
  executable: string
  available: boolean
}

export type WindowStarterProviderStatus =
  | "disabled"
  | "off"
  | "loading"
  | "unknown"
  | "active"
  | "ready"
  | "locked"
  | "weekly-exhausted"
  | "cli-missing"
  | "running"

export type WindowStarterProviderView = {
  pluginId: string
  windowId: string
  windowLine: string
  runnerId: string
  name: string
  executable: string
  cliAvailable: boolean | null
  participationEnabled: boolean
  status: WindowStarterProviderStatus
  resetsAt?: string
  lockUntil?: string
  iconUrl?: string
  brandColor?: string
}

export function windowStarterRowKey(pluginId: string, windowLine: string): string {
  return `${pluginId}:${windowLine}`
}

export const WINDOW_STARTER_CARD_LOG_LIMIT = 5

export type WindowStarterCardView = {
  pluginId: string
  name: string
  iconUrl?: string
  brandColor?: string
  windows: WindowStarterProviderView[]
}

export function groupWindowStarterCards(
  providers: WindowStarterProviderView[],
): WindowStarterCardView[] {
  const cards: WindowStarterCardView[] = []
  const indexByPlugin = new Map<string, number>()
  for (const provider of providers) {
    const existing = indexByPlugin.get(provider.pluginId)
    if (existing === undefined) {
      indexByPlugin.set(provider.pluginId, cards.length)
      cards.push({
        pluginId: provider.pluginId,
        name: provider.name,
        iconUrl: provider.iconUrl,
        brandColor: provider.brandColor,
        windows: [provider],
      })
      continue
    }
    cards[existing]?.windows.push(provider)
  }
  return cards
}

export function attemptsForStarterCard(
  attempts: WindowStarterAttempt[],
  pluginId: string,
  limit = WINDOW_STARTER_CARD_LOG_LIMIT,
): WindowStarterAttempt[] {
  return attempts.filter((attempt) => attempt.providerId === pluginId).slice(0, limit)
}

/** Newest attempt for one window row. Attempts may be unordered. */
export function latestAttemptForStarterWindow(
  attempts: WindowStarterAttempt[],
  pluginId: string,
  windowLine: string,
): WindowStarterAttempt | undefined {
  let latest: WindowStarterAttempt | undefined
  let latestMs = Number.NEGATIVE_INFINITY
  for (const attempt of attempts) {
    if (attempt.providerId !== pluginId) continue
    if (attempt.windowLine !== windowLine) continue
    const startedMs = Date.parse(attempt.startedAt)
    if (!Number.isFinite(startedMs) || startedMs < latestMs) continue
    latest = attempt
    latestMs = startedMs
  }
  return latest
}

export function starterLogTitle(
  attempt: Pick<WindowStarterAttempt, "windowLine" | "runnerId">,
  showWindow: boolean,
): string {
  const window = showWindow ? (attempt.windowLine ?? "").trim() : ""
  const runner = (
    attempt.runnerId ? (WINDOW_STARTER_RUNNER_LABELS[attempt.runnerId] ?? attempt.runnerId) : ""
  ).trim()
  if (window && runner) return `${window} · ${runner}`
  return window || runner
}

type ClassifyWindowStarterProvidersArgs = {
  pluginSettings: PluginSettings | null
  pluginMetas?: PluginMeta[]
  pluginStates: Record<string, PluginDataState>
  cliStatuses: Partial<Record<string, WindowStarterCliStatus>>
  attempts: WindowStarterAttempt[]
  runningKey: string | null
  nowMs: number
}

export function getFiveHourReset(
  state: PluginDataState | undefined,
  windowLine: string,
): { used: number; limit: number; resetsAt?: string } | null {
  const line = state?.data?.lines.find(
    (item) =>
      item.type === "progress" &&
      item.label === windowLine &&
      item.periodDurationMs === FIVE_HOUR_MS,
  )
  if (!line || line.type !== "progress") return null
  if (!Number.isFinite(line.used) || !Number.isFinite(line.limit) || line.limit <= 0) return null
  return { used: line.used, limit: line.limit, resetsAt: line.resetsAt }
}

function isWeeklyExhausted(
  state: PluginDataState | undefined,
  weeklyLine: string,
): boolean {
  const weekly = state?.data?.lines.find(
    (line) => line.type === "progress" && line.label === weeklyLine,
  )
  return Boolean(
    weekly &&
    weekly.type === "progress" &&
    Number.isFinite(weekly.used) &&
    Number.isFinite(weekly.limit) &&
    weekly.limit > 0 &&
    weekly.used >= weekly.limit,
  )
}

export function orderWindowStarterMetas(
  pluginMetas: PluginMeta[],
  order: string[] | undefined,
): PluginMeta[] {
  const withCapability = pluginMetas.filter((meta) => meta.windowStarter)
  if (!order || order.length === 0) return withCapability
  const byId = new Map(withCapability.map((meta) => [meta.id, meta]))
  const seen = new Set<string>()
  const ordered: PluginMeta[] = []
  for (const id of order) {
    const meta = byId.get(id)
    if (!meta) continue
    seen.add(id)
    ordered.push(meta)
  }
  for (const meta of withCapability) {
    if (seen.has(meta.id)) continue
    ordered.push(meta)
  }
  return ordered
}

export function classifyWindowStarterProviders({
  pluginSettings,
  pluginMetas = [],
  pluginStates,
  cliStatuses,
  attempts,
  runningKey,
  nowMs,
}: ClassifyWindowStarterProvidersArgs): WindowStarterProviderView[] {
  const disabled = new Set(pluginSettings?.disabled ?? [])
  const views: WindowStarterProviderView[] = []

  for (const meta of orderWindowStarterMetas(pluginMetas, pluginSettings?.order)) {
    const capability = meta.windowStarter
    if (!capability) continue
    const firstWindowLine = capability.windows[0]?.line ?? ""
    const override = pluginSettings?.windowStarterByPlugin?.[meta.id]
    const runnerId = effectiveWindowStarterRunner(capability, override)
    const cli = cliStatuses[runnerId]
    const executable = cli?.executable ?? runnerId
    const state = pluginStates[meta.id]

    for (const window of capability.windows) {
      const participationEnabled = effectiveWindowStarterEnabled(
        capability,
        window.id,
        override,
      )
      const base: WindowStarterProviderView = {
        pluginId: meta.id,
        windowId: window.id,
        windowLine: window.line,
        runnerId,
        name: meta.name,
        executable,
        cliAvailable: cli?.available ?? null,
        participationEnabled,
        status: "unknown",
        iconUrl: meta.iconUrl,
        brandColor: meta.brandColor,
      }

      if (!pluginSettings || disabled.has(meta.id)) {
        views.push({ ...base, status: "disabled" })
        continue
      }
      if (runningKey === windowStarterRowKey(meta.id, window.line)) {
        views.push({ ...base, status: "running" })
        continue
      }
      if (!effectiveWindowStarterEnabled(capability, window.id, override)) {
        views.push({ ...base, status: "off" })
        continue
      }
      if (state?.loading) {
        views.push({ ...base, status: "loading" })
        continue
      }
      if (!state?.data || state.error) {
        views.push({ ...base, status: "unknown" })
        continue
      }

      const fiveHour = getFiveHourReset(state, window.line)
      if (!fiveHour) {
        views.push({ ...base, status: "unknown" })
        continue
      }
      if (isWeeklyExhausted(state, window.weeklyLine)) {
        views.push({ ...base, status: "weekly-exhausted" })
        continue
      }

      const resetMs = fiveHour.resetsAt ? Date.parse(fiveHour.resetsAt) : Number.NaN
      if (Number.isFinite(resetMs) && resetMs > nowMs) {
        views.push({ ...base, status: "active", resetsAt: fiveHour.resetsAt })
        continue
      }

      const idle =
        (Number.isFinite(resetMs) && resetMs <= nowMs) ||
        (!fiveHour.resetsAt && fiveHour.used === 0)
      if (!idle) {
        views.push({ ...base, status: "unknown" })
        continue
      }

      const lockRemaining = getWindowLockRemainingMs(
        attempts,
        meta.id,
        window.line,
        nowMs,
        firstWindowLine,
      )
      if (lockRemaining !== null) {
        views.push({
          ...base,
          status: "locked",
          lockUntil: new Date(nowMs + lockRemaining).toISOString(),
        })
        continue
      }
      if (cli?.available === false) {
        views.push({ ...base, status: "cli-missing" })
        continue
      }
      if (!cli) {
        views.push({ ...base, status: "unknown" })
        continue
      }
      views.push({ ...base, status: "ready" })
    }
  }

  return views
}

export function formatWindowStarterClock(value: string): string {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return value
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  return `${date.getMonth() + 1}/${date.getDate()} ${hours}:${minutes}`
}

export const WINDOW_STARTER_PROMPT_PLACEHOLDER = "<prompt>"

export function createWindowStarterPrompt(): string {
  return 'OpenQuotaCycle Window Starter request. Respond with only "OK".'
}

/** POSIX single-quote so the string can be pasted into a terminal. */
export function quoteWindowStarterPrompt(prompt: string): string {
  return `'${prompt.replace(/'/g, "'\\''")}'`
}

export function getWindowStarterCommand(
  pluginId: string,
  runnerId: string,
  windowId: string,
  prompt: string = WINDOW_STARTER_PROMPT_PLACEHOLDER,
): string {
  const token =
    prompt === WINDOW_STARTER_PROMPT_PLACEHOLDER
      ? WINDOW_STARTER_PROMPT_PLACEHOLDER
      : quoteWindowStarterPrompt(prompt)
  if (pluginId === "claude" && runnerId === "claude") {
    return `claude -p ${token} --model claude-haiku-4-5 --tools "" --max-turns 1 --no-session-persistence`
  }
  if (pluginId === "codex" && runnerId === "codex") {
    return `codex exec --ephemeral --skip-git-repo-check --sandbox read-only -m gpt-5.6-luna -c model_reasoning_effort="none" ${token}`
  }
  if (pluginId === "codex" && runnerId === "opencode") {
    return `opencode run ${token} -m openai/gpt-5.6-luna`
  }
  if (pluginId === "codex" && runnerId === "hermes") {
    return `hermes -z ${token} --provider openai-codex -m gpt-5.6-luna`
  }
  if (pluginId === "codex" && runnerId === "pi") {
    return `pi -p ${token} --model openai-codex/gpt-5.6-luna --no-session --no-tools --no-context-files --no-approve`
  }
  if (pluginId === "zai" && runnerId === "zcode") {
    return `zcode --prompt ${token}`
  }
  if (pluginId === "zai" && runnerId === "opencode") {
    return `opencode run ${token} -m zai-coding-plan/glm-5.3-flash`
  }
  if (pluginId === "zai" && runnerId === "hermes") {
    return `hermes -z ${token} --provider zai -m glm-5.3-flash`
  }
  if (pluginId === "zai" && runnerId === "pi") {
    return `pi -p ${token} --model zai/glm-5.3-flash --no-session --no-tools --no-context-files --no-approve`
  }
  if (pluginId === "antigravity" && runnerId === "agy" && windowId === "session") {
    return `agy -p ${token} --model gemini-3.8-flash-low`
  }
  if (pluginId === "antigravity" && runnerId === "agy" && windowId === "claude") {
    return `agy -p ${token} --model claude-sonnet-4-6`
  }
  return `${runnerId} ${token}`
}

export function firstDeclaredWindowLine(capability: WindowStarterCapability): string {
  return capability.windows[0]?.line ?? ""
}

export type { WindowStarterRunnerId }
