import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App.svelte";
import { appPreferencesController } from "./controllers/app-preferences-controller.svelte";
import { appPluginController } from "./controllers/app-plugin-controller.svelte";
import { appUiController } from "./controllers/app-ui-controller.svelte";
import { probeController } from "./controllers/probe-controller.svelte";
import { settingsController } from "./controllers/settings-controller.svelte";
import { windowStarterRunner } from "./controllers/window-starter-runner.svelte";
import { credentialWakeController } from "./controllers/credential-wake-controller.svelte";
import { leftoverNotifyController } from "./controllers/leftover-notify-controller.svelte";

// Full backend seam mock: the smoke test mounts the composed Svelte app in
// jsdom (no Tauri runtime), so every Tauri call is a stub.
const backendMocks = vi.hoisted(() => {
  const unlisten = async () => () => {};
  return {
    isTauri: () => false,
    createBatchId: vi.fn(() => "batch-smoke"),
    startProbeBatch: vi.fn(async (batchId: string, pluginIds?: string[]) => ({
      batchId,
      pluginIds: pluginIds ?? [],
    })),
    listenProbeResult: vi.fn(unlisten),
    listenProbeBatchComplete: vi.fn(unlisten),
    listenTrayNavigate: vi.fn(unlisten),
    listenTrayShowAbout: vi.fn(unlisten),
    listPlugins: vi.fn(async () => []),
    updateGlobalShortcut: vi.fn(async () => {}),
    openDevtools: vi.fn(async () => {}),
    discoverWindowStarterClis: vi.fn(async () => []),
    runWindowStarterCli: vi.fn(async () => ({
      providerId: "x",
      runnerId: "x",
      windowLine: "Session",
      executable: "x",
      status: "success",
      exitCode: 0,
      durationMs: 0,
      output: "",
      outputTruncated: false,
    })),
    wakeAntigravityAgy: vi.fn(async () => ({
      status: "spawned",
      durationMs: 0,
      exitCode: 0,
    })),
    wakeCredential: vi.fn(async () => ({
      status: "spawned",
      durationMs: 0,
      exitCode: 0,
    })),
    credentialWakeAvailability: vi.fn(async () => ({
      antigravity: false,
      grok: false,
    })),
    getAppVersion: vi.fn(async () => "0.0.2"),
    setTrayTooltip: vi.fn(async () => {}),
    showDesktopNotification: vi.fn(async () => {}),
    openUrl: vi.fn(async () => {}),
    enableAutostart: vi.fn(async () => {}),
    disableAutostart: vi.fn(async () => {}),
    isAutostartEnabled: vi.fn(async () => false),
  };
});

vi.mock("./lib/backend", () => backendMocks);

function navigateViaKeys(key: string, modifiers: { ctrlKey?: boolean } = {}): Promise<void> {
  return fireEvent.keyDown(window, { key, ...modifiers });
}

describe("App smoke (composed Svelte UI)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appUiController.resetState();
    leftoverNotifyController.resetForTests();
  });

  // RTL auto-cleanup is inactive under vitest (globals off) — without this,
  // stale App instances keep singleton controllers and window listeners alive.
  afterEach(() => {
    cleanup();
    appUiController.resetState();
    credentialWakeController.resetForTests();
    leftoverNotifyController.resetForTests();
  });

  it("mounts the dashboard with an Overview top bar and footer", async () => {
    render(App);

    // Empty overview state (no plugins bootstrapped in jsdom)
    await waitFor(() => {
      expect(screen.getByText("No providers enabled")).toBeTruthy();
    });

    expect(screen.getByRole("heading", { name: "Overview" })).toBeTruthy();
    expect(screen.queryByLabelText("Back")).toBeNull();
    expect(screen.getByText("Off")).toBeTruthy();
    expect(screen.getByLabelText("Refresh")).toBeTruthy();

    expect(screen.getByRole("tab", { name: "Overview" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Timeline" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Settings" })).toBeTruthy();
    expect(screen.queryByLabelText("Options")).toBeNull();
    expect(screen.queryByText("Paused")).toBeNull();
    expect(screen.queryByText(/Next update in/)).toBeNull();
  });

  it("shows Window Starter on the Timeline tab", async () => {
    render(App);
    await screen.findByText("No providers enabled");

    await fireEvent.click(screen.getByRole("tab", { name: "Timeline" }));
    await waitFor(() => {
      expect(screen.getByText("No upcoming resets")).toBeTruthy();
    });
    expect(screen.getByRole("heading", { name: "Window Starter" })).toBeTruthy();
    expect(screen.getByText("Auto-start")).toBeTruthy();
    expect(screen.queryByLabelText("Back")).toBeNull();
    expect(screen.getByRole("tab", { name: "Timeline" }).getAttribute("aria-selected")).toBe("true");
  });

  it("navigates via keyboard: Ctrl+, to Settings, Esc back, Enter into Customize", async () => {
    render(App);
    await screen.findByText("No providers enabled");

    await navigateViaKeys(",", { ctrlKey: true });
    await waitFor(() => {
      expect(screen.getByText("Global Shortcut")).toBeTruthy();
    });
    expect(screen.queryByLabelText("Back")).toBeNull();
    expect(screen.getByRole("heading", { name: "Settings" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "5-hour leftover" })).toBeTruthy();
    expect(screen.queryByText("Melting leftover")).toBeNull();
    expect(screen.getByRole("button", { name: "Reset settings" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Refresh" })).toBeNull();
    expect(screen.getByRole("tab", { name: "Settings" }).getAttribute("aria-selected")).toBe("true");

    await navigateViaKeys(",", { ctrlKey: true });
    await waitFor(() => {
      expect(screen.getByText("No providers enabled")).toBeTruthy();
    });

    await navigateViaKeys("Enter");
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Reset all customization" })).toBeTruthy();
    });

    // Customize L1 top bar offers reset-all behind confirmation.
    await fireEvent.click(screen.getByRole("button", { name: "Reset all customization" }));
    await waitFor(() => {
      expect(screen.getByRole("alertdialog", { name: "Reset All Customization?" })).toBeTruthy();
    });
    await fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).toBeNull();
    });

    // Esc from Customize steps to Settings (parent tab), not the dashboard.
    await navigateViaKeys("Escape");
    await waitFor(() => {
      expect(screen.getByText("Global Shortcut")).toBeTruthy();
    });
    expect(screen.queryByLabelText("Back")).toBeNull();

    await fireEvent.click(screen.getByRole("tab", { name: "Overview" }));
    await waitFor(() => {
      expect(screen.getByText("No providers enabled")).toBeTruthy();
    });
  });

  it("survives a probe result with Window Starter enabled (effect loop regression)", async () => {
    // Regression: with windowStarterEnabled + hydrated history, the runner
    // effect used to read providerViews ($state) it also writes —
    // effect_update_depth_exceeded on real devices.
    appPreferencesController.setWindowStarterEnabled(true);
    (windowStarterRunner as unknown as { historyReady: boolean }).historyReady = true;
    // Bootstrap re-seeds pluginsMeta from listPlugins() once it settles, so the
    // mock must know about Claude too.
    const claudeMeta = {
      id: "claude",
      name: "Claude",
      iconUrl: "claude.svg",
      brandColor: "#de7356",
      lines: [],
    };
    backendMocks.listPlugins.mockResolvedValue([claudeMeta as never]);
    // Seed plugin settings/meta so displayPlugins actually contains Claude
    // through the real derived path (not just probe state).
    appPluginController.setPluginsMeta([claudeMeta as never]);
    appPluginController.setPluginSettings({ order: ["claude"], disabled: [] });
    const output = {
      providerId: "claude",
      displayName: "Claude",
      plan: "Pro",
      iconUrl: "claude.svg",
      lines: [
        {
          type: "progress",
          label: "Session",
          used: 40,
          limit: 100,
          format: { kind: "percent" },
        },
      ],
    };

    render(App);
    probeController.handleProbeResult(output as never);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Claude" })).toBeTruthy();
    });

    // Disabling the plugin behind customize:<id> falls back to the dashboard.
    appUiController.setScreen("customize:claude");
    await waitFor(() => {
      expect(screen.getByText("Always Visible")).toBeTruthy();
    });
    // Top bar on a provider detail resets that screen's display settings.
    expect(screen.getByRole("button", { name: "Reset display settings" })).toBeTruthy();
    settingsController.handleToggle("claude");
    await waitFor(() => {
      expect(screen.getByText("No providers enabled")).toBeTruthy();
    });

    appPreferencesController.setWindowStarterEnabled(false);
    appPluginController.resetState();
  });
});
