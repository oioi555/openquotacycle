import { LazyStore } from "@tauri-apps/plugin-store";
import type { PluginMeta, WindowStarterCapability } from "@/lib/plugin-types";

// Refresh cooldown duration in milliseconds (5 minutes)
export const REFRESH_COOLDOWN_MS = 300_000;

// Spec: persist plugin order + disabled list; new plugins append, default disabled unless in DEFAULT_ENABLED_PLUGINS.
export type WindowStarterWindowOverride = {
  enabled?: boolean
}

export type WindowStarterPluginOverride = {
  enabled?: boolean
  runnerId?: string
  windows?: Record<string, WindowStarterWindowOverride>
}

export type WindowStarterByPlugin = Record<string, WindowStarterPluginOverride>

export type PluginSettings = {
  order: string[];
  disabled: string[];
  /** Explicit visible progress/text line sets per plugin. Absent = manifest defaults. */
  visibleOverviewProgressLines?: HiddenOverviewProgressLines;
  /** Per-plugin display order of overview progress line labels (align-ui-with-openusage-v07). */
  overviewLineOrder?: HiddenOverviewProgressLines;
  /** Window Starter participation/runner/window overrides. Absent key = plugin defaults. */
  windowStarterByPlugin?: WindowStarterByPlugin;
  /** Antigravity: spawn `agy -p /quota --print-timeout 1m` when quota is stale or credentials expired. Default off. */
  antigravityAgyAutoWake?: boolean;
  /** Grok: spawn `grok models` when credentials expired. Default off. */
  grokAutoWake?: boolean;
};

export type HiddenOverviewProgressLines = Record<string, string[]>;

/** Legacy opt-out prefs plus current settings, as read from storage.
 * `normalizePluginSettings` migrates the legacy keys and never writes them. */
export type StoredPluginSettings = PluginSettings & {
  hiddenOverviewProgressLines?: HiddenOverviewProgressLines;
  hiddenOverviewStatistics?: string[];
};

export type OverviewProgressBarOption = {
  label: string;
  checked: boolean;
};

export type AutoUpdateIntervalMinutes = 5 | 15;

export type ThemeMode = "system" | "light" | "dark";

export type DisplayMode = "used" | "left";

export type ResetTimerDisplayMode = "relative" | "absolute";

/** Remaining minutes before a 5-hour reset when leftover becomes crossing-go. */
export type CrossingGoRemainingMinutes = 30 | 60 | 90 | 120;

export type GlobalShortcut = string | null;

const SETTINGS_STORE_PATH = "settings.json";
const PLUGIN_SETTINGS_KEY = "plugins";
const AUTO_UPDATE_SETTINGS_KEY = "autoUpdateInterval";
const THEME_MODE_KEY = "themeMode";
const DISPLAY_MODE_KEY = "displayMode";
const RESET_TIMER_DISPLAY_MODE_KEY = "resetTimerDisplayMode";
const CROSSING_GO_REMAINING_MINUTES_KEY = "crossingGoRemainingMinutes";
const LEFTOVER_NOTIFY_ENABLED_KEY = "leftoverNotifyEnabled";
const LEGACY_TRAY_ICON_STYLE_KEY = "trayIconStyle";
const LEGACY_TRAY_SHOW_PERCENTAGE_KEY = "trayShowPercentage";
const MENUBAR_ICON_STYLE_KEY = "menubarIconStyle";
const GLOBAL_SHORTCUT_KEY = "globalShortcut";
const START_ON_LOGIN_KEY = "startOnLogin";
const WINDOW_STARTER_ENABLED_KEY = "windowStarterEnabled";
const TIMELINE_CARD_VISIBLE_KEY = "timelineCardVisible";
const TIMELINE_CARD_ROWS_KEY = "timelineCardRows";

export const DEFAULT_AUTO_UPDATE_INTERVAL: AutoUpdateIntervalMinutes = 5;
export const DEFAULT_THEME_MODE: ThemeMode = "system";
export const DEFAULT_DISPLAY_MODE: DisplayMode = "left";
export const DEFAULT_RESET_TIMER_DISPLAY_MODE: ResetTimerDisplayMode = "relative";
export const DEFAULT_CROSSING_GO_REMAINING_MINUTES: CrossingGoRemainingMinutes = 60;
export const DEFAULT_LEFTOVER_NOTIFY_ENABLED = true;
export const DEFAULT_GLOBAL_SHORTCUT: GlobalShortcut = null;
export const DEFAULT_START_ON_LOGIN = false;
export const DEFAULT_WINDOW_STARTER_ENABLED = false;
export const DEFAULT_TIMELINE_CARD_VISIBLE = true;
export const TIMELINE_CARD_ROW_IDS = ["five-hour", "weekly"] as const;
export type TimelineCardRowId = (typeof TIMELINE_CARD_ROW_IDS)[number];
export const DEFAULT_TIMELINE_CARD_ROWS: TimelineCardRowId[] = ["five-hour", "weekly"];

const AUTO_UPDATE_INTERVALS: AutoUpdateIntervalMinutes[] = [5, 15];
const THEME_MODES: ThemeMode[] = ["system", "light", "dark"];
const DISPLAY_MODES: DisplayMode[] = ["used", "left"];
const RESET_TIMER_DISPLAY_MODES: ResetTimerDisplayMode[] = ["relative", "absolute"];
const CROSSING_GO_REMAINING_MINUTES: CrossingGoRemainingMinutes[] = [30, 60, 90, 120];

export const AUTO_UPDATE_OPTIONS: { value: AutoUpdateIntervalMinutes; label: string }[] =
  AUTO_UPDATE_INTERVALS.map((value) => ({
    value,
    label: `${value} min`,
  }));

export const THEME_OPTIONS: { value: ThemeMode; label: string }[] =
  THEME_MODES.map((value) => ({
    value,
    label: value.charAt(0).toUpperCase() + value.slice(1),
  }));

export const DISPLAY_MODE_OPTIONS: { value: DisplayMode; label: string }[] = [
  { value: "left", label: "Left" },
  { value: "used", label: "Used" },
];

export const RESET_TIMER_DISPLAY_OPTIONS: { value: ResetTimerDisplayMode; label: string }[] = [
  { value: "relative", label: "Relative" },
  { value: "absolute", label: "Absolute" },
];

export const CROSSING_GO_REMAINING_OPTIONS: {
  value: CrossingGoRemainingMinutes;
  label: string;
}[] = [
  { value: 30, label: "Last 30 min" },
  { value: 60, label: "Last 1 hour" },
  { value: 90, label: "Last 1.5 hours" },
  { value: 120, label: "Last 2 hours" },
];

export function crossingGoRemainingMs(minutes: CrossingGoRemainingMinutes): number {
  return minutes * 60_000;
}

const store = new LazyStore(SETTINGS_STORE_PATH);

const DEFAULT_ENABLED_PLUGINS = new Set(["claude", "codex", "cursor"]);

export const DEFAULT_PLUGIN_SETTINGS: PluginSettings = {
  order: [],
  disabled: [],
};

/** Default-visible overview labels: lines marked `visibleByDefault`.
 * Unmarked progress and text lines default to On Demand. */
export function defaultVisibleOverviewLabels(plugin: {
  lines: PluginMeta["lines"];
}): string[] {
  return plugin.lines
    .filter(
      (line) =>
        (line.type === "progress" || line.type === "text") &&
        line.visibleByDefault === true,
    )
    .map((line) => line.label);
}

/** Effective visible labels: the stored explicit set, or manifest defaults. */
export function effectiveVisibleOverviewLabels(
  plugin: {
    lines: PluginMeta["lines"];
  },
  storedVisible?: string[],
): string[] {
  if (storedVisible !== undefined) return [...storedVisible];
  return defaultVisibleOverviewLabels(plugin);
}

/** Effective hidden labels (for surfaces that filter by hidden set). */
export function effectiveHiddenOverviewLabels(
  plugin: PluginMeta,
  storedVisible?: string[],
): string[] {
  const visibleSet = new Set(effectiveVisibleOverviewLabels(plugin, storedVisible));
  return plugin.lines
    .filter(
      (line) =>
        (line.type === "progress" || line.type === "text") && !visibleSet.has(line.label),
    )
    .map((line) => line.label);
}

export function getOverviewProgressBarOptions(
  plugin: PluginMeta,
  visibleLabels?: string[],
  lineOrder: string[] = []
): OverviewProgressBarOption[] {
  const visibleSet = new Set(effectiveVisibleOverviewLabels(plugin, visibleLabels));
  const metricLabels = plugin.lines
    .filter((line) => line.type === "progress" || line.type === "text")
    .map((line) => line.label);

  // Any metric line can be classified On-Demand (no mandatory first line).
  // Stored order wins; manifest order fills gaps.
  const orderIndex = new Map(lineOrder.map((label, index) => [label, index]));
  return metricLabels
    .map((label, index) => ({ label, manifestIndex: index }))
    .sort(
      (a, b) =>
        (orderIndex.get(a.label) ?? a.manifestIndex + metricLabels.length) -
        (orderIndex.get(b.label) ?? b.manifestIndex + metricLabels.length),
    )
    .map(({ label }) => ({
      label,
      checked: visibleSet.has(label),
    }));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function sanitizeWindowStarterByPlugin(value: unknown): WindowStarterByPlugin {
  if (!isRecord(value)) return {}
  const result: WindowStarterByPlugin = {}
  for (const [pluginId, raw] of Object.entries(value)) {
    if (!isRecord(raw)) continue
    const override: WindowStarterPluginOverride = {}
    if (typeof raw.enabled === "boolean") override.enabled = raw.enabled
    if (typeof raw.runnerId === "string" && raw.runnerId.trim()) {
      override.runnerId = raw.runnerId.trim()
    }
    if (isRecord(raw.windows)) {
      const windows: Record<string, WindowStarterWindowOverride> = {}
      for (const [windowId, windowRaw] of Object.entries(raw.windows)) {
        if (!isRecord(windowRaw)) continue
        if (typeof windowRaw.enabled === "boolean") {
          windows[windowId] = { enabled: windowRaw.enabled }
        }
      }
      if (Object.keys(windows).length > 0) override.windows = windows
    }
    if (
      override.enabled !== undefined ||
      override.runnerId !== undefined ||
      override.windows !== undefined
    ) {
      result[pluginId] = override
    }
  }
  return result
}

export function effectiveWindowStarterRunner(
  capability: WindowStarterCapability,
  override?: WindowStarterPluginOverride,
): string {
  const stored = override?.runnerId
  if (stored && capability.allowedRunners.includes(stored)) return stored
  return capability.defaultRunner
}

export function effectiveWindowStarterEnabled(
  capability: WindowStarterCapability,
  windowId: string,
  override?: WindowStarterPluginOverride,
): boolean {
  const windowOverride = override?.windows?.[windowId]?.enabled
  if (windowOverride !== undefined) return windowOverride
  const declared = capability.windows.find((window) => window.id === windowId)
  if (declared?.enabledByDefault !== undefined) return declared.enabledByDefault
  if (override?.enabled !== undefined) return override.enabled
  return capability.enabledByDefault
}

/** Drop keys that match plugin defaults so absent key = defaults. */
export function pruneWindowStarterOverride(
  capability: WindowStarterCapability,
  override: WindowStarterPluginOverride,
): WindowStarterPluginOverride | undefined {
  const next: WindowStarterPluginOverride = {}
  if (
    override.runnerId &&
    override.runnerId !== capability.defaultRunner &&
    capability.allowedRunners.includes(override.runnerId)
  ) {
    next.runnerId = override.runnerId
  }
  if (override.enabled !== undefined && override.enabled !== capability.enabledByDefault) {
    next.enabled = override.enabled
  }
  if (override.windows) {
    const windows: Record<string, WindowStarterWindowOverride> = {}
    for (const declared of capability.windows) {
      const stored = override.windows[declared.id]?.enabled
      if (stored === undefined) continue
      const defaultEnabled = declared.enabledByDefault ?? capability.enabledByDefault
      if (stored !== defaultEnabled) {
        windows[declared.id] = { enabled: stored }
      }
    }
    if (Object.keys(windows).length > 0) next.windows = windows
  }
  if (
    next.enabled === undefined &&
    next.runnerId === undefined &&
    next.windows === undefined
  ) {
    return undefined
  }
  return next
}

/** Renamed quota labels: stored hidden-line prefs under an old name keep applying. */
const RENAMED_QUOTA_LABELS: Record<string, string> = {
  "Cursor Models": "Cursor",
  "Other Models": "Other",
  "Web Searches": "Tool calls",
  "Claude Weekly": "Claude Wk",
  "Spark Weekly": "Spark Wk",
  "Luna Reserve Wk": "Luna Reserve",
  "Daily quota": "Daily",
  "Weekly quota": "Weekly",
  "5h Rate Limit": "5h Limit",
  "Free Tool Calls": "Free Calls",
};

function sanitizeHiddenOverviewProgressLines(value: unknown): HiddenOverviewProgressLines {
  if (!isRecord(value)) return {};

  const result: HiddenOverviewProgressLines = {};
  for (const [pluginId, labels] of Object.entries(value)) {
    if (!Array.isArray(labels)) continue;
    const validLabels = labels.filter(
      (label): label is string => typeof label === "string"
    ).map((label) => RENAMED_QUOTA_LABELS[label] ?? label);
    if (validLabels.length > 0) {
      result[pluginId] = Array.from(new Set(validLabels));
    }
  }
  return result;
}

function sanitizeHiddenOverviewStatistics(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(
    value.filter((pluginId): pluginId is string => typeof pluginId === "string")
  ));
}

export async function loadPluginSettings(): Promise<StoredPluginSettings> {
  const stored = await store.get<unknown>(PLUGIN_SETTINGS_KEY);
  if (!isRecord(stored)) {
    return { ...DEFAULT_PLUGIN_SETTINGS };
  }
  const hiddenOverviewStatistics = sanitizeHiddenOverviewStatistics(
    stored.hiddenOverviewStatistics
  );
  const overviewLineOrder = sanitizeHiddenOverviewProgressLines(stored.overviewLineOrder);
  const visibleOverviewProgressLines = sanitizeHiddenOverviewProgressLines(
    stored.visibleOverviewProgressLines
  );
  const legacyHidden = sanitizeHiddenOverviewProgressLines(
    stored.hiddenOverviewProgressLines
  );
  const windowStarterByPlugin = sanitizeWindowStarterByPlugin(
    stored.windowStarterByPlugin,
  );
  const antigravityAgyAutoWake = stored.antigravityAgyAutoWake === true;
  const grokAutoWake = stored.grokAutoWake === true;
  return {
    order: Array.isArray(stored.order)
      ? stored.order.filter((id): id is string => typeof id === "string")
      : [],
    disabled: Array.isArray(stored.disabled)
      ? stored.disabled.filter((id): id is string => typeof id === "string")
      : [],
    ...(Object.keys(visibleOverviewProgressLines).length > 0 ? { visibleOverviewProgressLines } : {}),
    ...(Object.keys(legacyHidden).length > 0
      ? { hiddenOverviewProgressLines: legacyHidden }
      : {}),
    ...(hiddenOverviewStatistics.length > 0 ? { hiddenOverviewStatistics } : {}),
    ...(Object.keys(overviewLineOrder).length > 0 ? { overviewLineOrder } : {}),
    ...(Object.keys(windowStarterByPlugin).length > 0 ? { windowStarterByPlugin } : {}),
    ...(antigravityAgyAutoWake ? { antigravityAgyAutoWake: true } : {}),
    ...(grokAutoWake ? { grokAutoWake: true } : {}),
  };
}

export async function savePluginSettings(settings: PluginSettings): Promise<void> {
  await store.set(PLUGIN_SETTINGS_KEY, settings);
  await store.save();
}

function isAutoUpdateInterval(value: unknown): value is AutoUpdateIntervalMinutes {
  return (
    typeof value === "number" &&
    AUTO_UPDATE_INTERVALS.includes(value as AutoUpdateIntervalMinutes)
  );
}

export async function loadAutoUpdateInterval(): Promise<AutoUpdateIntervalMinutes> {
  const stored = await store.get<unknown>(AUTO_UPDATE_SETTINGS_KEY);
  if (isAutoUpdateInterval(stored)) return stored;
  return DEFAULT_AUTO_UPDATE_INTERVAL;
}

export async function saveAutoUpdateInterval(
  interval: AutoUpdateIntervalMinutes
): Promise<void> {
  await store.set(AUTO_UPDATE_SETTINGS_KEY, interval);
  await store.save();
}

export function normalizePluginSettings(
  settings: StoredPluginSettings,
  plugins: PluginMeta[]
): PluginSettings {
  const knownIds = plugins.map((plugin) => plugin.id);
  const knownSet = new Set(knownIds);

  const order: string[] = [];
  const seen = new Set<string>();
  for (const id of settings.order) {
    if (!knownSet.has(id) || seen.has(id)) continue;
    seen.add(id);
    order.push(id);
  }
  const newlyAdded: string[] = [];
  for (const id of knownIds) {
    if (!seen.has(id)) {
      seen.add(id);
      order.push(id);
      newlyAdded.push(id);
    }
  }

  const disabled = settings.disabled.filter((id) => knownSet.has(id));
  for (const id of newlyAdded) {
    if (!DEFAULT_ENABLED_PLUGINS.has(id) && !disabled.includes(id)) {
      disabled.push(id);
    }
  }
  const storedHidden = sanitizeHiddenOverviewProgressLines(
    settings.hiddenOverviewProgressLines
  );
  const storedVisible = sanitizeHiddenOverviewProgressLines(
    settings.visibleOverviewProgressLines
  );
  const storedHiddenStatistics = new Set(
    sanitizeHiddenOverviewStatistics(settings.hiddenOverviewStatistics)
  );
  const visibleOverviewProgressLines: HiddenOverviewProgressLines = {};
  for (const plugin of plugins) {
    const knownLabels = plugin.lines
      .filter((line) => line.type === "progress" || line.type === "text")
      .map((line) => line.label);
    // Without any stored input the key stays absent (= manifest defaults).
    // Legacy opt-out prefs migrate to explicit visible sets: everything known
    // minus the hidden labels. An explicit stored set always wins migration.
    // Legacy hidden statistics count as hiding every text line.
    const hasStoredInput =
      storedVisible[plugin.id] !== undefined ||
      storedHidden[plugin.id] !== undefined ||
      storedHiddenStatistics.has(plugin.id);
    if (!hasStoredInput) continue;
    const legacyHidden = new Set(storedHidden[plugin.id] ?? []);
    if (storedHiddenStatistics.has(plugin.id)) {
      for (const line of plugin.lines) {
        if (line.type === "text") legacyHidden.add(line.label);
      }
    }
    const visibleLabels = (
      storedVisible[plugin.id] ??
      knownLabels.filter((label) => !legacyHidden.has(label))
    ).filter((label) => knownLabels.includes(label));
    // Omit sets identical to manifest defaults (absent key = defaults).
    const defaults = defaultVisibleOverviewLabels(plugin);
    const same =
      visibleLabels.length === defaults.length &&
      visibleLabels.every((label) => defaults.includes(label));
    // Any progress line — including the first — may be classified On-Demand.
    if (!same) {
      visibleOverviewProgressLines[plugin.id] = visibleLabels;
    }
  }

  // Normalize stored line order: keep known labels in stored order, append
  // labels the manifest gained; drop entries that match manifest order.
  const storedOrder = sanitizeHiddenOverviewProgressLines(
    settings.overviewLineOrder
  );
  const overviewLineOrder: HiddenOverviewProgressLines = {};
  for (const plugin of plugins) {
    const manifestOrder = plugin.lines
      .filter((line) => line.type === "progress" || line.type === "text")
      .map((line) => line.label);
    const manifestSet = new Set(manifestOrder);
    const known = (storedOrder[plugin.id] ?? []).filter((label) =>
      manifestSet.has(label)
    );
    const missing = manifestOrder.filter((label) => !known.includes(label));
    const merged = [...known, ...missing];
    if (merged.some((label, index) => label !== manifestOrder[index])) {
      overviewLineOrder[plugin.id] = merged;
    }
  }

  const storedWindowStarter = sanitizeWindowStarterByPlugin(settings.windowStarterByPlugin);
  const windowStarterByPlugin: WindowStarterByPlugin = {};
  for (const plugin of plugins) {
    const override = storedWindowStarter[plugin.id];
    if (!override || !plugin.windowStarter) continue;
    const pruned = pruneWindowStarterOverride(plugin.windowStarter, override);
    if (pruned) windowStarterByPlugin[plugin.id] = pruned;
  }

  return {
    order,
    disabled,
    ...(Object.keys(visibleOverviewProgressLines).length > 0 ? { visibleOverviewProgressLines } : {}),
    ...(Object.keys(overviewLineOrder).length > 0 ? { overviewLineOrder } : {}),
    ...(Object.keys(windowStarterByPlugin).length > 0 ? { windowStarterByPlugin } : {}),
    ...(settings.antigravityAgyAutoWake === true ? { antigravityAgyAutoWake: true } : {}),
    ...(settings.grokAutoWake === true ? { grokAutoWake: true } : {}),
  };
}

export function arePluginSettingsEqual(
  a: PluginSettings,
  b: PluginSettings
): boolean {
  if (a.order.length !== b.order.length) return false;
  if (a.disabled.length !== b.disabled.length) return false;
  for (let i = 0; i < a.order.length; i += 1) {
    if (a.order[i] !== b.order[i]) return false;
  }
  for (let i = 0; i < a.disabled.length; i += 1) {
    if (a.disabled[i] !== b.disabled[i]) return false;
  }
  const aVisible = a.visibleOverviewProgressLines ?? {};
  const bVisible = b.visibleOverviewProgressLines ?? {};
  const aVisibleIds = Object.keys(aVisible);
  const bVisibleIds = Object.keys(bVisible);
  if (aVisibleIds.length !== bVisibleIds.length) return false;
  for (const pluginId of aVisibleIds) {
    const aLabels = new Set(aVisible[pluginId]);
    const bLabels = new Set(bVisible[pluginId] ?? []);
    if (aLabels.size !== bLabels.size) return false;
    for (const label of aLabels) {
      if (!bLabels.has(label)) return false;
    }
  }
  const aOrder = a.overviewLineOrder ?? {};
  const bOrder = b.overviewLineOrder ?? {};
  const aOrderIds = Object.keys(aOrder);
  const bOrderIds = Object.keys(bOrder);
  if (aOrderIds.length !== bOrderIds.length) return false;
  for (const pluginId of aOrderIds) {
    const aLabels = aOrder[pluginId] ?? [];
    const bLabels = bOrder[pluginId] ?? [];
    if (aLabels.length !== bLabels.length) return false;
    for (let i = 0; i < aLabels.length; i += 1) {
      if (aLabels[i] !== bLabels[i]) return false;
    }
  }
  const aStarter = a.windowStarterByPlugin ?? {};
  const bStarter = b.windowStarterByPlugin ?? {};
  const aStarterIds = Object.keys(aStarter);
  const bStarterIds = Object.keys(bStarter);
  if (aStarterIds.length !== bStarterIds.length) return false;
  for (const pluginId of aStarterIds) {
    const left = aStarter[pluginId];
    const right = bStarter[pluginId];
    if (!right) return false;
    if (left.enabled !== right.enabled) return false;
    if (left.runnerId !== right.runnerId) return false;
    const leftWindows = left.windows ?? {};
    const rightWindows = right.windows ?? {};
    const leftWindowIds = Object.keys(leftWindows);
    const rightWindowIds = Object.keys(rightWindows);
    if (leftWindowIds.length !== rightWindowIds.length) return false;
    for (const windowId of leftWindowIds) {
      if (leftWindows[windowId]?.enabled !== rightWindows[windowId]?.enabled) return false;
    }
  }
  if (Boolean(a.antigravityAgyAutoWake) !== Boolean(b.antigravityAgyAutoWake)) return false;
  if (Boolean(a.grokAutoWake) !== Boolean(b.grokAutoWake)) return false;
  return true;
}

function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === "string" && THEME_MODES.includes(value as ThemeMode);
}

export async function loadThemeMode(): Promise<ThemeMode> {
  const stored = await store.get<unknown>(THEME_MODE_KEY);
  if (isThemeMode(stored)) return stored;
  return DEFAULT_THEME_MODE;
}

export async function saveThemeMode(mode: ThemeMode): Promise<void> {
  await store.set(THEME_MODE_KEY, mode);
  await store.save();
}

function isDisplayMode(value: unknown): value is DisplayMode {
  return typeof value === "string" && DISPLAY_MODES.includes(value as DisplayMode);
}

export async function loadDisplayMode(): Promise<DisplayMode> {
  const stored = await store.get<unknown>(DISPLAY_MODE_KEY);
  if (isDisplayMode(stored)) return stored;
  return DEFAULT_DISPLAY_MODE;
}

export async function saveDisplayMode(mode: DisplayMode): Promise<void> {
  await store.set(DISPLAY_MODE_KEY, mode);
  await store.save();
}

function isResetTimerDisplayMode(value: unknown): value is ResetTimerDisplayMode {
  return (
    typeof value === "string" &&
    RESET_TIMER_DISPLAY_MODES.includes(value as ResetTimerDisplayMode)
  );
}

export async function loadResetTimerDisplayMode(): Promise<ResetTimerDisplayMode> {
  const stored = await store.get<unknown>(RESET_TIMER_DISPLAY_MODE_KEY);
  if (isResetTimerDisplayMode(stored)) return stored;
  return DEFAULT_RESET_TIMER_DISPLAY_MODE;
}

export async function saveResetTimerDisplayMode(mode: ResetTimerDisplayMode): Promise<void> {
  await store.set(RESET_TIMER_DISPLAY_MODE_KEY, mode);
  await store.save();
}

function isCrossingGoRemainingMinutes(value: unknown): value is CrossingGoRemainingMinutes {
  return (
    typeof value === "number" &&
    CROSSING_GO_REMAINING_MINUTES.includes(value as CrossingGoRemainingMinutes)
  );
}

export async function loadCrossingGoRemainingMinutes(): Promise<CrossingGoRemainingMinutes> {
  const stored = await store.get<unknown>(CROSSING_GO_REMAINING_MINUTES_KEY);
  if (isCrossingGoRemainingMinutes(stored)) return stored;
  return DEFAULT_CROSSING_GO_REMAINING_MINUTES;
}

export async function saveCrossingGoRemainingMinutes(
  minutes: CrossingGoRemainingMinutes,
): Promise<void> {
  await store.set(CROSSING_GO_REMAINING_MINUTES_KEY, minutes);
  await store.save();
}

export async function loadLeftoverNotifyEnabled(): Promise<boolean> {
  const stored = await store.get<unknown>(LEFTOVER_NOTIFY_ENABLED_KEY);
  if (typeof stored === "boolean") return stored;
  return DEFAULT_LEFTOVER_NOTIFY_ENABLED;
}

export async function saveLeftoverNotifyEnabled(value: boolean): Promise<void> {
  await store.set(LEFTOVER_NOTIFY_ENABLED_KEY, value);
  await store.save();
}

type LegacyStoreWithDelete = {
  delete?: (key: string) => Promise<void>;
};

async function deleteStoreKey(key: string): Promise<void> {
  const maybeDelete = (store as unknown as LegacyStoreWithDelete).delete;
  if (typeof maybeDelete === "function") {
    await maybeDelete.call(store, key);
    return;
  }
  // Fallback for store implementations without delete support.
  await store.set(key, null);
}

export async function migrateLegacyTraySettings(): Promise<void> {
  // The tray is a fixed app icon now: drop every tray-style key outright.
  const [legacyTrayStyle, legacyShowPercentage, menubarIconStyle] = await Promise.all([
    store.get<unknown>(LEGACY_TRAY_ICON_STYLE_KEY),
    store.get<unknown>(LEGACY_TRAY_SHOW_PERCENTAGE_KEY),
    store.get<unknown>(MENUBAR_ICON_STYLE_KEY),
  ]);

  const removals: Promise<void>[] = [];
  if (legacyTrayStyle != null) removals.push(deleteStoreKey(LEGACY_TRAY_ICON_STYLE_KEY));
  if (legacyShowPercentage != null) {
    removals.push(deleteStoreKey(LEGACY_TRAY_SHOW_PERCENTAGE_KEY));
  }
  if (menubarIconStyle != null) removals.push(deleteStoreKey(MENUBAR_ICON_STYLE_KEY));
  if (removals.length === 0) return;
  await Promise.all(removals);
  await store.save();
}

export function getEnabledPluginIds(settings: PluginSettings): string[] {
  const disabledSet = new Set(settings.disabled);
  return settings.order.filter((id) => !disabledSet.has(id));
}

function isGlobalShortcut(value: unknown): value is GlobalShortcut {
  if (value === null) return true;
  return typeof value === "string";
}

export async function loadGlobalShortcut(): Promise<GlobalShortcut> {
  const stored = await store.get<unknown>(GLOBAL_SHORTCUT_KEY);
  if (isGlobalShortcut(stored)) return stored;
  return DEFAULT_GLOBAL_SHORTCUT;
}

export async function saveGlobalShortcut(shortcut: GlobalShortcut): Promise<void> {
  await store.set(GLOBAL_SHORTCUT_KEY, shortcut);
  await store.save();
}

export async function loadStartOnLogin(): Promise<boolean> {
  const stored = await store.get<unknown>(START_ON_LOGIN_KEY);
  if (typeof stored === "boolean") return stored;
  return DEFAULT_START_ON_LOGIN;
}

export async function saveStartOnLogin(value: boolean): Promise<void> {
  await store.set(START_ON_LOGIN_KEY, value);
  await store.save();
}

export async function loadWindowStarterEnabled(): Promise<boolean> {
  const stored = await store.get<unknown>(WINDOW_STARTER_ENABLED_KEY);
  if (typeof stored === "boolean") return stored;
  return DEFAULT_WINDOW_STARTER_ENABLED;
}

export async function saveWindowStarterEnabled(value: boolean): Promise<void> {
  await store.set(WINDOW_STARTER_ENABLED_KEY, value);
  await store.save();
}

export async function loadTimelineCardVisible(): Promise<boolean> {
  const stored = await store.get<unknown>(TIMELINE_CARD_VISIBLE_KEY);
  if (typeof stored === "boolean") return stored;
  return DEFAULT_TIMELINE_CARD_VISIBLE;
}

export async function saveTimelineCardVisible(value: boolean): Promise<void> {
  await store.set(TIMELINE_CARD_VISIBLE_KEY, value);
  await store.save();
}

export function normalizeTimelineCardRows(value: unknown): TimelineCardRowId[] {
  if (!Array.isArray(value)) return [...DEFAULT_TIMELINE_CARD_ROWS];
  const seen = new Set<TimelineCardRowId>();
  const rows: TimelineCardRowId[] = [];
  for (const item of value) {
    if ((item === "five-hour" || item === "weekly") && !seen.has(item)) {
      seen.add(item);
      rows.push(item);
    }
  }
  return rows;
}

export async function loadTimelineCardRows(): Promise<TimelineCardRowId[]> {
  const stored = await store.get<unknown>(TIMELINE_CARD_ROWS_KEY);
  if (stored == null) return [...DEFAULT_TIMELINE_CARD_ROWS];
  return normalizeTimelineCardRows(stored);
}

export async function saveTimelineCardRows(rows: TimelineCardRowId[]): Promise<void> {
  await store.set(TIMELINE_CARD_ROWS_KEY, normalizeTimelineCardRows(rows));
  await store.save();
}
