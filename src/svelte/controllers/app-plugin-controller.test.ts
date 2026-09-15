import { beforeEach, describe, expect, it } from "vitest";
import type { PluginMeta } from "@/lib/plugin-types";
import type { PluginSettings } from "@/lib/settings";
import { appPluginController } from "./app-plugin-controller.svelte";

const meta: PluginMeta = {
  id: "claude",
  name: "Claude",
  brandColor: "#de7356",
} as PluginMeta;

describe("appPluginController", () => {
  beforeEach(() => {
    appPluginController.resetState();
  });

  it("starts empty", () => {
    expect(appPluginController.pluginsMeta).toEqual([]);
    expect(appPluginController.pluginSettings).toBeNull();
  });

  it("stores plugin metadata and settings", () => {
    const settings = { claude: { enabled: true } } as unknown as PluginSettings;

    appPluginController.setPluginsMeta([meta]);
    appPluginController.setPluginSettings(settings);

    expect(appPluginController.pluginsMeta).toEqual([meta]);
    // $state wraps assigned objects in a reactive proxy, so compare by value.
    expect(appPluginController.pluginSettings).toEqual(settings);
  });

  it("resets to the initial state", () => {
    appPluginController.setPluginsMeta([meta]);
    appPluginController.resetState();

    expect(appPluginController.pluginsMeta).toEqual([]);
    expect(appPluginController.pluginSettings).toBeNull();
  });
});
