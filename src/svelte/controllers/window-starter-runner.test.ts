import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PluginMeta, PluginOutput } from "@/lib/plugin-types";
import { FIVE_HOUR_MS } from "@/lib/window-starter-state";
import type { PluginState } from "./probe-controller.svelte";
import { probeController } from "./probe-controller.svelte";
import { windowStarterController } from "./window-starter-controller.svelte";
import { windowStarterRunner } from "./window-starter-runner.svelte";

const backendMocks = vi.hoisted(() => ({
  isTauri: vi.fn(() => false),
  discoverWindowStarterClis: vi.fn(async () => []),
  runWindowStarterCli: vi.fn(async () => ({
    providerId: "claude",
    runnerId: "claude",
    windowLine: "Session",
    executable: "claude",
    status: "success" as const,
    exitCode: 0,
    durationMs: 10,
    output: "OK",
    outputTruncated: false,
  })),
}));

vi.mock("../lib/backend", () => backendMocks);

vi.mock("@/lib/window-starter", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/window-starter")>();
  return {
    ...actual,
    loadWindowStarterAttempts: vi.fn(async () => []),
    saveWindowStarterAttempts: vi.fn(async () => {}),
  };
});

const CLAUDE_META: PluginMeta = {
  id: "claude",
  name: "Claude",
  iconUrl: "",
  lines: [],
  windowStarter: {
    enabledByDefault: true,
    defaultRunner: "claude",
    allowedRunners: ["claude"],
    windows: [{ id: "session", line: "Session", weeklyLine: "Weekly" }],
  },
};

const ANTIGRAVITY_META: PluginMeta = {
  id: "antigravity",
  name: "Antigravity",
  iconUrl: "",
  lines: [],
  windowStarter: {
    enabledByDefault: false,
    defaultRunner: "agy",
    allowedRunners: ["agy"],
    windows: [
      { id: "session", line: "Session", weeklyLine: "Weekly", enabledByDefault: false },
      { id: "claude", line: "Claude", weeklyLine: "Claude Wk", enabledByDefault: false },
    ],
  },
};

function idleOutput(providerId: string, labels: string[] = ["Session"]): PluginOutput {
  return {
    providerId,
    displayName: providerId,
    iconUrl: "",
    lines: [
      ...labels.map((label) => ({
        type: "progress" as const,
        label,
        used: 0,
        limit: 100,
        format: { kind: "percent" as const },
        periodDurationMs: FIVE_HOUR_MS,
      })),
      {
        type: "progress",
        label: labels.includes("Claude") ? "Claude Wk" : "Weekly",
        used: 0,
        limit: 100,
        format: { kind: "percent" as const },
      },
    ],
  };
}

function pluginState(data: PluginOutput): PluginState {
  return {
    data,
    loading: false,
    refreshing: false,
    error: null,
    staleError: null,
    lastManualRefreshAt: null,
    lastUpdatedAt: null,
  };
}

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe("windowStarterRunner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    windowStarterRunner.resetForTests();
    windowStarterController.resetState();
    windowStarterRunner.setCliStatusesForTests([
      { id: "claude", executable: "claude", available: true },
      { id: "agy", executable: "agy", available: true },
    ]);
    windowStarterRunner.markHistoryReadyForTests();
    vi.spyOn(probeController, "startBatch").mockResolvedValue({
      batchId: "batch-test",
      pluginIds: [],
    });
  });

  it("does not run when the global switch is off", async () => {
    windowStarterRunner.syncInputs({
      enabled: false,
      pluginSettings: { order: ["claude"], disabled: [] },
      pluginMetas: [CLAUDE_META],
      pluginStates: { claude: pluginState(idleOutput("claude")) },
    });
    await flush();

    expect(backendMocks.runWindowStarterCli).not.toHaveBeenCalled();
  });

  it("does not run when participation is off", async () => {
    windowStarterRunner.syncInputs({
      enabled: true,
      pluginSettings: {
        order: ["claude"],
        disabled: [],
        windowStarterByPlugin: { claude: { enabled: false } },
      },
      pluginMetas: [CLAUDE_META],
      pluginStates: { claude: pluginState(idleOutput("claude")) },
    });
    await flush();

    expect(windowStarterRunner.providerViews[0]?.status).toBe("off");
    expect(backendMocks.runWindowStarterCli).not.toHaveBeenCalled();
  });

  it("runs the selected runner once with plugin, runner, and window line", async () => {
    windowStarterRunner.syncInputs({
      enabled: true,
      pluginSettings: { order: ["claude"], disabled: [] },
      pluginMetas: [CLAUDE_META],
      pluginStates: { claude: pluginState(idleOutput("claude")) },
    });
    await vi.waitFor(() => {
      expect(backendMocks.runWindowStarterCli).toHaveBeenCalledTimes(1);
    });

    expect(backendMocks.runWindowStarterCli).toHaveBeenCalledWith(
      expect.objectContaining({
        pluginId: "claude",
        runnerId: "claude",
        windowLine: "Session",
        prompt: 'OpenQuotaCycle Window Starter request. Respond with only "OK".',
        timeoutSecs: 60,
      }),
    );
    expect(windowStarterController.attempts).toHaveLength(1);
    expect(windowStarterController.attempts[0].windowLine).toBe("Session");
    expect(windowStarterController.attempts[0].runnerId).toBe("claude");
    expect(windowStarterController.attempts[0].command).toContain(
      `'OpenQuotaCycle Window Starter request. Respond with only "OK".'`,
    );
    expect(windowStarterController.attempts[0].command).not.toContain("<prompt>");
  });

  it("does not start a second prompt while a five-hour lock is held", async () => {
    backendMocks.runWindowStarterCli.mockResolvedValue({
      providerId: "claude",
      runnerId: "claude",
      windowLine: "Session",
      executable: "claude",
      status: "failed",
      exitCode: 1,
      durationMs: 5,
      output: "nope",
      outputTruncated: false,
    });

    windowStarterRunner.syncInputs({
      enabled: true,
      pluginSettings: { order: ["claude"], disabled: [] },
      pluginMetas: [CLAUDE_META],
      pluginStates: { claude: pluginState(idleOutput("claude")) },
    });
    await vi.waitFor(() => {
      expect(backendMocks.runWindowStarterCli).toHaveBeenCalledTimes(1);
    });
    await flush();

    windowStarterRunner.syncInputs({
      enabled: true,
      pluginSettings: { order: ["claude"], disabled: [] },
      pluginMetas: [CLAUDE_META],
      pluginStates: { claude: pluginState(idleOutput("claude")) },
    });
    await flush();

    expect(backendMocks.runWindowStarterCli).toHaveBeenCalledTimes(1);
    expect(windowStarterRunner.providerViews[0]?.status).toBe("locked");
  });

  it("does not send a second prompt when confirmation expires unconfirmed", async () => {
    vi.useFakeTimers({
      toFake: ["setTimeout", "setInterval", "clearTimeout", "clearInterval"],
    });
    try {
      windowStarterRunner.syncInputs({
        enabled: true,
        pluginSettings: { order: ["claude"], disabled: [] },
        pluginMetas: [CLAUDE_META],
        pluginStates: { claude: pluginState(idleOutput("claude")) },
      });
      await vi.waitFor(() => {
        expect(backendMocks.runWindowStarterCli).toHaveBeenCalledTimes(1);
      });

      await vi.advanceTimersByTimeAsync(2 * 60_000);
      await flush();

      expect(windowStarterController.attempts[0]?.status).toBe("unconfirmed");
      expect(backendMocks.runWindowStarterCli).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("serializes independent Antigravity windows instead of overlapping CLIs", async () => {
    backendMocks.runWindowStarterCli.mockResolvedValue({
      providerId: "antigravity",
      runnerId: "agy",
      windowLine: "Session",
      executable: "agy",
      status: "failed",
      exitCode: 1,
      durationMs: 4,
      output: "fail",
      outputTruncated: false,
    });

    windowStarterRunner.syncInputs({
      enabled: true,
      pluginSettings: {
        order: ["antigravity"],
        disabled: [],
        windowStarterByPlugin: {
          antigravity: {
            windows: { session: { enabled: true }, claude: { enabled: true } },
          },
        },
      },
      pluginMetas: [ANTIGRAVITY_META],
      pluginStates: {
        antigravity: pluginState(idleOutput("antigravity", ["Session", "Claude"])),
      },
    });

    await vi.waitFor(() => {
      expect(backendMocks.runWindowStarterCli).toHaveBeenCalledTimes(2);
    });

    expect(backendMocks.runWindowStarterCli.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        pluginId: "antigravity",
        runnerId: "agy",
        windowLine: "Session",
      }),
    );
    expect(backendMocks.runWindowStarterCli.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        pluginId: "antigravity",
        runnerId: "agy",
        windowLine: "Claude",
      }),
    );
  });

  it("runs when invoked manually even if the global switch is off", async () => {
    windowStarterRunner.syncInputs({
      enabled: false,
      pluginSettings: { order: ["claude"], disabled: [] },
      pluginMetas: [CLAUDE_META],
      pluginStates: { claude: pluginState(idleOutput("claude")) },
    });
    await flush();
    expect(backendMocks.runWindowStarterCli).not.toHaveBeenCalled();

    const view = windowStarterRunner.providerViews[0];
    expect(view).toBeTruthy();
    await windowStarterRunner.runWindow(view);
    expect(backendMocks.runWindowStarterCli).toHaveBeenCalledTimes(1);
    expect(windowStarterController.attempts).toHaveLength(1);
  });

  it("allows a confirmed manual run while the five-hour lock is held", async () => {
    backendMocks.runWindowStarterCli.mockResolvedValue({
      providerId: "claude",
      runnerId: "claude",
      windowLine: "Session",
      executable: "claude",
      status: "failed",
      exitCode: 1,
      durationMs: 5,
      output: "nope",
      outputTruncated: false,
    });

    windowStarterRunner.syncInputs({
      enabled: true,
      pluginSettings: { order: ["claude"], disabled: [] },
      pluginMetas: [CLAUDE_META],
      pluginStates: { claude: pluginState(idleOutput("claude")) },
    });
    await vi.waitFor(() => {
      expect(backendMocks.runWindowStarterCli).toHaveBeenCalledTimes(1);
    });
    await flush();
    expect(windowStarterRunner.providerViews[0]?.status).toBe("locked");

    await windowStarterRunner.runWindow(windowStarterRunner.providerViews[0]);
    expect(backendMocks.runWindowStarterCli).toHaveBeenCalledTimes(2);
  });

  it("records a second Antigravity window while the first is awaiting confirmation", async () => {
    backendMocks.runWindowStarterCli.mockResolvedValue({
      providerId: "antigravity",
      runnerId: "agy",
      windowLine: "Session",
      executable: "agy",
      status: "success",
      exitCode: 0,
      durationMs: 9,
      output: "OK",
      outputTruncated: false,
    });

    windowStarterRunner.syncInputs({
      enabled: false,
      pluginSettings: { order: ["antigravity"], disabled: [] },
      pluginMetas: [ANTIGRAVITY_META],
      pluginStates: {
        antigravity: pluginState(idleOutput("antigravity", ["Session", "Claude"])),
      },
    });
    await flush();

    const session = windowStarterRunner.providerViews.find(
      (provider) => provider.windowLine === "Session",
    );
    const claude = windowStarterRunner.providerViews.find(
      (provider) => provider.windowLine === "Claude",
    );
    expect(session).toBeTruthy();
    expect(claude).toBeTruthy();

    await windowStarterRunner.runWindow(session!);
    expect(backendMocks.runWindowStarterCli).toHaveBeenCalledTimes(1);
    expect(windowStarterController.attempts).toHaveLength(1);
    expect(windowStarterController.attempts[0].windowLine).toBe("Session");
    expect(windowStarterController.attempts[0].status).toBe("pending");

    backendMocks.runWindowStarterCli.mockResolvedValue({
      providerId: "antigravity",
      runnerId: "agy",
      windowLine: "Claude",
      executable: "agy",
      status: "success",
      exitCode: 0,
      durationMs: 8,
      output: "OK",
      outputTruncated: false,
    });
    await windowStarterRunner.runWindow(claude!);

    expect(backendMocks.runWindowStarterCli).toHaveBeenCalledTimes(2);
    expect(windowStarterController.attempts).toHaveLength(2);
    expect(windowStarterController.attempts.map((attempt) => attempt.windowLine)).toEqual([
      "Claude",
      "Session",
    ]);
  });

  it("confirms a pending attempt when a later probe snapshot has a future reset", async () => {
    windowStarterRunner.syncInputs({
      enabled: false,
      pluginSettings: { order: ["claude"], disabled: [] },
      pluginMetas: [CLAUDE_META],
      pluginStates: { claude: pluginState(idleOutput("claude")) },
    });
    await flush();

    await windowStarterRunner.runWindow(windowStarterRunner.providerViews[0]);
    expect(windowStarterController.attempts[0]?.status).toBe("pending");

    const resetsAt = new Date(Date.now() + 60_000).toISOString();
    windowStarterRunner.syncInputs({
      enabled: false,
      pluginSettings: { order: ["claude"], disabled: [] },
      pluginMetas: [CLAUDE_META],
      pluginStates: {
        claude: pluginState({
          ...idleOutput("claude"),
          lines: [
            {
              type: "progress",
              label: "Session",
              used: 1,
              limit: 100,
              format: { kind: "percent" },
              periodDurationMs: FIVE_HOUR_MS,
              resetsAt,
            },
            {
              type: "progress",
              label: "Weekly",
              used: 0,
              limit: 100,
              format: { kind: "percent" },
            },
          ],
        }),
      },
    });
    await flush();

    expect(windowStarterController.attempts[0]?.status).toBe("confirmed");
    expect(windowStarterController.attempts[0]?.resetsAt).toBe(resetsAt);
  });

  it("confirms at 0% used without retrying when a future reset appears", async () => {
    windowStarterRunner.syncInputs({
      enabled: false,
      pluginSettings: { order: ["claude"], disabled: [] },
      pluginMetas: [CLAUDE_META],
      pluginStates: { claude: pluginState(idleOutput("claude")) },
    });
    await flush();

    await windowStarterRunner.runWindow(windowStarterRunner.providerViews[0]);
    expect(backendMocks.runWindowStarterCli).toHaveBeenCalledTimes(1);
    expect(windowStarterController.attempts[0]?.status).toBe("pending");

    const resetsAt = new Date(Date.now() + 60_000).toISOString();
    windowStarterRunner.syncInputs({
      enabled: false,
      pluginSettings: { order: ["claude"], disabled: [] },
      pluginMetas: [CLAUDE_META],
      pluginStates: {
        claude: pluginState({
          ...idleOutput("claude"),
          lines: [
            {
              type: "progress",
              label: "Session",
              used: 0,
              limit: 100,
              format: { kind: "percent" },
              periodDurationMs: FIVE_HOUR_MS,
              resetsAt,
            },
            {
              type: "progress",
              label: "Weekly",
              used: 0,
              limit: 100,
              format: { kind: "percent" },
            },
          ],
        }),
      },
    });
    await flush();

    expect(windowStarterController.attempts[0]?.status).toBe("confirmed");
    expect(windowStarterController.attempts[0]?.resetsAt).toBe(resetsAt);
    expect(backendMocks.runWindowStarterCli).toHaveBeenCalledTimes(1);
  });
});
