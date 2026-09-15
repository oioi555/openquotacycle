import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PluginOutput } from "@/lib/plugin-types";
import {
  ANTIGRAVITY_WAKE_COOLDOWN_MS,
  GROK_PLUGIN_ID,
  GROK_START_NOTICE,
} from "@/lib/antigravity-wake";
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
      pluginIds: pluginIds ?? ["grok"],
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
      antigravity: false,
      grok: true,
    })),
  };
});

vi.mock("../lib/backend", () => backendMocks);

function grokState(overrides: Partial<{
  error: string | null
  staleError: string | null
  data: PluginOutput | null
}> = {}) {
  return {
    data: overrides.data ?? null,
    loading: false,
    refreshing: false,
    error: overrides.error ?? null,
    staleError: overrides.staleError ?? null,
    lastManualRefreshAt: null,
    lastUpdatedAt: Date.now(),
  };
}

function grokCredentialError() {
  return grokState({ error: GROK_START_NOTICE });
}

function grokNetworkStale() {
  return grokState({
    staleError: "Usage request failed. Check your connection.",
    data: {
      providerId: GROK_PLUGIN_ID,
      displayName: "Grok",
      iconUrl: "x",
      lines: [],
      statuses: [{ text: "Stale", tone: "warning" as const }],
    },
  });
}

function grokFresh() {
  return grokState({
    data: {
      providerId: GROK_PLUGIN_ID,
      displayName: "Grok",
      iconUrl: "x",
      lines: [],
      statuses: [],
    },
  });
}

describe("grok credential wake controller", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    credentialWakeController.resetForTests();
    probeController.dispose();
    probeController.pluginStates = {};
    backendMocks.wakeCredential.mockClear();
    backendMocks.wakeAntigravityAgy.mockClear();
    backendMocks.startProbeBatch.mockClear();
    backendMocks.wakeCredential.mockResolvedValue({
      status: "spawned",
      durationMs: 7,
      exitCode: 0,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    credentialWakeController.resetForTests();
  });

  it("turning auto on while already credential-stale wakes grok without waiting for a probe", async () => {
    probeController.pluginStates = { [GROK_PLUGIN_ID]: grokCredentialError() };
    credentialWakeController.syncInputs({
      autoWake: false,
      agyAvailable: false,
      grokAutoWake: true,
      grokAvailable: true,
    });
    await vi.waitFor(() => {
      expect(backendMocks.wakeCredential).toHaveBeenCalledWith("grok");
    });
    expect(backendMocks.wakeAntigravityAgy).not.toHaveBeenCalled();
  });

  it("auto-wake on credential error re-probes grok only", async () => {
    credentialWakeController.syncInputs({
      autoWake: false,
      agyAvailable: false,
      grokAutoWake: true,
      grokAvailable: true,
    });
    credentialWakeController.considerAutoWake(grokCredentialError(), GROK_PLUGIN_ID);
    await vi.waitFor(() => {
      expect(backendMocks.wakeCredential).toHaveBeenCalledTimes(1);
    });
    await vi.waitFor(() => {
      expect(backendMocks.startProbeBatch).toHaveBeenCalled();
    });
    const ids = backendMocks.startProbeBatch.mock.calls.at(-1)?.[1];
    expect(ids).toEqual([GROK_PLUGIN_ID]);
  });

  it("does not auto-wake grok on network/5xx stale", async () => {
    credentialWakeController.syncInputs({
      autoWake: false,
      agyAvailable: false,
      grokAutoWake: true,
      grokAvailable: true,
    });
    credentialWakeController.considerAutoWake(grokNetworkStale(), GROK_PLUGIN_ID);
    await Promise.resolve();
    expect(backendMocks.wakeCredential).not.toHaveBeenCalled();
  });

  it("does not auto-wake grok when auto is off", () => {
    credentialWakeController.syncInputs({
      autoWake: false,
      agyAvailable: false,
      grokAutoWake: false,
      grokAvailable: true,
    });
    credentialWakeController.considerAutoWake(grokCredentialError(), GROK_PLUGIN_ID);
    expect(backendMocks.wakeCredential).not.toHaveBeenCalled();
  });

  it("does not spawn grok when the CLI is missing", async () => {
    credentialWakeController.syncInputs({
      autoWake: false,
      agyAvailable: false,
      grokAutoWake: true,
      grokAvailable: false,
    });
    credentialWakeController.considerAutoWake(grokCredentialError(), GROK_PLUGIN_ID);
    await Promise.resolve();
    expect(backendMocks.wakeCredential).not.toHaveBeenCalled();
  });

  it("joins concurrent grok wakes instead of spawning twice", async () => {
    let release: () => void = () => {};
    backendMocks.wakeCredential.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = () => resolve({ status: "spawned", durationMs: 1, exitCode: 0 });
        }),
    );
    credentialWakeController.syncInputs({
      autoWake: false,
      agyAvailable: false,
      grokAutoWake: false,
      grokAvailable: true,
    });
    const first = credentialWakeController.wakeAndReprobe(GROK_PLUGIN_ID);
    const second = credentialWakeController.wakeAndReprobe(GROK_PLUGIN_ID);
    expect(backendMocks.wakeCredential).toHaveBeenCalledTimes(1);
    release();
    await Promise.all([first, second]);
    expect(backendMocks.wakeCredential).toHaveBeenCalledTimes(1);
    expect(backendMocks.startProbeBatch).toHaveBeenCalledTimes(1);
  });

  it("cools down after a failed grok spawn", async () => {
    backendMocks.wakeCredential.mockResolvedValue({
      status: "failed",
      durationMs: 1,
      exitCode: 1,
    });
    credentialWakeController.syncInputs({
      autoWake: false,
      agyAvailable: false,
      grokAutoWake: true,
      grokAvailable: true,
    });
    credentialWakeController.considerAutoWake(grokCredentialError(), GROK_PLUGIN_ID);
    await vi.waitFor(() => {
      expect(backendMocks.wakeCredential).toHaveBeenCalledTimes(1);
    });
    credentialWakeController.considerAutoWake(grokCredentialError(), GROK_PLUGIN_ID);
    expect(backendMocks.wakeCredential).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(ANTIGRAVITY_WAKE_COOLDOWN_MS);
    credentialWakeController.considerAutoWake(grokCredentialError(), GROK_PLUGIN_ID);
    await vi.waitFor(() => {
      expect(backendMocks.wakeCredential).toHaveBeenCalledTimes(2);
    });
  });

  it("cools down after two consecutive grok stale re-probes", async () => {
    credentialWakeController.syncInputs({
      autoWake: false,
      agyAvailable: false,
      grokAutoWake: true,
      grokAvailable: true,
    });
    credentialWakeController.considerAutoWake(grokCredentialError(), GROK_PLUGIN_ID);
    await vi.waitFor(() => {
      expect(backendMocks.wakeCredential).toHaveBeenCalledTimes(1);
    });
    await vi.waitFor(() => {
      expect(backendMocks.startProbeBatch).toHaveBeenCalledTimes(1);
    });
    credentialWakeController.onProbeResult(grokCredentialError(), GROK_PLUGIN_ID);
    credentialWakeController.considerAutoWake(grokCredentialError(), GROK_PLUGIN_ID);
    await vi.waitFor(() => {
      expect(backendMocks.wakeCredential).toHaveBeenCalledTimes(2);
    });
    await vi.waitFor(() => {
      expect(backendMocks.startProbeBatch).toHaveBeenCalledTimes(2);
    });
    credentialWakeController.onProbeResult(grokCredentialError(), GROK_PLUGIN_ID);
    credentialWakeController.considerAutoWake(grokCredentialError(), GROK_PLUGIN_ID);
    expect(backendMocks.wakeCredential).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(ANTIGRAVITY_WAKE_COOLDOWN_MS);
    credentialWakeController.considerAutoWake(grokCredentialError(), GROK_PLUGIN_ID);
    await vi.waitFor(() => {
      expect(backendMocks.wakeCredential).toHaveBeenCalledTimes(3);
    });
  });

  it("resets grok stale re-probe count when a wake fixes credentials", async () => {
    credentialWakeController.syncInputs({
      autoWake: false,
      agyAvailable: false,
      grokAutoWake: true,
      grokAvailable: true,
    });
    credentialWakeController.considerAutoWake(grokCredentialError(), GROK_PLUGIN_ID);
    await vi.waitFor(() => {
      expect(backendMocks.startProbeBatch).toHaveBeenCalledTimes(1);
    });
    credentialWakeController.onProbeResult(grokCredentialError(), GROK_PLUGIN_ID);
    credentialWakeController.considerAutoWake(grokCredentialError(), GROK_PLUGIN_ID);
    await vi.waitFor(() => {
      expect(backendMocks.startProbeBatch).toHaveBeenCalledTimes(2);
    });
    credentialWakeController.onProbeResult(grokFresh(), GROK_PLUGIN_ID);
    credentialWakeController.onProbeResult(grokCredentialError(), GROK_PLUGIN_ID);
    credentialWakeController.considerAutoWake(grokCredentialError(), GROK_PLUGIN_ID);
    await vi.waitFor(() => {
      expect(backendMocks.wakeCredential).toHaveBeenCalledTimes(3);
    });
  });

  it("keeps grok waking until the grok re-probe result", async () => {
    credentialWakeController.syncInputs({
      autoWake: false,
      agyAvailable: false,
      grokAutoWake: false,
      grokAvailable: true,
    });
    const done = credentialWakeController.wakeAndReprobe(GROK_PLUGIN_ID);
    await vi.waitFor(() => {
      expect(backendMocks.startProbeBatch).toHaveBeenCalled();
    });
    await done;
    expect(credentialWakeController.isWaking(GROK_PLUGIN_ID)).toBe(true);
    credentialWakeController.onProbeResult(grokCredentialError(), "claude");
    expect(credentialWakeController.isWaking(GROK_PLUGIN_ID)).toBe(true);
    credentialWakeController.onProbeResult(grokCredentialError(), GROK_PLUGIN_ID);
    expect(credentialWakeController.isWaking(GROK_PLUGIN_ID)).toBe(false);
  });

  it("does not record a Window Starter attempt", async () => {
    credentialWakeController.syncInputs({
      autoWake: false,
      agyAvailable: false,
      grokAutoWake: false,
      grokAvailable: true,
    });
    await credentialWakeController.wakeAndReprobe(GROK_PLUGIN_ID);
    expect(backendMocks.wakeCredential).toHaveBeenCalledWith("grok");
    expect(backendMocks.startProbeBatch.mock.calls.at(-1)?.[1]).toEqual([GROK_PLUGIN_ID]);
  });
});
