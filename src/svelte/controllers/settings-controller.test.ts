import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_AUTO_UPDATE_INTERVAL,
  DEFAULT_CROSSING_GO_REMAINING_MINUTES,
  DEFAULT_DISPLAY_MODE,
  DEFAULT_GLOBAL_SHORTCUT,
  DEFAULT_RESET_TIMER_DISPLAY_MODE,
  DEFAULT_START_ON_LOGIN,
  DEFAULT_THEME_MODE,
  DEFAULT_LEFTOVER_NOTIFY_ENABLED,
  saveCrossingGoRemainingMinutes,
  saveLeftoverNotifyEnabled,
  savePluginSettings,
  saveThemeMode,
  saveTimelineCardRows,
  saveTimelineCardVisible,
} from "@/lib/settings";
import { appPluginController } from "./app-plugin-controller.svelte";
import { appPreferencesController } from "./app-preferences-controller.svelte";
import { probeController } from "./probe-controller.svelte";
import { settingsController } from "./settings-controller.svelte";

const backendMocks = vi.hoisted(() => ({
  disableAutostart: vi.fn(async () => {}),
  enableAutostart: vi.fn(async () => {}),
  isAutostartEnabled: vi.fn(async () => false),
  isTauri: vi.fn(() => false),
  listPlugins: vi.fn(async () => [
    {
      id: "claude",
      name: "Claude",
      iconUrl: "claude.svg",
      brandColor: "#de7356",
      lines: [],
    },
    {
      id: "codex",
      name: "Codex",
      iconUrl: "codex.svg",
      brandColor: "#10a37f",
      lines: [],
    },
  ]),
  updateGlobalShortcut: vi.fn(async () => {}),
  listenProbeBatchComplete: vi.fn(async () => () => {}),
  listenProbeResult: vi.fn(async () => () => {}),
  startProbeBatch: vi.fn(async (batchId: string, pluginIds?: string[]) => ({
    batchId,
    pluginIds: pluginIds ?? [],
  })),
  createBatchId: vi.fn(() => "batch-test"),
}));

vi.mock("../lib/backend", () => backendMocks);

vi.mock("@/lib/settings", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/settings")>();
  return {
    ...actual,
    loadPluginSettings: vi.fn(async () => ({ order: ["claude"], disabled: [] })),
    savePluginSettings: vi.fn(async () => {}),
    saveThemeMode: vi.fn(async () => {}),
    loadAutoUpdateInterval: vi.fn(async () => 15),
    loadThemeMode: vi.fn(async () => "dark" as const),
    loadDisplayMode: vi.fn(async () => "used" as const),
    loadResetTimerDisplayMode: vi.fn(async () => "absolute" as const),
    loadCrossingGoRemainingMinutes: vi.fn(async () => 90 as const),
    saveCrossingGoRemainingMinutes: vi.fn(async () => {}),
    loadLeftoverNotifyEnabled: vi.fn(async () => false),
    saveLeftoverNotifyEnabled: vi.fn(async () => {}),
    loadGlobalShortcut: vi.fn(async () => null),
    loadStartOnLogin: vi.fn(async () => false),
    loadWindowStarterEnabled: vi.fn(async () => false),
    loadTimelineCardVisible: vi.fn(async () => false),
    saveTimelineCardVisible: vi.fn(async () => {}),
    loadTimelineCardRows: vi.fn(async () => ["weekly"] as const),
    saveTimelineCardRows: vi.fn(async () => {}),
    migrateLegacyTraySettings: vi.fn(async () => {}),
  };
});

function seedSettings(order: string[], disabled: string[]): void {
  appPluginController.setPluginsMeta(
    order.map((id) => ({
      id,
      name: id,
      iconUrl: `${id}.svg`,
      brandColor: "#000000",
      lines: [],
    })),
  );
  appPluginController.setPluginSettings({ order, disabled });
}

describe("settingsController.bootstrap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    probeController.dispose();
    appPluginController.resetState();
    appPreferencesController.resetState();
  });

  it("loads settings, preferences, and starts the initial probe", async () => {
    await settingsController.bootstrap();

    expect(appPluginController.pluginsMeta.map((p) => p.id)).toEqual(["claude", "codex"]);
    expect(appPluginController.pluginSettings).not.toBeNull();
    expect(appPreferencesController.autoUpdateInterval).toBe(15);
    expect(appPreferencesController.themeMode).toBe("dark");
    expect(appPreferencesController.resetTimerDisplayMode).toBe("absolute");
    expect(appPreferencesController.crossingGoRemainingMinutes).toBe(90);
    expect(appPreferencesController.leftoverNotifyEnabled).toBe(false);
    expect(appPreferencesController.timelineCardVisible).toBe(false);
    expect(appPreferencesController.timelineCardRows).toEqual(["weekly"]);
    expect(probeController.pluginStates.claude.loading).toBe(true);
    expect(backendMocks.startProbeBatch).toHaveBeenCalled();
  });

  it("survives a list_plugins failure", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    backendMocks.listPlugins.mockRejectedValueOnce(new Error("no backend"));

    await settingsController.bootstrap();

    expect(appPluginController.pluginSettings).toBeNull();
    errorSpy.mockRestore();
  });

  it("applies start on login when the stored preference is enabled", async () => {
    backendMocks.isTauri.mockReturnValue(true);
    backendMocks.isAutostartEnabled.mockResolvedValue(false);
    const { loadStartOnLogin } = await import("@/lib/settings");
    (loadStartOnLogin as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    await settingsController.bootstrap();

    expect(backendMocks.enableAutostart).toHaveBeenCalled();
    backendMocks.isTauri.mockReturnValue(false);
  });

});

describe("settingsController plugin actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    probeController.dispose();
    probeController.pluginStates = {};
    seedSettings(["claude", "codex"], []);
    settingsController.setTrayIconScheduler(() => {});
  });

  it("reorder merges missing (disabled) ids back at their relative positions", () => {
    seedSettings(["claude", "codex", "cursor"], ["cursor"]);

    settingsController.handleReorder(["codex", "claude"]);

    expect(appPluginController.pluginSettings?.order).toEqual(["codex", "claude", "cursor"]);
    expect(savePluginSettings).toHaveBeenCalled();
  });

  it("toggling a disabled plugin on starts a probe for it", async () => {
    seedSettings(["claude", "codex"], ["codex"]);

    settingsController.handleToggle("codex");

    expect(appPluginController.pluginSettings?.disabled).toEqual([]);
    expect(probeController.pluginStates.codex.loading).toBe(true);
    await vi.waitFor(() => {
      expect(backendMocks.startProbeBatch).toHaveBeenCalled();
    });
  });

  it("reset all customization re-enables providers and clears display overrides", async () => {
    seedSettings(["claude", "codex"], ["codex"]);
    appPluginController.setPluginSettings({
      order: ["claude", "codex"],
      disabled: ["codex"],
      overviewLineOrder: { claude: ["Weekly", "Session"] },
      visibleOverviewProgressLines: { claude: ["Session"] },
      antigravityAgyAutoWake: true,
      grokAutoWake: true,
    });

    settingsController.handleResetAllCustomization();

    expect(appPluginController.pluginSettings?.disabled).toEqual([]);
    expect(appPluginController.pluginSettings?.overviewLineOrder).toBeUndefined();
    expect(appPluginController.pluginSettings?.visibleOverviewProgressLines).toBeUndefined();
    expect(appPluginController.pluginSettings?.antigravityAgyAutoWake).toBeUndefined();
    expect(appPluginController.pluginSettings?.grokAutoWake).toBeUndefined();
    expect(probeController.pluginStates.codex.loading).toBe(true);
    await vi.waitFor(() => {
      expect(backendMocks.startProbeBatch).toHaveBeenCalled();
    });
  });

  it("reset all customization without disabled providers probes nothing new", () => {
    seedSettings(["claude", "codex"], []);
    vi.clearAllMocks();

    settingsController.handleResetAllCustomization();

    expect(appPluginController.pluginSettings?.disabled).toEqual([]);
    expect(backendMocks.startProbeBatch).not.toHaveBeenCalled();
  });

  it("toggling an enabled plugin off disables it without probing", () => {
    seedSettings(["claude", "codex"], []);

    settingsController.handleToggle("claude");

    expect(appPluginController.pluginSettings?.disabled).toEqual(["claude"]);
    expect(probeController.pluginStates.claude).toBeUndefined();
  });

  it("records explicit visibility for manifest-default-hidden lines", () => {
    appPluginController.setPluginsMeta([
      {
        id: "claude",
        name: "claude",
        iconUrl: "claude.svg",
        brandColor: "#000000",
        lines: [
          { type: "progress", label: "Session", scope: "overview", visibleByDefault: true },
          { type: "progress", label: "Weekly", scope: "overview" },
        ],
      },
    ]);

    // Enabling a manifest-default-hidden line records an explicit visible set.
    settingsController.handleOverviewProgressBarToggle("claude", "Weekly", true);
    expect(appPluginController.pluginSettings?.visibleOverviewProgressLines).toEqual({
      claude: ["Session", "Weekly"],
    });

    // Disabling it again drops back to manifest defaults (empty stored map).
    settingsController.handleOverviewProgressBarToggle("claude", "Weekly", false);
    expect(
      appPluginController.pluginSettings?.visibleOverviewProgressLines ?? {},
    ).toEqual({});
  });

  it("overview progress bar toggle specifies only visible labels", () => {
    appPluginController.setPluginsMeta([
      {
        id: "claude",
        name: "claude",
        iconUrl: "claude.svg",
        brandColor: "#000000",
        lines: [
          { type: "progress", label: "Session", scope: "overview", visibleByDefault: true },
          { type: "progress", label: "Weekly", scope: "overview", visibleByDefault: true },
        ],
      },
    ]);

    settingsController.handleOverviewProgressBarToggle("claude", "Session", false);

    expect(appPluginController.pluginSettings?.visibleOverviewProgressLines).toEqual({
      claude: ["Weekly"],
    });

    settingsController.handleOverviewProgressBarToggle("claude", "Session", true);
    expect(
      appPluginController.pluginSettings?.visibleOverviewProgressLines ?? {},
    ).toEqual({});
  });

  it("overview text line toggle persists text labels", () => {
    appPluginController.setPluginsMeta([
      {
        id: "claude",
        name: "claude",
        iconUrl: "claude.svg",
        brandColor: "#000000",
        lines: [
          { type: "progress", label: "Session", scope: "overview", visibleByDefault: true },
          { type: "text", label: "Tokens", scope: "overview" },
        ],
      },
    ]);

    // Enabling a statistics text line records it in the stored visible set.
    settingsController.handleOverviewProgressBarToggle("claude", "Tokens", true);
    expect(appPluginController.pluginSettings?.visibleOverviewProgressLines).toEqual({
      claude: ["Session", "Tokens"],
    });

    // Disabling it again drops back to manifest defaults (empty stored map).
    settingsController.handleOverviewProgressBarToggle("claude", "Tokens", false);
    expect(
      appPluginController.pluginSettings?.visibleOverviewProgressLines ?? {},
    ).toEqual({});
  });

  it("overview line reorder updates memory and persists the ordered labels", () => {
    settingsController.handleOverviewLineReorder("claude", ["Weekly", "Session"]);

    expect(appPluginController.pluginSettings?.overviewLineOrder).toEqual({
      claude: ["Weekly", "Session"],
    });
    expect(savePluginSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        overviewLineOrder: { claude: ["Weekly", "Session"] },
      }),
    );
  });

  it("clears the stored overview line order to restore manifest order", () => {
    appPluginController.setPluginSettings({
      order: ["claude", "codex"],
      disabled: [],
      overviewLineOrder: { claude: ["Weekly", "Session"] },
    });

    settingsController.handleOverviewLineOrderReset("claude");

    expect(appPluginController.pluginSettings?.overviewLineOrder).toBeUndefined();
    expect(savePluginSettings).toHaveBeenCalledWith(
      expect.not.objectContaining({ overviewLineOrder: expect.anything() }),
    );
  });

  it("resets a provider's full display settings (order and visible set)", () => {
    appPluginController.setPluginSettings({
      order: ["claude", "codex"],
      disabled: [],
      overviewLineOrder: { claude: ["Weekly", "Session"] },
      visibleOverviewProgressLines: { claude: ["Session"] },
    });

    settingsController.handleOverviewDisplayReset("claude");

    expect(appPluginController.pluginSettings?.overviewLineOrder).toBeUndefined();
    expect(appPluginController.pluginSettings?.visibleOverviewProgressLines).toBeUndefined();
  });

  it("leaves other providers' display settings alone on display reset", () => {
    appPluginController.setPluginSettings({
      order: ["claude", "codex"],
      disabled: [],
      overviewLineOrder: { codex: ["Weekly"] },
      visibleOverviewProgressLines: { codex: ["Weekly"] },
    });

    settingsController.handleOverviewDisplayReset("claude");

    expect(appPluginController.pluginSettings?.overviewLineOrder).toEqual({ codex: ["Weekly"] });
    expect(appPluginController.pluginSettings?.visibleOverviewProgressLines).toEqual({
      codex: ["Weekly"],
    });
    expect(savePluginSettings).not.toHaveBeenCalled();
  });

  it("resets a provider's Window Starter overrides even when they are the only change", () => {
    appPluginController.setPluginsMeta([
      {
        id: "claude",
        name: "claude",
        iconUrl: "claude.svg",
        lines: [],
        windowStarter: {
          enabledByDefault: true,
          defaultRunner: "claude",
          allowedRunners: ["claude"],
          windows: [{ id: "session", line: "Session", weeklyLine: "Weekly" }],
        },
      },
      {
        id: "codex",
        name: "codex",
        iconUrl: "codex.svg",
        lines: [],
        windowStarter: {
          enabledByDefault: true,
          defaultRunner: "codex",
          allowedRunners: ["codex", "opencode", "hermes", "pi"],
          windows: [{ id: "session", line: "Session", weeklyLine: "Weekly" }],
        },
      },
    ]);
    appPluginController.setPluginSettings({
      order: ["claude", "codex"],
      disabled: [],
      windowStarterByPlugin: {
        claude: { enabled: false },
        codex: { runnerId: "pi" },
      },
    });

    settingsController.handleOverviewDisplayReset("claude");

    expect(appPluginController.pluginSettings?.windowStarterByPlugin).toEqual({
      codex: { runnerId: "pi" },
    });
  });

  it("stores Window Starter participation, runner, and window overrides", () => {
    appPluginController.setPluginsMeta([
      {
        id: "zai",
        name: "Z.ai",
        iconUrl: "zai.svg",
        lines: [],
        windowStarter: {
          enabledByDefault: true,
          defaultRunner: "zcode",
          allowedRunners: ["zcode", "opencode", "hermes", "pi"],
          windows: [{ id: "session", line: "Session", weeklyLine: "Weekly" }],
        },
      },
      {
        id: "antigravity",
        name: "Antigravity",
        iconUrl: "agy.svg",
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
      },
    ]);
    appPluginController.setPluginSettings({
      order: ["zai", "antigravity"],
      disabled: [],
    });

    settingsController.handleWindowStarterParticipation("zai", false);
    expect(appPluginController.pluginSettings?.windowStarterByPlugin).toEqual({
      zai: { enabled: false },
    });

    settingsController.handleWindowStarterRunner("zai", "pi");
    expect(appPluginController.pluginSettings?.windowStarterByPlugin).toEqual({
      zai: { enabled: false, runnerId: "pi" },
    });

    settingsController.handleWindowStarterRunner("zai", "zcode");
    expect(appPluginController.pluginSettings?.windowStarterByPlugin).toEqual({
      zai: { enabled: false },
    });

    settingsController.handleWindowStarterWindow("antigravity", "session", true);
    expect(appPluginController.pluginSettings?.windowStarterByPlugin).toEqual({
      zai: { enabled: false },
      antigravity: { windows: { session: { enabled: true } } },
    });
  });
});

describe("settingsController display and system actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    probeController.dispose();
    probeController.pluginStates = {};
    seedSettings(["claude"], []);
    appPreferencesController.resetState();
  });

  it("reset timer display mode toggle flips relative/absolute", () => {
    expect(appPreferencesController.resetTimerDisplayMode).not.toBe("absolute");

    settingsController.handleResetTimerDisplayModeToggle();

    expect(appPreferencesController.resetTimerDisplayMode).toBe("absolute");
  });

  it("theme mode change updates the preference and persists", () => {
    settingsController.handleThemeModeChange("light");

    expect(appPreferencesController.themeMode).toBe("light");
    expect(vi.mocked(saveThemeMode)).toHaveBeenCalledWith("light");
  });

  it("auto update interval change resyncs the probe schedule", () => {
    const before = Date.now();
    settingsController.handleAutoUpdateIntervalChange(15);
    const intervalMs = 15 * 60_000;

    expect(appPreferencesController.autoUpdateInterval).toBe(15);
    expect(probeController.autoUpdateNextAt).toBeGreaterThanOrEqual(before + intervalMs);
    expect(probeController.autoUpdateNextAt).toBeLessThanOrEqual(Date.now() + intervalMs);
  });

  it("global shortcut change invokes the backend command", () => {
    settingsController.handleGlobalShortcutChange("Ctrl+Shift+Q");

    expect(backendMocks.updateGlobalShortcut).toHaveBeenCalledWith("Ctrl+Shift+Q");
  });

  it("start on login change applies the autostart preference", async () => {
    backendMocks.isTauri.mockReturnValue(true);
    backendMocks.isAutostartEnabled.mockResolvedValue(false);

    settingsController.handleStartOnLoginChange(true);
    await vi.waitFor(() => {
      expect(backendMocks.enableAutostart).toHaveBeenCalled();
    });

    backendMocks.isTauri.mockReturnValue(false);
  });

  it("resets Settings preferences to defaults", () => {
    settingsController.handleThemeModeChange("dark");
    settingsController.handleAutoUpdateIntervalChange(15);
    settingsController.handleDisplayModeChange("used");
    settingsController.handleResetTimerDisplayModeChange("absolute");
    settingsController.handleCrossingGoRemainingMinutesChange(90);
    settingsController.handleLeftoverNotifyEnabledChange(false);
    settingsController.handleGlobalShortcutChange("Ctrl+Shift+Q");
    settingsController.handleStartOnLoginChange(true);

    settingsController.handleResetSettingsDefaults();

    expect(appPreferencesController.themeMode).toBe(DEFAULT_THEME_MODE);
    expect(appPreferencesController.autoUpdateInterval).toBe(DEFAULT_AUTO_UPDATE_INTERVAL);
    expect(appPreferencesController.displayMode).toBe(DEFAULT_DISPLAY_MODE);
    expect(appPreferencesController.resetTimerDisplayMode).toBe(DEFAULT_RESET_TIMER_DISPLAY_MODE);
    expect(appPreferencesController.crossingGoRemainingMinutes).toBe(
      DEFAULT_CROSSING_GO_REMAINING_MINUTES,
    );
    expect(appPreferencesController.leftoverNotifyEnabled).toBe(DEFAULT_LEFTOVER_NOTIFY_ENABLED);
    expect(appPreferencesController.globalShortcut).toBe(DEFAULT_GLOBAL_SHORTCUT);
    expect(appPreferencesController.startOnLogin).toBe(DEFAULT_START_ON_LOGIN);
    expect(vi.mocked(saveThemeMode)).toHaveBeenCalledWith(DEFAULT_THEME_MODE);
    expect(vi.mocked(saveCrossingGoRemainingMinutes)).toHaveBeenCalledWith(
      DEFAULT_CROSSING_GO_REMAINING_MINUTES,
    );
    expect(vi.mocked(saveLeftoverNotifyEnabled)).toHaveBeenCalledWith(
      DEFAULT_LEFTOVER_NOTIFY_ENABLED,
    );
    expect(backendMocks.updateGlobalShortcut).toHaveBeenCalledWith(DEFAULT_GLOBAL_SHORTCUT);
  });

  it("crossing-go remaining minutes change updates the preference and persists", () => {
    settingsController.handleCrossingGoRemainingMinutesChange(90);

    expect(appPreferencesController.crossingGoRemainingMinutes).toBe(90);
    expect(vi.mocked(saveCrossingGoRemainingMinutes)).toHaveBeenCalledWith(90);
  });

  it("leftover notify change updates the preference and persists", () => {
    settingsController.handleLeftoverNotifyEnabledChange(false);

    expect(appPreferencesController.leftoverNotifyEnabled).toBe(false);
    expect(vi.mocked(saveLeftoverNotifyEnabled)).toHaveBeenCalledWith(false);
  });

  it("timeline card visibility change updates the preference and persists", () => {
    settingsController.handleTimelineCardVisibleChange(false);

    expect(appPreferencesController.timelineCardVisible).toBe(false);
    expect(vi.mocked(saveTimelineCardVisible)).toHaveBeenCalledWith(false);
  });

  it("reset all customization does not change timeline card visibility", () => {
    appPreferencesController.setTimelineCardVisible(false);
    appPreferencesController.setTimelineCardRows(["weekly"]);

    settingsController.handleResetAllCustomization();

    expect(appPreferencesController.timelineCardVisible).toBe(false);
    expect(appPreferencesController.timelineCardRows).toEqual(["five-hour", "weekly"]);
  });

  it("reset all customization clears Window Starter overrides and keeps the global switch", () => {
    appPreferencesController.setWindowStarterEnabled(true);
    appPluginController.setPluginSettings({
      order: ["claude"],
      disabled: [],
      windowStarterByPlugin: { claude: { enabled: false, runnerId: "claude" } },
    });

    settingsController.handleResetAllCustomization();

    expect(appPluginController.pluginSettings?.windowStarterByPlugin).toBeUndefined();
    expect(appPreferencesController.windowStarterEnabled).toBe(true);
  });

  it("persists Auto-start agy and drops the key when off", () => {
    seedSettings(["antigravity"], []);
    settingsController.handleAntigravityAgyAutoWake(true);
    expect(appPluginController.pluginSettings?.antigravityAgyAutoWake).toBe(true);
    settingsController.handleAntigravityAgyAutoWake(false);
    expect(appPluginController.pluginSettings?.antigravityAgyAutoWake).toBeUndefined();
  });

  it("persists Auto-start grok and drops the key when off", () => {
    seedSettings(["grok"], []);
    settingsController.handleGrokAutoWake(true);
    expect(appPluginController.pluginSettings?.grokAutoWake).toBe(true);
    settingsController.handleGrokAutoWake(false);
    expect(appPluginController.pluginSettings?.grokAutoWake).toBeUndefined();
  });

  it("timeline card row toggle updates the preference and persists", () => {
    settingsController.handleTimelineCardRowToggle("five-hour", false);

    expect(appPreferencesController.timelineCardRows).toEqual(["weekly"]);
    expect(vi.mocked(saveTimelineCardRows)).toHaveBeenCalledWith(["weekly"]);
  });
});
