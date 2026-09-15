import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PluginOutput } from "@/lib/plugin-types";
import type { PluginSettings } from "@/lib/settings";
import type { ProbeBatchStarted } from "../lib/backend";
import { probeController } from "./probe-controller.svelte";

const backendMocks = vi.hoisted(() => {
  let seq = 0;
  return {
    createBatchId: vi.fn(() => `batch-${++seq}`),
    listenProbeBatchComplete: vi.fn(async () => () => {}),
    listenProbeResult: vi.fn(async () => () => {}),
    startProbeBatch: vi.fn(async (batchId: string, pluginIds?: string[]) => {
      const result: ProbeBatchStarted = {
        batchId,
        pluginIds: pluginIds ?? [],
      };
      return result;
    }),
  };
});

vi.mock("../lib/backend", () => backendMocks);

const settings: PluginSettings = {
  order: ["claude", "codex"],
  disabled: [],
};

function okOutput(providerId: string): PluginOutput {
  return { providerId, lines: [] } as unknown as PluginOutput;
}

function errorOutput(providerId: string, text: string): PluginOutput {
  return {
    providerId,
    lines: [],
    error: text,
  } as unknown as PluginOutput;
}

function resetController(): void {
  probeController.dispose();
  probeController.pluginStates = {};
  probeController.autoUpdateNextAt = null;
  backendMocks.startProbeBatch.mockClear();
  backendMocks.startProbeBatch.mockImplementation(
    async (batchId: string, pluginIds?: string[]) => ({
      batchId,
      pluginIds: pluginIds ?? [],
    }),
  );
}

async function seededWithData(providerId: string): Promise<void> {
  await probeController.startBatch();
  probeController.handleProbeResult(okOutput(providerId));
}

describe("probeController — stale-while-revalidate retention", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetController();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("initial refresh without data shows the loading state (skeleton)", async () => {
    await probeController.startBatch();
    probeController.beginRefresh(["claude"]);

    const state = probeController.pluginStates.claude;
    expect(state.loading).toBe(true);
    expect(state.refreshing).toBe(false);
    expect(state.data).toBeNull();
  });

  it("manual refresh keeps stale data visible and marks it refreshing", async () => {
    await seededWithData("claude");
    const before = probeController.pluginStates.claude.data;

    probeController.handleRetryPlugin("claude");
    await vi.advanceTimersByTimeAsync(0);

    const state = probeController.pluginStates.claude;
    expect(state.data).toBe(before);
    expect(state.refreshing).toBe(true);
    expect(state.loading).toBe(false);
  });

  it("automatic refresh keeps stale data visible", async () => {
    probeController.syncAutoUpdate(settings, 15);
    await seededWithData("claude");
    const before = probeController.pluginStates.claude.data;

    await vi.advanceTimersByTimeAsync(15 * 60_000);

    expect(backendMocks.startProbeBatch).toHaveBeenCalled();
    const state = probeController.pluginStates.claude;
    expect(state.data).toBe(before);
    expect(state.refreshing).toBe(true);
  });

  it("a successful result replaces the data and clears in-flight state", async () => {
    await probeController.startBatch();
    probeController.beginRefresh(["claude"]);
    probeController.handleProbeResult(okOutput("claude"));

    const state = probeController.pluginStates.claude;
    expect(state.data).not.toBeNull();
    expect(state.loading).toBe(false);
    expect(state.refreshing).toBe(false);
    expect(state.error).toBeNull();
    expect(state.staleError).toBeNull();
  });
});

describe("probeController — failure handling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetController();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps stale data and reports an inline error when a refresh fails", async () => {
    await seededWithData("claude");
    const before = probeController.pluginStates.claude.data;

    probeController.handleRetryPlugin("claude");
    await vi.advanceTimersByTimeAsync(0);
    probeController.handleProbeResult(errorOutput("claude", "quota page down"));

    const state = probeController.pluginStates.claude;
    expect(state.data).toBe(before);
    expect(state.refreshing).toBe(false);
    expect(state.staleError).toBe("quota page down");
    expect(state.error).toBeNull();
  });

  it("shows an error state instead of data when the first load fails", async () => {
    await probeController.startBatch();
    probeController.handleProbeResult(errorOutput("claude", "boom"));

    const state = probeController.pluginStates.claude;
    expect(state.data).toBeNull();
    expect(state.loading).toBe(false);
    expect(state.error).toBe("boom");
  });

  it("shows snapshot lines with an inline notice when the probe returns both", () => {
    const output = {
      providerId: "grok",
      displayName: "Grok",
      iconUrl: "grok.svg",
      lines: [
        {
          type: "progress" as const,
          label: "Weekly",
          used: 0,
          limit: 100,
          format: { kind: "percent" as const },
        },
      ],
      statuses: [{ text: "Stale", tone: "warning" as const }],
      error: "Grok session expired. Start Grok Build and try again.",
    };

    probeController.handleProbeResult(output);

    const state = probeController.pluginStates.grok;
    expect(state.data).toEqual(output);
    expect(state.staleError).toBe(
      "Grok session expired. Start Grok Build and try again.",
    );
    expect(state.error).toBeNull();
    expect(state.loading).toBe(false);
  });

  it("reports a start failure inline when stale data exists", async () => {
    await seededWithData("claude");
    backendMocks.startProbeBatch.mockRejectedValue(new Error("no tauri"));

    probeController.handleRefreshAll();
    await vi.advanceTimersByTimeAsync(0);

    const state = probeController.pluginStates.claude;
    expect(state.refreshing).toBe(false);
    expect(state.staleError).toBe("Failed to start probe");
  });

  it("reports a start failure as an error state without prior data", async () => {
    backendMocks.startProbeBatch.mockRejectedValue(new Error("no tauri"));

    probeController.handleRefreshAll();
    await vi.advanceTimersByTimeAsync(0);

    const state = probeController.pluginStates.claude;
    expect(state.data).toBeNull();
    expect(state.error).toBe("Failed to start probe");
  });
});

describe("probeController — per-provider manual cooldown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-06T12:00:00Z"));
    resetController();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("successful manual refresh records lastManualRefreshAt", async () => {
    await probeController.startBatch();

    probeController.handleRetryPlugin("claude");
    await vi.advanceTimersByTimeAsync(0);
    probeController.handleProbeResult(okOutput("claude"));

    expect(probeController.pluginStates.claude.lastManualRefreshAt).toBe(Date.now());
  });

  it("blocks a retry within the 5-minute cooldown", async () => {
    await seededWithData("claude");

    probeController.handleRetryPlugin("claude");
    await vi.advanceTimersByTimeAsync(0);
    probeController.handleProbeResult(okOutput("claude"));
    const callsAfterFirst = backendMocks.startProbeBatch.mock.calls.length;

    vi.setSystemTime(new Date(Date.now() + 60_000));
    probeController.handleRetryPlugin("claude");
    await vi.advanceTimersByTimeAsync(0);

    expect(probeController.getCooldownRemainingMs("claude")).not.toBeNull();
    expect(backendMocks.startProbeBatch.mock.calls.length).toBe(callsAfterFirst);
  });

  it("allows a retry again once the cooldown has elapsed", async () => {
    await seededWithData("claude");

    probeController.handleRetryPlugin("claude");
    await vi.advanceTimersByTimeAsync(0);
    probeController.handleProbeResult(okOutput("claude"));

    vi.setSystemTime(new Date(Date.now() + 5 * 60_000 + 1_000));
    probeController.handleRetryPlugin("claude");
    await vi.advanceTimersByTimeAsync(0);

    expect(probeController.getCooldownRemainingMs("claude")).toBeNull();
    expect(probeController.pluginStates.claude.refreshing).toBe(true);
  });

  it("refresh-all refreshes only providers outside their cooldown", async () => {
    probeController.syncAutoUpdate(settings, 15);
    await seededWithData("claude");
    await seededWithData("codex");

    probeController.handleRetryPlugin("claude");
    await vi.advanceTimersByTimeAsync(0);
    probeController.handleProbeResult(okOutput("claude"));

    probeController.handleRefreshAll();
    await vi.advanceTimersByTimeAsync(0);

    const refreshing = Object.entries(probeController.pluginStates)
      .filter(([, state]) => state.refreshing)
      .map(([id]) => id);
    expect(refreshing).toEqual(["codex"]);
  });
});

describe("probeController — automatic schedule", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-06T12:00:00Z"));
    resetController();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("schedules the next auto refresh at the configured interval", () => {
    probeController.syncAutoUpdate(settings, 15);

    expect(probeController.autoUpdateNextAt).toBe(Date.now() + 15 * 60_000);
  });

  it("clears the schedule without enabled providers", () => {
    probeController.syncAutoUpdate({ order: ["claude"], disabled: ["claude"] }, 15);

    expect(probeController.autoUpdateNextAt).toBeNull();
  });

  it("restarts the countdown at manual refresh start, before it completes", async () => {
    probeController.syncAutoUpdate(settings, 15);
    await seededWithData("claude");

    let releaseBatch: (value: ProbeBatchStarted) => void = () => {};
    backendMocks.startProbeBatch.mockImplementationOnce(
      () =>
        new Promise<ProbeBatchStarted>((resolve) => {
          releaseBatch = resolve;
        }),
    );

    probeController.handleRetryPlugin("claude");

    expect(probeController.autoUpdateNextAt).toBe(Date.now() + 15 * 60_000);

    releaseBatch({ batchId: "b", pluginIds: ["claude"] });
    await vi.advanceTimersByTimeAsync(0);
  });

  it("fires the auto refresh on interval ticks", async () => {
    probeController.syncAutoUpdate(settings, 15);

    await vi.advanceTimersByTimeAsync(15 * 60_000);

    expect(backendMocks.startProbeBatch).toHaveBeenCalled();
    expect(probeController.autoUpdateNextAt).toBe(Date.now() + 15 * 60_000);
  });

  it("ignores probe results for unknown batches (listener filter)", async () => {
    await probeController.startBatch();
    const handler = backendMocks.listenProbeResult.mock.calls[0][0] as (payload: {
      batchId: string;
      output: PluginOutput;
    }) => void;

    // Unknown batch: dropped, state untouched.
    handler({ batchId: "batch-unknown", output: okOutput("claude") });
    expect(probeController.pluginStates.claude).toBeUndefined();

    // Known batch: applied.
    handler({ batchId: "batch-1", output: okOutput("claude") });
    expect(probeController.pluginStates.claude.data).not.toBeNull();
  });
});
