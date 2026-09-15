import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PluginOutput } from "@/lib/plugin-types";
import { ANTIGRAVITY_PLUGIN_ID, ANTIGRAVITY_WAKE_COOLDOWN_MS } from "@/lib/antigravity-wake";
import { credentialWakeController } from "./credential-wake-controller.svelte";
import { probeController } from "./probe-controller.svelte";

const backendMocks = vi.hoisted(() => {
  let seq = 0;
  return {
    createBatchId: vi.fn(() => `batch-${++seq}`),
    listenProbeBatchComplete: vi.fn(async () => () => {}),
    listenProbeResult: vi.fn(async () => () => {}),
    startProbeBatch: vi.fn(async (batchId: string, pluginIds?: string[]) => ({
      batchId,
      pluginIds: pluginIds ?? ["antigravity"],
    })),
    wakeAntigravityAgy: vi.fn(async () => ({
      status: "spawned" as const,
      durationMs: 7,
      exitCode: 0,
    })),
    wakeCredential: vi.fn(async () => ({
      status: "spawned" as const,
      durationMs: 7,
      exitCode: 0,
    })),
    credentialWakeAvailability: vi.fn(async () => ({
      antigravity: true,
      grok: false,
    })),
  };
});

vi.mock("../lib/backend", () => backendMocks);

function staleState() {
  return {
    data: {
      providerId: ANTIGRAVITY_PLUGIN_ID,
      displayName: "Antigravity",
      iconUrl: "x",
      lines: [],
      statuses: [{ text: "Stale", tone: "warning" as const }],
    } satisfies PluginOutput,
    loading: false,
    refreshing: false,
    error: null,
    staleError: null,
    lastManualRefreshAt: null,
    lastUpdatedAt: Date.now(),
  };
}

function freshState() {
  return {
    data: {
      providerId: ANTIGRAVITY_PLUGIN_ID,
      displayName: "Antigravity",
      iconUrl: "x",
      lines: [],
      statuses: [],
    } satisfies PluginOutput,
    loading: false,
    refreshing: false,
    error: null,
    staleError: null,
    lastManualRefreshAt: null,
    lastUpdatedAt: Date.now(),
  };
}

function errorState() {
  return {
    data: null,
    loading: false,
    refreshing: false,
    error: "Antigravity session expired. Start Antigravity or agy and try again.",
    staleError: null,
    lastManualRefreshAt: null,
    lastUpdatedAt: null,
  };
}

describe("credentialWakeController", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    credentialWakeController.resetForTests();
    probeController.dispose();
    probeController.pluginStates = {};
    backendMocks.wakeAntigravityAgy.mockClear();
    backendMocks.startProbeBatch.mockClear();
    backendMocks.wakeAntigravityAgy.mockResolvedValue({
      status: "spawned",
      durationMs: 7,
      exitCode: 0,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    credentialWakeController.resetForTests();
  });

  it("turning auto on while already Stale wakes without waiting for a probe", async () => {
    probeController.pluginStates = { [ANTIGRAVITY_PLUGIN_ID]: staleState() };
    credentialWakeController.syncInputs({ autoWake: true, agyAvailable: true });
    await vi.waitFor(() => {
      expect(backendMocks.wakeAntigravityAgy).toHaveBeenCalledTimes(1);
    });
  });

  it("auto-wake on Stale runs /quota then re-probes antigravity only", async () => {
    credentialWakeController.syncInputs({ autoWake: true, agyAvailable: true });
    credentialWakeController.considerAutoWake(staleState());
    await vi.waitFor(() => {
      expect(backendMocks.wakeAntigravityAgy).toHaveBeenCalledTimes(1);
    });
    await vi.waitFor(() => {
      expect(backendMocks.startProbeBatch).toHaveBeenCalled();
    });
    const ids = backendMocks.startProbeBatch.mock.calls.at(-1)?.[1];
    expect(ids).toEqual([ANTIGRAVITY_PLUGIN_ID]);
  });

  it("does not auto-wake when auto is off", () => {
    credentialWakeController.syncInputs({ autoWake: false, agyAvailable: true });
    credentialWakeController.considerAutoWake(staleState());
    expect(backendMocks.wakeAntigravityAgy).not.toHaveBeenCalled();
  });

  it("does not spawn when agy is missing", async () => {
    credentialWakeController.syncInputs({ autoWake: true, agyAvailable: false });
    credentialWakeController.considerAutoWake(errorState());
    await Promise.resolve();
    expect(backendMocks.wakeAntigravityAgy).not.toHaveBeenCalled();
  });

  it("joins concurrent wakes instead of spawning twice", async () => {
    let release: () => void = () => {};
    backendMocks.wakeAntigravityAgy.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = () => resolve({ status: "spawned", durationMs: 1, exitCode: 0 });
        }),
    );
    credentialWakeController.syncInputs({ autoWake: false, agyAvailable: true });
    const first = credentialWakeController.wakeAndReprobe();
    const second = credentialWakeController.wakeAndReprobe();
    expect(backendMocks.wakeAntigravityAgy).toHaveBeenCalledTimes(1);
    release();
    await Promise.all([first, second]);
    expect(backendMocks.wakeAntigravityAgy).toHaveBeenCalledTimes(1);
    expect(backendMocks.startProbeBatch).toHaveBeenCalledTimes(1);
  });

  it("cools down after a failed spawn", async () => {
    backendMocks.wakeAntigravityAgy.mockResolvedValue({
      status: "failed",
      durationMs: 1,
      exitCode: 1,
    });
    credentialWakeController.syncInputs({ autoWake: true, agyAvailable: true });
    credentialWakeController.considerAutoWake(errorState());
    await vi.waitFor(() => {
      expect(backendMocks.wakeAntigravityAgy).toHaveBeenCalledTimes(1);
    });
    credentialWakeController.considerAutoWake(errorState());
    expect(backendMocks.wakeAntigravityAgy).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(ANTIGRAVITY_WAKE_COOLDOWN_MS);
    credentialWakeController.considerAutoWake(errorState());
    await vi.waitFor(() => {
      expect(backendMocks.wakeAntigravityAgy).toHaveBeenCalledTimes(2);
    });
  });

  it("does not chain auto-wake on the immediate re-probe Stale result", async () => {
    credentialWakeController.syncInputs({ autoWake: true, agyAvailable: true });
    credentialWakeController.considerAutoWake(staleState());
    await vi.waitFor(() => {
      expect(backendMocks.wakeAntigravityAgy).toHaveBeenCalledTimes(1);
    });
    await vi.waitFor(() => {
      expect(backendMocks.startProbeBatch).toHaveBeenCalled();
    });
    credentialWakeController.considerAutoWake(staleState());
    expect(backendMocks.wakeAntigravityAgy).toHaveBeenCalledTimes(1);
  });

  it("does not consume the re-probe ignore on another plugin's result", async () => {
    credentialWakeController.syncInputs({ autoWake: true, agyAvailable: true });
    credentialWakeController.considerAutoWake(staleState(), ANTIGRAVITY_PLUGIN_ID);
    await vi.waitFor(() => {
      expect(backendMocks.startProbeBatch).toHaveBeenCalled();
    });
    credentialWakeController.considerAutoWake(staleState(), "claude");
    credentialWakeController.considerAutoWake(staleState(), ANTIGRAVITY_PLUGIN_ID);
    expect(backendMocks.wakeAntigravityAgy).toHaveBeenCalledTimes(1);
  });

  it("cools down after two consecutive stale re-probes", async () => {
    credentialWakeController.syncInputs({ autoWake: true, agyAvailable: true });
    credentialWakeController.considerAutoWake(staleState());
    await vi.waitFor(() => {
      expect(backendMocks.wakeAntigravityAgy).toHaveBeenCalledTimes(1);
    });
    await vi.waitFor(() => {
      expect(backendMocks.startProbeBatch).toHaveBeenCalledTimes(1);
    });
    credentialWakeController.onProbeResult(staleState(), ANTIGRAVITY_PLUGIN_ID);
    credentialWakeController.considerAutoWake(staleState());
    await vi.waitFor(() => {
      expect(backendMocks.wakeAntigravityAgy).toHaveBeenCalledTimes(2);
    });
    await vi.waitFor(() => {
      expect(backendMocks.startProbeBatch).toHaveBeenCalledTimes(2);
    });
    credentialWakeController.onProbeResult(staleState(), ANTIGRAVITY_PLUGIN_ID);
    credentialWakeController.considerAutoWake(staleState());
    expect(backendMocks.wakeAntigravityAgy).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(ANTIGRAVITY_WAKE_COOLDOWN_MS);
    credentialWakeController.considerAutoWake(staleState());
    await vi.waitFor(() => {
      expect(backendMocks.wakeAntigravityAgy).toHaveBeenCalledTimes(3);
    });
  });

  it("resets the stale re-probe count when a wake fixes the credentials", async () => {
    credentialWakeController.syncInputs({ autoWake: true, agyAvailable: true });
    credentialWakeController.considerAutoWake(staleState());
    await vi.waitFor(() => {
      expect(backendMocks.wakeAntigravityAgy).toHaveBeenCalledTimes(1);
    });
    await vi.waitFor(() => {
      expect(backendMocks.startProbeBatch).toHaveBeenCalledTimes(1);
    });
    credentialWakeController.onProbeResult(staleState(), ANTIGRAVITY_PLUGIN_ID);
    credentialWakeController.considerAutoWake(staleState());
    await vi.waitFor(() => {
      expect(backendMocks.wakeAntigravityAgy).toHaveBeenCalledTimes(2);
    });
    await vi.waitFor(() => {
      expect(backendMocks.startProbeBatch).toHaveBeenCalledTimes(2);
    });
    credentialWakeController.onProbeResult(freshState(), ANTIGRAVITY_PLUGIN_ID);
    credentialWakeController.onProbeResult(staleState(), ANTIGRAVITY_PLUGIN_ID);
    credentialWakeController.considerAutoWake(staleState());
    await vi.waitFor(() => {
      expect(backendMocks.wakeAntigravityAgy).toHaveBeenCalledTimes(3);
    });
  });

  it("keeps waking until the antigravity re-probe result", async () => {
    credentialWakeController.syncInputs({ autoWake: false, agyAvailable: true });
    const done = credentialWakeController.wakeAndReprobe();
    await vi.waitFor(() => {
      expect(backendMocks.startProbeBatch).toHaveBeenCalled();
    });
    await done;
    expect(credentialWakeController.waking).toBe(true);
    credentialWakeController.onProbeResult(errorState(), "claude");
    expect(credentialWakeController.waking).toBe(true);
    credentialWakeController.onProbeResult(errorState(), ANTIGRAVITY_PLUGIN_ID);
    expect(credentialWakeController.waking).toBe(false);
  });
});
