import { LazyStore } from "@tauri-apps/plugin-store"

// Spec: persist actual CLI attempts in a separate Window Starter store,
// newest-first, bounded to WINDOW_STARTER_MAX_ATTEMPTS. The most recent
// attempt timestamp per (pluginId, windowLine) acts as a five-hour lock.

export const WINDOW_STARTER_MAX_ATTEMPTS = 500;
export const WINDOW_STARTER_LOCK_MS = 5 * 60 * 60 * 1000;

export const WINDOW_STARTER_RUNNER_IDS = [
  "claude",
  "codex",
  "zcode",
  "agy",
  "opencode",
  "hermes",
  "pi",
] as const;
export type WindowStarterRunnerId = (typeof WINDOW_STARTER_RUNNER_IDS)[number];

export type WindowStarterAttemptStatus =
  | "pending"
  | "confirmed"
  | "unconfirmed"
  | "failed"
  | "interrupted";

export type WindowStarterAttempt = {
  id: string;
  /** Plugin id (any plugin that declares windowStarter). */
  providerId: string;
  windowLine?: string;
  runnerId?: string;
  startedAt: string; // ISO timestamp of the CLI attempt
  status: WindowStarterAttemptStatus;
  prompt?: string;
  command?: string;
  completedAt?: string;
  resetsAt?: string;
  exitCode?: number;
  durationMs?: number;
  error?: string;
};

const WINDOW_STARTER_STORE_PATH = "window-starter.json";
const WINDOW_STARTER_ATTEMPTS_KEY = "attempts";

const store = new LazyStore(WINDOW_STARTER_STORE_PATH);

export function isWindowStarterRunnerId(value: unknown): value is WindowStarterRunnerId {
  return (
    typeof value === "string" &&
    (WINDOW_STARTER_RUNNER_IDS as readonly string[]).includes(value)
  );
}

function isWindowStarterAttemptStatus(value: unknown): value is WindowStarterAttemptStatus {
  return (
    typeof value === "string" &&
    ["pending", "confirmed", "unconfirmed", "failed", "interrupted"].includes(value)
  );
}

function isWindowStarterAttempt(value: unknown): value is WindowStarterAttempt {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string" || !record.id) return false;
  if (typeof record.providerId !== "string" || !record.providerId) return false;
  if (record.windowLine !== undefined && typeof record.windowLine !== "string") return false;
  if (record.runnerId !== undefined && typeof record.runnerId !== "string") return false;
  if (typeof record.startedAt !== "string" || !Number.isFinite(Date.parse(record.startedAt))) {
    return false;
  }
  if (!isWindowStarterAttemptStatus(record.status)) return false;
  if (record.prompt !== undefined && typeof record.prompt !== "string") return false;
  if (record.command !== undefined && typeof record.command !== "string") return false;
  if (record.completedAt !== undefined && (
    typeof record.completedAt !== "string" || !Number.isFinite(Date.parse(record.completedAt))
  )) return false;
  if (record.resetsAt !== undefined && (
    typeof record.resetsAt !== "string" || !Number.isFinite(Date.parse(record.resetsAt))
  )) return false;
  if (record.exitCode !== undefined && typeof record.exitCode !== "number") return false;
  if (record.durationMs !== undefined && typeof record.durationMs !== "number") return false;
  if (record.error !== undefined && typeof record.error !== "string") return false;
  return true;
}

/** Prepend an attempt and keep only the newest `maxAttempts` records. */
export function addWindowStarterAttempt(
  attempts: WindowStarterAttempt[],
  attempt: WindowStarterAttempt,
  maxAttempts: number = WINDOW_STARTER_MAX_ATTEMPTS
): WindowStarterAttempt[] {
  return [attempt, ...attempts].slice(0, maxAttempts);
}

function attemptWindowLine(
  attempt: WindowStarterAttempt,
  firstDeclaredWindowLine: string,
): string {
  return attempt.windowLine ?? firstDeclaredWindowLine;
}

/** Newest-first lookup for the most recent attempt of a plugin window. */
export function getLatestAttemptForWindow(
  attempts: WindowStarterAttempt[],
  pluginId: string,
  windowLine: string,
  firstDeclaredWindowLine: string = windowLine,
): WindowStarterAttempt | null {
  for (const attempt of attempts) {
    if (attempt.providerId !== pluginId) continue;
    if (attemptWindowLine(attempt, firstDeclaredWindowLine) === windowLine) return attempt;
  }
  return null;
}

/** @deprecated Use getLatestAttemptForWindow. Maps to the plugin's first declared window. */
export function getLatestAttemptForProvider(
  attempts: WindowStarterAttempt[],
  pluginId: string,
  firstDeclaredWindowLine: string = "",
): WindowStarterAttempt | null {
  return getLatestAttemptForWindow(
    attempts,
    pluginId,
    firstDeclaredWindowLine,
    firstDeclaredWindowLine,
  );
}

export function isWindowLocked(
  attempts: WindowStarterAttempt[],
  pluginId: string,
  windowLine: string,
  nowMs: number,
  firstDeclaredWindowLine: string = windowLine,
): boolean {
  return getWindowLockRemainingMs(
    attempts,
    pluginId,
    windowLine,
    nowMs,
    firstDeclaredWindowLine,
  ) !== null;
}

export function isProviderLocked(
  attempts: WindowStarterAttempt[],
  pluginId: string,
  nowMs: number,
  firstDeclaredWindowLine: string = "",
): boolean {
  return isWindowLocked(attempts, pluginId, firstDeclaredWindowLine, nowMs, firstDeclaredWindowLine);
}

export function getWindowLockRemainingMs(
  attempts: WindowStarterAttempt[],
  pluginId: string,
  windowLine: string,
  nowMs: number,
  firstDeclaredWindowLine: string = windowLine,
): number | null {
  const latest = getLatestAttemptForWindow(
    attempts,
    pluginId,
    windowLine,
    firstDeclaredWindowLine,
  );
  if (!latest) return null;
  const startedAtMs = Date.parse(latest.startedAt);
  if (!Number.isFinite(startedAtMs)) return null;
  const remaining = WINDOW_STARTER_LOCK_MS - (nowMs - startedAtMs);
  return remaining > 0 ? remaining : null;
}

export function getProviderLockRemainingMs(
  attempts: WindowStarterAttempt[],
  pluginId: string,
  nowMs: number,
  firstDeclaredWindowLine: string = "",
): number | null {
  return getWindowLockRemainingMs(
    attempts,
    pluginId,
    firstDeclaredWindowLine,
    nowMs,
    firstDeclaredWindowLine,
  );
}

function sanitizeAttempts(value: unknown): WindowStarterAttempt[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isWindowStarterAttempt).slice(0, WINDOW_STARTER_MAX_ATTEMPTS);
}

export async function loadWindowStarterAttempts(): Promise<WindowStarterAttempt[]> {
  const stored = await store.get<unknown>(WINDOW_STARTER_ATTEMPTS_KEY);
  return sanitizeAttempts(stored);
}

export async function saveWindowStarterAttempts(
  attempts: WindowStarterAttempt[]
): Promise<void> {
  await store.set(
    WINDOW_STARTER_ATTEMPTS_KEY,
    attempts.slice(0, WINDOW_STARTER_MAX_ATTEMPTS)
  );
  await store.save();
}
