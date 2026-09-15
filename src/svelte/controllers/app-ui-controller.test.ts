import { beforeEach, describe, expect, it } from "vitest";
import {
  appUiController,
  customizePluginId,
  isCustomizeTimeline,
  isRootScreen,
  rootTab,
  screenRank,
  trayPayloadToScreen,
} from "./app-ui-controller.svelte";

describe("appUiController", () => {
  beforeEach(() => {
    appUiController.resetState();
  });

  it("starts on the dashboard with about closed", () => {
    expect(appUiController.screen).toBe("dashboard");
    expect(appUiController.showAbout).toBe(false);
  });

  it("switches screens and records slide direction from ranks", () => {
    appUiController.setScreen("timeline");
    expect(appUiController.screen).toBe("timeline");
    expect(appUiController.lastDirection).toBe(1);

    appUiController.setScreen("dashboard");
    expect(appUiController.lastDirection).toBe(-1);

    appUiController.setScreen("customize");
    appUiController.setScreen("customize:claude");
    expect(appUiController.lastDirection).toBe(1);

    // Nested Customize collapses toward the Settings tab.
    appUiController.setScreen("settings");
    expect(appUiController.lastDirection).toBe(-1);
    appUiController.setScreen("timeline");
    expect(appUiController.lastDirection).toBe(-1);
  });

  it("keeps direction at 1 for same-screen writes", () => {
    appUiController.setScreen("dashboard");
    expect(appUiController.lastDirection).toBe(1);
  });

  it("records the settings origin only outside Settings and returns there", () => {
    appUiController.setScreen("timeline");
    appUiController.noteSettingsOrigin();
    appUiController.setScreen("settings");
    appUiController.toggleSettings();
    expect(appUiController.screen).toBe("timeline");

    // Repeated entries while on Settings keep the first origin.
    appUiController.setScreen("timeline");
    appUiController.noteSettingsOrigin();
    appUiController.setScreen("settings");
    appUiController.noteSettingsOrigin();
    appUiController.toggleSettings();
    expect(appUiController.screen).toBe("timeline");
  });

  it("toggleSettings defaults its origin to the dashboard", () => {
    appUiController.toggleSettings();
    expect(appUiController.screen).toBe("settings");
    appUiController.toggleSettings();
    expect(appUiController.screen).toBe("dashboard");
  });

  it("toggles dashboard card expansion per plugin", () => {
    appUiController.togglePluginExpanded("claude");
    expect(appUiController.expandedPluginIds.has("claude")).toBe(true);
    appUiController.togglePluginExpanded("codex");
    expect(appUiController.expandedPluginIds.has("claude")).toBe(true);
    appUiController.togglePluginExpanded("claude");
    expect(appUiController.expandedPluginIds.has("claude")).toBe(false);
    expect(appUiController.expandedPluginIds.has("codex")).toBe(true);
  });

  it("toggles the about dialog", () => {
    appUiController.setShowAbout(true);
    expect(appUiController.showAbout).toBe(true);
  });

  it("resets to the initial state", () => {
    appUiController.setScreen("customize:claude");
    appUiController.setShowAbout(true);
    appUiController.togglePluginExpanded("claude");

    appUiController.resetState();

    expect(appUiController.screen).toBe("dashboard");
    expect(appUiController.showAbout).toBe(false);
    expect(appUiController.expandedPluginIds.size).toBe(0);
  });
});

describe("screen helpers", () => {
  it("extracts plugin ids from customize screens", () => {
    expect(customizePluginId("customize:claude")).toBe("claude");
    expect(customizePluginId("customize")).toBeNull();
    expect(customizePluginId("dashboard")).toBeNull();
    expect(customizePluginId("customize:timeline")).toBeNull();
    expect(customizePluginId("timeline")).toBeNull();
    expect(isCustomizeTimeline("customize:timeline")).toBe(true);
    expect(isCustomizeTimeline("timeline")).toBe(false);
    expect(isCustomizeTimeline("customize:claude")).toBe(false);
  });

  it("ranks every screen distinctly", () => {
    const screens = [
      "dashboard",
      "timeline",
      "customize:timeline",
      "settings",
      "customize",
      "customize:claude",
    ] as const;
    const ranks = screens.map((screen) => screenRank(screen));
    expect(new Set(ranks).size).toBe(screens.length);
  });

  it("maps nested screens onto root tabs", () => {
    expect(rootTab("dashboard")).toBe("dashboard");
    expect(rootTab("timeline")).toBe("timeline");
    expect(rootTab("customize:timeline")).toBe("timeline");
    expect(rootTab("settings")).toBe("settings");
    expect(rootTab("customize")).toBe("settings");
    expect(rootTab("customize:claude")).toBe("settings");
    expect(isRootScreen("dashboard")).toBe(true);
    expect(isRootScreen("customize")).toBe(false);
  });

  it("selectRootTab collapses nested screens to the tab root", () => {
    appUiController.setScreen("customize:claude");
    appUiController.selectRootTab("settings");
    expect(appUiController.screen).toBe("settings");

    appUiController.setScreen("customize:timeline");
    appUiController.selectRootTab("timeline");
    expect(appUiController.screen).toBe("timeline");

    appUiController.selectRootTab("dashboard");
    expect(appUiController.screen).toBe("dashboard");
  });

  it("maps tray payloads onto screens", () => {
    expect(trayPayloadToScreen("home")).toBe("dashboard");
    expect(trayPayloadToScreen("dashboard")).toBe("dashboard");
    expect(trayPayloadToScreen("settings")).toBe("settings");
    expect(trayPayloadToScreen("timeline")).toBe("timeline");
    expect(trayPayloadToScreen("claude")).toBe("dashboard");
    expect(trayPayloadToScreen("resets")).toBe("dashboard");
    expect(trayPayloadToScreen("junk")).toBe("dashboard");
  });
});
