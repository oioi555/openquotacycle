// Single seam between the Svelte UI and Tauri (design D2). Only calls made
// outside `src/lib/**` go through here — lib modules keep their own direct
// Tauri imports untouched.
import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { getVersion } from "@tauri-apps/api/app";
import {
  disable as disableAutostart,
  enable as enableAutostart,
  isEnabled as isAutostartEnabled,
} from "@tauri-apps/plugin-autostart";
import { openUrl } from "@tauri-apps/plugin-opener";
import type { AntigravityWakeResult } from "@/lib/antigravity-wake";
import type { PluginMeta, PluginOutput } from "@/lib/plugin-types";
import type { GlobalShortcut } from "@/lib/settings";

export {
  isTauri,
  openUrl,
  enableAutostart,
  disableAutostart,
  isAutostartEnabled,
};
export type { UnlistenFn };

// Command and event names the Svelte UI consumes. `TAURI_COMMANDS` must stay a
// subset of the `generate_handler!` list in src-tauri/src/lib.rs — enforced by
// backend.contract.test.ts.
export const TAURI_COMMANDS = [
  "start_probe_batch",
  "list_plugins",
  "update_global_shortcut",
  "window_starter_discover",
  "window_starter_run",
  "credential_wake",
  "credential_wake_availability",
  "open_devtools",
  "set_tray_tooltip",
  "show_desktop_notification",
] as const;

export const TAURI_EVENTS = [
  "probe:result",
  "probe:batch-complete",
  "tray:navigate",
  "tray:show-about",
] as const;

export type ProbeBatchStarted = {
  batchId: string;
  pluginIds: string[];
};

export type ProbeResult = {
  batchId: string;
  output: PluginOutput;
};

export type ProbeBatchComplete = {
  batchId: string;
};

export type WindowStarterCliInfo = {
  id: string;
  executable: string;
  available: boolean;
};

export type WindowStarterCliRunResult = {
  providerId: string;
  runnerId: string;
  windowLine: string;
  executable: string;
  status: "success" | "failed" | "timeout" | "unsupported";
  exitCode: number | null;
  durationMs: number;
  output: string;
  outputTruncated: boolean;
};

export function createBatchId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `batch-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function startProbeBatch(
  batchId: string,
  pluginIds?: string[],
): Promise<ProbeBatchStarted> {
  const args = pluginIds ? { batchId, pluginIds } : { batchId };
  return invoke<ProbeBatchStarted>("start_probe_batch", args);
}

export async function listPlugins(): Promise<PluginMeta[]> {
  return invoke<PluginMeta[]>("list_plugins");
}

export async function updateGlobalShortcut(shortcut: GlobalShortcut): Promise<void> {
  await invoke("update_global_shortcut", { shortcut });
}

export async function openDevtools(): Promise<void> {
  await invoke("open_devtools");
}

export async function discoverWindowStarterClis(): Promise<WindowStarterCliInfo[]> {
  return invoke<WindowStarterCliInfo[]>("window_starter_discover");
}

export async function runWindowStarterCli(args: {
  pluginId: string;
  runnerId: string;
  windowLine: string;
  prompt: string;
  timeoutSecs: number;
}): Promise<WindowStarterCliRunResult> {
  return invoke<WindowStarterCliRunResult>("window_starter_run", args);
}

export type CredentialWakeAvailability = {
  antigravity: boolean;
  grok: boolean;
};

export async function wakeCredential(providerId: string): Promise<AntigravityWakeResult> {
  return invoke<AntigravityWakeResult>("credential_wake", { providerId });
}

export async function wakeAntigravityAgy(): Promise<AntigravityWakeResult> {
  return wakeCredential("antigravity");
}

export async function credentialWakeAvailability(): Promise<CredentialWakeAvailability> {
  return invoke<CredentialWakeAvailability>("credential_wake_availability");
}

export async function getAppVersion(): Promise<string> {
  return getVersion();
}

export async function setTrayTooltip(tooltip: string): Promise<void> {
  await invoke("set_tray_tooltip", { tooltip });
}

export async function showDesktopNotification(title: string, body: string): Promise<void> {
  await invoke("show_desktop_notification", { title, body });
}

export function listenProbeResult(
  handler: (payload: ProbeResult) => void,
): Promise<UnlistenFn> {
  return listen<ProbeResult>("probe:result", (event) => handler(event.payload));
}

export function listenProbeBatchComplete(
  handler: (payload: ProbeBatchComplete) => void,
): Promise<UnlistenFn> {
  return listen<ProbeBatchComplete>("probe:batch-complete", (event) =>
    handler(event.payload),
  );
}

export function listenTrayNavigate(
  handler: (view: string) => void,
): Promise<UnlistenFn> {
  return listen<string>("tray:navigate", (event) => handler(event.payload));
}

export function listenTrayShowAbout(handler: () => void): Promise<UnlistenFn> {
  return listen("tray:show-about", () => handler());
}
