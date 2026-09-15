import type { PluginOutput } from "./plugin-types"

export const ANTIGRAVITY_PLUGIN_ID = "antigravity"
export const GROK_PLUGIN_ID = "grok"
export const ANTIGRAVITY_WAKE_COOLDOWN_MS = 15 * 60 * 1000
/** Consecutive wake→still-stale re-probes before the wake path cools down. */
export const ANTIGRAVITY_WAKE_STALE_REPROBE_LIMIT = 2
export const ANTIGRAVITY_CREDENTIAL_ERROR = "Start Antigravity or agy"
export const ANTIGRAVITY_START_AGY_NOTICE =
  "Antigravity session expired. Start Antigravity or agy and try again."
export const GROK_CREDENTIAL_ERROR = "Grok session expired"
export const GROK_START_NOTICE =
  "Grok session expired. Start Grok Build and try again."

export type CredentialWakeTrigger = "stale-or-credential" | "credential-only"

export type CredentialWakeProviderConfig = {
  pluginId: string
  credentialError: string
  trigger: CredentialWakeTrigger
  ariaLabel: string
  tooltip: string
  fallbackNotice: string
}

export const credentialWakeProviders: Record<string, CredentialWakeProviderConfig> = {
  [ANTIGRAVITY_PLUGIN_ID]: {
    pluginId: ANTIGRAVITY_PLUGIN_ID,
    credentialError: ANTIGRAVITY_CREDENTIAL_ERROR,
    trigger: "stale-or-credential",
    ariaLabel: "Start agy",
    tooltip: "Start agy to refresh the session",
    fallbackNotice: ANTIGRAVITY_START_AGY_NOTICE,
  },
  [GROK_PLUGIN_ID]: {
    pluginId: GROK_PLUGIN_ID,
    credentialError: GROK_CREDENTIAL_ERROR,
    trigger: "credential-only",
    ariaLabel: "Start grok",
    tooltip: "Start grok to refresh the session",
    fallbackNotice: GROK_START_NOTICE,
  },
}

export type AntigravityWakeStatus =
  | "spawned"
  | "alreadyRunning"
  | "missing"
  | "failed"
  | "timeout"

export type AntigravityWakeResult = {
  status: AntigravityWakeStatus
  durationMs: number
  exitCode: number | null
}

export function isCredentialError(
  pluginId: string,
  message: string | null | undefined,
): boolean {
  const marker = credentialWakeProviders[pluginId]?.credentialError
  if (!marker) return false
  return (message ?? "").includes(marker)
}

export function isAntigravityCredentialError(message: string | null | undefined): boolean {
  return isCredentialError(ANTIGRAVITY_PLUGIN_ID, message)
}

export function isAntigravityStale(output: PluginOutput | null | undefined): boolean {
  return output?.statuses?.some((chip) => chip.text === "Stale") === true
}

export function needsCredentialWake(
  pluginId: string,
  state: {
    error?: string | null
    staleError?: string | null
    data?: PluginOutput | null
  } | null | undefined,
): boolean {
  const config = credentialWakeProviders[pluginId]
  if (!config || !state) return false
  if (isCredentialError(pluginId, state.error) || isCredentialError(pluginId, state.staleError)) {
    return true
  }
  return config.trigger === "stale-or-credential" && isAntigravityStale(state.data)
}

export function needsAntigravityWake(state: {
  error?: string | null
  staleError?: string | null
  data?: PluginOutput | null
} | null | undefined): boolean {
  return needsCredentialWake(ANTIGRAVITY_PLUGIN_ID, state)
}

export function shouldShowWakeAction(opts: {
  pluginId: string
  available: boolean
  error?: string | null
  staleError?: string | null
  data?: PluginOutput | null
}): boolean {
  if (!credentialWakeProviders[opts.pluginId]) return false
  if (!opts.available) return false
  return needsCredentialWake(opts.pluginId, {
    error: opts.error,
    staleError: opts.staleError,
    data: opts.data,
  })
}

export function shouldShowAntigravityStartAgy(opts: {
  pluginId: string
  autoWake: boolean
  agyAvailable: boolean
  error?: string | null
  staleError?: string | null
  data?: PluginOutput | null
}): boolean {
  void opts.autoWake
  return shouldShowWakeAction({
    pluginId: opts.pluginId,
    available: opts.agyAvailable,
    error: opts.error,
    staleError: opts.staleError,
    data: opts.data,
  })
}

export function wakeSucceeded(status: AntigravityWakeStatus): boolean {
  return status === "spawned" || status === "alreadyRunning"
}
