import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  DEFAULT_AUTO_UPDATE_INTERVAL,
  DEFAULT_CROSSING_GO_REMAINING_MINUTES,
  DEFAULT_DISPLAY_MODE,
  DEFAULT_GLOBAL_SHORTCUT,
  DEFAULT_PLUGIN_SETTINGS,
  DEFAULT_RESET_TIMER_DISPLAY_MODE,
  DEFAULT_START_ON_LOGIN,
  DEFAULT_THEME_MODE,
  DEFAULT_LEFTOVER_NOTIFY_ENABLED,
  DEFAULT_WINDOW_STARTER_ENABLED,
  DEFAULT_TIMELINE_CARD_ROWS,
  DEFAULT_TIMELINE_CARD_VISIBLE,
  arePluginSettingsEqual,
  defaultVisibleOverviewLabels,
  effectiveHiddenOverviewLabels,
  effectiveVisibleOverviewLabels,
  effectiveWindowStarterEnabled,
  effectiveWindowStarterRunner,
  pruneWindowStarterOverride,
  getOverviewProgressBarOptions,
  getEnabledPluginIds,
  loadAutoUpdateInterval,
  crossingGoRemainingMs,
  loadCrossingGoRemainingMinutes,
  loadLeftoverNotifyEnabled,
  loadDisplayMode,
  loadGlobalShortcut,
  loadPluginSettings,
  loadResetTimerDisplayMode,
  loadStartOnLogin,
  loadWindowStarterEnabled,
  loadTimelineCardRows,
  loadTimelineCardVisible,
  migrateLegacyTraySettings,
  loadThemeMode,
  normalizePluginSettings,
  saveAutoUpdateInterval,
  saveCrossingGoRemainingMinutes,
  saveLeftoverNotifyEnabled,
  saveDisplayMode,
  saveGlobalShortcut,
  savePluginSettings,
  saveResetTimerDisplayMode,
  saveStartOnLogin,
  saveThemeMode,
  saveWindowStarterEnabled,
  saveTimelineCardVisible,
  saveTimelineCardRows,
  normalizeTimelineCardRows,
} from "@/lib/settings"
import type { PluginMeta, WindowStarterCapability } from "@/lib/plugin-types"

const storeState = new Map<string, unknown>()
const storeDeleteMock = vi.fn()
const storeSaveMock = vi.fn()

vi.mock("@tauri-apps/plugin-store", () => ({
  LazyStore: class {
    async get<T>(key: string): Promise<T | null> {
      if (!storeState.has(key)) return undefined as T | null
      return storeState.get(key) as T | null
    }
    async set<T>(key: string, value: T): Promise<void> {
      storeState.set(key, value)
    }
    async delete(key: string): Promise<void> {
      storeDeleteMock(key)
      storeState.delete(key)
    }
    async save(): Promise<void> {
      storeSaveMock()
    }
  },
}))

describe("settings", () => {
  beforeEach(() => {
    storeState.clear()
    storeDeleteMock.mockReset()
    storeSaveMock.mockReset()
  })

  it("loads defaults when no settings stored", async () => {
    await expect(loadPluginSettings()).resolves.toEqual(DEFAULT_PLUGIN_SETTINGS)
  })

  it("sanitizes stored settings", async () => {
    storeState.set("plugins", {
      order: ["a", 42],
      disabled: "nope",
      hiddenOverviewProgressLines: "nope",
      hiddenOverviewStatistics: ["a", 42, "a"],
    })
    await expect(loadPluginSettings()).resolves.toEqual({
      order: ["a"],
      disabled: [],
      hiddenOverviewStatistics: ["a"],
    })
  })

  it("saves settings", async () => {
    const settings = {
      order: ["a"],
      disabled: ["b"],
      visibleOverviewProgressLines: { a: ["Monthly"] },
      hiddenOverviewStatistics: ["a"],
    }
    await savePluginSettings(settings)
    await expect(loadPluginSettings()).resolves.toEqual(settings)
  })

  it("normalizes order + disabled against known plugins", () => {
    const plugins: PluginMeta[] = [
      { id: "a", name: "A", iconUrl: "", lines: [] },
      { id: "b", name: "B", iconUrl: "", lines: [] },
    ]
    const normalized = normalizePluginSettings(
      {
        order: ["b", "b", "c"],
        disabled: ["c", "a"],
        hiddenOverviewStatistics: ["a", "missing", "a"],
      },
      plugins
    )
    expect(normalized).toEqual({
      order: ["b", "a"],
      disabled: ["a"],
    })
  })

  it("specifies only visible bars per plugin", () => {
    const plugins: PluginMeta[] = [
      {
        id: "codex",
        name: "Codex",
        iconUrl: "",
        lines: [
          { type: "progress", label: "Weekly", scope: "overview", visibleByDefault: true },
          { type: "progress", label: "Monthly", scope: "detail", visibleByDefault: true },
        ],
      },
    ]

    const normalized = normalizePluginSettings(
      {
        order: ["codex"],
        disabled: [],
        visibleOverviewProgressLines: {
          codex: ["Weekly", "Removed"],
          missing: ["Monthly"],
        },
      },
      plugins
    )

    expect(normalized.visibleOverviewProgressLines).toEqual({ codex: ["Weekly"] })
    expect(getOverviewProgressBarOptions(plugins[0], ["Weekly"])).toEqual([
      { label: "Weekly", checked: true },
      { label: "Monthly", checked: false },
    ])
    expect(getOverviewProgressBarOptions(plugins[0])).toEqual([
      { label: "Weekly", checked: true },
      { label: "Monthly", checked: true },
    ])
  })

  it("drops stored visible sets identical to manifest defaults", () => {
    const plugins: PluginMeta[] = [
      {
        id: "codex",
        name: "Codex",
        iconUrl: "",
        lines: [
          { type: "progress", label: "Weekly", scope: "overview", visibleByDefault: true },
          { type: "progress", label: "Monthly", scope: "overview" },
        ],
      },
    ]

    const normalized = normalizePluginSettings(
      {
        order: ["codex"],
        disabled: [],
        visibleOverviewProgressLines: { codex: ["Weekly"] },
      },
      plugins
    )

    expect(normalized.visibleOverviewProgressLines).toBeUndefined()
    expect(getOverviewProgressBarOptions(plugins[0])).toEqual([
      { label: "Weekly", checked: true },
      { label: "Monthly", checked: false },
    ])
  })

  it("applies stored line order and fills manifest order for the rest", () => {
    const plugins: PluginMeta[] = [
      {
        id: "codex",
        name: "Codex",
        iconUrl: "",
        lines: [
          { type: "progress", label: "Weekly", scope: "overview", visibleByDefault: true },
          { type: "progress", label: "Session", scope: "overview", visibleByDefault: true },
          { type: "progress", label: "Monthly", scope: "overview", visibleByDefault: true },
        ],
      },
    ]

    const normalized = normalizePluginSettings(
      {
        order: ["codex"],
        disabled: [],
        overviewLineOrder: { codex: ["Session", "Removed", "Monthly"] },
      },
      plugins
    )

    // "Removed" is unknown and dropped; "Weekly" (new) is appended in manifest order.
    expect(normalized.overviewLineOrder).toEqual({ codex: ["Session", "Monthly", "Weekly"] })
    expect(getOverviewProgressBarOptions(plugins[0], undefined, ["Session"])).toEqual([
      { label: "Session", checked: true },
      { label: "Weekly", checked: true },
      { label: "Monthly", checked: true },
    ])
  })

  it("shows only manifest-declared lines unless explicitly overridden", () => {
    const plugins: PluginMeta[] = [
      {
        id: "codex",
        name: "Codex",
        iconUrl: "",
        lines: [
          { type: "progress", label: "Session", scope: "overview", visibleByDefault: true },
          { type: "progress", label: "Weekly", scope: "overview" },
        ],
      },
    ]

    expect(defaultVisibleOverviewLabels(plugins[0])).toEqual(["Session"])
    expect(effectiveVisibleOverviewLabels(plugins[0])).toEqual(["Session"])
    expect(effectiveVisibleOverviewLabels(plugins[0], ["Weekly"])).toEqual(["Weekly"])
    expect(effectiveHiddenOverviewLabels(plugins[0])).toEqual(["Weekly"])
    expect(effectiveHiddenOverviewLabels(plugins[0], ["Weekly", "Session"])).toEqual([])
    expect(getOverviewProgressBarOptions(plugins[0])).toEqual([
      { label: "Session", checked: true },
      { label: "Weekly", checked: false },
    ])
    expect(getOverviewProgressBarOptions(plugins[0], ["Weekly", "Session"])).toEqual([
      { label: "Session", checked: true },
      { label: "Weekly", checked: true },
    ])
  })

  it("includes unmarked text lines in the effective hidden set", () => {
    const plugins: PluginMeta[] = [
      {
        id: "codex",
        name: "Codex",
        iconUrl: "",
        lines: [
          { type: "progress", label: "Session", scope: "overview", visibleByDefault: true },
          { type: "text", label: "Extra Usage", scope: "overview" },
        ],
      },
    ]

    expect(effectiveHiddenOverviewLabels(plugins[0])).toEqual(["Extra Usage"])
    expect(getOverviewProgressBarOptions(plugins[0])).toEqual([
      { label: "Session", checked: true },
      { label: "Extra Usage", checked: false },
    ])
  })

  it("omits visible sets without stored input (absent key = defaults)", () => {
    const plugins: PluginMeta[] = [
      {
        id: "codex",
        name: "Codex",
        iconUrl: "",
        lines: [
          { type: "progress", label: "Session", scope: "overview", visibleByDefault: true },
          { type: "progress", label: "Weekly", scope: "overview" },
        ],
      },
    ]

    const normalized = normalizePluginSettings({ order: ["codex"], disabled: [] }, plugins)

    expect("visibleOverviewProgressLines" in normalized).toBe(false)
    expect(getOverviewProgressBarOptions(plugins[0])).toEqual([
      { label: "Session", checked: true },
      { label: "Weekly", checked: false },
    ])
  })

  it("normalizes stored visible labels against known lines", () => {
    const plugins: PluginMeta[] = [
      {
        id: "codex",
        name: "Codex",
        iconUrl: "",
        lines: [
          { type: "progress", label: "Session", scope: "overview", visibleByDefault: true },
          { type: "progress", label: "Weekly", scope: "overview" },
        ],
      },
    ]

    const normalized = normalizePluginSettings(
      {
        order: ["codex"],
        disabled: [],
        visibleOverviewProgressLines: { codex: ["Weekly", "Session", "Removed"] },
      },
      plugins
    )

    // Only known labels survive; removed ones vanish.
    expect(normalized.visibleOverviewProgressLines).toEqual({ codex: ["Weekly", "Session"] })
  })

  it("migrates legacy hidden labels to visible sets (with renames)", () => {
    const plugins: PluginMeta[] = [
      {
        id: "cursor",
        name: "Cursor",
        iconUrl: "",
        lines: [
          { type: "progress", label: "Credits", scope: "overview" },
          { type: "progress", label: "Cursor", scope: "overview" },
          { type: "progress", label: "Other", scope: "overview" },
        ],
      },
    ]

    const normalized = normalizePluginSettings(
      {
        order: ["cursor"],
        disabled: [],
        hiddenOverviewProgressLines: {
          cursor: ["Cursor Models", "Other"],
        },
      },
      plugins
    )

    expect(normalized.visibleOverviewProgressLines).toEqual({ cursor: ["Credits"] })
    expect("hiddenOverviewProgressLines" in normalized).toBe(false)
  })

  it("migrates hidden Luna Reserve Wk prefs onto Luna Reserve", () => {
    const plugins: PluginMeta[] = [
      {
        id: "codex",
        name: "Codex",
        iconUrl: "",
        lines: [
          { type: "progress", label: "Session", scope: "overview" },
          { type: "progress", label: "Weekly", scope: "overview" },
          { type: "progress", label: "Luna Reserve", scope: "overview" },
        ],
      },
    ]

    const normalized = normalizePluginSettings(
      {
        order: ["codex"],
        disabled: [],
        hiddenOverviewProgressLines: {
          codex: ["Luna Reserve Wk"],
        },
      },
      plugins
    )

    expect(normalized.visibleOverviewProgressLines).toEqual({
      codex: ["Session", "Weekly"],
    })
  })

  it("prefers an explicit visible set over legacy hidden prefs", () => {
    const plugins: PluginMeta[] = [
      {
        id: "cursor",
        name: "Cursor",
        iconUrl: "",
        lines: [
          { type: "progress", label: "Credits", scope: "overview" },
          { type: "progress", label: "Cursor", scope: "overview" },
        ],
      },
    ]

    const normalized = normalizePluginSettings(
      {
        order: ["cursor"],
        disabled: [],
        hiddenOverviewProgressLines: { cursor: ["Cursor"] },
        visibleOverviewProgressLines: { cursor: ["Credits", "Cursor"] },
      },
      plugins
    )

    expect(normalized.visibleOverviewProgressLines).toEqual({ cursor: ["Credits", "Cursor"] })
    expect("hiddenOverviewProgressLines" in normalized).toBe(false)
  })

  it("migrates legacy hidden statistics into visible sets", () => {
    const plugins: PluginMeta[] = [
      {
        id: "cursor",
        name: "Cursor",
        iconUrl: "",
        lines: [
          { type: "progress", label: "Credits", scope: "overview" },
          { type: "text", label: "Extra", scope: "overview" },
        ],
      },
    ]

    const normalized = normalizePluginSettings(
      {
        order: ["cursor"],
        disabled: [],
        hiddenOverviewStatistics: ["cursor"],
      },
      plugins
    )

    expect(normalized.visibleOverviewProgressLines).toEqual({ cursor: ["Credits"] })
    expect("hiddenOverviewStatistics" in normalized).toBe(false)
  })

  it("auto-disables new non-default plugins", () => {
    const plugins: PluginMeta[] = [
      { id: "claude", name: "Claude", iconUrl: "", lines: [] },
      { id: "copilot", name: "Copilot", iconUrl: "", lines: [] },
      { id: "openrouter", name: "OpenRouter", iconUrl: "", lines: [] },
    ]
    const result = normalizePluginSettings({ order: [], disabled: [] }, plugins)
    expect(result.order).toEqual(["claude", "copilot", "openrouter"])
    expect(result.disabled).toEqual(["copilot", "openrouter"])
    expect("hiddenOverviewProgressLines" in result).toBe(false)
    expect("visibleOverviewProgressLines" in result).toBe(false)
  })

  it("compares settings equality", () => {
    const a = { order: ["a"], disabled: [] }
    const b = { order: ["a"], disabled: [] }
    const c = { order: ["b"], disabled: [] }
    const d = {
      order: ["a"],
      disabled: [],
      visibleOverviewProgressLines: { a: ["Monthly"] },
    }
    const e = {
      order: ["a"],
      disabled: [],
      visibleOverviewProgressLines: { a: ["Monthly"] },
    }
    const f = {
      order: ["a"],
      disabled: [],
      visibleOverviewProgressLines: { a: ["Monthly"] },
    }
    const g = {
      order: ["a"],
      disabled: [],
      visibleOverviewProgressLines: { a: ["Monthly"] },
    }
    expect(arePluginSettingsEqual(a, b)).toBe(true)
    expect(arePluginSettingsEqual(a, c)).toBe(false)
    expect(arePluginSettingsEqual(d, e)).toBe(true)
    expect(arePluginSettingsEqual(a, d)).toBe(false)
    expect(arePluginSettingsEqual(f, g)).toBe(true)
    expect(arePluginSettingsEqual(a, f)).toBe(false)
    const h = {
      order: ["a"],
      disabled: [],
      windowStarterByPlugin: { a: { enabled: false } },
    }
    const i = {
      order: ["a"],
      disabled: [],
      windowStarterByPlugin: { a: { enabled: false } },
    }
    const j = {
      order: ["a"],
      disabled: [],
      windowStarterByPlugin: { a: { runnerId: "pi" } },
    }
    expect(arePluginSettingsEqual(h, i)).toBe(true)
    expect(arePluginSettingsEqual(h, j)).toBe(false)
    expect(arePluginSettingsEqual(a, h)).toBe(false)
    expect(
      arePluginSettingsEqual(
        { order: ["a"], disabled: [], antigravityAgyAutoWake: true },
        { order: ["a"], disabled: [], antigravityAgyAutoWake: true },
      ),
    ).toBe(true)
    expect(
      arePluginSettingsEqual(
        { order: ["a"], disabled: [], grokAutoWake: true },
        { order: ["a"], disabled: [], grokAutoWake: true },
      ),
    ).toBe(true)
    expect(
      arePluginSettingsEqual(
        { order: ["a"], disabled: [], grokAutoWake: true },
        { order: ["a"], disabled: [] },
      ),
    ).toBe(false)
  })

  it("loads windowStarterByPlugin overrides", async () => {
    storeState.set("plugins", {
      order: ["claude"],
      disabled: [],
      windowStarterByPlugin: {
        claude: { enabled: false, runnerId: "claude" },
        zai: { runnerId: "pi", windows: { session: { enabled: true } } },
        bad: "nope",
      },
    })
    await expect(loadPluginSettings()).resolves.toEqual({
      order: ["claude"],
      disabled: [],
      windowStarterByPlugin: {
        claude: { enabled: false, runnerId: "claude" },
        zai: { runnerId: "pi", windows: { session: { enabled: true } } },
      },
    })
  })

  it("loads grokAutoWake when true and drops false", async () => {
    storeState.set("plugins", {
      order: ["grok"],
      disabled: [],
      grokAutoWake: true,
    })
    await expect(loadPluginSettings()).resolves.toEqual({
      order: ["grok"],
      disabled: [],
      grokAutoWake: true,
    })
    storeState.set("plugins", {
      order: ["grok"],
      disabled: [],
      grokAutoWake: false,
    })
    await expect(loadPluginSettings()).resolves.toEqual({
      order: ["grok"],
      disabled: [],
    })
  })

  it("loads antigravityAgyAutoWake when true and drops false", async () => {
    storeState.set("plugins", {
      order: ["antigravity"],
      disabled: [],
      antigravityAgyAutoWake: true,
    })
    await expect(loadPluginSettings()).resolves.toEqual({
      order: ["antigravity"],
      disabled: [],
      antigravityAgyAutoWake: true,
    })
    storeState.set("plugins", {
      order: ["antigravity"],
      disabled: [],
      antigravityAgyAutoWake: false,
    })
    await expect(loadPluginSettings()).resolves.toEqual({
      order: ["antigravity"],
      disabled: [],
    })
  })

  it("returns enabled plugin ids", () => {
    expect(getEnabledPluginIds({ order: ["a", "b"], disabled: ["b"] })).toEqual(["a"])
  })

  it("loads default auto-update interval when missing", async () => {
    await expect(loadAutoUpdateInterval()).resolves.toBe(DEFAULT_AUTO_UPDATE_INTERVAL)
  })

  it("loads stored auto-update interval", async () => {
    storeState.set("autoUpdateInterval", 15)
    await expect(loadAutoUpdateInterval()).resolves.toBe(15)
  })

  it("falls back to default when the stored interval is no longer offered", async () => {
    storeState.set("autoUpdateInterval", 30)
    await expect(loadAutoUpdateInterval()).resolves.toBe(DEFAULT_AUTO_UPDATE_INTERVAL)
  })

  it("saves auto-update interval", async () => {
    await saveAutoUpdateInterval(5)
    await expect(loadAutoUpdateInterval()).resolves.toBe(5)
  })

  it("loads default theme mode when missing", async () => {
    await expect(loadThemeMode()).resolves.toBe(DEFAULT_THEME_MODE)
  })

  it("loads stored theme mode", async () => {
    storeState.set("themeMode", "dark")
    await expect(loadThemeMode()).resolves.toBe("dark")
  })

  it("saves theme mode", async () => {
    await saveThemeMode("light")
    await expect(loadThemeMode()).resolves.toBe("light")
  })

  it("falls back to default for invalid theme mode", async () => {
    storeState.set("themeMode", "invalid")
    await expect(loadThemeMode()).resolves.toBe(DEFAULT_THEME_MODE)
  })

  it("loads default display mode when missing", async () => {
    await expect(loadDisplayMode()).resolves.toBe(DEFAULT_DISPLAY_MODE)
  })

  it("loads stored display mode", async () => {
    storeState.set("displayMode", "left")
    await expect(loadDisplayMode()).resolves.toBe("left")
  })

  it("saves display mode", async () => {
    await saveDisplayMode("left")
    await expect(loadDisplayMode()).resolves.toBe("left")
  })

  it("falls back to default for invalid display mode", async () => {
    storeState.set("displayMode", "invalid")
    await expect(loadDisplayMode()).resolves.toBe(DEFAULT_DISPLAY_MODE)
  })

  it("loads default reset timer display mode when missing", async () => {
    await expect(loadResetTimerDisplayMode()).resolves.toBe(DEFAULT_RESET_TIMER_DISPLAY_MODE)
  })

  it("loads stored reset timer display mode", async () => {
    storeState.set("resetTimerDisplayMode", "absolute")
    await expect(loadResetTimerDisplayMode()).resolves.toBe("absolute")
  })

  it("saves reset timer display mode", async () => {
    await saveResetTimerDisplayMode("relative")
    await expect(loadResetTimerDisplayMode()).resolves.toBe("relative")
  })

  it("falls back to default for invalid reset timer display mode", async () => {
    storeState.set("resetTimerDisplayMode", "invalid")
    await expect(loadResetTimerDisplayMode()).resolves.toBe(DEFAULT_RESET_TIMER_DISPLAY_MODE)
  })

  it("loads default crossing-go remaining minutes when missing", async () => {
    await expect(loadCrossingGoRemainingMinutes()).resolves.toBe(
      DEFAULT_CROSSING_GO_REMAINING_MINUTES,
    )
  })

  it("loads stored crossing-go remaining minutes", async () => {
    storeState.set("crossingGoRemainingMinutes", 90)
    await expect(loadCrossingGoRemainingMinutes()).resolves.toBe(90)
  })

  it("saves crossing-go remaining minutes", async () => {
    await saveCrossingGoRemainingMinutes(30)
    await expect(loadCrossingGoRemainingMinutes()).resolves.toBe(30)
  })

  it("falls back to default for invalid crossing-go remaining minutes", async () => {
    storeState.set("crossingGoRemainingMinutes", 300)
    await expect(loadCrossingGoRemainingMinutes()).resolves.toBe(
      DEFAULT_CROSSING_GO_REMAINING_MINUTES,
    )
    storeState.set("crossingGoRemainingMinutes", "60")
    await expect(loadCrossingGoRemainingMinutes()).resolves.toBe(
      DEFAULT_CROSSING_GO_REMAINING_MINUTES,
    )
  })

  it("converts crossing-go remaining minutes to milliseconds", () => {
    expect(crossingGoRemainingMs(30)).toBe(30 * 60_000)
    expect(crossingGoRemainingMs(60)).toBe(60 * 60_000)
    expect(crossingGoRemainingMs(90)).toBe(90 * 60_000)
    expect(crossingGoRemainingMs(120)).toBe(120 * 60_000)
  })

  it("loads leftover notify enabled as on when missing", async () => {
    await expect(loadLeftoverNotifyEnabled()).resolves.toBe(DEFAULT_LEFTOVER_NOTIFY_ENABLED)
    expect(DEFAULT_LEFTOVER_NOTIFY_ENABLED).toBe(true)
  })

  it("loads and saves leftover notify enabled", async () => {
    storeState.set("leftoverNotifyEnabled", false)
    await expect(loadLeftoverNotifyEnabled()).resolves.toBe(false)
    await saveLeftoverNotifyEnabled(true)
    await expect(loadLeftoverNotifyEnabled()).resolves.toBe(true)
  })

  it("falls back to default for invalid leftover notify enabled", async () => {
    storeState.set("leftoverNotifyEnabled", "false")
    await expect(loadLeftoverNotifyEnabled()).resolves.toBe(DEFAULT_LEFTOVER_NOTIFY_ENABLED)
  })

  it("migrates and removes legacy tray settings keys", async () => {
    storeState.set("trayIconStyle", "provider")
    storeState.set("trayShowPercentage", false)

    await migrateLegacyTraySettings()

    expect(storeState.has("trayIconStyle")).toBe(false)
    expect(storeState.has("trayShowPercentage")).toBe(false)
  })

  it("drops a stale menubarIconStyle key during tray migration", async () => {
    storeState.set("menubarIconStyle", "bars")

    await migrateLegacyTraySettings()

    expect(storeState.has("menubarIconStyle")).toBe(false)
    expect(storeDeleteMock).toHaveBeenCalledWith("menubarIconStyle")
  })

  it("skips legacy tray migration when keys are absent", async () => {
    await expect(migrateLegacyTraySettings()).resolves.toBeUndefined()
    expect(storeState.has("trayIconStyle")).toBe(false)
    expect(storeState.has("trayShowPercentage")).toBe(false)
    expect(storeDeleteMock).not.toHaveBeenCalled()
    expect(storeSaveMock).not.toHaveBeenCalled()
  })

  it("migrates when only one legacy tray key is present", async () => {
    storeState.set("trayShowPercentage", true)

    await migrateLegacyTraySettings()

    expect(storeState.has("trayShowPercentage")).toBe(false)
    expect(storeDeleteMock).toHaveBeenCalledWith("trayShowPercentage")
    expect(storeSaveMock).toHaveBeenCalledTimes(1)
  })

  it("falls back to nulling legacy keys if delete is unavailable", async () => {
    const { LazyStore } = await import("@tauri-apps/plugin-store")
    const prototype = LazyStore.prototype as { delete?: (key: string) => Promise<void> }
    const originalDelete = prototype.delete

    // Simulate older store implementation with no delete() method.
    prototype.delete = undefined
    storeState.set("trayIconStyle", "provider")

    try {
      await migrateLegacyTraySettings()
    } finally {
      prototype.delete = originalDelete
    }

    expect(storeDeleteMock).not.toHaveBeenCalled()
    expect(storeState.get("trayIconStyle")).toBeNull()
    expect(storeSaveMock).toHaveBeenCalledTimes(1)
  })

  it("loads default global shortcut when missing", async () => {
    await expect(loadGlobalShortcut()).resolves.toBe(DEFAULT_GLOBAL_SHORTCUT)
  })

  it("loads stored global shortcut values", async () => {
    storeState.set("globalShortcut", "CommandOrControl+Shift+O")
    await expect(loadGlobalShortcut()).resolves.toBe("CommandOrControl+Shift+O")

    storeState.set("globalShortcut", null)
    await expect(loadGlobalShortcut()).resolves.toBe(null)
  })

  it("falls back to default for invalid global shortcut values", async () => {
    storeState.set("globalShortcut", 1234)
    await expect(loadGlobalShortcut()).resolves.toBe(DEFAULT_GLOBAL_SHORTCUT)
  })

  it("saves global shortcut values", async () => {
    await saveGlobalShortcut("CommandOrControl+Shift+O")
    await expect(loadGlobalShortcut()).resolves.toBe("CommandOrControl+Shift+O")
  })

  it("loads default start on login when missing", async () => {
    await expect(loadStartOnLogin()).resolves.toBe(DEFAULT_START_ON_LOGIN)
  })

  it("loads stored start on login value", async () => {
    storeState.set("startOnLogin", true)
    await expect(loadStartOnLogin()).resolves.toBe(true)
  })

  it("saves start on login value", async () => {
    await saveStartOnLogin(true)
    await expect(loadStartOnLogin()).resolves.toBe(true)
  })

  it("falls back to default for invalid start on login value", async () => {
    storeState.set("startOnLogin", "invalid")
    await expect(loadStartOnLogin()).resolves.toBe(DEFAULT_START_ON_LOGIN)
  })

  it("loads default window starter enabled when missing", async () => {
    await expect(loadWindowStarterEnabled()).resolves.toBe(DEFAULT_WINDOW_STARTER_ENABLED)
    expect(DEFAULT_WINDOW_STARTER_ENABLED).toBe(false)
  })

  it("loads stored window starter enabled value", async () => {
    storeState.set("windowStarterEnabled", true)
    await expect(loadWindowStarterEnabled()).resolves.toBe(true)
  })

  it("saves window starter enabled value", async () => {
    await saveWindowStarterEnabled(true)
    await expect(loadWindowStarterEnabled()).resolves.toBe(true)
  })

  it("falls back to default for invalid window starter enabled value", async () => {
    storeState.set("windowStarterEnabled", "invalid")
    await expect(loadWindowStarterEnabled()).resolves.toBe(DEFAULT_WINDOW_STARTER_ENABLED)
  })

  it("loads default timeline card visibility when missing", async () => {
    await expect(loadTimelineCardVisible()).resolves.toBe(DEFAULT_TIMELINE_CARD_VISIBLE)
    expect(DEFAULT_TIMELINE_CARD_VISIBLE).toBe(true)
  })

  it("loads stored timeline card visibility", async () => {
    storeState.set("timelineCardVisible", false)
    await expect(loadTimelineCardVisible()).resolves.toBe(false)
  })

  it("saves timeline card visibility", async () => {
    await saveTimelineCardVisible(false)
    await expect(loadTimelineCardVisible()).resolves.toBe(false)
  })

  it("falls back to default for invalid timeline card visibility", async () => {
    storeState.set("timelineCardVisible", "invalid")
    await expect(loadTimelineCardVisible()).resolves.toBe(DEFAULT_TIMELINE_CARD_VISIBLE)
  })

  it("loads default timeline card rows when missing", async () => {
    await expect(loadTimelineCardRows()).resolves.toEqual(DEFAULT_TIMELINE_CARD_ROWS)
  })

  it("loads stored timeline card rows including an empty list", async () => {
    storeState.set("timelineCardRows", ["weekly"])
    await expect(loadTimelineCardRows()).resolves.toEqual(["weekly"])
    storeState.set("timelineCardRows", [])
    await expect(loadTimelineCardRows()).resolves.toEqual([])
  })

  it("saves timeline card rows", async () => {
    await saveTimelineCardRows(["weekly"])
    await expect(loadTimelineCardRows()).resolves.toEqual(["weekly"])
  })

  it("falls back to default for a non-array timeline card rows value", async () => {
    storeState.set("timelineCardRows", "invalid")
    await expect(loadTimelineCardRows()).resolves.toEqual(DEFAULT_TIMELINE_CARD_ROWS)
  })

  it("drops unknown timeline card row ids", () => {
    expect(normalizeTimelineCardRows(["weekly", "nope", "five-hour", "weekly"])).toEqual([
      "weekly",
      "five-hour",
    ])
  })
})

const CLAUDE_STARTER: WindowStarterCapability = {
  enabledByDefault: true,
  defaultRunner: "claude",
  allowedRunners: ["claude"],
  windows: [{ id: "session", line: "Session", weeklyLine: "Weekly" }],
}

const ZAI_STARTER: WindowStarterCapability = {
  enabledByDefault: true,
  defaultRunner: "zcode",
  allowedRunners: ["zcode", "opencode", "hermes", "pi"],
  windows: [{ id: "session", line: "Session", weeklyLine: "Weekly" }],
}

const ANTIGRAVITY_STARTER: WindowStarterCapability = {
  enabledByDefault: false,
  defaultRunner: "agy",
  allowedRunners: ["agy"],
  windows: [
    { id: "session", line: "Session", weeklyLine: "Weekly", enabledByDefault: false },
    { id: "claude", line: "Claude", weeklyLine: "Claude Wk", enabledByDefault: false },
  ],
}

describe("windowStarterByPlugin helpers", () => {
  it("uses plugin defaults when the override is absent", () => {
    expect(effectiveWindowStarterRunner(CLAUDE_STARTER)).toBe("claude")
    expect(effectiveWindowStarterEnabled(CLAUDE_STARTER, "session")).toBe(true)
    expect(effectiveWindowStarterEnabled(ANTIGRAVITY_STARTER, "session")).toBe(false)
    expect(effectiveWindowStarterEnabled(ANTIGRAVITY_STARTER, "claude")).toBe(false)
  })

  it("applies stored participation and runner overrides", () => {
    expect(effectiveWindowStarterEnabled(CLAUDE_STARTER, "session", { enabled: false })).toBe(false)
    expect(effectiveWindowStarterRunner(ZAI_STARTER, { runnerId: "pi" })).toBe("pi")
    expect(
      effectiveWindowStarterEnabled(ANTIGRAVITY_STARTER, "session", {
        windows: { session: { enabled: true } },
      }),
    ).toBe(true)
    expect(
      effectiveWindowStarterEnabled(ANTIGRAVITY_STARTER, "claude", {
        windows: { session: { enabled: true } },
      }),
    ).toBe(false)
  })

  it("ignores a stored runner id outside allowedRunners", () => {
    expect(effectiveWindowStarterRunner(ZAI_STARTER, { runnerId: "claude" })).toBe("zcode")
    expect(effectiveWindowStarterRunner(CLAUDE_STARTER, { runnerId: "opencode" })).toBe("claude")
  })

  it("prunes keys that match plugin defaults", () => {
    expect(pruneWindowStarterOverride(CLAUDE_STARTER, { enabled: true, runnerId: "claude" })).toBeUndefined()
    expect(pruneWindowStarterOverride(CLAUDE_STARTER, { enabled: false })).toEqual({ enabled: false })
    expect(pruneWindowStarterOverride(ZAI_STARTER, { runnerId: "pi" })).toEqual({ runnerId: "pi" })
    expect(pruneWindowStarterOverride(ZAI_STARTER, { runnerId: "claude" })).toBeUndefined()
    expect(
      pruneWindowStarterOverride(ANTIGRAVITY_STARTER, {
        windows: { session: { enabled: false }, claude: { enabled: true } },
      }),
    ).toEqual({ windows: { claude: { enabled: true } } })
  })

  it("drops Window Starter overrides for plugins without the capability", () => {
    const plugins: PluginMeta[] = [
      { id: "claude", name: "Claude", iconUrl: "", lines: [], windowStarter: CLAUDE_STARTER },
      { id: "opencode-go", name: "OpenCode Go", iconUrl: "", lines: [] },
    ]
    const normalized = normalizePluginSettings(
      {
        order: ["claude", "opencode-go"],
        disabled: [],
        windowStarterByPlugin: {
          claude: { enabled: false },
          "opencode-go": { enabled: true, runnerId: "opencode" },
        },
      },
      plugins,
    )
    expect(normalized.windowStarterByPlugin).toEqual({ claude: { enabled: false } })
  })

  it("keeps antigravityAgyAutoWake only when true", () => {
    const plugins: PluginMeta[] = [
      { id: "antigravity", name: "Antigravity", iconUrl: "", lines: [] },
    ]
    expect(
      normalizePluginSettings(
        { order: ["antigravity"], disabled: [], antigravityAgyAutoWake: true },
        plugins,
      ).antigravityAgyAutoWake,
    ).toBe(true)
    expect(
      normalizePluginSettings(
        { order: ["antigravity"], disabled: [], antigravityAgyAutoWake: false },
        plugins,
      ).antigravityAgyAutoWake,
    ).toBeUndefined()
  })

  it("keeps grokAutoWake only when true", () => {
    const plugins: PluginMeta[] = [
      { id: "grok", name: "Grok", iconUrl: "", lines: [] },
    ]
    expect(
      normalizePluginSettings(
        { order: ["grok"], disabled: [], grokAutoWake: true },
        plugins,
      ).grokAutoWake,
    ).toBe(true)
    expect(
      normalizePluginSettings(
        { order: ["grok"], disabled: [], grokAutoWake: false },
        plugins,
      ).grokAutoWake,
    ).toBeUndefined()
  })
})
