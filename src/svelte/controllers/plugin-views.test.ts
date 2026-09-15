import { beforeEach, describe, expect, it } from "vitest";
import { appPluginController } from "./app-plugin-controller.svelte";
import { appUiController } from "./app-ui-controller.svelte";
import { pluginViews } from "./plugin-views.svelte";

describe("pluginViews.screenTitle", () => {
  beforeEach(() => {
    appUiController.resetState();
  });

  it("titles the dashboard Overview", () => {
    expect(pluginViews.screenTitle).toBe("Overview");
  });

  it("titles the Timeline page and Timeline customize screen Timeline", () => {
    appUiController.setScreen("timeline");
    expect(appUiController.screen).toBe("timeline");
    expect(pluginViews.screenTitle).toBe("Timeline");

    appUiController.setScreen("customize:timeline");
    expect(appUiController.screen).toBe("customize:timeline");
    expect(pluginViews.screenTitle).toBe("Timeline");
  });
});

describe("pluginViews.settingsPlugins windowStarter", () => {
  beforeEach(() => {
    appPluginController.resetState();
  });

  it("includes effective Window Starter config only when the capability exists", () => {
    appPluginController.setPluginsMeta([
      {
        id: "claude",
        name: "Claude",
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
        id: "opencode-go",
        name: "OpenCode Go",
        iconUrl: "go.svg",
        lines: [],
      },
    ]);
    appPluginController.setPluginSettings({
      order: ["claude", "opencode-go"],
      disabled: [],
      windowStarterByPlugin: { claude: { enabled: false } },
    });

    const claude = pluginViews.settingsPlugins.find((plugin) => plugin.id === "claude");
    const go = pluginViews.settingsPlugins.find((plugin) => plugin.id === "opencode-go");
    expect(claude?.windowStarter).toEqual({
      defaultRunner: "claude",
      allowedRunners: ["claude"],
      runnerId: "claude",
      windows: [{ id: "session", line: "Session", enabled: false }],
    });
    expect(go?.windowStarter).toBeUndefined();
  });

  it("passes antigravityAgyAutoWake only for Antigravity", () => {
    appPluginController.setPluginsMeta([
      { id: "antigravity", name: "Antigravity", iconUrl: "a.svg", lines: [] },
      { id: "claude", name: "Claude", iconUrl: "c.svg", lines: [] },
    ]);
    appPluginController.setPluginSettings({
      order: ["antigravity", "claude"],
      disabled: [],
      antigravityAgyAutoWake: true,
    });

    const antigravity = pluginViews.settingsPlugins.find((plugin) => plugin.id === "antigravity");
    const claude = pluginViews.settingsPlugins.find((plugin) => plugin.id === "claude");
    expect(antigravity?.antigravityAgyAutoWake).toBe(true);
    expect(claude?.antigravityAgyAutoWake).toBeUndefined();
  });

  it("passes grokAutoWake only for Grok", () => {
    appPluginController.setPluginsMeta([
      { id: "grok", name: "Grok", iconUrl: "g.svg", lines: [] },
      { id: "claude", name: "Claude", iconUrl: "c.svg", lines: [] },
    ]);
    appPluginController.setPluginSettings({
      order: ["grok", "claude"],
      disabled: [],
      grokAutoWake: true,
    });

    const grok = pluginViews.settingsPlugins.find((plugin) => plugin.id === "grok");
    const claude = pluginViews.settingsPlugins.find((plugin) => plugin.id === "claude");
    expect(grok?.grokAutoWake).toBe(true);
    expect(claude?.grokAutoWake).toBeUndefined();
  });
});
