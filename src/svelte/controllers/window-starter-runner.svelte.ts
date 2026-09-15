import {
  classifyWindowStarterProviders,
  createWindowStarterPrompt,
  getFiveHourReset,
  getWindowStarterCommand,
  windowStarterRowKey,
  type WindowStarterCliStatus,
  type WindowStarterProviderView,
} from "@/lib/window-starter-state";
import type { WindowStarterAttempt } from "@/lib/window-starter";
import { discoverWindowStarterClis, isTauri, runWindowStarterCli } from "../lib/backend";
import type { PluginMeta } from "@/lib/plugin-types";
import type { PluginSettings } from "@/lib/settings";
import type { PluginState } from "./probe-controller.svelte";
import { probeController } from "./probe-controller.svelte";
import { windowStarterController } from "./window-starter-controller.svelte";

const CONFIRM_INTERVAL_MS = 15_000;
const CONFIRM_TIMEOUT_MS = 2 * 60_000;
const CLI_TIMEOUT_SECONDS = 60;

export type NativeCliInfo = {
  id: string;
  executable: string;
  available: boolean;
};

export type NativeRunResult = {
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

type Confirmation = {
  attemptId: string;
  pluginId: string;
  windowLine: string;
  key: string;
  intervalId: ReturnType<typeof setInterval>;
  timeoutId: ReturnType<typeof setTimeout>;
};

export type WindowStarterRunnerInputs = {
  enabled: boolean;
  pluginSettings: PluginSettings | null;
  pluginMetas: PluginMeta[];
  pluginStates: Record<string, PluginState>;
};

export function newAttemptId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `window-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

class WindowStarterRunner {
  historyReady = $state(false);
  providerViews = $state<WindowStarterProviderView[]>([]);
  agyAvailable = $state(false);

  private cliStatuses: Partial<Record<string, WindowStarterCliStatus>> = {};
  private runningKey: string | null = null;
  private confirmations = new Map<string, Confirmation>();
  private finishing = new Set<string>();
  private inputs: WindowStarterRunnerInputs = {
    enabled: false,
    pluginSettings: null,
    pluginMetas: [],
    pluginStates: {},
  };

  /** Snapshot the reactive inputs the provider views depend on. */
  syncInputs(inputs: WindowStarterRunnerInputs): void {
    this.inputs = inputs;
    this.recomputeViews();
  }

  async init(): Promise<void> {
    if (!isTauri()) return;

    await windowStarterController.loadAttempts();
    const pending = windowStarterController.attempts.filter(
      (attempt) => attempt.status === "pending",
    );
    for (const attempt of pending) {
      await windowStarterController.updateAttempt(attempt.id, {
        status: "interrupted",
        completedAt: new Date().toISOString(),
        error: "Quotracker closed before the attempt completed.",
      });
    }
    this.historyReady = true;

    try {
      const statuses = await discoverWindowStarterClis();
      const next: Partial<Record<string, WindowStarterCliStatus>> = {};
      for (const status of statuses) {
        next[status.id] = status;
      }
      this.cliStatuses = next;
      this.agyAvailable = next.agy?.available === true;
      this.recomputeViews();
    } catch (error) {
      console.error("Failed to discover Window Starter CLIs:", error);
    }
  }

  recomputeViews(): void {
    this.providerViews = classifyWindowStarterProviders({
      pluginSettings: this.inputs.pluginSettings,
      pluginMetas: this.inputs.pluginMetas,
      pluginStates: this.inputs.pluginStates,
      cliStatuses: this.cliStatuses,
      attempts: windowStarterController.attempts,
      runningKey: this.runningKey,
      nowMs: Date.now(),
    });
    // Auto-run and confirmation read providerViews/historyReady ($state). Run
    // them untracked so a calling $effect cannot read state this method just
    // wrote — that would re-trigger the effect forever (effect_update_depth_exceeded).
    queueMicrotask(() => {
      this.checkConfirmations();
      this.maybeAutoRun();
    });
  }

  private clearConfirmation(key?: string): void {
    if (key) {
      const confirmation = this.confirmations.get(key);
      if (!confirmation) return;
      clearInterval(confirmation.intervalId);
      clearTimeout(confirmation.timeoutId);
      this.confirmations.delete(key);
      return;
    }
    for (const confirmation of this.confirmations.values()) {
      clearInterval(confirmation.intervalId);
      clearTimeout(confirmation.timeoutId);
    }
    this.confirmations.clear();
  }

  private async finishAttempt(
    attemptId: string,
    key: string,
    patch: Partial<Omit<WindowStarterAttempt, "id" | "providerId" | "startedAt">>,
  ): Promise<void> {
    if (this.finishing.has(attemptId)) return;
    this.finishing.add(attemptId);
    this.clearConfirmation(key);
    try {
      await windowStarterController.updateAttempt(attemptId, {
        ...patch,
        completedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Failed to update Window Starter activity:", error);
    } finally {
      this.finishing.delete(attemptId);
      if (this.runningKey === key) this.runningKey = null;
      this.recomputeViews();
    }
  }

  private beginConfirmation(
    attemptId: string,
    pluginId: string,
    windowLine: string,
    key: string,
  ): void {
    this.clearConfirmation(key);
    const refresh = () => {
      probeController.startBatch([pluginId]).catch((error) => {
        console.error(`Failed to confirm ${pluginId} window start:`, error);
      });
    };
    const intervalId = setInterval(refresh, CONFIRM_INTERVAL_MS);
    const timeoutId = setTimeout(() => {
      void this.finishAttempt(attemptId, key, {
        status: "unconfirmed",
        error: "Quota reset did not update within two minutes.",
      });
    }, CONFIRM_TIMEOUT_MS);
    this.confirmations.set(key, { attemptId, pluginId, windowLine, key, intervalId, timeoutId });
    refresh();
  }

  async runWindow(view: WindowStarterProviderView): Promise<void> {
    const key = windowStarterRowKey(view.pluginId, view.windowLine);
    if (this.runningKey) return;
    this.runningKey = key;
    this.recomputeViews();

    const now = new Date();
    const attemptId = newAttemptId();
    const prompt = createWindowStarterPrompt();
    const attempt: WindowStarterAttempt = {
      id: attemptId,
      providerId: view.pluginId,
      windowLine: view.windowLine,
      runnerId: view.runnerId,
      startedAt: now.toISOString(),
      status: "pending",
      prompt,
      command: getWindowStarterCommand(
        view.pluginId,
        view.runnerId,
        view.windowId,
        prompt,
      ),
    };

    try {
      await windowStarterController.addAttempt(attempt);
    } catch (error) {
      console.error("Failed to persist Window Starter attempt:", error);
      this.runningKey = null;
      this.recomputeViews();
      return;
    }

    let result: NativeRunResult;
    try {
      result = await runWindowStarterCli({
        pluginId: view.pluginId,
        runnerId: view.runnerId,
        windowLine: view.windowLine,
        prompt,
        timeoutSecs: CLI_TIMEOUT_SECONDS,
      });
    } catch (error) {
      await this.finishAttempt(attemptId, key, {
        status: "failed",
        error: String(error),
      });
      return;
    }

    if (result.status !== "success") {
      await this.finishAttempt(attemptId, key, {
        status: "failed",
        exitCode: result.exitCode ?? undefined,
        durationMs: result.durationMs,
        error: result.output || (result.status === "timeout" ? "CLI timed out." : "CLI failed."),
      });
      return;
    }

    try {
      await windowStarterController.updateAttempt(attemptId, {
        exitCode: result.exitCode ?? undefined,
        durationMs: result.durationMs,
      });
    } catch (error) {
      await this.finishAttempt(attemptId, key, {
        status: "failed",
        error: `Failed to persist CLI result: ${String(error)}`,
      });
      return;
    }

    // Hold the serialize lock only while the CLI process runs. Quota
    // confirmation must not block a later manual run of another window.
    this.runningKey = null;
    this.recomputeViews();
    this.beginConfirmation(attemptId, view.pluginId, view.windowLine, key);
  }

  /** React to new probe data: confirm pending attempts whose window reset. */
  checkConfirmations(): void {
    for (const confirmation of [...this.confirmations.values()]) {
      const window = getFiveHourReset(
        this.inputs.pluginStates[confirmation.pluginId],
        confirmation.windowLine,
      );
      if (!window?.resetsAt) continue;
      const resetMs = Date.parse(window.resetsAt);
      if (!Number.isFinite(resetMs) || resetMs <= Date.now()) continue;
      void this.finishAttempt(confirmation.attemptId, confirmation.key, {
        status: "confirmed",
        resetsAt: window.resetsAt,
      });
    }
  }

  /** Auto-run the first ready window (enabled + history hydrated). */
  maybeAutoRun(): void {
    if (!this.inputs.enabled || !this.historyReady || this.runningKey) return;
    const ready = this.providerViews.find((provider) => provider.status === "ready");
    if (ready) void this.runWindow(ready);
  }

  dispose(): void {
    this.clearConfirmation();
  }

  resetForTests(): void {
    this.clearConfirmation();
    this.historyReady = false;
    this.providerViews = [];
    this.cliStatuses = {};
    this.agyAvailable = false;
    this.runningKey = null;
    this.finishing.clear();
    this.inputs = {
      enabled: false,
      pluginSettings: null,
      pluginMetas: [],
      pluginStates: {},
    };
  }

  setCliStatusesForTests(statuses: WindowStarterCliStatus[]): void {
    const next: Partial<Record<string, WindowStarterCliStatus>> = {};
    for (const status of statuses) {
      next[status.id] = status;
    }
    this.cliStatuses = next;
    this.agyAvailable = next.agy?.available === true;
  }

  markHistoryReadyForTests(): void {
    this.historyReady = true;
  }
}

export const windowStarterRunner = new WindowStarterRunner();
