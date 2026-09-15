import {
  arePluginSettingsEqual,
  DEFAULT_AUTO_UPDATE_INTERVAL,
  DEFAULT_CROSSING_GO_REMAINING_MINUTES,
  DEFAULT_DISPLAY_MODE,
  DEFAULT_LEFTOVER_NOTIFY_ENABLED,
  DEFAULT_GLOBAL_SHORTCUT,
  DEFAULT_RESET_TIMER_DISPLAY_MODE,
  DEFAULT_START_ON_LOGIN,
  DEFAULT_THEME_MODE,
  DEFAULT_TIMELINE_CARD_ROWS,
  DEFAULT_TIMELINE_CARD_VISIBLE,
  DEFAULT_WINDOW_STARTER_ENABLED,
  defaultVisibleOverviewLabels,
  effectiveVisibleOverviewLabels,
  getEnabledPluginIds,
  pruneWindowStarterOverride,
  type WindowStarterPluginOverride,
  loadAutoUpdateInterval,
  loadCrossingGoRemainingMinutes,
  loadDisplayMode,
  loadLeftoverNotifyEnabled,
  loadGlobalShortcut,
  loadPluginSettings,
  loadResetTimerDisplayMode,
  loadStartOnLogin,
  loadThemeMode,
  loadTimelineCardVisible,
  loadTimelineCardRows,
  loadWindowStarterEnabled,
  migrateLegacyTraySettings,
  normalizePluginSettings,
  saveAutoUpdateInterval,
  saveCrossingGoRemainingMinutes,
  saveDisplayMode,
  saveLeftoverNotifyEnabled,
  saveGlobalShortcut,
  savePluginSettings,
  saveResetTimerDisplayMode,
  saveStartOnLogin,
  saveThemeMode,
  saveTimelineCardVisible,
  saveTimelineCardRows,
  saveWindowStarterEnabled,
  type AutoUpdateIntervalMinutes,
  type CrossingGoRemainingMinutes,
  type DisplayMode,
  type GlobalShortcut,
  type PluginSettings,
  type ResetTimerDisplayMode,
  type ThemeMode,
  type TimelineCardRowId,
} from "@/lib/settings";
import {
  disableAutostart,
  enableAutostart,
  isAutostartEnabled,
  isTauri,
  listPlugins,
  updateGlobalShortcut,
} from "../lib/backend";
import { appPluginController } from "./app-plugin-controller.svelte";
import { appPreferencesController } from "./app-preferences-controller.svelte";
import { probeController } from "./probe-controller.svelte";

const TRAY_SETTINGS_DEBOUNCE_MS = 2000;

export type TrayIconUpdateReason = "probe" | "settings" | "init";
export type TrayIconScheduler = (reason: TrayIconUpdateReason, delayMs?: number) => void;

class SettingsController {
  private trayIconScheduler: TrayIconScheduler = () => {};

  setTrayIconScheduler(scheduler: TrayIconScheduler): void {
    this.trayIconScheduler = scheduler;
  }

  private get pluginSettings(): PluginSettings | null {
    return appPluginController.pluginSettings;
  }

  private commitSettings(next: PluginSettings, failureMessage: string): void {
    appPluginController.setPluginSettings(next);
    void savePluginSettings(next).catch((error) => {
      console.error(failureMessage, error);
    });
  }

  async applyStartOnLogin(value: boolean): Promise<void> {
    if (!isTauri()) return;
    const currentlyEnabled = await isAutostartEnabled();
    if (currentlyEnabled === value) return;

    if (value) {
      await enableAutostart();
      return;
    }

    await disableAutostart();
  }

  // --- bootstrap -------------------------------------------------------------

  async bootstrap(): Promise<void> {
    try {
      const availablePlugins = await listPlugins();
      appPluginController.setPluginsMeta(availablePlugins);

      const storedSettings = await loadPluginSettings();
      const normalized = normalizePluginSettings(storedSettings, availablePlugins);
      if (!arePluginSettingsEqual(storedSettings, normalized)) {
        await savePluginSettings(normalized);
      }

      let storedInterval = DEFAULT_AUTO_UPDATE_INTERVAL;
      try {
        storedInterval = await loadAutoUpdateInterval();
      } catch (error) {
        console.error("Failed to load auto-update interval:", error);
      }

      let storedThemeMode = DEFAULT_THEME_MODE;
      try {
        storedThemeMode = await loadThemeMode();
      } catch (error) {
        console.error("Failed to load theme mode:", error);
      }

      let storedDisplayMode = DEFAULT_DISPLAY_MODE;
      try {
        storedDisplayMode = await loadDisplayMode();
      } catch (error) {
        console.error("Failed to load display mode:", error);
      }

      let storedResetTimerDisplayMode = DEFAULT_RESET_TIMER_DISPLAY_MODE;
      try {
        storedResetTimerDisplayMode = await loadResetTimerDisplayMode();
      } catch (error) {
        console.error("Failed to load reset timer display mode:", error);
      }

      let storedCrossingGoRemainingMinutes = DEFAULT_CROSSING_GO_REMAINING_MINUTES;
      try {
        storedCrossingGoRemainingMinutes = await loadCrossingGoRemainingMinutes();
      } catch (error) {
        console.error("Failed to load crossing-go remaining minutes:", error);
      }

      let storedLeftoverNotifyEnabled = DEFAULT_LEFTOVER_NOTIFY_ENABLED;
      try {
        storedLeftoverNotifyEnabled = await loadLeftoverNotifyEnabled();
      } catch (error) {
        console.error("Failed to load leftover notify enabled:", error);
      }

      let storedGlobalShortcut = DEFAULT_GLOBAL_SHORTCUT;
      try {
        storedGlobalShortcut = await loadGlobalShortcut();
      } catch (error) {
        console.error("Failed to load global shortcut:", error);
      }

      let storedStartOnLogin = DEFAULT_START_ON_LOGIN;
      try {
        storedStartOnLogin = await loadStartOnLogin();
      } catch (error) {
        console.error("Failed to load start on login:", error);
      }

      try {
        await this.applyStartOnLogin(storedStartOnLogin);
      } catch (error) {
        console.error("Failed to apply start on login setting:", error);
      }
      try {
        await migrateLegacyTraySettings();
      } catch (error) {
        console.error("Failed to migrate legacy tray settings:", error);
      }

      let storedWindowStarterEnabled = DEFAULT_WINDOW_STARTER_ENABLED;
      try {
        storedWindowStarterEnabled = await loadWindowStarterEnabled();
      } catch (error) {
        console.error("Failed to load window starter enabled:", error);
      }

      let storedTimelineCardVisible = DEFAULT_TIMELINE_CARD_VISIBLE;
      try {
        storedTimelineCardVisible = await loadTimelineCardVisible();
      } catch (error) {
        console.error("Failed to load timeline card visibility:", error);
      }

      let storedTimelineCardRows = [...DEFAULT_TIMELINE_CARD_ROWS];
      try {
        storedTimelineCardRows = await loadTimelineCardRows();
      } catch (error) {
        console.error("Failed to load timeline card rows:", error);
      }

      appPluginController.setPluginSettings(normalized);
      appPreferencesController.setAutoUpdateInterval(storedInterval);
      appPreferencesController.setThemeMode(storedThemeMode);
      appPreferencesController.setDisplayMode(storedDisplayMode);
      appPreferencesController.setResetTimerDisplayMode(storedResetTimerDisplayMode);
      appPreferencesController.setCrossingGoRemainingMinutes(storedCrossingGoRemainingMinutes);
      appPreferencesController.setLeftoverNotifyEnabled(storedLeftoverNotifyEnabled);
      appPreferencesController.setGlobalShortcut(storedGlobalShortcut);
      appPreferencesController.setStartOnLogin(storedStartOnLogin);
      appPreferencesController.setWindowStarterEnabled(storedWindowStarterEnabled);
      appPreferencesController.setTimelineCardVisible(storedTimelineCardVisible);
      appPreferencesController.setTimelineCardRows(storedTimelineCardRows);

      const enabledIds = getEnabledPluginIds(normalized);
      probeController.beginRefresh(enabledIds);
      try {
        await probeController.startBatch(enabledIds);
      } catch (error) {
        console.error("Failed to start probe batch:", error);
        probeController.setStartError(enabledIds, "Failed to start probe");
      }
    } catch (error) {
      console.error("Failed to load plugin settings:", error);
    }
  }

  // --- plugin actions ----------------------------------------------------------

  handleReorder(orderedIds: string[]): void {
    const pluginSettings = this.pluginSettings;
    if (!pluginSettings) return;
    // orderedIds may be a subset (e.g. nav-only, excluding disabled plugins).
    // Re-insert any missing IDs from the previous order at their original
    // relative positions so disabled plugins are not dropped.
    const previousOrder = pluginSettings.order ?? [];
    const orderedSet = new Set(orderedIds);
    const missing = previousOrder.filter((id) => !orderedSet.has(id));
    const merged = [...orderedIds];
    for (const id of missing) {
      const prevIdx = previousOrder.indexOf(id);
      // Insert after the last merged entry whose original index < prevIdx
      let insertAt = 0; // default: prepend if id originally preceded all visible entries
      for (let i = merged.length - 1; i >= 0; i--) {
        const mergedPrevIdx = previousOrder.indexOf(merged[i]);
        if (mergedPrevIdx < prevIdx) {
          insertAt = i + 1;
          break;
        }
      }
      merged.splice(insertAt, 0, id);
    }
    this.commitSettings(
      { ...pluginSettings, order: merged },
      "Failed to save plugin order:",
    );
    this.trayIconScheduler("settings", TRAY_SETTINGS_DEBOUNCE_MS);
  }

  handleToggle(id: string): void {
    const pluginSettings = this.pluginSettings;
    if (!pluginSettings) return;
    const wasDisabled = pluginSettings.disabled.includes(id);
    const disabled = new Set(pluginSettings.disabled);

    if (wasDisabled) {
      disabled.delete(id);
      probeController.beginRefresh([id]);
      probeController.startBatch([id]).catch((error) => {
        console.error("Failed to start probe for enabled plugin:", error);
        probeController.setStartError([id], "Failed to start probe");
      });
    } else {
      disabled.add(id);
    }

    this.commitSettings(
      { ...pluginSettings, disabled: Array.from(disabled) },
      "Failed to save plugin toggle:",
    );
    this.trayIconScheduler("settings", TRAY_SETTINGS_DEBOUNCE_MS);
  }

  /** Reset every provider's customization: re-enable all, restore manifest
   * order, defaults visibility, and Window Starter participation. Does not
   * change the global Window Starter switch. */
  handleResetAllCustomization(): void {
    const pluginSettings = this.pluginSettings;
    if (!pluginSettings) return;

    const reenabled = pluginSettings.disabled.filter((id) =>
      appPluginController.pluginsMeta.some((meta) => meta.id === id),
    );
    const nextSettings: PluginSettings = {
      ...pluginSettings,
      disabled: [],
    };
    delete nextSettings.overviewLineOrder;
    delete nextSettings.visibleOverviewProgressLines;
    delete nextSettings.windowStarterByPlugin;
    delete nextSettings.antigravityAgyAutoWake;
    delete nextSettings.grokAutoWake;
    this.commitSettings(nextSettings, "Failed to reset all customization:");
    this.handleTimelineCardRowsReset();
    this.trayIconScheduler("settings", TRAY_SETTINGS_DEBOUNCE_MS);
    if (reenabled.length > 0) {
      probeController.beginRefresh(reenabled);
      probeController.startBatch(reenabled).catch((error) => {
        console.error("Failed to start probe for re-enabled plugins:", error);
        probeController.setStartError(reenabled, "Failed to start probe");
      });
    }
  }

  handleOverviewProgressBarToggle(
    pluginId: string,
    label: string,
    visible: boolean,
  ): void {
    const pluginSettings = this.pluginSettings;
    if (!pluginSettings) return;
    const meta = appPluginController.pluginsMeta.find((m) => m.id === pluginId);
    if (!meta) return;

    // Materialize the current effective visible set, flip one label, and drop
    // the stored set when it matches manifest defaults (absent key = defaults).
    const current = new Set(effectiveVisibleOverviewLabels(meta, pluginSettings.visibleOverviewProgressLines?.[pluginId]));
    if (visible) current.add(label);
    else current.delete(label);
    const defaults = defaultVisibleOverviewLabels(meta);
    const same =
      current.size === defaults.length && defaults.every((entry) => current.has(entry));

    const visibleOverviewProgressLines = {
      ...(pluginSettings.visibleOverviewProgressLines ?? {}),
    };
    if (same) {
      delete visibleOverviewProgressLines[pluginId];
    } else {
      visibleOverviewProgressLines[pluginId] = meta.lines
        .filter(
          (line) =>
            (line.type === "progress" || line.type === "text") &&
            current.has(line.label),
        )
        .map((line) => line.label);
    }

    this.commitSettings(
      { ...pluginSettings, visibleOverviewProgressLines },
      "Failed to save Overview progress bar setting:",
    );
  }

  handleOverviewLineReorder(pluginId: string, orderedLabels: string[]): void {
    const pluginSettings = this.pluginSettings;
    if (!pluginSettings) return;

    const overviewLineOrder = {
      ...(pluginSettings.overviewLineOrder ?? {}),
    };
    if (orderedLabels.length === 0) {
      delete overviewLineOrder[pluginId];
    } else {
      overviewLineOrder[pluginId] = orderedLabels;
    }

    const nextSettings: PluginSettings = { ...pluginSettings };
    if (Object.keys(overviewLineOrder).length === 0) {
      delete nextSettings.overviewLineOrder;
    } else {
      nextSettings.overviewLineOrder = overviewLineOrder;
    }
    this.commitSettings(nextSettings, "Failed to save Overview line order:");
    this.trayIconScheduler("settings", TRAY_SETTINGS_DEBOUNCE_MS);
  }

  handleOverviewLineOrderReset(pluginId: string): void {
    this.handleOverviewLineReorder(pluginId, []);
  }

  /** Restore a provider's default display settings: drop the stored order,
   * visible set, and Window Starter overrides so the manifest defaults apply. */
  handleOverviewDisplayReset(pluginId: string): void {
    const pluginSettings = this.pluginSettings;
    if (!pluginSettings) return;

    const nextSettings: PluginSettings = { ...pluginSettings };
    let changed = false;

    if (nextSettings.overviewLineOrder?.[pluginId] !== undefined) {
      const overviewLineOrder = { ...nextSettings.overviewLineOrder };
      delete overviewLineOrder[pluginId];
      if (Object.keys(overviewLineOrder).length === 0) delete nextSettings.overviewLineOrder;
      else nextSettings.overviewLineOrder = overviewLineOrder;
      changed = true;
    }
    if (nextSettings.visibleOverviewProgressLines?.[pluginId] !== undefined) {
      const visibleOverviewProgressLines = { ...nextSettings.visibleOverviewProgressLines };
      delete visibleOverviewProgressLines[pluginId];
      if (Object.keys(visibleOverviewProgressLines).length === 0) {
        delete nextSettings.visibleOverviewProgressLines;
      } else {
        nextSettings.visibleOverviewProgressLines = visibleOverviewProgressLines;
      }
      changed = true;
    }
    if (nextSettings.windowStarterByPlugin?.[pluginId] !== undefined) {
      const windowStarterByPlugin = { ...nextSettings.windowStarterByPlugin };
      delete windowStarterByPlugin[pluginId];
      if (Object.keys(windowStarterByPlugin).length === 0) {
        delete nextSettings.windowStarterByPlugin;
      } else {
        nextSettings.windowStarterByPlugin = windowStarterByPlugin;
      }
      changed = true;
    }
    if (!changed) return;
    this.commitSettings(nextSettings, "Failed to reset Overview display settings:");
    this.trayIconScheduler("settings", TRAY_SETTINGS_DEBOUNCE_MS);
  }

  handleWindowStarterParticipation(pluginId: string, enabled: boolean): void {
    this.commitWindowStarterOverride(pluginId, (current) => ({ ...current, enabled }));
  }

  handleWindowStarterWindow(pluginId: string, windowId: string, enabled: boolean): void {
    this.commitWindowStarterOverride(pluginId, (current) => ({
      ...current,
      windows: { ...current.windows, [windowId]: { enabled } },
    }));
  }

  handleWindowStarterRunner(pluginId: string, runnerId: string): void {
    this.commitWindowStarterOverride(pluginId, (current) => ({ ...current, runnerId }));
  }

  handleAntigravityAgyAutoWake(enabled: boolean): void {
    const pluginSettings = this.pluginSettings;
    if (!pluginSettings) return;
    const nextSettings: PluginSettings = { ...pluginSettings };
    if (enabled) nextSettings.antigravityAgyAutoWake = true;
    else delete nextSettings.antigravityAgyAutoWake;
    this.commitSettings(nextSettings, "Failed to save Antigravity auto-start agy:");
  }

  handleGrokAutoWake(enabled: boolean): void {
    const pluginSettings = this.pluginSettings;
    if (!pluginSettings) return;
    const nextSettings: PluginSettings = { ...pluginSettings };
    if (enabled) nextSettings.grokAutoWake = true;
    else delete nextSettings.grokAutoWake;
    this.commitSettings(nextSettings, "Failed to save Grok auto-start grok:");
  }

  private commitWindowStarterOverride(
    pluginId: string,
    mutate: (current: WindowStarterPluginOverride) => WindowStarterPluginOverride,
  ): void {
    const pluginSettings = this.pluginSettings;
    if (!pluginSettings) return;
    const capability = appPluginController.pluginsMeta.find((meta) => meta.id === pluginId)
      ?.windowStarter;
    if (!capability) return;

    const pruned = pruneWindowStarterOverride(
      capability,
      mutate({ ...(pluginSettings.windowStarterByPlugin?.[pluginId] ?? {}) }),
    );
    const windowStarterByPlugin = { ...(pluginSettings.windowStarterByPlugin ?? {}) };
    if (pruned) windowStarterByPlugin[pluginId] = pruned;
    else delete windowStarterByPlugin[pluginId];

    const nextSettings: PluginSettings = { ...pluginSettings };
    if (Object.keys(windowStarterByPlugin).length === 0) {
      delete nextSettings.windowStarterByPlugin;
    } else {
      nextSettings.windowStarterByPlugin = windowStarterByPlugin;
    }
    this.commitSettings(nextSettings, "Failed to save Window Starter setting:");
  }

  // --- display actions ---------------------------------------------------------

  handleThemeModeChange(mode: ThemeMode): void {
    appPreferencesController.setThemeMode(mode);
    void saveThemeMode(mode).catch((error) => {
      console.error("Failed to save theme mode:", error);
    });
  }

  handleDisplayModeChange(mode: DisplayMode): void {
    appPreferencesController.setDisplayMode(mode);
    this.trayIconScheduler("settings", 0);
    void saveDisplayMode(mode).catch((error) => {
      console.error("Failed to save display mode:", error);
    });
  }

  handleResetTimerDisplayModeChange(mode: ResetTimerDisplayMode): void {
    appPreferencesController.setResetTimerDisplayMode(mode);
    void saveResetTimerDisplayMode(mode).catch((error) => {
      console.error("Failed to save reset timer display mode:", error);
    });
  }

  handleCrossingGoRemainingMinutesChange(minutes: CrossingGoRemainingMinutes): void {
    appPreferencesController.setCrossingGoRemainingMinutes(minutes);
    void saveCrossingGoRemainingMinutes(minutes).catch((error) => {
      console.error("Failed to save crossing-go remaining minutes:", error);
    });
  }

  handleLeftoverNotifyEnabledChange(value: boolean): void {
    appPreferencesController.setLeftoverNotifyEnabled(value);
    void saveLeftoverNotifyEnabled(value).catch((error) => {
      console.error("Failed to save leftover notify enabled:", error);
    });
  }

  handleResetTimerDisplayModeToggle(): void {
    const current = appPreferencesController.resetTimerDisplayMode;
    this.handleResetTimerDisplayModeChange(current === "relative" ? "absolute" : "relative");
  }

  handleDisplayModeToggle(): void {
    const current = appPreferencesController.displayMode;
    this.handleDisplayModeChange(current === "used" ? "left" : "used");
  }

  // --- system actions ----------------------------------------------------------

  handleAutoUpdateIntervalChange(value: AutoUpdateIntervalMinutes): void {
    appPreferencesController.setAutoUpdateInterval(value);
    if (this.pluginSettings) {
      probeController.syncAutoUpdate(this.pluginSettings, value);
    }
    void saveAutoUpdateInterval(value).catch((error) => {
      console.error("Failed to save auto-update interval:", error);
    });
  }

  handleGlobalShortcutChange(value: GlobalShortcut): void {
    appPreferencesController.setGlobalShortcut(value);
    void saveGlobalShortcut(value).catch((error) => {
      console.error("Failed to save global shortcut:", error);
    });
    updateGlobalShortcut(value).catch((error) => {
      console.error("Failed to update global shortcut:", error);
    });
  }

  handleStartOnLoginChange(value: boolean): void {
    appPreferencesController.setStartOnLogin(value);
    void saveStartOnLogin(value).catch((error) => {
      console.error("Failed to save start on login:", error);
    });
    void this.applyStartOnLogin(value).catch((error) => {
      console.error("Failed to update start on login:", error);
    });
  }

  handleResetSettingsDefaults(): void {
    this.handleAutoUpdateIntervalChange(DEFAULT_AUTO_UPDATE_INTERVAL);
    this.handleThemeModeChange(DEFAULT_THEME_MODE);
    this.handleDisplayModeChange(DEFAULT_DISPLAY_MODE);
    this.handleResetTimerDisplayModeChange(DEFAULT_RESET_TIMER_DISPLAY_MODE);
    this.handleCrossingGoRemainingMinutesChange(DEFAULT_CROSSING_GO_REMAINING_MINUTES);
    this.handleLeftoverNotifyEnabledChange(DEFAULT_LEFTOVER_NOTIFY_ENABLED);
    this.handleGlobalShortcutChange(DEFAULT_GLOBAL_SHORTCUT);
    this.handleStartOnLoginChange(DEFAULT_START_ON_LOGIN);
  }

  handleWindowStarterEnabledChange(value: boolean): void {
    appPreferencesController.setWindowStarterEnabled(value);
    void saveWindowStarterEnabled(value).catch((error) => {
      console.error("Failed to save Window Starter setting:", error);
    });
  }

  handleTimelineCardVisibleChange(value: boolean): void {
    appPreferencesController.setTimelineCardVisible(value);
    void saveTimelineCardVisible(value).catch((error) => {
      console.error("Failed to save timeline card visibility:", error);
    });
  }

  handleTimelineCardRowToggle(kind: TimelineCardRowId, visible: boolean): void {
    const current = new Set(appPreferencesController.timelineCardRows);
    if (visible) current.add(kind);
    else current.delete(kind);
    const next = DEFAULT_TIMELINE_CARD_ROWS.filter((row) => current.has(row));
    this.handleTimelineCardRowsChange(next);
  }

  handleTimelineCardRowsChange(rows: TimelineCardRowId[]): void {
    appPreferencesController.setTimelineCardRows(rows);
    void saveTimelineCardRows(rows).catch((error) => {
      console.error("Failed to save timeline card rows:", error);
    });
  }

  handleTimelineCardRowsReset(): void {
    this.handleTimelineCardRowsChange([...DEFAULT_TIMELINE_CARD_ROWS]);
  }
}

export const settingsController = new SettingsController();
