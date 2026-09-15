import type { PluginMeta } from "@/lib/plugin-types";
import type { DisplayMode, PluginSettings } from "@/lib/settings";
import { getEnabledPluginIds } from "@/lib/settings";
import { buildTrayTooltipEntries, formatTrayTooltip } from "@/lib/tray-tooltip";
import { setTrayTooltip } from "../lib/backend";
import type { PluginState } from "./probe-controller.svelte";

export type TrayIconUpdateReason = "probe" | "settings" | "init";

export type TrayIconInputs = {
  pluginsMeta: PluginMeta[];
  pluginSettings: PluginSettings | null;
  pluginStates: Record<string, PluginState>;
  displayMode: DisplayMode;
};

class TrayController {
  trayReady = $state(false);

  private lastTooltip = "";
  private updateTimer: ReturnType<typeof setTimeout> | null = null;
  private updatePending = false;
  private updateQueued = false;
  private inputs: TrayIconInputs = {
    pluginsMeta: [],
    pluginSettings: null,
    pluginStates: {},
    displayMode: "left",
  };

  /** Snapshot the reactive inputs the tray rendering depends on. */
  syncInputs(inputs: TrayIconInputs): void {
    this.inputs = inputs;
  }

  async init(): Promise<void> {
    this.lastTooltip = "";
    this.trayReady = true;
  }

  scheduleUpdate(_reason: TrayIconUpdateReason, delayMs = 0): void {
    if (this.updateTimer !== null) {
      clearTimeout(this.updateTimer);
      this.updateTimer = null;
    }

    this.updateTimer = setTimeout(() => {
      this.updateTimer = null;
      if (this.updatePending) {
        this.updateQueued = true;
        return;
      }
      this.updatePending = true;

      const finalizeUpdate = () => {
        this.updatePending = false;
        if (!this.updateQueued) return;
        this.updateQueued = false;
        this.scheduleUpdate("probe", 0);
      };

      const currentSettings = this.inputs.pluginSettings;
      const tooltip =
        currentSettings && getEnabledPluginIds(currentSettings).length > 0
          ? formatTrayTooltip(
              buildTrayTooltipEntries({
                pluginsMeta: this.inputs.pluginsMeta,
                pluginSettings: currentSettings,
                pluginStates: this.inputs.pluginStates,
                displayMode: this.inputs.displayMode,
              }),
            )
          : "Quotracker";

      if (tooltip === this.lastTooltip) {
        finalizeUpdate();
        return;
      }
      this.lastTooltip = tooltip;
      setTrayTooltip(tooltip)
        .catch((e) => {
          console.error("Failed to update tray tooltip:", e);
        })
        .finally(() => {
          finalizeUpdate();
        });
    }, delayMs);
  }

  dispose(): void {
    if (this.updateTimer !== null) {
      clearTimeout(this.updateTimer);
      this.updateTimer = null;
    }
    this.updatePending = false;
    this.updateQueued = false;
    this.lastTooltip = "";
  }
}

export const trayController = new TrayController();
