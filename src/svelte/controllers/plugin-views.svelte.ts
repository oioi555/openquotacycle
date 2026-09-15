import { appPluginController } from "./app-plugin-controller.svelte";
import { appUiController, customizePluginId, isCustomizeTimeline } from "./app-ui-controller.svelte";
import { probeController, type PluginState } from "./probe-controller.svelte";
import type { SettingsPluginConfig, SettingsWindowStarterConfig } from "../lib/view-types";
import type { PluginMeta } from "@/lib/plugin-types";
import {
  effectiveWindowStarterEnabled,
  effectiveWindowStarterRunner,
  getOverviewProgressBarOptions,
  type PluginSettings,
} from "@/lib/settings";

export type DisplayPluginState = { meta: PluginMeta } & PluginState;
export type { SettingsPluginConfig };

const EMPTY_STATE: PluginState = {
  data: null,
  loading: false,
  refreshing: false,
  error: null,
  staleError: null,
  lastManualRefreshAt: null,
  lastUpdatedAt: null,
};

class PluginViews {
  displayPlugins = $derived.by<DisplayPluginState[]>(() => {
    const pluginSettings = appPluginController.pluginSettings;
    if (!pluginSettings) return [];
    const disabledSet = new Set(pluginSettings.disabled);
    const metaById = new Map(
      appPluginController.pluginsMeta.map((plugin) => [plugin.id, plugin]),
    );

    return pluginSettings.order
      .filter((id) => !disabledSet.has(id))
      .map((id) => {
        const meta = metaById.get(id);
        if (!meta) return null;
        return { meta, ...(probeController.pluginStates[id] ?? EMPTY_STATE) };
      })
      .filter((plugin): plugin is DisplayPluginState => Boolean(plugin));
  });

  // Customize L1 + L2 list: every known plugin with its enable state and
  // Always Visible / On-Demand classifications.
  settingsPlugins = $derived.by<SettingsPluginConfig[]>(() => {
    const pluginSettings = appPluginController.pluginSettings;
    if (!pluginSettings) return [];
    const metaById = new Map(
      appPluginController.pluginsMeta.map((plugin) => [plugin.id, plugin]),
    );

    return pluginSettings.order
      .map((id): SettingsPluginConfig | null => {
        const meta = metaById.get(id);
        if (!meta) return null;
        const windowStarter = settingsWindowStarter(meta, pluginSettings);
        return {
          id,
          name: meta.name,
          enabled: !pluginSettings.disabled.includes(id),
          iconUrl: meta.iconUrl,
          brandColor: meta.brandColor,
          overviewProgressBars: getOverviewProgressBarOptions(
            meta,
            pluginSettings.visibleOverviewProgressLines?.[id],
            pluginSettings.overviewLineOrder?.[id],
          ),
          ...(windowStarter ? { windowStarter } : {}),
          ...(id === "antigravity"
            ? { antigravityAgyAutoWake: pluginSettings.antigravityAgyAutoWake === true }
            : {}),
          ...(id === "grok" ? { grokAutoWake: pluginSettings.grokAutoWake === true } : {}),
        };
      })
      .filter((plugin): plugin is SettingsPluginConfig => Boolean(plugin));
  });

  // Top-bar title for the active screen; customize:<id> shows the provider name.
  screenTitle = $derived.by<string>(() => {
    if (isCustomizeTimeline(appUiController.screen)) return "Timeline";
    const pluginId = customizePluginId(appUiController.screen);
    if (pluginId) {
      return (
        appPluginController.pluginsMeta.find((plugin) => plugin.id === pluginId)?.name ??
        "Customize"
      );
    }
    switch (appUiController.screen) {
      case "customize":
        return "Customize";
      case "timeline":
        return "Timeline";
      case "settings":
        return "Settings";
      default:
        return "Overview";
    }
  });

  constructor() {
    // When the plugin behind customize:<id> becomes disabled, fall back to the
    // dashboard.
    $effect.root(() => {
      $effect(() => {
        const pluginId = customizePluginId(appUiController.screen);
        if (!pluginId) return;
        if (!appPluginController.pluginSettings) return;
        const isKnown = appPluginController.pluginsMeta.some((p) => p.id === pluginId);
        if (!isKnown) return;
        const stillEnabled = this.displayPlugins.some((plugin) => plugin.meta.id === pluginId);
        if (!stillEnabled) {
          appUiController.setScreen("dashboard");
        }
      });
    });
  }
}

function settingsWindowStarter(
  meta: PluginMeta,
  settings: PluginSettings,
): SettingsWindowStarterConfig | undefined {
  const capability = meta.windowStarter;
  if (!capability) return undefined;
  const override = settings.windowStarterByPlugin?.[meta.id];
  return {
    defaultRunner: capability.defaultRunner,
    allowedRunners: capability.allowedRunners,
    runnerId: effectiveWindowStarterRunner(capability, override),
    windows: capability.windows.map((window) => ({
      id: window.id,
      line: window.line,
      enabled: effectiveWindowStarterEnabled(capability, window.id, override),
    })),
  };
}

export const pluginViews = new PluginViews();
