import {
  REFRESH_COOLDOWN_MS,
  getEnabledPluginIds,
  type PluginSettings,
} from "@/lib/settings";
import type { PluginOutput } from "@/lib/plugin-types";
import {
  createBatchId,
  listenProbeBatchComplete,
  listenProbeResult,
  startProbeBatch,
  type UnlistenFn,
} from "../lib/backend";

// Svelte-side plugin state. Unlike the React version, a refresh never clears
// fetched data: `loading` means "no data yet" (skeleton) while `refreshing`
// means "stale data on screen, update in flight" (usage-refresh spec).
export type PluginState = {
  data: PluginOutput | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  /** Refresh failed but stale data is retained; shown as an inline line. */
  staleError: string | null;
  lastManualRefreshAt: number | null;
  /** Timestamp of the last successful fetch (drives "Updated Xm ago"). */
  lastUpdatedAt: number | null;
};

const EMPTY_STATE: PluginState = {
  data: null,
  loading: false,
  refreshing: false,
  error: null,
  staleError: null,
  lastManualRefreshAt: null,
  lastUpdatedAt: null,
};

function errorMessageFromOutput(output: PluginOutput): string | null {
  const message = output.error?.trim();
  if (message) return message;
  return null;
}

class ProbeController {
  pluginStates = $state<Record<string, PluginState>>({});
  autoUpdateNextAt = $state<number | null>(null);

  /** Invoked after every applied probe result (drives tray refresh). */
  onProbeResult: ((pluginId: string) => void) | null = null;

  private pluginSettings: PluginSettings | null = null;
  private autoUpdateIntervalMinutes = 5;
  private autoUpdateTimer: ReturnType<typeof setInterval> | null = null;
  private activeBatchIds = new Set<string>();
  private manualRefreshIds = new Set<string>();
  private unlisteners: UnlistenFn[] = [];
  private listenersReady: Promise<void> | null = null;
  private resolveListenersReady: (() => void) | null = null;
  private disposed = false;

  private patchState(id: string, patch: Partial<PluginState>): void {
    const prev = this.pluginStates[id];
    this.pluginStates = {
      ...this.pluginStates,
      [id]: { ...EMPTY_STATE, ...prev, ...patch },
    };
  }

  private patchStates(
    ids: string[],
    build: (prev: PluginState | undefined) => PluginState,
  ): void {
    const next = { ...this.pluginStates };
    for (const id of ids) {
      next[id] = build(next[id]);
    }
    this.pluginStates = next;
  }

  // --- refresh lifecycle ---------------------------------------------------

  /**
   * Mark providers as having an update in flight. Providers without data go
   * into `loading` (skeleton); providers with stale data keep it on screen
   * and only flip `refreshing` (stale-while-revalidate).
   */
  beginRefresh(ids: string[]): void {
    this.patchStates(ids, (prev) => {
      if (prev?.data) {
        return { ...prev, refreshing: true, staleError: null };
      }
      return {
        ...EMPTY_STATE,
        loading: true,
        lastManualRefreshAt: prev?.lastManualRefreshAt ?? null,
      };
    });
  }

  /** A batch could not even be started. */
  setStartError(ids: string[], message: string): void {
    this.patchStates(ids, (prev) => {
      if (prev?.data) {
        return { ...prev, refreshing: false, staleError: message };
      }
      return {
        ...EMPTY_STATE,
        error: message,
        lastManualRefreshAt: prev?.lastManualRefreshAt ?? null,
      };
    });
  }

  handleProbeResult(output: PluginOutput): void {
    const message = errorMessageFromOutput(output);
    const wasManual = this.manualRefreshIds.delete(output.providerId);
    const prev = this.pluginStates[output.providerId];

    if (message) {
      if ((output.lines?.length ?? 0) > 0) {
        this.patchState(output.providerId, {
          data: output,
          loading: false,
          refreshing: false,
          error: null,
          staleError: message,
          lastManualRefreshAt: wasManual
            ? Date.now()
            : (prev?.lastManualRefreshAt ?? null),
          lastUpdatedAt: prev?.lastUpdatedAt ?? Date.now(),
        });
        this.onProbeResult?.(output.providerId);
        return;
      }
      if (prev?.data) {
        // Stale-while-revalidate: keep the previous data on screen.
        this.patchState(output.providerId, { refreshing: false, staleError: message });
      } else {
        this.patchState(output.providerId, {
          loading: false,
          refreshing: false,
          error: message,
        });
      }
      this.onProbeResult?.(output.providerId);
      return;
    }

    this.patchState(output.providerId, {
      data: output,
      loading: false,
      refreshing: false,
      staleError: null,
      error: null,
      lastManualRefreshAt: wasManual
        ? Date.now()
        : (prev?.lastManualRefreshAt ?? null),
      lastUpdatedAt: Date.now(),
    });
    this.onProbeResult?.(output.providerId);
  }

  getCooldownRemainingMs(id: string, now: number = Date.now()): number | null {
    const last = this.pluginStates[id]?.lastManualRefreshAt;
    if (!last) return null;
    const remaining = REFRESH_COOLDOWN_MS - (now - last);
    return remaining > 0 ? remaining : null;
  }

  // --- batches -------------------------------------------------------------

  private ensureListeners(): Promise<void> {
    if (!this.listenersReady) {
      this.disposed = false;
      this.listenersReady = new Promise((resolve) => {
        this.resolveListenersReady = resolve;
      });
      void this.setupListeners();
    }
    return this.listenersReady;
  }

  private async setupListeners(): Promise<void> {
    const unlistenResult = await listenProbeResult((payload) => {
      // React parity: results for batches we never started (or that already
      // completed) must not overwrite newer state.
      if (this.disposed || !this.activeBatchIds.has(payload.batchId)) return;
      this.handleProbeResult(payload.output);
    });
    if (this.disposed) {
      unlistenResult();
      return;
    }
    const unlistenComplete = await listenProbeBatchComplete((payload) => {
      this.activeBatchIds.delete(payload.batchId);
    });
    if (this.disposed) {
      unlistenResult();
      unlistenComplete();
      return;
    }
    this.unlisteners.push(unlistenResult, unlistenComplete);
    this.resolveListenersReady?.();
  }

  async startBatch(pluginIds?: string[]): Promise<string[] | undefined> {
    await this.ensureListeners();

    const batchId = createBatchId();
    this.activeBatchIds.add(batchId);
    try {
      const result = await startProbeBatch(batchId, pluginIds);
      return result.pluginIds;
    } catch (error) {
      this.activeBatchIds.delete(batchId);
      throw error;
    }
  }

  // --- auto update -----------------------------------------------------------

  /** Re-sync the automatic refresh loop; call whenever settings or interval change. */
  syncAutoUpdate(
    pluginSettings: PluginSettings | null,
    autoUpdateIntervalMinutes: number,
  ): void {
    this.pluginSettings = pluginSettings;
    this.autoUpdateIntervalMinutes = autoUpdateIntervalMinutes;
    this.restartAutoUpdateTimer();
  }

  /** Restart the automatic-refresh countdown immediately (manual refresh start). */
  resetAutoUpdateSchedule(): void {
    if (!this.pluginSettings) return;
    if (getEnabledPluginIds(this.pluginSettings).length === 0) {
      this.autoUpdateNextAt = null;
      return;
    }
    this.autoUpdateNextAt = Date.now() + this.autoUpdateIntervalMinutes * 60_000;
    this.restartAutoUpdateTimer();
  }

  private restartAutoUpdateTimer(): void {
    if (this.autoUpdateTimer) {
      clearInterval(this.autoUpdateTimer);
      this.autoUpdateTimer = null;
    }

    if (!this.pluginSettings) {
      this.autoUpdateNextAt = null;
      return;
    }
    const enabledIds = getEnabledPluginIds(this.pluginSettings);
    if (enabledIds.length === 0) {
      this.autoUpdateNextAt = null;
      return;
    }

    const intervalMs = this.autoUpdateIntervalMinutes * 60_000;
    this.autoUpdateNextAt = Date.now() + intervalMs;
    this.autoUpdateTimer = setInterval(() => {
      this.beginRefresh(enabledIds);
      this.startBatch(enabledIds).catch((error) => {
        console.error("Failed to start auto-update batch:", error);
        this.setStartError(enabledIds, "Failed to start probe");
      });
      this.autoUpdateNextAt = Date.now() + intervalMs;
    }, intervalMs);
  }

  // --- manual refresh --------------------------------------------------------

  private startManualRefresh(ids: string[], errorMessage: string): void {
    for (const id of ids) {
      this.manualRefreshIds.add(id);
    }
    this.beginRefresh(ids);
    this.startBatch(ids).catch((error) => {
      for (const id of ids) {
        this.manualRefreshIds.delete(id);
      }
      console.error(errorMessage, error);
      this.setStartError(ids, "Failed to start probe");
    });
  }

  handleRetryPlugin(id: string): void {
    const state = this.pluginStates[id];
    if (state?.loading || state?.refreshing) return;
    if (this.manualRefreshIds.has(id)) return;
    const lastManualRefreshAt = state?.lastManualRefreshAt;
    if (lastManualRefreshAt && Date.now() - lastManualRefreshAt < REFRESH_COOLDOWN_MS) {
      return;
    }

    this.resetAutoUpdateSchedule();
    this.startManualRefresh([id], "Failed to retry plugin:");
  }

  handleRefreshAll(): void {
    if (!this.pluginSettings) return;
    const enabledIds = getEnabledPluginIds(this.pluginSettings);
    if (enabledIds.length === 0) return;

    const now = Date.now();
    const eligibleIds = enabledIds.filter((id) => {
      const state = this.pluginStates[id];
      if (state?.loading || state?.refreshing) return false;
      if (this.manualRefreshIds.has(id)) return false;
      const lastManualRefreshAt = state?.lastManualRefreshAt;
      if (!lastManualRefreshAt) return true;
      return now - lastManualRefreshAt >= REFRESH_COOLDOWN_MS;
    });
    if (eligibleIds.length === 0) return;

    this.resetAutoUpdateSchedule();
    this.startManualRefresh(eligibleIds, "Failed to start refresh batch:");
  }

  dispose(): void {
    this.disposed = true;
    if (this.autoUpdateTimer) {
      clearInterval(this.autoUpdateTimer);
      this.autoUpdateTimer = null;
    }
    for (const unlisten of this.unlisteners) unlisten();
    this.unlisteners = [];
    this.listenersReady = null;
    this.resolveListenersReady = null;
  }
}

export const probeController = new ProbeController();
