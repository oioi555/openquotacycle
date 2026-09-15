import type { PluginMeta } from "@/lib/plugin-types";
import type { PluginSettings } from "@/lib/settings";

class AppPluginController {
  pluginsMeta = $state<PluginMeta[]>([]);
  pluginSettings = $state<PluginSettings | null>(null);

  setPluginsMeta(value: PluginMeta[]): void {
    this.pluginsMeta = value;
  }

  setPluginSettings(value: PluginSettings | null): void {
    this.pluginSettings = value;
  }

  resetState(): void {
    this.pluginsMeta = [];
    this.pluginSettings = null;
  }
}

export const appPluginController = new AppPluginController();
